var express = require('express');
var router = express.Router();

const dlFile = require('../lib/downloadFile');
const arXiv = require('../lib/arXivLib');
const pdfReader = require('../lib/pdfReader');
const articleParser = require('../lib/articleParser');
const extractLinks = require('../lib/extractLinks');

// Using mongoose model
const PaperDetail = require('../models/paperDetail');
const PaperLink = require('../models/paperLink');

/* GET home page. */
router.get('/', function(req, res, next) {
  return res.render('index', { title: 'Express' });
});

router.get('/testDownloadFile', function(req, res, next) {
  // Testing download pdf with link
  const url = 'https://openreview.net/pdf?id=BJ8vJebC-';
  const dirPath = 'downloadFiles';
  let filename = 'testing.pdf';
  dlFile.downloadFile(url, filename, dirPath).then((msg) => {
    console.log(msg);
    return res.render('index', { title: 'Downloaded link' });
  }).catch((err) => {
    console.log(err);
    return res.render('index', { title: 'Failed to download link' });
  })
});

router.get('/testGetPaperInfo', function(req, res, next) {
  // Testing get paper info from arXiv using paper title
  const paperTitle = 'Synthetic and Natural Noise Both Break Neural Machine Translation';
  arXiv.getInfo(paperTitle).then((paperInfo) => {
    return res.render('index', { title: JSON.stringify(paperInfo) });
  }).catch((err) => {
    console.log(err);
    return res.render('index', { title: 'Failed to get paper info' });
  })
});

router.get('/testDownloadPdfWithTitle', function(req, res, next) {
  // Testing download pdf from arXiv using title (get pdf link + download pdf)
  const paperTitle = 'Synthetic and Natural Noise Both Break Neural Machine Translation';
  arXiv.getInfo(paperTitle).then((paperInfo) => {
    const pdfLink = paperInfo.pdf;
    const pdfFilename = paperInfo.pdf.split('/').pop() + '.pdf';
    const dirPath = 'downloadFiles';
    if (pdfLink === null)
      return res.render('index', { title: 'Failed to find pdf link' });
    dlFile.downloadFile(pdfLink, pdfFilename, dirPath).then((msg) => {
      console.log(msg);
      return res.render('index', { title: 'Downloaded pdf' });
    }).catch((err) => {
      console.log(err);
      return res.render('index', { title: 'Failed to download from link' });
    })
  }).catch((err) => {
    console.log(err);
    return res.render('index', { title: 'Failed to get info' });
  });
});

router.get('/testParsePdfSessions', function(req, res, next) {
  const paperInfo = {title: 'Synthetic and Natural Noise Both Break Neural Machine Translation'};
  const pdfFilename = paperInfo.title + '.pdf';
  const dirPath = 'downloadFiles';

  pdfReader.readPdf(pdfFilename, dirPath)
  .then((pdfData) => {
    return res.render('index', { title: JSON.stringify(pdfData) });
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
      return res.render('index', { title: JSON.stringify(relatedWork) });
    else
      return res.render('index', { title: 'Cannot find Related Work session' });
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
        return res.render('index', { title: JSON.stringify(reference) });
      }).catch((err) => {
        console.log(err);
      });
    }
    else
      return res.render('index', { title: 'Cannot find Reference session' });
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
      return res.render('index', { title: JSON.stringify(relatedWorkLinks) });
    }).catch((err) => {
      console.log(err);
    });
  }).catch((err) => {
    console.log(err);
  });
});

