import { Callback } from './definitions.js';
import { Pool } from './pool.js';

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

export class PoolRequest {
  created: number;
  callback: Callback;
  timeoutHandle: any;
  timedOut = false;

  constructor(pool: Pool, callback?: Callback) {
    this.created = Date.now();
    this.callback = callback || noop;
    if (pool.options.acquireTimeoutMillis) {
      this.timeoutHandle = setTimeout(() => {
        this.timedOut = true;
        this.stopTimout();
        pool.emit('request-timeout');
        this.callback(new Error('Request timed out'));
      }, pool.options.acquireTimeoutMillis);
    }
  }

  stopTimout() {
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
  }
}
