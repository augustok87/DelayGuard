// Mock Pool class with proper Jest mock implementation
class MockPool {
  constructor(config) {
    this.config = config;
    this.connected = false;
    this.clients = [];
  }

  async connect() {
    this.connected = true;
    const client = new MockClient(this.config);
    this.clients.push(client);
    return client;
  }

  async query(_text, _params) {
    // Mock query execution
    return { 
      rows: [], 
      rowCount: 0,
      command: 'SELECT',
      oid: null,
      fields: [],
    };
  }

  async end() {
    this.connected = false;
    this.clients.forEach(client => client.end());
    this.clients = [];
    return Promise.resolve();
  }

  on(_event, _callback) {
    return this;
  }

  off(_event, _callback) {
    return this;
  }
}

// Mock Client class
class MockClient {
  constructor(config) {
    this.config = config;
    this.connected = false;
    this.queries = [];
  }

  async connect() {
    this.connected = true;
    return this;
  }

  async query(text, params) {
    this.queries.push({ text, params });
    
    // Mock different query responses based on text
    if (text.includes('SELECT COUNT(*)')) {
      return { 
        rows: [{ count: '0' }], 
        rowCount: 1,
        command: 'SELECT',
        oid: null,
        fields: [],
      };
    }
    
    if (text.includes('INSERT')) {
      return { 
        rows: [], 
        rowCount: 1,
        command: 'INSERT',
        oid: null,
        fields: [],
      };
    }
    
    if (text.includes('UPDATE')) {
      return { 
        rows: [], 
        rowCount: 1,
        command: 'UPDATE',
        oid: null,
        fields: [],
      };
    }
    
    if (text.includes('DELETE')) {
      return { 
        rows: [], 
        rowCount: 1,
        command: 'DELETE',
        oid: null,
        fields: [],
      };
    }
    
    return { 
      rows: [], 
      rowCount: 0,
      command: 'SELECT',
      oid: null,
      fields: [],
    };
  }

  async release() {
    this.connected = false;
    return Promise.resolve();
  }

  async end() {
    this.connected = false;
    return Promise.resolve();
  }

  on(_event, _callback) {
    return this;
  }

  off(_event, _callback) {
    return this;
  }
}

// Create Jest mock constructors
const MockPoolConstructor = jest.fn().mockImplementation((config) => {
  return new MockPool(config);
});

const MockClientConstructor = jest.fn().mockImplementation((config) => {
  return new MockClient(config);
});

module.exports = MockPoolConstructor;
module.exports.Pool = MockPoolConstructor;
module.exports.Client = MockClientConstructor;
module.exports.default = {
  Pool: MockPoolConstructor,
  Client: MockClientConstructor,
};