router.get('/addPaper', function(req, res, next) {
  const { title, paperId } = req.query;
  let paperExist = false;
  // Get Paper Info with title
  arXiv.getInfo(title).then((paperInfo) => {
    const pdfLink = paperInfo.pdf;
    const pdfTitle = paperInfo.title;
    // Save Paper Info to db (PaperDetail)
    let paperDetailId = null;
    // Update title if paperId exist and the title is different
    if (paperId) {
      PaperDetail.updatePaperData(paperId, {title: pdfTitle}, ['title'], function(err, paper) {
        if (err) return reject({id: paperId, errCode: 111, msg: 'Failed to update paper title', error: err});
        PaperDetail.addPaper({title: pdfTitle, arxiv: paperInfo}, function(err, paper) {
          if (err) {
            paperExist = err.paperExist;
            if (paperExist)
              paperDetailId = paper._id;
          } else
            paperDetailId = paper._id;
        });
      });
    } else {
      PaperDetail.addPaper({title: pdfTitle, arxiv: paperInfo}, function(err, paper) {
        if (err) {
          paperExist = err.paperExist;
          if (paperExist)
            paperDetailId = paper._id;
        } else
          paperDetailId = paper._id;
      });
    }

    const pdfFilename = paperInfo.pdf.split('/').pop() + '.pdf';
    const dirPath = 'downloadFiles';
    if (pdfLink === null)
      return res.send({paperId: paperDetailId, paperExist: paperExist, error: 'Failed to find pdf link'});
    // Download paper from arXiv
    dlFile.downloadFile(pdfLink, pdfFilename, dirPath).then((msg) => {
      console.log(msg);
      // Extract Related Paper from Related Work Session
      pdfReader.readPdf(pdfFilename, dirPath)
      .then((pdfData) => {
        let relatedWork = articleParser.findRelatedWork(pdfData)
        let referenceRaw = articleParser.findReference(pdfData)
        if (!relatedWork.found)
          return res.send({paperId: paperDetailId, paperExist: paperExist, error: 'Cannot find Related work session' });
        if (!referenceRaw.found)
          return res.send({paperId: paperDetailId, paperExist: paperExist, error: 'Cannot find Reference session' });
        // Get Related Papers Info from Reference
        articleParser.parseReference(referenceRaw)
        .then((reference) => {
          let relatedWorkLinks = extractLinks.papersLinksInRelatedWork(paperInfo, relatedWork, reference);
          let addAllRelatedPaperPromise = [];
          // Add Paper Detail Record for found Related Paper
          for (let relatedPaper of relatedWorkLinks.previous) {
            // Move foundParagraph and refIndex to PaperLinks
            let linksDetail = {};
            if ('foundParagraph' in relatedPaper) {
              linksDetail.foundParagraph = relatedPaper.foundParagraph.string;
              delete relatedPaper.foundParagraph;
            }
            if ('refIndex' in relatedPaper) {
              linksDetail.refIndex = relatedPaper.refIndex;
              delete relatedPaper.refIndex;
            }
            // Creating deffered promise for adding paper id
            let addIdDeferred = {};
            let addPaperDetailId = new Promise(function(resolve, reject) {
              addIdDeferred = {resolve: resolve, reject: reject};
            });
            let currentRelatedPaperId = null;
            let paperDetailDbPromise = new Promise(function(resolve, reject) {
              // TODO: Check the closest name
              let paperTitle = relatedPaper.title;
              PaperDetail.addPaper({title: paperTitle, ref: relatedPaper}, function(err, paper) {
                if (err) {
                  if ('paperExist' in err)
                    paperExist = err.paperExist;
                  if (paperExist)
                    currentRelatedPaperId = paper._id;
                } else
                  currentRelatedPaperId = paper._id;
                // Resolve after getting PaperDetail id and trigger PaperLink insert data
                if (currentRelatedPaperId !== null)
                  addIdDeferred.resolve({current: paperDetailId, previous: currentRelatedPaperId, details: linksDetail});

                // Find Related Paper from arXiv
                arXiv.getInfo(paperTitle).then((paperInfo) => {
                  // Update Paper Detail with arXiv Data
                  PaperDetail.updatePaperArxiv(currentRelatedPaperId, paperInfo, function(err, paper) {
                    if (err) return reject({id: currentRelatedPaperId, errCode: 111, msg: 'Failed to update arXiv data', error: err});
                    return resolve({id: currentRelatedPaperId, paper: paper});
                  });
                }).catch((err) => {
                  if ('found' in err && !err.found) {
                    if ('data' in err) {
                      // Cannot find paper with same title, get all papers return from arXiv
                      let similarPapers = err.data;
                      return reject({id: currentRelatedPaperId, title: paperTitle, similarPapers: similarPapers});
                    } else
                      return reject({id: currentRelatedPaperId, errCode:222, msg: 'Failed to find Paper in arXiv', error: err});
                  }
                  else
                    return reject({id: currentRelatedPaperId, errCode:333, error: err});
                });
              }); // End of PaperDetial.addPaper
            }); // End of paperDetailDbPromise
            addAllRelatedPaperPromise.push(paperDetailDbPromise);

            // Add Paper Links for Related Papers
            let paperLinkDbPromise = new Promise(function(resolve, reject) {
              addPaperDetailId.then((linkData) => {
                return PaperLink.addPaperLink(linkData, function(err, link) {
                  if (err) return Promise.reject({id: currentRelatedPaperId, errCode: 111, error: err});
                  return resolve({link: link});
                });
              }).catch((err) => {
                return reject({errCode:333, error: err});
              });
            }); // End of paperLinkDbPromise
            addAllRelatedPaperPromise.push(paperLinkDbPromise);
          }
          Promise.all(addAllRelatedPaperPromise.map((promise) => {
            return promise.catch((err) => {
              return err;
            });
          })).then((results) => {
            let relatedPaper = [];
            let link = [];
            let dbError = [];
            let arxivNotFound = [];
            let arxivSimilar = [];
            let error = [];
            for (let result of results) {
              if ('paper' in result)
                relatedPaper.push(result);
              if ('link' in result)
                link.push(result);
              if ('similarPapers' in result)
                arxivSimilar.push(result);
              if ('errCode' in result && result.errCode === 111)
                dbError.push(result);
              if ('errCode' in result && result.errCode === 222)
                arxivNotFound.push(result);
              if ('errCode' in result && result.errCode === 333)
                error.push(result);
            }
            return res.send({
              paperId: paperDetailId,
              relatedPaper: relatedPaper,
              link: link,
              dbError: dbError,
              arxivNotFound: arxivNotFound,
              arxivSimilar: arxivSimilar,
              error: error
            });
          }).catch((err) => {
            console.log('Error found. This route should not be reached');
            console.log(err);
          })
        }).catch((err) => {
          console.log(err);
        });
      }).catch((err) => {
        console.log(err);
      });
    }).catch((err) => {
      console.log(err);
      return res.send({paperId: paperDetailId, paperExist: paperExist, error: 'Failed to download from link'});
    })
  }).catch((err) => {
    console.log(err);
    return res.send({paperId: paperDetailId, paperExist: paperExist, error: 'Failed to get info'});
  });
});

