const path = require('path');
const pdfReader = require('pdfjs-dist/build/pdf');

function checkConcat(lastChunk, curChunk) {
  let addString = '';
  if (lastChunk === null)
    return {result: false, addString: addString};
  // Using text position to determine now, not using fontName anymore
  // if (lastChunk.fontName !== curChunk.fontName)
  //   return {result: false, addString: addString};
  return checkTextClose(lastChunk, curChunk);
}

function checkTextClose(lastChunk, curChunk) {
  let lastX = lastChunk.transform[4];
  let lastY = lastChunk.transform[5];
  let lastWidth = lastChunk.width;
  let lastHeight = lastChunk.height;
  let lastScale = lastChunk.transform[0];

  let curX = curChunk.transform[4];
  let curY = curChunk.transform[5];
  let curWidth = curChunk.width;
  let curHeight = curChunk.height;
  let curScale = curChunk.transform[0];

  // 1. Next line + next session => not close => new session
  if (lastY - curY > curHeight * 1.5)
    return {result: false, addString: ''};

  // Check if same line
  if (lastY - curY > 2) {
    // 2. Next line + same session => Add space
    if (lastY - curY <= curHeight * 1.5)
      return {result: true, addString: ' '};
  } else {
    // 3. Same line + same word => No space
    if (curX - lastX < 2 + lastWidth)
      return {result: true, addString: ''};
    else
      return {result: true, addString: ' '};
  }

  // Unknown => just concat it to current session
  return {result: true, addString: ''};
}

exports.readPdf = function(filePath, dirPath = '') {
  const pdfPath = path.resolve(dirPath, filePath);

  return pdfReader.getDocument(pdfPath).then(function (pdf) {
    const totalPage = pdf.numPages;
    let pdfData = [];
    let dataString = '';
    let dataFontName = null;
    let dataFontHeight = 0;
    let lastFontName = null;
    let pageList = Array.from({length: totalPage}, (v, i) => i + 1);

    // Fetch the pages.
    const concatText = function(pageNo) {
      return pdf.getPage(pageNo).then(function (page) {
        return page.getTextContent().then(function(res) {
          let items = res.items;
          let lastChunk = null;
          for (let chunk of items) {
            let concat = checkConcat(lastChunk, chunk);
            if (!concat.result && lastChunk !== null) {
              pdfData.push({string: dataString, fontName: dataFontName, fontHeight: dataFontHeight});
              dataString = '';
              dataFontHeight = 0;
              dataFontName = null;
            }
            dataFontHeight = Math.max(dataFontHeight, chunk.height);
            dataFontName = chunk.fontName;
            dataString += concat.addString;
            dataString += chunk.str;
            lastChunk = chunk;
          }
          return Promise.resolve('Page' + pageNo + ' done');
        }).catch((err) => {
          console.log(err);
          return Promise.reject(err);
        });
      }).catch((err) => {
        console.log(err);
        return Promise.reject(err);
      });
    }

    // Fetch page by page for concat text for pages
    const runAllPageSeqPromise = pageList.reduce((promise, pageNo) => {
      return new Promise((resolve, reject) => {
        return resolve(promise.then(() => concatText(pageNo)));
      })
    }, Promise.resolve());

    // Resolve the parsed data after loading all pages
    return runAllPageSeqPromise.then(() => {
      pdfData.push({string: dataString, fontName: dataFontName, fontHeight: dataFontHeight});
      return Promise.resolve(pdfData);
    });
  })
  .catch((err) => {
    return Promise.reject(err);
  });

}