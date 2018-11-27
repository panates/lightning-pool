/* eslint-disable */
const assert = require('assert');
const {createPool, AbortError} = require('../');
const TestFactory = require('./TestFactory');
const {rejects, doesNotReject} = require('rejected-or-not');

assert.rejects = assert.rejects || rejects;
assert.doesNotReject = assert.doesNotReject || doesNotReject;

describe('Acquiring', function() {
  let pool;

  afterEach(function() {
    return pool.close(true);
  });

  it('should acquire', function(done) {
    pool = createPool(new TestFactory());
    pool.acquire((err, obj) => {
      try {
        assert(!err, err);
        assert.strictEqual(obj.id, 1);
        assert.strictEqual(pool.acquired, 1);
        assert.strictEqual(pool.state, 1);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('should acquire (promise)', function() {
    pool = createPool(new TestFactory());
    return pool.acquire().then(obj => {
      assert.strictEqual(obj.id, 1);
      assert.strictEqual(pool.acquired, 1);
      assert.strictEqual(pool.size, 1);
    });
  });

  it('should retry on error', function() {
    pool = createPool(new TestFactory({retryTest: 1}), {
      acquireMaxRetries: 5,
      acquireRetryWait: 10
    });
    return pool.acquire().then(obj => {
      assert.strictEqual(obj.id, 2);
    });
  });

  it('should fail when max-retry exceed', function(done) {
    pool = createPool(new TestFactory({retryTest: 2}), {
      acquireMaxRetries: 1,
      acquireRetryWait: 10
    });
    pool.acquire(function(err, obj) {
      assert(err);
      assert(!obj);
      done();
    });
  });

  it('should fail when factory returns existing object', function() {
    let obj = {};
    pool = createPool(new TestFactory({
          create: () => obj
        }
    ));
    return pool.acquire().then(() => {
      assert.rejects(() => pool.acquire());
    });

  });

  it('should fail immediately if throws AbortError', function() {
    pool = createPool(new TestFactory({
          create: function() {
            throw new AbortError('Aborted');
          }
        }
    ));
    return assert.rejects(() => pool.acquire());
  });

  it('should not exceed resource limit', function(done) {
    pool = createPool(new TestFactory(),
        {max: 3});
    const acquire = function() {
      pool.acquire();
    };
    acquire();
    acquire();
    acquire();
    acquire();
    setTimeout(function() {
      try {
        assert.strictEqual(pool.size, 3);
        assert.strictEqual(pool.acquired, 3);
        assert.strictEqual(pool.pending, 1);
        assert.strictEqual(pool.available, 0);
        done();
      } catch (e) {
        done(e);
      }
    }, 10);
  });

  it('should not exceed queue limit', function(done) {
    pool = createPool(new TestFactory(),
        {
          max: 1,
          maxQueue: 1
        });
    let i = 0;
    const acquire = function() {
      pool.acquire(function(err, obj) {
        if (++i === 1) {
          assert(err);
          assert(!obj);
          done();
        }
      });
    };
    acquire();
    acquire();
  });

  it('should cancel queued request if acquire timed out', function(done) {
    pool = createPool(new TestFactory({
      acquireWait: 10
    }), {
      acquireTimeoutMillis: 15,
      max: 1
    });
    pool.acquire((err, obj) => {
      assert(!err, err);
      assert(obj);
    });
    pool.acquire((err, obj) => {
      assert(err);
      assert(!obj);
      done();
    });
  });

  it('should cancel retry if acquire timed out', function(done) {
    pool = createPool(new TestFactory({
      acquireWait: 20,
      retryTest: 5
    }), {
      acquireTimeoutMillis: 10
    });
    pool.acquire((err, obj) => {
      assert(err);
      assert(!obj);
    });
    pool.acquire((err, obj) => {
      assert(err);
      assert(!obj);
      done();
    });
  });

  it('should cancel retry if create aborted', function(done) {
    let i = 0;
    pool = createPool(new TestFactory({
      acquireWait: 20,
      retryTest: 5,
      create: (callback) => {
        if (!i++)
          return callback.abort();
        callback.abort(new Error('Custom reason'));
      }
    }), {
      acquireTimeoutMillis: 10
    });
    pool.acquire((err, obj) => {
      assert(err);
      assert(!obj);
    });
    pool.acquire((err, obj) => {
      assert(err);
      assert(!obj);
      assert.strictEqual(i, 2);
      done();
    });
  });

  it('should fail when retry limit exceeds', function(done) {
    pool = createPool(new TestFactory({
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
      assert(!obj);
      done();
    });
  });

  it('should destroy idle resource after timeout', function(done) {
    let t;
    let o;
    pool = createPool(new TestFactory(), {
      idleTimeoutMillis: 20,
      houseKeepInterval: 1
    });
    pool.on('destroy', (obj) => {
      try {
        assert.strictEqual(o, obj);
        const i = Date.now() - t;
        assert(i >= 20 && i < 40);
        done();
      } catch (e) {
        return done(e);
      }
    });

    pool.acquire((err, obj) => {
      try {
        assert(!err);
        o = obj;
        pool.release(obj);
        t = Date.now();
      } catch (e) {
        done(e);
      }
    });
  });

  it('should keep max while resource creating', function(done) {
    this.slow(100);
    let i = 0;
    const factory = new TestFactory();
    factory.create = function() {
      const args = arguments;
      return new Promise((resolve) => {
        if (!i++) {
          setTimeout(() => {
            resolve(TestFactory.prototype.create.apply(factory, args));
          }, 5);
        } else
          resolve(TestFactory.prototype.create.apply(factory, args));
      });

    };

    pool = createPool(factory, {
      acquireTimeoutMillis: 15,
      max: 2
    });
    pool.acquire((err, obj) => {
      try {
        assert(!err, err);
        assert.strictEqual(obj.id, 2);
      } catch (e) {
        done(e);
      }
    });
    pool.acquire((err, obj) => {
      try {
        assert(!err, err);
        assert.strictEqual(obj.id, 1);
        pool.release(obj);
      } catch (e) {
        done(e);
      }
    });
    pool.acquire((err, obj) => {
      try {
        assert(!err, err);
        pool.release(obj);
      } catch (e) {
        done(e);
      }
    });

    setTimeout(() => {
      try {
        assert.strictEqual(pool.size, 2);
        assert.strictEqual(pool.acquired, 1);
        assert.strictEqual(pool.available, 1);
        assert.strictEqual(pool.creating, 0);
        done();
      } catch (e) {
        done(e);
      }
    }, 30);
  });

  it('should acquire in fifo order default', function(done) {
    let k = 0;
    pool = createPool(new TestFactory(
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
          assert.strictEqual(obj.id, 1);
          done();
        });
      }
    });

    acquire();
    acquire();
  });

  it('should acquire in lifo order', function(done) {
    let k = 0;
    pool = createPool(new TestFactory(
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
          assert.strictEqual(obj.id, 2);
          done();
        });
      }
    });

    acquire();
    acquire();
  });

  it('should pool.isAcquired() check any resource is currently acquired', function(done) {
    pool = createPool(new TestFactory());
    pool.acquire(function(err, obj) {
      assert(!err, err);
      assert.strictEqual(true, pool.isAcquired(obj));
      assert.strictEqual(false, pool.isAcquired({}));
      done();
    });
  });

  it('should pool.includes() check any resource is in pool', function(done) {
    pool = createPool(new TestFactory());
    pool.acquire(function(err, obj) {
      assert(!err, err);
      assert.strictEqual(true, pool.includes(obj));
      assert.strictEqual(false, pool.includes({}));
      done();
    });
  });

});
