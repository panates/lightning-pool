export type Callback = (e?: unknown, ...args: any[]) => void;

export interface PoolFactory<T = any> {
  create(info?: { tries: number; maxRetries: number }): Promise<T> | T;

  destroy(resource: T): Promise<void> | void;

  reset?(resource: T): Promise<void> | void;

  validate?(resource: T): Promise<void | boolean> | void;
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
