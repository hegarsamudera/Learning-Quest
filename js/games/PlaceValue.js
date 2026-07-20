import { BaseGame } from './BaseGame.js';
import { Numpad } from '../components/Numpad.js';
import { escapeHTML } from '../utils.js';

/**
 * PlaceValue — two question modes ported from RENDERERS.placeValue:
 *  - "readBlocks": kid counts hundreds/tens/ones blocks and types the total
 *  - digitValue (default): a number is shown with one digit highlighted;
 *    kid picks what that digit is worth (e.g. the "4" in 45 is worth 40)
 *
 * Markup is built with template literals (structure is static and
 * trusted); every data-driven value that lands inside the markup is run
 * through escapeHTML() first, per the app's safe-HTML convention.
 */
export class PlaceValue extends BaseGame {
  #numpad = null;

  mount(stage, q, ctx) {
    if (q.mode === 'readBlocks') this.#mountReadBlocks(stage, q, ctx);
    else this.#mountDigitValue(stage, q, ctx);
  }

  #mountReadBlocks(stage, q, ctx) {
    ctx.correctAnswer = q.number;
    const stack = (count, cls) => (count > 0
      ? Array.from({ length: count }, () => `<div class="${cls}">${cls === 'disc-hundreds' ? 100 : cls === 'disc-tens' ? 10 : 1}</div>`).join('')
      : '<div class="pv-block-zero">0</div>');

    stage.innerHTML = `
      <div class="eq-card" style="padding:16px 14px;">
        <h2 style="margin-bottom:4px;">How many in all?</h2>
        <p style="color:var(--ink-soft);margin-bottom:10px;">Count the blocks, then type the number</p>
        <div class="pv-blocks-row">
          <div class="pv-block-group"><div class="pv-block-stack">${stack(q.hundreds, 'disc-hundreds')}</div><div class="pv-block-label">hundreds</div></div>
          <div class="pv-block-group"><div class="pv-block-stack">${stack(q.tens, 'disc-tens')}</div><div class="pv-block-label">tens</div></div>
          <div class="pv-block-group"><div class="pv-block-stack">${stack(q.ones, 'disc-ones')}</div><div class="pv-block-label">ones</div></div>
        </div>
        <div id="numpadHost"></div>
        <button class="btn btn-primary" id="checkBtn" style="margin-top:14px; width:100%; max-width:240px;" disabled>Check Answer</button>
      </div>`;

    const checkBtn = stage.querySelector('#checkBtn');
    this.#numpad = new Numpad(stage.querySelector('#numpadHost'), {
      maxDigits: 3,
      onChange: (val) => { checkBtn.disabled = val === null; },
    });
    checkBtn.addEventListener('click', () => ctx.onCheck(this.#numpad.getValue() === q.number), { signal: this.signal });
  }

  #mountDigitValue(stage, q, ctx) {
    ctx.correctAnswer = q.answer;
    let selected = null;

    const render = () => {
      const numStr = String(q.number);
      const digitsHTML = [...numStr]
        .map((d, i) => `<span class="pv-digit${i === q.highlightIndex ? ' pv-digit-highlight' : ''}">${escapeHTML(d)}</span>`)
        .join('');
      const optionsHTML = q.options
        .map((opt, i) => `<button class="time-option-btn${selected === opt ? ' selected' : ''}" data-i="${i}">${escapeHTML(opt)}</button>`)
        .join('');

      stage.innerHTML = `
        <div class="eq-card" style="padding:16px 14px;">
          <h2 style="margin-bottom:4px;">What is this digit worth?</h2>
          <p style="color:var(--ink-soft);margin-bottom:10px;">Look at the highlighted digit</p>
          <div class="pv-number-display">${digitsHTML}</div>
          <div class="time-options" style="margin-top:14px;">${optionsHTML}</div>
          <button class="btn btn-primary" id="checkBtn" style="margin-top:16px; width:100%; max-width:260px;" ${selected === null ? 'disabled' : ''}>Check Answer</button>
        </div>`;

      stage.querySelectorAll('.time-option-btn').forEach((btn) => {
        btn.addEventListener('click', () => { selected = q.options[Number(btn.dataset.i)]; render(); }, { signal: this.signal });
      });
      stage.querySelector('#checkBtn').addEventListener('click', () => {
        if (selected === null) return;
        ctx.onCheck(selected === q.answer);
      }, { signal: this.signal });
    };

    render();
  }

  unmount() {
    this.#numpad?.destroy();
    this.#numpad = null;
    super.unmount();
  }
}
