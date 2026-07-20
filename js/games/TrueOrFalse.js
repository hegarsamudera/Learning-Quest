import { BaseGame } from './BaseGame.js';
import { escapeHTML } from '../utils.js';

/** TrueOrFalse — kid-friendly logic gates (AND/OR/NOT) wrapped in a
 *  real-world story ("both friends must say yes" etc). */
export class TrueOrFalse extends BaseGame {
  mount(stage, q, ctx) {
    const { inputs, gate, expected } = q;
    let selectedAnswer = null;

    ctx.correctAnswer = expected ? 'YES ✅' : 'NO ❌';
    ctx.hintText = gate === 'AND'
      ? 'AND means ALL of them must be ready! If even one says NO, the answer is NO.'
      : gate === 'OR'
        ? 'OR means just ONE of them is enough! If at least one says YES, the answer is YES.'
        : 'NOT flips the answer! If it says YES, NOT makes it NO. If it says NO, NOT makes it YES!';

    const render = () => {
      const gateColor = gate === 'AND' ? 'var(--teal)' : gate === 'OR' ? 'var(--violet)' : 'var(--coral)';
      const gateDesc = gate === 'AND' ? 'BOTH must be YES' : gate === 'OR' ? 'AT LEAST ONE must be YES' : 'Flip it!';

      const inputsHTML = inputs.map((inp) => {
        const isYes = inp.value;
        const bg = isYes ? '#E8F8F0' : '#FFF0F0';
        const border = isYes ? 'var(--success)' : 'var(--coral)';
        const badge = isYes ? (q.trueLabel || 'YES') : (q.falseLabel || 'NO');
        const badgeColor = isYes ? 'var(--success)' : 'var(--coral)';
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;background:${bg};border:2.5px solid ${border};border-radius:14px;padding:10px 14px;min-width:80px;">
          <span style="font-size:32px;line-height:1;">${inp.emoji}</span>
          <span style="font-size:12px;font-weight:700;color:var(--ink);">${escapeHTML(inp.name)}</span>
          <span style="font-size:13px;font-weight:900;color:${badgeColor};">${badge}</span>
        </div>`;
      }).join('');

      const yesSelected = selectedAnswer === true;
      const noSelected = selectedAnswer === false;
      const outcomeHTML = selectedAnswer !== null
        ? `<div style="text-align:center;font-size:18px;font-weight:800;margin-bottom:10px;color:${selectedAnswer ? 'var(--success)' : 'var(--coral)'};">${escapeHTML(selectedAnswer ? (q.outcomeTrue || 'YES!') : (q.outcomeFalse || 'NO!'))}</div>`
        : '';

      stage.innerHTML = `
        <div class="eq-card" style="padding:14px 10px;">
          <h2 style="margin-bottom:2px;font-size:16px;">${escapeHTML(q.story)}</h2>
          <p style="font-size:12px;color:var(--ink-soft);margin-bottom:12px;">${escapeHTML(q.rule)}</p>
          <div style="display:flex;gap:10px;justify-content:center;margin-bottom:12px;flex-wrap:wrap;">${inputsHTML}</div>
          <div style="text-align:center;margin-bottom:12px;">
            <div style="display:inline-block;background:${gateColor};color:#fff;border-radius:999px;padding:6px 18px;font-family:var(--font-display);font-weight:900;font-size:15px;letter-spacing:.04em;">${gate}</div>
            <div style="font-size:11px;color:var(--ink-soft);font-weight:700;margin-top:4px;">${gateDesc}</div>
          </div>
          <div style="text-align:center;font-size:22px;margin-bottom:10px;">⬇️</div>
          <p style="text-align:center;font-size:13px;font-weight:700;color:var(--ink);margin-bottom:8px;">What is the answer?</p>
          <div style="display:flex;gap:12px;justify-content:center;margin-bottom:12px;">
            <button class="tf-option-btn${yesSelected ? ' tf-selected' : ''}" data-ans="true" style="${yesSelected ? 'background:var(--success);border-color:var(--success);color:#fff;transform:scale(1.06);' : ''}">✅ YES</button>
            <button class="tf-option-btn${noSelected ? ' tf-selected' : ''}" data-ans="false" style="${noSelected ? 'background:var(--coral);border-color:var(--coral);color:#fff;transform:scale(1.06);' : ''}">❌ NO</button>
          </div>
          ${outcomeHTML}
          <button class="btn btn-primary" id="tfCheckBtn" style="width:100%;max-width:220px;" ${selectedAnswer !== null ? '' : 'disabled'}>Check!</button>
        </div>`;

      stage.querySelectorAll('[data-ans]').forEach((btn) => {
        btn.addEventListener('click', () => { selectedAnswer = btn.dataset.ans === 'true'; render(); }, { signal: this.signal });
      });
      stage.querySelector('#tfCheckBtn')?.addEventListener('click', () => ctx.onCheck(selectedAnswer === expected), { signal: this.signal });
    };

    render();
  }
}
