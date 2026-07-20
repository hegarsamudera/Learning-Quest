import { BaseGame } from './BaseGame.js';
import { Numpad } from '../components/Numpad.js';

export class SkipCounting extends BaseGame {
  #numpad = null;

  mount(stage, q, ctx) {
    const sequence = Array.from({ length: q.length }, (_, i) => q.start + i * q.step);
    const answer = sequence[q.blankIndex];
    ctx.correctAnswer = answer;
    const needsNegative = answer < 0;

    const rowHTML = sequence.map((val, i) => {
      const arrow = i > 0 ? '<span class="skip-arrow">→</span>' : '';
      const box = i === q.blankIndex
        ? '<div class="skip-box skip-input" id="npDisplayHost"><span class="placeholder-q">?</span></div>'
        : `<div class="skip-box">${val}</div>`;
      return arrow + box;
    }).join('');

    stage.innerHTML = `
      <div class="eq-card" style="padding:18px 14px;">
        <h2 style="margin-bottom:6px;">Fill in the missing number</h2>
        <p style="color:var(--ink-soft);margin-bottom:10px;">What comes next in the pattern?</p>
        <div class="skip-row">${rowHTML}</div>
        <div id="numpadHost" style="margin-top:14px;"></div>
        <button class="btn btn-primary" id="checkBtn" style="margin-top:18px; width:100%; max-width:240px;" disabled>Check Answer</button>
      </div>`;

    const dispHost = stage.querySelector('#npDisplayHost');
    const checkBtn = stage.querySelector('#checkBtn');

    this.#numpad = new Numpad(stage.querySelector('#numpadHost'), {
      maxDigits: 3,
      allowNegative: needsNegative,
      onChange: (val) => {
        dispHost.innerHTML = val === null ? '<span class="placeholder-q">?</span>' : val;
        checkBtn.disabled = val === null;
      },
    });
    this.#numpad.el.querySelector('.numpad-display').style.display = 'none';

    checkBtn.addEventListener('click', () => {
      const val = this.#numpad.getValue();
      if (val === null) return;
      ctx.onCheck(val === answer);
    }, { signal: this.signal });
  }

  unmount() {
    this.#numpad?.destroy();
    this.#numpad = null;
    super.unmount();
  }
}
