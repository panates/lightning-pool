import { createPool } from '../src/index.js';
import { TestFactory } from './support/TestFactory.js';

describe('Start/Close', () => {
  let pool;

  beforeEach(() => {
    pool = createPool(new TestFactory());
  });

  afterEach(() => pool.closeAsync(0));

  it('should start on acquire', done => {
    pool.on('start', () => {
      setTimeout(() => done(), 10);
    });
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    pool.acquire(() => {});
  });

  it('should not start a closed pool again', async () => {
    pool.start();
    await pool.closeAsync();
    await expect(() => pool.acquire()).rejects.toThrow(
      'Closed pool can not be started again',
    );
  });

  it('should return Promise if no callback given', () => {
    pool.start();
    return pool.closeAsync().then();
  });

  it('should close call callback', done => {
    pool.start();
    pool.close(done);
  });

  it('should wait for given amount of ms before terminate ', async () => {
    pool.start();
    const res = await pool.acquire();
    expect(res).toBeDefined();
    const t = Date.now();
    await pool.closeAsync(500);
    expect(Date.now() - t).toBeGreaterThanOrEqual(500);
  });

  it('should terminate immediately if wait time is 0 ', async () => {
    pool.start();
    const res = await pool.acquire();
    expect(res).toBeDefined();
    const t = Date.now();
    await pool.closeAsync(0);
    expect(Date.now() - t).toBeLessThan(100);
  });
});
