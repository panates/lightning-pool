import { createPool } from '../src/index.js';
import { TestFactory } from './support/TestFactory.js';

describe('Releasing', () => {
  let pool;

  afterEach(() => pool.closeAsync(true));

  it('should release with pool.release()', done => {
    pool = createPool(new TestFactory(), {
      max: 3,
    });
    let o;
    const acquire = () => {
      pool.acquire((err, obj) => {
        expect(err).not.toBeDefined();
        o = o || obj;
      });
    };
    acquire();
    acquire();
    setTimeout(() => {
      expect(pool.size).toStrictEqual(2);
      expect(pool.acquired).toStrictEqual(2);
      expect(pool.pending).toStrictEqual(0);
      expect(pool.available).toStrictEqual(0);
      pool.once('return', obj => {
        expect(obj).toEqual(o);
        expect(pool.size).toStrictEqual(2);
        expect(pool.acquired).toStrictEqual(1);
        expect(pool.pending).toStrictEqual(0);
        expect(pool.available).toStrictEqual(1);
        done();
      });
      pool.release(o);
    }, 10);
  });

  it('should destroy with pool.destroy()', done => {
    pool = createPool(new TestFactory(), {
      max: 3,
    });
    let o;
    const acquire = function () {
      pool.acquire((err, obj) => {
        expect(err).not.toBeDefined();
        o = o || obj;
      });
    };
    acquire();
    acquire();
    setTimeout(() => {
      expect(pool.size).toStrictEqual(2);
      expect(pool.acquired).toStrictEqual(2);
      expect(pool.pending).toStrictEqual(0);
      expect(pool.available).toStrictEqual(0);
      pool.once('destroy', obj => {
        expect(obj).toEqual(o);
        expect(pool.size).toStrictEqual(1);
        expect(pool.acquired).toStrictEqual(1);
        expect(pool.pending).toStrictEqual(0);
        expect(pool.available).toStrictEqual(0);
        done();
      });
      pool.destroy(o);
    }, 10);
  });

  it('should not release if resource is not in pool', done => {
    pool = createPool(new TestFactory());
    pool.acquire((err, obj) => {
      expect(err).not.toBeDefined();
      expect(obj).toBeDefined();
      pool.release(1);
    });
    setTimeout(() => {
      expect(pool.size).toStrictEqual(1);
      done();
    }, 10);
  });

  it('should not destroy if resource is not in pool', done => {
    pool = createPool(new TestFactory());
    pool.acquire((err, obj) => {
      expect(err).not.toBeDefined();
      expect(obj).toBeDefined();
      pool.destroy(1);
    });
    setTimeout(() => {
      expect(pool.size).toStrictEqual(1);
      done();
    }, 10);
  });

  it('should not release if already idle', done => {
    pool = createPool(new TestFactory());
    pool.acquire((err, obj) => {
      expect(err).not.toBeDefined();
      pool.release(obj);
      setTimeout(() => {
        pool.release(obj);
        done();
      }, 10);
    });
  });

  it('should release but keep min', done => {
    pool = createPool(new TestFactory(), {
      min: 1,
      idleTimeoutMillis: 1,
      houseKeepInterval: 5,
    });
    const acquire = function () {
      pool.acquire((err, obj) => {
        expect(err).not.toBeDefined();
        setTimeout(() => {
          pool.release(obj);
        }, 5);
      });
    };
    acquire();
    acquire();
    acquire();
    setTimeout(() => {
      expect(pool.size).toStrictEqual(1);
      expect(pool.acquired).toStrictEqual(0);
      expect(pool.pending).toStrictEqual(0);
      expect(pool.available).toStrictEqual(1);
      done();
    }, 20);
  });

  it('should release but keep minIdle', done => {
    pool = createPool(new TestFactory(), {
      minIdle: 1,
      idleTimeoutMillis: 1,
      houseKeepInterval: 5,
    });
    const acquire = function () {
      pool.acquire((err, obj) => {
        expect(err).not.toBeDefined();
        setTimeout(() => {
          pool.release(obj);
        }, 5);
      });
    };
    acquire();
    acquire();
    acquire();
    setTimeout(() => {
      expect(pool.size).toStrictEqual(1);
      expect(pool.acquired).toStrictEqual(0);
      expect(pool.pending).toStrictEqual(0);
      expect(pool.available).toStrictEqual(1);
      done();
    }, 40);
  });

  it('should destroy on reset error', () => {
    pool = createPool(
      new TestFactory({
        reset() {
          throw new Error('Any reset error');
        },
      }),
    );
    return pool.acquire().then(obj =>
      pool.releaseAsync(obj).then(() => {
        expect(pool.size).toStrictEqual(0);
        expect(pool.acquired).toStrictEqual(0);
        expect(pool.pending).toStrictEqual(0);
        expect(pool.available).toStrictEqual(0);
      }),
    );
  });

  it('should emit destroy-error', done => {
    pool = createPool(
      new TestFactory({
        destroy() {
          throw new Error('Any error');
        },
      }),
      {
        idleTimeoutMillis: 1,
        houseKeepInterval: 5,
      },
    );
    pool.on('destroy-error', () => {
      expect(pool.size).toStrictEqual(0);
      done();
    });

    pool.acquire((err, obj) => {
      expect(err).not.toBeDefined();
      pool.release(obj);
    });
  });
});
