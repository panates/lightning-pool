import { EventEmitter } from 'events';
import type { Pool } from './pool.js';
import type { PoolConfiguration } from './types.js';

const defaultValues = {
  acquireMaxRetries: 0,
  acquireRetryWait: 2000,
  acquireTimeoutMillis: 0,
  fifo: true,
  idleTimeoutMillis: 30000,
  houseKeepInterval: 1000,
  min: 0,
  minIdle: 0,
  max: 10,
  maxQueue: 1000,
  validation: true,
};

/**
 * Live, mutable configuration for a `Pool`, exposed as `pool.options`. Every
 * property is a get/set pair - assigning one takes effect immediately (e.g.
 * `pool.options.max = 20`) and emits a `'change'` event that `Pool` reacts
 * to (adjusting the housekeeper interval, topping up `min`/`minIdle`, etc.).
 * See `PoolConfiguration` for what each option means; the defaults are the
 * same for both.
 */
export class PoolOptions extends EventEmitter {
  private _acquireMaxRetries = defaultValues.acquireMaxRetries;
  private _acquireRetryWait = defaultValues.acquireRetryWait;
  private _acquireTimeoutMillis = defaultValues.acquireTimeoutMillis;
  private _fifo = defaultValues.fifo;
  private _idleTimeoutMillis = defaultValues.idleTimeoutMillis;
  private _houseKeepInterval = defaultValues.houseKeepInterval;
  private _min = defaultValues.min;
  private _minIdle = defaultValues.minIdle;
  private _max = defaultValues.max;
  private _maxQueue = defaultValues.maxQueue;
  private _validation = defaultValues.validation;

  constructor(public readonly pool: Pool) {
    super();
    this.pool = pool;
  }

  /** @defaultValue `0` - fail on the first error, no retries. */
  get acquireMaxRetries(): number {
    return this._acquireMaxRetries;
  }

  /** Negative values reset to the default instead of being applied. */
  set acquireMaxRetries(val: number) {
    this._acquireMaxRetries = val >= 0 ? val : defaultValues.acquireMaxRetries;
    this.emit('change', 'acquireMaxRetries', this._acquireMaxRetries);
  }

  /** @defaultValue `2000` (milliseconds) */
  get acquireRetryWait(): number {
    return this._acquireRetryWait;
  }

  /** Negative values reset to the default instead of being applied. */
  set acquireRetryWait(val: number) {
    this._acquireRetryWait = val >= 0 ? val : defaultValues.acquireRetryWait;
    this.emit('change', 'acquireRetryWait', this._acquireRetryWait);
  }

  /** @defaultValue `0` (milliseconds) - no timeout. */
  get acquireTimeoutMillis(): number {
    return this._acquireTimeoutMillis;
  }

  /** Negative values reset to the default instead of being applied. */
  set acquireTimeoutMillis(val: number) {
    this._acquireTimeoutMillis =
      val >= 0 ? val : defaultValues.acquireTimeoutMillis;
    this.emit('change', 'acquireTimeoutMillis', this._acquireTimeoutMillis);
  }

  /**
   * If `true`, idle resources are handed out first-in-first-out; if
   * `false`, last-in-first-out.
   *
   * @defaultValue `true`
   */
  get fifo(): boolean {
    return this._fifo;
  }

  set fifo(val: boolean) {
    // noinspection PointlessBooleanExpressionJS
    this._fifo = !!val;
    this.emit('change', 'fifo', this.fifo);
  }

  /** @defaultValue `30000` (milliseconds) */
  get idleTimeoutMillis(): number {
    return this._idleTimeoutMillis;
  }

  /** Negative values reset to the default instead of being applied. */
  set idleTimeoutMillis(val: number) {
    this._idleTimeoutMillis = val >= 0 ? val : defaultValues.idleTimeoutMillis;
    this.emit('change', 'idleTimeoutMillis', this._idleTimeoutMillis);
  }

  /** @defaultValue `1000` (milliseconds) */
  get houseKeepInterval() {
    return this._houseKeepInterval;
  }

  /**
   * Negative values reset to the default instead of being applied.
   *
   * @remarks Setting this restarts the housekeeper timer on the running
   * `Pool` with the new interval.
   */
  set houseKeepInterval(val: number) {
    this._houseKeepInterval = val >= 0 ? val : defaultValues.houseKeepInterval;
    this.emit('change', 'houseKeepInterval', this._houseKeepInterval);
  }

  /** @defaultValue `0` */
  get min(): number {
    return this._min;
  }

  /**
   * Negative values reset to the default instead of being applied.
   *
   * @remarks Raising this above the current `max` also raises `max` to
   * match, since `min` can never exceed `max`. On a running `Pool`, raising
   * `min` triggers creating resources to satisfy the new minimum.
   */
  set min(val: number) {
    this._min = val >= 0 ? val : defaultValues.min;
    if (this._min > this._max) this._max = this._min;
    this.emit('change', 'min', this._min);
  }

  /** @defaultValue `0` */
  get minIdle(): number {
    return this._minIdle;
  }

  /**
   * Negative values reset to the default instead of being applied.
   *
   * @remarks On a running `Pool`, raising this triggers creating resources
   * to satisfy the new minimum idle count.
   */
  set minIdle(val: number) {
    this._minIdle = val >= 0 ? val : defaultValues.minIdle;
    this.emit('change', 'minIdle', this.minIdle);
  }

  /** @defaultValue `10` */
  get max(): number {
    return this._max;
  }

  /**
   * Negative values reset to the default instead of being applied; `0` or
   * below the current `min` is clamped up to at least `1`/`min`.
   *
   * @remarks Lowering this below the current `min` also lowers `min` to
   * match, since `min` can never exceed `max`.
   */
  set max(val: number) {
    this._max = val >= 0 ? Math.max(val, 1) : defaultValues.max;
    if (this._min > this._max) this._min = this._max;
    this.emit('change', 'max', this._max);
  }

  /** @defaultValue `1000` */
  get maxQueue(): number {
    return this._maxQueue;
  }

  /**
   * Negative values reset to the default instead of being applied;
   * otherwise clamped up to at least `1`.
   */
  set maxQueue(val: number) {
    this._maxQueue = val >= 0 ? Math.max(val, 1) : defaultValues.maxQueue;
    this.emit('change', 'maxQueue', this._maxQueue);
  }

  /**
   * If `true`, a resource is validated via `factory.validate()` before
   * being handed out (when the factory provides one).
   *
   * @defaultValue `true`
   */
  get validation(): boolean {
    return this._validation;
  }

  set validation(val: boolean) {
    // noinspection PointlessBooleanExpressionJS
    this._validation = !!val;
    this.emit('change', 'validation', this._validation);
  }

  /**
   * Copies every recognized option from `values` onto this instance,
   * emitting a `'change'` event per option (same as assigning each
   * individually). Unknown keys are silently ignored.
   *
   * @param values - A plain `PoolConfiguration` object, or another
   * `PoolOptions` instance to copy settings from (e.g. to clone one pool's
   * configuration onto another).
   */
  assign(values: PoolConfiguration | PoolOptions): void {
    const proto = Object.getPrototypeOf(this);
    // A PoolOptions instance only owns underscored private fields, so its
    // public getter/setter names must be read from the canonical key list.
    const keys =
      values instanceof PoolOptions
        ? Object.keys(defaultValues)
        : Object.keys(values);
    for (const k of keys) {
      const desc = Object.getOwnPropertyDescriptor(proto, k);
      const val = (values as any)[k];
      if (desc && desc.set && val !== undefined) this[k] = val;
    }
  }
}
