import { createPool, type Pool, type PoolFactory } from '../../src/index.js';
import {
  getResourceCreateDelayMs,
  getResourceDestroyDelayMs,
} from '../config.js';
import { type BenchResource, createResourceOps } from '../resource.js';
import type { Adapter } from './adapter.js';
import { readOwnPackageVersion } from './pkg-version.js';

function makeFactory(withValidate: boolean): PoolFactory<BenchResource> {
  const ops = createResourceOps({
    createDelayMs: getResourceCreateDelayMs(),
    destroyDelayMs: getResourceDestroyDelayMs(),
  });
  const factory: PoolFactory<BenchResource> = {
    create: () => ops.create(),
    destroy: r => ops.destroy(r),
  };
  if (withValidate) factory.validate = r => ops.validate(r);
  return factory;
}

export const lightningPoolAdapter: Adapter = {
  id: 'lightning-pool',
  libraryVersion: readOwnPackageVersion(),

  scenarios: {
    acquireRelease(bench, poolSize) {
      let pool!: Pool<BenchResource>;
      bench.add(
        'acquire-release',
        async () => {
          const resource = await pool.acquire();
          await pool.releaseAsync(resource);
        },
        {
          beforeAll: async () => {
            pool = createPool(makeFactory(false), {
              max: poolSize,
              validation: false,
            });
            pool.start();
          },
          afterAll: async () => {
            await pool.closeAsync(0);
          },
        },
      );
    },

    acquireReleaseConcurrent(bench, poolSize, concurrency) {
      let pool!: Pool<BenchResource>;
      bench.add(
        'acquire-release-concurrent',
        async () => {
          await Promise.all(
            Array.from({ length: concurrency }, async () => {
              const resource = await pool.acquire();
              await pool.releaseAsync(resource);
            }),
          );
        },
        {
          beforeAll: async () => {
            pool = createPool(makeFactory(false), {
              max: poolSize,
              maxQueue: concurrency,
              validation: false,
            });
            pool.start();
          },
          afterAll: async () => {
            await pool.closeAsync(0);
          },
        },
      );
    },

    queueContention(bench, poolSize, concurrency) {
      let pool!: Pool<BenchResource>;
      bench.add(
        'queue-contention',
        async () => {
          await Promise.all(
            Array.from({ length: concurrency }, async () => {
              const resource = await pool.acquire();
              await pool.releaseAsync(resource);
            }),
          );
        },
        {
          beforeAll: async () => {
            pool = createPool(makeFactory(false), {
              max: poolSize,
              maxQueue: concurrency,
              validation: false,
            });
            pool.start();
          },
          afterAll: async () => {
            await pool.closeAsync(0);
          },
        },
      );
    },

    createDestroyChurn(bench, poolSize, concurrency) {
      let pool!: Pool<BenchResource>;
      bench.add(
        'create-destroy-churn',
        async () => {
          await Promise.all(
            Array.from({ length: concurrency }, async () => {
              const resource = await pool.acquire();
              await pool.destroyAsync(resource);
            }),
          );
        },
        {
          beforeAll: async () => {
            pool = createPool(makeFactory(false), {
              max: poolSize,
              maxQueue: concurrency,
              validation: false,
            });
            pool.start();
          },
          afterAll: async () => {
            await pool.closeAsync(0);
          },
        },
      );
    },

    validateOnBorrow(bench, poolSize, concurrency) {
      let pool!: Pool<BenchResource>;
      bench.add(
        'validate-on-borrow',
        async () => {
          await Promise.all(
            Array.from({ length: concurrency }, async () => {
              const resource = await pool.acquire();
              await pool.releaseAsync(resource);
            }),
          );
        },
        {
          beforeAll: async () => {
            pool = createPool(makeFactory(true), {
              max: poolSize,
              maxQueue: concurrency,
              validation: true,
            });
            pool.start();
          },
          afterAll: async () => {
            await pool.closeAsync(0);
          },
        },
      );
    },
  },
};
