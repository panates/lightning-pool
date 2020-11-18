import {EventEmitter} from 'events';
import {Pool} from './Pool';
import {PoolConfiguration} from './definitions';

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
    validation: true
};

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

    get acquireMaxRetries(): number {
        return this._acquireMaxRetries;
    }

    set acquireMaxRetries(val: number) {
        this._acquireMaxRetries = val >= 0 ? val : defaultValues.acquireMaxRetries;
        this.emit('change', 'acquireMaxRetries', this._acquireMaxRetries);
    }

    get acquireRetryWait(): number {
        return this._acquireRetryWait;
    }

    set acquireRetryWait(val: number) {
        this._acquireRetryWait = val >= 0 ? val : defaultValues.acquireRetryWait;
        this.emit('change', 'acquireRetryWait', this._acquireRetryWait);
    }

    get acquireTimeoutMillis(): number {
        return this._acquireTimeoutMillis;
    }

    set acquireTimeoutMillis(val: number) {
        this._acquireTimeoutMillis = val >= 0 ? val : defaultValues.acquireTimeoutMillis;
        this.emit('change', 'acquireTimeoutMillis', this._acquireTimeoutMillis);
    }

    get fifo(): boolean {
        return this._fifo;
    }

    set fifo(val: boolean) {
        // noinspection PointlessBooleanExpressionJS
        this._fifo = !!val;
        this.emit('change', 'fifo', this.fifo);
    }

    get idleTimeoutMillis(): number {
        return this._idleTimeoutMillis;

    }

    set idleTimeoutMillis(val: number) {
        this._idleTimeoutMillis = val >= 0 ? val : defaultValues.idleTimeoutMillis;
        this.emit('change', 'idleTimeoutMillis', this._idleTimeoutMillis);
    }

    get houseKeepInterval() {
        return this._houseKeepInterval;
    }

    set houseKeepInterval(val: number) {
        this._houseKeepInterval = val >= 0 ? val : defaultValues.houseKeepInterval;
        this.emit('change', 'houseKeepInterval', this._houseKeepInterval);
    }

    get min(): number {
        return this._min;
    }

    set min(val: number) {
        this._min = val >= 0 ? val : defaultValues.min;
        if (this._min > this._max)
            this._max = this._min;
        this.emit('change', 'min', this._min);
    }

    get minIdle(): number {
        return this._minIdle;
    }

    set minIdle(val: number) {
        this._minIdle = val >= 0 ? val : defaultValues.minIdle;
        this.emit('change', 'minIdle', this.minIdle);
    }

    get max(): number {
        return this._max;
    }

    set max(val: number) {
        this._max = val >= 0 ? Math.max(val, 1) : defaultValues.max;
        if (this._min > this._max)
            this._min = this._max;
        this.emit('change', 'max', this._max);
    }

    get maxQueue(): number {
        return this._maxQueue;
    }

    set maxQueue(val: number) {
        this._maxQueue = val >= 0 ? Math.max(val, 1) : defaultValues.maxQueue;
        this.emit('change', 'maxQueue', this._maxQueue);
    }

    get validation(): boolean {
        return this._validation;
    }

    set validation(val: boolean) {
        // noinspection PointlessBooleanExpressionJS
        this._validation = !!val;
        this.emit('change', 'validation', this._validation);
    }

    assign(values: PoolConfiguration | PoolOptions): void {
        const proto = Object.getPrototypeOf(this);
        for (const k of Object.keys(values)) {
            const desc = Object.getOwnPropertyDescriptor(proto, k);
            if (desc && desc.set)
                this[k] = values[k];
        }
    }

}
