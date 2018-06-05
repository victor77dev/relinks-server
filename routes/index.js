var express = require('express');
var router = express.Router();

const dlFile = require('../lib/downloadFile');
const arXiv = require('../lib/arXivLib');
const pdfReader = require('../lib/pdfReader');
const articleParser = require('../lib/articleParser');
const extractLinks = require('../lib/extractLinks');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/testDownloadFile', function(req, res, next) {
  // Testing download pdf with link
  const url = 'https://openreview.net/pdf?id=BJ8vJebC-';
  const dirPath = 'downloadFiles';
  let filename = 'testing.pdf';
  dlFile.downloadFile(url, filename, dirPath).then((msg) => {
    console.log(msg);
    res.render('index', { title: 'Downloaded link' });
  }).catch((err) => {
    console.log(err);
    res.render('index', { title: 'Failed to download link' });
  })
});

router.get('/testGetPaperInfo', function(req, res, next) {
  // Testing get paper info from arXiv using paper title
  const paperTitle = 'Synthetic and Natural Noise Both Break Neural Machine Translation';
  arXiv.getInfo(paperTitle).then((paperInfo) => {
    res.render('index', { title: JSON.stringify(paperInfo) });
  }).catch((err) => {
    console.log(err);
    res.render('index', { title: 'Failed to get paper info' });
  })
});

router.get('/testDownloadPdfWithTitle', function(req, res, next) {
  // Testing download pdf from arXiv using title (get pdf link + download pdf)
  const paperTitle = 'Synthetic and Natural Noise Both Break Neural Machine Translation';
  arXiv.getInfo(paperTitle).then((paperInfo) => {
    const pdfLink = paperInfo.pdf;
    const pdfFilename = paperInfo.title + '.pdf';
    const dirPath = 'downloadFiles';
    if (pdfLink === null)
      res.render('index', { title: 'Failed to find pdf link' });
    dlFile.downloadFile(pdfLink, pdfFilename, dirPath).then((msg) => {
      console.log(msg);
      res.render('index', { title: 'Downloaded pdf' });
    }).catch((err) => {
      console.log(err);
      res.render('index', { title: 'Failed to download from link' });
    })
  }).catch((err) => {
    console.log(err);
    res.render('index', { title: 'Failed to get info' });
  });
});

router.get('/testParsePdfSessions', function(req, res, next) {
  const paperInfo = {title: 'Synthetic and Natural Noise Both Break Neural Machine Translation'};
  const pdfFilename = paperInfo.title + '.pdf';
  const dirPath = 'downloadFiles';

  pdfReader.readPdf(pdfFilename, dirPath)
  .then((pdfData) => {
    res.render('index', { title: JSON.stringify(pdfData) });
  }).catch((err) => {
    console.log(err);
  });
});

router.get('/testParsePdfRelatedWork', function(req, res, next) {
  // 1. Example without related work session
  // const paperInfo = {title: 'Synthetic and Natural Noise Both Break Neural Machine Translation'};
  // 2. Example with related work session
  const paperInfo = {title: 'Training and Inference with Integers in Deep Neural Networks'};
  const pdfFilename = paperInfo.title + '.pdf';
  const dirPath = 'downloadFiles';

  pdfReader.readPdf(pdfFilename, dirPath)
  .then((pdfData) => {
    let relatedWork = articleParser.findRelatedWork(pdfData)
    if (relatedWork.found)
      res.render('index', { title: JSON.stringify(relatedWork) });
    else
      res.render('index', { title: 'Cannot find Related Work session' });
  }).catch((err) => {
    console.log(err);
  });
});

router.get('/testParseReference', function(req, res, next) {
  // const paperInfo = {title: 'Synthetic and Natural Noise Both Break Neural Machine Translation'};
  const paperInfo = {title: 'Training and Inference with Integers in Deep Neural Networks'};
  const pdfFilename = paperInfo.title + '.pdf';
  const dirPath = 'downloadFiles';

  pdfReader.readPdf(pdfFilename, dirPath)
  .then((pdfData) => {
    let referenceRaw = articleParser.findReference(pdfData)
    let reference;
    if (referenceRaw.found) {
      articleParser.parseReference(referenceRaw)
      .then((reference) => {
        res.render('index', { title: JSON.stringify(reference) });
      }).catch((err) => {
        console.log(err);
      });
    }
    else
      res.render('index', { title: 'Cannot find Reference session' });
  }).catch((err) => {
    console.log(err);
  });
});

router.get('/testExtractPapersFromRelatedWork', function(req, res, next) {
  const paperInfo = {title: 'Training and Inference with Integers in Deep Neural Networks'};
  const pdfFilename = paperInfo.title + '.pdf';
  const dirPath = 'downloadFiles';

  pdfReader.readPdf(pdfFilename, dirPath)
  .then((pdfData) => {
    let relatedWork = articleParser.findRelatedWork(pdfData)
    let referenceRaw = articleParser.findReference(pdfData)
    if (!relatedWork.found)
      return res.render('index', { title: 'Cannot find Related work session' });
    if (!referenceRaw.found)
      return res.render('index', { title: 'Cannot find Reference session' });
    let reference;
    articleParser.parseReference(referenceRaw)
    .then((reference) => {
      let relatedWorkLinks = extractLinks.papersLinksInRelatedWork(paperInfo, relatedWork, reference)
      res.render('index', { title: JSON.stringify(relatedWorkLinks) });
    }).catch((err) => {
      console.log(err);
    });
  }).catch((err) => {
    console.log(err);
  });
});

module.exports = router;
