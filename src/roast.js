// Roast-profile import: Artisan CSV (tab-separated) and generic CSV/TSV/semicolon files.
// Everything runs locally in the browser.

export const PROFILE_COLORS = ['#b3202a', '#2f6fa8', '#c47a12'];

const clock = (s) => {
  if (s == null) return NaN;
  s = String(s).trim();
  if (!s) return NaN;
  if (s.includes(':')) {
    const p = s.split(':').map(Number);
    if (p.some((v) => !Number.isFinite(v))) return NaN;
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
  }
  const v = Number(s.replace(',', '.'));
  return Number.isFinite(v) ? v : NaN;
};
const num = (s) => { if (s == null) return NaN; const v = Number(String(s).trim().replace(',', '.')); return Number.isFinite(v) ? v : NaN; };

function splitLines(text) { return text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim().length); }
function detectDelim(lines) {
  const sample = lines.slice(0, 8).join('\n');
  const c = (ch) => (sample.match(new RegExp(ch === '\t' ? '\\t' : '\\' + ch, 'g')) || []).length;
  const tab = c('\t'), semi = c(';'), comma = c(',');
  if (tab >= semi && tab >= comma && tab > 0) return '\t';
  if (semi >= comma && semi > 0) return ';';
  return ',';
}
const cells = (line, d) => line.split(d).map((x) => x.trim().replace(/^"(.*)"$/, '$1'));

const EVENT_MAP = [
  [/^charge$/i, 'CHARGE'], [/^tp$|turning/i, 'TP'], [/dry.?e|dry end|drye/i, 'DRYe'], [/^fcs$|first crack|1c|fc start/i, 'FCs'], [/^fce$|fc end/i, 'FCe'],
  [/^scs$|second crack|2c/i, 'SCs'], [/^sce$/i, 'SCe'], [/^drop$/i, 'DROP'], [/^cool/i, 'COOL'],
];
const evName = (s) => { for (const [re, k] of EVENT_MAP) if (re.test(String(s).trim())) return k; return null; };

// returns { headers, rows (array of string arrays), meta, artisan }
export function readTable(text) {
  const lines = splitLines(text);
  if (!lines.length) throw new Error('empty');
  let meta = {}, artisan = false, start = 0;
  if (/^Date:/i.test(lines[0]) || /CHARGE:/i.test(lines[0])) {
    artisan = true;
    for (const part of lines[0].split(/\t|,(?=\s*[A-Za-z]+:)/)) { const m = part.match(/^\s*([A-Za-z]+):(.*)$/); if (m) meta[m[1].trim()] = m[2].trim(); }
    start = 1;
  }
  const d = detectDelim(lines.slice(start));
  const first = cells(lines[start], d);
  const hasHeader = first.some((x) => /[A-Za-zÄÖÜäöü]/.test(x) && !/^\d+:\d+$/.test(x));
  const headers = hasHeader ? first : first.map((_, i) => `col ${i + 1}`);
  const rows = lines.slice(start + (hasHeader ? 1 : 0)).map((l) => cells(l, d));
  return { headers, rows, meta, artisan, delim: d };
}

// guess column mapping
export function guessMap(tbl) {
  const h = tbl.headers.map((x) => x.toLowerCase());
  const find = (...res) => { for (const re of res) { const i = h.findIndex((x) => re.test(x)); if (i >= 0) return i; } return -1; };
  let time = tbl.artisan ? find(/^time2$/, /^time1$/) : find(/^time2$/, /^time1$/, /^time|zeit|^t$|sec|seconds|elapsed|min/);
  let bt = find(/^bt$/, /bean|bohne|^bt\b|probe ?1|^temp(erature)?$/);
  let et = find(/^et$/, /env|exhaust|abluft|^et\b|air|umluft|inlet|drum|probe ?2/);
  let ev = find(/^event$|ereignis|events?/);
  if (time < 0) time = 0;
  if (bt < 0) bt = Math.min(1, h.length - 1);
  if (et < 0 && h.length > 2) et = [0, 1, 2].find((i) => i !== time && i !== bt) ?? -1;
  return { time, bt, et, ev };
}

