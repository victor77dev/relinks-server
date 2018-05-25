const path = require('path');
const fs = require('fs');
const axios = require('axios');

function downloadLink(url, dlPath) {
  // axios image download with response type "stream"
  return axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  })
  .then((response) => {
    // pipe the result stream into a file on disc
    response.data.pipe(fs.createWriteStream(dlPath));

    // return a promise and resolve when download finishes
    return new Promise((resolve, reject) => {
      response.data.on('end', () => {
        return resolve('File downloaded');
      });
      response.data.on('error', () => {
        return reject('Failed to download the file');
      });
    });
  });
}

exports.downloadFile = function(url, name, dir='') {
  return new Promise(function(resolve, reject) {
    const dlDir = path.resolve(dir);
    // Check if dir exists; if not, create one
    if (!fs.existsSync(dlDir)) {
      try {
        fs.mkdirSync(dlDir);
      } catch (err) {
        return reject('Failed to create new dir');
      }
    }

    // Check if the dlDir is dir
    if (!fs.lstatSync(dlDir).isDirectory()) {
      return reject('this is not a dir');
    }

    // Create download path
    const dlPath = path.resolve(dlDir, name)
    // Check if file exist and show warning
    if (fs.existsSync(dlPath)) {
      console.log('Warning: File already exists! Rewrite the file by new file now.');
    }

    // Download File to dlPath
    downloadLink(url, dlPath).then((msg) => {
      return resolve(msg);
    }).catch((err) => {
      return reject(err);
    });
  });
}

