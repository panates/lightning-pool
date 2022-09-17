import { PoolConfiguration, PoolFactory } from './definitions.js';
import { Pool } from './Pool.js';

export * from './definitions.js';
export * from './Pool.js';
export * from './AbortError.js';

export function createPool<T = any>(factory: PoolFactory<T>, config?: PoolConfiguration): Pool<T> {
  return new Pool(factory, config);
}
