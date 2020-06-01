const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const keys = require('../config/keys');

const client = redis.createClient(keys.redisUrl);
client.hget = util.promisify(client.hget);

// Reference to original exec function
const exec = mongoose.Query.prototype.exec;

// Method that enable caching
mongoose.Query.prototype.cache = function (options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || '');

  return this;
};

// Override exec function
mongoose.Query.prototype.exec = async function () {
  if (!this.useCache) {
    console.log('No caching!');
    return exec.apply(this, arguments);
  }

  // Creation of key for caching
  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name,
    })
  );

  // See if we have a value for 'key' in redis
  const cacheValue = await client.hget(this.hashKey, key);

  // If we do, return that
  if (cacheValue) {
    console.log('return from redis');
    const doc = JSON.parse(cacheValue);

    // Should return a Mongo document
    return Array.isArray(doc)
      ? doc.map((d) => new this.model(d))
      : new this.model(doc);
  }

  //Otherwise, issue the query and store the result in redis
  const result = await exec.apply(this, arguments);

  //client.set(key, JSON.stringify(result));

  // Set value in Redis with expiration time in seconds
  client.hset(this.hashKey, key, JSON.stringify(result));
  client.expire(this.hashKey, 60);

  return result;
};

module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  },
};
