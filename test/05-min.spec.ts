import { createPool } from '../src/index.js';
import { TestFactory } from './support/TestFactory.js';

describe('Ensuring min resources', () => {
  let pool;

  afterEach(() => pool.closeAsync(true));

  it('should pool have at least `min` resource', done => {
    pool = createPool(new TestFactory(), {
      min: 2,
    });
    pool.start();
    setTimeout(() => {
      pool.acquire();
    }, 10);

    setTimeout(() => {
      expect(pool.size).toStrictEqual(2);
      expect(pool.available).toStrictEqual(1);
      expect(pool.acquired).toStrictEqual(1);
      done();
    }, 20);
  });

  it('should pool have at least `minIdle` resource', done => {
    pool = createPool(new TestFactory(), {
      minIdle: 2,
    });
    pool.start();
    setTimeout(() => {
      pool.acquire();
    }, 10);

    setTimeout(() => {
      expect(pool.size).toStrictEqual(3);
      expect(pool.available).toStrictEqual(2);
      expect(pool.acquired).toStrictEqual(1);
      done();
    }, 20);
  });

  it('should pool have at least `minIdle` available resource', done => {
    pool = createPool(new TestFactory(), {
      min: 2,
      minIdle: 3,
    });
    pool.start();
    setTimeout(() => {
      pool.acquire();
    }, 10);

    setTimeout(() => {
      expect(pool.size).toStrictEqual(4);
      expect(pool.available).toStrictEqual(3);
      expect(pool.acquired).toStrictEqual(1);
      done();
    }, 20);
  });
});
