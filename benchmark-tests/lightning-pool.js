const assert = require('assert');
const lightningPool = require('../');
const TestFactory = require('./TestFactory');

module.exports = {
  name: 'lightning-pool',
  run: runTest,
  clear: clearPool
};

function runTest(options, callback) {
  pool = lightningPool.createPool(new TestFactory({
        acquireWait: options.acquireWait,
        usePromise: options.usePromise
      }),
      {
        max: options.max,
        maxQueue: options.testCount
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
  pool.close(true, function() {
    callback();
  });
}