router.get('/searchPaper', function(req, res, next) {
  const search = req.query.search;
  let limit = 5;
  PaperDetail.searchPaper(search, limit, function(err, result) {
    return res.send(result);
  })
});

router.get('/getPaper', function(req, res, next) {
  const id = req.query.id;
  PaperDetail.getPaperById(id, function(err, result) {
    if (err) return res.send(err);
    return res.send(result);
  })
});

router.get('/getLink', function(req, res, next) {
  const id = req.query.id;
  PaperLink.getPaperLinkById(id, function(err, result) {
    if (err) return res.send(err);
    return res.send(result);
  })
});

router.get('/getLinkDetails', function(req, res, next) {
  const id = req.query.id;
  PaperLink.getPaperLinkDetailsById(id, function(err, result) {
    if (err) console.log(err);
    if (err || result.length === 0) return res.send({error: 'Cannot get link details'});
    return res.send(result);
  })
});

router.get('/updatePaperArxiv', function(req, res, next) {
  const paperId = req.query.paperId;
  const paperInfo = JSON.parse(req.query.paperInfo);
  PaperDetail.updatePaperArxiv(paperId, paperInfo.arxiv[0], function(err, paper) {
    if (err) return reject({id: paperId, errCode: 111, msg: 'Failed to update arXiv data', error: err});
    return res.send({id: paperId, paper: paper});
  });
});

router.get('/updatePaperRef', function(req, res, next) {
  const paperId = req.query.paperId;
  const paperInfo = JSON.parse(req.query.paperInfo);
  PaperDetail.updatePaperRef(paperId, paperInfo.ref[0], function(err, paper) {
    if (err) return reject({id: paperId, errCode: 111, msg: 'Failed to update ref data', error: err});
    return res.send({id: paperId, paper: paper});
  });
});

router.get('/updatePaper', function(req, res, next) {
  const paperId = req.query.paperId;
  const paperInfo = JSON.parse(req.query.paperInfo);
  PaperDetail.updatePaperData(paperId, paperInfo, ['ref', 'arxiv', 'title'], function(err, paper) {
    if (err) return reject({id: paperId, errCode: 111, msg: 'Failed to update paper data', error: err});
    return res.send({id: paperId, paper: paper});
  });
});

router.get('/getPaperInfoFromArxiv', function(req, res, next) {
  // Testing get paper info from arXiv using paper title
  const { title } = req.query;
  arXiv.getInfo(title, { showAll: true }).then((paperInfo) => {
    return res.send({ title: title, paper: paperInfo });
  }).catch((err) => {
    console.log(err);
    return res.send({ title: title, error: 'Failed to get paper info from arXiv' });
  })
});

module.exports = router;
