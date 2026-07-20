import { BaseGame } from './BaseGame.js';

const DIRS = {
  up: { dx: 0, dy: -1, arrow: '⬆️' },
  down: { dx: 0, dy: 1, arrow: '⬇️' },
  left: { dx: -1, dy: 0, arrow: '⬅️' },
  right: { dx: 1, dy: 0, arrow: '➡️' },
};

/** FunctionFactory — introduces reusable "functions": the robot has a
 *  named trick (SPIN = a fixed short sequence); the child watches it once,
 *  then picks how many times to call it to reach the goal. */
export class FunctionFactory extends BaseGame {
  #timers = [];

  mount(stage, q, ctx) {
    const fnSteps = q.fnSteps || [];
    const suffix = q.suffix || [];
    const maxCalls = q.callCount;

    let phase = 'watch';
    let watchDone = false;
    let chosenCalls = null;
    let animRunning = false;

    ctx.hintText = 'Watch the trick first, then pick how many times the robot should do it!';
    ctx.correctAnswer = 'Reached the star!';

    const cellSize = () => Math.min(Math.floor((Math.min(window.innerWidth, 400) - 32) / q.gridSize), 54);

    const buildGrid = (robotPos, trailCells, goalReached) => {
      const cs = cellSize();
      const wallSet = {};
      (q.walls || []).forEach((w) => { wallSet[`${w.x},${w.y}`] = true; });
      const trailSet = {};
      (trailCells || []).forEach((c) => { trailSet[`${c.x},${c.y}`] = true; });

      let html = `<div class="robot-grid" style="grid-template-columns:repeat(${q.gridSize},${cs}px);grid-template-rows:repeat(${q.gridSize},${cs}px);">`;
      for (let row = 0; row < q.gridSize; row++) {
        for (let col = 0; col < q.gridSize; col++) {
          const isRobot = robotPos && robotPos.x === col && robotPos.y === row;
          const isGoal = q.goal.x === col && q.goal.y === row;
          const isWall = !!wallSet[`${col},${row}`];
          const isTrail = !!trailSet[`${col},${row}`];
          const bg = isWall ? 'background:rgba(100,100,120,.25);' : isTrail ? 'background:rgba(201,168,245,.35);' : '';
          const inner = isRobot ? `<span class="robot-emoji">${goalReached ? '🥳' : '🤖'}</span>`
            : isGoal ? '<span class="goal-emoji">⭐</span>'
              : isTrail ? `<span style="font-size:${Math.round(cs * 0.35)}px;opacity:.7;">✨</span>` : '';
          html += `<div class="robot-cell" style="width:${cs}px;height:${cs}px;${bg}">${inner}</div>`;
        }
      }
      return html + '</div>';
    };

    const renderWatch = () => {
      const tricksHTML = fnSteps.map((s) => `<div style="width:44px;height:44px;background:var(--violet);color:#fff;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 3px 8px rgba(122,111,203,.35);">${DIRS[s].arrow}</div>`).join('');

      stage.innerHTML = `
        <div class="eq-card" style="padding:14px 12px;text-align:center;">
          <div style="font-size:13px;font-weight:800;color:var(--violet);margin-bottom:4px;">🏭 Function Factory</div>
          <h2 style="margin-bottom:4px;font-size:17px;">The robot knows a trick! 🤖</h2>
          <p style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">Its trick is called <strong>SPIN</strong>. See what it does:</p>
          <div style="background:linear-gradient(135deg,#F0F4FF,#F8F0FF);border:2px solid var(--violet);border-radius:16px;padding:12px 16px;margin-bottom:12px;display:inline-block;min-width:200px;">
            <div style="font-size:12px;font-weight:900;color:var(--violet);margin-bottom:8px;letter-spacing:.06em;">🔁 SPIN = </div>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">${tricksHTML}</div>
            <div style="font-size:11px;color:var(--ink-soft);margin-top:6px;font-weight:700;">Every time the robot does SPIN,<br>it takes ${fnSteps.length} step${fnSteps.length > 1 ? 's' : ''}</div>
          </div>
          <div class="ff-grid-wrap" id="ffGrid">${buildGrid(q.start, [], false)}</div>
          ${!watchDone
            ? '<button class="btn btn-primary" id="ffWatchBtn" style="margin-top:12px;width:100%;max-width:260px;">👀 Watch the robot do SPIN!</button>'
            : '<div style="background:#E8F8F0;border-radius:12px;padding:10px 14px;margin-top:10px;font-size:13px;font-weight:800;color:var(--success);">✅ You saw the trick! Now help it reach ⭐</div><button class="btn btn-primary" id="ffNextBtn" style="margin-top:10px;width:100%;max-width:260px;">How many times? ➡️</button>'}
        </div>`;

      if (!watchDone) {
        stage.querySelector('#ffWatchBtn').addEventListener('click', () => animateWatch(), { signal: this.signal });
      } else {
        stage.querySelector('#ffNextBtn').addEventListener('click', () => { phase = 'count'; render(); }, { signal: this.signal });
      }
    };

    const animateWatch = () => {
      const btn = stage.querySelector('#ffWatchBtn');
      if (btn) { btn.disabled = true; btn.textContent = '🏃 Watch...'; }
      let pos = { x: q.start.x, y: q.start.y };
      const trail = [];
      let i = 0;
      const wallSet = {};
      (q.walls || []).forEach((w) => { wallSet[`${w.x},${w.y}`] = true; });

      const step = () => {
        if (i >= fnSteps.length) {
          this.#timers.push(setTimeout(() => { watchDone = true; renderWatch(); }, 700));
          return;
        }
        const d = DIRS[fnSteps[i]];
        const nx = pos.x + d.dx, ny = pos.y + d.dy;
        if (nx >= 0 && nx < q.gridSize && ny >= 0 && ny < q.gridSize && !wallSet[`${nx},${ny}`]) {
          trail.push({ x: pos.x, y: pos.y });
          pos = { x: nx, y: ny };
        }
        const gridEl = stage.querySelector('#ffGrid');
        if (gridEl) gridEl.innerHTML = buildGrid(pos, trail, false);
        i++;
        this.#timers.push(setTimeout(step, 420));
      };
      step();
    };

    const renderCount = () => {
      const minChoice = Math.max(1, maxCalls - 1);
      const maxChoice = maxCalls + 2;
      const choices = [];
      for (let n = minChoice; n <= maxChoice; n++) choices.push(n);

      const choicesHTML = choices.map((n) => {
        const isChosen = chosenCalls === n;
        return `<button data-count="${n}" style="width:60px;height:60px;border-radius:16px;font-family:var(--font-display);font-weight:900;font-size:26px;border:3px solid ${isChosen ? 'var(--violet)' : 'var(--line)'};background:${isChosen ? 'var(--violet)' : 'var(--card-solid)'};color:${isChosen ? '#fff' : 'var(--ink)'};box-shadow:var(--shadow-soft);transition:all .15s ease;${isChosen ? 'transform:scale(1.12);' : ''}">${n}</button>`;
      }).join('');
      const trickReminderHTML = fnSteps.map((s) => `<span style="font-size:20px;">${DIRS[s].arrow}</span>`).join('');

      stage.innerHTML = `
        <div class="eq-card" style="padding:14px 12px;text-align:center;">
          <div style="font-size:13px;font-weight:800;color:var(--violet);margin-bottom:4px;">🏭 Function Factory</div>
          <h2 style="margin-bottom:6px;font-size:17px;">How many times? 🤔</h2>
          <div class="ff-grid-wrap">${buildGrid(q.start, [], false)}</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin:10px 0 4px;background:#F0F4FF;border-radius:10px;padding:6px 12px;flex-wrap:wrap;">
            <span style="font-size:12px;font-weight:800;color:var(--violet);">🔁 SPIN =</span>${trickReminderHTML}
          </div>
          <p style="font-size:13px;font-weight:700;color:var(--ink);margin:8px 0 12px;">How many times should the robot do SPIN to reach ⭐?</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:14px;">${choicesHTML}</div>
          <button style="background:none;border:none;font-size:12px;color:var(--violet);font-weight:700;text-decoration:underline;margin-bottom:10px;" id="ffRewatchBtn">👀 Watch the trick again</button><br>
          <button class="btn btn-primary" id="ffGoBtn" style="width:100%;max-width:240px;" ${chosenCalls !== null ? '' : 'disabled'}>▶ Let's go!</button>
        </div>`;

      stage.querySelectorAll('[data-count]').forEach((btn) => {
        btn.addEventListener('click', () => { chosenCalls = parseInt(btn.dataset.count, 10); renderCount(); }, { signal: this.signal });
      });
      stage.querySelector('#ffRewatchBtn').addEventListener('click', () => { watchDone = false; phase = 'watch'; render(); }, { signal: this.signal });
      stage.querySelector('#ffGoBtn')?.addEventListener('click', () => { if (chosenCalls !== null) { phase = 'run'; render(); } }, { signal: this.signal });
    };

    const renderRun = () => {
      stage.innerHTML = `
        <div class="eq-card" style="padding:14px 12px;text-align:center;">
          <div style="font-size:13px;font-weight:800;color:var(--violet);margin-bottom:4px;">🏭 Function Factory</div>
          <h2 style="margin-bottom:4px;font-size:17px;">Watch the robot go! 🚀</h2>
          <div style="background:linear-gradient(135deg,var(--violet),#9B8BD5);color:#fff;border-radius:16px;padding:10px 20px;display:inline-block;margin-bottom:10px;">
            <span style="font-size:13px;font-weight:700;opacity:.85;">Robot will do SPIN</span><br>
            <span style="font-size:32px;font-weight:900;font-family:var(--font-display);">${chosenCalls}</span>
            <span style="font-size:14px;font-weight:700;"> time${chosenCalls > 1 ? 's' : ''}</span>
          </div>
          <div class="ff-grid-wrap" id="ffGrid">${buildGrid(q.start, [], false)}</div>
          ${!animRunning
            ? '<button class="btn btn-primary" id="ffRunBtn" style="margin-top:12px;width:100%;max-width:240px;">🤖 Go robot go!</button><br><button style="background:none;border:none;font-size:12px;color:var(--ink-soft);font-weight:700;text-decoration:underline;margin-top:6px;" id="ffBackBtn">← Change my answer</button>'
            : `<div style="text-align:center;margin-top:12px;font-size:15px;font-weight:800;color:var(--violet);">🏃 SPIN × ${chosenCalls}...</div>`}
        </div>`;

      stage.querySelector('#ffRunBtn')?.addEventListener('click', (e) => {
        e.target.disabled = true;
        animRunning = true;
        renderRun();
        runAnimation();
      }, { signal: this.signal });
      stage.querySelector('#ffBackBtn')?.addEventListener('click', () => { chosenCalls = null; phase = 'count'; render(); }, { signal: this.signal });
    };

    const runAnimation = () => {
      let pos = { x: q.start.x, y: q.start.y };
      const trail = [];
      const wallSet = {};
      (q.walls || []).forEach((w) => { wallSet[`${w.x},${w.y}`] = true; });

      const allSteps = [];
      for (let c = 0; c < chosenCalls; c++) fnSteps.forEach((s) => allSteps.push(s));
      suffix.forEach((s) => allSteps.push(s));

      let hitWall = false, i = 0;
      const step = () => {
        if (i >= allSteps.length) { finish(); return; }
        const d = DIRS[allSteps[i]];
        const nx = pos.x + d.dx, ny = pos.y + d.dy;
        const blocked = nx < 0 || nx >= q.gridSize || ny < 0 || ny >= q.gridSize || !!wallSet[`${nx},${ny}`];
        if (!blocked) { trail.push({ x: pos.x, y: pos.y }); pos = { x: nx, y: ny }; } else hitWall = true;
        const gridEl = stage.querySelector('#ffGrid');
        if (gridEl) gridEl.innerHTML = buildGrid(pos, trail, false);
        i++;
        this.#timers.push(setTimeout(step, 300));
      };

      const finish = () => {
        animRunning = false;
        const reached = pos.x === q.goal.x && pos.y === q.goal.y && !hitWall;
        const gridEl = stage.querySelector('#ffGrid');
        if (gridEl) gridEl.innerHTML = buildGrid(pos, trail, reached);

        if (!reached) {
          this.#timers.push(setTimeout(() => {
            chosenCalls = null;
            phase = 'count';
            render();
            ctx.onCheck(false);
          }, 1200));
        } else {
          ctx.correctAnswer = 'Reached the star!';
          this.#timers.push(setTimeout(() => ctx.onCheck(true), 900));
        }
      };

      step();
    };

    const render = () => {
      if (phase === 'watch') renderWatch();
      else if (phase === 'count') renderCount();
      else if (phase === 'run') renderRun();
    };

    render();
  }

  unmount() {
    this.#timers.forEach(clearTimeout);
    this.#timers = [];
    super.unmount();
  }
}
