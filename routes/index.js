var express = require('express');
var router = express.Router();

const dlFile = require('../lib/downloadFile');
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

module.exports = router;
