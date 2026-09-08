import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  readInstalledVersion,
  readOwnPackageVersion,
} from '../adapters/pkg-version.js';
import { SCENARIO_NAMES, SCENARIOS } from '../scenarios/index.js';
import type { LibId, ScenarioName } from '../types.js';
import {
  groupByScenario,
  readResults,
  type ScenarioLibSummary,
  summarize,
} from './aggregate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BENCHMARK_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BENCHMARK_DIR, '..');
const RESULTS_DIR = path.join(BENCHMARK_DIR, 'results');
const OUTPUT_PATH = path.join(REPO_ROOT, 'doc', 'BENCHMARKS.md');

const LIB_LABELS: Record<LibId, string> = {
  'lightning-pool': 'lightning-pool',
  'generic-pool': 'generic-pool',
};

// Fixed chart order (not sorted by speed, unlike the table): lightning-pool's
// bar is always in the same position across every scenario's chart, so a
// reader scanning down BENCHMARKS.md can compare it scenario-to-scenario
// without hunting for it in a ranking that reshuffles per scenario.
const CHART_LIB_ORDER: LibId[] = ['lightning-pool', 'generic-pool'];

/**
 * GitHub's own heading-anchor rule: lowercase, drop everything that isn't
 * a word character/space/hyphen, spaces to hyphens - and when the same
 * slug repeats, later ones get "-1", "-2", ... appended.
 */
function slugify(text: string, seen: Map<string, number>): string {
  const base = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const n = seen.get(base) ?? 0;
  seen.set(base, n + 1);
  return n === 0 ? base : `${base}-${n}`;
}

/**
 * Builds the table of contents by reading back the headings of the document
 * that was just assembled, so it can't drift out of sync with what actually
 * got rendered. Fenced blocks are skipped so a "#" inside a mermaid chart
 * can never be mistaken for a heading.
 */
function renderIndex(markdown: string): string {
  const seen = new Map<string, number>();
  const entries: string[] = [];
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{2,3}) (.+)$/.exec(line);
    if (!m) continue;
    const text = m[2].trim();
    const indent = '  '.repeat(m[1].length - 2);
    entries.push(`${indent}- [${text}](#${slugify(text, seen)})`);
  }
  return ['## Contents', '', ...entries, ''].join('\n');
}

