import type { ScenarioMeta } from '../types.js';

export const QUEUE_CONTENTION_POOL_SIZE = 10;
export const QUEUE_CONTENTION_CONCURRENCY = 500;

export const QUEUE_CONTENTION_SCENARIO: ScenarioMeta = {
  name: 'queue-contention',
  title: 'Queue Contention',
  description: `${QUEUE_CONTENTION_CONCURRENCY} \`acquire()\` calls fired at
once via \`Promise.all\` against a pool of max size
${QUEUE_CONTENTION_POOL_SIZE} - the overwhelming majority must queue and wait
for a resource to be released back before they can be served. Each holder
releases its resource right after acquiring it, so the queue continuously
drains. This is the scenario the pool's request queue and scheduling logic
matter most for.`,
  bench: {
    time: 800,
    iterations: 30,
    warmupTime: 200,
    warmupIterations: 3,
  },
};
