import { Pool } from './pool.js';
import type { PoolConfiguration, PoolFactory } from './types.js';

export * from './abort-error.js';
export * from './constants.js';
export * from './pool.js';
export * from './types.js';

export function createPool<T = any>(
  factory: PoolFactory<T>,
  config?: PoolConfiguration,
): Pool<T> {
  return new Pool(factory, config);
}
