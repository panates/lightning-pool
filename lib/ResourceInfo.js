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

class ResourceInfo {

  /**
   * @param {Pool} pool
   * @param {*} resource
   * @constructor
   */
  constructor(pool, resource) {
    this.pool = pool;
    this.resource = resource;
    this.state = -1;
  }

  get isAcquired() {
    return this.state === ResourceState.ACQUIRED || this.state ===
        ResourceState.VALIDATION;
  }

  setAcquired() {
    if (this.isAcquired)
      return;
    this._detach();
    this.state = ResourceState.ACQUIRED;
    this.pool._acquiredResources.push(this);
    this._acquiredNode = this.pool._acquiredResources.tail;
  }

  setIdle() {
    const isAcquired = this.state === ResourceState.ACQUIRED;

    const doSetIdle = () => {
      this._detach();
      this.iddleTime = Date.now();
      this.state = ResourceState.IDLE;

      if (this.pool.options.fifo) {
        this.pool._idleResources.push(this);
        this._idleNode = this.pool._idleResources.tail;
      } else {
        this.pool._idleResources.unshift(this);
        this._idleNode = this.pool._idleResources.head;
      }
      if (isAcquired)
        this.pool.emit('return', this.resource);
      this.pool._acquireNext();
    };

    if (isAcquired && this.pool.options.resetOnReturn &&
        this.pool._factory.reset) {
      const handleReset = (err) => {
        if (err)
          return this.destroy();
        doSetIdle();
      };
      const o = this.pool._factory.reset(this.resource, handleReset);
      if (promisify.isPromise(o))
        o.then(handleReset).catch(handleReset);
      return;
    }
    doSetIdle();
  }

  validate(callback) {
    this.state = ResourceState.VALIDATION;
    try {
      const o = this.pool._factory.validate(this.resource, callback);
      if (promisify.isPromise(o))
        o.then(callback).catch(callback);
    } catch (e) {
      callback(e);
    }
  }

  /**
   * Destroys resource object
   * @private
   */
  destroy() {
    const pool = this.pool;
    this._detach();

    const handleCallback = (err) => {
      pool._allResources.delete(this.resource);
      if (err)
        pool._emitSafe('destroy-error', err, this.resource);
      pool._emitSafe('destroy', this.resource);
      this.destroyed = true;
    };

    try {
      const o = pool._factory.destroy(self.resource, handleCallback);
      if (promisify.isPromise(o))
        o.then(obj => handleCallback(undefined, obj)).catch(handleCallback);
    } catch (e) {
      handleCallback(e);
    }
  }

  _detach() {
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
  }

}

/**
 * Expose `ResourceInfo`.
 */

module.exports = ResourceInfo;
