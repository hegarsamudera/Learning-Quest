import { store } from '../state.js';
import { navigate } from '../router.js';
import { escapeHTML } from '../utils.js';

export class CompleteScreen {
  #root;
  #abortController = new AbortController();

  constructor(root) { this.#root = root; }

  mount() {
    const { currentGame } = store.get();
    if (!currentGame) { navigate('home'); return; }

    const { meta, questions, correct, missed } = currentGame;
    const total = questions.length;
    const pct = Math.round((correct / total) * 100);
    const stars = pct === 100 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;

    this.#root.innerHTML = `
      <div class="screen complete-screen">
        <div class="complete-mark">${pct >= 70 ? '🏆' : '🎉'}</div>
        <h1 class="complete-title">${escapeHTML(meta.label)} Complete!</h1>
        <p class="complete-score">${correct} / ${total} correct (${pct}%)</p>
        <div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        ${store.get().score.streak > 1 ? `<div class="complete-streak">🔥 ${store.get().score.streak} in a row!</div>` : ''}
        ${missed?.length ? `<p style="color:var(--ink-soft);font-size:13px;margin-bottom:14px;">Missed ${missed.length} question${missed.length > 1 ? 's' : ''} — check the Report screen for details.</p>` : ''}
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
          <button class="btn btn-primary" id="playAgainBtn">🔁 Play Again</button>
          <button class="btn btn-secondary" id="backHomeBtn">🏠 Home</button>
        </div>
      </div>`;

    const { signal } = this.#abortController;
    this.#root.querySelector('#playAgainBtn').addEventListener('click', () => navigate('difficulty', { currentGame: { meta } }), { signal });
    this.#root.querySelector('#backHomeBtn').addEventListener('click', () => navigate('home'), { signal });
  }

  unmount() {
    this.#abortController.abort();
    this.#abortController = new AbortController();
  }
}
