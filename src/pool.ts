import DoublyLinked from 'doublylinked';
import { EventEmitter } from 'events';
import promisify from 'putil-promisify';
import { AbortError } from './abort-error.js';
import {
  Callback,
  PoolConfiguration,
  PoolFactory,
  PoolState,
  ResourceState,
} from './definitions.js';
import { PoolOptions } from './pool-options.js';
import { PoolRequest } from './pool-request.js';
import { ResourceItem } from './resource-item.js';

export class Pool<T = any> extends EventEmitter {
  private readonly _options: PoolOptions;
  private readonly _factory: PoolFactory<T>;
  private _requestQueue: DoublyLinked<PoolRequest> = new DoublyLinked();
  private _allResources: Map<T, ResourceItem<T>> = new Map();
  private _acquiredResources: DoublyLinked<ResourceItem<T>> =
    new DoublyLinked();
  private _idleResources: DoublyLinked<ResourceItem<T>> = new DoublyLinked();
  private _creating = 0;
  private _requestsProcessing = 0;
  private _state = PoolState.IDLE;
  private _houseKeepTimer: any;
  private _closeWaitTimer: any;

  constructor(factory: PoolFactory<T>, config?: PoolConfiguration) {
    super();
    if (typeof factory !== 'object') {
      throw new TypeError('You must provide `factory` object');
    }

    if (typeof factory.create !== 'function') {
      throw new TypeError('factory.create must be a function');
    }

    if (typeof factory.destroy !== 'function') {
      throw new TypeError('factory.destroy must be a function');
    }

    if (factory.validate && typeof factory.validate !== 'function') {
      throw new TypeError('factory.validate can be a function');
    }

    if (factory.reset && typeof factory.reset !== 'function') {
      throw new TypeError('factory.reset can be a function');
    }

    const opts = (this._options = new PoolOptions(this));
    opts.on('change', (prop: string, val) => {
      if (prop === 'houseKeepInterval') this._setHouseKeep(val as number);
      if (prop === 'min' || prop === 'minIdle') this._ensureMin();
    });
    if (config) this.options.assign(config);
    this._factory = factory;
  }

  /**
   * Returns Pool options
   */
  get options(): PoolOptions {
    return this._options;
  }

  /**
   * Returns number of resources that are currently acquired
   */
  get acquired(): number {
    return this._acquiredResources.length;
  }

  /**
   * Returns number of unused resources in the pool
   */
  get available(): number {
    return this._idleResources.length;
  }

  /**
   * Returns number of resources currently creating
   */
  get creating(): number {
    return this._creating;
  }

  /**
   * Returns number of callers waiting to acquire a resource
   */
  get pending(): number {
    return this._requestQueue.length + this._requestsProcessing;
  }

  /**
   * Returns number of resources in the pool
   * regardless of whether they are idle or in use
   */
  get size(): number {
    return this._allResources.size;
  }

  /**
   * Returns state of the pool
   */
  get state(): PoolState {
    return this._state;
  }

  /**
   * Starts the pool and begins creating of resources, starts house keeping and any other internal logic.
   * Note: This method is not need to be called. Pool instance will automatically be started when acquire() method is called
   */
  start(): void {
    if (this._state === PoolState.STARTED) return;
    if (this._state >= PoolState.CLOSING) {
      throw new Error('Closed pool can not be started again');
    }
    this._state = PoolState.STARTED;
    this._setHouseKeep(this.options.houseKeepInterval);
    this._ensureMin();
    this.emit('start');
  }

  /**
   * Shuts down the pool and destroys all resources.
   */
  close(callback?: Callback): void;
  close(terminateWait: number, callback?: Callback): void;
  close(force: boolean, callback?: Callback): void;
  close(arg0?: any, arg1?: any): any {
    let terminateWait = Infinity;
    let callback: Callback;

    if (typeof arg0 === 'function') callback = arg0;
    else {
      terminateWait = typeof arg0 === 'number' ? arg0 : arg0 ? 0 : Infinity;
      callback = arg1;
    }
    if (!callback) {
      return promisify.fromCallback(cb => this.close(terminateWait, cb));
    }

    if (this._state === PoolState.CLOSED || this._state === PoolState.IDLE) {
      return callback();
    }

    if (this._state === PoolState.CLOSING) {
      this.once('close', callback);
      return;
    }

    this.emit('closing');
    if (this._houseKeepTimer) clearTimeout(this._houseKeepTimer);
    this._state = PoolState.CLOSING;
    this._requestQueue.forEach(t => t.stopTimout());
    this._requestQueue = new DoublyLinked();
    this._requestsProcessing = 0;

    if (terminateWait <= 0) {
      this._acquiredResources.forEach(t => this.destroy(t.resource));
    } else {
      const startTime = Date.now();
      this._closeWaitTimer = setInterval(() => {
        if (!this._allResources.size) {
          clearInterval(this._closeWaitTimer);
          this._closeWaitTimer = undefined;
          return;
        }
        if (Date.now() > startTime + terminateWait) {
          clearInterval(this._closeWaitTimer);
          this._closeWaitTimer = undefined;
          this._acquiredResources.forEach(t => this.release(t.resource));
          this.emit('terminate');
        }
      }, 50);
    }
    this._setHouseKeep(5);
    this.once('close', callback);
  }

