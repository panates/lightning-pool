import assert from 'assert';
import {createPool} from '../src';
import {TestFactory} from './support/TestFactory';

describe('Start/Close', function() {

  let pool;

  beforeEach(() => {
    pool = createPool(new TestFactory());
  });

  afterEach(function() {
    return pool.close(0);
  });

  it('should start on acquire', function(done) {
    pool.on('start', function() {
      setTimeout(() => done(), 10);
    });
    pool.acquire(() => {});
  });

  it('should not start a closed pool again', async function() {
    pool.start();
    await pool.close();
    await assert.rejects(() =>
        pool.acquire());
  });

  it('should return Promise if no callback given', function() {
    pool.start();
    return pool.close().then();
  });

  it('should close call callback', function(done) {
    pool.start();
    pool.close(done);
  });

  it('should wait for given amount of ms before terminate ', async function() {
    pool.start();
    const res = await pool.acquire();
    assert.ok(res);
    const t = Date.now();
    await pool.close(500);
    assert.ok(Date.now() - t >= 500);
  });

  it('should terminate immediately if wait time is 0 ', async function() {
    pool.start();
    const res = await pool.acquire();
    assert.ok(res);
    const t = Date.now();
    await pool.close(0);
    assert.ok(Date.now() - t < 100);
  });

});
