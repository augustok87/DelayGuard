// Mock Pool class properly
class MockPool {
  constructor(config) {
    this.config = config;
    this.connected = false;
  }

  async connect() {
    this.connected = true;
    return {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
      end: jest.fn()
    };
  }

  async query(text, params) {
    return { rows: [], rowCount: 0 };
  }

  async end() {
    this.connected = false;
    return Promise.resolve();
  }

  on(event, callback) {
    return this;
  }

  off(event, callback) {
    return this;
  }
}

// Mock Client class
class MockClient {
  constructor(config) {
    this.config = config;
    this.connected = false;
  }

  async connect() {
    this.connected = true;
    return this;
  }

  async query(text, params) {
    return { rows: [], rowCount: 0 };
  }

  async end() {
    this.connected = false;
    return Promise.resolve();
  }

  on(event, callback) {
    return this;
  }

  off(event, callback) {
    return this;
  }
}

module.exports = {
  Pool: MockPool,
  Client: MockClient,
  default: {
    Pool: MockPool,
    Client: MockClient
  }
};
