import Pool, {IPoolFactory} from './Pool';
import type {PoolOptions} from './PoolOptions';

declare module 'lightning-pool' {

    export {IPoolFactory, PoolState} from './Pool';
    export {PoolOptions};

    export class AbortError extends Error {
    }

    export function createPool(factory: IPoolFactory, options: PoolOptions): Pool;
}