function renderMethodology(): string {
  return `## Methodology

These numbers are produced by \`benchmark/\` (run via \`npm run bench\`), comparing lightning-pool against [generic-pool](https://github.com/coopernurse/node-pool) driving an identical simulated resource (see \`benchmark/resource.ts\`) - no real database or socket involved, so the numbers isolate each pool's own bookkeeping and scheduling overhead rather than any backend's latency. See [benchmark/README.md](../benchmark/README.md) for how to reproduce them.

Each scenario is implemented once per library, using that library's own idiomatic API (lightning-pool's \`acquire\`/\`releaseAsync\`/\`destroyAsync\` vs. generic-pool's \`acquire\`/\`release\`/\`destroy\`), while both read the exact same pool-size/concurrency knobs from \`benchmark/scenarios/*.ts\`. Only the pooling mechanism varies, not the workload.

Each \`(library, scenario)\` pair runs in its own child process, spawned sequentially (never in parallel), to avoid CPU contention skewing numbers and to get clean, uncontaminated V8 JIT warm-up per run. The default matrix runs each pair \`--repeats=3\` times; the tables below report the **median across repeats**, with intra-run p75/p99 latency and ops/sec from tinybench's own sample statistics.

Each table also reports **GC (ms/op)** and **Peak Heap (KB)** - allocation pressure, not just wall-clock speed. GC (ms/op) is the total time spent in garbage collection during the run (observed via \`node:perf_hooks\`, every GC pause regardless of cause), divided by the number of timed samples. Peak Heap (KB) isn't a per-call figure: each worker process is started with \`--expose-gc\`, forces a clean GC immediately before the run to get a baseline \`heapUsed\`, then tracks the highest \`heapUsed\` seen at any point during the run - the most the heap ever grew above that baseline while running the whole scenario. Both include tinybench's own warmup iterations (it doesn't expose a hook at the boundary between warmup and the timed run).

By default every simulated resource's \`create()\`/\`destroy()\` resolves immediately (0ms) so the numbers measure pure pool overhead. Set \`BENCH_CREATE_DELAY_MS\`/\`BENCH_DESTROY_DELAY_MS\` to approximate a real backend's connection cost instead: \`BENCH_CREATE_DELAY_MS=5 npm run bench\`.

**Why GC/heap sampling needs a forced yield here.** Neither scenario does real I/O, so a pool whose hot path resolves entirely through chained \`Promise\`s (no timer/socket in between) can run its whole scenario without Node's event loop ever reaching a macrotask turn - and both \`node:perf_hooks\`' \`'gc'\` performance entries and a plain polling timer are only delivered/fire on such a turn. Left unpatched, this reads back as \`gcCount=0\`/\`peakHeap=0\` for whichever library's task happens to chain purely through microtasks, indistinguishable from genuinely zero allocation (confirmed directly: a raw, uninstrumented 2,000,000-iteration acquire/release loop reports zero for *both* libraries here, even though real GCs are demonstrably happening - inserting a periodic \`setImmediate\` yield in that same raw loop immediately surfaces hundreds of real GC events and tens of MB of real heap growth). \`benchmark/runner/worker.ts\`'s \`installPeriodicYield()\` fixes this at the source: it patches \`bench.add()\` to insert a real \`setImmediate\` yield (plus a heap sample) into the task's \`afterEach\` hook every 250 samples. tinybench's own time budget only accumulates the timed \`fn()\` duration, not hook time (see its \`Task\` internals), so this yield doesn't shrink the sample count or skew Mean/p75/p99/ops-per-sec - it only makes the whole run take a little longer in real wall-clock time, which is what makes GC (ms/op) and Peak Heap (KB) trustworthy enough to compare between libraries at all.

### Disclosed asymmetries

1. **Validation** - lightning-pool's \`validation\` option and generic-pool's \`testOnBorrow\` option are conceptually equivalent (both call \`factory.validate()\` before handing a resource out) but are each library's own native mechanism, not a shared shim.
2. **Queue depth** - generic-pool's \`maxWaitingClients\` and lightning-pool's \`maxQueue\` are each set to (at least) the scenario's concurrency so neither library ever rejects a request for being over capacity; the numbers measure queueing/scheduling cost, not admission-control behaviour.
3. **Resource shape** - both libraries pool the exact same plain \`{ id, destroyed }\` object (see \`benchmark/resource.ts\`), so no library gains or loses time doing work specific to a real resource type.
`;
}

function renderEnvironment(libVersions: Record<LibId, string>): string {
  const cpus = os.cpus();
  const totalMemGb = os.totalmem() / (1024 * 1024 * 1024);
  const lines = [
    `- Run date: ${new Date().toISOString()}`,
    `- Node.js: ${process.version}`,
    `- OS: ${os.type()} ${os.release()} (${process.platform}/${process.arch})`,
    `- CPU: ${cpus[0]?.model ?? 'unknown'} (${cpus.length} logical cores)`,
    `- RAM: ${totalMemGb.toFixed(1)} GB total`,
    `- Library versions (installed, not this repo's semver range): ` +
      `lightning-pool ${libVersions['lightning-pool']}, generic-pool ${libVersions['generic-pool']}`,
  ];
  return `## Environment\n\n${lines.join('\n')}\n`;
}

const HIGHER_IS_BETTER_COLOR = '#f2a900';

/** GitHub renders ```mermaid fences natively, so a chart here is plain
 * committed text - no image files to generate/regenerate/gitignore. */
function renderBarChart(
  summaries: ScenarioLibSummary[],
  opts: {
    title: string;
    unit: string;
    valueOf: (s: ScenarioLibSummary) => number;
    width?: number;
    height?: number;
    color?: string;
  },
): string {
  const byLib = new Map(summaries.map(s => [s.lib, s]));
  const ordered = CHART_LIB_ORDER.map(lib => byLib.get(lib)).filter(
    (s): s is ScenarioLibSummary => !!s,
  );
  const xAxis = ordered.map(s => LIB_LABELS[s.lib] ?? s.lib);
  const values = ordered.map(opts.valueOf);
  const bars = values.map(v => v.toFixed(4));
  // Without an explicit range, xychart-beta auto-scales the value axis to
  // fit the data tightly (roughly [min, max] of the bars, not anchored at
  // 0) - anchoring at 0 keeps bar length honestly proportional to actual
  // values instead of exaggerating a small real difference.
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const yAxisMin = (minValue < 0 ? minValue * 1.1 : 0).toFixed(4);
  const yAxisMax = (
    maxValue > 0 ? maxValue * 1.5 : minValue < 0 ? 0 : 1
  ).toFixed(4);
  const initParts = [
    `'xyChart': {'width': ${opts.width ?? 500}, 'height': ${opts.height ?? 260}, 'chartOrientation': 'horizontal'}`,
  ];
  if (opts.color) {
    initParts.push(
      `'themeVariables': {'xyChart': {'plotColorPalette': '${opts.color}'}}`,
    );
  }
  return [
    '```mermaid',
    `%%{init: {${initParts.join(', ')}}}%%`,
    'xychart-beta',
    `    title "${opts.title}"`,
    `    x-axis [${xAxis.map(x => JSON.stringify(x)).join(', ')}]`,
    `    y-axis "${opts.unit}" ${yAxisMin} --> ${yAxisMax}`,
    `    bar [${bars.join(', ')}]`,
    '```',
  ].join('\n');
}

