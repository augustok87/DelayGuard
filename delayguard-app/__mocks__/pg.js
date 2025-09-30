module.exports = {
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    totalCount: 0,
    idleCount: 0
  }))
};
