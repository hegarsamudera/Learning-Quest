import { BaseGame } from './BaseGame.js';
import { Numpad } from '../components/Numpad.js';

export class NumberBonds extends BaseGame {
  #numpad = null;

  mount(stage, q, ctx) {
    const missingKey = q.whole === null ? 'whole' : (q.part1 === null ? 'part1' : 'part2');
    const targetAns = missingKey === 'whole' ? q.part1 + q.part2 : q.whole - (missingKey === 'part1' ? q.part2 : q.part1);
    ctx.correctAnswer = targetAns;

    const wStr = missingKey === 'whole' ? '<span id="bondBlank">?</span>' : q.whole;
    const p1Str = missingKey === 'part1' ? '<span id="bondBlank">?</span>' : q.part1;
    const p2Str = missingKey === 'part2' ? '<span id="bondBlank">?</span>' : q.part2;

    stage.innerHTML = `
      <div class="eq-card" style="padding:18px 14px;">
        <div class="number-bond">
          <div class="bond-circle">${wStr}</div>
          <svg width="120" height="50"><line x1="60" y1="0" x2="20" y2="50" stroke="var(--line)" stroke-width="4"/><line x1="60" y1="0" x2="100" y2="50" stroke="var(--line)" stroke-width="4"/></svg>
          <div class="bond-parts">
            <div class="bond-circle">${p1Str}</div>
            <div class="bond-circle">${p2Str}</div>
          </div>
          <div id="numpadHost"></div>
          <button class="btn btn-primary" id="checkBtn" style="margin-top:18px; width:100%; max-width:240px;" disabled>Check Answer</button>
        </div>
      </div>`;

    const blank = stage.querySelector('#bondBlank');
    const checkBtn = stage.querySelector('#checkBtn');

    this.#numpad = new Numpad(stage.querySelector('#numpadHost'), {
      maxDigits: 3,
      onChange: (val) => {
        blank.textContent = val === null ? '?' : val;
        checkBtn.disabled = val === null;
      },
    });

    checkBtn.addEventListener('click', () => {
      const val = this.#numpad.getValue();
      if (val === null) return;
      ctx.onCheck(val === targetAns);
    }, { signal: this.signal });
  }

  unmount() {
    this.#numpad?.destroy();
    this.#numpad = null;
    super.unmount();
  }
}
