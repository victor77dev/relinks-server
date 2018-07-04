const axios = require('axios');
const freeCiteApiUrl = 'http://freecite.library.brown.edu/citations/create';

exports.findAbstract = function(pdfData) {
  let found = false;
  let title = null;
  let content = [];
  for (let data of pdfData) {
    let result = data.string.search(/abstract/i);
    // End search if abstract is found
    // Assume abstract only got 1 paragraph
    if (found) {
      content.push(data);
      break;
      // Incorrect Assumption: Assume all session headings have similar size as Abstract
      // if (Math.abs(data.fontHeight - title.fontHeight) < 0.5)
      //   break;
      // Append data until next heading found
      // content.push(data);
    }
    // Searching for title
    if (result >= 0) {
      found = true;
      title = data;
      // Check Abstract heading is in the same paragraph with content
      if (title.string.length > 10) {
        content.push(data.string.replace(/abstract.?\s/gi, ''));
        title = title.string.match(/abstract/gi)[0];
        break;
      }
    }
  }
  return {found: found, title: title, content: content};
}

exports.findHeadingFontHeight = function(pdfData) {
  // Assume there must be introduction session and all headings have similar size
  for (let data of pdfData) {
    // Searching for title
    let result = data.string.match(/[0-9I]*[.,\s]*introduction/i);
    if (result)
      return data.fontHeight;
  }
}


exports.findSession = function(pdfData, sessionHeading) {
  let headingFontHeight = this.findHeadingFontHeight(pdfData);
  let found = false;
  let title = null;
  let content = [];
  for (let data of pdfData) {
    let pattern = sessionHeading;
    let regex = new RegExp(pattern, 'i');
    let result = data.string.search(regex);
    if (found) {
      // Assume all session headings have similar size as Introduction
      if (Math.abs(data.fontHeight - title.fontHeight) < 0.5) {
        if (content.length !== 0)
          break;
        else {
          // All paragraph and headings are same height
          // Assume all headings are in upper case
          if (data.string === data.string.toUpperCase())
            break;
        }
      }
      // Append data until next heading found
      content.push(data);
    }
    // Searching for title
    // 1. Assume all session headings have similar size as Introduction
    // 2. Assume headings for related work would be less than or equal to 60 chars
    if (result >= 0 && Math.abs(data.fontHeight - headingFontHeight) < 0.5 && data.string.length <= 60) {
      found = true;
      title = data;
    }
  }
  return {found: found, title: title, content: content};
}

exports.findRelatedWork = function(pdfData) {
  return this.findSession(pdfData, 'related work');
}

exports.findReference = function(pdfData) {
  let referenceRaw = this.findSession(pdfData, 'reference');
  // Check reference format to see if need to split
  let pattern = '^\\[[0-9]*\\]';
  let regex = new RegExp(pattern, 'g');
  for (let refData of referenceRaw.content) {
    let refRequireSplit = refData.string.match(regex);
    if (refRequireSplit) {
      // Need to split
      let newRefContent = [];
      refSplit = refData.string.split(/([[0-9]*])/);
      for (let i = 0; i < refSplit.length; i +=2) {
        let newRefData = {};
        newRefData.fontName = refData.fontName;
        newRefData.fontHeight = refData.fontHeight;
        newRefData.string = refSplit[i] + refSplit[i + 1];
        newRefContent.push(newRefData);
      }
      referenceRaw.content = newRefContent;
    }
  }
  return referenceRaw;
}

exports.parseReference = function(refData) {
  // Using FreeCite Api to parse references (http://freecite.library.brown.edu)
  let citations = [];
  for (let data of refData.content)
    citations.push(data.string);
  return axios.post(freeCiteApiUrl, {citation: citations})
  .then((response) => {
    let xmlData = response.data;
    // Fix title parsing bug when it is paper on arXiv
    // arXiv info will always parse into title
    // E.g. "title":"Incremental network quantiza- tion: Towards lossless cnns with low-precision weights. arXiv preprint arXiv:1702.03044"
    for (let data of xmlData) {
      if (data.title !== null)
        data.title = data.title.replace(/\. arXiv.*/g, '');
    }
    return Promise.resolve(xmlData);
  }).catch((err) => {
    return Promise.reject(err);
  })
}