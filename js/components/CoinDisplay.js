/**
 * CoinDisplay.js — a small "🪙 123" chip that subscribes to the store and
 * bumps/animates whenever the coin count increases (e.g. header HUD,
 * Pet screen shop). Ported concept from the monolith's inline
 * updateScoreChip()/showCoinGain() calls, generalized into a component.
 */
import { store } from '../state.js';

export class CoinDisplay {
  #el;
  #unsubscribe;
  #lastCoins;

  constructor(container) {
    this.#el = document.createElement('span');
    this.#el.className = 'coin-display';
    container.appendChild(this.#el);
    this.#lastCoins = store.get().score.coins;
    this.#render();
    this.#unsubscribe = store.subscribe((s) => this.#onStateChange(s));
  }

  #onStateChange(state) {
    const coins = state.score.coins;
    if (coins !== this.#lastCoins) {
      if (coins > this.#lastCoins) this.#bump();
      this.#lastCoins = coins;
      this.#render();
    }
  }

  #render() {
    this.#el.textContent = `🪙 ${this.#lastCoins}`;
  }

  #bump() {
    this.#el.classList.remove('coin-bump');
    void this.#el.offsetWidth;
    this.#el.classList.add('coin-bump');
  }

  destroy() {
    this.#unsubscribe?.();
    this.#el.remove();
  }
}
