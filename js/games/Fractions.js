import { BaseGame } from './BaseGame.js';

/** Builds a tappable pie/bar split into equal parts; `shadedCount` of them
 *  are filled with the accent color. Ported from buildFractionSVG(). */
const buildFractionSVG = (shape, denominator, shadedCount, { interactive = false } = {}) => {
  if (shape === 'circle') {
    const cx = 70, cy = 70, r = 60;
    let segments = '';
    for (let i = 0; i < denominator; i++) {
      const startAngle = (i / denominator) * 360 - 90;
      const endAngle = ((i + 1) / denominator) * 360 - 90;
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
      const largeArc = endAngle - startAngle > 180 ? 1 : 0;
      const pathD = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`;
      const fill = i < shadedCount ? 'var(--accent)' : 'var(--card-solid)';
      segments += `<path d="${pathD}" fill="${fill}" stroke="var(--ink)" stroke-width="2.5"${interactive ? ` class="frac-segment" data-idx="${i}" style="cursor:pointer;"` : ''}/>`;
    }
    return `<svg viewBox="0 0 140 140" role="img" aria-label="fraction circle">${segments}</svg>`;
  }
  const w = 240, h = 110, stripW = w / denominator;
  let bars = '';
  for (let j = 0; j < denominator; j++) {
    const bx = j * stripW;
    const fill = j < shadedCount ? 'var(--accent)' : 'var(--card-solid)';
    bars += `<rect x="${bx}" y="0" width="${stripW}" height="${h}" fill="${fill}" stroke="var(--ink)" stroke-width="2.5"${interactive ? ` class="frac-segment" data-idx="${j}" style="cursor:pointer;"` : ''}/>`;
  }
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="fraction bar">${bars}</svg>`;
};

export class Fractions extends BaseGame {
  mount(stage, q, ctx) {
    if (q.mode === 'identify') this.#mountIdentify(stage, q, ctx);
    else this.#mountShade(stage, q, ctx);
  }

  #mountIdentify(stage, q, ctx) {
    const correctAnswer = `${q.numerator}/${q.denominator}`;
    ctx.correctAnswer = correctAnswer;
    let selected = null;

    const render = () => {
      const opts = q.options || [];
      const optsHTML = opts.map((opt, i) => `<button class="time-option-btn${selected === opt ? ' selected' : ''}" data-i="${i}">${opt}</button>`).join('');
      stage.innerHTML = `
        <div class="eq-card" style="padding:18px 14px;">
          <h2 style="margin-bottom:6px;">What fraction is shaded?</h2>
          <p style="color:var(--ink-soft);margin-bottom:10px;">Tap the matching fraction</p>
          <div class="frac-shape-wrap">${buildFractionSVG(q.shape, q.denominator, q.numerator)}</div>
          <div class="time-options" style="margin-top:14px;">${optsHTML}</div>
          <button class="btn btn-primary" id="checkBtn" style="margin-top:16px; width:100%; max-width:260px;" ${selected ? '' : 'disabled'}>Check Answer</button>
        </div>`;
      opts.forEach((opt, i) => {
        stage.querySelector(`[data-i="${i}"]`).addEventListener('click', () => { selected = opt; render(); }, { signal: this.signal });
      });
      stage.querySelector('#checkBtn').addEventListener('click', () => {
        if (!selected) return;
        ctx.onCheck(selected === correctAnswer);
      }, { signal: this.signal });
    };
    render();
  }

  #mountShade(stage, q, ctx) {
    ctx.correctAnswer = `${q.numerator}/${q.denominator} shaded`;
    let shadedCount = 0;

    const render = () => {
      stage.innerHTML = `
        <div class="eq-card" style="padding:18px 14px;">
          <h2 style="margin-bottom:6px;">Shade ${q.numerator}/${q.denominator} of the shape</h2>
          <p style="color:var(--ink-soft);margin-bottom:10px;">Tap the parts to shade them</p>
          <div class="frac-shape-wrap" id="fracShapeWrap">${buildFractionSVG(q.shape, q.denominator, shadedCount, { interactive: true })}</div>
          <p class="frac-progress">${shadedCount} / ${q.denominator} shaded</p>
          <button class="btn btn-primary" id="checkBtn" style="margin-top:14px; width:100%; max-width:260px;">Check Answer</button>
        </div>`;

      stage.querySelectorAll('.frac-segment').forEach((seg) => {
        seg.addEventListener('click', () => {
          const idx = parseInt(seg.dataset.idx, 10);
          // Tapping an unshaded segment fills it (and everything before it
          // in order); tapping the last shaded segment unfills from there.
          shadedCount = idx < shadedCount ? idx : idx + 1;
          render();
        }, { signal: this.signal });
      });
      stage.querySelector('#checkBtn').addEventListener('click', () => {
        ctx.onCheck(shadedCount === q.numerator);
      }, { signal: this.signal });
    };
    render();
  }
}
