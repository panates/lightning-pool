/* eslint-disable */
const assert = require('assert');
const {createPool} = require('../');
const TestFactory = require('./TestFactory');

describe('Validating', function() {
  var pool;

  afterEach(function() {
    return pool.close(true);
  });

  it('should validate on borrow', async function() {
    pool = createPool(new TestFactory());

    let obj = await pool.acquire();
    await pool.release(obj);
    obj = await pool.acquire();
    assert.equal(obj.id, 1);
    assert.equal(obj.validateCount, 1);
    await pool.release(obj);
  });

  it('should validate on borrow and remove if error', async function() {
    pool = createPool(new TestFactory({
      validate: function(res) {
        throw new Error('Validate error');
      }
    }), {
      validation: true
    });

    let obj = await pool.acquire();
    await pool.release(obj);
    obj = await pool.acquire();
    assert.equal(pool.size, 1);
    await pool.release(obj);
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
