import { BaseGame } from './BaseGame.js';

const DIRS = {
  up: { dx: 0, dy: -1, arrow: '⬆️' },
  down: { dx: 0, dy: 1, arrow: '⬇️' },
  left: { dx: -1, dy: 0, arrow: '⬅️' },
  right: { dx: 1, dy: 0, arrow: '➡️' },
};

/** BFS shortest path, used only to populate ctx.correctAnswer for the
 *  "show the answer" state after a second miss. */
const solveShortestPathArrows = (q, wallSet) => {
  const goalKey = `${q.goal.x},${q.goal.y}`;
  const visited = { [`${q.start.x},${q.start.y}`]: true };
  const queue = [{ x: q.start.x, y: q.start.y, path: [] }];
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    if (`${cur.x},${cur.y}` === goalKey) return cur.path.map((d) => d.arrow).join('');
    for (const d of Object.values(DIRS)) {
      const nx = cur.x + d.dx, ny = cur.y + d.dy;
      const nKey = `${nx},${ny}`;
      if (nx < 0 || nx >= q.gridSize || ny < 0 || ny >= q.gridSize) continue;
      if (wallSet[nKey] || visited[nKey]) continue;
      visited[nKey] = true;
      queue.push({ x: nx, y: ny, path: [...cur.path, d] });
    }
  }
  return '—';
};

/**
 * CodeTheRobot — tap direction arrows to build a move sequence, press Run
 * to watch the robot animate step-by-step toward the goal. This is the
 * representative "robot grid" pattern also used (with small variations)
 * by LoopLand, BugHunter, IfThenRobot and FunctionFactory.
 */
export class CodeTheRobot extends BaseGame {
  #timers = [];

