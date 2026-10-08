// Legend:  [TWEAK] = safe to change   [CAREFUL] = changeable, but read the note   [LOCKED] = do not touch

// [LOCKED] ESLint's own helper that merges config blocks in order (later blocks override earlier ones).
import { defineConfig } from 'eslint/config';
// [LOCKED] ESLint's built-in recommended rules.
import js from '@eslint/js';
// [LOCKED] Lists of global names per environment (browser, node) so ESLint knows `window`, `process`, etc. exist.
import globals from 'globals';
// [LOCKED] TypeScript support for ESLint (parser + rules).
import ts from 'typescript-eslint';
// [LOCKED] Svelte support for ESLint (parser + rules).
import svelte from 'eslint-plugin-svelte';
// [LOCKED] The Svelte config, so ESLint knows runes mode is on.
import svelteConfig from './svelte.config.js';

// [LOCKED] Flat-config export: an ordered list of rule blocks.
export default defineConfig(
  // [TWEAK] Folders ESLint never looks at (build output, installed packages).
  { ignores: ['dist', 'node_modules', 'coverage'] },
  // [TWEAK] Baseline JavaScript rules. Remove to make linting much looser.
  js.configs.recommended,
  // [TWEAK] Baseline TypeScript rules. Swap to ts.configs.strict for pickier linting.
  ts.configs.recommended,
  // [LOCKED] Rules and parser for .svelte files.
  svelte.configs.recommended,
  // [CAREFUL] Tell ESLint which global names exist in the app code (browser) and in the tooling files (node).
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  // [LOCKED] Block that makes TypeScript work inside .svelte files.
  {
    // [LOCKED] Only applies to Svelte component files.
    files: ['**/*.svelte', '**/*.svelte.ts'],
    // [LOCKED] Parser settings for Svelte + TypeScript.
    languageOptions: {
      // [LOCKED] Options handed to the Svelte parser.
      parserOptions: {
        // [LOCKED] Use the TypeScript parser for the <script lang="ts"> part.
        parser: ts.parser,
        // [LOCKED] Treat .svelte as a source file extension.
        extraFileExtensions: ['.svelte'],
        // [LOCKED] Pass the Svelte config along so runes mode is detected.
        svelteConfig,
      },
    },
  },
  // ───── ENGINE PURITY GUARD ─────
  // [LOCKED] These rules enforce README principles 1, 3 and 4: the engine is DOM-free, deterministic, and keeps its RNG in state.
  {
    // [LOCKED] Applies to every file inside the engine folder, and nothing else.
    files: ['src/engine/**/*.ts'],
    // [LOCKED] Rule list for the engine.
    rules: {
      // [LOCKED] Ban sources of hidden randomness or time. Same seed + same actions must give the same game.
      'no-restricted-properties': [
        'error', // [LOCKED] Violations fail `npm run lint`.
        {
          object: 'Math', // [LOCKED] Ban Math.random...
          property: 'random',
          message: 'Engine must be deterministic. Use the seeded RNG in state (src/engine/rng.ts).',
        },
        {
          object: 'Date', // [LOCKED] ...and Date.now(). Wall-clock time would break replays.
          property: 'now',
          message: 'Engine must be deterministic. Do not read the clock.',
        },
      ],
      // [LOCKED] Ban `new Date()` too, for the same reason.
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'Engine must be deterministic. Do not read the clock.',
        },
      ],
      // [LOCKED] Ban browser-only globals. The UI renders state; the engine never touches the page or storage.
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'Engine has zero DOM code.' },
        { name: 'document', message: 'Engine has zero DOM code.' },
        { name: 'localStorage', message: 'Saves belong in src/storage/, not the engine.' },
        { name: 'indexedDB', message: 'Saves belong in src/storage/, not the engine.' },
      ],
    },
  },
);
