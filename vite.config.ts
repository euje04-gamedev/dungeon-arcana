// Legend:  [TWEAK] = safe to change   [CAREFUL] = changeable, but read the note   [LOCKED] = do not touch

// [LOCKED] defineConfig from vitest/config lets ONE file configure both Vite (build) and Vitest (tests).
import { defineConfig } from 'vitest/config';
// [LOCKED] The plugin that teaches Vite how to compile .svelte files.
import { svelte } from '@sveltejs/vite-plugin-svelte';

// [LOCKED] Vite requires the config to be the default export.
export default defineConfig({
  // [CAREFUL] Use relative asset paths so the built game works from any folder or sub-URL (e.g. GitHub Pages). Phase 7 (PWA) must keep this consistent.
  base: './',
  // [LOCKED] Register the Svelte compiler. Phase 7 will add the PWA plugin to this list.
  plugins: [svelte()],
  // [CAREFUL] Settings that only apply when running `npm test`.
  test: {
    // [LOCKED] Run tests in plain Node with NO browser. This is how we prove the engine has zero DOM code (README principle 1). Do not switch to jsdom.
    environment: 'node',
    // [TWEAK] Which files count as tests. One test file per card effect will live under tests/.
    include: ['tests/**/*.test.ts'],
  },
});
