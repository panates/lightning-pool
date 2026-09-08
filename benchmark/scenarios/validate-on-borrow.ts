import type { ScenarioMeta } from '../types.js';

export const VALIDATE_ON_BORROW_CONCURRENCY = 50;
export const VALIDATE_ON_BORROW_POOL_SIZE = VALIDATE_ON_BORROW_CONCURRENCY;

export const VALIDATE_ON_BORROW_SCENARIO: ScenarioMeta = {
  name: 'validate-on-borrow',
  title: 'Validate on Borrow',
  description: `Same shape as Concurrent Acquire/Release
(${VALIDATE_ON_BORROW_CONCURRENCY} concurrent acquire+release cycles,
pool max=${VALIDATE_ON_BORROW_POOL_SIZE}), but with each library's
borrow-time validation hook enabled (lightning-pool's \`validation: true\` +
\`factory.validate\`, generic-pool's \`testOnBorrow: true\` +
\`factory.validate\`) - isolates the added cost of validating a resource
before handing it out.`,
  bench: {
    time: 500,
    iterations: 100,
    warmupTime: 100,
    warmupIterations: 10,
  },
};
