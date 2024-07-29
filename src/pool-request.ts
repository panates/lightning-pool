import { Callback } from './definitions.js';
import { Pool } from './pool.js';

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

export class PoolRequest {
  created: number;
  callback: Callback;
  options?: any;
  timeoutHandle: any;
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

  stopTimout() {
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
  }
}