// build a profile from a table + mapping. opts: { unit: 'auto'|'C'|'F', dryEnd: 150 }
export function buildProfile(tbl, map, opts = {}) {
  const t = [], bt = [], et = [], evRows = [];
  const t1Idx = tbl.headers.findIndex((x) => /^time1$/i.test(x));
  for (const r of tbl.rows) {
    let tt = clock(r[map.time]);
    // Artisan: Time2 is empty before CHARGE → fall back to Time1 and shift later
    if (!Number.isFinite(tt) && t1Idx >= 0 && map.time !== t1Idx) tt = NaN;
    const b = num(r[map.bt]); const e = map.et >= 0 ? num(r[map.et]) : NaN;
    if (!Number.isFinite(tt) || !Number.isFinite(b)) continue;
    t.push(tt); bt.push(b); et.push(e);
    if (map.ev >= 0 && r[map.ev]) { const k = evName(r[map.ev]); if (k) evRows.push([k, t.length - 1]); }
  }
  if (t.length < 5) throw new Error('rows');
  // minutes vs seconds for plain numbers
  const span = t[t.length - 1] - t[0];
  const anyClock = tbl.rows.some((r) => String(r[map.time] || '').includes(':'));
  if (!anyClock && span > 0 && span < 40) for (let i = 0; i < t.length; i++) t[i] *= 60;
  // unit
  let unit = opts.unit && opts.unit !== 'auto' ? opts.unit : (tbl.meta.Unit ? tbl.meta.Unit.toUpperCase().slice(0, 1) : null);
  if (!unit) unit = Math.max(...bt) > 300 ? 'F' : 'C';
  if (unit === 'F') for (let i = 0; i < t.length; i++) { bt[i] = (bt[i] - 32) * 5 / 9; if (Number.isFinite(et[i])) et[i] = (et[i] - 32) * 5 / 9; }
  // events
  const ev = {};
  for (const [k, i] of evRows) if (!(k in ev)) ev[k] = t[i];
  // Artisan header times are relative to CHARGE (CHARGE itself is the recording offset)
  if (tbl.artisan && tbl.meta) {
    const usingT2 = /^time2$/i.test(tbl.headers[map.time] || '');
    for (const k of ['TP', 'DRYe', 'FCs', 'FCe', 'SCs', 'SCe', 'DROP']) {
      if (k in ev) continue;
      const v = clock(tbl.meta[k]);
      if (Number.isFinite(v) && v > 0) ev[k] = usingT2 ? v : v + (clock(tbl.meta.CHARGE) || 0);
    }
    if (!('CHARGE' in ev)) ev.CHARGE = usingT2 ? 0 : (clock(tbl.meta.CHARGE) || t[0]);
  }
  // time zero = CHARGE
  const t0 = 'CHARGE' in ev ? ev.CHARGE : t[0];
  for (let i = 0; i < t.length; i++) t[i] -= t0;
  for (const k in ev) ev[k] -= t0;
  // keep from charge (allow a few seconds before)
  let s = 0; while (s < t.length - 1 && t[s] < -2) s++;
  const P = { t: t.slice(s), bt: bt.slice(s), et: et.slice(s), ev, unit };
  analyse(P, opts.dryEnd ?? 150);
  return P;
}

