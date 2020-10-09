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

const defaultValues = {
  acquireMaxRetries: 0,
  acquireRetryWait: 2000,
  acquireTimeoutMillis: 0,
  fifo: true,
  idleTimeoutMillis: 30000,
  houseKeepInterval: 1000,
  min: 0,
  minIdle: 0,
  max: 10,
  maxQueue: 1000,
  validation: true
};

class PoolOptions {
  /**
   * @param {Pool} pool
   * @constructor
   */
  constructor(pool) {
    this.pool = pool;
    this._priv = Object.assign({}, defaultValues);
  }

  get acquireMaxRetries() {
    return this._priv.acquireMaxRetries;
  }

  set acquireMaxRetries(val) {
    this._priv.acquireMaxRetries = val <= 0 ? 0 :
        (val || defaultValues.acquireMaxRetries);
  }

  get acquireRetryWait() {
    return this._priv.acquireRetryWait;
  }

  set acquireRetryWait(val) {
    this._priv.acquireRetryWait = val <= 0 ? 0 :
        (val || defaultValues.acquireRetryWait);
  }

  get acquireTimeoutMillis() {
    return this._priv.acquireTimeoutMillis;
  }

  set acquireTimeoutMillis(val) {
    this._priv.acquireTimeoutMillis = val <= 0 ? 0 :
        (val || defaultValues.acquireTimeoutMillis);
  }

  get fifo() {
    return this._priv.fifo;
  }

  set fifo(val) {
    this._priv.fifo = val == null ?
        defaultValues.fifo : !!val;
  }

  get idleTimeoutMillis() {
    return this._priv.idleTimeoutMillis;
  }

  set idleTimeoutMillis(val) {
    this._priv.idleTimeoutMillis = val <= 0 ? 0 :
        (val || defaultValues.idleTimeoutMillis);
    // noinspection JSAccessibilityCheck
    this.pool._setHouseKeep();
  }

  get houseKeepInterval() {
    return this._priv.houseKeepInterval;
  }

  set houseKeepInterval(val) {
    this._priv.houseKeepInterval = val <= 0 ? 0 :
        (val || defaultValues.houseKeepInterval);
    // noinspection JSAccessibilityCheck
    this.pool._setHouseKeep();
  }

  get min() {
    return this._priv.min;
  }

  set min(val) {
    this._priv.min = val <= 0 ? 0 :
        (val || defaultValues.min);
    if (this._priv.min > this._priv.max)
      this._priv.max = this._priv.min;
    // noinspection JSAccessibilityCheck
    this.pool._setHouseKeep();
  }

  get minIdle() {
    return this._priv.minIdle;
  }

  set minIdle(val) {
    this._priv.minIdle = val <= 0 ? 0 :
        (val || defaultValues.minIdle);
    // noinspection JSAccessibilityCheck
    this.pool._setHouseKeep();
  }

  get max() {
    return this._priv.max;
  }

  set max(val) {
    this._priv.max = val <= 0 ? 0 :
        (val || defaultValues.max);
    if (this._priv.max < this._priv.min)
      this._priv.min = this._priv.max;
    // noinspection JSAccessibilityCheck
    this.pool._setHouseKeep();
  }

  get maxQueue() {
    return this._priv.maxQueue;
  }

  set maxQueue(val) {
    this._priv.maxQueue = val <= 0 ? 0 :
        (val || defaultValues.maxQueue);
  }

  get validation() {
    return this._priv.validation;
  }

  set validation(val) {
    this._priv.validation = val == null ?
        defaultValues.validation : !!val;
  }
}

/**
 * Expose `PoolOptions`.
 */

module.exports = {PoolOptions};
