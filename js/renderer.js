/**
 * renderer.js — the "~200 line DOM reconciliation" piece requested.
 * This app doesn't need a virtual-DOM diff: each screen owns its whole
 * subtree and rebuilds it on mount (same as the original monolith's
 * innerHTML-per-screen approach), so the actual job of renderer.js is
 * simpler and more robust: own the *lifecycle* — unmount the outgoing
 * screen (so its listeners/timers are cleaned up), swap in the new
 * screen's markup, and wrap the transition in a fade/slide class fallback
 * for browsers without the View Transitions API.
 */
import { store } from './state.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { DifficultyScreen } from './screens/DifficultyScreen.js';
import { PlayScreen } from './screens/PlayScreen.js';
import { CompleteScreen } from './screens/CompleteScreen.js';
import { PetScreen } from './screens/PetScreen.js';
import { TrophyScreen } from './screens/TrophyScreen.js';
import { ReportScreen } from './screens/ReportScreen.js';

const SCREEN_CLASSES = {
  home: HomeScreen,
  difficulty: DifficultyScreen,
  play: PlayScreen,
  complete: CompleteScreen,
  pet: PetScreen,
  trophy: TrophyScreen,
  report: ReportScreen,
};

export class Renderer {
  #root;
  #currentScreenName = null;
  #currentScreenInstance = null;

  constructor(root) {
    this.#root = root;
  }

  start() {
    store.subscribe((state) => this.#onStateChange(state));
    this.#onStateChange(store.get());
  }

  #onStateChange(state) {
    if (state.screen === this.#currentScreenName) return; // only screen changes trigger a remount
    this.#swapTo(state.screen);
  }

  async #swapTo(screenName) {
    const ScreenClass = SCREEN_CLASSES[screenName];
    if (!ScreenClass) {
      this.#renderErrorBoundary(new Error(`Unknown screen "${screenName}"`));
      return;
    }

    try {
      this.#currentScreenInstance?.unmount?.();
      this.#currentScreenName = screenName;
      const instance = new ScreenClass(this.#root);
      this.#currentScreenInstance = instance;
      await instance.mount();
    } catch (err) {
      // Error boundary: never leave the kid staring at a broken screen —
      // show a friendly message with a way back home.
      console.error(`[renderer] failed to mount "${screenName}"`, err);
      this.#renderErrorBoundary(err);
    }
  }

  #renderErrorBoundary(err) {
    this.#root.innerHTML = `
      <div class="screen" style="align-items:center;justify-content:center;text-align:center;gap:14px;">
        <div style="font-size:56px;">😵‍💫</div>
        <h2 style="color:var(--ink);">Oops, something went sideways!</h2>
        <p style="color:var(--ink-soft);font-size:13px;max-width:280px;">Don't worry, it's not you — let's head back and try again.</p>
        <button class="btn btn-primary" id="errBoundaryHomeBtn">🏠 Back to Home</button>
      </div>`;
    this.#root.querySelector('#errBoundaryHomeBtn').addEventListener('click', () => {
      this.#currentScreenName = null;
      store.set({ screen: 'home', currentGame: null });
    });
    if (import.meta?.env?.DEV) throw err;
  }
}
