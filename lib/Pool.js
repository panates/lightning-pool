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

const PoolState = {
  IDLE: 0,
  STARTED: 1,
  STOPPING: 2,
  STOPPED: 3
};

/**
 * Expose `Pool`.
 */

module.exports = Pool;

/**
 *
 * @param {Object} factory
 * @param {Object} [options]
 * @constructor
 */
function Pool(factory, options) {
  EventEmitter.apply(this);
  if (typeof factory !== 'object')
    throw new TypeError('`factory` object required');

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

Pool.prototype = {

  /**
   * Returns number of resources that are currently acquired
   *
   * @returns {number}
   */
  get acquired() {
    return this._acquiredResources.length;
  },

  /**
   * Returns number of unused resources in the pool
   *
   * @returns {number}
   */
  get available() {
    return this._idleResources.length;
  },

  /**
   * Returns number of resources currently creating
   *
   * @returns {number}
   */
  get creating() {
    return this._creating;
  },

  /**
   * Returns number of callers waiting to acquire a resource
   *
   * @returns {number}
   */
  get pending() {
    return this._requestQueue.length + this._requestsProcessing;
  },

  /**
   * Returns number of resources in the pool
   * regardless of whether they are idle or in use
   *
   * @returns {number}
   */
  get size() {
    return this._allResources.size;
  },

  /**
   * Returns state of the pool
   * @returns {PoolState}
   */
  get state() {
    return this._state;
  }
};

Object.setPrototypeOf(Pool.prototype, EventEmitter.prototype);
Pool.prototype.constructor = Pool;

/**
 * Acquires `resource` from the pool or create a new one
 *
 * @param {Function} callback
 * @returns {Promise|Undefined}
 */
Pool.prototype.acquire = function(callback) {
  const self = this;
  if (!callback)
    return promisify.fromCallback(function(cb) {
      self.acquire(cb);
    });
  try {
    self.start();
  } catch (e) {
    return callback(e);
  }
  if (self.options.maxQueue && self.pending >= self.options.maxQueue)
    callback(new Error('Pool queue is full'));
  self._requestQueue.push(new PoolRequest(self, callback));
  self._acquireNext();
};

/**
 * Returns if a `resource` has been acquired from the pool and not yet released or destroyed.
 *
 * @param {*} resource
 * @return {boolean}
 */
Pool.prototype.isAcquired = function(resource) {
  const rinf = this._allResources.get(resource);
  return !!(rinf && rinf._acquiredNode);
};

/**
 * Returns if the pool contains a `resource`
 *
 * @param {*} resource
 * @return {boolean}
 */
Pool.prototype.includes = function(resource) {
  const rinf = this._allResources.get(resource);
  return !!rinf;
};

/**
 * Releases an allocated `resource` and let it back to pool.
 *
 * @param {*} resource
 * @return {undefined}
 */
Pool.prototype.release = function(resource) {
  const self = this;
  try {
    const rinf = self._allResources.get(resource);
    if (!rinf)
      return;
    if (rinf.isAcquired)
      rinf.setIdle();
  } finally {
    self._acquireNext();
  }
};

/**
 * Releases, destroys and removes any `resource` from `Pool`.
 *
 * @param {*} resource
 * @return {undefined}
 */
Pool.prototype.destroy = function(resource) {
  const self = this;
  try {
    const rinf = self._allResources.get(resource);
    if (!rinf)
      return;
    rinf.destroy();
  } finally {
    self._acquireNext();
  }
};

/**
 * Starts the pool and begins creating of resources, starts house keeping and any other internal logic.
 * Note: This method is not need to be called. Pool instance will automatically be started when acquire() method is called
 *
 * @return {undefined}
 */
Pool.prototype.start = function() {
  if (this._state >= PoolState.STOPPING)
    throw new Error('Closed pool can not be started again');
  if (this._state === PoolState.STARTED)
    return;
  this._state = PoolState.STARTED;
  this._setHouseKeep();
  this._ensureMin();
  this._emitSafe('start');
};

/**
 * Shuts down the pool and destroys all resources.
 *
 * @param {Boolean} force
 * @param {Function} callback
 * @return {Promise|undefined}
 */
Pool.prototype.stop = function(force, callback) {
  if (typeof force === 'function') {
    callback = force;
    force = false;
  }
  const self = this;
  if (!callback)
    return promisify.fromCallback(function(cb) {
      self.stop(force, cb);
    });
  if (this._state !== PoolState.STARTED)
    return callback();
  self._state = PoolState.STOPPING;
  self._requestQueue = new DoublyLinked();
  self._requestsProcessing = 0;
  self._emitSafe('stopping');
  self.once('stop', callback);
  if (force) {
    self._acquiredResources.forEach(function(t) {
      self.release(t.resource);
    });
  }
  self._houseKeep();
};

/**
 *
 * @private
 */
Pool.prototype._acquireNext = function() {
  if (this._state !== PoolState.STARTED ||
      this._requestsProcessing >= this.options.max - this.acquired)
    return;
  const request = this._requestQueue.shift();
  if (!request)
    return;

  const self = this;
  self._requestsProcessing++;
  const doCallback = function(err, rinf) {
    self._requestsProcessing--;
    request.destroy();
    try {
      if (rinf) {
        if (self._state !== PoolState.STARTED) {
          rinf.destroy();
          return;
        }
        rinf.setAcquired();
        self._ensureMin();
        request.callback(null, rinf.resource);
        self._emitSafe('acquire', rinf.resource);
      } else request.callback(err);
    } catch (e) {
      //
    }
    self._acquireNext();
  };

  const rinf = self._idleResources.shift();
  if (rinf) {
    rinf.setAcquired();
    /* Validate resource */
    if (self.options.validation && self._factory.validate) {
      return rinf.validate(function(err) {
        /* Destroy resource on validation error */
        if (err) {
          rinf.destroy();
          self._emitSafe('validate-error', err, rinf.resource);
          self._requestsProcessing--;
          self._requestQueue.unshift(request);
          self._acquireNext();
        } else doCallback(err, rinf);
      });
    }
    return doCallback(null, rinf);
  }
  /** There is no idle resource. We need to create new one **/
  self._createObject(request, doCallback);
};

/**
 * Creates new resource object
 * @param {Object} request
 * @param {Function} callback
 * @private
 */
Pool.prototype._createObject = function(request, callback) {
  const self = this;
  const maxRetries = self.options.acquireMaxRetries;
  var tries = 0;
  var aborted;
  self._creating++;

  function handleCallback(err, obj) {
    const rinf = obj ? new ResourceInfo(self, obj) : null;
    if (err) {
      if (request.timedOut)
        return;
      tries++;
      self._emitSafe('error', err,
          {
            requestTime: request.created,
            tries: tries,
            maxRetries: self.options.acquireMaxRetries
          });
      if (aborted || tries >= maxRetries) {
        self._creating--;
        return callback && callback(err);
      }
      return setTimeout(function() {
        tryCreate();
      }, self.options.acquireRetryWait);
    }
    self._creating--;
    if (self._allResources.has(obj))
      return callback(new Error('Factory error. Resource already in pool'));

    self._allResources.set(obj, rinf);
    rinf.setIdle();
    if (callback && !request.timedOut)
      callback(null, rinf);
    self._emitSafe('create', obj);
  }

  function abortFn(e) {
    aborted = true;
    handleCallback(e || new Error('Factory aborted'));
  }

  handleCallback.abort = abortFn;

  function tryCreate() {
    try {
      handleCallback.tries = tries;
      handleCallback.maxRetries = maxRetries;
      const o = self._factory.create(handleCallback);
      if (promisify.isPromise(o))
        o.then(function(obj) {
          handleCallback(null, obj);
        }).catch(handleCallback);
    } catch (e) {
      handleCallback(e);
    }
  }

  tryCreate();
};

/**
 * Prevents errors while calling emit()
 * @private
 */
Pool.prototype._emitSafe = function() {
  try {
    this.emit.apply(this, arguments);
  } catch (e) {
    // Do nothing
  }
};

/**
 *
 * @private
 */
Pool.prototype._setHouseKeep = function() {
  clearTimeout(this._houseKeepHandle);
  this._houseKeepHandle = null;
  if (this._state !== PoolState.STARTED || !this.options.houseKeepInterval)
    return;
  const self = this;
  this._houseKeepHandle = setTimeout(function() {
    self._houseKeep();
    self._setHouseKeep();
  }, self.options.houseKeepInterval);
};

Pool.prototype._houseKeep = function() {
  clearTimeout(this._houseKeepHandle);
  const self = this;
  const isStopping = self._state === PoolState.STOPPING;
  const now = Date.now();
  var m = self._allResources.size - self.options.min;
  var n = self._idleResources.length - self.options.minIdle;
  if (isStopping || (m > 0 && n > 0)) {
    self._idleResources.every(function(t) {
      if (isStopping ||
          t.iddleTime + self.options.idleTimeoutMillis < now) {
        t.destroy();
        return isStopping || ((--n) && (--m));
      }
    });
  }
  if (isStopping) {
    if (self._allResources.size)
    /* Check again 5 ms later */
      setTimeout(function() {
        self._houseKeep();
      }, 5);
    else {
      self._state = PoolState.STOPPED;
      self._requestsProcessing = 0;
      self._emitSafe('stop');
    }
  }
};

/**
 *
 * @private
 */
Pool.prototype._ensureMin = function() {
  const self = this;
  process.nextTick(function() {
    var k = Math.max(self.options.min - self._allResources.size,
        self.options.minIdle - self._idleResources.length);
    while (k-- > 0)
      self._createObject(new PoolRequest(self));
  });
};

Pool.PoolState = PoolState;
