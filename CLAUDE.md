## Documentation sync markers

Hand-written reference docs (e.g. `docs/API.md`) that describe specific source files must carry a `doc-sync-marker`
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
already - `docs/API.md` was rewritten from a README section that had drifted from the actual `Pool` API for years).
Auto-generated docs (e.g. `docs/BENCHMARKS.md`) don't need this - they're regenerated wholesale by `pnpm run bench`/
`pnpm run bench:report`, never hand-edited.

## Handoff notes

A handoff note between sessions goes to `.claude/local/handoff.md` (git-ignored); a new session reads it first.
