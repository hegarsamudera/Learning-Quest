import { BaseGame } from './BaseGame.js';
import { Numpad } from '../components/Numpad.js';
import { escapeHTML, shuffleArray } from '../utils.js';

const makeEmoji = (count, emoji) => Array.from({ length: count }, () => `<span class="mult-emoji-item">${emoji}</span>`).join('');

const makeDotGrid = (rows, cols) => {
  let html = `<div class="mult-dot-grid" style="grid-template-columns:repeat(${cols},1fr);">`;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) html += `<div class="mult-dot row-${r % 2}"></div>`;
  }
  return html + '</div>';
};

const makeRepeatedAddHTML = (a, b) => {
  const parts = Array.from({ length: b }, () => `<span class="mult-addend-chip">${a}</span>`);
  return `${parts.join('<span class="mult-plus-sign"> + </span>')}<span class="mult-equals-sign"> = </span><span class="mult-answer-blank">?</span>`;
};

const storyText = (q) => q.story
  .replace(/\{a\}/g, `<strong>${q.a}</strong>`)
  .replace(/\{b\}/g, `<strong>${q.b}</strong>`)
  .replace(/\{emoji\}/g, q.emoji);

export class Multiplication extends BaseGame {
  #numpad = null;

  mount(stage, q, ctx) {
    ctx.hintText = q.hint || 'Use the picture to help you count!';

    if (q.mode === 'commutativity') {
      this.#mountCommutativity(stage, q, ctx);
      return;
    }
    this.#mountNumeric(stage, q, ctx);
  }

  #mountCommutativity(stage, q, ctx) {
    ctx.selfManaged = true;
    ctx.correctAnswer = q.a;

