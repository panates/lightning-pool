const lightningPoolTest = require('./lightning-pool');
const genericPoolTest = require('./generic-pool');
const promisify = require('putil-promisify');

const testLoops = 2;
let testId = 0;

async function runTest(options) {
  console.log('### Starting Test-', ++testId, '###');
  console.log('- Total requests: ', options.testCount);
  console.log('- Test loops: ', testLoops);
  console.log('- Pool Resources: ', options.max);
  console.log('- Acquiring Time: ', options.acquireWait, 'ms');
  console.log('- Release After: ', options.releaseTime, 'ms');
  const results = [];
  let started = Date.now();
  let total = 0;
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

  await promisify.fromCallback(
      cb => runForAvg(testLoops, lightningPoolTest, cb));
  await promisify.fromCallback(
      cb => runForAvg(testLoops, genericPoolTest, cb));
  printResults();
}

async function runAll() {
  await runTest({
    testCount: 1000,
    acquireWait: 0,
    releaseTime: 1,
    max: 10
  });
  await runTest({
    testCount: 10000,
    acquireWait: 0,
    releaseTime: 1,
    max: 10
  });
  await runTest({
    testCount: 10000,
    acquireWait: 0,
    releaseTime: 1,
    max: 100
  });
  await runTest({
    testCount: 10000,
    acquireWait: 0,
    releaseTime: 1,
    max: 1000
  });
  await runTest({
    testCount: 100000,
    acquireWait: 0,
    releaseTime: 1,
    max: 1000
  });
  console.log('******************');
  console.log('All tests complete');
  process.exit(0);
}

runAll().catch(e => console.error(e));

