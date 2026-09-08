import * as genericPool from 'generic-pool';
import {
  getResourceCreateDelayMs,
  getResourceDestroyDelayMs,
} from '../config.js';
import { type BenchResource, createResourceOps } from '../resource.js';
import type { Adapter } from './adapter.js';
import { readInstalledVersion } from './pkg-version.js';

function makeFactory(withValidate: boolean) {
  const ops = createResourceOps({
    createDelayMs: getResourceCreateDelayMs(),
    destroyDelayMs: getResourceDestroyDelayMs(),
  });
  const factory: {
    create(): Promise<BenchResource>;
    destroy(r: BenchResource): Promise<void>;
    validate?(r: BenchResource): Promise<boolean>;
  } = {
    create: () => ops.create(),
    destroy: r => ops.destroy(r),
  };
  if (withValidate) factory.validate = r => ops.validate(r);
  return factory;
}

export const genericPoolAdapter: Adapter = {
  id: 'generic-pool',
  libraryVersion: readInstalledVersion('generic-pool'),

  scenarios: {
    acquireRelease(bench, poolSize) {
      let pool!: genericPool.Pool<BenchResource>;
      bench.add(
        'acquire-release',
        async () => {
          const resource = await pool.acquire();
          await pool.release(resource);
        },
        {
          beforeAll: async () => {
            pool = genericPool.createPool(makeFactory(false), {
              max: poolSize,
              min: 0,
              testOnBorrow: false,
            });
          },
          afterAll: async () => {
            await pool.drain();
            await pool.clear();
          },
        },
      );
    },

    acquireReleaseConcurrent(bench, poolSize, concurrency) {
      let pool!: genericPool.Pool<BenchResource>;
      bench.add(
        'acquire-release-concurrent',
        async () => {
          await Promise.all(
            Array.from({ length: concurrency }, async () => {
              const resource = await pool.acquire();
              await pool.release(resource);
            }),
          );
        },
        {
          beforeAll: async () => {
            pool = genericPool.createPool(makeFactory(false), {
              max: poolSize,
              min: 0,
              testOnBorrow: false,
            });
          },
          afterAll: async () => {
            await pool.drain();
            await pool.clear();
          },
        },
      );
    },

    queueContention(bench, poolSize, concurrency) {
      let pool!: genericPool.Pool<BenchResource>;
      bench.add(
        'queue-contention',
        async () => {
          await Promise.all(
            Array.from({ length: concurrency }, async () => {
              const resource = await pool.acquire();
              await pool.release(resource);
            }),
          );
        },
        {
          beforeAll: async () => {
            pool = genericPool.createPool(makeFactory(false), {
              max: poolSize,
              min: 0,
              testOnBorrow: false,
              maxWaitingClients: concurrency,
            });
          },
          afterAll: async () => {
            await pool.drain();
            await pool.clear();
          },
        },
      );
    },

    createDestroyChurn(bench, poolSize, concurrency) {
      let pool!: genericPool.Pool<BenchResource>;
      bench.add(
        'create-destroy-churn',
        async () => {
          await Promise.all(
            Array.from({ length: concurrency }, async () => {
              const resource = await pool.acquire();
              await pool.destroy(resource);
            }),
          );
        },
        {
          beforeAll: async () => {
            pool = genericPool.createPool(makeFactory(false), {
              max: poolSize,
              min: 0,
              testOnBorrow: false,
              maxWaitingClients: concurrency,
            });
          },
          afterAll: async () => {
            await pool.drain();
            await pool.clear();
          },
        },
      );
    },

    validateOnBorrow(bench, poolSize, concurrency) {
      let pool!: genericPool.Pool<BenchResource>;
      bench.add(
        'validate-on-borrow',
        async () => {
          await Promise.all(
            Array.from({ length: concurrency }, async () => {
              const resource = await pool.acquire();
              await pool.release(resource);
            }),
          );
        },
        {
          beforeAll: async () => {
            pool = genericPool.createPool(makeFactory(true), {
              max: poolSize,
              min: 0,
              testOnBorrow: true,
              maxWaitingClients: concurrency,
            });
          },
          afterAll: async () => {
            await pool.drain();
            await pool.clear();
          },
        },
      );
    },
  },
};
