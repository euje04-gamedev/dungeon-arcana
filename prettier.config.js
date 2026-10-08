// Legend:  [TWEAK] = safe to change   [CAREFUL] = changeable, but read the note   [LOCKED] = do not touch

// [LOCKED] Prettier reads this default export. The JSDoc type below gives editor autocomplete.
/** @type {import("prettier").Config} */
export default {
  // [TWEAK] Use 'single quotes' in code. Pure style preference.
  singleQuote: true,
  // [TWEAK] End statements with semicolons. Pure style preference.
  semi: true,
  // [TWEAK] Put trailing commas wherever allowed, which makes git diffs smaller.
  trailingComma: 'all',
  // [TWEAK] Wrap lines wider than this many characters. Comments are never reflowed, only code.
  printWidth: 100,
  // [LOCKED] Enables formatting of .svelte files.
  plugins: ['prettier-plugin-svelte'],
  // [LOCKED] Tells Prettier to use the Svelte parser for .svelte files.
  overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }],
};
