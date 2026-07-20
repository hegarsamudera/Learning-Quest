import { BaseGame } from './BaseGame.js';

/** Builds an analog clock face as inline SVG for the given hour/minute. */
const buildClockSVG = (hour, minute) => {
  const cx = 70, cy = 70, r = 62;
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;
  const pt = (angleDeg, length) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + length * Math.cos(rad), y: cy + length * Math.sin(rad) };
  };
  const hp = pt(hourAngle, 34);
  const mp = pt(minuteAngle, 50);

  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const ang = i * 6;
    const isHourTick = i % 5 === 0;
    const outer = pt(ang, r - 4);
    const inner = pt(ang, isHourTick ? r - 14 : r - 9);
    ticks += `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="var(--ink-soft)" stroke-width="${isHourTick ? 2 : 1}"/>`;
  }
  let numbers = '';
  for (let n = 1; n <= 12; n++) {
    const npos = pt(n * 30, r - 26);
    numbers += `<text x="${npos.x}" y="${npos.y + 5}" text-anchor="middle" font-size="13" font-weight="bold" font-family="var(--font-display)" fill="var(--ink)">${n}</text>`;
  }

  return `<svg viewBox="0 0 140 140" role="img" aria-label="clock face">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--card-solid)" stroke="var(--line)" stroke-width="3"/>
    ${ticks}${numbers}
    <line x1="${cx}" y1="${cy}" x2="${hp.x}" y2="${hp.y}" stroke="var(--ink)" stroke-width="6" stroke-linecap="round"/>
    <line x1="${cx}" y1="${cy}" x2="${mp.x}" y2="${mp.y}" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="5" fill="var(--ink)"/>
  </svg>`;
};

const pad2 = (n) => (n < 10 ? `0${n}` : n);

export class TellingTime extends BaseGame {
  mount(stage, q, ctx) {
    if (q.mode === 'set') this.#mountSet(stage, q, ctx);
    else this.#mountRead(stage, q, ctx);
  }

  #mountSet(stage, q, ctx) {
    const vals = { hour: 12, minute: 0 };

    const render = () => {
      ctx.correctAnswer = `${q.hour}:${pad2(q.minute)}`;
      stage.innerHTML = `
        <div class="eq-card" style="padding:18px 14px;">
          <h2 style="margin-bottom:14px;">Set the clock to ${q.hour}:${pad2(q.minute)}</h2>
          <div class="clock-svg-wrap">${buildClockSVG(vals.hour, vals.minute)}</div>
          <div style="margin-top:20px; display:flex; flex-direction:column; gap:12px;">
            <div class="disc-controls"><button class="round-btn" id="hr-">-</button><span style="min-width:80px; font-weight:bold; font-size:16px;">Hour: ${vals.hour}</span><button class="round-btn" id="hr+">+</button></div>
            <div class="disc-controls"><button class="round-btn" id="mn-">-</button><span style="min-width:80px; font-weight:bold; font-size:16px;">Min: ${pad2(vals.minute)}</span><button class="round-btn" id="mn+">+</button></div>
          </div>
          <button class="btn btn-primary" id="checkBtn" style="margin-top:30px; width:100%; max-width:240px;">Check Answer</button>
        </div>`;

      stage.querySelector('#hr-').addEventListener('click', () => { vals.hour = vals.hour === 1 ? 12 : vals.hour - 1; render(); }, { signal: this.signal });
      stage.querySelector('#hr+').addEventListener('click', () => { vals.hour = vals.hour === 12 ? 1 : vals.hour + 1; render(); }, { signal: this.signal });
      stage.querySelector('#mn-').addEventListener('click', () => { vals.minute = vals.minute === 0 ? 55 : vals.minute - 5; render(); }, { signal: this.signal });
      stage.querySelector('#mn+').addEventListener('click', () => { vals.minute = vals.minute === 55 ? 0 : vals.minute + 5; render(); }, { signal: this.signal });
      stage.querySelector('#checkBtn').addEventListener('click', () => {
        ctx.onCheck(vals.hour === q.hour && vals.minute === q.minute);
      }, { signal: this.signal });
    };
    render();
  }

  #mountRead(stage, q, ctx) {
    let selected = null;
    const render = () => {
      ctx.correctAnswer = q.answer;
      const optsHTML = q.options.map((opt, i) => `<button class="time-option-btn${selected === opt ? ' selected' : ''}" data-i="${i}">${opt}</button>`).join('');
      stage.innerHTML = `
        <div class="eq-card" style="padding:18px 14px;">
          <h2 style="margin-bottom:14px;">What time is it?</h2>
          <div class="clock-svg-wrap">${buildClockSVG(q.hour, q.minute)}</div>
          <div class="time-options">${optsHTML}</div>
          <button class="btn btn-primary" id="checkBtn" style="margin-top:20px; width:100%; max-width:260px;" ${selected ? '' : 'disabled'}>Check Answer</button>
        </div>`;

      q.options.forEach((opt, i) => {
        stage.querySelector(`[data-i="${i}"]`).addEventListener('click', () => { selected = opt; render(); }, { signal: this.signal });
      });
      stage.querySelector('#checkBtn').addEventListener('click', () => {
        if (!selected) return;
        ctx.onCheck(selected === q.answer);
      }, { signal: this.signal });
    };
    render();
  }
}
