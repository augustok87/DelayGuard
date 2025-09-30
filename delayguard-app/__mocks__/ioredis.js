module.exports = jest.fn().mockImplementation(() => ({
  ping: jest.fn(),
  info: jest.fn(),
  dbsize: jest.fn(),
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  mget: jest.fn(),
  pipeline: jest.fn(),
  keys: jest.fn(),
  llen: jest.fn()
}));
