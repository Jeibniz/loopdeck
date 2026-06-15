// Flat ESLint config (ESLint 9+). TypeScript-aware, minimal and unopinionated.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Inline global maps (avoids a `globals` dependency for this small surface).
const browserGlobals = {
  document: 'readonly',
  window: 'readonly',
  fetch: 'readonly',
  Response: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  Node: 'readonly',
  HTMLElement: 'readonly',
  HTMLInputElement: 'readonly',
  HTMLTextAreaElement: 'readonly',
  HTMLSelectElement: 'readonly',
};
const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  __dirname: 'readonly',
};

export default tseslint.config(
  // .claude/** is vendored scaffold config (workflow scripts use injected globals);
  // dist is built output. Neither is our source to lint.
  { ignores: ['dist', 'node_modules', '.claude'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['src/public/**/*.ts'], languageOptions: { globals: browserGlobals } },
  { files: ['scripts/**/*.{js,mjs}', '*.{js,mjs}'], languageOptions: { globals: nodeGlobals } },
);
