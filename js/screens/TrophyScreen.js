import { store } from '../state.js';
import { navigate } from '../router.js';
import { ACHIEVEMENTS } from '../gamification.js';
import { escapeHTML } from '../utils.js';

export class TrophyScreen {
  #root;
  #abortController = new AbortController();

  constructor(root) { this.#root = root; }

  mount() {
    const { achievements } = store.get();
    const cardsHTML = Object.entries(ACHIEVEMENTS).map(([id, a]) => {
      const unlocked = achievements.includes(id);
      return `
        <div class="trophy-card" style="opacity:${unlocked ? 1 : 0.35};display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--radius-md);margin-bottom:10px;">
          <span style="font-size:32px;">${unlocked ? a.icon : '🔒'}</span>
          <div>
            <div style="font-weight:800;font-family:var(--font-display);">${escapeHTML(a.title)}</div>
            <div style="font-size:12px;color:var(--ink-soft);">${escapeHTML(a.desc)}</div>
          </div>
        </div>`;
    }).join('');

    this.#root.innerHTML = `
      <div class="screen trophy-screen scrollable">
        <div class="home-header">
          <button class="icon-btn" id="trophyBackBtn" style="position:absolute;left:16px;top:16px;">⬅</button>
          <h1 class="app-title" style="font-size:24px;">🏆 Trophy Case</h1>
          <p class="app-subtitle">${achievements.length} / ${Object.keys(ACHIEVEMENTS).length} unlocked</p>
        </div>
        <div style="padding:0 16px;">${cardsHTML}</div>
      </div>`;

    this.#root.querySelector('#trophyBackBtn').addEventListener('click', () => navigate('home'), { signal: this.#abortController.signal });
  }

  unmount() {
    this.#abortController.abort();
    this.#abortController = new AbortController();
  }
}
