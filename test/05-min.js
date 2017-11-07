/* eslint-disable */
const assert = require('assert');
const lightningPool = require('../');
const TestFactory = require('./TestFactory');

describe('Ensuring min resources', function() {
  var pool;

  afterEach(function() {
    pool.stop(true);
  });

  it('should pool have at least `min` resource', function(done) {
    pool = lightningPool.createPool(new TestFactory(), {
      min: 2
    });
    pool.start();
    setTimeout(function() {
      pool.acquire();
    }, 10);

    setTimeout(function() {
      assert.equal(pool.size, 2);
      assert.equal(pool.available, 1);
      assert.equal(pool.acquired, 1);
      done();
    }, 20);
  });

  it('should pool have at least `minIdle` resource', function(done) {
    pool = lightningPool.createPool(new TestFactory(), {
      minIdle: 2
    });
    pool.start();
    setTimeout(function() {
      pool.acquire();
    }, 10);

    setTimeout(function() {
      assert.equal(pool.size, 3);
      assert.equal(pool.available, 2);
      assert.equal(pool.acquired, 1);
      done();
    }, 20);
  });

  it('should pool have at least `minIdle` available resource', function(done) {
    pool = lightningPool.createPool(new TestFactory(), {
      min: 2,
      minIdle: 3
    });
    pool.start();
    setTimeout(function() {
      pool.acquire();
    }, 10);

    setTimeout(function() {
      assert.equal(pool.size, 4);
      assert.equal(pool.available, 3);
      assert.equal(pool.acquired, 1);
      done();
    }, 20);
  });

});
