/* lightning-pool
 ------------------------
 (c) 2017-present Panates
 This file may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/lightning-pool/
 */
'use strict';

/**
 * Module dependencies.
 * @private
 */
const EventEmitter = require('events').EventEmitter;
const promisify = require('putil-promisify');
const DoublyLinked = require('doublylinked');
const PoolOptions = require('./PoolOptions');
const PoolRequest = require('./PoolRequest');
const ResourceInfo = require('./ResourceInfo');
const AbortError = require('./AbortError');

const PoolState = {
  IDLE: 0,
  STARTED: 1,
  CLOSING: 2,
  CLOSED: 3
};

class Pool extends EventEmitter {

  /**
   *
   * @param {Object} factory
   * @param {Function} factory.create
   * @param {Function} factory.destroy
   * @param {Function} [factory.validate]
   * @param {Function} [factory.reset]
   * @param {Object} [options]
   * @constructor
   */
  constructor(factory, options) {
    super();
    if (typeof factory !== 'object')
      throw new TypeError('You must provide `factory` object');

    if (typeof factory.create !== 'function')
      throw new TypeError('factory.create must be a function');

    if (typeof factory.destroy !== 'function')
      throw new TypeError('factory.destroy must be a function');

    if (factory.validate && typeof factory.validate !== 'function')
      throw new TypeError('factory.validate can be a function');

    if (factory.reset && typeof factory.reset !== 'function')
      throw new TypeError('factory.reset can be a function');

    const opts = this.options = new PoolOptions(this);
    options = options || {};
    opts.acquireMaxRetries = options.acquireMaxRetries;
    opts.acquireRetryWait = options.acquireRetryWait;
    opts.acquireTimeoutMillis = options.acquireTimeoutMillis;
    opts.fifo = options.fifo;
    opts.idleTimeoutMillis = options.idleTimeoutMillis;
    opts.houseKeepInterval = options.houseKeepInterval;
    opts.min = options.min;
    opts.minIdle = options.minIdle;
    opts.max = options.max;
    opts.maxQueue = options.maxQueue;
    opts.resetOnReturn = options.resetOnReturn;
    opts.validation = options.validation;

    this._factory = factory;
    this._requestQueue = new DoublyLinked();
    this._allResources = new Map();  // List for all info objects
    this._acquiredResources = new DoublyLinked();  // List for acquired info objects
    this._idleResources = new DoublyLinked();
    this._creating = 0;
    this._requestsProcessing = 0;
    this._state = PoolState.IDLE;
  }

  /**
   * Returns number of resources that are currently acquired
   *
   * @returns {number}
   */
  get acquired() {
    return this._acquiredResources.length;
  }

  /**
   * Returns number of unused resources in the pool
   *
   * @returns {number}
   */
  get available() {
    return this._idleResources.length;
  }

  /**
   * Returns number of resources currently creating
   *
   * @returns {number}
   */
  get creating() {
    return this._creating;
  }

  /**
   * Returns number of callers waiting to acquire a resource
   *
   * @returns {number}
   */
  get pending() {
    return this._requestQueue.length + this._requestsProcessing;
  }

  /**
   * Returns number of resources in the pool
   * regardless of whether they are idle or in use
   *
   * @returns {number}
   */
  get size() {
    return this._allResources.size;
  }

  /**
   * Returns state of the pool
   * @returns {PoolState}
   */
  get state() {
    return this._state;
  }

  /**
   * Acquires `resource` from the pool or create a new one
   *
   * @param {Function} [callback]
   * @returns {Promise|Undefined}
   */
  acquire(callback) {
    if (!callback)
      return promisify.fromCallback(cb => this.acquire(cb));
    try {
      this.start();
    } catch (e) {
      return callback(e);
    }
    /* istanbul ignore next */
    if (this.state !== PoolState.STARTED)
      return callback(new Error('Pool closed'));
    if (this.options.maxQueue && this.pending >= this.options.maxQueue)
      callback(new Error('Pool queue is full'));
    this._requestQueue.push(new PoolRequest(this, callback));
    this._acquireNext();
  }

