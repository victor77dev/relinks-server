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

module.exports.addPaperLink = function(linkData, callback) {
  // 1. Add Related Paper to Current Paper 'previous'
  // Check link already exists
  let addPreviousPromise = new Promise(function(resolve, reject) {
    PaperLink.findOneAndUpdate({_id: linkData.current, previous: {$elemMatch: {id: linkData.previous}}}, {
      $set: {'previous.$.details': linkData.details}
    }, function(err, link) {
      if (err) throw err;
      if (link !== null)
        return resolve(link);
      // Add link if current paper exists
      PaperLink.findByIdAndUpdate(linkData.current, {$push: {previous: {
        id: linkData.previous,
        details: linkData.details
      }}}, function(err, link) {
        if (err) throw err;
        if (link !== null)
          return resolve(link);
        // Add current paper to db if not exists
        let newPaperLink = new PaperLink({
          _id: linkData.current,
          previous: [{id: linkData.previous, details: linkData.details}],
        });
        newPaperLink.save(function(err, link) {
          if (err === null)
            return resolve(link);
          if (err.code === 11000) {
            let query = {_id: linkData.current, previous: {$elemMatch: {id: linkData.previous}}};
            PaperLink.findOne(query, function(err, link) {
              if (err) throw err;
              if (link !== null)
                return reject({err: {linkExist: true, error: 'Duplicate link', _id: link._id}, link: {_id: link._id}});
              else
                // Retry add link as there maybe concurrent creation happened
                PaperLink.findByIdAndUpdate(linkData.current, {$push: {previous: {
                  id: linkData.previous,
                  details: linkData.details
                }}}, function(err, link) {
                  if (err) throw err;
                  if (link !== null)
                    return resolve(link);
                });
            });
          } else
            throw err;
        });
      });
    });
  });
  // 2. Add Current Paper to Related Paper 'next'
  // Check link already exists
  let addNextPromise = new Promise(function(resolve, reject) {
    PaperLink.findOne({_id: linkData.previous, next: {$elemMatch: {id: linkData.current}}}, function(err, link) {
      if (err) throw err;
      if (link !== null)
        return resolve(link);
      // Add link if related paper exists
      PaperLink.findByIdAndUpdate(linkData.previous, {$push: {next: {
          id: linkData.current,
          details: linkData.details
      }}}, function(err, link) {
        if (err) throw err;
        if (link !== null)
          return resolve(link);
        // Add related paper to db if not exists
        let newPaperLink = new PaperLink({
          _id: linkData.previous,
          next: [{id: linkData.current, details: linkData.details}],
        });
        newPaperLink.save(function(err, link) {
          if (err === null)
            return resolve(link);
          if (err.code === 11000) {
            let query = {_id: linkData.current, next: {$elemMatch: {id: linkData.current}}};
            PaperLink.findOne(query, function(err, link) {
              if (err) throw err;
              if (link !== null)
                return reject({err: {linkExist: true, error: 'Duplicate link', _id: link._id}, link: {_id: link._id}});
              else
                // Retry add link as there maybe concurrent creation happened
                PaperLink.findByIdAndUpdate(linkData.previous, {$push: {next: {
                  id: linkData.current,
                  details: linkData.details
                }}}, function(err, link) {
                  if (err) throw err;
                  if (link !== null)
                    return resolve(link);
                });
            });
          } else
            throw err;
        });
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