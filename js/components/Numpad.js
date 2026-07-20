/**
 * Numpad.js — the on-screen numeric keypad used by every numeric-entry
 * game (PlaceValue, NumberBonds, Addition, Subtraction, MoneyMath,
 * SkipCounting, Fractions, Multiplication, MissingNumber, ...).
 *
 * Ported from the monolith's `mountNumpad(container, opts)` closure into a
 * small class using createElement() instead of innerHTML string-building,
 * and an AbortController instead of a bare addEventListener (so callers
 * can cleanly tear it down between questions).
 *
 * Usage:
 *   const pad = new Numpad(container, { maxDigits: 3, onChange: (v) => ... });
 *   pad.getValue();  // number | null
 *   pad.destroy();   // removes listeners
 */
import { createElement, haptic } from '../utils.js';

const KEY_ROWS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];

export class Numpad {
  #buf = { text: '', neg: false };
  #opts;
  #displayEl;
  #wrapEl;
  #abortController = new AbortController();

  constructor(container, opts = {}) {
    this.#opts = { maxDigits: 5, allowNegative: false, onChange: () => {}, ...opts };
    this.#wrapEl = createElement('div', { className: 'numpad-wrap' });
    this.#displayEl = createElement('div', { className: 'numpad-display' });
    this.#renderDisplay();

    const keypad = createElement('div', { className: 'numpad' });
    KEY_ROWS.forEach((key) => {
      const label = key === 'clear' ? 'Clear' : key === 'back' ? '⌫' : key;
      const cls = key === 'clear' ? 'numpad-key key-clear' : key === 'back' ? 'numpad-key key-back' : 'numpad-key';
      keypad.appendChild(createElement('button', { type: 'button', className: cls, dataset: { key }, textContent: label }));
    });
    if (this.#opts.allowNegative) {
      keypad.appendChild(createElement('button', {
        type: 'button',
        className: 'numpad-key key-neg',
        dataset: { key: 'neg' },
        style: 'grid-column: span 3;',
        textContent: '+ / − (tap to flip sign)',
      }));
    }

    this.#wrapEl.append(this.#displayEl, keypad);
    container.appendChild(this.#wrapEl);

    this.#wrapEl.addEventListener('click', (e) => this.#handleClick(e), { signal: this.#abortController.signal });
  }

  #handleClick(e) {
    const btn = e.target.closest('.numpad-key');
    if (!btn || btn.disabled) return;
    const key = btn.dataset.key;
    haptic(8);
    if (key === 'clear') { this.#buf = { text: '', neg: false }; }
    else if (key === 'back') { this.#buf.text = this.#buf.text.slice(0, -1); }
    else if (key === 'neg') { this.#buf.neg = !this.#buf.neg; }
    else if (this.#buf.text.length < this.#opts.maxDigits) { this.#buf.text += key; }
    this.#renderDisplay();
    this.#opts.onChange(this.getValue());
  }

  #renderDisplay() {
    const { text, neg } = this.#buf;
    while (this.#displayEl.firstChild) this.#displayEl.removeChild(this.#displayEl.firstChild);
    if (text.length) {
      this.#displayEl.appendChild(document.createTextNode((neg ? '\u2212' : '') + text));
      this.#displayEl.appendChild(createElement('span', { className: 'caret' }));
    } else {
      this.#displayEl.appendChild(createElement('span', { className: 'placeholder-q', textContent: '?' }));
    }
  }

  getValue() {
    if (!this.#buf.text.length) return null;
    const n = parseInt(this.#buf.text, 10);
    return this.#buf.neg ? -n : n;
  }

  reset() {
    this.#buf = { text: '', neg: false };
    this.#renderDisplay();
  }

  disable() {
    this.#wrapEl.querySelectorAll('.numpad-key').forEach((k) => { k.disabled = true; });
  }

  get el() { return this.#wrapEl; }

  /** Removes the click listener. Call before discarding the numpad. */
  destroy() {
    this.#abortController.abort();
  }
}
