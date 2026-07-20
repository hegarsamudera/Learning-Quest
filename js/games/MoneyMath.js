import { BaseGame } from './BaseGame.js';

const formatRupiah = (n) => `Rp${n.toLocaleString('id-ID')}`;

export class MoneyMath extends BaseGame {
  mount(stage, q, ctx) {
    const vals = {};
    q.denoms.forEach((d) => { vals[d] = 0; });
    const currentTotal = () => q.denoms.reduce((sum, d) => sum + d * vals[d], 0);

    const render = () => {
      const target = q.amount;
      const current = currentTotal();
      ctx.correctAnswer = formatRupiah(target);

      const eqParts = q.denoms
        .filter((d) => vals[d] > 0)
        .map((d) => `<span class="place-eq-total">${vals[d]}×${formatRupiah(d)}</span>`);
      const eqHTML = eqParts.length
        ? `<div class="place-eq">${eqParts.join(' + ')} = <span class="place-eq-total">${formatRupiah(current)}</span></div>`
        : '<div class="place-eq" style="opacity:0;">&nbsp;</div>';

      const controlsHTML = q.denoms.map((d, i) => `
        <div class="disc-controls">
          <button class="round-btn" data-d="${d}" data-dir="-1">-</button>
          <div class="money-bill">${formatRupiah(d)}</div>
          <button class="round-btn" data-d="${d}" data-dir="1">+</button>
          <span style="display:inline-block;width:40px;font-weight:bold;font-size:18px;">×${vals[d]}</span>
        </div>`).join('');

      stage.innerHTML = `
        <div class="eq-card" style="padding:18px 14px;">
          <h2 style="margin-bottom:10px;">Make ${formatRupiah(target)}</h2>
          <div style="font-size:38px; font-weight:bold; margin: 10px 0; color:var(--ink);">${formatRupiah(current)}</div>
          ${eqHTML}
          <div style="margin-top:20px; display:flex; flex-direction:column; gap:12px;">${controlsHTML}</div>
          <button class="btn btn-primary" style="margin-top:30px; width:100%; max-width:240px;" id="checkBtn">Check Answer</button>
        </div>`;

      stage.querySelectorAll('.round-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const d = Number(btn.dataset.d);
          const dir = Number(btn.dataset.dir);
          if (dir < 0 && vals[d] > 0) vals[d]--;
          if (dir > 0 && vals[d] < 9) vals[d]++;
          render();
        }, { signal: this.signal });
      });
      stage.querySelector('#checkBtn').addEventListener('click', () => {
        ctx.onCheck(currentTotal() === target);
      }, { signal: this.signal });
    };

    render();
  }
}
