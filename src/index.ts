import {PoolConfiguration, PoolFactory} from './definitions';
import {Pool} from './Pool';

export * from './definitions';
export * from './Pool';
export * from './AbortError';

export function createPool<T = any>(factory: PoolFactory<T>, config?: PoolConfiguration): Pool<T> {
    return new Pool(factory, config);
}
