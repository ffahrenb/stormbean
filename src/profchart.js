// Roast-profile chart: BT, ET, RoR, phase bands, events, scrubber.
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const mmss = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.round(Math.max(0, s) % 60)).padStart(2, '0')}`;
export { mmss };

export function profileChart(svg, get) {
  const draw = () => {
    const { profiles, scrubT, lang } = get();
    const W = svg.clientWidth || svg.parentElement.clientWidth, H = svg.clientHeight || 280;
    const narrow = W < 420;
    const m = { l: 38, r: 34, t: 40, b: 30 };
    if (!profiles.length) { svg.innerHTML = ''; return; }
    const tMax = Math.max(...profiles.map((p) => p.ev.DROP ?? p.t[p.t.length - 1])) + 15;
    const yMin = 0, yMax = 260, rMax = 25;
    const X = (t) => m.l + Math.max(0, t) / tMax * (W - m.l - m.r);
    const Y = (v) => H - m.b - (v - yMin) / (yMax - yMin) * (H - m.t - m.b);
    const YR = (v) => H - m.b - Math.max(0, Math.min(rMax, v)) / rMax * (H - m.t - m.b);
    const ink = css('--ink'), mute = css('--mute'), line = css('--line'), jade = css('--jade'), amber = css('--amber'), acc = css('--accent');
    let s = '';
    const p0 = profiles[0], e0 = p0.ev;
    const T = lang === 'de' ? { dry: 'Trocknung', mail: 'Maillard', dev: 'Entwicklung', min: 'min', ror: 'RoR °C/min' } : { dry: 'Drying', mail: 'Maillard', dev: 'Development', min: 'min', ror: 'RoR °C/min' };
    const bands = [];
    if (Number.isFinite(e0.DRYe)) bands.push([0, e0.DRYe, jade, T.dry]);
    if (Number.isFinite(e0.DRYe) && Number.isFinite(e0.FCs)) bands.push([e0.DRYe, e0.FCs, amber, T.mail]);
    if (Number.isFinite(e0.FCs)) bands.push([e0.FCs, e0.DROP, acc, T.dev]);
    for (const [a, b, c, n] of bands) {
      s += `<rect x="${X(a)}" y="${m.t}" width="${Math.max(0, X(b) - X(a))}" height="${H - m.t - m.b}" fill="${c}" opacity="0.1"/>`;
      const pct = (b - a) / e0.DROP * 100;
      const wpx = X(b) - X(a);
      if (wpx > 34) s += `<text x="${(X(a) + X(b)) / 2}" y="${m.t - 7}" text-anchor="middle" font-size="11" fill="${mute}">${wpx > 92 ? n + ' ' : ''}${Math.round(pct)} %</text>`;
    }
    for (const v of [50, 100, 150, 200, 250]) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="${line}"/><text x="${m.l - 5}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="${mute}">${v}°</text>`;
    for (const v of [5, 10, 15, 20]) s += `<text x="${W - m.r + 5}" y="${YR(v) + 4}" font-size="11" fill="${mute}">${v}</text>`;
    const step = narrow ? 120 : 60;
    for (let t = 0; t <= tMax; t += step) s += `<text x="${X(t)}" y="${H - m.b + 16}" text-anchor="middle" font-size="11" fill="${mute}">${Math.round(t / 60)}</text>`;
    s += `<text x="${W - m.r}" y="${H - 3}" text-anchor="end" font-size="11" fill="${mute}">${T.min}</text>`;
    s += `<text x="${W - 2}" y="12" text-anchor="end" font-size="11" fill="${mute}">${T.ror}</text><text x="2" y="12" font-size="11" fill="${mute}">BT/ET °C</text>`;
    profiles.forEach((p, k) => {
      const path = (arr, f) => { let d = ''; let pen = false; for (let i = 0; i < p.t.length; i++) { const v = arr[i]; if (!Number.isFinite(v) || p.t[i] < 0 || p.t[i] > (p.ev.DROP ?? Infinity) + 1) { pen = false; continue; } d += `${pen ? 'L' : 'M'}${X(p.t[i]).toFixed(1)},${f(v).toFixed(1)}`; pen = true; } return d; };
      const c = p.color;
      if (p.et.some(Number.isFinite)) s += `<path d="${path(p.et, Y)}" fill="none" stroke="${c}" stroke-width="1.4" stroke-dasharray="5 4" opacity="0.8"/>`;
      s += `<path d="${path(p.ror.map((v, i) => (p.t[i] > (p.ev.TP ?? 60) + 10 ? v : NaN)), YR)}" fill="none" stroke="${c}" stroke-width="1.2" stroke-dasharray="1.5 2.5" opacity="0.9"/>`;
      s += `<path d="${path(p.bt, Y)}" fill="none" stroke="${c}" stroke-width="${k === 0 ? 2.4 : 2}"/>`;
    });
    // events of the first profile
    const evs = [['TP', 'TP'], ['DRYe', lang === 'de' ? 'DE' : 'DE'], ['FCs', 'FC'], ['DROP', 'DROP']];
    let lastX = -99;
    for (const [k, lab] of evs) {
      const t = e0[k]; if (!Number.isFinite(t)) continue;
      const x = X(t), y = Y(p0.btAt(t));
      s += `<circle cx="${x}" cy="${y}" r="3.5" fill="${css('--panel')}" stroke="${p0.color}" stroke-width="2"/>`;
      const ly = y - 10 - (x - lastX < 30 ? 12 : 0);
      s += `<text x="${x}" y="${ly}" text-anchor="middle" font-size="11" font-weight="700" fill="${ink}" style="paint-order:stroke;stroke:${css('--panel')};stroke-width:3px">${lab}</text>`;
      lastX = x;
    }
    if (Number.isFinite(scrubT)) {
      const x = X(scrubT);
      s += `<line x1="${x}" x2="${x}" y1="${m.t}" y2="${H - m.b}" stroke="${ink}" stroke-width="1.2"/>`;
      s += `<circle cx="${x}" cy="${Y(p0.btAt(scrubT))}" r="5" fill="${p0.color}" stroke="${css('--panel')}" stroke-width="2"/>`;
    }
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = s;
  };
  const ro = new ResizeObserver(() => draw());
  ro.observe(svg.parentElement);
  draw();
  ro.draw = draw;
  return ro;
}
