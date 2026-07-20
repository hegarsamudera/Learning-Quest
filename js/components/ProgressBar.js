/**
 * ProgressBar.js — the glowing energy-fill bar used on the Play screen
 * and anywhere else a 0-100% progress needs showing (difficulty tiers,
 * pet evolution meter). Framework-free: renders once, `setPercent`
 * updates the width via a CSS custom property so transitions stay smooth.
 */
export class ProgressBar {
  #el;
  #fillEl;

  constructor(container, { percent = 0, label = '' } = {}) {
    this.#el = document.createElement('div');
    this.#el.className = 'progress-track';
    this.#el.setAttribute('role', 'progressbar');
    this.#el.setAttribute('aria-valuemin', '0');
    this.#el.setAttribute('aria-valuemax', '100');
    if (label) this.#el.setAttribute('aria-label', label);

    this.#fillEl = document.createElement('div');
    this.#fillEl.className = 'progress-fill';
    this.#el.appendChild(this.#fillEl);

    container.appendChild(this.#el);
    this.setPercent(percent);
  }

  setPercent(pct) {
    const clamped = Math.max(0, Math.min(100, pct));
    this.#fillEl.style.width = `${clamped}%`;
    this.#el.setAttribute('aria-valuenow', String(Math.round(clamped)));
  }

  get el() { return this.#el; }
}
