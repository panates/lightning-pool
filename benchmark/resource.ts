/**
 * A library-agnostic stand-in for whatever a real pooled resource would be
 * (a DB connection, a socket). Each adapter wraps the same create/destroy/
 * validate operations in its own library's factory shape, so every (lib,
 * scenario) pair pools an identical workload - only the pooling mechanism
 * varies, not what's being pooled.
 */
export interface BenchResource {
  id: number;
  destroyed: boolean;
}

export interface ResourceOps {
  create(): Promise<BenchResource>;
  destroy(resource: BenchResource): Promise<void>;
  validate(resource: BenchResource): Promise<boolean>;
}

function delay(ms: number): Promise<void> {
  return ms > 0
    ? new Promise(resolve => setTimeout(resolve, ms))
    : Promise.resolve();
}

/**
 * Builds a fresh, independently-counting set of resource operations - call
 * this once per pool instance (each scenario's beforeAll) rather than
 * sharing one across pools, so `created` reflects only that pool's own
 * lifetime.
 */
export function createResourceOps(opts: {
  createDelayMs?: number;
  destroyDelayMs?: number;
}): ResourceOps {
  let created = 0;
  return {
    async create(): Promise<BenchResource> {
      await delay(opts.createDelayMs ?? 0);
      return { id: ++created, destroyed: false };
    },
    async destroy(resource: BenchResource): Promise<void> {
      await delay(opts.destroyDelayMs ?? 0);
      resource.destroyed = true;
    },
    async validate(resource: BenchResource): Promise<boolean> {
      return !resource.destroyed;
    },
  };
}