  /**
   * Returns if a `resource` has been acquired from the pool and not yet released or destroyed.
   *
   * @param {*} resource
   * @return {boolean}
   */
  isAcquired(resource) {
    const rinf = this._allResources.get(resource);
    return !!(rinf && rinf._acquiredNode);
  }

  /**
   * Returns if the pool contains a `resource`
   *
   * @param {*} resource
   * @return {boolean}
   */
  includes(resource) {
    const rinf = this._allResources.get(resource);
    return !!rinf;
  }

  /**
   * Releases an allocated `resource` and let it back to pool.
   *
   * @param {*} resource
   * @param {Function} [callback]
   * @return {Promise}
   */
  release(resource, callback) {
    if (!callback)
      return promisify.fromCallback(cb => this.release(resource, cb));

    try {
      const rinf = this._allResources.get(resource);
      if (rinf && !rinf.isIdle)
        rinf.setIdle(callback);
    } catch (e) {
      /* istanbul ignore next */
      try {
        callback(e);
      } catch (ignored) {
      }
    }
    this._acquireNext();

  }

  /**
   * Releases, destroys and removes any `resource` from `Pool`.
   *
   * @param {*} resource
   * @return {undefined}
   */
  destroy(resource) {
    try {
      const rinf = this._allResources.get(resource);
      if (!rinf)
        return;
      rinf.destroy();
    } finally {
      this._acquireNext();
    }
  }

  /**
   * Starts the pool and begins creating of resources, starts house keeping and any other internal logic.
   * Note: This method is not need to be called. Pool instance will automatically be started when acquire() method is called
   *
   * @return {undefined}
   */
  start() {
    if (this._state >= PoolState.CLOSING)
      throw new Error('Closed pool can not be started again');
    if (this._state === PoolState.STARTED)
      return;
    this._state = PoolState.STARTED;
    this._setHouseKeep();
    this._ensureMin();
    this.emitSafe('start');
  }

  /**
   * Shuts down the pool and destroys all resources.
   *
   * @param {Boolean} [force]
   * @param {Function} [callback]
   * @return {Promise|undefined}
   */
  close(force, callback) {
    if (typeof force === 'function') {
      callback = force;
      force = false;
    }
    if (!callback)
      return promisify.fromCallback(cb => this.close(force, cb));
    if (this._state !== PoolState.STARTED)
      return callback();
    this._state = PoolState.CLOSING;
    this._requestQueue.forEach(t => t.cancel());
    if (force)
      this._acquiredResources.forEach(t => this.release(t.resource));

    this._requestQueue = new DoublyLinked();
    this._requestsProcessing = 0;
    this.emitSafe('closing');
    this.once('close', callback);
    this._houseKeep();
  }

  /**
   *
   * @protected
   */
  _acquireNext() {
    if (this._state !== PoolState.STARTED ||
        this._requestsProcessing >= this.options.max - this.acquired)
      return;
    const request = this._requestQueue.shift();
    if (!request)
      return;

    this._requestsProcessing++;
    const doCallback = (err, rinf) => {
      this._requestsProcessing--;
      request.cancel();
      try {
        if (rinf) {
          /* istanbul ignore next : Hard to simulate */
          if (this._state !== PoolState.STARTED) {
            rinf.destroy();
            return;
          }
          rinf.setAcquired();
          this._ensureMin();
          request.callback(null, rinf.resource);
          this.emitSafe('acquire', rinf.resource);
        } else request.callback(err);
      } catch (e) {
        //
      }
      this._acquireNext();
    };

    const rinf = this._idleResources.shift();
    if (rinf) {
      rinf.setAcquired();
      /* Validate resource */
      if (this.options.validation && this._factory.validate) {
        return rinf.validate((err) => {
          /* Destroy resource on validation error */
          if (err) {
            rinf.destroy();
            this.emitSafe('validate-error', err, rinf.resource);
            this._requestsProcessing--;
            this._requestQueue.unshift(request);
            this._acquireNext();
          } else doCallback(err, rinf);
        });
      }
      return doCallback(null, rinf);
    }
    /** There is no idle resource. We need to create new one **/
    this._createObject(request, doCallback);
  }

