<!-- Legend:  [TWEAK] = safe to change   [CAREFUL] = changeable, but read the note   [LOCKED] = do not touch -->
<!-- Phase 1 placeholder. Replaced by the real UI in Phase 6. It exists to prove Svelte 5, TypeScript and the engine import all work together. -->
<script lang="ts">
  // [LOCKED] Proves the UI can import from the engine. The UI may import engine code; the engine must NEVER import UI code.
  import { MAX_HEALTH } from './engine/types';

  // [TWEAK] The title shown on screen.
  const title = 'Dungeon Arcana';
</script>

<!-- [TWEAK] Placeholder screen content. -->
<main>
  <!-- [TWEAK] Game title. -->
  <h1>{title}</h1>
  <!-- [TWEAK] Status line; the number comes from the engine, not from this file. -->
  <p>Scaffold running. Player health cap: {MAX_HEALTH}.</p>
</main>

<style>
  /* [TWEAK] Page-wide styles. :global is needed because <body> is outside this component. */
  :global(body) {
    margin: 0; /* [TWEAK] Remove the browser's default outer gap. */
    background: #14121a; /* [TWEAK] Page background. Keep in sync with theme-color in index.html. */
    color: #e8e4f0; /* [TWEAK] Default text color. */
    font-family:
      system-ui, sans-serif; /* [TWEAK] Font stack: the phone's own UI font, no download needed (offline-friendly). */
  }

  /* [TWEAK] Layout of the placeholder screen. */
  main {
    min-height: 100dvh; /* [CAREFUL] Fill the visible phone screen. "dvh" accounts for the mobile browser bar; plain "vh" would overflow. */
    padding: 1.5rem; /* [TWEAK] Space around the content. */
    box-sizing: border-box; /* [LOCKED] Make padding count inside the 100dvh height so the page does not scroll. */
  }

  /* [TWEAK] Title size. */
  h1 {
    font-size: 1.75rem; /* [TWEAK] Heading size. */
    margin: 0 0 0.5rem; /* [TWEAK] Space below the heading only. */
  }
</style>
