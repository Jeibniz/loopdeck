# Domain: local-server safety (loopback bind · path traversal · atomic write · staleness)

- **Last updated:** 2026-06-15 **Overall confidence:** high (established Node patterns; not high-stakes)

## Summary

loopdeck is a local-only tool that reads/writes files under a user-chosen super-folder. The safety surface is small but real: bind loopback only, never let a request path escape the root, write files atomically, and detect concurrent external edits. These are standard Node patterns — no novel research needed; documented here so the build doesn't reinvent or skip them.

## Key facts / rules

- **Bind loopback only:** start the server on host `127.0.0.1` (Fastify `listen({ host: '127.0.0.1', port })`), never `0.0.0.0`. No auth is needed precisely because nothing off-host can reach it. _Source:_ Fastify `listen` docs https://fastify.dev/docs/latest/Reference/Server/#listen (2026-06-15). _Confidence:_ high.
- **Path-traversal guard (under-root):** for every path from a request, resolve and verify it stays under the super-folder root. Use `fs.realpath` (follows symlinks) then check the resolved path starts with `root + path.sep` (or `=== root`). Reject `..`, absolute paths outside root, and symlinks pointing outside with `403`. _Source:_ Node `fs.realpath` https://nodejs.org/api/fs.html#fspromisesrealpathpath-options, `path.resolve`/`path.relative` https://nodejs.org/api/path.html (2026-06-15). _Confidence:_ high.
- **Atomic write (no torn files):** write to a sibling temp file in the **same directory** then `fs.rename` over the target — `rename` is atomic on the same filesystem, so a crash mid-write never truncates the real config. _Source:_ Node `fs.rename` https://nodejs.org/api/fs.html#fspromisesrenameoldpath-newpath; POSIX rename atomicity (2026-06-15). _Confidence:_ high.
- **Staleness guard:** capture the file's `mtimeMs` (or a content hash) on GET; include it in the PUT; re-`stat`/re-read before writing and reject with **409** if it changed underneath (user edited it in Claude Code meanwhile). _Source:_ Node `fs.stat` https://nodejs.org/api/fs.html#fspromisesstatpath-options (2026-06-15). _Confidence:_ high.
- **Don't follow symlinked directories during scan**, and dedupe files by `realpath` — the scaffold symlinks `.claude` across projects so the same file appears many times; track visited dir realpaths to avoid cycles. _Source:_ [[loops-schema]] (scaffold symlink behavior) + Node `fs.realpath` (2026-06-15). _Confidence:_ high.

## Design implications for loopdeck

- One `paths.ts` helper: `assertUnderRoot(root, candidate)` → realpath + prefix check, throws a 403-mapped error.
- One `atomicWrite(path, text)`: tmp-in-same-dir + rename, preserving file mode.
- Scan walker keeps `Set<realpath>` for both files (dedupe) and dirs (cycle guard).

## Open / needs confirmation

- (none — standard patterns.)

## Sources

- https://fastify.dev/docs/latest/Reference/Server/#listen — Fastify listen/host (primary) · 2026-06-15
- https://nodejs.org/api/fs.html (realpath, rename, stat) · https://nodejs.org/api/path.html — Node core (primary) · 2026-06-15
