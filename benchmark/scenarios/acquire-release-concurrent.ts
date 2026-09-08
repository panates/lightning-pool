import type { ScenarioMeta } from '../types.js';

export const ACQUIRE_RELEASE_CONCURRENT_CONCURRENCY = 50;
// Pool sized exactly to the concurrency level so nobody has to queue -
// isolates concurrent-bookkeeping overhead (the internal maps/linked lists
// each library touches per acquire/release) from queueing behaviour, which
// queue-contention.ts covers instead.
export const ACQUIRE_RELEASE_CONCURRENT_POOL_SIZE =
  ACQUIRE_RELEASE_CONCURRENT_CONCURRENCY;

export const ACQUIRE_RELEASE_CONCURRENT_SCENARIO: ScenarioMeta = {
  name: 'acquire-release-concurrent',
  title: 'Concurrent Acquire/Release',
  description: `${ACQUIRE_RELEASE_CONCURRENT_CONCURRENCY} \`acquire()\` calls
fired at once via \`Promise.all\`, each released immediately after, against a
pool sized exactly to the concurrency (max=${ACQUIRE_RELEASE_CONCURRENT_POOL_SIZE})
so every call is satisfied from the idle pool with no queueing. Measures the
pool's concurrent-safety bookkeeping in isolation from queue contention.`,
  bench: {
    time: 500,
    iterations: 100,
    warmupTime: 100,
    warmupIterations: 10,
  },
};
