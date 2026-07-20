import { BaseGame } from './BaseGame.js';
import { Numpad } from '../components/Numpad.js';
import { escapeHTML } from '../utils.js';

export class Subtraction extends BaseGame {
  #numpad = null;

  mount(stage, q, ctx) {
    const ans = q.a - q.b;
    ctx.correctAnswer = ans;

    stage.innerHTML = `
      <h2 style="font-size:22px; margin-bottom:16px; color:var(--ink-soft);">What is the difference?</h2>
      ${q.hint ? `<p style="color:var(--ink-soft);font-style:italic;margin-bottom:16px;">💡 ${escapeHTML(q.hint)}</p>` : ''}
      <div class="eq-card" style="display:inline-flex; flex-direction:column; align-items:flex-end; padding:24px 36px 20px; box-shadow:var(--shadow-card); min-width:160px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <span style="font-size:32px; font-weight:900; color:var(--ink);">${q.a}</span>
        </div>
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
          <span style="font-size:28px; font-weight:900; color:var(--coral); margin-right:4px;">−</span>
          <span style="font-size:32px; font-weight:900; color:var(--coral);">${q.b}</span>
        </div>
        <div style="width:100%; height:4px; background:var(--ink); border-radius:2px; margin-bottom:14px;"></div>
        <div style="display:flex; align-items:center; gap:10px; align-self:center;">
          <span style="font-size:28px; font-weight:900; color:var(--ink-soft); margin-right:4px;">=</span>
          <div class="numpad-display" id="npDisplayHost" style="border:3px dashed var(--coral); width:96px;"><span class="placeholder-q">?</span></div>
        </div>
        <div id="numpadHost" style="align-self:center; width:100%;"></div>
      </div>
      <button class="btn btn-primary" id="checkBtn" style="margin-top:18px; width:100%; max-width:240px;" disabled>Check Answer</button>`;

    const dispHost = stage.querySelector('#npDisplayHost');
    const checkBtn = stage.querySelector('#checkBtn');

    this.#numpad = new Numpad(stage.querySelector('#numpadHost'), {
      maxDigits: 3,
      onChange: (val) => {
        dispHost.innerHTML = val === null ? '<span class="placeholder-q">?</span>' : escapeHTML(String(val));
        checkBtn.disabled = val === null;
      },
    });
    this.#numpad.el.querySelector('.numpad-display').style.display = 'none';

    checkBtn.addEventListener('click', () => {
      const val = this.#numpad.getValue();
      if (val === null) return;
      ctx.onCheck(val === ans);
    }, { signal: this.signal });
  }

  unmount() {
    this.#numpad?.destroy();
    this.#numpad = null;
    super.unmount();
  }
}
