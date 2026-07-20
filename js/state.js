/**
 * state.js — a tiny reactive store (pub/sub), replacing the monolith's
 * three separate global mutable objects (`state`, `gm`, pet-in-localStorage)
 * with one typed, observable shape. No framework, ~60 lines.
 *
 * Usage:
 *   import { store } from './state.js';
 *   const unsubscribe = store.subscribe((state) => { ... re-render ... });
 *   store.set({ screen: 'play' });
 *   store.set((s) => ({ score: { ...s.score, coins: s.score.coins + 5 } }));
 */
import { storageGet, storageSet } from './storage.js';

const createStore = (initialState) => {
  let state = { ...initialState };
  const listeners = new Set();

  return {
    get: () => state,
    set: (updater) => {
      const patch = typeof updater === 'function' ? updater(state) : updater;
      state = { ...state, ...patch };
      listeners.forEach((fn) => fn(state));
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
};

/** Default shape. Anything under `settings`/`score`/`progress`/`pet` is
 *  persisted to localStorage by the subscriber registered below —
 *  `screen`, `currentGame` and `history`-in-progress are NOT persisted,
 *  matching the monolith's original behaviour (a refresh always returns
 *  to Home, but coins/streak/progress/pet survive). */
const initialState = {
  screen: 'home',            // 'home' | 'difficulty' | 'play' | 'complete' | 'pet' | 'trophy' | 'report' | 'map'
  subject: null,              // currently open subject folder, if any
  currentGame: null,           // { key, type, difficulty, questions[], currentIndex, missed[] }
  score: {
    correct: 0,
    total: 0,
    streak: storageGet('streak', 0),
    bestStreak: storageGet('bestStreak', 0),
    coins: storageGet('coins', 0),
    totalCoinsEarned: storageGet('totalCoinsEarned', storageGet('coins', 0)),
  },
  progress: storageGet('progress', {}),        // per-game-key completion state
  achievements: storageGet('achievements', []), // unlocked achievement ids
  pet: storageGet('pet', null),                 // null until first initialised by gamification.js
  settings: {
    sound: storageGet('sfxEnabled', true),
    voice: storageGet('voiceEnabled', true),
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  },
  history: storageGet('history', []),           // last N completed sessions, newest first
};

export const store = createStore(initialState);

/** Persist the slices of state that should survive a reload. Called on
 *  every state change; cheap because localStorage writes are small JSON
 *  blobs and this app has no high-frequency state changes (no per-frame
 *  state updates — animations are pure CSS). */
store.subscribe((state) => {
  storageSet('streak', state.score.streak);
  storageSet('bestStreak', state.score.bestStreak);
  storageSet('coins', state.score.coins);
  storageSet('totalCoinsEarned', state.score.totalCoinsEarned);
  storageSet('progress', state.progress);
  storageSet('achievements', state.achievements);
  if (state.pet) storageSet('pet', state.pet);
  storageSet('sfxEnabled', state.settings.sound);
  storageSet('voiceEnabled', state.settings.voice);
  storageSet('history', state.history);
});
