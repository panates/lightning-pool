export type Callback = (e?: Error, ...args: any[]) => void;

export enum PoolState {
  IDLE = 0,
  STARTED = 1,
  CLOSING = 2,
  CLOSED = 3
}

export enum ResourceState {
  IDLE = 0,
  ACQUIRED = 1,
  VALIDATION = 2
}

export interface PoolFactory<T = any> {

  create(info?: { tries: number, maxRetries: number }): Promise<T> | T;

  destroy(resource: T): Promise<void> | void;

  reset?(resource: T): Promise<void> | void;

  validate?(resource: T): Promise<void> | void;
}


export interface PoolConfiguration {
  acquireMaxRetries?: number;
  acquireRetryWait?: number;
  acquireTimeoutMillis?: number;
  fifo?: boolean;
  idleTimeoutMillis?: number;
  houseKeepInterval?: number;
  min?: number;
  minIdle?: number;
  max?: number;
  maxQueue?: number;
  validation?: boolean;
}
