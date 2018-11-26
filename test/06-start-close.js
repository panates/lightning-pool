/* eslint-disable */
const assert = require('assert');
const lightningPool = require('../');
const TestFactory = require('./TestFactory');

describe('Start/Close', function() {

  let pool;

  afterEach(function() {
    pool.close(true);
  });

  it('should start on acquire', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    pool.on('start', function() {
      done();
    });
    pool.acquire(function(err, obj) {
      assert(!err, err);
      assert(obj);
    });
  });

  it('should not start a closed pool again', function() {
    pool = lightningPool.createPool(new TestFactory());
    pool.start();
    return pool.close().then(() => {
      assert.rejects(() => pool.acquire());
    });
  });

  it('should not acquire from a closed pool', function() {
    pool = lightningPool.createPool(new TestFactory());
    pool.start();
    return pool.close().then(() => {
      assert.doesNotReject(() => pool.acquire());
    });
  });

});
