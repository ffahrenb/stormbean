import { L, ROAST } from './content.js';

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const interp = (pts, x) => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };

function frame(svg, draw) {
  const ro = new ResizeObserver(() => draw());
  ro.observe(svg.parentElement);
  draw();
  ro.draw = draw;
  return ro;
}

// generic line chart: series [{pts, color, w, label, dash}], x/y domain, ticks
function lineChart(svg, o) {
  const W = svg.clientWidth || svg.parentElement.clientWidth, H = svg.clientHeight || 200;
  const narrow = W < 420;
  const m = { l: 40, r: narrow ? 14 : (o.rightPad ?? 96), t: 14, b: 34 };
  const X = (x) => m.l + (x - o.x[0]) / (o.x[1] - o.x[0]) * (W - m.l - m.r);
  const Y = (y) => H - m.b - (y - o.y[0]) / (o.y[1] - o.y[0]) * (H - m.t - m.b);
  const ink = css('--ink'), mute = css('--mute'), line = css('--line');
  let s = '';
  for (const b of o.bands || []) s += `<rect x="${X(b[0])}" y="${m.t}" width="${X(b[1]) - X(b[0])}" height="${H - m.t - m.b}" fill="${b[2]}" opacity="${b[3] ?? 0.12}"/>`;
  for (const b of o.hbands || []) s += `<rect x="${m.l}" y="${Y(b[1])}" width="${W - m.l - m.r}" height="${Y(b[0]) - Y(b[1])}" fill="${b[2]}" opacity="${b[3] ?? 0.14}"/>`;
  for (const t of o.yt) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}" stroke="${line}" stroke-width="1"/><text x="${m.l - 6}" y="${Y(t) + 4}" text-anchor="end" fill="${mute}" font-size="12">${o.yf ? o.yf(t) : t}</text>`;
  const xt = narrow ? o.xt.filter((_, i) => i % 2 === 0) : o.xt;
  for (const t of xt) s += `<text x="${X(t)}" y="${H - m.b + 18}" text-anchor="middle" fill="${mute}" font-size="12">${o.xf ? o.xf(t) : t}</text>`;
  s += `<text x="${W - m.r}" y="${H - 4}" text-anchor="end" fill="${mute}" font-size="12">${o.xl}</text>`;
  for (const ser of o.series) {
    const d = ser.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
    s += `<path d="${d}" fill="none" stroke="${ser.color}" stroke-width="${ser.w || 2}" ${ser.dash ? `stroke-dasharray="${ser.dash}"` : ''} stroke-linejoin="round" stroke-linecap="round" opacity="${ser.op ?? 1}"/>`;
  }
  // end labels with collision avoidance
  if (!narrow) {
    const labs = o.series.filter((x) => x.label).map((ser) => { const p = ser.pts[ser.pts.length - 1]; return { y: Y(p[1]), x: X(p[0]), ser }; }).sort((a, b) => a.y - b.y);
    for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 15) labs[i].y = labs[i - 1].y + 15;
    for (const l of labs) s += `<text x="${l.x + 6}" y="${l.y + 4}" fill="${l.ser.color}" font-size="12" font-weight="${l.ser.w > 2 ? 700 : 500}" style="paint-order:stroke;stroke:${css('--panel')};stroke-width:4px">${l.ser.label}</text>`;
  }
  for (const mk of o.marks || []) s += `<line x1="${X(mk.x)}" x2="${X(mk.x)}" y1="${m.t}" y2="${H - m.b}" stroke="${mk.color || ink}" stroke-width="${mk.w || 1.5}" ${mk.dash ? `stroke-dasharray="${mk.dash}"` : ''}/>` + (mk.label ? `<text x="${X(mk.x) + (mk.anchor === 'end' ? -5 : 5)}" y="${m.t + 12 + (mk.dy || 0)}" text-anchor="${mk.anchor || 'start'}" fill="${mk.color || ink}" font-size="12" style="paint-order:stroke;stroke:${css('--panel')};stroke-width:4px">${mk.label}</text>` : '');
  for (const a of o.notes || []) s += `<text x="${X(a.x)}" y="${Y(a.y)}" fill="${a.color || mute}" font-size="12" text-anchor="${a.anchor || 'start'}" style="paint-order:stroke;stroke:${css('--panel')};stroke-width:4px">${a.t}</text>`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = s;
  if (narrow && o.series.some((x) => x.label)) {
    const leg = (svg.closest('.fig') || svg.parentElement).querySelector('.legend');
    if (leg) leg.innerHTML = o.series.filter((x) => x.label).map((x) => `<span><i style="background:${x.color}"></i>${x.label}</span>`).join('');
  } else { const leg = (svg.closest('.fig') || svg.parentElement).querySelector('.legend'); if (leg) leg.innerHTML = ''; }
}

