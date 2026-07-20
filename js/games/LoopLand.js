import { BaseGame } from './BaseGame.js';

const DIRS = {
  up: { dx: 0, dy: -1, arrow: '⬆️' },
  down: { dx: 0, dy: 1, arrow: '⬇️' },
  left: { dx: -1, dy: 0, arrow: '⬅️' },
  right: { dx: 1, dy: 0, arrow: '➡️' },
};

const solveShortestPathArrows = (q, wallSet) => {
  const goalKey = `${q.goal.x},${q.goal.y}`;
  const visited = { [`${q.start.x},${q.start.y}`]: true };
  const queue = [{ x: q.start.x, y: q.start.y, path: [] }];
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    if (`${cur.x},${cur.y}` === goalKey) return cur.path.map((d) => d.arrow).join('');
    for (const d of Object.values(DIRS)) {
      const nx = cur.x + d.dx, ny = cur.y + d.dy, nKey = `${nx},${ny}`;
      if (nx < 0 || nx >= q.gridSize || ny < 0 || ny >= q.gridSize || wallSet[nKey] || visited[nKey]) continue;
      visited[nKey] = true;
      queue.push({ x: nx, y: ny, path: [...cur.path, d] });
    }
  }
  return '—';
};

/** LoopLand — like CodeTheRobot, but the child builds "repeat" blocks
 *  (direction × count) instead of one arrow per step, introducing loops. */
export class LoopLand extends BaseGame {
  #timers = [];

