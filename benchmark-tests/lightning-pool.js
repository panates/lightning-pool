import assert from 'node:assert';
import { createPool } from 'lightning-pool';
import TestFactory from './test-factory.js';

const testSuite = {
  name: 'lightning-pool',
  run: runTest,
  clear: clearPool,
};

export default testSuite;

let pool;

function runTest(options, callback) {
  pool = createPool(
    new TestFactory({
      acquireWait: options.acquireWait,
      usePromise: options.usePromise,
    }),
    {
      max: options.max,
      maxQueue: options.testCount,
    },
  );

  let k = 0;
  let t = 0;
  const testCount = options.testCount;
  const releaseTime = options.releaseTime || 1;
  for (let i = 0; i < testCount; i++) {
    pool.acquire((err, obj) => {
      assert(!err, err);
      k++;
      t++;
      setTimeout(() => {
        pool
          .releaseAsync(obj)
          .then(() => {
            t--;
            if (k === testCount && t === 0) {
              k = 0;
              callback();
            }
          })
          .catch(e => {
            throw e;
          });
      }, releaseTime);
    });
  }
}

function clearPool(callback) {
  pool.close(true, () => {
    callback();
  });
}
