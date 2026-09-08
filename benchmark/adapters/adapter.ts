import type { Bench } from 'tinybench';
import type { LibId } from '../types.js';

/**
 * Each adapter drives its own pool library using that library's idiomatic
 * API (lightning-pool's acquire/release/destroy vs. generic-pool's
 * acquire/release/destroy with its own option names) while pooling the
 * exact same simulated resource (see resource.ts) with the same pool size/
 * concurrency knobs, read from benchmark/scenarios/*.ts. Only the pooling
 * mechanism varies per library, not the workload it's driving.
 */
export interface Adapter {
  readonly id: LibId;
  /** Read from the installed package's own package.json at runtime */
  readonly libraryVersion: string;
  scenarios: {
    acquireRelease(bench: Bench, poolSize: number): void;
    /**
     * Fires `concurrency` acquire()+release() cycles via Promise.all per
     * iteration, against a pool sized so nothing has to queue.
     */
    acquireReleaseConcurrent(
      bench: Bench,
      poolSize: number,
      concurrency: number,
    ): void;
    /**
     * Fires `concurrency` acquire() calls via Promise.all against a pool
     * much smaller than the concurrency, so most callers queue and wait;
     * each holder releases immediately after acquiring.
     */
    queueContention(bench: Bench, poolSize: number, concurrency: number): void;
    /**
     * `concurrency` acquire()+destroy() cycles per iteration - the resource
     * is destroyed rather than released, so a new one must be created for
     * every acquire.
     */
    createDestroyChurn(
      bench: Bench,
      poolSize: number,
      concurrency: number,
    ): void;
    /**
     * Same shape as acquireReleaseConcurrent, but with the library's
     * borrow-time validation hook enabled.
     */
    validateOnBorrow(bench: Bench, poolSize: number, concurrency: number): void;
  };
}
