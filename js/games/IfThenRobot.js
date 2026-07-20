import { BaseGame } from './BaseGame.js';

const DIRS = {
  up: { dx: 0, dy: -1, arrow: '⬆️' },
  down: { dx: 0, dy: 1, arrow: '⬇️' },
  left: { dx: -1, dy: 0, arrow: '⬅️' },
  right: { dx: 1, dy: 0, arrow: '➡️' },
};

/** IfThenRobot — teaches conditionals: the robot walks a fixed prefix,
 *  pauses at a decision cell, and the child picks "if wall -> X" or
 *  "if clear -> Y" before it runs the branch + suffix. */
export class IfThenRobot extends BaseGame {
  #timers = [];

  mount(stage, q, ctx) {
    const gridSize = q.gridSize;
    const wallSet = {};
    (q.walls || []).forEach((w) => { wallSet[`${w.x},${w.y}`] = true; });

    let decisionPos = { x: q.start.x, y: q.start.y };
    q.prefix.forEach((dir) => { decisionPos = { x: decisionPos.x + DIRS[dir].dx, y: decisionPos.y + DIRS[dir].dy }; });

    const cellHasWall = (pos, dir) => {
      const nx = pos.x + DIRS[dir].dx, ny = pos.y + DIRS[dir].dy;
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return true;
      return !!wallSet[`${nx},${ny}`];
    };
    const actualHasWall = cellHasWall(decisionPos, q.decisionDir);

    ctx.correctAnswer = actualHasWall ? `If there's a wall ahead, go ${DIRS[q.thenDir].arrow}` : `If it's clear ahead, go ${DIRS[q.elseDir].arrow}`;
    ctx.hintText = `Watch closely what's directly ${q.decisionDir} of the robot when it stops to check — is it a wall, or clear space?`;

    let chosenRule = null;
    let pickerOpen = false;
    let running = false;

    const cellSize = () => {
      const vh = window.innerHeight || 640;
      if (vh <= 700) return gridSize >= 5 ? 34 : 40;
      return gridSize >= 5 ? 48 : 56;
    };

    const buildGridHTML = (robotPos, highlightPos, highlightState) => {
      const cs = cellSize();
      let html = `<div class="robot-grid" style="grid-template-columns:repeat(${gridSize}, ${cs}px); grid-template-rows:repeat(${gridSize}, ${cs}px);">`;
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const isWall = !!wallSet[`${x},${y}`];
          const isGoal = x === q.goal.x && y === q.goal.y;
          const isRobot = x === robotPos.x && y === robotPos.y;
          const isHighlight = highlightPos && x === highlightPos.x && y === highlightPos.y;
          let cls = `robot-cell${isWall ? ' robot-wall' : ''}`;
          if (isHighlight) cls += highlightState === 'wall' ? ' it-check-wall' : ' it-check-clear';
          let content = '';
          if (isWall) content = '🧱';
          else if (isRobot) content = '<span class="robot-emoji">🤖</span>';
          else if (isGoal) content = '<span class="goal-emoji">🍕</span>';
          else if (isHighlight) content = highlightState === 'wall' ? '🧱' : '✨';
          html += `<div class="${cls}">${content}</div>`;
        }
      }
      return html + '</div>';
    };

    const buildCodeStripHTML = () => {
      const prefixHTML = q.prefix.map((dir) => `<span class="it-chip it-chip-fixed">${DIRS[dir].arrow}</span>`).join('');
      const qContent = chosenRule ? DIRS[chosenRule === 'then' ? q.thenDir : q.elseDir].arrow : '❓';
      const suffixHTML = q.suffix.map((dir) => `<span class="it-chip it-chip-fixed">${DIRS[dir].arrow}</span>`).join('');
      return `<div class="it-strip" id="itStrip">${prefixHTML}<button class="it-chip it-chip-decision${chosenRule ? ' it-chip-answered' : ''}" id="itDecisionChip">${qContent}</button>${suffixHTML}</div>`;
    };

    const buildRulePickerHTML = () => {
      if (!pickerOpen) return '';
      return `
        <div class="it-rule-picker" id="itRulePicker">
          <p class="it-rule-hint">What should the robot do?</p>
          <button class="it-rule-btn${chosenRule === 'then' ? ' it-rule-selected' : ''}" data-rule="then"><span class="it-rule-icon">🧱</span><span class="it-rule-text">If wall ahead<br>go ${DIRS[q.thenDir].arrow}</span></button>
          <button class="it-rule-btn${chosenRule === 'else' ? ' it-rule-selected' : ''}" data-rule="else"><span class="it-rule-icon">✨</span><span class="it-rule-text">If clear ahead<br>go ${DIRS[q.elseDir].arrow}</span></button>
        </div>`;
    };

    const render = (robotPos, highlightPos, highlightState) => {
      stage.innerHTML = `
        <div class="eq-card" style="padding:14px 12px;">
          <h2 style="margin-bottom:4px;">Teach the robot a rule! 🤔</h2>
          <p style="color:var(--ink-soft);margin-bottom:8px;">Tap the ❓ and pick what the robot should do</p>
          <div class="robot-grid-wrap" id="itGrid">${buildGridHTML(robotPos || q.start, highlightPos, highlightState)}</div>
          ${buildCodeStripHTML()}
          ${buildRulePickerHTML()}
          <button class="btn btn-primary" id="checkBtn" style="margin-top:14px;width:100%;max-width:260px;" ${chosenRule ? '' : 'disabled'}>▶ Run</button>
        </div>`;
      wireUp();
    };

    const wireUp = () => {
      stage.querySelector('#itDecisionChip')?.addEventListener('click', () => { if (!running) { pickerOpen = !pickerOpen; render(); } }, { signal: this.signal });
      stage.querySelector('#itRulePicker')?.querySelectorAll('.it-rule-btn').forEach((btn) => {
        btn.addEventListener('click', () => { chosenRule = btn.dataset.rule; pickerOpen = false; render(); }, { signal: this.signal });
      });
      stage.querySelector('#checkBtn')?.addEventListener('click', () => {
        if (!chosenRule) return;
        this.#runSequence(stage, q, ctx, wallSet, gridSize, actualHasWall, chosenRule, render, {
          setRunning: (r) => { running = r; },
          setChosenRule: (r) => { chosenRule = r; },
        });
      }, { signal: this.signal });
    };

    render(q.start);
  }

  #runSequence(stage, q, ctx, wallSet, gridSize, actualHasWall, chosenRule, render, hooks) {
    hooks.setRunning(true);
    stage.querySelectorAll('#itDecisionChip, .it-rule-btn, #checkBtn').forEach((el) => { el.disabled = true; });

    let pos = { x: q.start.x, y: q.start.y };
    let hitWall = false;
    let skipRequested = false;
    const buildGridHTML = (robotPos, hl, hs) => stage.querySelector('#itGrid').innerHTML; // placeholder not used directly

    const move = (dirKey) => {
      const d = DIRS[dirKey];
      const nx = pos.x + d.dx, ny = pos.y + d.dy;
      const blocked = nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize || wallSet[`${nx},${ny}`];
      if (!blocked) pos = { x: nx, y: ny }; else hitWall = true;
    };

    const redrawGrid = (highlightPos, highlightState) => {
      const cs = (window.innerHeight <= 700) ? (gridSize >= 5 ? 34 : 40) : (gridSize >= 5 ? 48 : 56);
      let html = `<div class="robot-grid" style="grid-template-columns:repeat(${gridSize}, ${cs}px); grid-template-rows:repeat(${gridSize}, ${cs}px);">`;
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const isWall = !!wallSet[`${x},${y}`];
          const isGoal = x === q.goal.x && y === q.goal.y;
          const isRobot = x === pos.x && y === pos.y;
          const isHL = highlightPos && x === highlightPos.x && y === highlightPos.y;
          let cls = `robot-cell${isWall ? ' robot-wall' : ''}`;
          if (isHL) cls += highlightState === 'wall' ? ' it-check-wall' : ' it-check-clear';
          let content = '';
          if (isWall) content = '🧱'; else if (isRobot) content = '<span class="robot-emoji">🤖</span>'; else if (isGoal) content = '<span class="goal-emoji">🍕</span>'; else if (isHL) content = highlightState === 'wall' ? '🧱' : '✨';
          html += `<div class="${cls}">${content}</div>`;
        }
      }
      const gridEl = stage.querySelector('#itGrid');
      if (gridEl) gridEl.innerHTML = html + '</div>';
    };

    if (ctx.attemptUsed) {
      const skipBtn = document.createElement('button');
      skipBtn.className = 'btn btn-ghost skip-replay-btn';
      skipBtn.textContent = '⏩ Skip';
      skipBtn.addEventListener('click', () => { skipRequested = true; skipBtn.disabled = true; skipBtn.style.opacity = '0.4'; }, { signal: this.signal });
      const gridEl = stage.querySelector('#itGrid');
      gridEl?.parentNode?.insertBefore(skipBtn, gridEl.nextSibling);
    }

    let i = 0;
    const prefixStep = () => {
      if (i >= q.prefix.length) { afterPrefix(); return; }
      move(q.prefix[i]);
      redrawGrid();
      i++;
      this.#timers.push(setTimeout(prefixStep, skipRequested ? 40 : 380));
    };

    const afterPrefix = () => {
      const checkPos = { x: pos.x + DIRS[q.decisionDir].dx, y: pos.y + DIRS[q.decisionDir].dy };
      const inBounds = checkPos.x >= 0 && checkPos.x < gridSize && checkPos.y >= 0 && checkPos.y < gridSize;
      const checkState = !inBounds || actualHasWall ? 'wall' : 'clear';
      redrawGrid(inBounds ? checkPos : null, checkState);
      this.#timers.push(setTimeout(branch, skipRequested ? 80 : 700));
    };

    const branch = () => {
      move(chosenRule === 'then' ? q.thenDir : q.elseDir);
      redrawGrid();
      let j = 0;
      const suffixStep = () => {
        if (j >= q.suffix.length) { finish(); return; }
        move(q.suffix[j]);
        redrawGrid();
        j++;
        this.#timers.push(setTimeout(suffixStep, skipRequested ? 40 : 380));
      };
      this.#timers.push(setTimeout(suffixStep, skipRequested ? 40 : 380));
    };

    const finish = () => {
      hooks.setRunning(false);
      stage.querySelector('.skip-replay-btn')?.remove();
      const reachedGoal = pos.x === q.goal.x && pos.y === q.goal.y && !hitWall;
      const isFinalAttempt = reachedGoal || ctx.attemptUsed;

      if (!reachedGoal && !isFinalAttempt) {
        this.#timers.push(setTimeout(() => {
          hooks.setChosenRule(null);
          render(q.start);
          ctx.onCheck(false);
        }, 500));
        return;
      }
      this.#timers.push(setTimeout(() => ctx.onCheck(reachedGoal), 300));
    };

    prefixStep();
  }

  unmount() {
    this.#timers.forEach(clearTimeout);
    this.#timers = [];
    super.unmount();
  }
}
