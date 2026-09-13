import DoublyLinked from 'doublylinked';
import { EventEmitter } from 'events';
import promisify from 'putil-promisify';
import { AbortError } from './abort-error.js';
import { PoolState, ResourceState } from './constants.js';
import { PoolOptions } from './pool-options.js';
import { PoolRequest } from './pool-request.js';
import { ResourceItem } from './resource-item.js';
import type { Callback, PoolConfiguration, PoolFactory } from './types.js';

/**
 * Like putil-promisify's `promisify.await()`, but attaches both handlers to
 * the original promise via `.then(onFulfilled, onRejected)` instead of
 * chaining a `.catch()` off a second promise `.then()` returns - one fewer
 * Promise allocated per call on a path (create/destroy/reset/validate) that
 * every acquire/release goes through. Mirrors promisify.await's own loose
 * `(x: any, callback: (error?: Error, value?: T) => void)` signature.
 */
function awaitResult<T>(
  value: unknown,
  callback?: (error?: Error, value?: T) => void,
): void {
  if (value && typeof (value as any).then === 'function') {
    (value as Promise<T>).then(
      (v: T) => callback && callback(undefined, v),
      (e: unknown) => callback && callback(e as Error),
    );
  } else if (callback) callback(undefined, value as T);
}

/**
 * A generic resource pool: acquires, reuses, and (when idle too long or on
 * validation failure) discards resources created by a `PoolFactory`.
 *
 * @typeParam T - The resource type this pool manages (e.g. a DB connection).
 */
export class Pool<T = any> extends EventEmitter {
  private readonly _options: PoolOptions;
  private readonly _factory: PoolFactory<T>;
  private _allResources: Map<T, ResourceItem<T>> = new Map();
  private _requestQueue: DoublyLinked<PoolRequest> = new DoublyLinked();
  private _acquiredResources: DoublyLinked<ResourceItem<T>> =
    new DoublyLinked();
  private _idleResources: DoublyLinked<ResourceItem<T>> = new DoublyLinked();
  private _creating = 0;
  private _requestsProcessing = 0;
  private _state = PoolState.IDLE;
  private _houseKeepTimer: any;
  private _closeWaitTimer: any;

  /**
   * @param factory - Creates, destroys, and (optionally) resets/validates resources.
   * @param config - Initial options; every option can also be changed later via `pool.options`.
   * @throws \{@link TypeError\} If `factory` isn't an object, or `create`/`destroy` aren't
   * functions, or `reset`/`validate` are present but aren't functions.
   */
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
    if (config) this.options.assign(config);
    opts.on('change', (prop: string, val) => {
      if (prop === 'houseKeepInterval') this._setHouseKeep(val as number);
      if (prop === 'min' || prop === 'minIdle') this._ensureMin();
    });
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
   * Starts the pool and begins creating of resources, starts the housekeeper and any other internal logic.
   * Note: This method is not needed to be called. Pool instance will automatically be started when acquire() method is called
   *
   * @throws \{@link Error\} If the pool is currently `CLOSING`.
   */
  start(): void {
    if (this._state === PoolState.STARTED) return;
    if (this._state === PoolState.CLOSING) {
      throw new Error(`Can't start the pool while it is closing`);
    }
    if (this._allResources.size) this._allResources = new Map();
    if (this._requestQueue.length) this._requestQueue = new DoublyLinked();
    if (this._acquiredResources.length)
      this._acquiredResources = new DoublyLinked();
    if (this._idleResources.length) this._idleResources = new DoublyLinked();
    this._creating = 0;
    this._requestsProcessing = 0;
    this._state = PoolState.STARTED;
    this._setHouseKeep(this.options.houseKeepInterval);
    this._ensureMin();
    this.emit('start');
  }

