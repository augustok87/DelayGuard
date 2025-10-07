// Mock Redis class with proper Jest mock implementation
class MockRedis {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.connected = false;
    this.data = new Map();
  }

  async connect() {
    this.connected = true;
    return this;
  }

  async disconnect() {
    this.connected = false;
    return 'OK';
  }

  async ping() {
    return 'PONG';
  }

  async info() {
    return 'redis_version:6.0.0';
  }

  async dbsize() {
    return this.data.size;
  }

  async get(key) {
    return this.data.get(key) || null;
  }

  async set(key, value, ...args) {
    this.data.set(key, value);
    return 'OK';
  }

  async setex(key, seconds, value) {
    this.data.set(key, value);
    return 'OK';
  }

  async del(key) {
    return this.data.delete(key) ? 1 : 0;
  }

  async mget(keys) {
    return keys.map(key => this.data.get(key) || null);
  }

  async mset(keyValuePairs) {
    for (let i = 0; i < keyValuePairs.length; i += 2) {
      this.data.set(keyValuePairs[i], keyValuePairs[i + 1]);
    }
    return 'OK';
  }

  async keys(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.data.keys()).filter(key => regex.test(key));
  }

  async scan(cursor, options = {}) {
    return ['0', Array.from(this.data.keys())];
  }

  async llen(key) {
    const value = this.data.get(key);
    return Array.isArray(value) ? value.length : 0;
  }

  async zadd(key, score, member) {
    if (!this.data.has(key)) {
      this.data.set(key, new Map());
    }
    const sortedSet = this.data.get(key);
    sortedSet.set(member, score);
    return 1;
  }

  async zrem(key, member) {
    const sortedSet = this.data.get(key);
    if (sortedSet && sortedSet.has(member)) {
      sortedSet.delete(member);
      return 1;
    }
    return 0;
  }

  async zrange(key, start, stop) {
    const sortedSet = this.data.get(key);
    if (!sortedSet) return [];
    
    const entries = Array.from(sortedSet.entries())
      .sort((a, b) => a[1] - b[1])
      .map(entry => entry[0]);
    
    return entries.slice(start, stop + 1);
  }

  async zcard(key) {
    const sortedSet = this.data.get(key);
    return sortedSet ? sortedSet.size : 0;
  }

  async expire(key, seconds) {
    return this.data.has(key) ? 1 : 0;
  }

  async ttl(key) {
    return this.data.has(key) ? -1 : -2;
  }

  pipeline() {
    const commands = [];
    const pipeline = {
      get: jest.fn().mockImplementation((key) => {
        commands.push(['get', key]);
        return pipeline;
      }),
      set: jest.fn().mockImplementation((key, value) => {
        commands.push(['set', key, value]);
        return pipeline;
      }),
      del: jest.fn().mockImplementation((key) => {
        commands.push(['del', key]);
        return pipeline;
      }),
      zadd: jest.fn().mockImplementation((key, score, member) => {
        commands.push(['zadd', key, score, member]);
        return pipeline;
      }),
      zrem: jest.fn().mockImplementation((key, member) => {
        commands.push(['zrem', key, member]);
        return pipeline;
      }),
      zrange: jest.fn().mockImplementation((key, start, stop) => {
        commands.push(['zrange', key, start, stop]);
        return pipeline;
      }),
      zcard: jest.fn().mockImplementation((key) => {
        commands.push(['zcard', key]);
        return pipeline;
      }),
      expire: jest.fn().mockImplementation((key, seconds) => {
        commands.push(['expire', key, seconds]);
        return pipeline;
      }),
      exec: jest.fn().mockImplementation(async () => {
        const results = [];
        for (const [command, ...args] of commands) {
          try {
            const result = await this[command](...args);
            results.push([null, result]);
          } catch (error) {
            results.push([error, null]);
          }
        }
        commands.length = 0;
        return results;
      })
    };
    return pipeline;
  }

  on(event, callback) {
    return this;
  }

  off(event, callback) {
    return this;
  }
}

// Create a Jest mock function
const MockRedisConstructor = jest.fn().mockImplementation((url, options) => {
  return new MockRedis(url, options);
});

// Add static methods if needed
MockRedisConstructor.createClient = jest.fn().mockImplementation((url, options) => {
  return new MockRedis(url, options);
});

module.exports = MockRedisConstructor;
module.exports.default = MockRedisConstructor;
module.exports.Redis = MockRedisConstructor;
