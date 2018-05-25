var express = require('express');
var router = express.Router();

const dlFile = require('../lib/downloadFile');
const arXiv = require('../lib/arXivLib');
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

module.exports = router;
