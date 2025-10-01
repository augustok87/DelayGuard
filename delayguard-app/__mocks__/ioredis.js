// Mock Redis class properly
class MockRedis {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.connected = false;
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
    return 0;
  }

  async get(key) {
    return null;
  }

  async set(key, value, ...args) {
    return 'OK';
  }

  async setex(key, seconds, value) {
    return 'OK';
  }

  async del(key) {
    return 1;
  }

  async mget(keys) {
    return keys.map(() => null);
  }

  async mset(keyValuePairs) {
    return 'OK';
  }

  async keys(pattern) {
    return [];
  }

  async scan(cursor, options = {}) {
    return ['0', []];
  }

  async llen(key) {
    return 0;
  }

  pipeline() {
    return {
      get: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([])
    };
  }

  on(event, callback) {
    return this;
  }

  off(event, callback) {
    return this;
  }
}

module.exports = {
  default: MockRedis,
  Redis: MockRedis
};
