/* eslint-disable */
const assert = require('assert');
const lightningPool = require('../');
const TestFactory = require('./TestFactory');

describe('Validating', function() {
  var pool;

  afterEach(function() {
    pool.stop(true);
  });

  it('should validate on borrow', function(done) {
    var k = 0;
    pool = lightningPool.createPool(new TestFactory());
    const acquire = function() {
      pool.acquire(function(err, obj) {
        assert(!err, err);
        pool.release(obj);
      });
    };
    pool.on('return', function() {
      if (++k === 2) {
        pool.acquire(function(err, obj) {
          assert(!err, err);
          assert.equal(obj.id, 1);
          assert.equal(obj.validateCount, 1);
          done();
        });
      }
    });

    acquire();
    acquire();
  });

  it('should validate on borrow (promise)', function(done) {
    var k = 0;
    pool = lightningPool.createPool(new TestFactory({
      usePromise: true
    }));
    const acquire = function() {
      pool.acquire(function(err, obj) {
        assert(!err, err);
        pool.release(obj);
      });
    };
    pool.on('return', function() {
      if (++k === 2) {
        pool.acquire(function(err, obj) {
          assert(!err, err);
          assert.equal(obj.id, 1);
          assert.equal(obj.validateCount, 1);
          done();
        });
      }
    });

    acquire();
    acquire();
  });

  it('should validate on borrow and remove if error', function(done) {
    var k = 0;
    var t = 0;
    pool = lightningPool.createPool(new TestFactory({
      validate: function(res, callback) {
        if (t++ === 0)
          throw new Error('Validate error');
        callback();
      }
    }), {
      validation: true
    });
    const acquire = function() {
      pool.acquire(function(err, obj) {
        assert(!err, err);
        pool.release(obj);
      });
    };
    pool.on('return', function() {
      if (++k === 2) {
        pool.acquire(function(err, obj) {
          assert(!err, err);
          assert.equal(obj.id, 2);
          done();
        });
      }
    });

    acquire();
    acquire();

  });

  it('should not validate if options.validation is false', function(done) {
    var k = 0;
    pool = lightningPool.createPool(new TestFactory(), {
      validation: false
    });
    const acquire = function() {
      pool.acquire(function(err, obj) {
        assert(!err, err);
        pool.release(obj);
      });
    };
    pool.on('return', function() {
      if (++k === 2) {
        pool.acquire(function(err, obj) {
          assert(!err, err);
          assert.equal(obj.id, 1);
          assert.equal(obj.validateCount, 0);
          done();
        });
      }
    });

    acquire();
    acquire();
  });

});
