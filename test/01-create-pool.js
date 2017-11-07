/* eslint-disable */
const assert = require('assert');
const lightningPool = require('../');
const TestFactory = require('./TestFactory');

describe('Creating pool', function() {

  var pool;

  it('should createPool must be a function', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert.equal(typeof lightningPool.createPool, 'function');
    done();
  });

  it('should pass validate `factory` argument', function(done) {
    try {
      lightningPool.createPool();
    } catch (e) {
      return done();
    }
    assert(1, 'Failed');
  });

  it('should check `factory` object must have a `create` function property', function(done) {
    var i = 0;
    try {
      lightningPool.createPool({});
    } catch (e) {
      i++;
    }
    assert.equal(i, 1, 'Failed');
    try {
      lightningPool.createPool({create: 'abc'});
    } catch (e) {
      i++;
    }
    assert.equal(i, 2, 'Failed');
    done();
  });

  it('should check `factory` object must have a `destroy` function property', function(done) {
    var i = 0;
    try {
      lightningPool.createPool({
        create: function() {}
      });
    } catch (e) {
      i++;
    }
    assert.equal(i, 1, 'Failed');
    try {
      lightningPool.createPool({
        create: function() {},
        destroy: 'abc'
      });
    } catch (e) {
      i++;
    }
    assert.equal(i, 2, 'Failed');
    lightningPool.createPool({
      create: function() {},
      destroy: function() {}
    });
    done();
  });

  it('should check `factory` object can have a `validate` function property', function(done) {
    var i = 0;
    try {
      lightningPool.createPool({
        create: function() {},
        destroy: function() {},
        validate: 'abc'
      });
    } catch (e) {
      i++;
    }
    assert.equal(i, 1, 'Failed');
    lightningPool.createPool({
      create: function() {},
      destroy: function() {},
      validate: function() {}
    });
    done();
  });

  it('should check `factory` object can have a `reset` function property', function(done) {
    var i = 0;
    try {
      lightningPool.createPool({
        create: function() {},
        destroy: function() {},
        reset: 'abc'
      });
    } catch (e) {
      i++;
    }
    assert.equal(i, 1, 'Failed');
    lightningPool.createPool({
      create: function() {},
      destroy: function() {},
      reset: function() {}
    });
    done();
  });

  it('should createPool returns Pool instance', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert(pool instanceof lightningPool.Pool);
    done();
  });

  it('should default acquireMaxRetries option must be 0', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepEqual(pool.options.acquireMaxRetries, 0);
    done();
  });

  it('should set acquireMaxRetries option', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {acquireMaxRetries: 3});
    assert.equal(pool.options.acquireMaxRetries, 3);
    pool = lightningPool.createPool(new TestFactory(),
        {acquireMaxRetries: 0});
    assert.equal(pool.options.acquireMaxRetries, 0);
    done();
  });

  it('should default acquireRetryWait option must be 2000', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert.equal(pool.options.acquireRetryWait, 2000);
    done();
  });

  it('should set acquireRetryWait option', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {acquireRetryWait: 3});
    assert.equal(pool.options.acquireRetryWait, 3);
    pool = lightningPool.createPool(new TestFactory(),
        {acquireRetryWait: 0});
    assert.equal(pool.options.acquireRetryWait, 0);
    done();
  });

  it('should default acquireTimeoutMillis option must be 0', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepEqual(pool.options.acquireTimeoutMillis, 0);
    done();
  });

  it('should set acquireTimeoutMillis option', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {acquireTimeoutMillis: 20000});
    assert.equal(pool.options.acquireTimeoutMillis, 20000);
    pool = lightningPool.createPool(new TestFactory(),
        {acquireTimeoutMillis: 0});
    assert.equal(pool.options.acquireTimeoutMillis, 0);
    done();
  });

  it('should default fifo option must be true', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepEqual(pool.options.fifo, true);
    done();
  });

  it('should set fifo option', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {fifo: false});
    assert.deepEqual(pool.options.fifo, false);
    done();
  });

  it('should default idleTimeoutMillis option must be 30000', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepEqual(pool.options.idleTimeoutMillis, 30000);
    done();
  });

  it('should set idleTimeoutMillis option', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {idleTimeoutMillis: 30000});
    assert.equal(pool.options.idleTimeoutMillis, 30000);
    pool = lightningPool.createPool(new TestFactory(),
        {idleTimeoutMillis: 0});
    assert.equal(pool.options.idleTimeoutMillis, 0);
    done();
  });

  it('should default houseKeepInterval option must be 1000', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepEqual(pool.options.houseKeepInterval, 1000);
    done();
  });

  it('should set houseKeepInterval option', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {houseKeepInterval: 30000});
    assert.equal(pool.options.houseKeepInterval, 30000);
    pool = lightningPool.createPool(new TestFactory(),
        {houseKeepInterval: 0});
    assert.equal(pool.options.houseKeepInterval, 0);
    done();
  });

  it('should default max option must be 10', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert.equal(pool.options.max, 10);
    done();
  });

  it('should set max option', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {max: 3});
    assert.equal(pool.options.max, 3);
    pool = lightningPool.createPool(new TestFactory(),
        {max: 0});
    assert.equal(pool.options.max, 0);
    done();
  });

  it('should default min option must be 0', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepEqual(pool.options.min, 0);
    done();
  });

  it('should set min option', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {min: 3});
    assert.equal(pool.options.min, 3);
    pool = lightningPool.createPool(new TestFactory(),
        {min: 0});
    assert.equal(pool.options.min, 0);
    done();
  });

  it('should default minIdle option must be 0', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepEqual(pool.options.minIdle, 0);
    done();
  });

  it('should set minIdle option', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {minIdle: 3});
    assert.equal(pool.options.minIdle, 3);
    pool = lightningPool.createPool(new TestFactory(),
        {minIdle: 0});
    assert.equal(pool.options.minIdle, 0);
    done();
  });

  it('should default maxQueue option must be 1000', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert.equal(pool.options.maxQueue, 1000);
    done();
  });

  it('should set maxQueue option', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {maxQueue: 3});
    assert.equal(pool.options.maxQueue, 3);
    pool = lightningPool.createPool(new TestFactory(),
        {maxQueue: 0});
    assert.equal(pool.options.maxQueue, 0);
    done();
  });

  it('should default resetOnReturn option must be false', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepEqual(pool.options.resetOnReturn, true);
    done();
  });

  it('should set resetOnReturn option', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {resetOnReturn: true});
    assert.deepEqual(pool.options.resetOnReturn, true);
    pool = lightningPool.createPool(new TestFactory(),
        {resetOnReturn: false});
    assert.deepEqual(pool.options.resetOnReturn, false);
    done();
  });

  it('should default validation option must be false', function(done) {
    pool = lightningPool.createPool(new TestFactory());
    assert.deepEqual(pool.options.validation, true);
    done();
  });

  it('should set validation option', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {validation: true});
    assert.deepEqual(pool.options.validation, true);
    pool = lightningPool.createPool(new TestFactory(),
        {validation: false});
    assert.deepEqual(pool.options.validation, false);
    done();
  });

  it('should prevent malformed min max options', function(done) {
    pool = lightningPool.createPool(new TestFactory(),
        {min: 0, max: 5});
    pool.options.min = 6;
    assert.equal(pool.options.min, 6);
    assert.equal(pool.options.max, 6);
    pool.options.max = 3;
    assert.equal(pool.options.min, 3);
    assert.equal(pool.options.max, 3);
    done();
  });
});

