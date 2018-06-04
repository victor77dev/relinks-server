exports.findAbstract = function(pdfData) {
  let found = false;
  let title = null;
  let content = [];
  for (let data of pdfData) {
    let result = data.string.search(/abstract/i);
    // End search if abstract is found
    if (found) {
      // Assume all session headings have similar size as Abstract
      if (Math.abs(data.fontHeight - title.fontHeight) < 0.5)
        break;
      // Append data until next heading found
      content.push(data);
    }
    // Searching for title
    if (result >= 0) {
      found = true;
      title = data;
    }
  }
  return {found: found, title: title, content: content};
}

exports.findRelatedWork = function(pdfData) {
  let abstractResult = this.findAbstract(pdfData);
  let found = false;
  let title = null;
  let content = [];
  for (let data of pdfData) {
    let result = data.string.search(/related work/i);
    // End search if abstract is found
    if (found) {
      // Assume all session headings have similar size as Abstract
      if (Math.abs(data.fontHeight - title.fontHeight) < 0.5)
        break;
      // Append data until next heading found
      content.push(data);
    }
    // Searching for title
    // 1. Assume all session headings have similar size as Abstract
    // 2. Assume headings for related work would be less than or equal to 60 chars
    if (result >= 0 && Math.abs(data.fontHeight - abstractResult.title.fontHeight) < 0.5 && data.string.length <= 60) {
      found = true;
      title = data;
    }
  }
  return {found: found, title: title, content: content};
}