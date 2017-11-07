const promisify = require('putil-promisify');

module.exports = TestFactory;

/**
 * Generic class for handling creation of resources
 * for testing
 */
function TestFactory(opts) {
  this.created = 0;
  this.destroyed = 0;
  if (opts && opts.create)
    this.create = opts.create;
  if (opts && opts.destroy)
    this.destroy = opts.destroy;
  if (opts && opts.reset)
    this.reset = opts.reset;
  if (opts && opts.validate)
    this.validate = opts.validate;
  this.usePromise = opts && opts.usePromise;
  this.max = opts && opts.max;
  this.retryTest = opts && opts.retryTest;
  this.acquireWait = opts && opts.acquireWait || 0;
  this.resetWait = opts && opts.resetWait || 0;
}

const proto = TestFactory.prototype;

proto.create = function(callback) {
  const self = this;

  function create(cb) {
    const id = ++self.created;
    if (self.max && id >= self.max)
      throw new Error('Max resources created');

    setTimeout(function() {
      if (self.retryTest && self.retryTest--)
        return cb('Retry test  error');
      const res = new TestResource(id);
      cb(null, res);
    }, self.acquireWait);
  }

  if (!callback || self.usePromise)
    return promisify.fromCallback(function(cb) {
      create(cb);
    });
  create(callback);
};

proto.destroy = function(res, callback) {
  const self = this;

  function destroy(cb) {
    if (!(res instanceof TestResource))
      return cb(new Error('Invalid resource instance'));
    if (res.destroyed)
      return cb(new Error('Resource already destroyed'));
    self.destroyed++;
    res.destroyed = true;
    cb();
  }

  if (!callback || self.usePromise)
    return promisify.fromCallback(function(cb) {
      destroy(cb);
    });
  destroy(callback);
};

/**
 *
 * @param id
 * @constructor
 */
function TestResource(id) {
  this.id = id;
  this.resetCount = 0;
}