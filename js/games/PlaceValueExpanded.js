import { BaseGame } from './BaseGame.js';

export class PlaceValueExpanded extends BaseGame {
  mount(stage, q, ctx) {
    const isThreeDigit = q.number >= 100;
    ctx.correctAnswer = `${isThreeDigit ? `${q.hundreds}00 + ` : ''}${q.tens}0 + ${q.ones}`;
    ctx.hintText = 'How many hundreds? How many tens? How many ones?';

    const COLORS = {
      H: { bg: '#FFE49C', border: '#F4A828', label: 'Hundreds', val: q.hundreds },
      T: { bg: '#C9A8F5', border: '#7A6FCB', label: 'Tens', val: q.tens },
      O: { bg: '#A8EBD0', border: '#1FA391', label: 'Ones', val: q.ones },
    };
    const parts = isThreeDigit ? ['H', 'T', 'O'] : ['T', 'O'];

    const partsHTML = parts.map((k, i) => {
      const c = COLORS[k];
      const plus = i < parts.length - 1 ? '<div style="font-size:24px;font-weight:900;color:var(--ink-soft);">+</div>' : '';
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <input type="number" id="pve_${k}" min="0" max="9" style="width:56px;height:56px;border-radius:14px;border:3px solid ${c.border};background:${c.bg};text-align:center;font-size:24px;font-weight:900;font-family:var(--font-display);color:#1B2A4A;" placeholder="?" inputmode="numeric">
        <span style="font-size:10px;font-weight:800;color:${c.border};">${c.label}</span>
      </div>${plus}`;
    }).join('');

    stage.innerHTML = `
      <div class="eq-card" style="padding:16px 14px;text-align:center;">
        <h2 style="margin-bottom:4px;">Expanded Numbers 🔢</h2>
        <p style="font-size:12px;color:var(--ink-soft);margin-bottom:14px;">Break this number into parts!</p>
        <div style="font-size:52px;font-weight:900;font-family:var(--font-display);color:var(--ink);margin-bottom:16px;letter-spacing:.04em;">${q.number}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:18px;">
          ${partsHTML}
          <div style="font-size:24px;font-weight:900;color:var(--ink-soft);">=</div>
          <div style="font-size:24px;font-weight:900;color:var(--ink);">${q.number}</div>
        </div>
        <button class="btn btn-primary" id="pveCheck" style="width:100%;max-width:220px;" disabled>✅ Check!</button>
      </div>`;

    const getVals = () => Object.fromEntries(parts.map((k) => [k, (stage.querySelector(`#pve_${k}`)?.value || '').trim()]));
    const allFilled = (vals) => parts.every((k) => vals[k] !== '');

    parts.forEach((k) => {
      stage.querySelector(`#pve_${k}`)?.addEventListener('input', () => {
        stage.querySelector('#pveCheck').disabled = !allFilled(getVals());
      }, { signal: this.signal });
    });

    stage.querySelector('#pveCheck').addEventListener('click', () => {
      const vals = getVals();
      const correct = (!isThreeDigit || parseInt(vals.H || '0', 10) === q.hundreds)
        && parseInt(vals.T || '0', 10) === q.tens
        && parseInt(vals.O || '0', 10) === q.ones;
      ctx.onCheck(correct);
    }, { signal: this.signal });
  }
}
