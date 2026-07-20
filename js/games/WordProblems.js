import { BaseGame } from './BaseGame.js';
import { Numpad } from '../components/Numpad.js';
import { escapeHTML } from '../utils.js';

export class WordProblems extends BaseGame {
  #numpad = null;

  mount(stage, q, ctx) {
    ctx.correctAnswer = `${q.answer} ${q.unit}`;
    ctx.hintText = q.hint;

    stage.innerHTML = `
      <div class="eq-card" style="padding:16px 14px;text-align:center;">
        <div style="font-size:48px;margin-bottom:10px;">${q.emoji}</div>
        <div style="background:#FFF7DD;border:2px solid #FFE49C;border-radius:16px;padding:14px 16px;margin-bottom:16px;text-align:left;">
          <p style="font-size:15px;font-weight:700;color:#3A2E00;line-height:1.5;margin:0;">${escapeHTML(q.story)}</p>
        </div>
        <p style="font-size:13px;font-weight:800;color:var(--ink-soft);margin-bottom:10px;">Your answer:</p>
        <div class="numpad-answer-row">
          <div class="numpad-display" id="wpDisplay" style="min-width:80px;font-size:28px;">_</div>
          <span style="font-size:14px;font-weight:700;color:var(--ink-soft);margin-left:8px;">${escapeHTML(q.unit)}</span>
        </div>
        <div id="numpadHost" style="margin-top:14px;"></div>
        <button class="btn btn-primary" id="wpCheck" style="margin-top:14px;width:100%;max-width:220px;" disabled>✅ Check!</button>
      </div>`;

    const dispEl = stage.querySelector('#wpDisplay');
    const checkBtn = stage.querySelector('#wpCheck');
    let current = '';

    const updateDisplay = () => {
      dispEl.textContent = current === '' ? '_' : current;
      checkBtn.disabled = current === '';
    };

    this.#numpad = new Numpad(stage.querySelector('#numpadHost'), {
      maxDigits: 4,
      onChange: (val) => { current = val === null ? '' : String(val); updateDisplay(); },
    });
    this.#numpad.el.querySelector('.numpad-display').style.display = 'none';

    checkBtn.addEventListener('click', () => {
      ctx.onCheck(parseInt(current, 10) === q.answer);
    }, { signal: this.signal });
  }

  unmount() {
    this.#numpad?.destroy();
    this.#numpad = null;
    super.unmount();
  }
}
