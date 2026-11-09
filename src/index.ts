import { Pool } from './pool.js';
import type { PoolConfiguration, PoolFactory } from './types.js';

export * from './abort-error.js';
export * from './constants.js';
export * from './pool.js';
export * from './types.js';

/**
 * Creates a new `Pool`. Equivalent to `new Pool(factory, config)` - a
 * convenience so callers don't need to import the `Pool` class directly.
 *
 * @typeParam T - The resource type this pool manages.
 * @param factory - Creates, destroys, and (optionally) resets/validates resources.
 * @param config - Initial options; every option can also be changed later via `pool.options`.
 */
export function createPool<T = any>(
  factory: PoolFactory<T>,
  config?: PoolConfiguration,
): Pool<T> {
  return new Pool(factory, config);
}
