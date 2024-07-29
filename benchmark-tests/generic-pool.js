const genericPool = require('generic-pool');
const TestFactory = require('./TestFactory');

module.exports = {
  name: 'generic-pool',
  run: runTest,
  clear: clearPool,
};

let pool;

function runTest(options, callback) {
  pool = genericPool.createPool(
    new TestFactory({
      acquireWait: options.acquireWait,
    }),
    {
      max: options.max,
      maxQueue: options.testCount,
      evictionRunIntervalMillis: 1000,
    },
  );

  let k = 0;
  let t = 0;
  const testCount = options.testCount;
  const releaseTime = options.releaseTime || 1;
  for (let i = 0; i < testCount; i++) {
    pool
      .acquire()
      .then(obj => {
        k++;
        t++;
        setTimeout(() => {
          pool
            .release(obj)
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
      })
      .catch(e => {
        throw e;
      });
  }
}

function clearPool(callback) {
  pool.drain().then(() => {
    pool.clear();
    callback();
  });
}
