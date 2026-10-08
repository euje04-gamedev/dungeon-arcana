// Legend:  [TWEAK] = safe to change   [CAREFUL] = changeable, but read the note   [LOCKED] = do not touch

// [LOCKED] Lets .svelte files use TypeScript (<script lang="ts">) by reusing Vite's own transpiler.
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// [LOCKED] The Svelte tools (compiler, ESLint, svelte-check) all read this default export.
export default {
  // [LOCKED] Turns on TypeScript support inside components.
  preprocess: vitePreprocess(),
  // [CAREFUL] Options passed straight to the Svelte compiler.
  compilerOptions: {
    // [LOCKED] Force Svelte 5 "runes" mode ($state, $derived, $props). The whole UI is written for it; mixing in old Svelte 4 syntax is not supported.
    runes: true,
  },
};
