import { PoolConfiguration, PoolFactory } from './definitions.js';
import { Pool } from './pool.js';

export * from './abort-error.js';
export * from './definitions.js';
export * from './pool.js';

export function createPool<T = any>(
  factory: PoolFactory<T>,
  config?: PoolConfiguration,
): Pool<T> {
  return new Pool(factory, config);
}
