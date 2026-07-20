/**
 * HomeScreen.js — the World Hub. Lists subject folders (Math, Science,
 * Coding, Reading, Social Studies, Arts); tapping one lazy-loads that
 * subject's question bank (dataLoader.loadSubjectQuestions) before
 * showing its games, with a skeleton shown while the fetch is in flight.
 */
import { store } from '../state.js';
import { navigate } from '../router.js';
import { escapeHTML } from '../utils.js';
import { loadGamesMeta } from '../dataLoader.js';
import { getInstallState, onInstallStateChange, triggerInstall } from '../installPrompt.js';

const SUBJECT_META = {
  math: { label: 'Math', icon: '🔢', accent: 'teal' },
  science: { label: 'Science', icon: '🔬', accent: 'teal' },
  coding: { label: 'Coding', icon: '🤖', accent: 'violet' },
  english: { label: 'Reading', icon: '📖', accent: 'amber' },
  social: { label: 'Social Studies', icon: '🌍', accent: 'coral' },
  arts: { label: 'Arts', icon: '🎨', accent: 'coral' },
};

export class HomeScreen {
  #root;
  #abortController = new AbortController();
  #openSubject = null; // internal drill-down state — not a router screen
  #games = [];
  #installUnsubscribe = null;

  constructor(root) { this.#root = root; }

  async mount() {
    this.#root.innerHTML = `
      <div class="screen home-screen scrollable">
        <div class="home-sky-bg"><div class="cloud cl-1"></div><div class="cloud cl-2"></div><div class="cloud cl-3"></div></div>
        <div class="home-header">
          <div class="logo-mark">🌟</div>
          <h1 class="app-title">Learning Quest</h1>
          <p class="app-subtitle">Math, Science, Coding and Many More</p>
          <div id="installSlot"></div>
        </div>
        <div id="homeBody" class="mode-grid">${this.#skeletonHTML(6)}</div>
      </div>`;

    this.#renderInstallSlot();
    this.#installUnsubscribe = onInstallStateChange(() => this.#renderInstallSlot());

    this.#games = (await loadGamesMeta()).games;
    this.#renderBody();
  }

  #renderInstallSlot() {
    const slot = this.#root.querySelector('#installSlot');
    if (!slot) return;
    const state = getInstallState();

    if (state === 'promptable') {
      slot.innerHTML = '<button class="btn btn-secondary" id="installBtn" style="margin-top:10px;">📲 Install App</button>';
      slot.querySelector('#installBtn').addEventListener('click', async () => {
        const outcome = await triggerInstall();
        if (outcome === 'accepted') this.#renderInstallSlot();
      }, { signal: this.#abortController.signal });
    } else if (state === 'ios-manual') {
      slot.innerHTML = '<p style="font-size:11px;color:var(--ink-soft);margin-top:8px;">📲 Tap <strong>Share</strong> then <strong>Add to Home Screen</strong> to install</p>';
    } else {
      slot.innerHTML = ''; // already installed, or the browser gives us no way to offer it
    }
  }

  #renderBody() {
    const body = this.#root.querySelector('#homeBody');
    const { progress } = store.get();
    const { signal } = this.#abortController;

    if (!this.#openSubject) {
      const subjects = [...new Set(this.#games.map((g) => g.subject))];
      body.innerHTML = subjects.map((s) => this.#folderTileHTML(s, this.#games.filter((g) => g.subject === s), progress)).join('');
      body.querySelectorAll('.mode-card').forEach((card) => {
        card.addEventListener('click', () => { this.#openSubject = card.dataset.subject; this.#renderBody(); }, { signal });
      });
      return;
    }

    const gamesInSubject = this.#games.filter((g) => g.subject === this.#openSubject);
    const meta = SUBJECT_META[this.#openSubject] || { label: this.#openSubject, accent: 'teal' };
    body.innerHTML = `
      <button class="home-section-header" id="backToSubjects" style="grid-column:1/-1;justify-self:start;">⬅ ${escapeHTML(meta.label)}</button>
      ${gamesInSubject.map((g) => this.#gameTileHTML(g, progress)).join('')}`;
    body.querySelector('#backToSubjects').addEventListener('click', () => { this.#openSubject = null; this.#renderBody(); }, { signal });
    body.querySelectorAll('.mode-card').forEach((card) => {
      card.addEventListener('click', () => navigate('difficulty', { currentGame: { meta: gamesInSubject.find((g) => g.key === card.dataset.key) } }), { signal });
    });
  }

  #skeletonHTML(n) {
    return Array.from({ length: n }, () => '<div class="mode-card" style="opacity:.35;pointer-events:none;"><div class="mode-icon">⏳</div><div class="mode-card-body"><div class="mode-label">Loading…</div></div></div>').join('');
  }

  #folderTileHTML(subjectKey, games, progress) {
    const meta = SUBJECT_META[subjectKey] || { label: subjectKey, icon: '📚', accent: 'teal' };
    const completedCount = games.filter((g) => {
      const p = progress[g.key];
      return p && Object.values(p).some((tier) => tier.correct === tier.total);
    }).length;
    const progressLabel = completedCount === 0 ? `${games.length} games` : `${completedCount}/${games.length} completed`;
    const progressClass = completedCount === 0 ? 'mode-progress-empty' : completedCount === games.length ? 'mode-progress' : 'mode-progress-partial';

    return `
      <button class="mode-card" data-accent="${meta.accent}" data-subject="${escapeHTML(subjectKey)}">
        <div class="mode-icon" style="background:var(--${meta.accent});">${meta.icon}</div>
        <div class="mode-card-body">
          <div class="mode-label">${escapeHTML(meta.label)}</div>
          <div class="mode-desc">${games.length} games to explore</div>
          <div class="${progressClass}">${progressLabel}</div>
        </div>
      </button>`;
  }

  #gameTileHTML(game, progress) {
    const p = progress[game.key];
    const best = p ? Math.max(0, ...Object.values(p).map((t) => Math.round((t.correct / t.total) * 100))) : 0;
    const progressClass = best === 0 ? 'mode-progress-empty' : best === 100 ? 'mode-progress' : 'mode-progress-partial';
    return `
      <button class="mode-card" data-accent="${game.accent}" data-key="${escapeHTML(game.key)}">
        <div class="mode-icon" style="background:var(--${game.accent});">${game.icon}</div>
        <div class="mode-card-body">
          <div class="mode-label">${escapeHTML(game.label)}</div>
          <div class="mode-desc">${escapeHTML(game.description || '')}</div>
          <div class="${progressClass}">${best === 0 ? 'Not started' : `Best: ${best}%`}</div>
        </div>
      </button>`;
  }

  unmount() {
    this.#installUnsubscribe?.();
    this.#installUnsubscribe = null;
    this.#abortController.abort();
    this.#abortController = new AbortController();
  }
}
