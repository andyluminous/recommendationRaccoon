
const config = require('./config.js');
const algo = require('./algorithms.js');
const async = require('async');
const Key = require('./key');

let client;

const updateSequence = function(userId, itemId, options = {}){
  let updateWilson = true;
  if ('updateWilson' in options) {
    updateWilson = options.updateWilson ? true : false;
  }

  return new Promise((resolve, reject) => {
    algo.updateSimilarityFor(userId, function(){
      async.parallel([
        function(cb){
          algo.updateWilsonScore(itemId, function(){
            cb(null);
          });
        },
        function(cb){
          algo.updateRecommendationsFor(userId, function(){
            cb(null);
          });
        }
      ],
      function(err){
        if (err){console.log('error', err);}
        resolve();
      });
    });
  });
};

const changeRating = function(userId, itemId, options){
  let updateRecommendations = true;
  if ('updateRecs' in options) {
    updateRecommendations = options.updateRecs ? true : false;
  }

  const removeRating = options.removeRating ? true : false;

  const feelingItemSet = options.liked ? Key.itemLikedBySet(itemId) : Key.itemDislikedBySet(itemId);
  const feelingUserSet = options.liked ? Key.userLikedSet(userId) : Key.userDislikedSet(userId);
  const mostFeelingSet = options.liked ? Key.mostLiked() : Key.mostDisliked();

  return new Promise((resolve, reject) => {
    Promise.resolve().then(() => {
      // check if the rating is already stored
      return client.sismember(feelingItemSet, userId);
    }).then((result) => {
      // only increment the most feeling set if it doesn't already exist
      if (result === 0 && !removeRating) {
        client.zincrby(mostFeelingSet, 1, itemId);
      } else if (result > 0 && removeRating) {
        client.zincrby(mostFeelingSet, -1, itemId);
      }
      return removeRating ? client.srem(feelingUserSet, itemId) :
        client.sadd(feelingUserSet, itemId);
    }).then(() => {
      return removeRating ? client.srem(feelingItemSet, userId) :
        client.sadd(feelingItemSet, userId);
    }).then(() => {
      return client.sismember(feelingItemSet, userId);
    }).then((result) => {
      // only fire update sequence if requested by the user
      // and there are results to compare
      if (updateRecommendations && result > 0) {
        updateSequence(userId, itemId).then(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
};

const liked = function(userId, itemId, options = {}){
  options.liked = true;
  return changeRating(userId, itemId, options);
};

const disliked = function(userId, itemId, options = {}){
  options.liked = false;
  return changeRating(userId, itemId, options);
};

const unliked = function(userId, itemId, options = {}){
  options.liked = true;
  options.removeRating = true;
  return changeRating(userId, itemId, options);
};

const undisliked = function(userId, itemId, options = {}){
  options.liked = false;
  options.removeRating = true;
  return changeRating(userId, itemId, options);
};

const setClient = function(inClient) {
  client = inClient;
};

const input = {
  liked,
  disliked,
  unliked,
  undisliked,
  updateSequence,
  setClient,
};

module.exports = input;
