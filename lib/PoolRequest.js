/* lightning-pool
 ------------------------
 (c) 2017-present Panates
 This file may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/lightning-pool/
 */
'use strict';

class PoolRequest {

  /**
   * @param {Pool} pool
   * @param {function} [callback]
   * @constructor
   */
  constructor(pool, callback) {
    this.created = Date.now();
    this.callback = callback;
    this.pool = pool;
    if (pool.options.acquireTimeoutMillis) {
      this.timeoutHandle = setTimeout(() => {
        this.timedOut = true;
        this.cancel();
        pool.emitSafe('request-timeout');
        callback(new Error('Request timed out'));
      }, pool.options.acquireTimeoutMillis);
    }
  }

  cancel() {
    if (this.timeoutHandle)
      clearTimeout(this.timeoutHandle);
  }

}

/**
 * Expose `PoolRequest`.
 */

module.exports = PoolRequest;
