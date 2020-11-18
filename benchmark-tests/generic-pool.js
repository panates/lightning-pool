const genericPool = require('generic-pool');
const TestFactory = require('./TestFactory');

module.exports = {
  name: 'generic-pool',
  run: runTest,
  clear: clearPool
};

let pool;

function runTest(options, callback) {
  pool = genericPool.createPool(new TestFactory({
        acquireWait: options.acquireWait
      }),
      {
        max: options.max,
        maxQueue: options.testCount,
        evictionRunIntervalMillis: 1000
      });

  let k = 0;
  let t = 0;
  const testCount = options.testCount;
  const releaseTime = options.releaseTime || 1;
  for (let i = 0; i < testCount; i++) {
    pool.acquire().then(function(obj) {
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
    }).catch(function(e) {
      throw e;
    });
  }
}

function clearPool(callback) {
  pool.drain().then(function() {
    pool.clear();
    callback();
  });
}
