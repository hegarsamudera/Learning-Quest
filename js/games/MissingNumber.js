import { BaseGame } from './BaseGame.js';
import { Numpad } from '../components/Numpad.js';
import { escapeHTML } from '../utils.js';

export class MissingNumber extends BaseGame {
  #numpad = null;

  mount(stage, q, ctx) {
    const answer = q.missing === 'left' ? q.a : q.b;
    ctx.correctAnswer = String(answer);
    ctx.hintText = q.op === '+'
      ? 'Think about what number you need to add to get the answer on the right!'
      : 'Think about what number makes the subtraction work out!';

    const leftVal = q.missing === 'left' ? '?' : String(q.a);
    const rightVal = q.missing === 'right' ? '?' : String(q.b);

    const numBox = (val, isMissing) => (isMissing
      ? '<div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#C9A8F5,#A8D8F5);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#fff;box-shadow:0 4px 14px rgba(122,111,203,.4);border:3px solid #7A6FCB;" id="mnBox">?</div>'
      : `<div style="width:64px;height:64px;border-radius:16px;background:var(--card-solid);border:2px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:var(--ink);">${escapeHTML(val)}</div>`);
    const opBox = (op) => `<div style="font-size:28px;font-weight:900;color:var(--ink-soft);">${op}</div>`;
    const eqBox = (val) => `<div style="font-size:28px;font-weight:900;color:var(--ink-soft);">=</div><div style="width:64px;height:64px;border-radius:16px;background:var(--success-bg);border:2px solid var(--success);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:var(--success);">${val}</div>`;

    stage.innerHTML = `
      <div class="eq-card" style="padding:18px 14px;text-align:center;">
        <h2 style="margin-bottom:6px;">Find the Mystery Number! 🔍</h2>
        <p style="font-size:12px;color:var(--ink-soft);margin-bottom:18px;">What number goes in the box?</p>
        <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
          ${numBox(leftVal, q.missing === 'left')}${opBox(q.op)}${numBox(rightVal, q.missing === 'right')}${eqBox(q.result)}
        </div>
        <div class="numpad-answer-row"><div class="numpad-display" id="mnDisplay" style="min-width:70px;font-size:26px;">_</div></div>
        <div id="numpadHost" style="margin-top:14px;"></div>
        <button class="btn btn-primary" id="mnCheck" style="margin-top:14px;width:100%;max-width:220px;" disabled>✅ Check!</button>
      </div>`;

    let current = '';
    const dispEl = stage.querySelector('#mnDisplay');
    const boxEl = stage.querySelector('#mnBox');
    const checkBtn = stage.querySelector('#mnCheck');
    const updateDisplay = () => {
      dispEl.textContent = current === '' ? '_' : current;
      if (boxEl) boxEl.textContent = current === '' ? '?' : current;
      checkBtn.disabled = current === '';
    };

    this.#numpad = new Numpad(stage.querySelector('#numpadHost'), {
      maxDigits: 4,
      onChange: (val) => { current = val === null ? '' : String(val); updateDisplay(); },
    });
    this.#numpad.el.querySelector('.numpad-display').style.display = 'none';

    checkBtn.addEventListener('click', () => ctx.onCheck(parseInt(current, 10) === answer), { signal: this.signal });
  }

  unmount() {
    this.#numpad?.destroy();
    this.#numpad = null;
    super.unmount();
  }
}