  /**
   * Shuts down the pool and destroys all resources. Any `acquire()` call
   * still queued at the time this is invoked is rejected with an error.
   *
   * @returns A `Promise` that resolves once fully closed (only when no `callback` is given).
   */
  close(): Promise<void>;
  /** @param callback - Called once the pool has fully closed. */
  close(callback: Callback): void;
  /**
   * @param terminateWait - How long, in milliseconds, to wait for acquired
   * resources to be released before forcibly destroying them anyway. Waits
   * indefinitely if omitted.
   * @param callback - Called once the pool has fully closed; if omitted, returns a `Promise` instead.
   */
  close(terminateWait?: number, callback?: Callback): void;
  /**
   * @param force - `true` is shorthand for `terminateWait: 0` (destroy
   * acquired resources immediately, without waiting); `false` is shorthand
   * for waiting indefinitely.
   * @param callback - Called once the pool has fully closed; if omitted, returns a `Promise` instead.
   */
  close(force?: boolean, callback?: Callback): void;
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
    const closingError = new Error('Pool is closing');
    this._requestQueue.forEach(t => {
      t.stopTimout();
      try {
        t.callback(closingError);
      } catch {
        // ignored
      }
    });
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
          this._allResources.clear();
          this._closeWaitTimer = undefined;
          this._acquiredResources.forEach(t => this.release(t.resource));
          this.emit('terminate');
        }
      }, 50);
    }
    this._setHouseKeep(5);
    this.once('close', callback);
  }

  /** Promise-returning equivalent of `close()` - see it for what each overload does. */
  closeAsync(): Promise<void>;
  closeAsync(terminateWait?: number): Promise<void>;
  closeAsync(force?: boolean): Promise<void>;
  closeAsync(arg0?: any): Promise<void> {
    return promisify.fromCallback<void>(cb => this.close(arg0, cb));
  }

  /**
   * Acquires a resource from the pool, or creates a new one if none is idle.
   * Starts the pool (see `start()`) if it hasn't been already.
   *
   * @returns A `Promise` resolving to the resource (only when no `callback` is given).
   * @throws \{@link Error\} (via the `Promise` rejection or `callback`) If the pool is
   * `CLOSING`, if `maxQueue` is exceeded, or if resource creation ultimately fails.
   */
  acquire(): Promise<T>;
  /** @param callback - Called with the acquired resource, or an error. */
  acquire(callback: Callback): void;
  acquire(callback?: Callback): any {
    if (!callback) return promisify.fromCallback<T>(cb => this.acquire(cb));
    try {
      this.start();
    } catch (e: unknown) {
      return callback(e);
    }
    if (this.options.maxQueue && this.pending >= this.options.maxQueue) {
      return callback(new Error('Pool queue is full'));
    }
    this._requestQueue.push(new PoolRequest(this, callback));
    this._processNextRequest();
  }

  /**
   * Releases a previously-acquired `resource` back to the pool so it can be
   * reused (running `factory.reset()` first, if provided).
   *
   * @param resource - A previously acquired resource. A no-op (aside from invoking
   * `callback`) if it isn't currently acquired or isn't in this pool.
   * @param callback - Called once released (and `reset()`, if any, has finished).
   * @remarks Returns immediately (`undefined`) regardless of `callback` -
   * it does not wait for `reset()` to finish. Use `releaseAsync()` (or pass
   * `callback`) to know when the release has actually completed.
   */
  release(resource: T, callback?: Callback): void {
    const item = this._allResources.get(resource);
    if (item && item.state !== ResourceState.IDLE) {
      this._itemSetIdle(item, callback);
    } else if (callback) callback();
    this._processNextRequest();
  }

  /**
   * Promise-returning equivalent of `release()`.
   *
   * @param resource - A previously acquired resource.
   * @returns A `Promise` that resolves once released (and `reset()`, if any, has finished).
   */
  releaseAsync(resource: T): Promise<void> {
    return promisify.fromCallback<void>(cb => this.release(resource, cb));
  }

  /**
   * Releases, destroys, and removes a `resource` from the pool entirely -
   * it will not be reused (running `factory.destroy()`).
   *
   * @param resource - A previously acquired (or idle) resource. A no-op
   * (aside from invoking `callback`) if it isn't in this pool.
   * @param callback - Called once destroyed (or on `factory.destroy()` failure).
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
   * Promise-returning equivalent of `destroy()`.
   *
   * @param resource - A previously acquired (or idle) resource.
   * @returns A `Promise` that resolves once destroyed.
   */
  destroyAsync(resource: T): Promise<void> {
    return promisify.fromCallback<void>(cb => this.destroy(resource, cb));
  }

  /**
   * Returns if a `resource` has been acquired from the pool and not yet released or destroyed.
   *
   * @param resource - The resource to check.
   */
  isAcquired(resource: T): boolean {
    const item = this._allResources.get(resource);
    return !!(item && item.acquiredNode);
  }

  /**
   * Returns if the pool contains a `resource` - acquired, idle, or being
   * validated (not yet destroyed).
   *
   * @param resource - The resource to check.
   */
  includes(resource: T) {
    return this._allResources.has(resource);
  }

  /**
   * Serves the next queued `acquire()` request, if any and if capacity
   * allows: from an idle resource (validating it first if enabled), or by
   * creating a new one. Called after anything that could free up capacity
   * or add a request (release, destroy, acquire, options change).
   */
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
          if (request.timedOut) {
            /* Request already failed with a timeout error; return the
             * resource to the idle pool instead of handing it to an
             * abandoned caller. */
            this._itemSetIdle(item);
            return;
          }
          this._itemSetAcquired(item);
          this._ensureMin();
          request.callback(undefined, item.resource);
          this.emit('acquire', item.resource);
        } else if (!request.timedOut) request.callback(err);
      } catch {
        // ignored
      }
      this._processNextRequest();
    };

    const item = this._idleResources.shift();
    if (item) {
      /* Validate resource */
      if (this.options.validation && this._factory.validate) {
        this._itemValidate(item, (err?: unknown, result?: boolean) => {
          /* Destroy resource on validation error */
          if (err || result === false) {
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

  /**
   * Overrides `EventEmitter.emit()`: identical, except an error thrown by a
   * listener is swallowed instead of propagating out of `emit()` - a
   * misbehaving listener on, say, `'acquire'` can't take down the internal
   * code path that just emitted it.
   *
   * @param event - Event name. See the class-level events list in `doc/API.md`
   * (`start`, `closing`, `close`, `terminate`, `create`, `error`, `acquire`,
   * `return`, `destroy`, `destroy-error`, `validate-error`, `request-timeout`).
   * @param args - Arguments passed to each listener.
   * @returns `true` if the event had listeners, `false` otherwise (same as
   * `EventEmitter.emit()`); also `true` if a listener threw.
   */
  emit(event: string | symbol, ...args: any[]): boolean {
    // Prevents errors while calling emit()
    try {
      return super.emit(event, ...args);
    } catch {
      return true;
    }
  }

  /**
   * Creates a new resource via `factory.create()`, retrying on failure up
   * to `acquireMaxRetries` times (waiting `acquireRetryWait` between
   * attempts), unless `request` has already timed out or the factory threw
   * an `AbortError`. On success, adds the resource to the pool as idle.
   *
   * @param request - The acquire request this creation is for, if any (`_ensureMin()`
   * creates resources with no associated request).
   * @param callback - Called with the new `ResourceItem`, or the final error.
   */
  private _createResource(request?: PoolRequest, callback?: Callback): void {
    const maxRetries = this.options.acquireMaxRetries;
    let tries = 0;
    this._creating++;

    const handleCallback = (err?: Error, obj?: T) => {
      if (err || !obj) {
        tries++;
        this.emit('error', err, {
          requestTime: request ? request.created : Date.now(),
          tries,
          maxRetries: this.options.acquireMaxRetries,
        });
        /* Stop retrying for a request that already timed out */
        const abandoned = !!(request && request.timedOut);
        if (abandoned || err instanceof AbortError || tries >= maxRetries) {
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
        const o = this._factory.create({ tries, maxRetries });
        /* istanbul ignore next */
        if (!o) {
          return handleCallback(new AbortError('Factory returned no resource'));
        }
        awaitResult(o, handleCallback);
      } catch (e: any) {
        handleCallback(e);
      }
    };

    tryCreate();
  }

  /**
   * (Re)starts the housekeeper timer at interval `ms`, or leaves it stopped
   * if the pool isn't `STARTED`/`CLOSING`. Called on `start()`, whenever
   * `houseKeepInterval` changes, and (with a short fixed interval) while
   * closing.
   */
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

  /**
   * One housekeeping pass: destroys idle resources past `idleTimeoutMillis`
   * (as long as doing so doesn't drop below `min`/`minIdle`), or - while
   * `CLOSING` - destroys every idle resource unconditionally and, once no
   * resources remain at all, finishes the transition to `CLOSED`.
   */
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
      if (this._allResources.size || this._creating) return;
      clearInterval(this._houseKeepTimer);
      this._state = PoolState.CLOSED;
      this._requestsProcessing = 0;
      this.emit('close');
    }
  }

  /**
   * Schedules (via `process.nextTick`) creating however many resources are
   * needed to satisfy `min`/`minIdle`, accounting for creations already in
   * flight. Called after start, after every successful acquire, and
   * whenever `min`/`minIdle` change.
   */
  private _ensureMin(): void {
    // Common case (min/minIdle both unset): the scheduled tick below would
    // always compute k <= 0 and do nothing, so skip the nextTick() and its
    // closure allocation entirely rather than paying for a wasted microtask
    // on every single acquire().
    if (this.options.min <= 0 && this.options.minIdle <= 0) return;
    process.nextTick(() => {
      let k =
        Math.max(
          this.options.min - this._allResources.size,
          this.options.minIdle - this._idleResources.length,
        ) - this.creating;
      while (k-- > 0) this._createResource();
    });
  }

  /** Moves `item` into the acquired list, detaching it from wherever it was first. */
  private _itemSetAcquired(item: ResourceItem<T>): void {
    if (item.state !== ResourceState.ACQUIRED) {
      this._itemDetach(item);
      item.state = ResourceState.ACQUIRED;
      this._acquiredResources.push(item);
      item.acquiredNode = this._acquiredResources.tail;
    }
  }

  /** Removes `item` from whichever tracked list (idle/acquired) its current `state` puts it in. */
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

  /**
   * Runs `factory.reset()` (if the item was acquired and a `reset` is
   * provided), then moves `item` to the idle list (FIFO or LIFO end per
   * `fifo`) and processes the next queued request. Destroys the item
   * instead if `reset()` fails.
   */
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
        awaitResult(o, handleCallback);
      } catch (e: any) {
        handleCallback(e);
      }
    } else handleCallback();
  }

  /** Detaches `item`, runs `factory.destroy()`, and removes it from the pool entirely. */
  private _itemDestroy(item: ResourceItem<T>, callback?: Callback) {
    this._itemDetach(item);

    const handleCallback = (err?: Error) => {
      item.destroyed = true;
      this._allResources.delete(item.resource);
      if (err) this.emit('destroy-error', err, item.resource);
      else this.emit('destroy', item.resource);
      if (callback) callback(err);
    };

    try {
      const o = this._factory.destroy(item.resource);
      awaitResult(o, handleCallback);
    } catch (e: any) {
      handleCallback(e);
    } finally {
      this._processNextRequest();
    }
  }

  /** Runs `factory.validate()` on `item` before it's handed out to a caller. */
  private _itemValidate(item: ResourceItem<T>, callback?: Callback) {
    item.state = ResourceState.VALIDATION;
    try {
      const o = this._factory.validate?.(item.resource);
      awaitResult(o, callback);
    } catch (e: any) {
      callback?.(e);
    }
  }
}
