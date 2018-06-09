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
var PaperDetail = module.exports = mongoose.model('detail', PaperDetailSchema);

module.exports.getPaperById = function(id, callback) {
  PaperDetail.findById(id, callback);
}

module.exports.getPaperByTitle = function(title, callback) {
  let query = {title: title};
  PaperDetail.findOne(query, callback);
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
      let updateData = Object.assign({}, paper[target].slice(-1)[0], data);
      // Check if it is the same
      // Simple check if there is modification using JSON.stringify
      if (JSON.stringify(updateData) === JSON.stringify(paper[target].slice(-1)[0]))
        return callback(null, {updated: false, paper: paper});
      // Update target data
      PaperDetail.findByIdAndUpdate(id, {$push: {[target]: updateData}}, function(err, paper) {
        if (err) throw err;
        // Keep max history
        if (paper[target].length > maxHistory)
        PaperDetail.findByIdAndUpdate(id, {$pop: {[target]: -1}}, function(err, paper) {
          if (err) throw err;
          return callback(null, {updated: true, paper: paper});
        });
      });
    });
  });
}

module.exports.updatePaperRef = function(id, data, callback) {
  this.updatePaperData(id, data, 'ref', callback);
}

module.exports.updatePaperArxiv = function(id, data, callback) {
  this.updatePaperData(id, data, 'arxiv', callback);
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
