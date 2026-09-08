# lightning-pool API Reference

For an overview, installation, and a quick example, see the [README](../README.md).

## Creating a `Pool` instance

`lightning-pool` exports both a `createPool()` factory function and the `Pool` class itself. Either can be used to
instantiate a pool.

```ts
import { createPool } from 'lightning-pool';
const pool = createPool(factory, options);
```

```ts
import { Pool } from 'lightning-pool';
const pool = new Pool(factory, options);
```

### `factory`

Any object with the following properties:

- `create(info?: {tries: number, maxRetries: number})`: Called when the `Pool` needs a new resource. May return the
  resource directly or a `Promise` that resolves to it. `info` is populated by the `Pool` itself on retry attempts
  (see `acquireMaxRetries`) - it is not something a caller of `acquire()` passes in.
- `destroy(resource)`: Called when the `Pool` wants to destroy a `resource` (where `resource` is whatever
  `factory.create` returned). May return `void` or a `Promise<void>`.
- `reset(resource)` (optional): Called before a `resource` is returned to the idle pool. May return `void` or a
  `Promise<void>`. If it throws or rejects, the `Pool` destroys and removes the resource instead of returning it to
  the idle pool.
- `validate(resource)` (optional): Called to validate a `resource` before handing it out (see the `validation`
  option). May return `void`, a `boolean`, or a `Promise` of either. If it throws, rejects, or resolves to `false`,
  the `Pool` destroys and removes the resource and tries the next one instead.

### `options`

- `acquireMaxRetries`: Maximum number of times the `Pool` will retry creating a resource before giving up and
  returning the error to the caller. (Default `0` - fail on the first error, no retries)
- `acquireRetryWait`: Time in milliseconds the `Pool` waits between retry attempts. (Default `2000`)
- `acquireTimeoutMillis`: Time in milliseconds an `acquire()` call will wait for a resource before failing with a
  timeout error. (Default `0` - no timeout)
- `fifo`: If `true`, idle resources are handed out in first-in-first-out order (the longest-idle resource first). If
  `false`, last-in-first-out (the most recently released resource first). (Default `true`)
- `idleTimeoutMillis`: The minimum amount of time in milliseconds a resource may sit idle in the `Pool` before the
  housekeeper is allowed to destroy it (subject to `min`/`minIdle`). (Default `30000`)
- `houseKeepInterval`: Time in milliseconds between housekeeping passes, which enforce `idleTimeoutMillis` and
  `min`/`minIdle`. (Default `1000`)
- `min`: Minimum number of resources the `Pool` tries to keep alive in total. (Default `0`)
- `minIdle`: Minimum number of resources the `Pool` tries to keep idle (immediately available). (Default `0`)
- `max`: Maximum number of resources the `Pool` will create. (Default `10`)
- `maxQueue`: Maximum number of `acquire()` requests that may be queued/pending at once; further requests fail
  immediately with an error instead of waiting. (Default `1000`)
- `validation`: If `true`, the `Pool` calls `factory.validate()` on a resource before handing it out (when the
  factory provides one). If `false`, `validate()` is never called. (Default `true`)

