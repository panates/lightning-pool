import type { ScenarioMeta } from '../types.js';

export const CREATE_DESTROY_CHURN_POOL_SIZE = 10;
export const CREATE_DESTROY_CHURN_CONCURRENCY = 10;

export const CREATE_DESTROY_CHURN_SCENARIO: ScenarioMeta = {
  name: 'create-destroy-churn',
  title: 'Create/Destroy Churn',
  description: `${CREATE_DESTROY_CHURN_CONCURRENCY} concurrent \`acquire()\`
+ \`destroy()\` cycles per iteration - the resource is destroyed instead of
released, so it never returns to the idle list and a brand-new one must be
created for every single acquire (pool max=${CREATE_DESTROY_CHURN_POOL_SIZE}).
Isolates the factory create/destroy pipeline overhead from the idle-reuse
path the other scenarios mostly exercise. Set \`BENCH_CREATE_DELAY_MS\`/
\`BENCH_DESTROY_DELAY_MS\` to approximate a real backend's connection cost.`,
  bench: {
    time: 500,
    iterations: 50,
    warmupTime: 100,
    warmupIterations: 5,
  },
};
