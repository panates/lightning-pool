/* eslint-disable */
const assert = require('assert');
const lightningPool = require('../');
const TestFactory = require('./TestFactory');

describe('Start/Close', function() {

  let pool;

  beforeEach(() => {
    pool = lightningPool.createPool(new TestFactory());
  });

  afterEach(function() {
    return pool.close(true);
  });

  it('should start on acquire', function(done) {
    pool.on('start', function() {
      done();
    });
    pool.acquire(() => {});
  });

  it('should not start a closed pool again', function() {
    pool.start();
    return pool.close().then(() => {
      assert.rejects(() => pool.acquire());
    });
  });

  it('should not acquire from a closed pool', function() {
    pool.start();
    return pool.close().then(() => {
      assert.rejects(() => pool.acquire());
    });
  });

});