All options can also be read/written after construction via `pool.options.<name>` - see [Properties](#properties).

## Methods

### `pool.acquire()`

Acquires a resource from the `Pool`, or creates a new one if none is idle.

```ts
acquire(): Promise<T>;
acquire(callback: Callback): void;
```

```js
const resource = await pool.acquire();
// or, callback style:
pool.acquire((err, resource) => {
  if (err) {
    /* handle error */
  }
});
```

### `pool.release()` / `pool.releaseAsync()`

Releases an acquired resource back to the `Pool` so it can be reused.

```ts
release(resource: T, callback?: Callback): void;
releaseAsync(resource: T): Promise<void>;
```

`release()` always returns immediately (`undefined`) - it does not wait for `factory.reset()` (if any) to finish. Use
`releaseAsync()` (or pass a `callback`) if you need to know when the release has actually completed.

```js
pool.release(resource);
// or, to wait for completion:
await pool.releaseAsync(resource);
```

### `pool.destroy()` / `pool.destroyAsync()`

Releases, destroys, and removes a resource from the `Pool` entirely (it will not be reused).

```ts
destroy(resource: T, callback?: Callback): void;
destroyAsync(resource: T): Promise<void>;
```

```js
pool.destroy(resource);
// or, to wait for completion:
await pool.destroyAsync(resource);
```

### `pool.isAcquired()`

Returns whether a resource is currently acquired (not yet released or destroyed).

```ts
isAcquired(resource: T): boolean;
```

### `pool.includes()`

Returns whether a resource belongs to this `Pool` (acquired, idle, or otherwise tracked - not yet destroyed).

```ts
includes(resource: T): boolean;
```

### `pool.start()`

Starts the `Pool`: begins creating resources to satisfy `min`/`minIdle` and starts the housekeeper.

*Note: calling this explicitly is optional - the `Pool` starts itself automatically the first time `acquire()` is
called.*

```ts
start(): void;
```

### `pool.close()` / `pool.closeAsync()`

Shuts down the `Pool` and destroys all of its resources. Any `acquire()` call still queued at the time `close()` is
invoked is rejected with an error.

```ts
close(): Promise<void>;
close(callback: Callback): void;
close(terminateWait: number, callback?: Callback): void;
close(force: boolean, callback?: Callback): void;

closeAsync(): Promise<void>;
closeAsync(terminateWait?: number): Promise<void>;
closeAsync(force?: boolean): Promise<void>;
```

- `terminateWait` (number): How long, in milliseconds, to wait for acquired resources to be released before forcibly
  destroying them anyway. Omit (or pass no argument) to wait indefinitely.
- `force` (boolean): `true` is shorthand for `terminateWait: 0` (destroy acquired resources immediately, without
  waiting); `false` is shorthand for waiting indefinitely.
- `callback`: If provided, it is called once the `Pool` has fully closed. If omitted, `close()`/`closeAsync()`
  returns a `Promise` instead.

```js
await pool.close(5000); // wait up to 5s for active resources, then force-close
await pool.close(0); // close immediately, destroying acquired resources without waiting
await pool.close(); // wait indefinitely for active resources to be released
```

## Properties

- `acquired` (`number`): Number of resources currently acquired.
- `available` (`number`): Number of idle resources.
- `creating` (`number`): Number of resources currently being created.
- `pending` (`number`): Number of `acquire()` requests currently queued/being processed.
- `size` (`number`): Total number of resources tracked by the `Pool` (acquired + idle + being created).
- `state` (`PoolState`): Current lifecycle state of the `Pool` - see [`PoolState`](#poolstate) below.
- `options` (`PoolOptions`): A live, mutable options object - every option above is a get/set property on it, and
  changes take effect immediately (e.g. `pool.options.max = 20`).

## Events

`Pool` extends `EventEmitter` and emits the following events:

- `start`: The `Pool` has started.
- `closing`: The `Pool` has begun shutting down (emitted at the start of `close()`).
- `close`: The `Pool` has finished shutting down and all resources have been destroyed.
- `terminate`: Emitted when `close()`'s `terminateWait` elapses and acquired resources are force-released instead of
  waited for further.
- `create(resource)`: A new resource was created and added to the `Pool`.
- `error(err, info)`: `factory.create()` failed. `info` is `{ requestTime, tries, maxRetries }`.
- `acquire(resource)`: A resource was handed out to a caller.
- `return(resource)`: A previously-acquired resource was released back to the idle pool.
- `destroy(resource)`: A resource was destroyed and removed from the `Pool`.
- `destroy-error(err, resource)`: `factory.destroy()` failed while destroying a resource.
- `validate-error(err, resource)`: `factory.validate()` failed (or returned `false`) while validating a resource on
  borrow; the resource is destroyed and the `Pool` tries the next one.
- `request-timeout`: An `acquire()` call timed out (see `acquireTimeoutMillis`).

```js
pool.on('acquire', resource => {
  /* ... */
});
pool.on('destroy-error', (err, resource) => {
  /* log it */
});
```

## `PoolState`

The `state` property (and the `PoolState` enum exported from the package):

- `IDLE` (`0`): The `Pool` has not been started yet.
- `STARTED` (`1`): The `Pool` is running.
- `CLOSING` (`2`): Shutdown is in progress.
- `CLOSED` (`3`): The `Pool` has fully shut down. Calling `start()` again brings it back to `STARTED`.

## `ResourceState`

Internal per-resource state, also exported as an enum (mostly useful when inspecting events or writing tests):

- `IDLE` (`0`): The resource is idle and available for `acquire()`.
- `ACQUIRED` (`1`): The resource is currently acquired by a caller.
- `VALIDATION` (`2`): The resource is being validated (see the `validation` option) before being handed out.
