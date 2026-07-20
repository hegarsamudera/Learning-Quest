import { BaseGame } from './BaseGame.js';
import { escapeHTML } from '../utils.js';

const MODE_COPY = {
  extend: { title: 'What comes next?', hint: 'Spot the pattern, then tap the next piece', hintText: "Look at how the pieces repeat from left to right — what piece would come right after the last one?" },
  'find-missing': { title: 'Find the missing piece!', hint: 'Look at the pattern and fill in the blank', hintText: "Cover up the blank and look at what's on both sides of it — what piece keeps the repeating pattern going?" },
  rule: { title: "What's the next number?", hint: 'Find the rule, then pick the answer', hintText: 'Look at how much the numbers go up (or down) by each time — that same jump tells you the next number.' },
};

export class PatternDetective extends BaseGame {
  mount(stage, q, ctx) {
    let selected = null;
    const correctAnswer = String(q.answer);
    ctx.correctAnswer = correctAnswer;
    const copy = MODE_COPY[q.mode] || MODE_COPY.rule;
    ctx.hintText = copy.hintText;

    const tileLabel = (val) => (val === '?' ? '?' : String(val));
    const blankTile = () => (selected !== null
      ? `<div class="pd-tile pd-blank-filled">${escapeHTML(String(selected))}</div>`
      : '<div class="pd-tile pd-blank">?</div>');

    const render = () => {
      let tilesHTML = '';
      if (q.mode === 'extend' || q.mode === 'rule') {
        tilesHTML = q.tiles.map((t) => `<div class="pd-tile">${tileLabel(t)}</div>`).join('')
          + '<div style="font-size:22px;display:flex;align-items:center;color:var(--ink-soft);">→</div>'
          + blankTile();
      } else {
        tilesHTML = q.tiles.map((t, i) => (i === q.blankIndex ? blankTile() : `<div class="pd-tile">${tileLabel(t)}</div>`)).join('');
      }

      let ruleLabelHTML = '';
      if (q.mode === 'rule') {
        const nums = q.tiles.filter((t) => typeof t === 'number');
        if (nums.length >= 2) {
          const diff = nums[1] - nums[0];
          const isConstantAdd = nums.every((n, i) => i === 0 || n - nums[i - 1] === diff);
          if (isConstantAdd && diff > 0) ruleLabelHTML = `<p class="pd-rule-label">Rule: count by ${diff}s 🔢</p>`;
          else if (isConstantAdd && diff < 0) ruleLabelHTML = `<p class="pd-rule-label">Rule: count back by ${Math.abs(diff)}s 🔢</p>`;
          else ruleLabelHTML = '<p class="pd-rule-label">Hint: look at how each number changes 🔍</p>';
        }
      }

      const optionsHTML = q.options.map((opt) => {
        const isSelected = selected !== null && String(selected) === String(opt);
        return `<button class="pd-option-btn${isSelected ? ' selected' : ''}" data-opt="${escapeHTML(String(opt))}">${escapeHTML(String(opt))}</button>`;
      }).join('');

      stage.innerHTML = `
        <div class="eq-card" style="padding:18px 14px; text-align:center;">
          <h2 style="margin-bottom:4px;">${copy.title}</h2>
          <p style="color:var(--ink-soft);margin-bottom:2px;font-size:13px;">${copy.hint}</p>
          <div class="pd-tiles-row">${tilesHTML}</div>
          ${ruleLabelHTML}
          <div class="pd-options">${optionsHTML}</div>
          <button class="btn btn-primary" id="checkBtn" style="margin-top:20px;width:100%;max-width:240px;" ${selected !== null ? '' : 'disabled'}>Check Answer</button>
        </div>`;

      stage.querySelectorAll('.pd-option-btn').forEach((btn) => {
        btn.addEventListener('click', () => { selected = btn.dataset.opt; render(); }, { signal: this.signal });
      });
      stage.querySelector('#checkBtn')?.addEventListener('click', () => {
        if (selected === null) return;
        ctx.onCheck(String(selected) === correctAnswer);
      }, { signal: this.signal });
    };

    render();
  }
}
