/**
 * Generic class for handling creation of resources
 * for testing
 */
class TestFactory {
  /**
   *
   * @param {Object} [opts]
   */
  constructor(opts) {
    this.created = 0;
    this.destroyed = 0;
    if (opts && opts.create) this.create = opts.create;
    if (opts && opts.destroy) this.destroy = opts.destroy;
    if (opts && opts.reset) this.reset = opts.reset;
    if (opts && opts.validate) this.validate = opts.validate;
    this.max = opts && opts.max;
    this.retryTest = opts && opts.retryTest;
    this.acquireWait = (opts && opts.acquireWait) || 0;
    this.resetWait = (opts && opts.resetWait) || 0;
  }

  create() {
    return new Promise((resolve, reject) => {
      const id = ++this.created;
      if (this.max && id >= this.max) throw new Error('Max resources created');

      const doCreate = () => {
        if (this.retryTest && this.retryTest--) {
          return reject(new Error('Retry test error'));
        }
        const res = new TestResource(id);
        resolve(res);
      };

      if (this.acquireWait) setTimeout(doCreate, this.acquireWait);
      else doCreate();
    });
  }

  destroy(res) {
    return new Promise((resolve, reject) => {
      if (!(res instanceof TestResource)) {
        return reject(new Error('Invalid resource instance'));
      }
      if (res.destroyed) return reject(new Error('Resource already destroyed'));
      this.destroyed++;
      res.destroyed = true;
      resolve();
    });
  }

  reset(res) {
    return new Promise(resolve => {
      setTimeout(() => {
        res.resetCount++;
        resolve();
      }, this.resetWait);
    });
  }

  validate(resource) {
    return new Promise(resolve => {
      resource.validateCount++;
      resolve();
    });
  }
}

function TestResource(id) {
  this.id = id;
  this.resetCount = 0;
  this.validateCount = 0;
}

module.exports = TestFactory;
