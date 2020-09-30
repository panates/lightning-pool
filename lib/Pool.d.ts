import {PoolOptions} from "./PoolOptions";
import {EventEmitter} from 'events';

export enum PoolState {
    IDLE = 0,
    STARTED = 1,
    CLOSING = 2,
    CLOSED = 3
}

export interface IPoolFactory<T> {
    create(info: { tries: number, maxRetries: number }): Promise<T> | T;

    destroy(resource: T): Promise<void> | void;

    reset(resource: T): Promise<void> | void;

    validate(resource: T): Promise<void> | void;
}

export class Pool<T = any> extends EventEmitter {
    public readonly acquired: number;
    public readonly available: number;
    public readonly creating: number;
    public readonly pending: number;
    public readonly size: number;
    public readonly state: PoolState;
    public readonly options: PoolOptions;

    constructor(factory: IPoolFactory<T>, options?: PoolOptions);

    acquire(): Promise<T>;
    acquire(callback: (resource: T) => void): void;

    isAcquired(resource: T): boolean;

    includes(resource: T): boolean;

    release(resource: T): Promise<void>;
    release(resource: T, callback: () => void): void;

    destroy(resource: T): void;

    start(): void;

    close(force?: boolean): Promise<void>;
    close(force: boolean, callback: () => void): void;

    emitSafe(event: string, ...args);
}

