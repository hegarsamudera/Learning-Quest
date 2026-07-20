import { store } from '../state.js';
import { navigate } from '../router.js';
import { escapeHTML, shuffleArray } from '../utils.js';
import { loadGameQuestions } from '../dataLoader.js';

const TIERS = [
  { key: 'easy', label: 'Easy', icon: '🌱' },
  { key: 'medium', label: 'Medium', icon: '🔥' },
  { key: 'hard', label: 'Hard', icon: '💎' },
];

export class DifficultyScreen {
  #root;
  #abortController = new AbortController();

  constructor(root) { this.#root = root; }

  async mount() {
    const { currentGame } = store.get();
    const meta = currentGame?.meta;
    if (!meta) { navigate('home'); return; }

    this.#root.innerHTML = `
      <div class="screen difficulty-screen scrollable" data-accent="${meta.accent}">
        <div class="home-header">
          <div class="mode-icon" style="width:64px;height:64px;border-radius:20px;margin:0 auto 10px;background:var(--${meta.accent});display:flex;align-items:center;justify-content:center;font-size:32px;">${meta.icon}</div>
          <h1 class="app-title" style="font-size:24px;">${escapeHTML(meta.label)}</h1>
          <p class="app-subtitle">${escapeHTML(meta.description || 'Choose your difficulty')}</p>
        </div>
        <div id="tierList" style="display:flex;flex-direction:column;gap:12px;padding:0 4px;">${TIERS.map((t) => this.#tierCardHTML(t)).join('')}</div>
      </div>`;

    this.#root.querySelectorAll('.difficulty-card').forEach((card) => {
      card.addEventListener('click', () => this.#startGame(meta, card.dataset.tier), { signal: this.#abortController.signal });
    });
  }

  #tierCardHTML(tier) {
    const { progress } = store.get();
    const { currentGame } = store.get();
    const best = progress[currentGame?.meta?.key]?.[tier.key];
    const bestLabel = best ? `Best: ${Math.round((best.correct / best.total) * 100)}%` : 'Not played yet';
    return `
      <button class="mode-card difficulty-card" data-tier="${tier.key}" style="flex-direction:row;align-items:center;gap:14px;min-height:auto;padding:14px 16px;">
        <div class="mode-icon" style="width:52px;height:52px;border-radius:14px;font-size:26px;flex-shrink:0;">${tier.icon}</div>
        <div class="mode-card-body" style="padding:0;">
          <div class="mode-label">${tier.label}</div>
          <div class="mode-progress${best ? '' : '-empty'}">${bestLabel}</div>
        </div>
      </button>`;
  }

  async #startGame(meta, difficulty) {
    const allQuestions = await loadGameQuestions(meta);
    const pool = Array.isArray(allQuestions) ? allQuestions.filter((q) => !q.difficulty || q.difficulty === difficulty) : [];
    const questions = shuffleArray(pool.length ? pool : allQuestions).slice(0, 10);

    navigate('play', {
      currentGame: { meta, difficulty, questions, index: 0, correct: 0, missed: [] },
    });
  }

  unmount() {
    this.#abortController.abort();
    this.#abortController = new AbortController();
  }
}
