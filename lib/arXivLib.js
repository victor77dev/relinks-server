const axios = require('axios');
const xml2js = require('xml2js');

exports.getXml = function(query, title=false) {
  const baseUrl = 'http://export.arxiv.org/api/query';
  let updateQuery = '';
  if (title)
    updateQuery = 'ti:"' + query + '"';
  else {
    updateQuery = 'all:'+ query;
    updateQuery = updateQuery.replace(/ /g, ' AND all:');
  }
  let queryParam = {
    params:{
      search_query: updateQuery,
      sortBy: 'lastUpdatedDate',
      sortOrder: 'descending',
      start: 0,
      max_results: 3,
    }
  };

  return new Promise((resolve, reject) => {
    axios.get(baseUrl, queryParam)
    .then(function (response) {
        return resolve(response.data);
    })
    .catch(function (error) {
      return reject(error);
    });
  });
}

function filterInfo(entry, info) {
  let resultEntry = {};
  for (let addInfo of info) {
    if (addInfo === 'link') {
      // 'id' should be the same as the html link in 'link'
      let infoData = entry['id'][0];
      resultEntry[addInfo] = infoData;
      continue;
    }
    if (addInfo === 'pdf') {
      let infoData = null;
      entry.link.forEach((link) => {
        if (link.$.type === 'application/pdf' || link.$.title === 'pdf')
          infoData = link.$.href;
      });
      if (infoData === null)
        console.log('Warning: Failed to find pdf link');
      resultEntry[addInfo] = infoData;
      continue;
    }
    if (addInfo === 'author') {
      let infoData = [];
      entry.author.forEach((author) => {
        infoData.push(author.name[0]);
      });
      resultEntry[addInfo] = infoData;
      continue;
    }
    // Add info for other cases
    resultEntry[addInfo] = entry[addInfo][0];
  }
  return resultEntry;
}

exports.parseXml = function(xmlData, title=null, info=['title', 'link', 'pdf', 'summary', 'author', 'updated', 'published']) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xmlData, {
        // Remove whitespace in data
        // NOTE: summary whitespace looks like cannot be removed
        trim: true,
        normalize: true
      },
      function (err, result) {
        if (err) return reject(err);
        const entries = result.feed.entry;
        let resultInfo = [];
        for (let entry of entries) {
          // Return all the entries in js object if title is not specified
          if (title === null)
            resultInfo.push(filterInfo(entry, info));
          // Find the entry with specified title
          if (title === entry.title[0]) {
            resultInfo = filterInfo(entry, info);
            break;
          // Allow title that is not exact matched (As there maybe typos/spaces)
          } else if (entry.title[0].search(title) != -1) {
            resultInfo = filterInfo(entry, info);
            break;
          }
        }
        return resolve(resultInfo);
    }); 
  }); 
}

exports.getInfo = function(title, info=['title', 'link', 'pdf', 'summary', 'author', 'updated', 'published']) {
  return new Promise((resolve, reject) => {
    this.getXml(title, true).then((data) => {
      this.parseXml(data, title, info).then((resultInfo) => {
        return resolve(resultInfo);
      })
      .catch((err) => {
        console.log('Failed to parse Xml data.');
        return reject(err);
      });
    })
    .catch((err) => {
      console.log('Failed to get Xml data from arXiv.');
      return reject(err);
    });
  });
}