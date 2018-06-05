exports.findAuthorsLastName = function(reference) {
  for (let i = 0; i < reference.length; i++) {
    let authorsLastName = [];
    for (let name of reference[i].authors) {
      let temp = name.split(' ');
      authorsLastName.push(temp.splice(-1)[0]);
    }
    reference[i].authorsLastName = authorsLastName;
  }
  return reference;
}

exports.searchPaperWithLastName = function(relatedWork, reference) {
  let foundLinks = [];
  for (let paragraph of relatedWork.content) {
    let data = paragraph.string;
    for (let paper of reference) {
      for (let lastName of paper.authorsLastName) {
        let foundAuthorIndex = data.search(lastName);
        if (foundAuthorIndex >= 0) {
          let refFound = data.substring(foundAuthorIndex);
          let pattern = lastName + '\\s+et\\sal[\\s.,)(]*[0-9]*';
          let regex = new RegExp(pattern, 'g');
          refFound = refFound.match(regex);
          if (refFound !== null && refFound.length > 0) {
            refFound = refFound[0].replace(lastName, '').replace('et al', '');
            refFound = refFound.replace(/\./g, '').replace(/,/g, '').replace(/\(/g, '').replace(/\)/g, '');
            let year = parseInt(refFound);
            // Check publish year to confirm
            if (year === parseInt(paper.year)) {
              // Check if paper is already added
              let newPaper = true;
              for (let link of foundLinks) {
                if (paper.title === link.title && paper.raw_string === link.raw_string) {
                  newPaper = false;
                  break;
                }
              }
              paper.foundParagraph = paragraph;
              if (newPaper)
                foundLinks.push(paper);
            }
          }
        }
      }
    }
  }
  return foundLinks;
}

exports.searchPaperWithRefIndex = function(relatedWork, reference) {
  let foundLinks = [];
  let pattern = '\\[[0-9]*\\]';
  let regex = new RegExp(pattern, 'g');
  for (let paragraph of relatedWork.content) {
    let refFound = paragraph.string.match(regex);
    if (refFound === null || refFound.length <= 0)
      continue;
    for (let refTag of refFound) {
      let refIndex = parseInt(refTag.replace(/[\]\[]/g, ''));
      // Check if paper is already added
      let newPaper = true;
      for (let link of foundLinks) {
        if (refIndex === link.refIndex) {
          newPaper = false;
          break;
        }
      }
      let paper = reference[refIndex];
      paper.foundParagraph = paragraph;
      paper.refIndex =  refIndex

      if (newPaper)
        foundLinks.push(paper);
    }
  }
  return foundLinks;
}

exports.papersLinksInRelatedWork = function(paperInfo, relatedWork, reference) {
  this.findAuthorsLastName(reference);
  let links = {current: paperInfo};
  // 1. Search for related papers by authors last name
  let previousLinks = this.searchPaperWithLastName(relatedWork, reference);
  // 2. Search for related papers by reference index
  previousLinks = previousLinks.concat(this.searchPaperWithRefIndex(relatedWork, reference));

  links.previous = previousLinks;
  return links;
}