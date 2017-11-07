/* lightning-pool
 ------------------------
 (c) 2017-present Panates
 This file may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/lightning-pool/
 */
'use strict';

const promisify = require('putil-promisify');

const ResourceState = {
  IDLE: 0,
  ACQUIRED: 1,
  VALIDATION: 2
};

/**
 * Expose `ResourceInfo`.
 */

module.exports = ResourceInfo;

/**
 *
 * @constructor
 */
function ResourceInfo(pool, resource) {
  this.pool = pool;
  this.resource = resource;
  this.state = -1;
}

const proto = ResourceInfo.prototype = {
  get isAcquired() {
    return this.state === ResourceState.ACQUIRED || this.state ===
        ResourceState.VALIDATION;
  }
};
proto.constructor = ResourceInfo;

proto.setAcquired = function() {
  if (this.isAcquired)
    return;
  this._detach();
  this.state = ResourceState.ACQUIRED;
  this.pool._acquiredResources.push(this);
  this._acquiredNode = this.pool._acquiredResources.tail;
};

proto.setIdle = function() {
  const self = this;
  const isAcquired = self.state === ResourceState.ACQUIRED;

  const doSetIdle = function() {
    self._detach();
    self.iddleTime = Date.now();
    self.state = ResourceState.IDLE;

    if (self.pool.options.fifo) {
      self.pool._idleResources.push(self);
      self._idleNode = self.pool._idleResources.tail;
    } else {
      self.pool._idleResources.unshift(self);
      self._idleNode = self.pool._idleResources.head;
    }
    if (isAcquired)
      self.pool.emit('return', self.resource);
    self.pool._acquireNext();
  };

  if (isAcquired && self.pool.options.resetOnReturn &&
      self.pool._factory.reset) {
    const handleReset = function(err) {
      if (err)
        return self.destroy();
      doSetIdle();
    };
    const o = self.pool._factory.reset(self.resource, handleReset);
    if (promisify.isPromise(o))
      o.then(handleReset).catch(handleReset);
    return;
  }
  doSetIdle();
};

proto.validate = function(callback) {
  this.state = ResourceState.VALIDATION;
  try {
    const o = this.pool._factory.validate(this.resource, callback);
    if (promisify.isPromise(o))
      o.then(callback).catch(callback);
  } catch (e) {
    callback(e);
  }
};

/**
 * Destroys resource object
 * @private
 */
proto.destroy = function() {
  const self = this;
  const pool = this.pool;
  self._detach();

  function handleCallback(err) {
    pool._allResources.delete(self.resource);
    if (err)
      pool._emitSafe('destroy-error', err, self.resource);
    pool._emitSafe('destroy', self.resource);
    self.destroyed = true;
  }

  try {
    const o = pool._factory.destroy(self.resource, handleCallback);
    if (promisify.isPromise(o))
      o.then(function(obj) {
        handleCallback(undefined, obj);
      }).catch(handleCallback);
  } catch (e) {
    handleCallback(e);
  }
};

proto._detach = function() {
  switch (this.state) {
    case ResourceState.IDLE:
      this.iddleTime = null;
      /* istanbul ignore next*/
      if (this._idleNode)
        this._idleNode.remove();
      this._idleNode = null;
      break;
    case ResourceState.ACQUIRED:
    case ResourceState.VALIDATION:
      /* istanbul ignore next*/
      if (this._acquiredNode)
        this._acquiredNode.remove();
      this._acquiredNode = null;
      break;
  }
};
