/* lightning-pool
 ------------------------
 (c) 2017-present Panates
 This file may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/lightning-pool/
 */
'use strict';

/**
 * Expose `PoolRequest`.
 */

module.exports = PoolRequest;

/**
 *
 * @constructor
 */
function PoolRequest(pool, callback) {
  this.created = Date.now();
  this.callback = callback;
  this.pool = pool;
  if (pool.options.acquireTimeoutMillis) {
    const self = this;
    self.timeoutHandle = setTimeout(function() {
      self.timedOut = true;
      self.destroy();
      pool._emitSafe('request-timeout');
      callback(new Error('Request timed out'));
    }, pool.options.acquireTimeoutMillis);
  }
}

PoolRequest.prototype.destroy = function() {
  if (this.timeoutHandle)
    clearTimeout(this.timeoutHandle);
};
