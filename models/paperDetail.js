var mongoose = require('mongoose');
const maxHistory = 5;

let config = require('../config.json');
let dbPath = config.db.basePath;

mongoose.connect(dbPath);

var db = mongoose.connection;

// Paper Detail Schema
var PaperDetailSchema = mongoose.Schema({
  title: {
    type: String,
    index: true,
    required: true,
    unique: true
  },
  arxiv: [],
  ref: []
});

PaperDetailSchema.index({'arxiv.author': 1});
PaperDetailSchema.index({'ref.authors': 1});
PaperDetailSchema.index({'title': 'text', 'arxiv.summary': 'text', 'arxiv.author': 'text', 'ref.authors': 'text'});
var PaperDetail = module.exports = mongoose.model('detail', PaperDetailSchema);

module.exports.getPaperById = function(id, callback) {
  PaperDetail.findById(id, callback);
}

module.exports.getPaperByTitle = function(title, callback) {
  let query = {title: title};
  PaperDetail.findOne(query, callback);
}

module.exports.searchPaper = function(search, limit=0, callback) {
  let query = {$text: {$search: search}};
  PaperDetail.find(query, callback).limit(limit);
}

module.exports.updatePaperData = function(id, data, target, callback) {
  PaperDetail.findOne({_id: id, [target]: {$elemMatch: data}}, function(err, paper) {
    if (err) throw err;
    // Check if need to update
    if (paper !== null) {
      // Simple check if there is modification using JSON.stringify
      if (JSON.stringify(paper[target].slice(-1)[0]) === JSON.stringify(data))
        return callback(null, {updated: false});
    }

    // Data is not the same as latest one, Need update.
    PaperDetail.findById(id, function(err, paper) {
      if (err) throw err;
      let sameData = true;
      let titleData;
      const pushData = target.reduce((allUpdate, curTarget) => {
        let updateData = null;
        if (typeof(data[curTarget]) === 'object')
          updateData = Object.assign({}, paper[curTarget].slice(-1)[0], data[curTarget].slice(-1)[0]);
        else if (curTarget === 'title' && paper['title'] !== data[curTarget]) {
          titleData = {title: data[curTarget]};
          sameData = false;
        }
        // Check if it is the same
        // Simple check if there is modification using JSON.stringify
        if (JSON.stringify(updateData) !== JSON.stringify(paper[curTarget].slice(-1)[0])) {
          sameData = false;
          if (updateData !== null && (Object.keys(updateData).length !== 0 || updateData.constructor !== Object))
            allUpdate[curTarget] = updateData;
        }
        return allUpdate;
      }, {});
      if (sameData || (Object.keys(pushData).length === 0 && pushData.constructor === Object))
        return callback(null, {updated: false, paper: paper});
      // Update target data
      PaperDetail.findByIdAndUpdate(id, {$push: pushData, $set: titleData}, function(err, paper) {
        if (err) throw err;
        const pushData = target.every((curTarget) => {
          if (typeof(paper[curTarget]) === 'object') {
            // Keep max history
            if (paper[curTarget].length > maxHistory) {
              PaperDetail.findByIdAndUpdate(id, {$pop: {[curTarget]: -1}}, function(err, paper) {
                if (err) throw err;
              });
            }
          }
        });
        return callback(null, {updated: true, paper: paper});
      });
    });
  });
}

module.exports.updatePaperRef = function(id, data, callback) {
  this.updatePaperData(id, data, ['ref'], callback);
}

module.exports.updatePaperArxiv = function(id, data, callback) {
  this.updatePaperData(id, data, ['arxiv'], callback);
}

module.exports.addPaper = function(paperInfo, callback) {
  let paperTitle = null;
  if (paperInfo.title)
    paperTitle = paperInfo.title;
  else if (paperInfo.arxiv)
    paperTitle = paperInfo.arxiv.title;
  else if (paperInfo.ref)
    paperTitle = paperInfo.ref.title;

  // Check paper title exist
  if (!paperTitle)
    throw {paperExist: false, error: 'Cannot find title'};

  let newPaperDetail = new PaperDetail({
    title: paperTitle,
    arxiv: paperInfo.arxiv,
    ref: paperInfo.ref
  });
  newPaperDetail.save(function(err, paper) {
    if (err === null)
      return callback(err, paper);
    if (err.code === 11000) {
      let query = {title: paperTitle};
      PaperDetail.findOne(query, function(err, paper) {
        if (err) throw err;
        return callback({paperExist: true, error: 'Duplicate paper title', _id: paper._id}, {_id: paper._id});
      });
    } else
      throw err;
  });
}
