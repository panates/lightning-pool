import {Pool, IPoolFactory} from './Pool';
import type {PoolOptions} from './PoolOptions';

export {IPoolFactory, PoolState} from './Pool';
export {PoolOptions, Pool};

export class AbortError extends Error {
}

export function createPool<T = any>(factory: IPoolFactory<T>, options: PoolOptions): Pool<T>;
