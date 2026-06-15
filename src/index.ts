export function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Run directly: `pnpm dev` / `node dist/index.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(greet(process.argv[2] ?? 'world'));
}
