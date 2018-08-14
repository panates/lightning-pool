/* eslint-disable */
const assert = require('assert');
const {createPool} = require('../');
const TestFactory = require('./TestFactory');

describe('Validating', function() {
  var pool;

  afterEach(function() {
    return pool.close(true);
  });

  it('should validate on borrow', function() {
    pool = createPool(new TestFactory());

    return pool.acquire().then(obj => {
      return pool.release(obj).then(() => {
        return pool.acquire().then(obj => {
          assert.equal(obj.id, 1);
          assert.equal(obj.validateCount, 1);
          return pool.release(obj);
        });
      });

    });
  });

  it('should validate on borrow and remove if error', function() {
    pool = createPool(new TestFactory({
      validate: function(res) {
        throw new Error('Validate error');
      }
    }), {
      validation: true
    });

    return pool.acquire().then(obj=>{
      return pool.release(obj).then(()=>{
        return pool.acquire().then(obj=>{
          assert.equal(pool.size, 1);
          return pool.release(obj);
        })
      });
    });
  });

  it('should not validate if options.validation is false', function(done) {
    var k = 0;
    pool = createPool(new TestFactory(), {
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
