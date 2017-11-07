const assert = require('assert');
const advancedPool = require('advanced-pool');
const TestFactory = require('./TestFactory');

module.exports = {
  name: 'advanced-pool',
  run: runTest,
  clear: clearPool
};

function runTest(options, callback) {
  pool = new advancedPool.Pool(new TestFactory({
        acquireWait: options.acquireWait,
        usePromise: options.usePromise
      }),
      {
        max: options.max
      });

  var k = 0;
  const testCount = options.testCount;
  const releaseTime = options.releaseTime || 1;
  for (var i = 0; i < testCount; i++) {
    pool.acquire(function(err, obj) {
      assert(!err, err);
      k++;
      setTimeout(function() {
        pool.release(obj);
        if (k === testCount) {
          k = 0;
          callback();
        }
      }, releaseTime);
    });
  }
}

function clearPool(callback) {
  pool.close();
  callback();
}