export function analyse(P, dryEnd = 150) {
  const { t, bt } = P;
  const n = t.length;
  // RoR °C/min via linear regression over a 30-s window
  const ror = new Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    let sx = 0, sy = 0, sxx = 0, sxy = 0, k = 0;
    for (let j = i; j >= 0 && t[i] - t[j] <= 30; j--) { sx += t[j]; sy += bt[j]; sxx += t[j] * t[j]; sxy += t[j] * bt[j]; k++; }
    if (k >= 3) { const den = k * sxx - sx * sx; if (den > 1e-9) ror[i] = (k * sxy - sx * sy) / den * 60; }
  }
  P.ror = ror;
  const ev = P.ev;
  // turning point: minimum BT in the first 4 minutes
  if (!('TP' in ev)) { let mi = -1, mv = Infinity; for (let i = 0; i < n && t[i] <= 240; i++) if (t[i] >= 0 && bt[i] < mv) { mv = bt[i]; mi = i; } if (mi > 0 && mi < n - 1) ev.TP = t[mi]; }
  const tpT = ev.TP ?? 0;
  // dry end: first time BT ≥ threshold after TP (unless an event exists)
  P.dryAuto = false;
  if (!('DRYe' in ev)) { for (let i = 0; i < n; i++) if (t[i] > tpT && bt[i] >= dryEnd) { ev.DRYe = t[i]; P.dryAuto = true; break; } }
  if (!('DROP' in ev)) { ev.DROP = t[n - 1]; P.dropAuto = true; }
  const at = (time) => { if (!Number.isFinite(time)) return NaN; let i = 0; while (i < n - 1 && t[i + 1] < time) i++; const a = t[i], b = t[Math.min(n - 1, i + 1)]; const f = b > a ? (time - a) / (b - a) : 0; return bt[i] + (bt[Math.min(n - 1, i + 1)] - bt[i]) * Math.min(1, Math.max(0, f)); };
  P.btAt = at;
  const total = ev.DROP;
  const st = { total, tpT: ev.TP, tpBT: at(ev.TP), dryT: ev.DRYe, fcT: ev.FCs, fcBT: at(ev.FCs), dropBT: at(ev.DROP) };
  if (Number.isFinite(ev.DRYe)) st.dryPct = ev.DRYe / total * 100;
  if (Number.isFinite(ev.FCs)) {
    st.maillT = ev.FCs - (ev.DRYe ?? 0); st.maillPct = st.maillT / total * 100;
    st.devT = total - ev.FCs; st.dtr = st.devT / total * 100; st.devDelta = st.dropBT - st.fcBT;
    st.devRoR = st.devT > 0 ? st.devDelta / st.devT * 60 : NaN;
  }
  P.stats = st;
  return P;
}

// clearly labelled synthetic example (not a real roast)
export function sampleProfile() {
  const rows = [];
  const pts = [[0, 200, 205], [15, 165, 196], [30, 128, 190], [45, 106, 188], [60, 96, 189], [75, 92, 192], [90, 93, 196], [120, 101, 203], [150, 111, 209], [180, 121, 214], [210, 131, 218], [240, 140, 222], [270, 148, 225], [285, 152, 226], [300, 156, 228], [330, 163, 230], [360, 170, 232], [390, 176, 233], [420, 182, 234], [450, 187, 234], [480, 191, 234], [510, 195, 233], [525, 197, 232], [540, 199, 231], [570, 202, 230], [600, 205, 229], [615, 206.5, 229]];
  for (let i = 0; i < pts.length - 1; i++) { const [a, b1, e1] = pts[i], [b, b2, e2] = pts[i + 1]; for (let s = a; s < b; s += 3) { const f = (s - a) / (b - a); rows.push([s, b1 + (b2 - b1) * f, e1 + (e2 - e1) * f]); } }
  rows.push(pts[pts.length - 1]);
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const ev = { 0: 'CHARGE', 525: 'FCs', 615: 'DROP' };
  let out = 'Date:22.11.2026\tUnit:C\tCHARGE:00:00\tTP:\tDRYe:\tFCs:\tFCe:\tSCs:\tSCe:\tDROP:\tCOOL:\tTime:10:00\nTime1\tTime2\tET\tBT\tEvent\n';
  for (const [s, b, e] of rows) out += `${mmss(s)}\t${mmss(s)}\t${e.toFixed(1)}\t${b.toFixed(1)}\t${ev[s] || ''}\n`;
  return out;
}
