/* eslint-disable */
const assert = require('assert');
const lightningPool = require('../');
const TestFactory = require('./TestFactory');

describe('Acquiring', function() {
  var pool;

  afterEach(function() {
    pool.stop(true);
  });

  it('should acquire', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    pool.acquire(function(err, obj) {
      assert(!err, err);
      assert.equal(obj.id, 1);
      assert.equal(pool.acquired, 1);
      assert.equal(pool.state, 1);
      done();
    });
  });

  it('should acquire with promise', function(done) {
    pool = lightningPool.createPool(new TestFactory(
        {usePromie: true}
    ));
    pool.acquire(function(err, obj) {
      assert(!err, err);
      assert.equal(obj.id, 1);
      assert.equal(pool.acquired, 1);
      assert.equal(pool.size, 1);
      done();
    });
  });

  it('should retry when pass error in callback', function(done) {
    pool = lightningPool.createPool(new TestFactory(
        {retryTest: 1}
    ), {
      acquireMaxRetries: 5,
      acquireRetryWait: 10
    });
    pool.acquire(function(err, obj) {
      assert(!err, err);
      assert.equal(obj.id, 2);
      done();
    });
  });

  it('should fail when pass error in callback and max-retry reached', function(done) {
    pool = lightningPool.createPool(new TestFactory(
        {retryTest: 2}
    ), {
      acquireMaxRetries: 1,
      acquireRetryWait: 10
    });
    pool.acquire(function(err, obj) {
      assert(err);
      done();
    });
  });

  it('should fail when factory returns existing object', function(done) {
    var obj = {};
    pool = lightningPool.createPool(new TestFactory(
        {
          create: function(callback) {
            callback(undefined, obj);
          }
        }
    ));
    pool.acquire(function(err, obj) {
      assert(!err, err);
      pool.acquire(function(err, obj) {
        assert(err);
        done();
      });
    });

  });

  it('should retry when pass error with promise reject', function(done) {
    pool = lightningPool.createPool(new TestFactory(
        {retryTest: 1, usePromise: true}
    ), {
      acquireMaxRetries: 5,
      acquireRetryWait: 10
    });
    pool.acquire(function(err, obj) {
      assert(!err, err);
      assert.equal(obj.id, 2);
      done();
    });
  });

  it('should fail immediately when pass error in callback', function(done) {
    pool = lightningPool.createPool(new TestFactory({retryTest: 1}, {
      acquireMaxRetries: 5
    }));
    pool.acquire(function(err, obj) {
      assert(err);
      done();
    });
  });

  it('should not exceed resource limit', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {max: 3});
    const acquire = function() {
      pool.acquire(function(err, obj) {
        assert(!err, err);
      });
    };
    acquire();
    acquire();
    acquire();
    acquire();
    setTimeout(function() {
      assert.equal(pool.size, 3);
      assert.equal(pool.acquired, 3);
      assert.equal(pool.pending, 1);
      assert.equal(pool.available, 0);
      done();
    }, 10);
  });

  it('should not exceed queue limit', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {
          max: 1,
          maxQueue: 1
        });
    var i = 0;
    const acquire = function() {
      pool.acquire(function(err, obj) {
        if (++i === 1) {
          assert(err);
          done();
        }
      });
    };
    acquire();
    acquire();
  });

  it('should cancel queued request if acquire timed out', function(done) {
    pool = lightningPool.createPool(new TestFactory({
      acquireWait: 10
    }), {
      acquireTimeoutMillis: 15,
      max: 1
    });
    pool.acquire(function(err, obj) {
      assert(!err, err);
    });
    pool.acquire(function(err, obj) {
      assert(err);
      done();
    });
  });

  it('should cancel retry if acquire timed out', function(done) {
    pool = lightningPool.createPool(new TestFactory({
      acquireWait: 20,
      retryTest: 5
    }), {
      acquireTimeoutMillis: 10
    });
    pool.acquire(function(err, obj) {
      assert(err);
    });
    pool.acquire(function(err, obj) {
      assert(err);
      done();
    });
  });

  it('should cancel retry if create aborted', function(done) {
    var i = 0;
    pool = lightningPool.createPool(new TestFactory({
      acquireWait: 20,
      retryTest: 5,
      create: function(callback) {
        if (!i++)
          return callback.abort();
        callback.abort(new Error('Custom reason'));
      }
    }), {
      acquireTimeoutMillis: 10
    });
    pool.acquire(function(err, obj) {
      assert(err);
    });
    pool.acquire(function(err, obj) {
      assert(err);
      assert.equal(i, 2);
      done();
    });
  });

  it('should fail when retry limit exceeds', function(done) {
    pool = lightningPool.createPool(new TestFactory(
        {
          retryTest: 5,
          create: function() {
            throw new Error('test');
          }
        }
    ), {
      acquireMaxRetries: 2,
      acquireRetryWait: 5
    });
    pool.acquire(function(err, obj) {
      assert(err);
      done();
    });
  });

  it('should destroy idle resource after timeout', function(done) {
    var t;
    pool = lightningPool.createPool(new TestFactory(), {
      idleTimeoutMillis: 20,
      houseKeepInterval: 1
    });
    var o;
    pool.on('destroy', function(obj) {
      assert.equal(o, obj);
      const i = Date.now() - t;
      assert(i >= 20 && i < 40);
      done();
    });

    pool.acquire(function(err, obj) {
      assert(!err);
      o = obj;
      pool.release(obj);
      t = Date.now();
    });
  });

  it('should add delayed created resource as idle if pool has space', function(done) {
    this.slow(100);
    var i = 0;
    const factory = new TestFactory();
    factory.create = function() {
      const args = arguments;
      if (!i++) {
        setTimeout(function() {
          TestFactory.prototype.create.apply(factory, args);
        }, 20);
      } else
        TestFactory.prototype.create.apply(factory, args);
    };

    pool = lightningPool.createPool(factory, {
      acquireTimeoutMillis: 15,
      max: 2
    });
    pool.acquire(function(err) {
      assert(err);
    });
    pool.acquire(function(err, obj) {
      assert(!err, err);
      assert.equal(obj.id, 1);
      pool.release(obj);
    });
    pool.acquire(function(err, obj) {
      assert(!err, err);
      assert.equal(obj.id, 1);
      assert.equal(pool.size, 1);
      assert.equal(pool.acquired, 1);
      assert.equal(pool.available, 0);
      assert.equal(pool.creating, 1);
    });

    setTimeout(function() {
      assert.equal(pool.size, 2);
      assert.equal(pool.acquired, 1);
      assert.equal(pool.available, 1);
      assert.equal(pool.creating, 0);
      done();
    }, 30);
  });

  it('should acquire in fifo order default', function(done) {
    var k = 0;
    pool = lightningPool.createPool(new TestFactory(
        {resetWait: 1}
    ));
    const acquire = function() {
      pool.acquire(function(err, obj) {
        assert(!err, err);
        pool.release(obj);
      });
    };
    pool.on('return', function() {
      if (++k === 2) {
        pool.acquire(function(err, obj) {
          assert(!err, err);
          assert.equal(obj.id, 1);
          done();
        });
      }
    });

    acquire();
    acquire();
  });

  it('should acquire in lifo order', function(done) {
    var k = 0;
    pool = lightningPool.createPool(new TestFactory(
        {resetWait: 1}
    ), {
      fifo: false
    });
    const acquire = function() {
      pool.acquire(function(err, obj) {
        assert(!err, err);
        pool.release(obj);
      });
    };
    pool.on('return', function() {
      if (++k === 2) {
        pool.acquire(function(err, obj) {
          assert(!err, err);
          assert.equal(obj.id, 2);
          done();
        });
      }
    });

    acquire();
    acquire();
  });

  it('should pool.isAcquired() check any resource is currently acquired', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    pool.acquire(function(err, obj) {
      assert(!err, err);
      assert.equal(true, pool.isAcquired(obj));
      assert.equal(false, pool.isAcquired({}));
      done();
    });
  });

  it('should pool.includes() check any resource is in pool', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    pool.acquire(function(err, obj) {
      assert(!err, err);
      assert.equal(true, pool.includes(obj));
      assert.equal(false, pool.includes({}));
      done();
    });
  });

});
