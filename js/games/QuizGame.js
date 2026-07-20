import { BaseGame } from './BaseGame.js';
import { escapeHTML } from '../utils.js';

/**
 * QuizGame — ported from RENDERERS.scienceQuiz. This single engine powers
 * every "read a question, pick one of four options, see why" game: not
 * just Science, but every English, Social Studies and Arts game too,
 * since they all share the same `{ emoji, question, options[], answer,
 * fact }` question shape and the same "scienceQuiz" `type` in games.json.
 *
 * Rather than 26 near-identical files, each topic file below
 * (ScienceQuiz.js, SightWords.js, Phonics.js, ...) is a one-line
 * subclass that exists purely so the registry has a named entry per
 * game key — see games/index.js and the README's "How to add a new
 * game type" section for why this is the intentional shape, not a
 * shortcut.
 */
export class QuizGame extends BaseGame {
  mount(stage, q, ctx) {
    let selected = null;
    ctx.correctAnswer = q.options[q.answer];
    ctx.hintText = 'Read all four options carefully before choosing!';
    ctx.selfManaged = true; // this engine manages its own retry/result UI instead of the generic is-correct/is-incorrect card flash

    const showQuestion = () => {
      const optsHTML = q.options.map((opt, i) => `
        <button class="sci-option${i === selected ? ' sci-selected' : ''}" data-idx="${i}">${escapeHTML(opt)}</button>
      `).join('');

      stage.innerHTML = `
        <div class="eq-card sci-question-card">
          <span class="sci-emoji">${q.emoji}</span>
          <div class="sci-question">${escapeHTML(q.question)}</div>
          <div class="sci-options">${optsHTML}</div>
          <button class="btn btn-primary" id="sciCheck" style="width:100%;max-width:220px;margin-top:10px;" ${selected !== null ? '' : 'disabled'}>✅ Check!</button>
        </div>`;

      stage.querySelectorAll('[data-idx]').forEach((btn) => {
        btn.addEventListener('click', () => { selected = parseInt(btn.dataset.idx, 10); showQuestion(); }, { signal: this.signal });
      });
      stage.querySelector('#sciCheck')?.addEventListener('click', () => {
        if (selected === null) return;
        showResult();
      }, { signal: this.signal });
    };

    const showResult = () => {
      const correct = selected === q.answer;
      const optsHTML = q.options.map((opt, i) => {
        const cls = i === q.answer ? 'sci-option sci-correct' : i === selected ? 'sci-option sci-wrong' : 'sci-option';
        return `<button class="${cls}" disabled>${escapeHTML(opt)}</button>`;
      }).join('');

      stage.innerHTML = `
        <div class="eq-card sci-question-card">
          <span class="sci-emoji">${q.emoji}</span>
          <div class="sci-question">${escapeHTML(q.question)}</div>
          <div class="sci-options">${optsHTML}</div>
          ${q.fact ? `<div class="sci-fact-bubble">${escapeHTML(q.fact)}</div>` : ''}
          ${!correct ? '<button class="btn btn-primary" id="sciNext" style="width:100%;max-width:220px;margin-top:12px;">➡️ Next Question</button>' : ''}
        </div>`;

      if (!correct) {
        stage.querySelector('#sciNext')?.addEventListener('click', () => ctx.onCheck(false), { signal: this.signal });
      } else {
        this._resultTimer = setTimeout(() => ctx.onCheck(true), 1600);
      }
    };

    showQuestion();
  }

  unmount() {
    clearTimeout(this._resultTimer);
    super.unmount();
  }
}
