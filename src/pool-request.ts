import type { Pool } from './pool.js';
import type { Callback } from './types.js';

function noop() {}

/**
 * Internal bookkeeping for one pending `acquire()` call while it's queued
 * or being processed. Not part of the public API.
 */
export class PoolRequest {
  /** `Date.now()` when this request was created - used as `error` event's `requestTime`. */
  created: number;
  /** The caller's callback (or a resolved-Promise wrapper), invoked with the acquired resource or an error. */
  callback: Callback;
  options?: any;
  /** The pending `acquireTimeoutMillis` timer, if one is running. */
  timeoutHandle: any;
  /** Set once `acquireTimeoutMillis` has elapsed for this request. */
  timedOut = false;

  constructor(pool: Pool, callback?: Callback, options?: any) {
    this.created = Date.now();
    this.callback = callback || noop;
    this.options = options;
    if (pool.options.acquireTimeoutMillis) {
      this.timeoutHandle = setTimeout(() => {
        this.timedOut = true;
        this.stopTimout();
        pool.emit('request-timeout');
        this.callback(new Error('Request timed out'));
      }, pool.options.acquireTimeoutMillis);
    }
  }

  /** Clears the pending timeout timer, if any (does not affect `timedOut`). */
  stopTimout() {
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
  }
}