function renderScenarioCharts(summaries: ScenarioLibSummary[]): string {
  const hasGc = summaries.some(s => s.medianGcDurationMs != null);
  const hasPeakHeap = summaries.some(s => s.medianPeakHeapGrowthBytes != null);
  const width = 600;
  const height = 300;

  const charts = [
    renderBarChart(summaries, {
      title: 'Mean latency (ms, lower is better)',
      unit: 'ms',
      width,
      height,
      valueOf: s => s.medianMean,
    }),
    renderBarChart(summaries, {
      title: 'Throughput (ops/sec, higher is better)',
      unit: 'ops/sec',
      width,
      height,
      valueOf: s => s.medianOpsPerSec,
      color: HIGHER_IS_BETTER_COLOR,
    }),
  ];
  if (hasGc) {
    charts.push(
      renderBarChart(summaries, {
        title: 'GC time (ms/op, lower is better)',
        unit: 'ms/op',
        width,
        height,
        valueOf: s => (s.medianGcDurationMs ?? 0) / s.medianSamples,
      }),
    );
  }
  if (hasPeakHeap) {
    charts.push(
      renderBarChart(summaries, {
        title: 'Peak heap growth (KB, max memory reached)',
        unit: 'KB',
        width,
        height,
        valueOf: s => (s.medianPeakHeapGrowthBytes ?? 0) / 1024,
      }),
    );
  }

  const cellStyle =
    'style="display:inline-block;width:430px;vertical-align:top;margin:4px;"';
  return (
    charts.map(c => `<div ${cellStyle}>\n\n${c}\n\n</div>`).join('\n') + '\n'
  );
}

function renderScenarioTable(
  scenarioName: ScenarioName,
  summaries: ScenarioLibSummary[],
): string {
  const meta = SCENARIOS[scenarioName];
  const sorted = [...summaries].sort((a, b) => a.medianMean - b.medianMean);
  const slowest = sorted[sorted.length - 1];
  const params = sorted[0]?.runs[0]?.params ?? {};
  const paramsText = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

  const rowData = sorted.map(s => {
    const mult =
      slowest && slowest.medianMean > 0 ? slowest.medianMean / s.medianMean : 1;
    const gcMsPerOp =
      s.medianGcDurationMs != null
        ? s.medianGcDurationMs / s.medianSamples
        : null;
    const peakHeapKb =
      s.medianPeakHeapGrowthBytes != null
        ? s.medianPeakHeapGrowthBytes / 1024
        : null;
    return {
      label: LIB_LABELS[s.lib] ?? s.lib,
      version: s.libraryVersion,
      mean: s.medianMean,
      p75: s.medianP75,
      p99: s.medianP99,
      opsPerSec: s.medianOpsPerSec,
      mult,
      gcMsPerOp,
      peakHeapKb,
    };
  });

  const definedOrNull = (values: (number | null)[]): number | null => {
    const defined = values.filter((v): v is number => v != null);
    return defined.length ? Math.min(...defined) : null;
  };
  const shouldBold = rowData.length > 1;
  const bestMean = Math.min(...rowData.map(r => r.mean));
  const bestP75 = Math.min(...rowData.map(r => r.p75));
  const bestP99 = Math.min(...rowData.map(r => r.p99));
  const bestOpsPerSec = Math.max(...rowData.map(r => r.opsPerSec));
  const bestMult = Math.max(...rowData.map(r => r.mult));
  const bestGcMsPerOp = definedOrNull(rowData.map(r => r.gcMsPerOp));
  const bestPeakHeapKb = definedOrNull(rowData.map(r => r.peakHeapKb));
  const boldIfBest = (formatted: string, value: number, best: number) =>
    shouldBold && value === best ? `***${formatted}***` : formatted;

  const rows = rowData.map(r => {
    const meanStr = boldIfBest(r.mean.toFixed(4), r.mean, bestMean);
    const p75Str = boldIfBest(r.p75.toFixed(4), r.p75, bestP75);
    const p99Str = boldIfBest(r.p99.toFixed(4), r.p99, bestP99);
    const opsStr = boldIfBest(
      r.opsPerSec.toFixed(1),
      r.opsPerSec,
      bestOpsPerSec,
    );
    const multStr = boldIfBest(`${r.mult.toFixed(2)}x`, r.mult, bestMult);
    const gcStr =
      r.gcMsPerOp != null
        ? boldIfBest(r.gcMsPerOp.toFixed(4), r.gcMsPerOp, bestGcMsPerOp ?? NaN)
        : '—';
    const peakHeapStr =
      r.peakHeapKb != null
        ? boldIfBest(
            r.peakHeapKb.toFixed(2),
            r.peakHeapKb,
            bestPeakHeapKb ?? NaN,
          )
        : '—';
    return (
      `| ${r.label} (${r.version}) | ${meanStr} | ${p75Str} | ${p99Str} | ` +
      `${opsStr} | ${multStr} | ${gcStr} | ${peakHeapStr} |`
    );
  });
  const unsupportedRows = Object.entries(meta.unsupportedLibs ?? {}).map(
    ([lib, reason]) => {
      const label = LIB_LABELS[lib as LibId] ?? lib;
      return `| ${label} | ${reason} | — | — | — | — | — | — |`;
    },
  );

  return [
    `## ${meta.title}`,
    '',
    meta.description + (paramsText ? ` (${paramsText})` : ''),
    '',
    '| Library | Mean (ms) | p75 (ms) | p99 (ms) | ops/sec | vs. slowest | GC (ms/op) | Peak Heap (KB) |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...rows,
    ...unsupportedRows,
    '',
    renderScenarioCharts(summaries),
  ].join('\n');
}

