import { AbortError, createPool, Pool } from '../src/index.js';
import { TestFactory } from './support/TestFactory.js';

describe('Acquiring', function () {
  let pool: Pool;

  afterEach(function () {
    return pool.closeAsync(true);
  });

  it('should acquire ( allback)', function (done) {
    pool = createPool(new TestFactory());
    pool.acquire((err, obj) => {
      try {
        expect(err).not.toBeDefined();
        expect(obj.id).toStrictEqual(1);
        expect(pool.acquired).toStrictEqual(1);
        expect(pool.state).toStrictEqual(1);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('should acquire (promise)', async function () {
    pool = createPool(new TestFactory());
    const obj = await pool.acquire();
    expect(obj.id).toStrictEqual(1);
    expect(pool.acquired).toStrictEqual(1);
    expect(pool.size).toStrictEqual(1);
  });

  it('should retry on error', async function () {
    pool = createPool(new TestFactory({retryTest: 1}), {
      acquireMaxRetries: 5,
      acquireRetryWait: 10
    });
    const obj = await pool.acquire();
    expect(obj.id).toStrictEqual(2);
  });

  it('should fail when max-retry exceed', function () {
    pool = createPool(new TestFactory({retryTest: 2}), {
      acquireMaxRetries: 1,
      acquireRetryWait: 10
    });
    return expect(() => pool.acquire()).rejects.toThrow('Retry test error');
  });

  it('should fail when factory returns existing object', async function () {
    const obj = {};
    pool = createPool(new TestFactory({
          create: () => obj
        }
    ));
    await pool.acquire();
    await expect(() => pool.acquire()).rejects.toThrow('Factory error');
  });

  it('should fail immediately if throws AbortError', function () {
    pool = createPool(new TestFactory({
          create() {
            throw new AbortError('Aborted');
          }
        }
    ));
    return expect(() => pool.acquire()).rejects.toThrow('Aborted');
  });

  it('should not exceed resource limit', function (done) {
    pool = createPool(new TestFactory(),
        {max: 3});
    for (let i = 0; i < 4; i++) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      pool.acquire();
    }
    setTimeout(function () {
      try {
        expect(pool.size).toStrictEqual(3);
        expect(pool.acquired).toStrictEqual(3);
        expect(pool.pending).toStrictEqual(1);
        expect(pool.available).toStrictEqual(0);
        done();
      } catch (e) {
        done(e);
      }
    }, 10);
  });

  it('should not exceed queue limit', function (done) {
    pool = createPool(new TestFactory(),
        {
          max: 1,
          maxQueue: 1
        });
    let i = 0;
    const acquire = function () {
      pool.acquire(function (err, obj) {
        if (++i === 1) {
          expect(err).toBeDefined();
          expect(obj).not.toBeDefined();
          done();
        }
      });
    };
    acquire();
    acquire();
  });

  it('should cancel queued request if acquire timed out', function (done) {
    pool = createPool(new TestFactory({
      acquireWait: 10
    }), {
      acquireTimeoutMillis: 15,
      max: 1
    });
    pool.acquire((err, obj) => {
      expect(err).not.toBeDefined();
      expect(obj).toBeDefined();
    });
    pool.acquire((err, obj) => {
      expect(err).toBeDefined();
      expect(obj).not.toBeDefined();
      done();
    });
  });

  it('should cancel retry if acquire timed out', function (done) {
    pool = createPool(new TestFactory({
      acquireWait: 20,
      retryTest: 5
    }), {
      acquireTimeoutMillis: 10
    });
    pool.acquire((err, obj) => {
      expect(err).toBeDefined();
      expect(obj).not.toBeDefined();
    });
    pool.acquire((err, obj) => {
      expect(err).toBeDefined();
      expect(obj).not.toBeDefined();
      done();
    });
  });

  it('should cancel retry if create aborted', function (done) {
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
      expect(err).toBeDefined();
      expect(obj).not.toBeDefined();
    });
    pool.acquire((err, obj) => {
      expect(err).toBeDefined();
      expect(obj).not.toBeDefined();
      expect(i).toStrictEqual(2);
      done();
    });
  });

  it('should fail when retry limit exceeds', function (done) {
    pool = createPool(new TestFactory({
          retryTest: 5,
          create() {
            throw new Error('test');
          }
        }
    ), {
      acquireMaxRetries: 2,
      acquireRetryWait: 5
    });
    pool.acquire(function (err, obj) {
      expect(err).toBeDefined();
      expect(obj).not.toBeDefined();
      done();
    });
  });

  it('should destroy idle resource after timeout', function (done) {
    let t;
    let o;
    pool = createPool(new TestFactory(), {
      idleTimeoutMillis: 20,
      houseKeepInterval: 1
    });
    pool.on('destroy', (obj) => {
      try {
        expect(o).toStrictEqual(obj);
        const i = Date.now() - t;
        expect(i).toBeGreaterThanOrEqual(20);
        expect(i).toBeLessThan(40);
        done();
      } catch (e) {
        return done(e);
      }
    });

    pool.acquire((err, obj) => {
      try {
        expect(err).not.toBeDefined();
        o = obj;
        pool.release(obj);
        t = Date.now();
      } catch (e) {
        done(e);
      }
    });
  });

  it('should keep max while resource creating', function (done) {
    let i = 0;
    const factory = new TestFactory();
    factory.create = function () {
      const args = arguments;
      return new Promise((resolve) => {
        if (!i++) {
          setTimeout(() => {
            resolve(TestFactory.prototype.create.apply(factory, args as any));
          }, 5);
        } else
          resolve(TestFactory.prototype.create.apply(factory, args as any));
      });

    };

    pool = createPool(factory, {
      acquireTimeoutMillis: 15,
      max: 2
    });
    pool.acquire((err, obj) => {
      try {
        expect(err).not.toBeDefined();
        expect(obj.id).toStrictEqual(2);
      } catch (e) {
        done(e);
      }
    });
    pool.acquire((err, obj) => {
      try {
        expect(err).not.toBeDefined();
        expect(obj.id).toStrictEqual(1);
        pool.release(obj);
      } catch (e) {
        done(e);
      }
    });
    pool.acquire((err, obj) => {
      try {
        expect(err).not.toBeDefined();
        pool.release(obj);
      } catch (e) {
        done(e);
      }
    });

    setTimeout(() => {
      try {
        expect(pool.size).toStrictEqual(2);
        expect(pool.acquired).toStrictEqual(1);
        expect(pool.available).toStrictEqual(1);
        expect(pool.creating).toStrictEqual(0);
        done();
      } catch (e) {
        done(e);
      }
    }, 30);
  });

  it('should acquire in fifo order default', function (done) {
    let k = 0;
    pool = createPool(new TestFactory(
        {resetWait: 1}
    ));
    const acquire = function () {
      pool.acquire(function (err, obj) {
        expect(err).not.toBeDefined();
        pool.release(obj);
      });
    };
    pool.on('return', function () {
      if (++k === 2) {
        pool.acquire(function (err, obj) {
          expect(err).not.toBeDefined();
          expect(obj.id).toStrictEqual(1);
          done();
        });
      }
    });

    acquire();
    acquire();
  });

  it('should acquire in lifo order', function (done) {
    let k = 0;
    pool = createPool(new TestFactory(
        {resetWait: 1}
    ), {
      fifo: false
    });
    const acquire = function () {
      pool.acquire(function (err, obj) {
        expect(err).not.toBeDefined();
        pool.release(obj);
      });
    };
    pool.on('return', function () {
      if (++k === 2) {
        pool.acquire(function (err, obj) {
          expect(err).not.toBeDefined();
          expect(obj.id).toStrictEqual(2);
          done();
        });
      }
    });

    acquire();
    acquire();
  });

  it('should pool.isAcquired() check any resource is currently acquired', function (done) {
    pool = createPool(new TestFactory());
    pool.acquire(function (err, obj) {
      expect(err).not.toBeDefined();
      expect(pool.isAcquired(obj)).toStrictEqual(true);
      expect(pool.isAcquired({})).toStrictEqual(false);
      done();
    });
  });

  it('should pool.includes() check any resource is in pool', function (done) {
    pool = createPool(new TestFactory());
    pool.acquire(function (err, obj) {
      expect(err).not.toBeDefined();
      expect(pool.includes(obj)).toStrictEqual(true);
      expect(pool.includes({})).toStrictEqual(false);
      done();
    });
  });

});