  mount(stage, q, ctx) {
    const gridSize = q.gridSize;
    const wallSet = {};
    (q.walls || []).forEach((w) => { wallSet[`${w.x},${w.y}`] = true; });
    ctx.correctAnswer = solveShortestPathArrows(q, wallSet);
    ctx.hintText = 'Figure out how many squares to move in one direction, then turn — one repeat block can cover the whole stretch.';

    let blocks = [];
    let pendingDir = null;
    let pendingCount = 1;
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
          if (isWall) content = '🧱'; else if (isRobot) content = '<span class="robot-emoji">🤖</span>'; else if (isGoal) content = '<span class="goal-emoji">🍕</span>';
          html += `<div class="robot-cell${isWall ? ' robot-wall' : ''}">${content}</div>`;
        }
      }
      return html + '</div>';
    };

    const buildBlocksHTML = () => (blocks.length === 0
      ? '<span class="seq-empty">Pick a direction and a number below, then add a block</span>'
      : blocks.map((b, i) => `<span class="loop-block-chip" data-block-idx="${i}">${DIRS[b.dir].arrow} ×${b.count}</span>`).join(''));

    const buildPickerHTML = () => `
      <div class="loop-picker">
        <div class="loop-dir-row">
          ${['up', 'left', 'right', 'down'].map((d) => `<button class="loop-dir-btn${pendingDir === d ? ' loop-dir-selected' : ''}" data-dir="${d}">${DIRS[d].arrow}</button>`).join('')}
        </div>
        <div class="loop-count-row">
          <button class="loop-count-btn" id="loopCountMinus">−</button>
          <span class="loop-count-display">×${pendingCount}</span>
          <button class="loop-count-btn" id="loopCountPlus">+</button>
          <button class="btn btn-primary loop-add-btn" id="loopAddBtn" ${pendingDir ? '' : 'disabled'}>+ Add Block</button>
        </div>
      </div>`;

    const render = () => {
      stage.innerHTML = `
        <div class="eq-card" style="padding:14px 12px;">
          <h2 style="margin-bottom:4px;">Build a repeat program! 🔁</h2>
          <p class="robot-subtitle" style="color:var(--ink-soft);margin-bottom:10px;">Use repeat blocks to cover long stretches in one go</p>
          <div class="robot-grid-wrap">${buildGridHTML(q.start)}</div>
          <div class="seq-row" id="seqRow">${buildBlocksHTML()}</div>
          ${buildPickerHTML()}
          <div class="robot-action-row">
            <button class="btn btn-ghost" id="undoBtn" style="flex:1;">↩️ Undo</button>
            <button class="btn btn-ghost" id="clearBtn" style="flex:1;">🔄 Clear</button>
          </div>
          <button class="btn btn-primary" id="checkBtn" style="margin-top:14px; width:100%; max-width:260px;" ${blocks.length === 0 ? 'disabled' : ''}>▶ Run</button>
        </div>`;
      wireUp();
    };

    const wireUp = () => {
      stage.querySelectorAll('.loop-dir-btn').forEach((btn) => {
        btn.addEventListener('click', () => { if (!running && !resolved) { pendingDir = btn.dataset.dir; render(); } }, { signal: this.signal });
      });
      stage.querySelector('#loopCountMinus')?.addEventListener('click', () => { if (!running && !resolved) { pendingCount = Math.max(1, pendingCount - 1); render(); } }, { signal: this.signal });
      stage.querySelector('#loopCountPlus')?.addEventListener('click', () => { if (!running && !resolved) { pendingCount = Math.min(6, pendingCount + 1); render(); } }, { signal: this.signal });
      stage.querySelector('#loopAddBtn')?.addEventListener('click', () => {
        if (running || resolved || !pendingDir || blocks.length >= q.maxBlocks) return;
        blocks.push({ dir: pendingDir, count: pendingCount });
        pendingDir = null; pendingCount = 1;
        render();
      }, { signal: this.signal });
      stage.querySelector('#undoBtn').addEventListener('click', () => { if (!running && !resolved) { blocks.pop(); render(); } }, { signal: this.signal });
      stage.querySelector('#clearBtn').addEventListener('click', () => { if (!running && !resolved) { blocks = []; render(); } }, { signal: this.signal });
      stage.querySelector('#checkBtn').addEventListener('click', () => {
        if (running || resolved || blocks.length === 0) return;
        this.#runProgram(stage, q, ctx, wallSet, gridSize, blocks, buildGridHTML, render, {
          setRunning: (r) => { running = r; },
          setResolved: (r) => { resolved = r; },
          resetProgram: () => { blocks = []; pendingDir = null; pendingCount = 1; },
        });
      }, { signal: this.signal });
    };

    render();
  }

  #runProgram(stage, q, ctx, wallSet, gridSize, blocks, buildGridHTML, render, hooks) {
    hooks.setRunning(true);
    stage.querySelectorAll('.loop-dir-btn, #loopCountMinus, #loopCountPlus, #loopAddBtn, #undoBtn, #clearBtn, #checkBtn').forEach((el) => { el.disabled = true; });

    const moves = [];
    blocks.forEach((b) => { for (let k = 0; k < b.count; k++) moves.push(b.dir); });

    let pos = { x: q.start.x, y: q.start.y };
    let i = 0, hitWallOrEdge = false, skipRequested = false, stepDelay = 380;

    if (ctx.attemptUsed) {
      const skipBtn = document.createElement('button');
      skipBtn.className = 'btn btn-ghost skip-replay-btn';
      skipBtn.textContent = '⏩ Skip';
      skipBtn.addEventListener('click', () => { skipRequested = true; stepDelay = 40; skipBtn.disabled = true; skipBtn.style.opacity = '0.4'; }, { signal: this.signal });
      const gridWrapEl = stage.querySelector('.robot-grid-wrap');
      gridWrapEl?.parentNode?.insertBefore(skipBtn, gridWrapEl.nextSibling);
    }

    const step = () => {
      if (i >= moves.length) { finish(); return; }
      const d = DIRS[moves[i]];
      const nx = pos.x + d.dx, ny = pos.y + d.dy;
      const blocked = nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize || wallSet[`${nx},${ny}`];
      if (!blocked) pos = { x: nx, y: ny }; else hitWallOrEdge = true;
      const gridWrap = stage.querySelector('.robot-grid-wrap');
      if (gridWrap) gridWrap.innerHTML = buildGridHTML(pos);
      i++;
      this.#timers.push(setTimeout(step, skipRequested ? 40 : stepDelay));
    };

    const finish = () => {
      hooks.setRunning(false);
      stage.querySelector('.skip-replay-btn')?.remove();
      const reachedGoal = pos.x === q.goal.x && pos.y === q.goal.y && !hitWallOrEdge;
      const isFinalAttempt = reachedGoal || ctx.attemptUsed;
      hooks.setResolved(isFinalAttempt);

      if (!reachedGoal && !isFinalAttempt) {
        this.#timers.push(setTimeout(() => { hooks.resetProgram(); render(); ctx.onCheck(false); }, 250));
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
