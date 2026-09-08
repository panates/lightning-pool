import type { ScenarioMeta } from '../types.js';

export const ACQUIRE_RELEASE_POOL_SIZE = 10;

export const ACQUIRE_RELEASE_SCENARIO: ScenarioMeta = {
  name: 'acquire-release',
  title: 'Sequential Acquire/Release',
  description: `A single \`acquire()\` followed by a \`release()\`, one at a
time, against a pool of max size ${ACQUIRE_RELEASE_POOL_SIZE} that has
already warmed up (the resource is always idle and immediately reusable).
The baseline "warm path" cost of the pool's own bookkeeping, with no
contention and no resource creation in the timed path.`,
  bench: {
    time: 500,
    iterations: 200,
    warmupTime: 100,
    warmupIterations: 20,
  },
};
