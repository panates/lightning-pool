import Pool, {IPoolFactory} from './lib/Pool';

declare module 'lightning-pool' {

    export {IPoolFactory, PoolState} from './lib/Pool';

    export class AbortError extends Error {
    }

    export function createPool(factory: IPoolFactory, options): Pool;
}
