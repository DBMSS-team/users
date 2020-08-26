const redis = require('redis');
const retryStrategy = require('./retry-strategy');
require('dotenv').config();

class redisFactory {
	constructor() {
		const options = {
			host: process.env.REDIS_HOST,
			port: process.env.REDIS_PORT,
		};

		this.redisClient = redis.createClient({
			retryStrategy: retryStrategy(options),
		});
	}

	/**
	 * Get value
	 * @param {*} key
	 */
	get(key) {
		this.redisClient.get(key, (err, value) => {
			if (err) {
				throw new Error('Data does not exist');
			}
			return value;
		});
	}

	/**
	 * Set value
	 * @param {*} key
	 */
	set(key) {
		this.redisClient.set(key, (err, reply) => {
			if (err) {
				throw new Error('Could not set the data');
			}
			return reply;
		});
	}

	/**
	 * Store Values as  args in Hash specifed by  HashTable as  Key
	 * @param {*} key HashTable
	 * @param  {...any} args List of Argument to be added
	 */
	hmSet(key, ...args) {
		var argsArray = Array.prototype.slice.call(args);
		this.redisClient.hmset(key, argsArray, (err, reply) => {
			if (err) {
				throw new Error('Could not set data in redis');
			}
			return reply;
		});
	}

	/**
	 * Get Value(s) from Hashtable based on input Ids
	 * @param {*} tableName
	 * @param {*} hashIDs
	 */
	hmGet(tableName, hashIDs) {
		this.redisClient.hmget(tableName, hashIDs, (err, data) => {
			if (err) {
				throw new Error('Data does not exist');
			}
			return data;
		});
	}

	/**
	 * Get total number of values(HashIDs)
	 * @param {*} tableName
	 */
	hlen(tableName) {
		this.redisClient.hlen(tableName, (err, length) => {
			if (err) {
				throw new Error('Unexpected Error');
			}
			return length;
		});
	}

	/**
	 * Remove  value  of given key
	 * @param {*} key
	 */
	remove(key) {
		return this.redisClient.del(key);
	}

	/**
	 * Quit Redis Client
	 */
	quit() {
		return this.redisClient.quit();
	}
}

module.exports = redisFactory;