  closeAsync(): Promise<void>;
  closeAsync(terminateWait: number): Promise<void>;
  closeAsync(force: boolean): Promise<void>;
  closeAsync(arg0?: any): Promise<void> {
    return promisify.fromCallback<void>(cb => this.close(arg0, cb));
  }

  /**
   * Acquires `resource` from the pool or create a new one
   */
  acquire(callback: Callback): void;
  acquire(factoryCreateOptions: Record<string, any>, callback: Callback): void;
  acquire(factoryCreateOptions?: Record<string, any>): Promise<T>;
  acquire(arg0?: any, arg1?: any): any {
    let callback: Callback | undefined;
    let factoryCreateOptions: Record<string, any> | undefined;
    if (typeof arg0 === 'function') {
      callback = arg0;
    } else if (typeof arg0 === 'object') {
      factoryCreateOptions = arg0;
      if (typeof arg1 === 'function') callback = arg1;
    }

    if (!callback) return promisify.fromCallback<T>(cb => this.acquire(cb));
    try {
      this.start();
    } catch (e: any) {
      return callback(e);
    }
    if (this.options.maxQueue && this.pending >= this.options.maxQueue) {
      return callback(new Error('Pool queue is full'));
    }
    this._requestQueue.push(
      new PoolRequest(this, callback, factoryCreateOptions),
    );
    this._processNextRequest();
  }

  /**
   * Releases an allocated `resource` and let it back to pool.
   */
  release(resource: T, callback?: Callback): void {
    const item = this._allResources.get(resource);
    if (item && item.state !== ResourceState.IDLE) {
      this._itemSetIdle(item, callback);
    }
    this._processNextRequest();
  }

  /**
   * Async version of release().
   */
  releaseAsync(resource: T): Promise<void> {
    return promisify.fromCallback<void>(cb => this.release(resource, cb));
  }

  /**
   * Releases, destroys and removes any `resource` from `Pool`.
   */
  destroy(resource: T, callback?: Callback): any {
    try {
      const item = this._allResources.get(resource);
      if (item) this._itemDestroy(item, callback);
      else if (callback) callback();
    } finally {
      this._processNextRequest();
    }
  }

  /**
   * Async version of destroy().
   */
  destroyAsync(resource: T): Promise<void> {
    return promisify.fromCallback<void>(cb => this.destroy(resource, cb));
  }

  /**
   * Returns if a `resource` has been acquired from the pool and not yet released or destroyed.
   */
  isAcquired(resource: T): boolean {
    const item = this._allResources.get(resource);
    return !!(item && item.acquiredNode);
  }

  /**
   * Returns if the pool contains a `resource`
   */
  includes(resource: T) {
    return this._allResources.has(resource);
  }

  private _processNextRequest(): void {
    if (
      this._state !== PoolState.STARTED ||
      this._requestsProcessing >= this.options.max - this.acquired
    ) {
      return;
    }
    const request = this._requestQueue.shift();
    if (!request) return;

    this._requestsProcessing++;
    const handleCallback = (err?: unknown, item?: ResourceItem<T>) => {
      this._requestsProcessing--;
      request.stopTimout();
      try {
        if (item) {
          /* istanbul ignore next : Hard to simulate */
          if (this._state !== PoolState.STARTED) {
            this._itemDestroy(item);
            return;
          }
          this._itemSetAcquired(item);
          this._ensureMin();
          request.callback(undefined, item.resource);
          this.emit('acquire', item.resource);
        } else request.callback(err);
      } catch (ignored) {
        // ignored
      }
      this._processNextRequest();
    };

    const item = this._idleResources.shift();
    if (item) {
      /* Validate resource */
      if (this.options.validation && this._factory.validate) {
        this._itemValidate(item, (err?: unknown) => {
          /* Destroy resource on validation error */
          if (err) {
            this._itemDestroy(item);
            this.emit('validate-error', err, item.resource);
            this._requestsProcessing--;
            this._requestQueue.unshift(request);
            this._processNextRequest();
          } else handleCallback(undefined, item);
        });
        return;
      }
      return handleCallback(undefined, item);
    }
    /** There is no idle resource. We need to create new one **/
    this._createResource(request, handleCallback);
  }

  emit(event: string | symbol, ...args: any[]): boolean {
    // Prevents errors while calling emit()
    try {
      return super.emit(event, ...args);
    } catch (e) {
      return true;
    }
  }