export function fermChart(svg, lang, ui) {
  const acc = css('--accent');
  return frame(svg, () => lineChart(svg, {
    x: [0, 48], y: [3.5, 6.6], xt: [0, 12, 24, 36, 48], yt: [4, 5, 6], xl: ui.hours, yf: (t) => `pH ${t}`, rightPad: 20,
    bands: [[12, 18, css('--jade'), 0.18], [36, 48, css('--amber'), 0.16]],
    series: [{ pts: [[0, 6.27], [4, 6.0], [8, 5.55], [12, 5.1], [18, 4.7], [24, 4.45], [30, 4.3], [36, 4.18], [42, 4.08], [48, 4.0]], color: acc, w: 3 }],
    notes: [{ x: 12.5, y: 3.7, t: lang === 'de' ? 'Kolumbien 12–18 h' : 'Colombia 12–18 h', anchor: 'start', color: css('--jade') }, { x: 47.5, y: 6.35, t: lang === 'de' ? 'Äthiopien, unter Wasser' : 'Ethiopia, underwater', anchor: 'end', color: css('--amber') }, { x: 47, y: 4.2, t: '4,00', anchor: 'end', color: acc }],
  }));
}

const DRY = {
  washed: [[0, 52], [2, 41], [4, 31], [6, 23], [8, 17], [10, 13], [12, 11]],
  natural: [[0, 63], [3, 55], [6, 46], [9, 37], [12, 28], [15, 21], [18, 15.5], [21, 12.5], [24, 11.2]],
  honey: [[0, 55], [2, 47], [5, 36], [8, 26], [11, 18], [14, 13], [16, 11]],
  wethulled: [[0, 55], [1, 45], [2, 36], [2.6, 34], [3.2, 26], [4, 19], [5, 15], [6, 13]],
  anaerobic: [[4, 62], [7, 54], [10, 45], [13, 36], [16, 28], [19, 21], [22, 16], [25, 13], [28, 11.3]],
};
export function dryChart(svg, lang, ui, proc, PROCESSES) {
  return frame(svg, () => lineChart(svg, {
    x: [0, 28], y: [0, 70], xt: [0, 7, 14, 21, 28], yt: [0, 12, 30, 50, 70], xl: ui.days, yf: (t) => `${t} %`,
    hbands: [[10, 12, css('--jade'), 0.22]],
    series: Object.keys(DRY).map((k) => ({ pts: DRY[k], color: PROCESSES[k].color, w: k === proc ? 3.4 : 1.4, op: k === proc ? 1 : 0.45, label: L(PROCESSES[k].name, lang).split(' (')[0].split(' / ')[0] })),
    marks: proc === 'wethulled' ? [{ x: 2.6, color: PROCESSES.wethulled.color, dash: '3 3', label: lang === 'de' ? 'nass schälen' : 'wet hull' }] : [],
    notes: [{ x: 27.5, y: 4.5, t: lang === 'de' ? 'Ziel 10–12 %' : 'target 10–12 %', anchor: 'end', color: css('--jade') }],
  }));
}

export function roastChart(svg, lang, ui, getT) {
  const cols = { sucrose: css('--accent'), cga: css('--amber'), trig: css('--jade') };
  return frame(svg, () => {
    const T = getT();
    lineChart(svg, {
      x: [20, 240], y: [0, 1.05], xt: [20, 75, 130, 185, 240], yt: [0, 0.5, 1], xl: `${ui.roastTemp} °C`, yf: (t) => `${Math.round(t * 100)} %`, rightPad: 108,
      bands: ROAST.stages.map((s, i) => [s.from, s.to, i % 2 ? css('--line') : 'transparent', 0.6]),
      series: Object.keys(ROAST.curves).map((k) => ({ pts: ROAST.curves[k], color: cols[k], w: 2.6, label: L(ROAST.names[k], lang) })),
      marks: [{ x: T, color: css('--ink'), w: 2, label: `${Math.round(T)} °C`, anchor: T > 200 ? 'end' : 'start' }, { x: 200, color: css('--mute'), dash: '3 4', w: 1, label: lang === 'de' ? '1. Crack' : '1st crack', anchor: 'end', dy: 18 }],
    });
  });
}

export function remainingAt(k, T) { return interp(ROAST.curves[k], T); }
