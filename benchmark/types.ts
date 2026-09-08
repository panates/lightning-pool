export type LibId = 'lightning-pool' | 'generic-pool';

export type ScenarioName =
  | 'acquire-release'
  | 'acquire-release-concurrent'
  | 'queue-contention'
  | 'create-destroy-churn'
  | 'validate-on-borrow';

export interface ScenarioMeta {
  readonly name: ScenarioName;
  /** Human-readable display name, used in BENCHMARKS.md headings. */
  readonly title: string;
  readonly description: string;
  /**
   * tinybench run options for this scenario. Kept modest by default so a
   * full `npm run bench` finishes in a reasonable time; see
   * benchmark/README.md for how to raise rigor for a "real" run.
   */
  readonly bench: {
    readonly time: number;
    readonly iterations: number;
    readonly warmupTime: number;
    readonly warmupIterations: number;
  };
  /**
   * Libraries this scenario doesn't (fully) support, mapped to a short
   * label shown in BENCHMARKS.md instead of a results row. The orchestrator
   * skips running these (lib, scenario) pairs entirely instead of spawning
   * and letting them fail.
   */
  readonly unsupportedLibs?: Partial<Record<LibId, string>>;
}

export interface BenchResultStats {
  mean: number;
  p75: number;
  p99: number;
  opsPerSec: number;
  samples: number;
  /**
   * GC activity observed (via node:perf_hooks) during the bench.run() call
   * that produced this result - includes tinybench's own warmup iterations,
   * not just the timed ones, since tinybench doesn't expose a hook at the
   * boundary between them. gcCount/gcDurationMs are totals for the whole
   * run, always populated (observing GC events doesn't need --expose-gc).
   * peakHeapGrowthBytes is the highest heapUsed observed at any point while
   * bench.run() was executing, minus a heapUsed baseline captured right
   * before it via a *forced* global.gc() - the most the heap ever grew
   * above a clean starting point during the run. Only populated when the
   * worker process was started with --expose-gc (the orchestrator always
   * does this).
   */
  gcCount?: number;
  gcDurationMs?: number;
  peakHeapGrowthBytes?: number;
}

export interface BenchResult {
  lib: LibId;
  libraryVersion: string;
  scenario: ScenarioName;
  run: number;
  stats: BenchResultStats;
  params: Record<string, unknown>;
  timestamp: string;
  node: {
    version: string;
    platform: string;
    arch: string;
  };
}
