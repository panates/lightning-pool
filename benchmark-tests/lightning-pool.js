const assert = require('assert');
const {createPool} = require('../');
const TestFactory = require('./TestFactory');

module.exports = {
  name: 'lightning-pool',
  run: runTest,
  clear: clearPool
};

let pool;

function runTest(options, callback) {
  pool = createPool(new TestFactory({
        acquireWait: options.acquireWait,
        usePromise: options.usePromise
      }),
      {
        max: options.max,
        maxQueue: options.testCount
      });

  let k = 0;
  let t = 0;
  const testCount = options.testCount;
  const releaseTime = options.releaseTime || 1;
  for (let i = 0; i < testCount; i++) {
    pool.acquire(function(err, obj) {
      assert(!err, err);
      k++;
      t++;
      setTimeout(function() {
        pool.release(obj).then(function() {
          t--;
          if (k === testCount && t === 0) {
            k = 0;
            callback();
          }
        }).catch(function(e) {
          throw e;
        });
      }, releaseTime);
    });
  }
}

function clearPool(callback) {
  pool.close(true, function() {
    callback();
  });
}
