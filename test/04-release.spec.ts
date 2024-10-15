import { createPool } from '../src/index.js';
import { createDoneCallback } from './support/create-done-callback.js';
import { TestFactory } from './support/TestFactory.js';

describe('Releasing', () => {
  let pool;

  afterEach(() => pool.closeAsync(true));

  it('should release with pool.release()', _done => {
    const done = createDoneCallback(_done);
    pool = createPool(new TestFactory(), {
      max: 3,
    });
    let o;
    const acquire = () => {
      pool.acquire((err, obj) => {
        try {
          expect(err).not.toBeDefined();
          o = o || obj;
        } catch (e) {
          done(e);
        }
      });
    };
    acquire();
    acquire();
    setTimeout(() => {
      try {
        expect(pool.size).toStrictEqual(2);
        expect(pool.acquired).toStrictEqual(2);
        expect(pool.pending).toStrictEqual(0);
        expect(pool.available).toStrictEqual(0);
        pool.once('return', obj => {
          try {
            expect(obj).toEqual(o);
            expect(pool.size).toStrictEqual(2);
            expect(pool.acquired).toStrictEqual(1);
            expect(pool.pending).toStrictEqual(0);
            expect(pool.available).toStrictEqual(1);
            _done();
          } catch (e) {
            done(e);
          }
        });
        pool.release(o);
      } catch (e) {
        done(e);
      }
    }, 10);
  });

  it('should destroy with pool.destroy()', _done => {
    const done = createDoneCallback(_done);
    pool = createPool(new TestFactory(), {
      max: 3,
    });
    let o;
    const acquire = function () {
      pool.acquire((err, obj) => {
        try {
          expect(err).not.toBeDefined();
          o = o || obj;
        } catch (e) {
          done(e);
        }
      });
    };
    acquire();
    acquire();
    setTimeout(() => {
      try {
        expect(pool.size).toStrictEqual(2);
        expect(pool.acquired).toStrictEqual(2);
        expect(pool.pending).toStrictEqual(0);
        expect(pool.available).toStrictEqual(0);
        pool.once('destroy', obj => {
          try {
            expect(obj).toEqual(o);
            expect(pool.size).toStrictEqual(1);
            expect(pool.acquired).toStrictEqual(1);
            expect(pool.pending).toStrictEqual(0);
            expect(pool.available).toStrictEqual(0);
            done();
          } catch (e) {
            done(e);
          }
        });
        pool.destroy(o);
      } catch (e) {
        done(e);
      }
    }, 10);
  });

  it('should not release if resource is not in pool', _done => {
    const done = createDoneCallback(_done);
    pool = createPool(new TestFactory());
    pool.acquire((err, obj) => {
      try {
        expect(err).not.toBeDefined();
        expect(obj).toBeDefined();
        pool.release(1);
      } catch (e) {
        done(e);
      }
    });
    setTimeout(() => {
      try {
        expect(pool.size).toStrictEqual(1);
        done();
      } catch (e) {
        done(e);
      }
    }, 10);
  });

  it('should not destroy if resource is not in pool', _done => {
    const done = createDoneCallback(_done);
    pool = createPool(new TestFactory());
    pool.acquire((err, obj) => {
      try {
        expect(err).not.toBeDefined();
        expect(obj).toBeDefined();
        pool.destroy(1);
      } catch (e) {
        done(e);
      }
    });
    setTimeout(() => {
      try {
        expect(pool.size).toStrictEqual(1);
        done();
      } catch (e) {
        done(e);
      }
    }, 10);
  });

  it('should not release if already idle', _done => {
    const done = createDoneCallback(_done);
    pool = createPool(new TestFactory());
    pool.acquire((err, obj) => {
      try {
        expect(err).not.toBeDefined();
        pool.release(obj);
        setTimeout(() => {
          pool.release(obj);
          done();
        }, 10);
      } catch (e) {
        done(e);
      }
    });
  });

  it('should release but keep min', _done => {
    const done = createDoneCallback(_done);
    pool = createPool(new TestFactory(), {
      min: 1,
      idleTimeoutMillis: 1,
      houseKeepInterval: 5,
    });
    const acquire = function () {
      pool.acquire((err, obj) => {
        try {
          expect(err).not.toBeDefined();
          setTimeout(() => {
            pool.release(obj);
          }, 5);
        } catch (e) {
          done(e);
        }
      });
    };
    acquire();
    acquire();
    acquire();
    setTimeout(() => {
      try {
        expect(pool.size).toStrictEqual(1);
        expect(pool.acquired).toStrictEqual(0);
        expect(pool.pending).toStrictEqual(0);
        expect(pool.available).toStrictEqual(1);
        done();
      } catch (e) {
        done(e);
      }
    }, 20);
  });

  it('should release but keep minIdle', _done => {
    const done = createDoneCallback(_done);
    pool = createPool(new TestFactory(), {
      minIdle: 1,
      idleTimeoutMillis: 1,
      houseKeepInterval: 5,
    });
    const acquire = function () {
      pool.acquire((err, obj) => {
        try {
          expect(err).not.toBeDefined();
          setTimeout(() => {
            pool.release(obj);
          }, 5);
        } catch (e) {
          done(e);
        }
      });
    };
    acquire();
    acquire();
    acquire();
    setTimeout(() => {
      try {
        expect(pool.size).toStrictEqual(1);
        expect(pool.acquired).toStrictEqual(0);
        expect(pool.pending).toStrictEqual(0);
        expect(pool.available).toStrictEqual(1);
        done();
      } catch (e) {
        done(e);
      }
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

  it('should emit destroy-error', _done => {
    const done = createDoneCallback(_done);
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
      try {
        expect(pool.size).toStrictEqual(0);
        done();
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
  });
});
