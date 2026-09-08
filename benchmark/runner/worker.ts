import * as fs from 'node:fs';
import * as path from 'node:path';
import { PerformanceObserver } from 'node:perf_hooks';
import process from 'node:process';
import { Bench } from 'tinybench';
import { isLibId, loadAdapter } from '../adapters/registry.js';
import {
  ACQUIRE_RELEASE_CONCURRENT_CONCURRENCY,
  ACQUIRE_RELEASE_CONCURRENT_POOL_SIZE,
  ACQUIRE_RELEASE_POOL_SIZE,
  CREATE_DESTROY_CHURN_CONCURRENCY,
  CREATE_DESTROY_CHURN_POOL_SIZE,
  isScenarioName,
  QUEUE_CONTENTION_CONCURRENCY,
  QUEUE_CONTENTION_POOL_SIZE,
  SCENARIOS,
  VALIDATE_ON_BORROW_CONCURRENCY,
  VALIDATE_ON_BORROW_POOL_SIZE,
} from '../scenarios/index.js';
import type { BenchResult, LibId, ScenarioName } from '../types.js';

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(arg);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

interface GcStats {
  gcCount?: number;
  gcDurationMs?: number;
  peakHeapGrowthBytes?: number;
}

// How often to sample heapUsed opportunistically while the run is in
// flight. Kept as a secondary, best-effort source of extra resolution
// around whatever real event-loop turns naturally happen - see
// installPeriodicYield() below for the mechanism that actually GUARANTEES
// at least some turns happen, which this alone cannot.
const HEAP_SAMPLE_INTERVAL_MS = 1;

// A benchmarked task whose entire call chain resolves through microtasks
// (chained Promises, no timer/socket in between - true for both adapters
// here once resources are already idle and reusable) can run for its whole
// scenario without Node's event loop ever reaching a macrotask turn. Both
// node:perf_hooks' 'gc' PerformanceObserver entries and a plain
// setInterval-based heap sampler are only delivered/fire on such a turn, so
// without this, a fast, allocation-light-per-call library and a genuinely
// zero-allocation one are indistinguishable - both silently read back as
// gcCount=0/peakHeapGrowthBytes=0, which looks like (but is not evidence
// of) "no allocation". Confirmed directly: a raw 2,000,000-iteration
// acquire/release loop with no forced yields reports zero for both
// lightning-pool and generic-pool; inserting a periodic yield in that same
// raw loop immediately surfaces hundreds of real GC events and tens of MB
// of real heap growth for either one.
//
// tinybench's own per-sample time budget only accumulates the timed fn()
// duration (see Task.#m in tinybench's source), not hook time, so a
// beforeEach/afterEach hook's own await does not shrink the sample count -
// it only makes the whole run take a bit longer in real wall-clock time,
// which is the acceptable side of this trade-off.
const YIELD_EVERY_N_SAMPLES = 250;

function installPeriodicYield(bench: Bench, onYield: () => Promise<void>) {
  const originalAdd = bench.add.bind(bench);
  (bench as { add: typeof bench.add }).add = ((
    name: string,
    fn: () => unknown,
    opts: Record<string, unknown> = {},
  ) => {
    let sinceYield = 0;
    const userAfterEach = opts.afterEach as
      ((...a: unknown[]) => unknown) | undefined;
    return originalAdd(name, fn as never, {
      ...opts,
      afterEach: async function (this: unknown, ...a: unknown[]) {
        if (userAfterEach) await userAfterEach.apply(this, a);
        if (++sinceYield >= YIELD_EVERY_N_SAMPLES) {
          sinceYield = 0;
          await onYield();
        }
      },
    });
  }) as typeof bench.add;
}

/**
 * Sets up GC/heap instrumentation on `bench` BEFORE any task is registered
 * on it (so installPeriodicYield's patched `add` is in place first) and
 * returns a function to call after `bench.run()` completes to collect the
 * stats. A PerformanceObserver counts every GC pause (and its duration)
 * during the call; this part works regardless of --expose-gc.
 * peakHeapGrowthBytes forces a clean baseline via global.gc() immediately
 * before the run, then tracks the highest heapUsed seen across both the
 * opportunistic interval sampler and the guaranteed per-N-samples yield
 * above - the most the heap ever grew above that baseline at any point
 * during the run. Only populated when the process was started with
 * --expose-gc (see orchestrator.ts); without it global.gc is undefined and
 * peakHeapGrowthBytes comes back undefined.
 */
