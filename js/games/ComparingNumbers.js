import { BaseGame } from './BaseGame.js';

const SYMBOLS = ['<', '=', '>'];

export class ComparingNumbers extends BaseGame {
  mount(stage, q, ctx) {
    const correctSymbol = q.a < q.b ? '<' : (q.a > q.b ? '>' : '=');
    let selected = null;

    const render = () => {
      ctx.correctAnswer = correctSymbol;
      const optsHTML = SYMBOLS.map((sym, i) => `<button class="symbol-btn${selected === sym ? ' selected' : ''}" data-i="${i}">${sym}</button>`).join('');

      stage.innerHTML = `
        <div class="eq-card" style="padding:18px 14px;">
          <h2 style="margin-bottom:6px;">Compare the numbers</h2>
          <p style="color:var(--ink-soft);margin-bottom:10px;">Tap &lt;, =, or &gt;</p>
          <div class="compare-row">
            <div class="skip-box">${q.a}</div>
            <div class="compare-symbol" id="symBox">${selected || '?'}</div>
            <div class="skip-box">${q.b}</div>
          </div>
          <div class="compare-options">${optsHTML}</div>
          <button class="btn btn-primary" id="checkBtn" style="margin-top:30px; width:100%; max-width:240px;" ${selected ? '' : 'disabled'}>Check Answer</button>
        </div>`;

      stage.querySelectorAll('.symbol-btn').forEach((btn) => {
        btn.addEventListener('click', () => { selected = SYMBOLS[Number(btn.dataset.i)]; render(); }, { signal: this.signal });
      });
      stage.querySelector('#checkBtn').addEventListener('click', () => {
        if (!selected) return;
        ctx.onCheck(selected === correctSymbol);
      }, { signal: this.signal });
    };

    render();
  }
}
