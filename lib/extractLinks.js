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
              paper.foundParagraph = paragraph;
              foundLinks.push(paper)
            }
          }
        }
      }
    }
  }
  return foundLinks;
}

exports.papersLinksInRelatedWork = function(paperInfo, relatedWork, reference) {
  this.findAuthorsLastName(reference);
  let links = {current: paperInfo};
  // 1. Search for related papers by authors last name
  let previousLinks = this.searchPaperWithLastName(relatedWork, reference);

  links.previous = previousLinks;
  return links;
}