/// <reference lib="es2015.symbol" />

type Maybe<T> = T | void;

import {PoolOptions} from "./PoolOptions";

export enum PoolState {
    IDLE = 0,
    STARTED = 1,
    CLOSING = 2,
    CLOSED = 3
}

export interface IPoolFactory {
    create(info: { tries: number, maxRetries: number }): Promise<any> | any;

    destroy(resource: any): Promise<void>;

    reset(resource: any): Promise<void>;

    validate(resource: any): Promise<void>;
}

export class Pool {
    public readonly acquired: number;
    public readonly available: number;
    public readonly creating: number;
    public readonly pending: number;
    public readonly size: number;
    public readonly state: PoolState;
    public readonly options: PoolOptions;

    acquire(): Promise<any>;
    acquire(callback: (resource: any) => void): void;

    isAcquired(resource: any): boolean;

    includes(resource: any): boolean;

    release(resource: any): Promise<void>;
    release(resource: any, callback: () => void): void;

    destroy(resource: any): void;

    start(): void;

    close(force?: boolean): Promise<void>;
    close(force: boolean, callback: () => void): void;

    emitSafe(event: string, ...args);
}

