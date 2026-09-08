# lightning-pool Benchmarks

Compares lightning-pool against [generic-pool](https://github.com/coopernurse/node-pool)
driving an identical simulated resource, so the numbers isolate each pool's
own bookkeeping/scheduling overhead rather than any real backend's latency.
For the methodology and the latest generated numbers, see
[`doc/BENCHMARKS.md`](../doc/BENCHMARKS.md) - it is regenerated automatically
at the end of every `npm run bench` (or standalone via `npm run bench:report`),
not hand-edited.

This replaces the older ad hoc `benchmark-tests/` script (removed), structured
after the benchmark harness in
[postgrejs](https://github.com/panates/postgrejs): per-scenario adapters, one
child process per (library, scenario, run) for clean measurements, and a
generated Markdown report with charts.

## Running

No external services needed - every scenario pools a simulated in-memory
resource (`benchmark/resource.ts`).

```bash
# Full default matrix: every scenario, every library, 3 repeats each
npm run bench

# Fast iteration while developing a scenario/adapter
npm run bench -- --scenario=queue-contention --lib=lightning-pool --repeats=1

# Regenerate doc/BENCHMARKS.md from existing benchmark/results/*.json
# without re-running the matrix (npm run bench already does this automatically)
npm run bench:report
```

`--scenario=` and `--lib=` accept `all` (default), `none`, or a
comma-separated subset (a leading/trailing `*` matches by prefix/suffix).
Scenario names: `acquire-release`, `acquire-release-concurrent`,
`queue-contention`, `create-destroy-churn`, `validate-on-borrow`.
Library ids: `lightning-pool`, `generic-pool`.

Each `(library, scenario)` pair runs in its own child process, spawned one at
a time - never in parallel - so CPU contention on your machine doesn't skew
the numbers. Results land in `benchmark/results/*.json` (gitignored raw data
backing whatever `doc/BENCHMARKS.md` currently reports).

## Rigor vs. speed

The default iteration/warmup/repeat counts are kept modest on purpose, so a
full `npm run bench` run finishes in well under a minute - this is a tool
meant to be run repeatedly during development, not just once. For numbers
you intend to publish or cite:

- Raise `--repeats` (e.g. `--repeats=10`) - the report uses the median across
  repeats, so more repeats means a more defensible median.
- Run on an otherwise-idle machine.
- Per-scenario iteration/warmup/time budgets live in `benchmark/scenarios/*.ts`
  (the `bench` field of each `*_SCENARIO` export) if you want to raise them
  for a specific scenario rather than just repeating the whole matrix more.
- Set `BENCH_CREATE_DELAY_MS`/`BENCH_DESTROY_DELAY_MS` to approximate a real
  backend's connection cost instead of the default 0ms simulated resource.

## Adding a scenario or adapter

- Shared pool-size/concurrency constants and the `ScenarioMeta` for a
  scenario live in `benchmark/scenarios/<name>.ts`; register it in
  `benchmark/scenarios/index.ts` and wire its params into
  `benchmark/runner/worker.ts`'s switch.
- Each library implements the scenario in its own adapter
  (`benchmark/adapters/<lib>.adapter.ts`) using whatever calling convention
  is idiomatic for that library against the `Adapter` interface in
  `benchmark/adapters/adapter.ts`.
- `benchmark/adapters/registry.ts` is a dynamic-import map from library id to
  adapter module, so a new adapter can be added without touching the default
  matrix.