  /**
   * Creates new resource object
   * @param {Object} request
   * @param {Function} [callback]
   * @protected
   */
  _createObject(request, callback) {
    const maxRetries = this.options.acquireMaxRetries;
    let tries = 0;
    this._creating++;

    const handleCallback = (err, obj) => {
      if (request.timedOut)
        return;
      if (err) {
        tries++;
        this.emitSafe('error', err,
            {
              requestTime: request.created,
              tries: tries,
              maxRetries: this.options.acquireMaxRetries
            });
        if (err instanceof AbortError || tries >= maxRetries) {
          this._creating--;
          if (err instanceof AbortError)
            err = err.nastedError || err;
          return callback && callback(err);
        }
        return setTimeout(() => tryCreate(), this.options.acquireRetryWait);
      }

      this._creating--;
      if (this._allResources.has(obj))
        return callback &&
            callback(new Error('Factory error. Resource already in pool'));

      const rinf = new ResourceInfo(this, obj);
      rinf.setIdle();
      this._allResources.set(obj, rinf);
      if (callback)
        callback(null, rinf);
      this.emitSafe('create', obj);
    };

    const tryCreate = () => {
      try {
        const o = this._factory.create({
          tries,
          maxRetries
        });
        /* istanbul ignore next */
        if (!o)
          return handleCallback(new AbortError('Factory returned no resource'));
        if (promisify.isPromise(o))
          o.then(obj => handleCallback(null, obj)).catch(handleCallback);
        else handleCallback(null, o);
      } catch (e) {
        handleCallback(e);
      }
    };

    tryCreate();
  }

  /**
   * Prevents errors while calling emit()
   */
  emitSafe() {
    try {
      this.emit.apply(this, arguments);
    } catch (e) {
      // Do nothing
    }
  }

  /**
   *
   * @protected
   */
  _setHouseKeep() {
    clearTimeout(this._houseKeepHandle);
    this._houseKeepHandle = null;
    if (this._state !== PoolState.STARTED || !this.options.houseKeepInterval)
      return;
    this._houseKeepHandle = setTimeout(() => {
      this._houseKeep();
      this._setHouseKeep();
    }, this.options.houseKeepInterval);
  };

  /**
   *
   * @protected
   */
  _houseKeep() {
    clearTimeout(this._houseKeepHandle);
    const isClosing = this._state === PoolState.CLOSING;
    const now = Date.now();
    let m = this._allResources.size - this.options.min;
    let n = this._idleResources.length - this.options.minIdle;
    if (isClosing || (m > 0 && n > 0)) {
      this._idleResources.every(t => {
        if (isClosing ||
            t.iddleTime + this.options.idleTimeoutMillis < now) {
          t.destroy();
          return isClosing || ((--n) && (--m));
        }
      });
    }
    if (isClosing) {
      if (this._allResources.size)
      /* Check again 5 ms later */
        setTimeout(() => this._houseKeep(), 5);
      else {
        this._state = PoolState.CLOSED;
        this._requestsProcessing = 0;
        this.emitSafe('close');
      }
    }
  }

  /**
   *
   * @protected
   */
  _ensureMin() {
    process.nextTick(() => {
      let k = Math.max(this.options.min - this._allResources.size,
          this.options.minIdle - this._idleResources.length);
      while (k-- > 0)
        this._createObject(new PoolRequest(this));
    });
  }

}

Pool.PoolState = PoolState;

/**
 * Expose `Pool`.
 */

module.exports = Pool;
