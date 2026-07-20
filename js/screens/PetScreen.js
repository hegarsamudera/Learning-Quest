import { store } from '../state.js';
import { navigate } from '../router.js';
import {
  getPet, getPetStage, getPetEvolutionProgress, SPARKLE_FOOD, feedPet, buyFood, tryEvolve,
} from '../gamification.js';
import { showToast } from '../components/Toast.js';
import { SFX } from '../audio.js';

export class PetScreen {
  #root;
  #abortController = new AbortController();

  constructor(root) { this.#root = root; }

  mount() {
    this.#render();
  }

  #render() {
    const pet = getPet();
    const stage = getPetStage(pet);
    const evo = getPetEvolutionProgress(pet);
    const { coins } = store.get().score;

    const foodHTML = Object.entries(SPARKLE_FOOD).map(([key, food]) => {
      const owned = pet.foodInventory?.[key] || 0;
      return `
        <div class="pet-food-item" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px;">
          <span style="font-size:28px;">${food.icon}</span>
          <span style="font-size:11px;font-weight:700;">${food.name}</span>
          <span style="font-size:10px;color:var(--ink-soft);">+${food.power} SP</span>
          <button class="btn btn-secondary" data-buy="${key}" style="font-size:11px;padding:6px 10px;min-height:auto;" ${coins < food.cost ? 'disabled' : ''}>Buy 🪙${food.cost}</button>
          ${owned > 0 ? `<button class="btn btn-primary" data-feed="${key}" style="font-size:11px;padding:6px 10px;min-height:auto;">Feed (${owned})</button>` : ''}
        </div>`;
    }).join('');

    this.#root.innerHTML = `
      <div class="screen pet-screen scrollable">
        <div class="home-header">
          <button class="icon-btn" id="petBackBtn" style="position:absolute;left:16px;top:16px;">⬅</button>
          <div style="font-size:72px;margin-bottom:6px;" class="pet-preview-card">${stage.emoji}</div>
          <h1 class="app-title" style="font-size:22px;">${stage.name}</h1>
          <p class="app-subtitle">${stage.desc}</p>
        </div>
        <div style="padding:0 16px;">
          <div id="evoBarHost"></div>
          <p style="text-align:center;font-size:12px;color:var(--ink-soft);margin:6px 0 16px;">${evo.isMaxStage ? 'Max stage reached! ✨' : `${evo.pct}% to next stage`}</p>
          ${evo.evoReady ? '<button class="btn btn-primary" id="evolveBtn" style="width:100%;margin-bottom:16px;">✨ Evolve now!</button>' : ''}
          <h2 class="home-section-header">Feed your pet</h2>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px;">${foodHTML}</div>
        </div>
      </div>`;

    const barHost = this.#root.querySelector('#evoBarHost');
    barHost.innerHTML = `<div class="progress-track"><div class="progress-fill" style="width:${evo.pct}%;"></div></div>`;

    const { signal } = this.#abortController;
    this.#root.querySelector('#petBackBtn').addEventListener('click', () => navigate('home'), { signal });
    this.#root.querySelector('#evolveBtn')?.addEventListener('click', () => {
      const newStage = tryEvolve();
      if (newStage) { showToast({ icon: newStage.emoji, title: 'Evolved!', subtitle: newStage.name }); this.#render(); }
    }, { signal });
    this.#root.querySelectorAll('[data-buy]').forEach((btn) => {
      btn.addEventListener('click', () => { if (buyFood(btn.dataset.buy)) this.#render(); }, { signal });
    });
    this.#root.querySelectorAll('[data-feed]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (feedPet(btn.dataset.feed) !== null) { SFX.coin(); this.#render(); }
      }, { signal });
    });
  }

  unmount() {
    this.#abortController.abort();
    this.#abortController = new AbortController();
  }
}
