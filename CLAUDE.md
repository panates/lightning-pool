## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Documentation sync markers

Hand-written reference docs (e.g. `doc/API.md`) that describe specific source files must carry a `doc-sync-marker`
HTML comment near the top, recording the version/commit they were last verified against and which source paths they
describe:

```html
<!--
doc-sync-marker:
  verified_version: <package.json version at verified_commit>
  verified_commit: <full git commit hash>
  source_paths: <space/comma-separated list of the source files this doc describes>
-->
```

Before trusting or editing such a doc in a session:
1. Run `git rev-parse HEAD` and compare it to the doc's `verified_commit`.
2. If they differ, run `git log --oneline <verified_commit>..HEAD -- <source_paths>` to see what changed in the
   files the doc describes (and diff those files directly if needed).
3. Update the doc's content to match, then update `verified_version`/`verified_commit` in the marker to the new
   HEAD before committing.

This keeps hand-written docs from silently drifting out of sync with the code they document (this happened once
already - `doc/API.md` was rewritten from a README section that had drifted from the actual `Pool` API for years).
Auto-generated docs (e.g. `doc/BENCHMARKS.md`) don't need this - they're regenerated wholesale by `npm run bench`/
`npm run bench:report`, never hand-edited.
