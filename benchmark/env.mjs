// Preload step for worker.ts child processes (see runner/orchestrator.ts).
//
// @swc-node/register only picks up this directory's own tsconfig.json when
// TS_NODE_PROJECT is set *before* @swc-node/register/esm-register
// initializes, so it must be pointed to explicitly here rather than relying
// on auto-discovery. This file is passed as an earlier `--import` than the
// register hook itself, the same two-step trick `.mocharc.cjs` uses.
process.env.TS_NODE_PROJECT = new URL(
  './tsconfig.json',
  import.meta.url,
).pathname;
