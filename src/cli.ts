#!/usr/bin/env node
// loopdeck CLI — start the local web UI for the current super-folder.
// Binds loopback only (docs/domain/local-server-safety.md), finds a free port,
// and opens the browser. Run from a monorepo root like vakio-mono or ~/Projects.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import getPort from 'get-port';
import open from 'open';
import { buildApp } from './server/app.js';

interface Args {
  port?: number;
  open: boolean;
  root: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { open: true, root: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-open') args.open = false;
    else if (a === '--port') args.port = Number(argv[++i]);
    else if (a === '--root') args.root = resolve(argv[++i] ?? '.');
    else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`loopdeck — visualize & edit your agent-scaffold autonomy YAML

Usage: loopdeck [options]   (run from a super-folder)

Options:
  --port <n>    Port to listen on (default: a free port near 4317)
  --root <dir>  Super-folder to scan (default: current directory)
  --no-open     Don't open the browser automatically
  -h, --help    Show this help`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const staticDir = resolve(__dirname, 'public');

  const app = buildApp({ root: args.root, staticDir });
  const port = args.port ?? (await getPort({ port: [4317, 4318, 4319, 4320] }));

  await app.listen({ host: '127.0.0.1', port });
  const url = `http://127.0.0.1:${port}`;
  console.log(`\n  ◇ loopdeck — scanning ${args.root}`);
  console.log(`  → ${url}\n  (Ctrl-C to stop)\n`);
  if (args.open) await open(url).catch(() => {});

  const shutdown = (): void => {
    void app.close().then(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('loopdeck failed to start:', err);
  process.exit(1);
});
