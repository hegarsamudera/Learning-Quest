import { BaseGame } from './BaseGame.js';
import { SFX } from '../audio.js';

const BAR_COLORS = ['#FF6B5B', '#F4A828', '#1FA391', '#7A6FCB', '#FFB3D9', '#A8D8F5', '#A8EBD0', '#FFE49C'];

export class SortItOut extends BaseGame {
  mount(stage, q, ctx) {
    let values = [...q.values];
    const originalValues = [...q.values];
    let selectedIdx = null;
    let swapCount = 0;
    const isDesc = q.targetOrder === 'desc';

    const targetSorted = [...originalValues].sort((a, b) => (isDesc ? b - a : a - b));
    ctx.correctAnswer = targetSorted.join(isDesc ? ' > ' : ' < ');
    ctx.hintText = `Tap a bar, then tap another bar to swap them. Get them ${isDesc ? 'tallest to shortest' : 'shortest to tallest'}!`;

    const isSorted = () => values.every((v, i) => i === values.length - 1 || (isDesc ? v >= values[i + 1] : v <= values[i + 1]));

    const render = () => {
      const maxVal = Math.max(...values);
      const maxH = 120;

      const barsHTML = values.map((v, i) => {
        const h = Math.round((v / maxVal) * maxH);
        const col = BAR_COLORS[i % BAR_COLORS.length];
        const isSelected = selectedIdx === i;
        const barStyle = `height:${h}px;background:${col};width:clamp(28px,8vw,44px);border-radius:8px 8px 0 0;${isSelected ? `outline:3px solid ${col};box-shadow:0 0 0 3px #fff,0 0 0 6px ${col};` : ''}`;
        return `<div class="si-bar-wrap${isSelected ? ' si-selected' : ''}" data-baridx="${i}"><div class="si-bar" style="${barStyle}"></div><div class="si-bar-val">${v}</div></div>`;
      }).join('');

      const targetChipsHTML = targetSorted.map((v) => `<span class="si-target-chip">${v}</span>`).join('');

      stage.innerHTML = `
        <div class="eq-card" style="padding:14px 10px;">
          <h2 style="margin-bottom:2px;">Sort It Out 📊</h2>
          <p class="si-instruction">Tap two bars to swap them · get them ${isDesc ? 'tallest → shortest' : 'shortest → tallest'}</p>
          ${swapCount > 0 ? `<p class="si-swap-counter">Swaps made: ${swapCount}</p>` : ''}
          <div class="si-stage" id="siStage">${barsHTML}</div>
          <div class="si-target-row"><span style="font-size:11px;color:var(--ink-soft);font-weight:700;">Goal:</span>${targetChipsHTML}</div>
          <button class="btn btn-primary" id="siCheckBtn" style="margin-top:10px;width:100%;max-width:220px;" ${isSorted() ? '' : 'disabled'}>✅ Check!</button>
        </div>`;

      stage.querySelectorAll('[data-baridx]').forEach((el) => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.baridx, 10);
          if (selectedIdx === null) selectedIdx = idx;
          else if (selectedIdx === idx) selectedIdx = null;
          else {
            [values[selectedIdx], values[idx]] = [values[idx], values[selectedIdx]];
            swapCount++;
            selectedIdx = null;
            SFX.coin();
          }
          render();
        }, { signal: this.signal });
      });
      stage.querySelector('#siCheckBtn')?.addEventListener('click', () => ctx.onCheck(isSorted()), { signal: this.signal });
    };

    render();
  }
}
