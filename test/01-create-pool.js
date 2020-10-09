/* eslint-disable */
const assert = require('assert');
const lightningPool = require('../');
const TestFactory = require('./TestFactory');

describe('Creating pool', function() {

  let pool;

  it('should createPool must be a function', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert.strictEqual(typeof lightningPool.createPool, 'function');
    done();
  });

  it('should pass validate `factory` argument', function() {
    assert.throws(() => {
      lightningPool.createPool();
    }, /You must provide/);
  });

  it('should check `factory` object must have a `create` function property', function() {
    assert.throws(() => {
      lightningPool.createPool({});
    }, /factory.create must be a function/);
    assert.throws(() => {
      lightningPool.createPool({create: 'abc'});
    }, /factory.create must be a function/);
  });

  it('should check `factory` object must have a `destroy` function property', function() {
    assert.throws(() => {
      lightningPool.createPool({
        create: () => {}
      });
    }, /factory.destroy must be a function/);
    assert.throws(() => {
      lightningPool.createPool({
        create: () => {},
        destroy: 'abc'
      });
    }, /factory.destroy must be a function/);
    assert(
        lightningPool.createPool({
          create: function() {},
          destroy: function() {}
        }) instanceof lightningPool.Pool);
  });

  it('should check `factory` object can have a `validate` function property', function() {
    assert.throws(() => {
      lightningPool.createPool({
        create: function() {},
        destroy: function() {},
        validate: 'abc'
      });
    }, /factory.validate can be a function/);
    assert(
        lightningPool.createPool({
          create: function() {},
          destroy: function() {},
          validate: function() {}
        }) instanceof lightningPool.Pool);
  });

  it('should check `factory` object can have a `reset` function property', function() {
    assert.throws(() => {
      lightningPool.createPool({
        create: function() {},
        destroy: function() {},
        reset: 'abc'
      });
    }, /factory.reset can be a function/);
    assert(
        lightningPool.createPool({
          create: function() {},
          destroy: function() {},
          reset: function() {}
        }) instanceof lightningPool.Pool);
  });

  it('should createPool returns Pool instance', function() {
    pool = lightningPool.createPool(new TestFactory());
    assert(pool instanceof lightningPool.Pool);
  });

  it('should default acquireMaxRetries option must be 0', function() {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepStrictEqual(pool.options.acquireMaxRetries, 0);
  });

  it('should set acquireMaxRetries option', function() {
    pool = lightningPool.createPool(new TestFactory(),
        {acquireMaxRetries: 3});
    assert.strictEqual(pool.options.acquireMaxRetries, 3);
    pool = lightningPool.createPool(new TestFactory(),
        {acquireMaxRetries: 0});
    assert.strictEqual(pool.options.acquireMaxRetries, 0);
  });

  it('should default acquireRetryWait option must be 2000', function() {
    pool = lightningPool.createPool(new TestFactory());
    assert.strictEqual(pool.options.acquireRetryWait, 2000);
  });

  it('should set acquireRetryWait option', function() {
    pool = lightningPool.createPool(new TestFactory(),
        {acquireRetryWait: 3});
    assert.strictEqual(pool.options.acquireRetryWait, 3);
    pool = lightningPool.createPool(new TestFactory(),
        {acquireRetryWait: 0});
    assert.strictEqual(pool.options.acquireRetryWait, 0);
  });

  it('should default acquireTimeoutMillis option must be 0', function() {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepEqual(pool.options.acquireTimeoutMillis, 0);
  });

  it('should set acquireTimeoutMillis option', function() {
    pool = lightningPool.createPool(new TestFactory(),
        {acquireTimeoutMillis: 20000});
    assert.strictEqual(pool.options.acquireTimeoutMillis, 20000);
    pool = lightningPool.createPool(new TestFactory(),
        {acquireTimeoutMillis: 0});
    assert.strictEqual(pool.options.acquireTimeoutMillis, 0);
  });

  it('should default fifo option must be true', function() {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepStrictEqual(pool.options.fifo, true);
  });

  it('should set fifo option', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {fifo: false});
    assert.deepStrictEqual(pool.options.fifo, false);
    done();
  });

  it('should default idleTimeoutMillis option must be 30000', function() {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepStrictEqual(pool.options.idleTimeoutMillis, 30000);
  });

  it('should set idleTimeoutMillis option', function() {
    pool = lightningPool.createPool(new TestFactory(),
        {idleTimeoutMillis: 30000});
    assert.strictEqual(pool.options.idleTimeoutMillis, 30000);
    pool = lightningPool.createPool(new TestFactory(),
        {idleTimeoutMillis: 0});
    assert.strictEqual(pool.options.idleTimeoutMillis, 0);
  });

  it('should default houseKeepInterval option must be 1000', function() {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepStrictEqual(pool.options.houseKeepInterval, 1000);
  });

  it('should set houseKeepInterval option', function() {
    pool = lightningPool.createPool(new TestFactory(),
        {houseKeepInterval: 30000});
    assert.strictEqual(pool.options.houseKeepInterval, 30000);
    pool = lightningPool.createPool(new TestFactory(),
        {houseKeepInterval: 0});
    assert.strictEqual(pool.options.houseKeepInterval, 0);
  });

  it('should default max option must be 10', function() {
    pool = lightningPool.createPool(new TestFactory());
    assert.strictEqual(pool.options.max, 10);
  });

  it('should set max option', function() {
    pool = lightningPool.createPool(new TestFactory(),
        {max: 3});
    assert.strictEqual(pool.options.max, 3);
    pool = lightningPool.createPool(new TestFactory(),
        {max: 0});
    assert.strictEqual(pool.options.max, 0);
  });

  it('should default min option must be 0', function() {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepEqual(pool.options.min, 0);
  });

  it('should set min option', function() {
    pool = lightningPool.createPool(new TestFactory(),
        {min: 3});
    assert.strictEqual(pool.options.min, 3);
    pool = lightningPool.createPool(new TestFactory(),
        {min: 0});
    assert.strictEqual(pool.options.min, 0);
  });

  it('should default minIdle option must be 0', function() {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepStrictEqual(pool.options.minIdle, 0);
  });

  it('should set minIdle option', function() {
    pool = lightningPool.createPool(new TestFactory(),
        {minIdle: 3});
    assert.strictEqual(pool.options.minIdle, 3);
    pool = lightningPool.createPool(new TestFactory(),
        {minIdle: 0});
    assert.strictEqual(pool.options.minIdle, 0);
  });

  it('should default maxQueue option must be 1000', function() {
    pool = lightningPool.createPool(new TestFactory());
    assert.strictEqual(pool.options.maxQueue, 1000);
  });

  it('should set maxQueue option', function() {
    pool = lightningPool.createPool(new TestFactory(),
        {maxQueue: 3});
    assert.strictEqual(pool.options.maxQueue, 3);
    pool = lightningPool.createPool(new TestFactory(),
        {maxQueue: 0});
    assert.strictEqual(pool.options.maxQueue, 0);
  });
  
  it('should default validation option must be false', function() {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepStrictEqual(pool.options.validation, true);
  });

  it('should set validation option', function() {
    pool = lightningPool.createPool(new TestFactory(),
        {validation: true});
    assert.deepStrictEqual(pool.options.validation, true);
    pool = lightningPool.createPool(new TestFactory(),
        {validation: false});
    assert.deepStrictEqual(pool.options.validation, false);
  });

  it('should prevent malformed min max options', function() {
    pool = lightningPool.createPool(new TestFactory(),
        {min: 0, max: 5});
    pool.options.min = 6;
    assert.strictEqual(pool.options.min, 6);
    assert.strictEqual(pool.options.max, 6);
    pool.options.max = 3;
    assert.strictEqual(pool.options.min, 3);
    assert.strictEqual(pool.options.max, 3);
  });

});
