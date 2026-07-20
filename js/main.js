/**
 * main.js — entry point, loaded as <script type="module" src="js/main.js">
 * from index.html. Wires together the router, the store-driven renderer,
 * and registers the service worker for offline support.
 */
import { store } from './state.js';
import { initRouter } from './router.js';
import { Renderer } from './renderer.js';
import { initInstallPrompt } from './installPrompt.js';
import { Notifications } from './notifications.js';

// Must run before the microtask queue clears on first paint — Chrome can
// fire `beforeinstallprompt` very early, and we only get one shot at
// capturing it per session.
initInstallPrompt();

const bootApp = () => {
  const root = document.getElementById('app');
  if (!root) throw new Error('main.js: #app root element not found');

  initRouter();
  new Renderer(root).start();
  // Re-engagement system: daily reward / welcome-back / living-world /
  // idle nudges / permission strategy. Fire-and-forget — none of this
  // blocks first paint, and it no-ops gracefully if anything's missing
  // (e.g. first-ever visit has no lastLogin to compare against).
  Notifications.init();

  // Old-browser banner — graceful degradation per the browser support matrix.
  if (!('fetch' in window) || !('Promise' in window) || !window.customElements) {
    const banner = document.createElement('div');
    banner.className = 'old-browser-banner';
    banner.textContent = '⚠️ Please update your browser for the best experience.';
    document.body.prepend(banner);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}

// Register the service worker for offline play (after first load, so it
// never delays the initial paint).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

// Expose the store on window in dev builds only, for quick console debugging.
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.__store = store;
}
