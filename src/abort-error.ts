/**
 * Throw (or reject with) this from `PoolFactory.create()` to abort resource
 * creation immediately instead of retrying.
 *
 * @remarks Normally, when `create()` fails, the `Pool` retries up to
 * `PoolConfiguration.acquireMaxRetries` times (waiting `acquireRetryWait`
 * between attempts) before failing the pending `acquire()`. An `AbortError`
 * skips that retry loop entirely and fails the `acquire()` right away -
 * useful for errors that retrying can never fix (e.g. invalid
 * credentials), as opposed to transient ones (e.g. a connection timeout).
 */
export class AbortError extends Error {}
