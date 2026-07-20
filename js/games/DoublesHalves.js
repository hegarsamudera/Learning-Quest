import { BaseGame } from './BaseGame.js';
import { Numpad } from '../components/Numpad.js';

const ICONS = ['🍎', '🌟', '🎈', '🍪', '🐸', '🦋', '🍭', '🏀', '🐣', '🎀'];

export class DoublesHalves extends BaseGame {
  #numpad = null;

  mount(stage, q, ctx) {
    const isDouble = q.mode === 'double';
    ctx.correctAnswer = String(q.answer);
    ctx.hintText = isDouble
      ? 'Double means two groups of the same number! Count both groups.'
      : 'Half means split into two equal groups! How many in each group?';

    const icon = ICONS[q.number % ICONS.length];
    let visualHTML;

    if (isDouble) {
      const group = `<div style="background:#FFF0F8;border:2px dashed #FFB3D9;border-radius:16px;padding:10px 12px;min-width:80px;">
        <div style="font-size:10px;font-weight:800;color:#C970A0;margin-bottom:6px;">Group</div>
        <div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:center;max-width:80px;">
          ${Array.from({ length: Math.min(q.number, 10) }, () => `<span style="font-size:${q.number <= 5 ? 22 : 16}px;">${icon}</span>`).join('')}
          ${q.number > 10 ? `<span style="font-size:11px;color:var(--ink-soft);">×${q.number}</span>` : ''}
        </div></div>`;
      visualHTML = `
        <h2 style="margin-bottom:4px;">Double It! ✌️</h2>
        <p style="font-size:13px;color:var(--ink-soft);margin-bottom:12px;">Two groups of <strong>${q.number}</strong> — how many altogether?</p>
        <div style="display:flex;gap:16px;justify-content:center;margin-bottom:14px;">${group}${group}</div>
        <p style="font-size:14px;font-weight:800;margin-bottom:10px;">Double ${q.number} = ?</p>`;
    } else {
      visualHTML = `
        <h2 style="margin-bottom:4px;">Half of It! ✂️</h2>
        <p style="font-size:13px;color:var(--ink-soft);margin-bottom:12px;">Split <strong>${q.number}</strong> into 2 equal groups — how many in each?</p>
        <div style="background:#F0F8FF;border:2px dashed #A8D8F5;border-radius:16px;padding:10px 14px;margin:0 auto 14px;max-width:260px;">
          <div style="font-size:10px;font-weight:800;color:#4A90C0;margin-bottom:6px;">All ${q.number} together</div>
          <div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:center;">
            ${Array.from({ length: Math.min(q.number, 20) }, () => `<span style="font-size:${q.number <= 10 ? 20 : 14}px;">${icon}</span>`).join('')}
            ${q.number > 20 ? `<span style="font-size:11px;color:var(--ink-soft);">(${q.number} total)</span>` : ''}
          </div></div>
        <p style="font-size:14px;font-weight:800;margin-bottom:10px;">Half of ${q.number} = ?</p>`;
    }

    stage.innerHTML = `
      <div class="eq-card" style="padding:16px 14px;text-align:center;">
        ${visualHTML}
        <div class="numpad-answer-row"><div class="numpad-display" id="dhDisplay" style="min-width:70px;font-size:28px;">_</div></div>
        <div id="numpadHost" style="margin-top:14px;"></div>
        <button class="btn btn-primary" id="dhCheck" style="margin-top:14px;width:100%;max-width:220px;" disabled>✅ Check!</button>
      </div>`;

    let current = '';
    const dispEl = stage.querySelector('#dhDisplay');
    const checkBtn = stage.querySelector('#dhCheck');
    const updateDisplay = () => {
      dispEl.textContent = current === '' ? '_' : current;
      checkBtn.disabled = current === '';
    };

    this.#numpad = new Numpad(stage.querySelector('#numpadHost'), {
      maxDigits: 3,
      onChange: (val) => { current = val === null ? '' : String(val); updateDisplay(); },
    });
    this.#numpad.el.querySelector('.numpad-display').style.display = 'none';

    checkBtn.addEventListener('click', () => ctx.onCheck(parseInt(current, 10) === q.answer), { signal: this.signal });
  }

  unmount() {
    this.#numpad?.destroy();
    this.#numpad = null;
    super.unmount();
  }
}
