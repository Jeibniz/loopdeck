# 0003. Local loopback web UI; small TS stack; run-from-clone for v1

- **Date:** 2026-06-15
- **Status:** accepted

## Context

loopdeck must be "quick, easy to use," visual, and runnable from a super-folder, while only ever touching local files. It reads/writes config but performs no network or cloud actions. See [[local-server-safety]].

## Decision

- **Local web UI** launched by a CLI (`pnpm start` / `node dist/cli.js`; npm `npx` deferred). Server bound to `127.0.0.1` only; opens the browser.
- **Stack:** TypeScript built with `tsup`/esbuild; **Fastify** + `@fastify/static`; `yaml@^2.8`; `cron-parser@^5.5` (validator, `strict` off) + `cronstrue@^3.14` (display); **vanilla-TS frontend, no framework**, bundled, **no CDN/network at runtime**. See [[cron-libraries]].
- **Distribution:** run from the public `Jeibniz/loopdeck` clone for v1; npm publish is out of scope (revisit later).
- **Safety:** under-root realpath guard, atomic writes, 409 staleness, scan dedupes symlinked `.claude` by realpath and doesn't follow symlinked dirs.

## Consequences

- Zero account/token required to use it; clone + `pnpm i && pnpm start`.
- No auth needed (loopback only). No outward-facing surface except the one-time repo creation.
- Vanilla frontend keeps deps tiny but means hand-rolled views (acceptable: list + table + 2 modals).

## Alternatives considered

- **Publish to npm now:** deferred — adds an account/token dependency for marginal v1 benefit.
- **TUI / CLI-only:** rejected — weaker on the "visualize" goal.
- **React/Vue frontend:** rejected — overkill for the surface; pulls in a toolchain.
