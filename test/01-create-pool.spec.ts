import assert from 'assert';
import {createPool, Pool} from '../src';
import {TestFactory} from './support/TestFactory';

describe('Creating pool', function() {

  let pool;

  it('should createPool must be a function', function(done) {
    pool = createPool(new TestFactory());
    assert.strictEqual(typeof createPool, 'function');
    done();
  });

  it('should validate `factory` argument', function() {
    assert.throws(() => {
      // @ts-ignore
      createPool();
    }, /You must provide/);
  });

  it('should check `factory` object must have a `create` function property', function() {
    assert.throws(() => {
      // @ts-ignore
      createPool({});
    }, /factory.create must be a function/);
    assert.throws(() => {
      // @ts-ignore
      createPool({create: 'abc'});
    }, /factory.create must be a function/);
  });

  it('should check `factory` object must have a `destroy` function property', function() {
    assert.throws(() => {
      // @ts-ignore
      createPool({
        create: () => {}
      });
    }, /factory.destroy must be a function/);
    assert.throws(() => {
      createPool({
        create: () => {},
        // @ts-ignore
        destroy: 'abc'
      });
    }, /factory.destroy must be a function/);

    assert(
        // @ts-ignore
        createPool({
          create: function() {},
          destroy: function() {}
        }) instanceof Pool);
  });

  it('should check `factory` object can have a `validate` function property', function() {
    assert.throws(() => {
      createPool({
        create: function() {},
        destroy: function() {},
        // @ts-ignore
        validate: 'abc'
      });
    }, /factory.validate can be a function/);
    assert(
        // @ts-ignore
        createPool({
          create: function() {},
          destroy: function() {},
          validate: function() {}
        }) instanceof Pool);
  });

  it('should check `factory` object can have a `reset` function property', function() {
    assert.throws(() => {
      // @ts-ignore
      createPool({
        create: function() {},
        destroy: function() {},
        // @ts-ignore
        reset: 'abc'
      });
    }, /factory.reset can be a function/);
    assert(
        // @ts-ignore
        createPool({
          create: function() {},
          destroy: function() {},
          reset: function() {}
        }) instanceof Pool);
  });

  it('should createPool returns Pool instance', function() {
    pool = createPool(new TestFactory());
    assert(pool instanceof Pool);
  });

  it('should default acquireMaxRetries option must be 0', function() {
    pool = createPool(new TestFactory());
    assert.deepStrictEqual(pool.options.acquireMaxRetries, 0);
  });

  it('should set acquireMaxRetries option', function() {
    pool = createPool(new TestFactory(),
        {acquireMaxRetries: 3});
    assert.strictEqual(pool.options.acquireMaxRetries, 3);
    pool = createPool(new TestFactory(),
        {acquireMaxRetries: 0});
    assert.strictEqual(pool.options.acquireMaxRetries, 0);
  });

  it('should default acquireRetryWait option must be 2000', function() {
    pool = createPool(new TestFactory());
    assert.strictEqual(pool.options.acquireRetryWait, 2000);
  });

  it('should set acquireRetryWait option', function() {
    pool = createPool(new TestFactory(),
        {acquireRetryWait: 3});
    assert.strictEqual(pool.options.acquireRetryWait, 3);
    pool = createPool(new TestFactory(),
        {acquireRetryWait: 0});
    assert.strictEqual(pool.options.acquireRetryWait, 0);
  });

  it('should default acquireTimeoutMillis option must be 0', function() {
    pool = createPool(new TestFactory());
    assert.deepStrictEqual(pool.options.acquireTimeoutMillis, 0);
  });

  it('should set acquireTimeoutMillis option', function() {
    pool = createPool(new TestFactory(),
        {acquireTimeoutMillis: 20000});
    assert.strictEqual(pool.options.acquireTimeoutMillis, 20000);
    pool = createPool(new TestFactory(),
        {acquireTimeoutMillis: 0});
    assert.strictEqual(pool.options.acquireTimeoutMillis, 0);
  });

  it('should default fifo option must be true', function() {
    pool = createPool(new TestFactory());
    assert.deepStrictEqual(pool.options.fifo, true);
  });

  it('should set fifo option', function(done) {
    pool = createPool(new TestFactory(),
        {fifo: false});
    assert.deepStrictEqual(pool.options.fifo, false);
    done();
  });

  it('should default idleTimeoutMillis option must be 30000', function() {
    pool = createPool(new TestFactory());
    assert.deepStrictEqual(pool.options.idleTimeoutMillis, 30000);
  });

  it('should set idleTimeoutMillis option', function() {
    pool = createPool(new TestFactory(),
        {idleTimeoutMillis: 30000});
    assert.strictEqual(pool.options.idleTimeoutMillis, 30000);
    pool = createPool(new TestFactory(),
        {idleTimeoutMillis: 0});
    assert.strictEqual(pool.options.idleTimeoutMillis, 0);
  });

  it('should default houseKeepInterval option must be 1000', function() {
    pool = createPool(new TestFactory());
    assert.deepStrictEqual(pool.options.houseKeepInterval, 1000);
  });

  it('should set houseKeepInterval option', function() {
    pool = createPool(new TestFactory(),
        {houseKeepInterval: 30000});
    assert.strictEqual(pool.options.houseKeepInterval, 30000);
    pool = createPool(new TestFactory(),
        {houseKeepInterval: 0});
    assert.strictEqual(pool.options.houseKeepInterval, 0);
  });

  it('should default max option must be 10', function() {
    pool = createPool(new TestFactory());
    assert.strictEqual(pool.options.max, 10);
  });

  it('should set max option', function() {
    pool = createPool(new TestFactory(),
        {max: 3});
    assert.strictEqual(pool.options.max, 3);
    pool = createPool(new TestFactory(),
        {max: 0});
    assert.strictEqual(pool.options.max, 1);
  });

  it('should default min option must be 0', function() {
    pool = createPool(new TestFactory());
    assert.deepStrictEqual(pool.options.min, 0);
  });

  it('should set min option', function() {
    pool = createPool(new TestFactory(),
        {min: 3});
    assert.strictEqual(pool.options.min, 3);
    pool = createPool(new TestFactory(),
        {min: 0});
    assert.strictEqual(pool.options.min, 0);
  });

  it('should default minIdle option must be 0', function() {
    pool = createPool(new TestFactory());
    assert.deepStrictEqual(pool.options.minIdle, 0);
  });

  it('should set minIdle option', function() {
    pool = createPool(new TestFactory(),
        {minIdle: 3});
    assert.strictEqual(pool.options.minIdle, 3);
    pool = createPool(new TestFactory(),
        {minIdle: 0});
    assert.strictEqual(pool.options.minIdle, 0);
  });

  it('should default maxQueue option must be 1000', function() {
    pool = createPool(new TestFactory());
    assert.strictEqual(pool.options.maxQueue, 1000);
  });

  it('should set maxQueue option', function() {
    pool = createPool(new TestFactory(),
        {maxQueue: 3});
    assert.strictEqual(pool.options.maxQueue, 3);
    pool = createPool(new TestFactory(),
        {maxQueue: 0});
    assert.strictEqual(pool.options.maxQueue, 1);
  });
  
  it('should default validation option must be false', function() {
    pool = createPool(new TestFactory());
    assert.deepStrictEqual(pool.options.validation, true);
  });

  it('should set validation option', function() {
    pool = createPool(new TestFactory(),
        {validation: true});
    assert.deepStrictEqual(pool.options.validation, true);
    pool = createPool(new TestFactory(),
        {validation: false});
    assert.deepStrictEqual(pool.options.validation, false);
  });

  it('should prevent malformed min max options', function() {
    pool = createPool(new TestFactory(),
        {min: 0, max: 5});
    pool.options.min = 6;
    assert.strictEqual(pool.options.min, 6);
    assert.strictEqual(pool.options.max, 6);
    pool.options.max = 3;
    assert.strictEqual(pool.options.min, 3);
    assert.strictEqual(pool.options.max, 3);
  });

});
