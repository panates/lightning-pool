/**
 * Milliseconds a simulated resource's create()/destroy() takes to settle -
 * 0 by default so scenarios measure pure pool overhead rather than an
 * artificial delay, but overridable to approximate a real backend (a DB
 * connection, a socket handshake) without needing one installed.
 */
export function getResourceCreateDelayMs(): number {
  return process.env.BENCH_CREATE_DELAY_MS
    ? parseInt(process.env.BENCH_CREATE_DELAY_MS, 10)
    : 0;
}

export function getResourceDestroyDelayMs(): number {
  return process.env.BENCH_DESTROY_DELAY_MS
    ? parseInt(process.env.BENCH_DESTROY_DELAY_MS, 10)
    : 0;
}
