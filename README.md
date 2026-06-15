# loopdeck

**Visualize and edit your [agent-scaffold](https://github.com/) autonomy YAML across a whole super-folder.**

`loopdeck` is a tiny local web UI for the config that drives Claude Code autonomy:
the `loops.yaml` files (scheduled producers/consumer) and the `.claude/agents` &
`.claude/skills` definitions. Run it from a monorepo root (e.g. `vakio-mono`) or
`~/Projects` and it discovers every project underneath — then lets you toggle, add,
edit and delete loops with **all your YAML comments preserved** and every change
shown as a diff before it's written.

> loopdeck only edits the declarative files. After editing, run `/loops apply` in
> Claude Code to reconcile the changes into `/schedule` cloud routines.

## Quick start

```bash
git clone https://github.com/Jeibniz/loopdeck.git
cd loopdeck
pnpm install
pnpm build

# from the super-folder you want to manage:
cd ~/Projects        # or vakio-mono, etc.
node /path/to/loopdeck/dist/cli.js
```

Or, during development, from the loopdeck repo:

```bash
pnpm build && node dist/cli.js --root ~/Projects
```

It binds to `127.0.0.1` on a free port (near 4317), prints the URL, and opens your
browser.

### Options

```
loopdeck [--port <n>] [--root <dir>] [--no-open]
  --port <n>    Port to listen on (default: a free port near 4317)
  --root <dir>  Super-folder to scan (default: current directory)
  --no-open     Don't open the browser automatically
```

## What it does

- **Project list** — every directory under the root that has a `loops.yaml` or a
  `.claude/` dir, with stage, loop/agent/skill counts.
- **Loops table** — toggle `enabled`, add/edit/delete loops, change `stage`. Cron
  expressions are validated and shown in plain English; invalid crons are blocked.
  Every write previews a **diff you confirm** first.
- **Comment-preserving** — edits go through the [`yaml`](https://eemeli.org/yaml/)
  Document API, so your header comments, inline notes, blank lines, field order and
  folded block scalars survive. Unknown fields (`reviewer`, `routine`, `repo`, …)
  are **always preserved** and `routine` (owned by `/loops apply`) is never touched.
- **Agents & skills browser** — list, read, and **edit** agent/skill definitions:
  `name`, `description`, and the full Markdown body.
- **Ask Claude ✨** — describe a change in plain language and loopdeck calls your
  **local Claude Code CLI** (your existing subscription — no API key) to draft it:
  add/modify loops, or create/edit agents and skills. You always see and confirm the
  diff before anything is written.

## Safety

- **Local only.** Binds loopback (`127.0.0.1`); no network calls except the local
  `claude` CLI you invoke via "Ask Claude"; no auth surface.
- **Stays in the tree.** Every file path is realpath-checked to live under the
  scanned root; traversal attempts are rejected.
- **Atomic writes** (temp file + rename) and a staleness guard (409 if the file
  changed on disk since you loaded it).

## Develop

```bash
pnpm test         # vitest (round-trip / discover / validation / API)
pnpm typecheck
pnpm lint
pnpm build        # tsc (server) + esbuild (frontend bundle) → dist/
```

## Non-goals (v1)

Running or scheduling loops, talking to `/schedule`, GitHub/cloud calls, editing
`settings.json`/CI, ticket queues, multi-user/remote hosting, or a rich Markdown
editor. loopdeck edits the declarative files; everything else stays in Claude Code.

## License

MIT
