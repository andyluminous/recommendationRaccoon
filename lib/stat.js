
const config = require('./config');
const Key = require('./key');

let client;

const stat = {
  recommendFor: function(userId, numberOfRecs){
    return new Promise((resolve, reject) => {
      Promise.resolve().then(() => {
        /**
         * get count of user recommended set and active items set
         */
        return client.multi()
          .zcard(Key.activeItemsZSet())
          .zcard(Key.recommendedZSet(userId))
          .exec();
      }).then(([activeItemsCount, recommendedItemCount]) => {
        switch (true) {
          case (activeItemsCount > 0 && recommendedItemCount > 0):
            /**
             * if both sets are not empty, create intersection set
             */
            return client.zinterstore(
              Key.userIntersectionZSet(userId), 
              2,
              Key.recommendedZSet(userId),
              Key.activeItemsZSet()).then(() => {
                /**
                 * get contents from intersection set
                 */
                return client.zrevrange(Key.userIntersectionZSet(userId), 0, numberOfRecs)
              }).then(results => {
                if (results.length) {
                  return results;
                }
                /**
                 * if intersection is empty fall back to recommended set
                 */
                return client.zrevrange(Key.recommendedZSet(userId), 0, numberOfRecs);
              }).then((results) => {
                resolve(results);
              });
          case (recommendedItemCount > 0):
            /**
             * if active item set is empty, return items from user recommended set
             */
            return client.zrevrange(Key.recommendedZSet(userId), 0, numberOfRecs).then((results) => {
              resolve(results);
            });
          case (activeItemsCount > 0):
            /**
             * if recommended set is empty return items from active items set
             */
            return client.zrevrange(Key.activeItemsZSet(), 0, numberOfRecs).then((results) => {
              resolve(results);
            });
          default:
            /**
             * if both sets are empty return empty result
             */
            return resolve([]);
        }
      })

      client.zrevrange(Key.recommendedZSet(userId), 0, numberOfRecs).then((results) => {
        resolve(results);
      });
    });
  },
  bestRated: function(){
    return new Promise((resolve, reject) => {
      client.zrevrange(Key.scoreboardZSet(), 0, -1).then((results) => {
        resolve(results);
      });
    });
  },
  worstRated: function(){
    return new Promise((resolve, reject) => {
      client.zrange(Key.scoreboardZSet(), 0, -1).then((results) => {
        resolve(results);
      });
    });
  },
  bestRatedWithScores: function(numOfRatings){
    return new Promise((resolve, reject) => {
      client.zrevrange(Key.scoreboardZSet(), 0, numOfRatings, 'withscores').then((results) => {
        resolve(results);
      });
    });
  },
  mostLiked: function(){
    return new Promise((resolve, reject) => {
      client.zrevrange(Key.mostLiked(), 0, -1).then((results) => {
        resolve(results);
      });
    });
  },
  mostDisliked: function(){
    return new Promise((resolve, reject) => {
      client.zrevrange(Key.mostDisliked(), 0, -1).then((results) => {
        resolve(results);
      });
    });
  },
  usersWhoLikedAlsoLiked: function(itemId){
  },
  mostSimilarUsers: function(userId){
    return new Promise((resolve, reject) => {
      client.zrevrange(Key.similarityZSet(userId), 0, -1).then((results) => {
        resolve(results);
      });
    });
  },
  leastSimilarUsers: function(userId){
    return new Promise((resolve, reject) => {
      client.zrange(Key.similarityZSet(userId), 0, -1).then((results) => {
        resolve(results);
      });
    });
  },
  likedBy: function(itemId){
    return new Promise((resolve, reject) => {
      client.smembers(Key.itemLikedBySet(itemId)).then((results) => {
        resolve(results);
      });
    });
  },
  likedCount: function(itemId){
    return new Promise((resolve, reject) => {
      client.scard(Key.itemLikedBySet(itemId)).then((results) => {
        resolve(results);
      });
    });
  },
  dislikedBy: function(itemId){
    return new Promise((resolve, reject) => {
      client.smembers(Key.itemDislikedBySet(itemId)).then((results) => {
        resolve(results);
      });
    });
  },
  dislikedCount: function(itemId){
    return new Promise((resolve, reject) => {
      client.scard(Key.itemDislikedBySet(itemId)).then((results) => {
        resolve(results);
      });
    });
  },
  allLikedFor: function(userId){
    return new Promise((resolve, reject) => {
      client.smembers(Key.userLikedSet(userId)).then((results) => {
        resolve(results);
      });
    });
  },
  allDislikedFor: function(userId){
    return new Promise((resolve, reject) => {
      client.smembers(Key.userDislikedSet(userId)).then((results) => {
        resolve(results);
      });
    });
  },
  allWatchedFor: function(userId){
    return new Promise((resolve, reject) => {
      client.sunion(Key.userLikedSet(userId), Key.userDislikedSet(userId)).then((results) => {
        resolve(results);
      });
    });
  },
  setClient: function(inClient) {
    client = inClient;
  },
};

module.exports = exports = stat;
