import { BaseGame } from './BaseGame.js';

const DIRS = {
  up: { dx: 0, dy: -1, arrow: '⬆️' },
  down: { dx: 0, dy: 1, arrow: '⬇️' },
  left: { dx: -1, dy: 0, arrow: '⬅️' },
  right: { dx: 1, dy: 0, arrow: '➡️' },
};
const DIR_KEYS = ['up', 'down', 'left', 'right'];

/** BugHunter — a pre-written (buggy) sequence is shown; the child taps a
 *  flagged step and picks the correct direction, then runs to verify. */
export class BugHunter extends BaseGame {
  #timers = [];

  mount(stage, q, ctx) {
    const gridSize = q.gridSize;
    const wallSet = {};
    (q.walls || []).forEach((w) => { wallSet[`${w.x},${w.y}`] = true; });

    let fixes = {};
    let selectedChipIndex = null;

    const bugIndices = {};
    q.bugs.forEach((b) => { bugIndices[b.index] = b.correct; });

    const buggyStepNumbers = q.bugs.map((b) => b.index + 1);
    ctx.hintText = buggyStepNumbers.length === 1
      ? `Trace the robot's path step by step — something's off at step ${buggyStepNumbers[0]}.`
      : `Trace the robot's path step by step — something's off at steps ${buggyStepNumbers.join(' and ')}.`;
    ctx.correctAnswer = q.bugs.map((b) => `Step ${b.index + 1} → ${DIRS[b.correct].arrow}`).join(', ');

    const effectiveSequence = () => q.sequence.map((dir, i) => (fixes[i] !== undefined ? fixes[i] : dir));
    const allFilled = () => q.bugs.every((b) => fixes[b.index] !== undefined);
    const allCorrect = () => q.bugs.every((b) => fixes[b.index] === b.correct);

    const cellSize = () => {
      const vh = window.innerHeight || 640;
      if (vh <= 700) return gridSize >= 5 ? 34 : 40;
      return gridSize >= 5 ? 48 : 56;
    };

    const buildGridHTML = (robotPos) => {
      const cs = cellSize();
      let html = `<div class="robot-grid" style="grid-template-columns:repeat(${gridSize}, ${cs}px); grid-template-rows:repeat(${gridSize}, ${cs}px);">`;
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const isWall = !!wallSet[`${x},${y}`];
          const isGoal = x === q.goal.x && y === q.goal.y;
          const isRobot = x === robotPos.x && y === robotPos.y;
          let content = '';
          if (isWall) content = '🧱'; else if (isRobot) content = '<span class="robot-emoji">🤖</span>'; else if (isGoal) content = '<span class="goal-emoji">🍕</span>';
          html += `<div class="robot-cell${isWall ? ' robot-wall' : ''}">${content}</div>`;
        }
      }
      return html + '</div>';
    };

    const buildSeqHTML = () => {
      let html = '<div class="bh-seq-row" id="bhSeqRow">';
      q.sequence.forEach((dir, i) => {
        const isBug = Object.prototype.hasOwnProperty.call(bugIndices, i);
        const isFixed = fixes[i] !== undefined;
        const isSelected = selectedChipIndex === i;
        const displayDir = isFixed ? fixes[i] : dir;
        const isCorrectFix = isFixed && fixes[i] === bugIndices[i];
        const isWrongFix = isFixed && fixes[i] !== bugIndices[i];
        let cls = 'bh-chip';
        if (isCorrectFix) cls += ' bh-fixed';
        else if (isWrongFix) cls += ' bh-wrong';
        else if (isBug && !isFixed) cls += ' bh-bug';
        if (isSelected) cls += ' bh-selected';

        let badge = '';
        if (isBug && !isFixed && !isSelected) badge = '<span class="bh-bug-badge">!</span>';
        else if (isWrongFix && !isSelected) badge = '<span class="bh-bug-badge" style="background:var(--amber-dark);">✗</span>';

        html += `<button class="${cls}" data-idx="${i}" aria-label="Step ${i + 1}">${DIRS[displayDir].arrow}${badge}</button>`;
      });
      return html + '</div>';
    };

    const buildDirPickerHTML = () => {
      if (selectedChipIndex === null) return '';
      const btns = DIR_KEYS.map((dk) => `<button class="bh-dir-btn${fixes[selectedChipIndex] === dk ? ' bh-dir-selected' : ''}" data-dir="${dk}">${DIRS[dk].arrow}</button>`).join('');
      return `<div class="bh-dir-options" id="bhDirPicker"><p class="bh-hint-label" style="width:100%;margin-bottom:4px;">Pick the correct arrow 👇</p>${btns}</div>`;
    };

    const render = () => {
      const bugCount = q.bugs.length;
      const fixedCount = q.bugs.filter((b) => fixes[b.index] !== undefined).length;
      const allDone = allFilled();
      const statusMsg = allDone
        ? (allCorrect() ? `✅ All ${bugCount} bug${bugCount > 1 ? 's' : ''} fixed! Press Check to run.` : '⚠️ All slots filled — press Run to test your fix!')
        : `${fixedCount} of ${bugCount} bug${bugCount > 1 ? 's' : ''} fixed — tap a 🐛 step to fix it!`;

      stage.innerHTML = `
        <div class="eq-card" style="padding:14px 12px; text-align:center;">
          <h2 style="margin-bottom:2px;">Debug the Code! 🐛</h2>
          <p style="color:var(--ink-soft);font-size:13px;margin-bottom:8px;">${statusMsg}</p>
          <div class="robot-grid-wrap" id="bhGrid">${buildGridHTML(q.start)}</div>
          ${buildSeqHTML()}
          ${buildDirPickerHTML()}
          <button class="btn btn-primary" id="checkBtn" style="margin-top:14px;width:100%;max-width:260px;" ${allDone ? '' : 'disabled'}>▶ Run Fixed Code</button>
        </div>`;
      wireUp();
    };

    const wireUp = () => {
      stage.querySelectorAll('.bh-chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx, 10);
          if (!Object.prototype.hasOwnProperty.call(bugIndices, idx)) return;
          selectedChipIndex = selectedChipIndex === idx ? null : idx;
          render();
        }, { signal: this.signal });
      });
      stage.querySelector('#bhDirPicker')?.querySelectorAll('.bh-dir-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (selectedChipIndex === null) return;
          fixes[selectedChipIndex] = btn.dataset.dir;
          selectedChipIndex = null;
          render();
        }, { signal: this.signal });
      });
      stage.querySelector('#checkBtn')?.addEventListener('click', () => {
        if (!allFilled()) return;
        this.#runSequence(stage, q, ctx, wallSet, gridSize, effectiveSequence(), buildGridHTML, () => { fixes = {}; selectedChipIndex = null; }, render);
      }, { signal: this.signal });
    };

    render();
  }

  #runSequence(stage, q, ctx, wallSet, gridSize, seq, buildGridHTML, resetFixes, render) {
    stage.querySelectorAll('.bh-chip, .bh-dir-btn, #checkBtn').forEach((el) => { el.disabled = true; });

    let pos = { x: q.start.x, y: q.start.y };
    let i = 0, hitWall = false, skipRequested = false;

    if (ctx.attemptUsed) {
      const skipBtn = document.createElement('button');
      skipBtn.className = 'btn btn-ghost skip-replay-btn';
      skipBtn.textContent = '⏩ Skip';
      skipBtn.addEventListener('click', () => { skipRequested = true; skipBtn.disabled = true; skipBtn.style.opacity = '0.4'; }, { signal: this.signal });
      const gridWrapEl = stage.querySelector('.robot-grid-wrap');
      gridWrapEl?.parentNode?.insertBefore(skipBtn, gridWrapEl.nextSibling);
    }

    const step = () => {
      if (i >= seq.length) { finish(); return; }
      const d = DIRS[seq[i]];
      const nx = pos.x + d.dx, ny = pos.y + d.dy;
      const blocked = nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize || wallSet[`${nx},${ny}`];
      if (!blocked) pos = { x: nx, y: ny }; else hitWall = true;
      const gridEl = stage.querySelector('.robot-grid-wrap');
      if (gridEl) gridEl.innerHTML = buildGridHTML(pos);
      i++;
      this.#timers.push(setTimeout(step, skipRequested ? 40 : 380));
    };

    const walkBack = (from, onDone) => {
      const cur = { x: from.x, y: from.y };
      const target = { x: q.start.x, y: q.start.y };
      const nextBackStep = () => {
        if (cur.x === target.x && cur.y === target.y) { onDone(); return; }
        if (cur.x !== target.x) cur.x += target.x > cur.x ? 1 : -1;
        else cur.y += target.y > cur.y ? 1 : -1;
        const gridEl = stage.querySelector('.robot-grid-wrap');
        if (gridEl) gridEl.innerHTML = buildGridHTML(cur);
        this.#timers.push(setTimeout(nextBackStep, 280));
      };
      nextBackStep();
    };

    const finish = () => {
      stage.querySelector('.skip-replay-btn')?.remove();
      const reachedGoal = pos.x === q.goal.x && pos.y === q.goal.y && !hitWall;
      const isFinalAttempt = reachedGoal || ctx.attemptUsed;

      if (!reachedGoal && !isFinalAttempt) {
        this.#timers.push(setTimeout(() => {
          walkBack(pos, () => { resetFixes(); render(); ctx.onCheck(false); });
        }, 600));
        return;
      }
      this.#timers.push(setTimeout(() => ctx.onCheck(reachedGoal), 300));
    };

    step();
  }

  unmount() {
    this.#timers.forEach(clearTimeout);
    this.#timers = [];
    super.unmount();
  }
}
