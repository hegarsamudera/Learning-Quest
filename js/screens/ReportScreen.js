import { store } from '../state.js';
import { navigate } from '../router.js';
import { loadGamesMeta } from '../dataLoader.js';
import { storageClearAll } from '../storage.js';
import { escapeHTML } from '../utils.js';

export class ReportScreen {
  #root;
  #abortController = new AbortController();

  constructor(root) { this.#root = root; }

  async mount() {
    this.#root.innerHTML = `
      <div class="screen report-screen scrollable">
        <div class="home-header">
          <button class="icon-btn" id="reportBackBtn" style="position:absolute;left:16px;top:16px;">⬅</button>
          <h1 class="app-title" style="font-size:24px;">📊 Progress Report</h1>
        </div>
        <div id="reportBody" style="padding:0 16px;"></div>
        <div style="padding:20px 16px 8px;text-align:center;">
          <button class="btn btn-danger" id="resetBtn">🗑️ Reset All Progress</button>
        </div>
      </div>`;

    const { games } = await loadGamesMeta();
    const { progress, history } = store.get();
    const body = this.#root.querySelector('#reportBody');

    const rows = games.map((g) => {
      const p = progress[g.key];
      const best = p ? Math.max(0, ...Object.values(p).map((t) => Math.round((t.correct / t.total) * 100))) : 0;
      return `<div class="report-mode-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:12px;margin-bottom:6px;">
        <span>${g.icon} ${escapeHTML(g.label)}</span>
        <span style="font-weight:800;color:${best === 100 ? 'var(--success)' : best > 0 ? 'var(--amber)' : 'var(--ink-soft)'};">${best === 0 ? '—' : `${best}%`}</span>
      </div>`;
    }).join('');

    const totalSessions = history.length;
    body.innerHTML = `<p style="font-size:13px;color:var(--ink-soft);margin-bottom:12px;">${totalSessions} session${totalSessions === 1 ? '' : 's'} played</p>${rows}`;

    const { signal } = this.#abortController;
    this.#root.querySelector('#reportBackBtn').addEventListener('click', () => navigate('home'), { signal });
    this.#root.querySelector('#resetBtn').addEventListener('click', () => this.#confirmReset(), { signal });
  }

  #confirmReset() {
    const overlay = document.createElement('div');
    overlay.className = 'reset-modal-overlay';
    overlay.innerHTML = `
      <div class="reset-modal">
        <h2>Reset all progress?</h2>
        <p style="color:var(--ink-soft);font-size:13px;margin:8px 0 16px;">This deletes coins, streaks, achievements, your pet, and every game's progress. This can't be undone.</p>
        <div class="reset-modal-actions">
          <button class="btn btn-secondary" id="cancelResetBtn">Cancel</button>
          <button class="btn btn-danger" id="confirmResetBtn">Yes, reset everything</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#cancelResetBtn').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#confirmResetBtn').addEventListener('click', () => {
      storageClearAll();
      window.location.reload();
    });
  }

  unmount() {
    this.#abortController.abort();
    this.#abortController = new AbortController();
  }
}