  mount(stage, q, ctx) {
    const gridSize = q.gridSize;
    const wallSet = {};
    (q.walls || []).forEach((w) => { wallSet[`${w.x},${w.y}`] = true; });
    ctx.correctAnswer = solveShortestPathArrows(q, wallSet);
    ctx.hintText = 'Count the squares between the robot and the slice, and watch out for any walls 🧱 in the way.';

    let sequence = [];
    let running = false;
    let resolved = false;

    const cellSize = () => {
      const vh = window.innerHeight || 640;
      if (vh <= 700) return gridSize >= 5 ? 34 : 40;
      return gridSize >= 5 ? 52 : 60;
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
          if (isWall) content = '🧱';
          else if (isRobot) content = '<span class="robot-emoji">🤖</span>';
          else if (isGoal) content = '<span class="goal-emoji">🍕</span>';
          html += `<div class="robot-cell${isWall ? ' robot-wall' : ''}">${content}</div>`;
        }
      }
      return html + '</div>';
    };

    const buildSequenceHTML = () => (sequence.length === 0
      ? '<span class="seq-empty">Tap arrows below to add steps</span>'
      : sequence.map((dir, i) => `<span class="seq-chip" data-seq-idx="${i}">${DIRS[dir].arrow}</span>`).join(''));

    const render = () => {
      stage.innerHTML = `
        <div class="eq-card" style="padding:14px 12px;">
          <h2 style="margin-bottom:4px;">Code the path! 🍕</h2>
          <p class="robot-subtitle" style="color:var(--ink-soft);margin-bottom:10px;">Build a path, then press Run</p>
          <div class="robot-grid-wrap">${buildGridHTML(q.start)}</div>
          <div class="seq-row" id="seqRow">${buildSequenceHTML()}</div>
          <div class="robot-controls" id="robotControls">
            <div class="dpad">
              <button class="dpad-btn dpad-up" data-dir="up">⬆️</button>
              <button class="dpad-btn dpad-left" data-dir="left">⬅️</button>
              <button class="dpad-btn dpad-right" data-dir="right">➡️</button>
              <button class="dpad-btn dpad-down" data-dir="down">⬇️</button>
            </div>
            <div class="robot-action-row">
              <button class="btn btn-ghost" id="undoBtn" style="flex:1;">↩️ Undo</button>
              <button class="btn btn-ghost" id="clearBtn" style="flex:1;">🔄 Clear</button>
            </div>
          </div>
          <button class="btn btn-primary" id="checkBtn" style="margin-top:14px; width:100%; max-width:260px;" ${sequence.length === 0 ? 'disabled' : ''}>▶ Run</button>
        </div>`;
      wireUp();
    };

    const wireUp = () => {
      stage.querySelectorAll('.dpad-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (running || resolved || sequence.length >= q.maxSteps) return;
          sequence.push(btn.dataset.dir);
          render();
        }, { signal: this.signal });
      });
      stage.querySelector('#undoBtn').addEventListener('click', () => {
        if (running || resolved) return;
        sequence.pop();
        render();
      }, { signal: this.signal });
      stage.querySelector('#clearBtn').addEventListener('click', () => {
        if (running || resolved) return;
        sequence = [];
        render();
      }, { signal: this.signal });
      stage.querySelector('#checkBtn').addEventListener('click', () => {
        if (running || resolved || sequence.length === 0) return;
        this.#runSequence(stage, q, ctx, wallSet, gridSize, sequence, buildGridHTML, render, {
          onRunningChange: (r) => { running = r; },
          onResolvedChange: (r) => { resolved = r; },
          onSequenceClear: () => { sequence = []; },
        });
      }, { signal: this.signal });
    };

    render();
  }

  #runSequence(stage, q, ctx, wallSet, gridSize, sequence, buildGridHTML, render, hooks) {
    hooks.onRunningChange(true);
    stage.querySelectorAll('.dpad-btn, #undoBtn, #clearBtn, #checkBtn').forEach((el) => { el.disabled = true; });

    let pos = { x: q.start.x, y: q.start.y };
    let i = 0;
    let hitWallOrEdge = false;
    let skipRequested = false;
    let stepDelay = 380;

    // A retry run gets a Skip button — only the first attempt is a real
    // "learning moment"; replaying the same path after a miss is dead time.
    if (ctx.attemptUsed) {
      const skipBtn = document.createElement('button');
      skipBtn.className = 'btn btn-ghost skip-replay-btn';
      skipBtn.textContent = '⏩ Skip';
      skipBtn.addEventListener('click', () => {
        skipRequested = true;
        stepDelay = 40;
        skipBtn.disabled = true;
        skipBtn.style.opacity = '0.4';
      }, { signal: this.signal });
      const gridWrapEl = stage.querySelector('.robot-grid-wrap');
      gridWrapEl?.parentNode?.insertBefore(skipBtn, gridWrapEl.nextSibling);
    }

    const step = () => {
      if (i >= sequence.length) { finish(); return; }
      const d = DIRS[sequence[i]];
      const nx = pos.x + d.dx, ny = pos.y + d.dy;
      const blocked = nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize || wallSet[`${nx},${ny}`];
      if (!blocked) pos = { x: nx, y: ny }; else hitWallOrEdge = true;
      const gridWrap = stage.querySelector('.robot-grid-wrap');
      if (gridWrap) gridWrap.innerHTML = buildGridHTML(pos);
      i++;
      this.#timers.push(setTimeout(step, skipRequested ? 40 : stepDelay));
    };

    const finish = () => {
      hooks.onRunningChange(false);
      stage.querySelector('.skip-replay-btn')?.remove();
      const reachedGoal = pos.x === q.goal.x && pos.y === q.goal.y && !hitWallOrEdge;
      const isFinalAttempt = reachedGoal || ctx.attemptUsed;
      hooks.onResolvedChange(isFinalAttempt);

      if (!reachedGoal && !isFinalAttempt) {
        this.#timers.push(setTimeout(() => {
          hooks.onSequenceClear();
          render();
          ctx.onCheck(false);
        }, 250));
        return;
      }
      this.#timers.push(setTimeout(() => ctx.onCheck(reachedGoal), 250));
    };

    step();
  }

  unmount() {
    this.#timers.forEach(clearTimeout);
    this.#timers = [];
    super.unmount();
  }
}
