/**
 * router.js — in-app screen navigation. Not a URL router (this is a
 * single static index.html with no server), but it:
 *   1. drives store.screen changes,
 *   2. keeps the browser Back button working via history.pushState,
 *   3. wraps every navigation in the View Transitions API when the
 *      browser supports it, falling back to the CSS slide/bounce
 *      animation already defined in css/base.css otherwise.
 */
import { store } from './state.js';

const supportsViewTransitions = typeof document.startViewTransition === 'function';

/** Navigate to a screen, optionally attaching data to the new
 *  `store.get().currentGame` / `store.get().subject` etc. via `patch`. */
export const navigate = (screen, patch = {}) => {
  const apply = () => {
    store.set({ screen, ...patch });
    window.history.pushState({ screen }, '', `#${screen}`);
  };

  if (supportsViewTransitions && !store.get().settings.reducedMotion) {
    document.startViewTransition(apply);
  } else {
    apply();
  }
};

/** Replace the current screen without pushing a new history entry — used
 *  for e.g. play -> complete, where "Back" should return to Home, not to
 *  the mid-game screen. */
export const replaceScreen = (screen, patch = {}) => {
  const apply = () => {
    store.set({ screen, ...patch });
    window.history.replaceState({ screen }, '', `#${screen}`);
  };
  if (supportsViewTransitions && !store.get().settings.reducedMotion) {
    document.startViewTransition(apply);
  } else {
    apply();
  }
};

export const initRouter = () => {
  window.addEventListener('popstate', (e) => {
    const screen = e.state?.screen || 'home';
    store.set({ screen });
  });
  // Seed the initial history entry so the very first Back press has
  // somewhere sane to land (Home) instead of leaving the app.
  window.history.replaceState({ screen: store.get().screen }, '', `#${store.get().screen}`);
};