    let opts = [q.a, q.a + 1, q.b + 1, q.a + 2].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4);
    opts = shuffleArray(opts);

    stage.innerHTML = `
      <div class="eq-card mult-card">
        <p class="mult-prompt">Which number completes this?</p>
        <div class="mult-commute-row">
          <div class="mult-commute-block"><div class="mult-commute-label">${q.a} × ${q.b}</div>${makeDotGrid(q.a, q.b)}</div>
          <div class="mult-commute-eq">= ${q.product}</div>
          <div class="mult-commute-block"><div class="mult-commute-label">${q.b} × <span class="mult-blank-box" style="font-size:20px;">?</span></div>${makeDotGrid(q.b, q.a)}</div>
        </div>
        <div class="mult-commute-opts">${opts.map((o) => `<button class="mult-commute-btn" data-val="${o}">${o}</button>`).join('')}</div>
        <div class="mult-fact-bubble" id="multFact" style="display:none;">${escapeHTML(q.fact || '')}</div>
      </div>`;

    stage.querySelectorAll('.mult-commute-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chosen = parseInt(btn.dataset.val, 10);
        const correct = chosen === q.a;
        stage.querySelectorAll('.mult-commute-btn').forEach((b) => {
          b.disabled = true;
          const bv = parseInt(b.dataset.val, 10);
          if (bv === q.a) b.classList.add('mult-btn-correct');
          else if (bv === chosen && !correct) b.classList.add('mult-btn-wrong');
        });
        stage.querySelector('#multFact').style.display = '';
        ctx.reactPet?.(correct ? 'happy' : 'sad');
        this._resultTimer = setTimeout(() => ctx.onCheck(correct), correct ? 1400 : 2200);
      }, { signal: this.signal });
    });
  }

  #mountNumeric(stage, q, ctx) {
    const answer = q.mode === 'missing_factor' ? q.answer : q.a * q.b;
    ctx.correctAnswer = answer;

    let body = '';
    if (q.mode === 'groups') {
      const groups = Array.from({ length: q.a }, () => `<div class="mult-group-box">${makeEmoji(q.b, q.emoji)}</div>`).join('');
      body = `<p class="mult-prompt">${q.a} groups of ${q.b}</p>
        <div class="mult-groups-wrap">${groups}</div>
        <div class="mult-equation-strip"><span class="mult-factor">${q.a}</span><span class="mult-op">×</span><span class="mult-factor">${q.b}</span><span class="mult-op">=</span><span class="mult-blank-box" id="multAns">?</span></div>`;
    } else if (q.mode === 'array') {
      body = `<p class="mult-prompt">${q.a} rows of ${q.b}</p>
        <p class="mult-sub">Count the dots and find the total</p>
        ${makeDotGrid(q.a, q.b)}
        <div class="mult-array-label">${q.a} × ${q.b} = <span class="mult-blank-box" id="multAns">?</span></div>`;
    } else if (q.mode === 'repeated_add') {
      body = `<p class="mult-prompt">Add these up:</p>
        <div class="mult-repeated-add-wrap">${makeRepeatedAddHTML(q.a, q.b)}</div>
        <div class="mult-connection-note">This is the same as <strong>${q.b} × ${q.a}</strong></div>
        <div class="mult-equation-strip"><span class="mult-factor">${q.b}</span><span class="mult-op">×</span><span class="mult-factor">${q.a}</span><span class="mult-op">=</span><span class="mult-blank-box" id="multAns">?</span></div>`;
    } else if (q.mode === 'missing_factor') {
      const dots = Array.from({ length: Math.min(q.known, 10) }, () => '<div class="mult-dot row-0" style="margin:2px;"></div>').join('');
      body = `<p class="mult-prompt">Find the missing number</p>
        <div class="mult-equation-strip mult-eq-large"><span class="mult-factor">${q.known}</span><span class="mult-op">×</span><span class="mult-blank-box mult-missing" id="multAns">?</span><span class="mult-op">=</span><span class="mult-factor mult-product">${q.product}</span></div>
        <div class="mult-hint-bar">How many groups of <strong>${q.known}</strong> make <strong>${q.product}</strong>?</div>
        <div class="mult-missing-visual">${dots}<span class="mult-missing-x">× ?</span></div>`;
    } else if (q.mode === 'word_problem') {
      const groups = Array.from({ length: Math.min(q.a, 10) }, () => `<div class="mult-group-box mult-group-sm">${makeEmoji(Math.min(q.b, 8), q.emoji)}</div>`).join('');
      body = `<p class="mult-story">${storyText(q)}</p>
        <div class="mult-groups-wrap mult-groups-small">${groups}</div>
        <div class="mult-equation-strip"><span class="mult-factor">${q.a}</span><span class="mult-op">×</span><span class="mult-factor">${q.b}</span><span class="mult-op">=</span><span class="mult-blank-box" id="multAns">?</span></div>`;
    }

    stage.innerHTML = `
      <div class="eq-card mult-card">
        ${body}
        <div id="numpadHost" style="margin-top:10px;"></div>
        <div class="mult-fact-bubble" id="multFact" style="display:none;">${escapeHTML(q.fact || '')}</div>
      </div>`;

    const ansBox = stage.querySelector('#multAns');
    this.#numpad = new Numpad(stage.querySelector('#numpadHost'), {
      maxDigits: 3,
      onChange: (val) => { if (ansBox) ansBox.textContent = val !== null ? String(val) : '?'; },
    });

    const checkBtn = document.createElement('button');
    checkBtn.className = 'btn btn-primary';
    checkBtn.style.cssText = 'width:100%;margin-top:10px;';
    checkBtn.textContent = '✅ Check!';
    checkBtn.addEventListener('click', () => {
      const val = this.#numpad.getValue();
      if (val === null) return;
      this.#numpad.disable();
      checkBtn.disabled = true;
      const correct = val === answer;
      ansBox?.classList.add(correct ? 'mult-ans-correct' : 'mult-ans-wrong');
      stage.querySelector('#multFact').style.display = '';
      ctx.reactPet?.(correct ? 'happy' : 'sad');
      ctx.onCheck(correct);
    }, { signal: this.signal });
    stage.querySelector('#numpadHost').appendChild(checkBtn);
  }

  unmount() {
    this.#numpad?.destroy();
    this.#numpad = null;
    clearTimeout(this._resultTimer);
    super.unmount();
  }
}
