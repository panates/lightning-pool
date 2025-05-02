import { PoolFactory } from 'lightning-pool';

/**
 * Generic class for handling creation of resources
 * for testing
 */
export class TestFactory implements PoolFactory<TestResource> {
  created: number;
  destroyed: number;
  max?: number;
  retryTest?: number;
  acquireWait?: number;
  resetWait?: number;

  constructor(opts: {
    create?: Function;
    destroy?: Function;
    reset?: Function;
    validate?: Function;
    max?: number;
    retryTest?: number;
    acquireWait?: number;
    resetWait?: number;
  }) {
    this.created = 0;
    this.destroyed = 0;
    this.max = opts && opts.max;
    this.retryTest = opts && opts.retryTest;
    this.acquireWait = (opts && opts.acquireWait) || 0;
    this.resetWait = (opts && opts.resetWait) || 0;
  }

  create() {
    return new Promise<TestResource>((resolve, reject) => {
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

  async destroy(res: TestResource) {
    if (!(res instanceof TestResource)) {
      throw new Error('Invalid resource instance');
    }
    if (res.destroyed) throw new Error('Resource already destroyed');
    this.destroyed++;
    res.destroyed = true;
  }

  reset(res: TestResource) {
    return new Promise<void>(resolve => {
      setTimeout(() => {
        res.resetCount++;
        resolve();
      }, this.resetWait);
    });
  }

  async validate(resource: TestResource) {
    resource.validateCount++;
    return true;
  }
}

export class TestResource {
  id: any;
  resetCount: number;
  validateCount: number;
  destroyed?: boolean;

  constructor(id) {
    this.id = id;
    this.resetCount = 0;
    this.validateCount = 0;
  }
}