  /**
   * Creates new resource
   */
  private _createResource(request?: PoolRequest, callback?: Callback): void {
    const maxRetries = this.options.acquireMaxRetries;
    let tries = 0;
    this._creating++;

    const handleCallback = (err?: Error, obj?: T) => {
      if (request && request.timedOut) return;
      if (err || !obj) {
        tries++;
        this.emit('error', err, {
          requestTime: request ? request.created : Date.now(),
          tries,
          maxRetries: this.options.acquireMaxRetries,
        });
        if (err instanceof AbortError || tries >= maxRetries) {
          this._creating--;
          return callback && callback(err);
        }
        return setTimeout(() => tryCreate(), this.options.acquireRetryWait);
      }

      this._creating--;
      if (this._allResources.has(obj)) {
        return (
          callback &&
          callback(new Error('Factory error. Resource already in pool'))
        );
      }

      const item = new ResourceItem(obj);
      this._itemSetIdle(item);
      this._allResources.set(obj, item);
      if (callback) callback(undefined, item);
      this.emit('create', obj);
    };

    const tryCreate = () => {
      try {
        const o = this._factory.create({ tries, maxRetries }, request?.options);
        /* istanbul ignore next */
        if (!o) {
          return handleCallback(new AbortError('Factory returned no resource'));
        }
        promisify.await(o, handleCallback);
      } catch (e: any) {
        handleCallback(e);
      }
    };

    tryCreate();
  }

  private _setHouseKeep(ms: number) {
    if (this._houseKeepTimer) clearInterval(this._houseKeepTimer);
    this._houseKeepTimer = undefined;
    if (
      (ms > 0 && this.state === PoolState.STARTED) ||
      this.state === PoolState.CLOSING
    ) {
      this._houseKeepTimer = setInterval(() => this._houseKeep(), ms);
    }
  }

  private _houseKeep() {
    const isClosing = this._state === PoolState.CLOSING;
    const now = Date.now();
    let m = this._allResources.size - this.options.min;
    let n = this._idleResources.length - this.options.minIdle;
    if (isClosing || (m > 0 && n > 0)) {
      this._idleResources.every((item: ResourceItem<T>): boolean => {
        if (isClosing || item.idleTime + this.options.idleTimeoutMillis < now) {
          this._itemDestroy(item);
          return isClosing || !!(--n && --m);
        }
        return false;
      });
    }
    if (isClosing) {
      /* Check again 5 ms later */
      if (this._allResources.size) return;
      clearInterval(this._houseKeepTimer);
      this._state = PoolState.CLOSED;
      this._requestsProcessing = 0;
      this.emit('close');
    }
  }

  private _ensureMin(): void {
    process.nextTick(() => {
      let k =
        Math.max(
          this.options.min - this._allResources.size,
          this.options.minIdle - this._idleResources.length,
        ) - this.creating;
      while (k-- > 0) this._createResource();
    });
  }

  private _itemSetAcquired(item: ResourceItem<T>): void {
    if (item.state !== ResourceState.ACQUIRED) {
      this._itemDetach(item);
      item.state = ResourceState.ACQUIRED;
      this._acquiredResources.push(item);
      item.acquiredNode = this._acquiredResources.tail;
    }
  }

  private _itemDetach(item: ResourceItem<T>): void {
    switch (item.state) {
      case ResourceState.IDLE:
        item.idleTime = 0;
        /* istanbul ignore next*/
        if (item.idleNode) item.idleNode.remove();
        item.idleNode = undefined;
        break;
      case ResourceState.ACQUIRED:
      case ResourceState.VALIDATION:
        /* istanbul ignore next*/
        if (item.acquiredNode) item.acquiredNode.remove();
        item.acquiredNode = undefined;
        break;
      default:
        break;
    }
  }

  private _itemSetIdle(item: ResourceItem<T>, callback?: Callback) {
    const isAcquired = item.state === ResourceState.ACQUIRED;

    const handleCallback = (err?: Error) => {
      if (err) return this._itemDestroy(item, callback);
      this._itemDetach(item);
      item.idleTime = Date.now();
      item.state = ResourceState.IDLE;

      if (this.options.fifo) {
        this._idleResources.push(item);
        item.idleNode = this._idleResources.tail;
      } else {
        this._idleResources.unshift(item);
        item.idleNode = this._idleResources.head;
      }
      if (isAcquired) this.emit('return', item.resource);
      if (callback) callback();
      // noinspection JSAccessibilityCheck
      this._processNextRequest();
    };

    if (isAcquired && this._factory.reset) {
      try {
        const o = this._factory.reset(item.resource);
        promisify.await(o, handleCallback);
      } catch (e: any) {
        handleCallback(e);
      }
    } else handleCallback();
  }

  private _itemDestroy(item: ResourceItem<T>, callback?: Callback) {
    this._itemDetach(item);

    const handleCallback = (err?: Error) => {
      if (err) {
        this.emit('destroy-error', err, item.resource);
        /* istanbul ignore next */
        return callback && callback(err);
      }
      this.emit('destroy', item.resource);
      item.destroyed = true;
      if (callback) callback();
    };

    try {
      this._allResources.delete(item.resource);
      this._processNextRequest();
      const o = this._factory.destroy(item.resource);
      promisify.await(o, handleCallback);
    } catch (e: any) {
      handleCallback(e);
    }
  }

  private _itemValidate(item: ResourceItem<T>, callback?: Callback) {
    item.state = ResourceState.VALIDATION;
    try {
      const o = this._factory.validate?.(item.resource);
      // @ts-ignore
      promisify.await(o, callback);
    } catch (e: any) {
      if (callback) callback(e);
    }
  }
}