function instrumentGc(bench: Bench): () => GcStats {
  const gc = (global as { gc?: () => void }).gc;
  let gcCount = 0;
  let gcDurationMs = 0;
  const observer = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      gcCount++;
      gcDurationMs += entry.duration;
    }
  });
  observer.observe({ entryTypes: ['gc'] });

  const heapBefore = gc ? (gc(), process.memoryUsage().heapUsed) : undefined;
  let peakHeapUsed = heapBefore ?? process.memoryUsage().heapUsed;
  const sample = () => {
    const current = process.memoryUsage().heapUsed;
    if (current > peakHeapUsed) peakHeapUsed = current;
  };
  const sampler = setInterval(sample, HEAP_SAMPLE_INTERVAL_MS);
  sampler.unref();

  installPeriodicYield(bench, async () => {
    await new Promise<void>(resolve => setImmediate(resolve));
    sample();
  });

  return () => {
    clearInterval(sampler);
    observer.disconnect();
    return {
      gcCount,
      gcDurationMs,
      peakHeapGrowthBytes:
        heapBefore != null ? Math.max(peakHeapUsed - heapBefore, 0) : undefined,
    };
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const libArg = args.lib;
  const scenarioArg = args.scenario;
  const run = args.run ? parseInt(args.run, 10) : 1;
  const resultsDir = args.resultsDir;

  if (!libArg || !isLibId(libArg)) {
    throw new Error(`Invalid or missing --lib "${libArg}"`);
  }
  if (!scenarioArg || !isScenarioName(scenarioArg)) {
    throw new Error(`Invalid or missing --scenario "${scenarioArg}"`);
  }
  if (!resultsDir) throw new Error('Missing --resultsDir');

  const lib: LibId = libArg;
  const scenarioName: ScenarioName = scenarioArg;
  const meta = SCENARIOS[scenarioName];

  const adapter = await loadAdapter(lib);
  const bench = new Bench({
    time: meta.bench.time,
    iterations: meta.bench.iterations,
    warmupTime: meta.bench.warmupTime,
    warmupIterations: meta.bench.warmupIterations,
    throws: true,
  });
  // Must run before any adapter.scenarios.xxx() call below, since those
  // call bench.add() internally and instrumentGc() patches bench.add to
  // inject its periodic-yield hook into whatever task gets registered.
  const collectGcStats = instrumentGc(bench);

  const params: Record<string, unknown> = {};
  switch (scenarioName) {
    case 'acquire-release':
      adapter.scenarios.acquireRelease(bench, ACQUIRE_RELEASE_POOL_SIZE);
      params.poolSize = ACQUIRE_RELEASE_POOL_SIZE;
      break;
    case 'acquire-release-concurrent':
      adapter.scenarios.acquireReleaseConcurrent(
        bench,
        ACQUIRE_RELEASE_CONCURRENT_POOL_SIZE,
        ACQUIRE_RELEASE_CONCURRENT_CONCURRENCY,
      );
      params.poolSize = ACQUIRE_RELEASE_CONCURRENT_POOL_SIZE;
      params.concurrency = ACQUIRE_RELEASE_CONCURRENT_CONCURRENCY;
      break;
    case 'queue-contention':
      adapter.scenarios.queueContention(
        bench,
        QUEUE_CONTENTION_POOL_SIZE,
        QUEUE_CONTENTION_CONCURRENCY,
      );
      params.poolSize = QUEUE_CONTENTION_POOL_SIZE;
      params.concurrency = QUEUE_CONTENTION_CONCURRENCY;
      break;
    case 'create-destroy-churn':
      adapter.scenarios.createDestroyChurn(
        bench,
        CREATE_DESTROY_CHURN_POOL_SIZE,
        CREATE_DESTROY_CHURN_CONCURRENCY,
      );
      params.poolSize = CREATE_DESTROY_CHURN_POOL_SIZE;
      params.concurrency = CREATE_DESTROY_CHURN_CONCURRENCY;
      break;
    case 'validate-on-borrow':
      adapter.scenarios.validateOnBorrow(
        bench,
        VALIDATE_ON_BORROW_POOL_SIZE,
        VALIDATE_ON_BORROW_CONCURRENCY,
      );
      params.poolSize = VALIDATE_ON_BORROW_POOL_SIZE;
      params.concurrency = VALIDATE_ON_BORROW_CONCURRENCY;
      break;
  }

  await bench.run();
  const gcStats = collectGcStats();

  const task = bench.tasks[0];
  const result = task?.result;
  if (!result || result.state !== 'completed') {
    const errorMessage =
      result && result.state === 'errored' ? result.error.message : undefined;
    throw new Error(
      `Benchmark task did not complete for ${lib}/${scenarioName} ` +
        `(state=${result?.state ?? 'unknown'})` +
        (errorMessage ? `: ${errorMessage}` : ''),
    );
  }

  const benchResult: BenchResult = {
    lib,
    libraryVersion: adapter.libraryVersion,
    scenario: scenarioName,
    run,
    stats: {
      mean: result.latency.mean,
      p75: result.latency.p75,
      p99: result.latency.p99,
      opsPerSec: result.throughput.mean,
      samples: result.latency.samplesCount,
      ...gcStats,
    },
    params,
    timestamp: new Date().toISOString(),
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };

  fs.mkdirSync(resultsDir, { recursive: true });
  const filePath = path.join(
    resultsDir,
    `${scenarioName}__${lib}__${run}.json`,
  );
  fs.writeFileSync(filePath, JSON.stringify(benchResult, null, 2));

  const peakHeapText =
    gcStats.peakHeapGrowthBytes != null
      ? `${(gcStats.peakHeapGrowthBytes / 1024).toFixed(1)}KB`
      : 'n/a';
  console.log(
    `[${lib}/${scenarioName} run ${run}] ` +
      `mean=${result.latency.mean.toFixed(3)}ms ` +
      `p75=${result.latency.p75.toFixed(3)}ms ` +
      `p99=${result.latency.p99.toFixed(3)}ms ` +
      `ops/sec=${result.throughput.mean.toFixed(1)} ` +
      `samples=${result.latency.samplesCount} ` +
      `gc=${gcStats.gcCount}/${gcStats.gcDurationMs?.toFixed(1)}ms ` +
      `peakHeap=${peakHeapText}`,
  );

  // A pool that leaves a stray timer/handle behind even after being closed
  // would otherwise keep this one-shot worker process alive indefinitely.
  // The benchmark and its result file are already complete at this point,
  // so exit explicitly rather than wait for the event loop to drain.
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
