// Legend:  [TWEAK] = safe to change   [CAREFUL] = changeable, but read the note   [LOCKED] = do not touch

// [LOCKED] Svelte 5's function for attaching a component to the page (replaces Svelte 4's `new App()`).
import { mount } from 'svelte';
// [LOCKED] The root component of the UI.
import App from './App.svelte';

// [LOCKED] Find the empty <div id="app"> declared in index.html.
const target = document.getElementById('app');
// [LOCKED] Fail loudly with a clear message if index.html lost that div, instead of a blank screen.
if (!target) throw new Error('Missing <div id="app"> in index.html');

// [LOCKED] Render the app into that div. This is the only place the UI is started.
mount(App, { target });