/**
 * Regenerates doc/BENCHMARKS.md from whatever is currently in
 * benchmark/results/*.json. Called automatically by the orchestrator at the
 * end of `npm run bench`, and importable/callable standalone via
 * `npm run bench:report` (see the CLI entry point at the bottom of this
 * file) to regenerate the doc from existing results without re-running the
 * whole matrix.
 */
export function generateBenchmarksMarkdown(): void {
  const results = readResults(RESULTS_DIR);
  if (results.length === 0) {
    throw new Error(
      'No results found in benchmark/results/. Run `npm run bench` first.',
    );
  }

  const summaries = summarize(results);
  const byScenario = groupByScenario(summaries);

  const libVersions: Record<LibId, string> = {
    'lightning-pool': readOwnPackageVersion(),
    'generic-pool': readInstalledVersion('generic-pool'),
  };

  const sections: string[] = [
    '# lightning-pool Benchmarks',
    '',
    '_Generated automatically by `npm run bench` (or standalone via `npm run bench:report`). Do not hand-edit — re-run one of those instead._',
    '',
    renderMethodology(),
    renderEnvironment(libVersions),
  ];

  for (const scenarioName of SCENARIO_NAMES) {
    const scenarioSummaries = byScenario.get(scenarioName);
    if (!scenarioSummaries || scenarioSummaries.length === 0) continue;
    sections.push(renderScenarioTable(scenarioName, scenarioSummaries));
  }

  sections.push(
    '## Raw data',
    '',
    'Backing raw data for the numbers above lives in `benchmark/results/*.json` ' +
      '(gitignored; regenerate with `npm run bench`).',
    '',
  );

  const body = sections.join('\n');
  const titleBlock = [
    '# lightning-pool Benchmarks',
    '',
    '_Generated automatically by `npm run bench` (or standalone via `npm run bench:report`). Do not hand-edit — re-run one of those instead._',
    '',
  ].join('\n');
  const output =
    titleBlock + '\n' + renderIndex(body) + body.slice(titleBlock.length);

  fs.writeFileSync(OUTPUT_PATH, output);
  console.log(`Wrote ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
}

// Only auto-run when this file is the process entry point (`npm run
// bench:report`), not when generateBenchmarksMarkdown() is imported and
// called explicitly (e.g. by runner/orchestrator.ts at the end of a
// `npm run bench` run).
if (import.meta.url === `file://${process.argv[1]}`) {
  generateBenchmarksMarkdown();
}
