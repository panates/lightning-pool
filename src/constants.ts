/** Lifecycle state of a `Pool`, exposed as `pool.state`. */
export enum PoolState {
  /** The `Pool` has not been started yet. */
  IDLE = 0,
  /** The `Pool` is running. */
  STARTED = 1,
  /** Shutdown is in progress (`close()`/`closeAsync()` was called). */
  CLOSING = 2,
  /** The `Pool` has fully shut down. Calling `start()` again brings it back to `STARTED`. */
  CLOSED = 3,
}

/**
 * State of an individual pooled resource. Internal bookkeeping, but exposed
 * (mostly useful when inspecting events or writing tests).
 */
export enum ResourceState {
  /** The resource is idle and available for `acquire()`. */
  IDLE = 0,
  /** The resource is currently acquired by a caller. */
  ACQUIRED = 1,
  /** The resource is being validated (see `PoolConfiguration.validation`) before being handed out. */
  VALIDATION = 2,
}
