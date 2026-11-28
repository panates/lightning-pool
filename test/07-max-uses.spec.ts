import { expect } from 'expect';
import { createPool } from '../src/index.js';
import { createDoneCallback } from './support/create-done-callback.js';
import { TestFactory } from './support/TestFactory.js';

describe('maxUses', () => {
  let pool;

  afterEach(() => pool.closeAsync(true));

  it('should keep reusing a resource below maxUses', async () => {
    pool = createPool(new TestFactory(), { maxUses: 3 });
    const o1 = await pool.acquire();
    await pool.releaseAsync(o1);
    const o2 = await pool.acquire();
    await pool.releaseAsync(o2);
    expect(o2).toStrictEqual(o1);
    expect(pool.size).toStrictEqual(1);
  });

  it('should destroy a resource on release once it reaches maxUses', async () => {
    pool = createPool(new TestFactory(), { maxUses: 2 });
    const o1 = await pool.acquire();
    await pool.releaseAsync(o1);
    const o2 = await pool.acquire();
    expect(o2).toStrictEqual(o1);
    await pool.releaseAsync(o2);
    expect(pool.size).toStrictEqual(0);
    expect(pool.available).toStrictEqual(0);

    const o3 = await pool.acquire();
    expect(o3).not.toStrictEqual(o1);
  });

  it('should emit `destroy`, not `return`, when retiring a resource', _done => {
    const done = createDoneCallback(_done);
    pool = createPool(new TestFactory(), { maxUses: 1 });
    pool.once('return', () => done(new Error('should not emit return')));
    pool.once('destroy', () => done());
    pool.acquire((err, obj) => {
      if (err) return done(err);
      pool.release(obj);
    });
  });

  it('should not run factory.reset() when retiring a resource', async () => {
    const factory = new TestFactory();
    pool = createPool(factory, { maxUses: 1 });
    const o1 = await pool.acquire();
    await pool.releaseAsync(o1);
    expect(o1.resetCount).toStrictEqual(0);
    expect(o1.destroyed).toStrictEqual(true);
  });

  it('should not retire a resource with maxUses 0 (default)', async () => {
    pool = createPool(new TestFactory());
    let o;
    for (let i = 0; i < 10; i++) {
      o = await pool.acquire();
      await pool.releaseAsync(o);
    }
    expect(pool.size).toStrictEqual(1);
  });

  it('should not count a resource returned by a timed-out request against maxUses', async () => {
    pool = createPool(new TestFactory({ acquireWait: 20 }), {
      maxUses: 1,
      acquireTimeoutMillis: 1,
    });
    await expect(pool.acquire()).rejects.toThrow();
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(pool.size).toStrictEqual(1);
    expect(pool.available).toStrictEqual(1);
  });
});
