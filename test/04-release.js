/* eslint-disable */
const assert = require('assert');
const lightningPool = require('../');
const TestFactory = require('./TestFactory');

describe('Releasing', function() {
  var pool;

  afterEach(function() {
    return pool.close(true);
  });

  it('should release with pool.release()', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {
          max: 3
        });
    var o;
    const acquire = function() {
      pool.acquire(function(err, obj) {
        assert(!err, err);
        o = o || obj;
      });
    };
    acquire();
    acquire();
    setTimeout(function() {
      assert.equal(pool.size, 2);
      assert.equal(pool.acquired, 2);
      assert.equal(pool.pending, 0);
      assert.equal(pool.available, 0);
      pool.once('return', function(obj) {
        assert.equal(obj, o);
        assert.equal(pool.size, 2);
        assert.equal(pool.acquired, 1);
        assert.equal(pool.pending, 0);
        assert.equal(pool.available, 1);
        done();
      });
      pool.release(o);
    }, 10);
  });

  it('should destroy with pool.destroy()', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {
          max: 3
        });
    var o;
    const acquire = function() {
      pool.acquire(function(err, obj) {
        assert(!err, err);
        o = o || obj;
      });
    };
    acquire();
    acquire();
    setTimeout(function() {
      assert.equal(pool.size, 2);
      assert.equal(pool.acquired, 2);
      assert.equal(pool.pending, 0);
      assert.equal(pool.available, 0);
      pool.once('destroy', function(obj) {
        assert.equal(obj, o);
        assert.equal(pool.size, 1);
        assert.equal(pool.acquired, 1);
        assert.equal(pool.pending, 0);
        assert.equal(pool.available, 0);
        done();
      });
      pool.destroy(o);
    }, 10);
  });

  it('should not release if resource is not in pool', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    pool.acquire(function(err, obj) {
      assert(!err, err);
      pool.release(1);
    });
    setTimeout(function() {
      assert.equal(pool.size, 1);
      done();
    }, 10);
  });

  it('should not destroy if resource is not in pool', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    pool.acquire(function(err, obj) {
      assert(!err, err);
      pool.destroy(1);
    });
    setTimeout(function() {
      assert.equal(pool.size, 1);
      done();
    }, 10);
  });

  it('should not release if already idle', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    pool.acquire(function(err, obj) {
      assert(!err, err);
      pool.release(obj);
      setTimeout(function() {
        pool.release(obj);
        done();
      }, 10);
    });
  });

  it('should release but keep min', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {
          min: 1,
          idleTimeoutMillis: 1,
          houseKeepInterval: 5
        });
    const acquire = function() {
      pool.acquire(function(err, obj) {
        assert(!err, err);
        setTimeout(function() {
          pool.release(obj);
        }, 5);
      });
    };
    acquire();
    acquire();
    acquire();
    setTimeout(function() {
      assert.equal(pool.size, 1);
      assert.equal(pool.acquired, 0);
      assert.equal(pool.pending, 0);
      assert.equal(pool.available, 1);
      done();
    }, 20);
  });

  it('should release but keep minIdle', function(done) {
    this.slow(150);
    pool = lightningPool.createPool(new TestFactory(),
        {
          minIdle: 1,
          idleTimeoutMillis: 1,
          houseKeepInterval: 5
        });
    const acquire = function() {
      pool.acquire(function(err, obj) {
        assert(!err, err);
        setTimeout(function() {
          pool.release(obj);
        }, 5);
      });
    };
    acquire();
    acquire();
    acquire();
    setTimeout(function() {
      assert.equal(pool.size, 1);
      assert.equal(pool.acquired, 0);
      assert.equal(pool.pending, 0);
      assert.equal(pool.available, 1);
      done();
    }, 40);
  });

  it('should destroy on reset error', function() {
    pool = lightningPool.createPool(new TestFactory({
      reset: function(obj) {
        throw new Error('Any reset error');
      }
    }));
    return pool.acquire().then(obj => {
      return pool.release(obj).then(() => {
        assert.equal(pool.size, 0);
        assert.equal(pool.acquired, 0);
        assert.equal(pool.pending, 0);
        assert.equal(pool.available, 0);
      });
    });
  });

  it('should emit destroy-error', function(done) {
    pool = lightningPool.createPool(new TestFactory({
      destroy: function(obj, callback) {
        throw new Error('Any error');
      }
    }), {
      idleTimeoutMillis: 1,
      houseKeepInterval: 5
    });
    pool.on('destroy-error', function() {
      assert.equal(pool.size, 0);
      done();
    });

    pool.acquire(function(err, obj) {
      assert(!err, err);
      pool.release(obj);
    });
  });

});
