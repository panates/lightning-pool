const lightningPoolTest = require('./lightning-pool');
const genericPoolTest = require('./generic-pool');
const waterfall = require('putil-waterfall');

const testLoops = 4;
let testId = 0;

function runTest(options, callback) {
  console.log('### Starting Test-', ++testId, '###');
  console.log('- Total requests: ', options.testCount);
  console.log('- Test loops: ', testLoops);
  console.log('- Pool Resources: ', options.max);
  console.log('- Acquiring Time: ', options.acquireWait, 'ms');
  console.log('- Release After: ', options.releaseTime, 'ms');
  const results = [];
  var started = Date.now();
  var total = 0;
  const runForAvg = function(k, module, cb) {
    started = Date.now();
    module.run(options, function(err) {
      if (err)
        return cb(err);
      total += (Date.now() - started);
      if (!--k) {
        const ms = total / testLoops;
        results.push(ms);
        console.log('>', module.name, ': Avg ', ms, 'ms');
        return module.clear(cb);
      }
      runForAvg(k, module, cb);
    });
  };

  const printResults = function() {
    let t = Math.round(((results[1] / results[0]) - 1) * 100);
    if (t > 0)
      console.log('Result: lightning is %', t, 'faster than generic');
    else console.log('Result: generic is %', t, 'faster than lightning');
    console.log(' ');
  };

  waterfall([
    function(next) {
      runForAvg(testLoops, lightningPoolTest, next);
    },
    function(next) {
      runForAvg(testLoops, genericPoolTest, next);
    }
  ], function(err) {
    if (err)
      return callback(err);
    printResults();
    callback(null);
  });
}

waterfall([
  function(next) {
    runTest({
      testCount: 1000,
      acquireWait: 5,
      releaseTime: 1,
      max: 10
    }, next);
  }, function(next) {
    runTest({
      testCount: 10000,
      acquireWait: 5,
      releaseTime: 1,
      max: 10
    }, next);
  }, function(next) {
    runTest({
      testCount: 10000,
      acquireWait: 5,
      releaseTime: 1,
      max: 100
    }, next);
  }, function(next) {
    runTest({
      testCount: 10000,
      acquireWait: 5,
      releaseTime: 1,
      max: 1000
    }, next);
  }, function(next) {
    runTest({
      testCount: 100000,
      acquireWait: 5,
      releaseTime: 1,
      max: 1000
    }, next);
  }
], function(err) {
  if (err)
    return console.log(err);
  console.log('******************');
  console.log('All tests complete');
  process.exit(0);
});

