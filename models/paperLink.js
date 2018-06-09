var mongoose = require('mongoose');

let config = require('../config.json');
let dbPath = config.db.basePath;

mongoose.connect(dbPath);

var db = mongoose.connection;

// Paper Link Schema
var PaperLinkSchema = mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  previous: [],
  next: []
});

PaperLinkSchema.index({'previous.id': 1});
PaperLinkSchema.index({'next.id': 1});
var PaperLink = module.exports = mongoose.model('link', PaperLinkSchema);

module.exports.getPaperLinkById = function(id, callback) {
  PaperLink.findById(id, callback);
}

module.exports.addPaperLink = function(ids, callback) {
  // 1. Add Related Paper to Current Paper 'previous'
  // Check link already exists
  let addPreviousPromise = PaperLink.findOne({_id: ids.current, previous: {$elemMatch: {id: ids.previous}}}, function(err, link) {
    if (err) throw err;
    if (link !== null)
      return Promise.resolve(link);
    // Add link if current paper exists
    PaperLink.findByIdAndUpdate(ids.current, {$push: {previous: {id: ids.previous}}}, function(err, link) {
      if (err) throw err;
      if (link !== null)
        return Promise.resolve(link);
      // Add current paper to db if not exists
      let newPaperLink = new PaperLink({
        _id: ids.current,
        previous: [{id: ids.previous}],
      });
      newPaperLink.save(function(err, link) {
        if (err === null)
          return Promise.resolve(link);
        if (err.code === 11000) {
          let query = {_id: ids.current, previous: {$elemMatch: {id: ids.previous}}};
          PaperLink.findOne(query, function(err, link) {
            if (err) throw err;
            if (link !== null)
              return Promise.reject({err: {linkExist: true, error: 'Duplicate link', _id: link._id}, link: {_id: link._id}});
            else
              // Retry add link as there maybe concurrent creation happened
              PaperLink.findByIdAndUpdate(ids.current, {$push: {previous: {id: ids.previous}}}, function(err, link) {
                if (err) throw err;
                if (link !== null)
                  return Promise.resolve(link);
              });
          });
        } else
          throw err;
      });
    });
  });
  // 2. Add Current Paper to Related Paper 'next'
  // Check link already exists
  let addNextPromise = PaperLink.findOne({_id: ids.previous, next: {$elemMatch: {id: ids.current}}}, function(err, link) {
    if (err) throw err;
    if (link !== null)
      return Promise.resolve(link);
    // Add link if related paper exists
    PaperLink.findByIdAndUpdate(ids.previous, {$push: {next: {id: ids.current}}}, function(err, link) {
      if (err) throw err;
      if (link !== null)
        return Promise.resolve(link);
      // Add related paper to db if not exists
      let newPaperLink = new PaperLink({
        _id: ids.previous,
        next: [{id: ids.current}],
      });
      newPaperLink.save(function(err, link) {
        if (err === null)
          return Promise.resolve(link);
        if (err.code === 11000) {
          let query = {_id: ids.current, next: {$elemMatch: {id: ids.current}}};
          PaperLink.findOne(query, function(err, link) {
            if (err) throw err;
            if (link !== null)
              return Promise.reject({err: {linkExist: true, error: 'Duplicate link', _id: link._id}, link: {_id: link._id}});
            else
              // Retry add link as there maybe concurrent creation happened
              PaperLink.findByIdAndUpdate(ids.previous, {$push: {next: {id: ids.current}}}, function(err, link) {
                if (err) throw err;
                if (link !== null)
                  return Promise.resolve(link);
              });
          });
        } else
          throw err;
      });
    });
  });
  Promise.all([addNextPromise, addPreviousPromise].map(p => p.catch(e => e)))
  .then((results) => {
    let error = [];
    for (let result of results) {
      if ('err' in result)
        error.push(result);
    }
    if (error.length > 0)
      return callback(error, results);
    else
      return callback(null, results);
  }).catch((err) => {
    console.log('Error found in PaperLink. This route should not be reached');
    return callback(err);
  })
}