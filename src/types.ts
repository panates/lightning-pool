/**
 * Callback signature used throughout `Pool`'s non-Promise API (e.g.
 * `acquire(callback)`, `release(resource, callback)`).
 *
 * @param e - The error, if the operation failed; `undefined` on success.
 * @param args - Operation-specific result values (e.g. the acquired resource).
 */
export type Callback = (e?: unknown, ...args: any[]) => void;

/**
 * The object a `Pool` uses to create, destroy, reset, and validate the
 * resources it manages. Passed to `createPool()`/`new Pool()`.
 *
 * @typeParam T - The resource type this factory produces (e.g. a DB connection).
 */
export interface PoolFactory<T = any> {
  /**
   * Called when the `Pool` needs a new resource.
   *
   * @param info - Populated by the `Pool` itself on retry attempts (see
   * `PoolConfiguration.acquireMaxRetries`) - not something a caller of
   * `acquire()` passes in. `info.tries` is the number of attempts made so
   * far for this resource; `info.maxRetries` mirrors `acquireMaxRetries`.
   * @returns The new resource, or a `Promise` that resolves to it. Throwing
   * (or rejecting with) an `AbortError` skips any remaining retries and
   * fails the pending `acquire()` immediately.
   */
  create(info?: { tries: number; maxRetries: number }): Promise<T> | T;

  /**
   * Called when the `Pool` wants to destroy a `resource` - on eviction
   * (`idleTimeoutMillis`), on `pool.destroy()`/`destroyAsync()`, on
   * `reset`/`validate` failure, and when the `Pool` itself closes.
   *
   * @param resource - The resource to destroy, as returned by `create()`.
   */
  destroy(resource: T): Promise<void> | void;

  /**
   * Called before a `resource` is returned to the idle pool after being
   * released (see `Pool.release()`/`releaseAsync()`). Optional - if
   * omitted, released resources go straight back to idle.
   *
   * @param resource - The resource being released, as returned by `create()`.
   * @remarks If this throws, rejects, or its returned `Promise` rejects,
   * the `Pool` destroys and removes the resource instead of returning it
   * to the idle pool.
   */
  reset?(resource: T): Promise<void> | void;

  /**
   * Called to validate an idle `resource` before handing it out to an
   * `acquire()` caller (see `PoolConfiguration.validation`). Optional - if
   * omitted (or `validation` is `false`), resources are never validated.
   *
   * @param resource - The idle resource being considered for borrow.
   * @remarks If this throws, rejects, or resolves to `false`, the `Pool`
   * destroys and removes the resource and tries the next idle one (or
   * creates a new one) instead.
   */
  validate?(resource: T): Promise<void | boolean> | void;
}

/**
 * Options accepted by `createPool()`/`new Pool()`. Every option is also
 * available as a live get/set property on `pool.options` after
 * construction - see `PoolOptions`.
 */
export interface PoolConfiguration {
  /**
   * Maximum number of times the `Pool` will retry creating a resource
   * before giving up and returning the error to the caller.
   *
   * @defaultValue `0` - fail on the first error, no retries.
   */
  acquireMaxRetries?: number;

  /**
   * Time in milliseconds the `Pool` waits between retry attempts (see
   * `acquireMaxRetries`).
   *
   * @defaultValue `2000`
   */
  acquireRetryWait?: number;

  /**
   * Time in milliseconds an `acquire()` call will wait for a resource
   * before failing with a timeout error.
   *
   * @defaultValue `0` - no timeout.
   */
  acquireTimeoutMillis?: number;

  /**
   * If `true`, idle resources are handed out in first-in-first-out order
   * (the longest-idle resource first). If `false`, last-in-first-out (the
   * most recently released resource first).
   *
   * @defaultValue `true`
   */
  fifo?: boolean;

  /**
   * The minimum amount of time in milliseconds a resource may sit idle in
   * the `Pool` before the housekeeper is allowed to destroy it (subject to
   * `min`/`minIdle`).
   *
   * @defaultValue `30000`
   */
  idleTimeoutMillis?: number;

  /**
   * Time in milliseconds between housekeeping passes, which enforce
   * `idleTimeoutMillis` and `min`/`minIdle`.
   *
   * @defaultValue `1000`
   */
  houseKeepInterval?: number;

  /**
   * Minimum number of resources the `Pool` tries to keep alive in total.
   *
   * @defaultValue `0`
   */
  min?: number;

  /**
   * Minimum number of resources the `Pool` tries to keep idle (immediately
   * available).
   *
   * @defaultValue `0`
   */
  minIdle?: number;

  /**
   * Maximum number of resources the `Pool` will create.
   *
   * @defaultValue `10`
   */
  max?: number;

  /**
   * Maximum number of `acquire()` requests that may be queued/pending at
   * once; further requests fail immediately with an error instead of
   * waiting.
   *
   * @defaultValue `1000`
   */
  maxQueue?: number;

  /**
   * If `true`, the `Pool` calls `factory.validate()` on a resource before
   * handing it out (when the factory provides one). If `false`,
   * `validate()` is never called.
   *
   * @defaultValue `true`
   */
  validation?: boolean;
}
