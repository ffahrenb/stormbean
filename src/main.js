import * as THREE from 'three';
import { L, UI, MONTHS, PROD, PROCESSES, PROC_ORDER, STEPS, STATIONS, COUNTRIES, REFS, ALL_COUNTRIES, LAYERS, BEAN_STATES, COMPO, PROC_CHEM, ODORANTS, DEFECTS, ROAST, SOURCES, SRC } from './content.js';
import { sourcesHTML } from './sources.js';
import { MapView } from './map.js';
import { Diorama } from './diorama.js';
import { BeanModel } from './bean.js';
import { VarietyView } from './varview.js';
import { ClimateView } from './climview.js';
import { Post } from './env.js';
import { fermChart, dryChart, roastChart, remainingAt } from './charts.js';
import { profileChart, mmss } from './profchart.js';
import { readTable, guessMap, buildProfile, sampleProfile, PROFILE_COLORS } from './roast.js';
import { VARIETIES, VGROUPS, SCALE, PEDIGREE } from './varieties.js';
import { CLIM_MODEL, CLIM_FINDINGS, CLIM_RANGES, CLIM_CATS, CLIM_COUNTRY, CLIM_GAIN_ONLY } from './climate.js';
import { TOUR } from './tour.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mobile = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches;
const tt = (de, en) => ({ de, en });

const S = {
  view: 'map', lang: 'de', theme: 'light', country: null, mapSel: null, proc: 'washed', step: 0, level: 0,
  chemView: 'cherry', roastT: 205, mapLayer: 'prod', mapStyle: 'sat', varA: 'geisha', varB: 'typica', dT: 0,
  quality: mobile ? 'std' : 'high', profiles: [], scrubT: NaN, unit: 'auto', dryEnd: 150, paste: false, err: '',
};
try {
  const saved = JSON.parse(localStorage.getItem('bean-journey') || '{}');
  if (saved.lang) S.lang = saved.lang; if (typeof saved.level === 'number') S.level = saved.level; if (saved.quality) S.quality = saved.quality;
} catch (e) { /* storage unavailable */ }
const save = () => { try { localStorage.setItem('bean-journey', JSON.stringify({ lang: S.lang, level: S.level, quality: S.quality })); } catch (e) { /* ignore */ } };

REFS.forEach((c) => { c.ref = true; });
const ui = () => UI[S.lang];
const l = (o) => L(o, S.lang);
const nf = (v, d = 1) => new Intl.NumberFormat(S.lang === 'de' ? 'de-DE' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const nfi = (v) => new Intl.NumberFormat(S.lang === 'de' ? 'de-DE' : 'en-US', { maximumFractionDigits: 0, useGrouping: 'min2' }).format(v);
const byId = new Map(ALL_COUNTRIES.map((c) => [c.id, c]));
const ranked = COUNTRIES.slice().sort((a, b) => b.p26 - a.p26);
const shareOf = (c) => c.p26 / PROD.world * 100;
const VBY = new Map(VARIETIES.map((v) => [v.id, v]));
const HASH = { map: 'map', journey: 'journey', var: 'varieties', chem: 'chemistry', clim: 'climate', sources: 'sources' };
const UNHASH = Object.fromEntries(Object.entries(HASH).map(([k, v]) => [v, k]));

// ---------- citations ----------
function cite(ids) {
  const list = (ids || []).filter((id) => SRC[id]);
  if (!list.length) return '';
  return ` <span class="cite">[${list.map((id) => `<a href="#src-${id}" data-src="${id}" title="${esc(SRC[id].t)}">${SRC[id].n}</a>`).join(', ')}]</span>`;
}
function sourcesBlock(ids) {
  const list = [...new Set(ids)].map((id) => SRC[id]).filter(Boolean).sort((a, b) => a.n - b.n);
  return `<details class="sources"><summary>${ui().sources} (${list.length})</summary><ul>${list.map((s) => `<li><span class="cite">[${s.n}]</span> <a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join('')}</ul></details>`;
}

// ---------- theme ----------
function currentTheme() {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark' || t === 'light') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ---------- renderer ----------
const stage = $('#stage');
const canvas = $('#gl');
let renderer = null, map = null, dio = null, bean = null, vv = null, cv = null;
const posts = {};
const pixelRatio = () => Math.min(devicePixelRatio, S.quality === 'high' ? 2 : 1.5);
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
} catch (e) {
  stage.classList.add('nogl');
  $('#glmsg').textContent = UI[S.lang].noWebgl;
}
function ensureVar() { if (!vv && renderer) { vv = new VarietyView(renderer, { mobile }); vv.setTheme(S.theme); vv.resize(W, H); } if (vv) vv.setVarieties(VBY.get(S.varA), S.varB ? VBY.get(S.varB) : null); }
function ensureClim() { if (!cv && renderer) { cv = new ClimateView(renderer, { mobile }); cv.setTheme(S.theme); cv.resize(W, H); cv.setDT(S.dT, true); } }

// ---------- views ----------
function setView(v, push = true) {
  if (!HASH[v]) v = 'map';
  S.view = v;
  document.body.dataset.view = v;
  for (const b of document.querySelectorAll('.tabs button')) b.setAttribute('aria-selected', b.dataset.view === v ? 'true' : 'false');
  const tb = $('.tabs button[aria-selected=true]'), tabs = $('#tabs');
  if (tb && tabs.scrollWidth > tabs.clientWidth) tabs.scrollLeft = tb.offsetLeft - tabs.clientWidth / 2 + tb.offsetWidth / 2;
  if (v === 'var') ensureVar();
  if (v === 'clim') ensureClim();
  if (map) map.setActive(v === 'map');
  if (dio) dio.setActive(v === 'journey');
  if (vv) vv.setActive(v === 'var');
  if (cv) cv.setActive(v === 'clim');
  if (push && location.hash !== '#' + HASH[v]) history.replaceState(null, '', '#' + HASH[v]);
  if (v === 'journey' && dio) applyJourney(true);
  if (v === 'chem' && bean) chemBean();
  if (v === 'sources') $('#srcView').innerHTML = sourcesHTML(S.lang);
  if (v !== 'chem') $('#anat').innerHTML = '';
  renderPanel();
  buildLabels();
  updateLegend();
}
function chemBean() {
  if (!bean) return;
  if (S.chemView === 'cherry') bean.setState('cherry');
  else { bean.setState('roast'); bean.setRoast(S.chemView === 'profile' && S.profiles[0] && Number.isFinite(S.scrubT) ? S.profiles[0].btAt(S.scrubT) : S.roastT, true); }
  bean.root.rotation.y = 0;
}

// ---------- labels ----------
const labelsEl = $('#labels');
let labelEls = [];
function addLabel(id, html, cls, onClick, extra = {}) {
  const el = document.createElement(onClick ? 'button' : 'div');
  el.className = 'lab ' + (cls || ''); if (onClick) { el.type = 'button'; el.addEventListener('click', (e) => { e.stopPropagation(); onClick(); }); }
  el.innerHTML = html; labelsEl.appendChild(el); labelEls.push({ el, id, ...extra });
}
function buildLabels() {
  labelsEl.innerHTML = '';
  labelEls = [];
  if (S.view === 'map') {
    for (const c of ALL_COUNTRIES) addLabel(c.id, `<span>${esc(l(c.name))}</span>${c.p26 && !c.ref ? `<b>${nf(c.p26 / 1000)}</b>` : ''}`, c.ref ? 'ref' : '', () => selectCountry(c.id, true), { c });
  } else if (S.view === 'journey') {
    for (const id of [...new Set(routeSteps().map((s) => s.st))]) addLabel(id, `<span>${esc(l(STATIONS[id]))}</span>`, 'st', () => { const i = routeSteps().findIndex((s) => s.st === id); if (i >= 0) goStep(i); });
  } else if (S.view === 'var') {
    const a = VBY.get(S.varA), b = S.varB ? VBY.get(S.varB) : null;
    addLabel('A', `<span>${esc(shortName(a))}</span><b>≈ ${nf(a.h)} m</b>`, '');
    if (b) addLabel('B', `<span>${esc(shortName(b))}</span><b>≈ ${nf(b.h)} m</b>`, '');
    addLabel('H', `<span>${S.lang === 'de' ? 'Mensch' : 'Person'}</span><b>${nf(1.7, 2)} m</b>`, '');
    addLabel('S', '<span>3 m</span>', 'ref');
  } else if (S.view === 'clim' && cv) {
    for (const lv of cv.levels) addLabel(lv.id, `<span>${nfi(lv.lv)} m</span>`, 'ref');
  }
}
function shortName(v) { return l(v.name).replace(/\s*\(.*\)$/, ''); }
function layoutLabels() {
  if (!labelEls.length) return;
  const rect = stage.getBoundingClientRect();
  let proj = [];
  if (S.view === 'map' && map) proj = map.projectLabels().map((p) => ({ ...p, id: p.c.id }));
  else if (S.view === 'journey' && dio) proj = dio.projectLabels(labelEls.map((x) => x.id));
  else if (S.view === 'var' && vv) proj = vv.projectLabels();
  else if (S.view === 'clim' && cv) proj = cv.projectLabels();
  const pm = new Map(proj.map((p) => [p.id, p]));
  const placed = [];
  const order = labelEls.slice().sort((a, b) => prio(b) - prio(a));
  for (const lb of order) {
    const p = pm.get(lb.id);
    if (!p || !p.vis || (S.view === 'journey' && p.d > 48 && prio(lb) < 1000)) { lb.el.style.visibility = 'hidden'; continue; }
    const w = lb.el.offsetWidth, h = lb.el.offsetHeight;
    const x = p.x - w / 2, y = p.y - h - 4;
    const box = [x, y, x + w, y + h];
    const hit = placed.some((b) => !(box[2] < b[0] - 2 || box[0] > b[2] + 2 || box[3] < b[1] - 1 || box[1] > b[3] + 1));
    const forced = prio(lb) >= 1000;
    if ((hit && !forced) || x < 2 || x + w > rect.width - 2 || y < 2 || y > rect.height - h - 2) { lb.el.style.visibility = 'hidden'; continue; }
    placed.push(box);
    lb.el.style.visibility = 'visible';
    lb.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    lb.el.classList.toggle('on', S.view === 'map' ? S.mapSel === lb.id : S.view === 'journey' ? dio && dio.station === lb.id : false);
  }
}
function prio(lb) {
  if (S.view === 'map') { if (S.mapSel === lb.id) return 2000; return (lb.c.p26 || 300) / 100 - (lb.c.ref ? 5 : 0); }
  if (S.view === 'journey') return dio && dio.station === lb.id ? 2000 : 1;
  if (S.view === 'var') return lb.id === 'A' || lb.id === 'B' ? 1500 : 5;
  return 1;
}

// ---------- legend ----------
function updateLegend() {
  const lg = $('#leg3d'), u = ui();
  if (S.view === 'map' && S.mapLayer === 'prod') lg.innerHTML = `<span><i class="a"></i>${u.arabica}</span><span><i class="r"></i>${u.robusta}</span><span class="lb"><i class="b"></i>${u.belt}</span>`;
  else if (S.view === 'map') lg.innerHTML = ['high', 'mixed', 'gain', 'na'].map((k) => `<span><i style="background:${CLIM_CATS[k].c}"></i>${esc(l(CLIM_CATS[k].n))}</span>`).join('');
  else if (S.view === 'clim') lg.innerHTML = CLIM_MODEL.bands.map((b) => `<span><i style="background:${b.c}"></i>${esc(l(b.n).replace(/\s*\(.*\)/, ''))}</span>`).join('');
  else lg.innerHTML = '';
}

// ---------- map panel ----------
function barRow(c, i, cum, max) {
  const a = (c.ara || 0) / max * 100, r = (c.rob || 0) / max * 100;
  return `<button class="crow${S.mapSel === c.id ? ' on' : ''}" data-cid="${c.id}" type="button">
    <span class="rk">${i}</span><span class="cn">${esc(l(c.name))}</span>
    <span class="bar"><i class="a" style="width:${a}%"></i><i class="r" style="width:${r}%"></i></span>
    <span class="num">${nf(c.p26 / 1000)}</span><span class="pc">${nf(shareOf(c))} %</span><span class="cu">${nf(cum, 0)} %</span></button>`;
}
function layerSeg() {
  const u = ui();
  return `<div class="seg layerseg" role="tablist"><button type="button" role="tab" data-layer="prod" aria-selected="${S.mapLayer === 'prod'}">${u.layerProd}</button><button type="button" role="tab" data-layer="clim" aria-selected="${S.mapLayer === 'clim'}">${u.layerClim}</button></div>`;
}
function mapPanel() {
  const u = ui();
  if (S.mapSel) return countryPanel(byId.get(S.mapSel));
  if (S.mapLayer === 'clim') return climMapPanel();
  const max = ranked[0].p26;
  let cum = 0;
  const rows = ranked.map((c, i) => { cum += shareOf(c); return barRow(c, i + 1, cum, max); }).join('');
  const restShare = 100 - cum;
  const spec = REFS.slice().sort((a, b) => (b.p26 || 0) - (a.p26 || 0) || l(a.name).localeCompare(l(b.name))).map((c) => `<button class="crow ref${S.mapSel === c.id ? ' on' : ''}" data-cid="${c.id}" type="button"><span class="rk"></span><span class="cn">${esc(l(c.name))}</span><span class="refnote">${esc(l(c.special).split(/[.:;(]/)[0])}</span><span class="num">${c.p26 ? nf(c.p26 / 1000) : '–'}</span></button>`).join('');
  return `${layerSeg()}<header class="ph"><h2>${u.mapHead}</h2><p class="lead">${u.mapLead}</p></header>
  <div class="kpis"><div><b>${nf(PROD.world / 1000)}</b><span>${u.mioBags} · ${u.world} 2026/27</span></div><div><b>${nf(shareOf(ranked[0]))} %</b><span>${esc(l(ranked[0].name))}</span></div><div><b>${nf(shareOf(ranked[0]) + shareOf(ranked[1]), 0)} %</b><span>${esc(l(ranked[0].name))} + ${esc(l(ranked[1].name))}</span></div></div>
  <div class="tlegend"><span><i class="a"></i>${u.arabica}</span><span><i class="r"></i>${u.robusta}</span></div>
  <div class="tblhead"><span></span><span></span><span></span><span class="num">${u.mioBags}</span><span class="pc">${u.share}</span><span class="cu">${u.cum}</span></div>
  <div class="rows">${rows}<div class="crow rest"><span class="rk"></span><span class="cn" style="grid-column:2/4">${u.rest}</span><span class="num">${nf((PROD.world - ranked.reduce((s, c) => s + c.p26, 0)) / 1000)}</span><span class="pc">${nf(restShare)} %</span><span class="cu">100 %</span></div></div>
  <p class="src">USDA FAS, Coffee: World Markets and Trade, 2 July 2026 · ${S.lang === 'de' ? 'Prognose' : 'forecast'} 2026/27${cite(['usda'])}</p>
  <h3>${u.specHead}</h3><p class="small">${u.specLead}</p><div class="rows refs">${spec}</div>
  ${sourcesBlock(['usda', 'ft', 'sca', ...REFS.flatMap((c) => c.src || [])])}`;
}
const GAIN_NAMES = { 858: tt('Uruguay', 'Uruguay'), 32: tt('Argentinien', 'Argentina'), 152: tt('Chile', 'Chile'), 840: tt('USA', 'USA'), 710: tt('Südafrika', 'South Africa'), 554: tt('Neuseeland', 'New Zealand') };
function climMapPanel() {
  const de = S.lang === 'de';
  const groups = ['high', 'mixed', 'gain', 'na'].map((cat) => {
    const list = ALL_COUNTRIES.filter((c) => (CLIM_COUNTRY[c.id] ? CLIM_COUNTRY[c.id].cat : 'na') === cat).sort((a, b) => (b.p26 || 0) - (a.p26 || 0));
    if (!list.length) return '';
    return `<h3 class="ccat" style="--cc:${CLIM_CATS[cat].c}"><i></i>${esc(l(CLIM_CATS[cat].n))}</h3><div class="pchips">${list.map((c) => `<button type="button" class="pchip" data-cid="${c.id}" style="--pc:${CLIM_CATS[cat].c}"><i></i>${esc(l(c.name))}</button>`).join('')}</div>`;
  }).join('');
  return `${layerSeg()}<header class="ph"><h2>${de ? 'Klimarisiko nach Herkunft' : 'Climate risk by origin'}</h2><p class="lead">${de ? 'Zuordnung aus veröffentlichten Eignungsmodellen. Die Studien nutzen unterschiedliche Szenarien und meist den Horizont 2050 – eine Lesehilfe, kein Ranking.' : 'Assignment from published suitability models. The studies use different scenarios, mostly with a 2050 horizon – a reading aid, not a ranking.'}</p></header>
  ${groups}
  <p class="small" style="margin-top:14px">${de ? 'Schraffiert grün: Länder ohne nennenswerten Anbau, für die Grüter et al. (2022) neue geeignete Flächen projizieren' : 'Green hatching: countries without significant production where Grüter et al. (2022) project new suitable land'}: ${Object.keys(CLIM_GAIN_ONLY).map((id) => l(GAIN_NAMES[id])).join(', ')}.${cite(['gruter'])}</p>
  <p class="small">${de ? 'Länder antippen für die Begründung. Mehr zu Temperaturbändern und Höhenlagen im Tab «Klima».' : 'Tap a country for the reasoning. More on temperature bands and altitude in the “Climate” tab.'}</p>
  <button class="primary" type="button" data-goto="clim">${de ? 'Zum Klima-Modellberg' : 'To the climate mountain'} →</button>
  ${sourcesBlock(['bunn', 'gruter', 'ovalle', 'moat', 'climgov', 'wcr2015', 'aez', 'kath'])}`;
}
function calendar(c) {
  const m = MONTHS[S.lang];
  return `<div class="cal" role="img" aria-label="${ui().harvest}">${c.harvest.map((v, i) => `<span class="m l${v}"><i></i>${m[i]}</span>`).join('')}</div>`;
}
function procChips(c) {
  return c.proc.map(([p, lv]) => `<button type="button" class="pchip" data-proc="${p}" style="--pc:${PROCESSES[p].color}"><i></i>${esc(l(PROCESSES[p].name))}<em>${ui().lvl[lv]}</em></button>`).join('');
}
function countryPanel(c) {
  const u = ui(), de = S.lang === 'de';
  const rank = ranked.indexOf(c) + 1;
  const chg = c.p25 && c.p26 ? (c.p26 / c.p25 - 1) * 100 : null;
  const tot = (c.ara || 0) + (c.rob || 0);
  const cl = CLIM_COUNTRY[c.id];
  const kpi = c.p26 ? `<p class="kpiline"><b>${nf(c.p26 / 1000)}</b> ${u.mioBags} 2026/27 · ${nf(shareOf(c))} %${rank ? ` · ${u.rank} ${rank}` : ''}${chg !== null ? ` · <span class="${chg >= 0 ? 'up' : 'down'}">${chg >= 0 ? '+' : ''}${nf(chg)} %</span> ${u.change}` : ''}${cite(['usda'])}</p>`
    : `<p class="kpiline">${c.exp ? esc(l(c.exp)) : (de ? 'Kleinproduzent, bei USDA unter «übrige Länder»' : 'Small producer, in USDA “other”')}${cite(c.src ? c.src.slice(0, 1) : [])}</p>`;
  return `<button class="back" type="button" data-act="back">← ${u.back}</button>
  <header class="ph"><h2>${esc(l(c.name))}</h2>${kpi}</header>
  ${tot ? `<div class="split"><i class="a" style="flex:${c.ara || 0.0001}"></i><i class="r" style="flex:${c.rob || 0.0001}"></i></div><p class="splitlab">${c.ara ? `<span><i class="a"></i>${u.arabica} ${nf(c.ara / 1000)}</span>` : ''}${c.rob ? `<span><i class="r"></i>${u.robusta} ${nf(c.rob / 1000)}</span>` : ''}</p>` : ''}
  <h3>${u.harvest}</h3>${calendar(c)}
  <dl class="facts"><dt>${u.altitude}</dt><dd>${esc(l(c.alt))}</dd><dt>${u.regions}</dt><dd>${esc(c.regions)}</dd><dt>${u.varieties}</dt><dd>${esc(l(c.vars))}</dd><dt>${u.bag}</dt><dd>${esc(l(c.bag))}</dd></dl>
  <h3>${u.processing}</h3><div class="pchips">${procChips(c)}</div>
  <h3>${u.cup}</h3><p>${esc(l(c.cup))}</p>
  <h3>${u.people}</h3><p>${esc(l(c.people))}</p>
  <h3>${u.special}</h3><p>${esc(l(c.special))}${cite(c.src || [])}</p>
  <h3>${u.layerClim}</h3>${cl ? `<p class="ccat" style="--cc:${CLIM_CATS[cl.cat].c}"><i></i>${esc(l(CLIM_CATS[cl.cat].n))}</p><p>${esc(l(cl.n))}${cite(cl.src)}</p>` : `<p class="small">${de ? 'Keine länderspezifische Projektion gefunden. Global sehen die Studien die grössten Verluste in tiefen, heissen Lagen.' : 'No country-specific projection found. Globally, the studies see the largest losses in low, hot zones.'}${cite(['bunn', 'gruter'])}</p>`}
  <button class="primary" type="button" data-act="journey" data-proc="${c.route}">${u.seeJourney} →</button>`;
}

const homeDist = () => (map && map.camera.aspect >= 0.9 && map.camera.aspect < 1.2 ? 4.6 : 3.7);
function selectCountry(id, fly) {
  S.mapSel = id;
  if (map) { map.select(id); if (id && fly) { const c = byId.get(id); map.flyTo(c.ll[0], c.ll[1], c.ref ? 1.9 : 2.1); } }
  renderPanel();
  $('#panel').scrollTop = 0;
}

// ---------- journey ----------
function routeSteps() { return PROCESSES[S.proc].steps.map((id) => ({ id, ...STEPS[id] })); }
function applyJourney(fly) {
  if (!dio) return;
  const steps = routeSteps();
  S.step = Math.min(S.step, steps.length - 1);
  const c = S.country ? byId.get(S.country) : null;
  dio.setRoute(steps, S.step, c ? c.k : null);
  if (fly) dio.setStep(steps[S.step], S.proc);
  const kg = c ? ((L(c.bag, 'en').match(/(\d+)\s*kg/) || [0, '60'])[1]) : '60';
  if (c) dio.setSackLabel(L(c.name, 'en').replace(/\s*\(.*\)/, '').toUpperCase(), `GREEN COFFEE · ${kg} KG`);
  else dio.setSackLabel('COFFEE', 'GREEN COFFEE · 60 KG');
  if (bean) bean.setState(steps[S.step].bean);
}
function goStep(i) {
  const steps = routeSteps();
  S.step = Math.max(0, Math.min(steps.length - 1, i));
  if (dio) dio.setStep(steps[S.step], S.proc);
  if (bean) bean.setState(steps[S.step].bean);
  renderPanel();
  layoutLabels();
}
function journeyPanel() {
  const u = ui();
  const steps = routeSteps();
  const st = steps[S.step];
  const c = S.country ? byId.get(S.country) : null;
  const typical = c ? c.proc.map((p) => p[0]) : null;
  const opts = `<option value="">${u.generic}</option><optgroup label="${u.mapHead.replace(/^\d+\s/, '')}">` + ranked.map((x) => `<option value="${x.id}"${S.country === x.id ? ' selected' : ''}>${esc(l(x.name))}</option>`).join('') + `</optgroup><optgroup label="${u.specHead}">` + REFS.slice().sort((a, b) => l(a.name).localeCompare(l(b.name))).map((x) => `<option value="${x.id}"${S.country === x.id ? ' selected' : ''}>${esc(l(x.name))}</option>`).join('') + '</optgroup>';
  const chips = PROC_ORDER.map((p) => `<button type="button" class="proc${S.proc === p ? ' on' : ''}${typical && !typical.includes(p) ? ' dim' : ''}" data-proc="${p}" style="--pc:${PROCESSES[p].color}" aria-pressed="${S.proc === p}"><i></i>${esc(l(PROCESSES[p].name))}</button>`).join('');
  const stepper = steps.map((s, i) => `<button type="button" class="sdot${i === S.step ? ' on' : ''}${i < S.step ? ' done' : ''}" data-step="${i}" title="${esc(l(s.title))}"><i></i><span>${esc(l(s.short || s.title))}</span></button>`).join('');
  const note = c && c.notes && c.notes[st.id] ? `<div class="note"><b>${u.inCountry} ${esc(l(c.name))}:</b> ${esc(l(c.notes[st.id]))}</div>` : '';
  const notTyp = c && !typical.includes(S.proc) ? `<p class="warn">${u.notTypical}</p>` : '';
  const lv = S.level;
  let body = '';
  if (lv === 0) body = `<p>${esc(l(st.prax))}</p><h4>${u.who}</h4><div class="who">${st.who.map((w) => `<span>${esc(l(w))}</span>`).join('')}</div>`;
  else if (lv === 1) body = `<table class="params"><tbody>${st.params.map(([k, v]) => `<tr><th>${esc(l(k))}</th><td>${esc(l(v))}</td></tr>`).join('')}<tr><th>${u.beanState}</th><td>${esc(l(BEAN_STATES[st.bean]))}</td></tr></tbody></table>`;
  else body = `<p class="chem">${esc(l(st.chem))}</p>`;
  const chartKind = st.chart;
  const chart = chartKind && lv !== 0 ? `<figure class="fig"><figcaption>${chartKind === 'ferm' ? u.chartFerm : chartKind === 'dry' ? u.chartDry : u.roastSim}</figcaption><div class="chartbox"><svg class="chart" aria-hidden="true"></svg></div><div class="legend"></div><p class="small">${u.sample}</p></figure>` : '';
  return `<div class="jctl"><label for="selCountry">${u.origin}</label><select id="selCountry">${opts}</select></div>
  <div class="procs" role="group" aria-label="${u.process}">${chips}</div>
  <p class="sum">${esc(l(PROCESSES[S.proc].sum))}</p>
  ${notTyp}
  <div class="stepper" role="tablist" aria-label="${u.step}">${stepper}</div>
  <article class="step">
    <p class="stepno">${u.step} ${S.step + 1} / ${steps.length} · ${esc(l(STATIONS[st.st]))}</p>
    <h2>${esc(l(st.title))}</h2>
    <p class="meta"><b>${u.dur}:</b> ${esc(l(st.dur))}</p>
    <div class="levels" role="tablist" title="${u.levelHint}">${u.levels.map((n, i) => `<button type="button" role="tab" aria-selected="${i === lv}" data-level="${i}"><small>${i + 1}</small>${n}</button>`).join('')}</div>
    <div class="lvl">${body}</div>
    ${chart}
    ${note}
    <div class="cup"><h4>${u.cupImpact}</h4><p>${esc(l(st.cup))}</p></div>
    <div class="risk"><h4>${u.risk}</h4><p>${esc(l(st.risk))}</p></div>
    <div class="snav"><button type="button" data-act="prev" ${S.step === 0 ? 'disabled' : ''}>← ${u.prev}</button><button type="button" class="primary" data-act="next" ${S.step === steps.length - 1 ? 'disabled' : ''}>${u.next} →</button></div>
  </article>
  ${sourcesBlock(['bytof07', 'bytof05', 'sugars', 'cirad', 'ferm', 'thai', 'aem', 'vitae', 'cenicafe', 'cenicafe2', 'fnc', 'ncsu', 'ucd', 'gb', 'fs', 'cm21', 'cm22', 'siaf', 'aims', 'ra', 'ico', 'kenya', 'honey', 'masha', ...(c && c.src ? c.src : [])])}`;
}

// ---------- varieties ----------
const pips = (n, max) => `<span class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
function ancestors(id) {
  const par = new Map();
  for (const [a, b] of PEDIGREE.edges) { if (!par.has(b)) par.set(b, []); par.get(b).push(a); }
  const out = new Set(), q = [id];
  while (q.length) { const x = q.shift(); for (const p of par.get(x) || []) if (!out.has(p)) { out.add(p); q.push(p); } }
  return out;
}
function nodeLabel(n) { if (n.label) return l(n.label); const v = VBY.get(n.id); return v ? shortName(v) : n.id; }
function pedigreeSVG(sel) {
  const W = 620, rowH = 50, H = 7 * rowH + 6;
  const by = new Map(PEDIGREE.nodes.map((n) => [n.id, n]));
  const pos = (id) => { const n = by.get(id); return [52 + n.x * (W - 104), 20 + n.r * rowH]; };
  const anc = ancestors(sel);
  const onPath = new Set([...anc, sel]);
  let s = '';
  for (const [a, b, dash] of PEDIGREE.edges) {
    const [x1, y1] = pos(a), [x2, y2] = pos(b);
    const on = onPath.has(a) && onPath.has(b) && (b === sel || anc.has(b));
    s += `<path class="${on ? 'on' : ''}${dash ? ' dash' : ''}" d="M${x1},${y1 + 11} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2 - 11}"/>`;
  }
  for (const n of PEDIGREE.nodes) {
    const [x, y] = pos(n.id); const lab = nodeLabel(n); const w = lab.length * 6.2 + 14;
    const v = VBY.get(n.id); const col = v ? VGROUPS[v.g].c : 'var(--mute)';
    const on = n.id === sel;
    s += `<g class="n${on ? ' on' : ''}${anc.has(n.id) ? ' anc' : ''}"${v ? ` data-vid="${n.id}" style="cursor:pointer"` : ''}><rect x="${x - w / 2}" y="${y - 11}" width="${w}" height="22" rx="6" style="stroke:${col}${on ? `;fill:${col}` : ''}"/><text x="${x}" y="${y + 4}" text-anchor="middle"${on ? ' style="fill:#fff;font-weight:700"' : ''}>${esc(lab)}</text></g>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${S.lang === 'de' ? 'Stammbaum der Varietäten' : 'Variety pedigree'}">${s}</svg>`;
}
function varPanel() {
  const de = S.lang === 'de';
  const a = VBY.get(S.varA), b = S.varB ? VBY.get(S.varB) : null;
  const chips = Object.keys(VGROUPS).map((g) => VARIETIES.filter((v) => v.g === g).map((v) => `<button type="button" class="vchip" data-var="${v.id}" aria-pressed="${v.id === S.varA}" style="--gc:${VGROUPS[g].c}"><i></i>${esc(shortName(v))}</button>`).join('')).join('');
  const groupsLeg = Object.values(VGROUPS).map((g) => `<span style="--gc:${g.c}"><i></i>${esc(l(g.n))}</span>`).join('');
  const opts = `<option value="">${de ? '– kein Vergleich –' : '– no comparison –'}</option>` + VARIETIES.filter((v) => v.id !== S.varA).map((v) => `<option value="${v.id}"${v.id === S.varB ? ' selected' : ''}>${esc(shortName(v))}</option>`).join('');
  const na = `<span class="dim">${de ? 'k. A.' : 'n/a'}</span>`;
  const cell = (v, f) => { const x = f(v); return x == null || x === '' ? na : x; };
  const rows = [
    [de ? 'Gruppe' : 'Group', (v) => esc(l(VGROUPS[v.g].n))],
    [de ? 'Wuchs' : 'Habit', (v) => esc(l(SCALE.stature[v.stature]))],
    [de ? 'Höhe (gepflegt)' : 'Height (managed)', (v) => `≈ ${nf(v.h)} m`],
    [de ? 'Triebspitzen' : 'Shoot tips', (v) => (v.tip ? esc(l(SCALE.tip[v.tip])) : null)],
    [de ? 'Bohnengrösse' : 'Bean size', (v) => (v.bean ? esc(l(SCALE.bean[v.bean])) : null)],
    [de ? 'Ertrag' : 'Yield', (v) => (v.yld ? pips(v.yld, 4) + esc(l(SCALE.yld[v.yld])) : null)],
    [de ? 'Blattrost' : 'Leaf rust', (v) => (v.rust ? pips(v.rust, 4) + esc(l(SCALE.rust[v.rust])) : null)],
    [de ? 'Qualität (Höhe)' : 'Quality (altitude)', (v) => (v.q ? pips(v.q, 3) + esc(l(SCALE.q[v.q])) : null)],
    [de ? 'Herkunft' : 'Origin', (v) => esc(l(v.origin))],
    [de ? 'Jahr' : 'Year', (v) => (v.year ? esc(l(v.year)) : null)],
    [de ? 'Typisch in' : 'Typical in', (v) => esc(v.where)],
  ];
  const head = (v) => `<th style="color:${VGROUPS[v.g].c}">${esc(shortName(v))}</th>`;
  const table = `<div class="scroll"><table class="traits"><thead><tr><th></th>${head(a)}${b ? head(b) : ''}</tr></thead><tbody>${rows.map(([k, f]) => `<tr><th>${k}</th><td>${cell(a, f)}</td>${b ? `<td>${cell(b, f)}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
  const anc = [...ancestors(a.id)].map((id) => PEDIGREE.nodes.find((n) => n.id === id)).filter(Boolean).sort((x, y) => x.r - y.r || x.x - y.x);
  const lineage = anc.length ? `<div class="lineage">${anc.map((n) => `<span>${esc(nodeLabel(n))}</span>`).join('<b>›</b>')}<b>›</b><span style="border-color:${VGROUPS[a.g].c};font-weight:700">${esc(shortName(a))}</span></div>` : '';
  return `<header class="ph"><h2>${ui().tabVar}</h2><p class="lead">${de ? 'Arabica ist genetisch eng: Fast alles ausserhalb Äthiopiens stammt aus wenigen Samen, die über Jemen in die Welt gingen. Wähle eine Varietät – links steht sie im 3D-Feld, rechts der Vergleich, daneben ein Mensch von 1,70 m.' : 'Arabica is genetically narrow: almost everything outside Ethiopia descends from a few seeds that left via Yemen. Pick a variety – it stands on the left in the 3D field, the comparison on the right, next to a 1.70 m person.'}${cite(['wcrgroups', 'genome'])}</p></header>
  <div class="vgroups">${groupsLeg}</div>
  <div class="vlist" role="group">${chips}</div>
  <div class="vcmp"><label for="selVarB">${de ? 'Vergleich' : 'Compare with'}</label><select id="selVarB">${opts}</select></div>
  <h3 style="color:${VGROUPS[a.g].c}">${esc(l(a.name))}</h3>
  <p>${esc(l(a.note))}${a.cup ? ` <i>${de ? 'Tasse' : 'Cup'}: ${esc(l(a.cup))}</i>` : ''}${cite(a.src)}</p>
  ${lineage}
  ${table}
  <p class="small">${de ? 'Merkmale laut World-Coffee-Research-Katalog (Castillo: Cenicafé; Arten: Fachliteratur). Höhen schematisch für gepflegte, regelmässig geschnittene Pflanzen; die 3D-Pflanzen sind aus diesen Merkmalen erzeugt, keine Scans.' : 'Traits per the World Coffee Research catalogue (Castillo: Cenicafé; species: literature). Heights schematic for managed, regularly pruned plants; the 3D plants are generated from these traits, not scans.'}${cite(['wcr', 'castillo'])}</p>
  <h3>${de ? 'Stammbaum (vereinfacht)' : 'Pedigree (simplified)'}</h3>
  <figure class="fig"><div class="ped">${pedigreeSVG(a.id)}</div><p class="small">${de ? 'Rot: Abstammung der gewählten Varietät. Gestrichelt: indirekt/vereinfacht. Timor-Hybrid: spontane Kreuzung von Arabica und Robusta – Quelle der Rostresistenz.' : 'Red: ancestry of the selected variety. Dashed: indirect/simplified. Timor Hybrid: spontaneous Arabica × Robusta cross – source of rust resistance.'}${cite(['hdt', 'genome'])}</p></figure>
  ${sourcesBlock(VARIETIES.flatMap((v) => v.src).concat(['wcr', 'wcrgroups', 'scaplants', 'dcnvar']))}`;
}

// ---------- climate ----------
function climDyn() {
  const de = S.lang === 'de';
  const dT = S.dT;
  const alt = (T, d) => (CLIM_MODEL.T0 + d - T) / CLIM_MODEL.lapse * 1000;
  const r50 = (m) => Math.round(m / 10) * 10;
  const optNow = [alt(21, 0), alt(18, 0)], optNew = [alt(21, dT), alt(18, dT)];
  const a0 = cv ? cv.areaKm2(18, 21, 0) : 0, a1 = cv ? cv.areaKm2(18, 21, dT) : 0;
  const chg = a0 ? (a1 / a0 - 1) * 100 : 0;
  const bands = CLIM_MODEL.bands.map((b) => {
    const lo = b.max >= 99 ? 0 : alt(b.max, dT), hi = b.min <= -99 ? null : alt(b.min, dT);
    return `<div style="--bc:${b.c}"><i></i><span>${esc(l(b.n))}</span><b>${hi == null ? `> ${nfi(r50(lo))} m` : lo <= 0 ? `< ${nfi(r50(hi))} m` : `${nfi(r50(lo))}–${nfi(r50(hi))} m`}</b></div>`;
  }).join('');
  return `<div class="climkpi"><div><b>${nfi(r50(optNew[0]))}–${nfi(r50(optNew[1]))} m</b><span>${de ? 'Optimum Arabica' : 'Arabica optimum'}${dT ? ` (${de ? 'heute' : 'today'} ${nfi(r50(optNow[0]))}–${nfi(r50(optNow[1]))} m)` : ''}</span></div><div><b>${dT ? `${chg >= 0 ? '+' : '−'}${nf(Math.abs(chg), 0)} %` : `${nfi(a0)} km²`}</b><span>${de ? 'Fläche im Optimum am Modellberg' : 'Optimum area on the model mountain'}${dT ? ` (${nfi(a0)} → ${nfi(a1)} km²)` : ''}</span></div></div>
  <div class="bandlist">${bands}</div>`;
}
function climPanel() {
  const de = S.lang === 'de';
  const dT = S.dT;
  const ranges = CLIM_RANGES.map((r) => {
    const [lo, hi] = r.r; const pt = lo === hi;
    return `<div class="rng"><div class="rl"><span>${esc(l(r.k))}${cite([r.src])}</span><b>${pt ? `${r.approx ? '≈ ' : ''}−${lo} %` : r.open ? `> −${lo} %` : `−${lo} … −${hi} %`}</b></div><div class="rt"><i class="${pt ? 'pt' : ''}${r.open ? ' open' : ''}" style="left:${lo}%;${pt ? '' : `width:${hi - lo}%`}"></i></div></div>`;
  }).join('');
  const finds = CLIM_FINDINGS.map((f) => `<div><b>${esc(l(f.k))}</b><span>${esc(l(f.v))}${cite([f.src])}</span></div>`).join('');
  return `<header class="ph"><h2>${de ? 'Klimarisiko' : 'Climate risk'}</h2><p class="lead">${de ? 'Arabica braucht im Jahresmittel etwa 18–21 °C. Mit der Erwärmung wandert dieses Band den Berg hinauf – dorthin, wo weniger Fläche ist.' : 'Arabica needs an annual mean of about 18–21 °C. As it warms, this band climbs the mountain – to where there is less land.'}${cite(['climgov'])}</p></header>
  <section class="roastbox"><label class="slider" for="dT"><span>${de ? 'Erwärmung' : 'Warming'}</span><output id="dTout">+${nf(dT)} °C</output></label>
  <input id="dT" type="range" min="0" max="4" step="0.1" value="${dT}">
  <div id="climDyn">${climDyn()}</div>
  <p class="small">${de ? `Modell: ${nf(CLIM_MODEL.T0)} °C auf Meereshöhe, −${nf(CLIM_MODEL.lapse)} °C pro 1000 m (Standardatmosphäre), also rund +154 m pro +1 °C. Nur Temperatur – Niederschlag, Boden, Hangrichtung und Schatten fehlen. Höhen 1,6-fach überhöht.` : `Model: ${nf(CLIM_MODEL.T0)} °C at sea level, −${nf(CLIM_MODEL.lapse)} °C per 1000 m (standard atmosphere), i.e. about +154 m per +1 °C. Temperature only – rainfall, soil, aspect and shade are missing. Heights exaggerated 1.6×.`}</p>
  <p class="hint">${de ? 'Zum Vergleich: +300 m – der Median, den World Coffee Research bis 2050 erwartet – entsprechen in diesem Modell knapp +2 °C.' : 'For comparison: +300 m – the median World Coffee Research expects by 2050 – corresponds to just under +2 °C in this model.'}${cite(['wcr2015'])}</p></section>
  <h3>${de ? 'Projizierter Verlust geeigneter Fläche' : 'Projected loss of suitable area'}</h3>
  <div class="ranges">${ranges}</div><div class="rscale"><span>0 %</span><span>25 %</span><span>50 %</span><span>75 %</span><span>100 %</span></div>
  <p class="small">${de ? 'Unterschiedliche Modelle, Szenarien und Eignungsklassen – die Balken sind nicht direkt vergleichbar.' : 'Different models, scenarios and suitability classes – bars are not directly comparable.'}</p>
  <h3>${de ? 'Was die Studien sagen' : 'What the studies say'}</h3><div class="finds">${finds}</div>
  <h3>${de ? 'Anpassung' : 'Adaptation'}</h3>
  <p>${de ? 'Schatten- und Agroforstsysteme, robustere Varietäten (z. B. F1-Hybriden), Umzug in höhere Lagen – und neue Arten: Coffea stenophylla wächst bei rund 6 °C wärmerem Jahresmittel als Arabica und schmeckt ähnlich.' : 'Shade and agroforestry, more robust varieties (e.g. F1 hybrids), moving upslope – and new species: Coffea stenophylla grows at an annual mean about 6 °C warmer than Arabica and tastes similar.'}${cite(['steno', 'wcr32'])}</p>
  <div class="snav"><button type="button" data-goto="map-clim">${de ? 'Risiko auf der Karte' : 'Risk on the map'}</button><button type="button" class="primary" data-goto="var-steno">${de ? 'Stenophylla ansehen' : 'See stenophylla'} →</button></div>
  ${sourcesBlock(['climgov', 'kath', 'wcr2015', 'wcr32', 'aez', 'bunn', 'gruter', 'ovalle', 'moat', 'wild', 'steno'])}`;
}

// ---------- chemistry ----------
let roastDraw = null, profDraw = null;
function remsHTML(T) { return ['sucrose', 'cga', 'trig'].map((k) => `<div class="rem"><span>${esc(l(ROAST.names[k]))}</span><b>${nf(remainingAt(k, T) * 100, 0)} %</b></div>`).join(''); }
function chemPanel() {
  const u = ui(), de = S.lang === 'de';
  const seg = `<div class="seg" role="tablist"><button type="button" role="tab" data-cv="cherry" aria-selected="${S.chemView === 'cherry'}">${u.viewCherry}</button><button type="button" role="tab" data-cv="roast" aria-selected="${S.chemView === 'roast'}">${u.viewRoast}</button><button type="button" role="tab" data-cv="profile" aria-selected="${S.chemView === 'profile'}">${de ? 'Röstprofil' : 'Roast profile'}</button></div>`;
  const head = `<header class="ph"><h2>${u.chemHead}</h2><p class="lead">${u.chemLead}</p></header>${seg}`;
  if (S.chemView === 'profile') return head + profilePanel();
  const stage = ROAST.stages.find((s) => S.roastT >= s.from && S.roastT <= s.to) || ROAST.stages[0];
  const comp = COMPO.map((r) => {
    const sc = (v) => v / 10 * 100;
    return `<div class="dumb"><span class="dn">${esc(l(r.k))}</span><span class="dt"><i class="ra" style="left:${sc(r.a[0])}%;width:${Math.max(0.6, sc(r.a[1] - r.a[0]))}%"></i><i class="rr" style="left:${sc(r.r[0])}%;width:${Math.max(0.6, sc(r.r[1] - r.r[0]))}%"></i></span><span class="dv">${r.a[0] === r.a[1] ? nf(r.a[0]) : `${nf(r.a[0], 0)}–${nf(r.a[1], 0)}`} / ${r.r[0] === r.r[1] ? nf(r.r[0]) : `${nf(r.r[0], 0)}–${nf(r.r[1], 0)}`} %</span></div>`;
  }).join('');
  const pc = PROC_CHEM;
  const ptable = `<div class="scroll"><table class="ptab"><thead><tr><th></th>${pc.cols.map((p) => `<th style="--pc:${PROCESSES[p].color}"><i></i>${esc(l(PROCESSES[p].name).split(' (')[0].split(' / ')[0])}</th>`).join('')}</tr></thead><tbody>${pc.rows.map((r) => `<tr><th>${esc(l(r.k))}${r.src ? `<small>${esc(l(r.src))}</small>` : ''}</th>${r.v.map((v) => `<td>${esc(l(v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="small">${esc(l(pc.note))}${cite(['sugars', 'bytof05', 'bytof07', 'cirad', 'siaf', 'tum'])}</p>`;
  const odor = `<table class="odor"><thead><tr><th>${de ? 'Schlüsselaroma' : 'Key odorant'}</th><th>${de ? 'Eindruck' : 'Note'}</th><th class="r">OAV</th></tr></thead><tbody>${ODORANTS.map((o) => `<tr><td>${esc(l(o.n))}</td><td>${esc(l(o.d))}</td><td class="r">${nfi(o.oav)}</td></tr>`).join('')}</tbody></table><p class="small">${de ? 'Geruchsaktivitätswerte (OAV) im Kaffeegetränk nach Grosch – Konzentration geteilt durch Geruchsschwelle.' : 'Odour activity values (OAV) in brewed coffee after Grosch – concentration divided by odour threshold.'}${cite(['grosch'])}</p>`;
  const defects = `<div class="defects">${DEFECTS.map((d) => `<div class="def"><h4>${esc(l(d.n))}</h4><p class="dc">${esc(l(d.c))}</p><p>${esc(l(d.d))}</p><p class="small">${esc(l(d.w))}</p></div>`).join('')}</div><p class="small">${cite(['rio', 'wcrptd', 'ptd', 'musty', 'storage'])}</p>`;
  const anat = `<ol class="anatlist">${LAYERS.map((x) => `<li><i style="background:${x.c}"></i>${esc(l(x.name))}</li>`).join('')}</ol>`;
  return `${head}
  ${S.chemView === 'roast' ? `<section class="roastbox"><h3>${u.roastSim}</h3>
    <label class="slider" for="roastT"><span>${u.roastTemp}</span><output id="roastOut">${Math.round(S.roastT)} °C</output></label>
    <input id="roastT" type="range" min="20" max="240" step="1" value="${S.roastT}">
    <div class="stagebox"><b id="stName">${esc(l(stage.n))}</b><p id="stDesc">${esc(l(stage.d))}</p></div>
    <div class="rems" id="rems">${remsHTML(S.roastT)}</div>
    <figure class="fig"><figcaption>${u.remaining} (${u.schematic})</figcaption><div class="chartbox tall"><svg class="chart" id="roastSvg" aria-hidden="true"></svg></div><div class="legend"></div><p class="small">${de ? 'Ankerpunkte: Saccharose 96–98 % abgebaut, Chlorogensäuren −65 % (Medium) / −85 % (Full City), Trigonellin-Abbau ab ~230–240 °C. Temperaturen sind gerätabhängig.' : 'Anchors: sucrose 96–98 % degraded, chlorogenic acids −65 % (medium) / −85 % (full city), trigonelline breakdown from ~230–240 °C. Temperatures depend on the roaster.'}${cite(['roastpot', 'acids'])}</p></figure>
    <p class="chem">${esc(l(STEPS.roast.chem))}</p>
    <p class="hint">${de ? 'Eigene Röstkurven? Im Reiter «Röstprofil» CSV-Dateien laden.' : 'Your own roast curves? Load CSV files under “Roast profile”.'}</p>
    ${odor}</section>` : `<section><h3>${u.anatomy}</h3>${anat}<p>${de ? 'Unter Haut und Fruchtfleisch liegt das pektinreiche Mucilage, dann das Pergament (Endokarp) und die Silberhaut. Meist liegen zwei Samen mit den flachen Seiten aneinander; ein einzelner, runder Samen heisst Perlbohne (Peaberry).' : 'Beneath skin and pulp lies the pectin-rich mucilage, then the parchment (endocarp) and the silverskin. Usually two seeds face each other with their flat sides; a single round seed is a peaberry.'}</p></section>`}
  <section><h3>${u.compo}</h3><div class="dlegend"><span><i class="ra"></i>${u.arabica}</span><span><i class="rr"></i>${u.robusta}</span></div><div class="dumbs"><div class="dumb head"><span></span><span class="dt scale"><em>0 %</em><em>5 %</em><em>10 %</em></span><span class="dv">${u.arabica} / ${u.robusta}</span></div>${comp}</div>
  <p class="small">${de ? '% der Trockenmasse. Chlorogensäuren: Arabica etwa 4–8 %, Robusta deutlich höher – mehr Bitterkeit und Adstringenz.' : '% of dry matter. Chlorogenic acids: Arabica about 4–8 %, Robusta markedly higher – more bitterness and astringency.'}${cite(['bh', 'iarc'])}</p></section>
  <section><h3>${u.procChem}</h3>${ptable}</section>
  <section><h3>${u.defects}</h3>${defects}</section>
  ${sourcesBlock(SOURCES.filter((s) => s.g === 'chem' || s.g === 'proc').map((s) => s.id))}`;
}

// ---------- roast profile (CSV) ----------
function phaseAt(p, t) {
  const e = p.ev; const de = S.lang === 'de';
  if (Number.isFinite(e.FCs) && t >= e.FCs) return de ? 'Entwicklung' : 'Development';
  if (Number.isFinite(e.DRYe) && t >= e.DRYe) return 'Maillard';
  return de ? 'Trocknung' : 'Drying';
}
function scrubInfo() {
  const p = S.profiles[0]; if (!p || !Number.isFinite(S.scrubT)) return '';
  return `${mmss(S.scrubT)} · BT ${nf(p.btAt(S.scrubT), 0)} °C · ${phaseAt(p, S.scrubT)}`;
}
function profilePanel() {
  const de = S.lang === 'de';
  const P = S.profiles;
  const fmtT = (s) => (Number.isFinite(s) ? mmss(s) : '–');
  const fmtC = (v) => (Number.isFinite(v) ? `${nf(v, 0)} °C` : '–');
  const pct = (v) => (Number.isFinite(v) ? `${nf(v, 0)} %` : '–');
  const list = P.map((p, i) => `<div class="prof" style="--pcol:${p.color}"><i></i><span class="pn">${esc(p.name)}<small>${p.artisan ? 'Artisan' : 'CSV'} · ${p.unit === 'F' ? '°F → °C' : '°C'} · ${fmtT(p.ev.DROP)}${p.synthetic ? (de ? ' · synthetisch' : ' · synthetic') : ''}</small></span><button type="button" data-rm="${i}" aria-label="${de ? 'Entfernen' : 'Remove'}">×</button></div>`).join('');
  const last = P.length ? P[P.length - 1] : null;
  const mapping = last && !last.artisan ? `<div class="map3">${[['time', de ? 'Zeit' : 'Time'], ['bt', 'BT'], ['et', 'ET']].map(([k, n]) => `<label>${n}<select data-map="${k}">${k === 'et' ? `<option value="-1">–</option>` : ''}${last.tbl.headers.map((h, i) => `<option value="${i}"${last.map[k] === i ? ' selected' : ''}>${esc(h)}</option>`).join('')}</select></label>`).join('')}</div>` : '';
  const st = (f) => P.map((p) => `<td>${f(p.stats, p)}</td>`).join('');
  const stats = P.length ? `<div class="scroll"><table class="pstats"><thead><tr><th></th>${P.map((p) => `<th style="--pcol:${p.color}"><i></i>${esc(p.name.replace(/\.(csv|txt|tsv)$/i, '').slice(0, 14))}</th>`).join('')}</tr></thead><tbody>
    <tr><td>${de ? 'Gesamtzeit' : 'Total time'}</td>${st((s) => fmtT(s.total))}</tr>
    <tr><td>${de ? 'Wendepunkt (TP)' : 'Turning point (TP)'}</td>${st((s) => `${fmtT(s.tpT)} · ${fmtC(s.tpBT)}`)}</tr>
    <tr><td>${de ? 'Trocknungsende' : 'Dry end'}</td>${st((s, p) => `${fmtT(s.dryT)}${p.dryAuto ? '*' : ''} · ${pct(s.dryPct)}`)}</tr>
    <tr><td>${de ? 'Erster Crack' : 'First crack'}</td>${st((s) => `${fmtT(s.fcT)} · ${fmtC(s.fcBT)}`)}</tr>
    <tr><td>${de ? 'Maillard-Phase' : 'Maillard phase'}</td>${st((s) => `${fmtT(s.maillT)} · ${pct(s.maillPct)}`)}</tr>
    <tr><td>${de ? 'Entwicklung (DTR)' : 'Development (DTR)'}</td>${st((s) => `${fmtT(s.devT)} · ${pct(s.dtr)}`)}</tr>
    <tr><td>ΔBT FC → Drop</td>${st((s) => (Number.isFinite(s.devDelta) ? `${nf(s.devDelta, 1)} °C` : '–'))}</tr>
    <tr><td>${de ? 'Ø RoR Entwicklung' : 'Mean RoR development'}</td>${st((s) => (Number.isFinite(s.devRoR) ? `${nf(s.devRoR, 1)} °C/min` : '–'))}</tr>
    <tr><td>${de ? 'Drop-Temperatur' : 'Drop temperature'}</td>${st((s) => fmtC(s.dropBT))}</tr>
  </tbody></table></div><p class="small">${de ? `* automatisch: erster Messpunkt mit BT ≥ ${S.dryEnd} °C nach dem Wendepunkt. Ohne FCs-Ereignis bleiben Maillard und Entwicklung leer – sie werden nicht geschätzt.` : `* automatic: first sample with BT ≥ ${S.dryEnd} °C after the turning point. Without an FCs event, Maillard and development stay empty – they are not estimated.`}</p>` : '';
  const p0 = P[0];
  return `<section>
  <p class="small" style="margin-top:10px">${de ? 'CSV-Export aus Artisan (Datei › Export › CSV) oder eine eigene Tabelle mit Zeit, Bohnentemperatur (BT) und optional Umgebungs-/Ablufttemperatur (ET). Bis zu drei Profile überlagern. Die Dateien werden nur in diesem Browser gelesen – nichts wird hochgeladen.' : 'CSV export from Artisan (File › Export › CSV) or your own table with time, bean temperature (BT) and optionally environment/exhaust temperature (ET). Overlay up to three profiles. Files are read in this browser only – nothing is uploaded.'}${cite(['artisan'])}</p>
  <div class="drop" id="drop"><span>${de ? 'CSV hierher ziehen' : 'Drop CSV here'}</span><div class="row"><label class="btn2" for="csvFile">${de ? 'Datei wählen' : 'Choose file'}</label><input type="file" id="csvFile" accept=".csv,.txt,.tsv,text/csv,text/plain" multiple hidden><button type="button" class="btn2" data-act="sample">${de ? 'Beispiel (synthetisch)' : 'Example (synthetic)'}</button><button type="button" class="btn2" data-act="paste" aria-expanded="${S.paste}">${de ? 'Text einfügen' : 'Paste text'}</button></div></div>
  ${S.paste ? `<textarea id="csvText" spellcheck="false" placeholder="Time,BT,ET&#10;0:00,200,210&#10;0:30,120,190&#10;…"></textarea><button type="button" class="btn2" data-act="parsePaste" style="margin-top:6px">${de ? 'Übernehmen' : 'Apply'}</button>` : ''}
  ${S.err ? `<p class="err" role="alert">${esc(S.err)}</p>` : ''}
  ${P.length ? `<div class="profs">${list}</div>${mapping}
  <div class="map3"><label>${de ? 'Einheit' : 'Unit'}<select id="unitSel"><option value="auto"${S.unit === 'auto' ? ' selected' : ''}>auto</option><option value="C"${S.unit === 'C' ? ' selected' : ''}>°C</option><option value="F"${S.unit === 'F' ? ' selected' : ''}>°F</option></select></label><label>${de ? 'Trocknungsende' : 'Dry end'}<select id="dryEndSel">${[140, 145, 150, 155, 160].map((v) => `<option value="${v}"${S.dryEnd === v ? ' selected' : ''}>${v} °C</option>`).join('')}</select></label></div>
  <figure class="fig"><figcaption>${de ? 'Bohnentemperatur (BT, durchgezogen), ET (gestrichelt), RoR (gepunktet, rechte Achse)' : 'Bean temperature (BT, solid), ET (dashed), RoR (dotted, right axis)'}</figcaption><div class="chartbox prof"><svg class="chart" id="profSvg" aria-hidden="true"></svg></div></figure>
  <div class="scrub"><input id="scrub" type="range" min="0" max="${Math.round(p0.ev.DROP)}" step="1" value="${Math.round(S.scrubT)}" aria-label="${de ? 'Zeitpunkt im Profil' : 'Time in profile'}"><output id="scrubOut">${scrubInfo()}</output></div>
  <div class="rems" id="rems">${remsHTML(p0.btAt(S.scrubT))}</div>
  <p class="small">${de ? 'Die Bohne im 3D-Bild färbt sich nach der BT am Regler. Die Prozentwerte sind die schematischen Restmengen aus dem Röst-Ausblick – Richtwerte, keine Messung deiner Charge.' : 'The bean in the 3D view takes the colour of the BT at the slider. The percentages are the schematic remaining amounts from the roasting outlook – guide values, not measurements of your batch.'}</p>
  ${stats}` : `<p class="hint">${de ? 'Noch kein Profil geladen. Das Beispiel ist synthetisch erzeugt und kennzeichnet sich selbst.' : 'No profile loaded yet. The example is synthetic and labelled as such.'}</p>`}
  <h3>${de ? 'Begriffe' : 'Terms'}</h3>
  <dl class="facts"><dt>RoR</dt><dd>${de ? 'Rate of Rise: Anstieg der BT in °C pro Minute, hier als Steigung über 30 s.' : 'Rate of rise: BT increase in °C per minute, here as the slope over 30 s.'}</dd><dt>DTR</dt><dd>${de ? 'Development Time Ratio: Anteil der Zeit nach dem ersten Crack an der Gesamtröstzeit.' : 'Development time ratio: share of total roast time after first crack.'}</dd><dt>${de ? 'Phasen' : 'Phases'}</dt><dd>${de ? 'Trocknung bis Trocknungsende, Maillard bis First Crack, danach Entwicklung.' : 'Drying to dry end, Maillard to first crack, then development.'}</dd></dl>
  </section>${sourcesBlock(['artisan', 'roastpot', 'acids', 'grosch'])}`;
}
function addProfileText(text, name, synthetic = false) {
  const de = S.lang === 'de';
  try {
    if (S.profiles.length >= 3) throw new Error(de ? 'Maximal drei Profile – bitte zuerst eines entfernen.' : 'Three profiles at most – please remove one first.');
    const tbl = readTable(text);
    const mp = guessMap(tbl);
    const p = buildProfile(tbl, mp, { unit: S.unit, dryEnd: S.dryEnd });
    Object.assign(p, { tbl, map: mp, name, artisan: tbl.artisan, synthetic });
    S.profiles.push(p);
    recolor();
    if (!Number.isFinite(S.scrubT) || S.profiles.length === 1) S.scrubT = Number.isFinite(p.ev.FCs) ? p.ev.FCs : p.ev.DROP * 0.8;
    S.err = '';
  } catch (e) {
    S.err = e.message === 'rows' || e.message === 'empty' ? (de ? `«${name}»: keine lesbaren Zeit- und Temperaturspalten gefunden.` : `“${name}”: no readable time and temperature columns found.`) : e.message;
  }
  renderPanel(); chemBean();
}
function recolor() { S.profiles.forEach((p, i) => { p.color = PROFILE_COLORS[i]; }); }
function rebuildProfiles() {
  S.profiles = S.profiles.map((p) => { try { const q = buildProfile(p.tbl, p.map, { unit: S.unit, dryEnd: S.dryEnd }); return Object.assign(q, { tbl: p.tbl, map: p.map, name: p.name, artisan: p.artisan, synthetic: p.synthetic }); } catch (e) { return p; } });
  recolor();
  const p0 = S.profiles[0]; if (p0) S.scrubT = Math.min(S.scrubT, p0.ev.DROP);
  renderPanel(); chemBean();
}
function readFiles(files) { for (const f of [...files].slice(0, 3)) { const r = new FileReader(); r.onload = () => addProfileText(String(r.result), f.name); r.readAsText(f); } }

// ---------- panel ----------
const panel = $('#panel');
let charts = [];
function renderPanel() {
  charts.forEach((c) => c.disconnect && c.disconnect());
  charts = [];
  roastDraw = null; profDraw = null;
  if (S.view === 'sources') { updateStatic(); return; }
  const html = S.view === 'map' ? mapPanel() : S.view === 'journey' ? journeyPanel() : S.view === 'var' ? varPanel() : S.view === 'clim' ? climPanel() : chemPanel();
  panel.innerHTML = html;
  if (S.view === 'journey') {
    const st = routeSteps()[S.step];
    const svg = panel.querySelector('svg.chart');
    if (svg) {
      if (st.chart === 'ferm') charts.push(fermChart(svg, S.lang, ui()));
      else if (st.chart === 'dry') charts.push(dryChart(svg, S.lang, ui(), S.proc, PROCESSES));
      else if (st.chart === 'roast') charts.push(roastChart(svg, S.lang, ui(), () => S.roastT));
    }
    const sd = panel.querySelector('.sdot.on'), sp = panel.querySelector('.stepper'); if (sd && sp) sp.scrollLeft = sd.offsetLeft - sp.clientWidth / 2 + sd.offsetWidth / 2;
  }
  if (S.view === 'chem' && S.chemView === 'roast') { const r = roastChart($('#roastSvg'), S.lang, ui(), () => S.roastT); charts.push(r); roastDraw = r.draw; }
  if (S.view === 'chem' && S.chemView === 'profile' && $('#profSvg')) { const r = profileChart($('#profSvg'), () => ({ profiles: S.profiles, scrubT: S.scrubT, lang: S.lang })); charts.push(r); profDraw = r.draw; }
  $('#insetCap').textContent = S.view === 'journey' ? l(BEAN_STATES[routeSteps()[S.step].bean]) : '';
  updateStatic();
}

panel.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-src]');
  if (a) { e.preventDefault(); gotoSource(a.dataset.src); return; }
  const g = e.target.closest('[data-vid]');
  if (g) { selectVariety(g.dataset.vid); return; }
  const t = e.target.closest('button, [data-cid]');
  if (!t) return;
  if (t.dataset.cid) { if (S.view !== 'map') setView('map'); selectCountry(+t.dataset.cid, true); return; }
  if (t.dataset.layer) { setMapLayer(t.dataset.layer); return; }
  if (t.dataset.goto) {
    if (t.dataset.goto === 'clim') setView('clim');
    else if (t.dataset.goto === 'map-clim') { setMapLayer('clim'); setView('map'); }
    else if (t.dataset.goto === 'var-steno') { S.varA = 'stenophylla'; S.varB = 'typica'; setView('var'); }
    return;
  }
  if (t.dataset.var) { selectVariety(t.dataset.var); return; }
  if (t.dataset.act === 'back') { selectCountry(null); if (map) map.flyTo(-28, 6, homeDist()); return; }
  if (t.dataset.act === 'journey') { S.country = S.mapSel; S.proc = t.dataset.proc; S.step = 0; setView('journey'); return; }
  if (t.classList.contains('pchip') && t.dataset.proc) { S.country = S.mapSel; S.proc = t.dataset.proc; S.step = 0; setView('journey'); return; }
  if (t.classList.contains('proc')) { S.proc = t.dataset.proc; S.step = 0; applyJourney(true); renderPanel(); buildLabels(); return; }
  if (t.dataset.step) { goStep(+t.dataset.step); return; }
  if (t.dataset.level) { S.level = +t.dataset.level; save(); renderPanel(); return; }
  if (t.dataset.act === 'prev') { goStep(S.step - 1); return; }
  if (t.dataset.act === 'next') { goStep(S.step + 1); return; }
  if (t.dataset.cv) { S.chemView = t.dataset.cv; chemBean(); renderPanel(); return; }
  if (t.dataset.act === 'sample') { addProfileText(sampleProfile(), S.lang === 'de' ? 'Beispielprofil (synthetisch)' : 'Example profile (synthetic)', true); return; }
  if (t.dataset.act === 'paste') { S.paste = !S.paste; renderPanel(); if (S.paste) $('#csvText')?.focus(); return; }
  if (t.dataset.act === 'parsePaste') { const v = $('#csvText').value; if (v.trim()) { S.paste = false; addProfileText(v, S.lang === 'de' ? 'Eingefügt' : 'Pasted'); } return; }
  if (t.dataset.rm) { S.profiles.splice(+t.dataset.rm, 1); recolor(); if (!S.profiles.length) S.scrubT = NaN; renderPanel(); chemBean(); }
});
panel.addEventListener('change', (e) => {
  const id = e.target.id;
  if (id === 'selCountry') {
    S.country = e.target.value ? +e.target.value : null;
    if (S.country) { const c = byId.get(S.country); if (!c.proc.some((p) => p[0] === S.proc)) S.proc = c.route; }
    S.step = 0; applyJourney(true); renderPanel(); buildLabels();
  } else if (id === 'selVarB') { S.varB = e.target.value || null; ensureVar(); renderPanel(); buildLabels(); }
  else if (id === 'csvFile') { readFiles(e.target.files); e.target.value = ''; }
  else if (id === 'unitSel') { S.unit = e.target.value; rebuildProfiles(); }
  else if (id === 'dryEndSel') { S.dryEnd = +e.target.value; rebuildProfiles(); }
  else if (e.target.dataset.map) { const p = S.profiles[S.profiles.length - 1]; p.map = { ...p.map, [e.target.dataset.map]: +e.target.value }; rebuildProfiles(); }
});
panel.addEventListener('input', (e) => {
  if (e.target.id === 'roastT') {
    S.roastT = +e.target.value;
    $('#roastOut').textContent = `${Math.round(S.roastT)} °C`;
    const st = ROAST.stages.find((s) => S.roastT >= s.from && S.roastT <= s.to) || ROAST.stages[0];
    $('#stName').textContent = l(st.n); $('#stDesc').textContent = l(st.d);
    $('#rems').innerHTML = remsHTML(S.roastT);
    if (bean) bean.setRoast(S.roastT, true);
    if (roastDraw) roastDraw();
  } else if (e.target.id === 'scrub') {
    S.scrubT = +e.target.value;
    const p = S.profiles[0]; const T = p.btAt(S.scrubT);
    $('#scrubOut').textContent = scrubInfo(); $('#rems').innerHTML = remsHTML(T);
    if (bean) bean.setRoast(T, true);
    if (profDraw) profDraw();
  } else if (e.target.id === 'dT') {
    S.dT = +e.target.value; $('#dTout').textContent = `+${nf(S.dT)} °C`;
    if (cv) cv.setDT(S.dT);
    $('#climDyn').innerHTML = climDyn();
  }
});
panel.addEventListener('dragover', (e) => { const d = e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
panel.addEventListener('dragleave', (e) => { const d = e.target.closest('#drop'); if (d) d.classList.remove('over'); });
panel.addEventListener('drop', (e) => { const d = e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.remove('over'); readFiles(e.dataTransfer.files); } });

function selectVariety(id) {
  if (!VBY.has(id)) return;
  if (id === S.varB) S.varB = S.varA;
  S.varA = id; ensureVar(); if (vv) vv.reset();
  renderPanel(); buildLabels(); panel.scrollTop = 0;
}
function setMapLayer(layer) { S.mapLayer = layer; if (map) map.setLayer(layer); renderPanel(); updateLegend(); }
function gotoSource(id) {
  setView('sources');
  const el = document.getElementById('src-' + id);
  if (el) { el.scrollIntoView({ block: 'center' }); el.style.background = 'color-mix(in srgb, var(--accent) 16%, transparent)'; setTimeout(() => { el.style.background = ''; }, 1800); }
}

// ---------- static texts ----------
function updateStatic() {
  const u = ui();
  document.documentElement.lang = S.lang;
  document.title = u.title;
  $('#t-title').textContent = u.title; $('#t-sub').textContent = u.sub;
  $('#tab-map').textContent = u.tabMap; $('#tab-journey').textContent = u.tabJourney; $('#tab-chem').textContent = u.tabChem;
  $('#tab-var').textContent = u.tabVar; $('#tab-clim').textContent = u.tabClim; $('#tab-src').textContent = u.tabSrc;
  $('#tourLbl').textContent = tour.on ? u.tourStop : u.tour; $('#tourBtn').setAttribute('aria-label', tour.on ? u.tourStop : u.tour);
  $('#langBtn').textContent = u.lang; $('#langBtn').setAttribute('aria-label', S.lang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln');
  $('#themeBtn').setAttribute('aria-label', u.theme); $('#themeBtn').title = u.theme;
  const qt = `${u.quality}: ${S.quality === 'high' ? u.qHigh : u.qStd}`;
  $('#qBtn').title = qt; $('#qBtn').setAttribute('aria-label', qt); $('#qBtn').setAttribute('aria-pressed', String(S.quality === 'high'));
  $('#m-globe').textContent = u.globe; $('#m-flat').textContent = u.flat;
  $('#s-sat').textContent = u.sat; $('#s-thema').textContent = u.thematic;
  $('#s-sat').setAttribute('aria-pressed', String(S.mapStyle === 'sat')); $('#s-thema').setAttribute('aria-pressed', String(S.mapStyle !== 'sat'));
  $('#zin').setAttribute('aria-label', u.zoomIn); $('#zout').setAttribute('aria-label', u.zoomOut); $('#zreset').setAttribute('aria-label', u.reset); $('#zreset').title = u.reset;
  $('#m-globe').setAttribute('aria-pressed', String(!map || map.mode === 'globe')); $('#m-flat').setAttribute('aria-pressed', String(map && map.mode === 'flat'));
  $('#insetTitle').textContent = u.beanState;
  $('#tourPrev').setAttribute('aria-label', u.prev); $('#tourNext').setAttribute('aria-label', u.next); $('#tourClose').setAttribute('aria-label', u.tourStop);
  updateLegend();
}

// ---------- guided tour ----------
const tour = { on: false, i: 0, playing: true, t: 0 };
const TOUR_DUR = 12;
const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
function tourStart() { tour.on = true; tour.playing = true; document.body.classList.add('touring'); $('#tourbar').hidden = false; tourGo(0); updateStatic(); }
function tourStop() { tour.on = false; document.body.classList.remove('touring'); $('#tourbar').hidden = true; updateStatic(); }
function tourText(s) { return l(s).replace(/\{share:(\d+)\}/g, (_, id) => `${nf(shareOf(byId.get(+id)))} %`); }
function tourGo(i) {
  tour.i = Math.max(0, Math.min(TOUR.length - 1, i)); tour.t = 0;
  const sc = TOUR[tour.i], g = sc.go;
  if (g.view === 'map') {
    if (g.layer && g.layer !== S.mapLayer) setMapLayer(g.layer);
    if (S.view !== 'map') setView('map');
    if (g.sel !== undefined) selectCountry(g.sel, true);
    if (g.home && map) { map.flyTo(-28, 6, homeDist()); map.controls.autoRotate = true; }
  } else if (g.view === 'journey') {
    S.country = g.country ?? null; S.proc = g.proc; S.level = g.level ?? S.level;
    const idx = PROCESSES[S.proc].steps.indexOf(g.step); S.step = Math.max(0, idx);
    if (S.view === 'journey') { applyJourney(true); renderPanel(); buildLabels(); } else setView('journey');
  } else if (g.view === 'var') {
    S.varA = g.a; S.varB = g.b; if (S.view === 'var') { ensureVar(); vv && vv.reset(); renderPanel(); buildLabels(); } else setView('var');
  } else if (g.view === 'chem') {
    S.chemView = g.cv; if (g.roastT) S.roastT = g.roastT;
    if (g.cv === 'profile' && !S.profiles.length) addProfileText(sampleProfile(), S.lang === 'de' ? 'Beispielprofil (synthetisch)' : 'Example profile (synthetic)', true);
    if (S.view === 'chem') { chemBean(); renderPanel(); } else setView('chem');
  } else if (g.view === 'clim') {
    S.dT = g.dT ? g.dT[1] : 0;
    if (S.view !== 'clim') setView('clim'); else renderPanel();
    if (cv && g.dT) { cv.setDT(g.dT[0], true); cv.reset(); }
  }
  panel.scrollTop = 0;
  $('#tourKicker').textContent = `${ui().tour} · ${l(sc.k)}`;
  $('#tourCount').textContent = `${tour.i + 1} / ${TOUR.length}`;
  $('#tourTitle').textContent = tourText(sc.h);
  $('#tourText').innerHTML = esc(tourText(sc.p)) + cite(sc.src);
  $('#tourPlay').innerHTML = tour.playing ? ICON_PAUSE : ICON_PLAY;
  $('#tourPrev').disabled = tour.i === 0;
}
function tourTick(dt) {
  if (!tour.on) return;
  const sc = TOUR[tour.i];
  if (tour.playing) tour.t += dt;
  if (sc.go.dT && cv && S.view === 'clim') { const [a, b] = sc.go.dT; const f = Math.min(1, Math.max(0, (tour.t - 1.2) / 5)); cv.setDT(a + (b - a) * f, true); }
  $('#tourProg').style.width = `${Math.min(100, tour.t / TOUR_DUR * 100)}%`;
  if (tour.playing && tour.t >= TOUR_DUR) { if (tour.i < TOUR.length - 1) tourGo(tour.i + 1); else { tour.playing = false; $('#tourPlay').innerHTML = ICON_PLAY; } }
}
$('#tourBtn').addEventListener('click', () => (tour.on ? tourStop() : tourStart()));
$('#tourClose').addEventListener('click', tourStop);
$('#tourNext').addEventListener('click', () => { if (tour.i < TOUR.length - 1) tourGo(tour.i + 1); });
$('#tourPrev').addEventListener('click', () => tourGo(tour.i - 1));
$('#tourPlay').addEventListener('click', () => { tour.playing = !tour.playing; if (tour.playing && tour.t >= TOUR_DUR) tourGo(0); $('#tourPlay').innerHTML = tour.playing ? ICON_PAUSE : ICON_PLAY; });
$('#tourText').addEventListener('click', (e) => { const a = e.target.closest('a[data-src]'); if (a) { e.preventDefault(); tourStop(); gotoSource(a.dataset.src); } });
document.addEventListener('keydown', (e) => {
  if (!tour.on || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
  if (e.key === 'Escape') tourStop();
  else if (e.key === 'ArrowRight') { if (tour.i < TOUR.length - 1) tourGo(tour.i + 1); }
  else if (e.key === 'ArrowLeft') tourGo(tour.i - 1);
  else if (e.key === ' ') { e.preventDefault(); $('#tourPlay').click(); }
});

// ---------- events ----------
for (const b of document.querySelectorAll('.tabs button')) b.addEventListener('click', () => setView(b.dataset.view));
$('#langBtn').addEventListener('click', () => {
  S.lang = S.lang === 'de' ? 'en' : 'de'; save();
  if (S.view === 'sources') $('#srcView').innerHTML = sourcesHTML(S.lang);
  renderPanel(); buildLabels(); if (S.view === 'journey') applyJourney(false);
  if (tour.on) tourGo(tour.i);
});
$('#themeBtn').addEventListener('click', () => { document.documentElement.dataset.theme = currentTheme() === 'dark' ? 'light' : 'dark'; });
$('#qBtn').addEventListener('click', () => { S.quality = S.quality === 'high' ? 'std' : 'high'; save(); if (renderer) { renderer.setPixelRatio(pixelRatio()); resize(); } updateStatic(); });
new MutationObserver(() => applyTheme()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());
function applyTheme() {
  const t = currentTheme();
  if (t === S.theme && map && map.pal) return;
  S.theme = t;
  if (map) map.setPalette(t);
  if (dio) dio.setTheme(t);
  if (vv) vv.setTheme(t);
  if (cv) cv.setTheme(t);
  if (charts.length) charts.forEach((c) => c.draw && c.draw());
}
$('#m-globe').addEventListener('click', () => { if (map) { map.setMode('globe'); updateStatic(); } });
$('#m-flat').addEventListener('click', () => { if (map) { map.setMode('flat'); updateStatic(); } });
$('#s-sat').addEventListener('click', () => { S.mapStyle = 'sat'; if (map) map.setStyle('sat'); updateStatic(); });
$('#s-thema').addEventListener('click', () => { S.mapStyle = 'thema'; if (map) map.setStyle('thema'); updateStatic(); });
function zoomCam(view, f) {
  const c = view.controls; const off = view.camera.position.clone().sub(c.target);
  const len = THREE.MathUtils.clamp(off.length() * f, c.minDistance, c.maxDistance);
  view.camera.position.copy(c.target).add(off.setLength(len)); view.userMoved = true; if (c.autoRotate !== undefined) c.autoRotate = false;
}
$('#zin').addEventListener('click', () => { if (S.view === 'map' && map) map.zoom(0.75); else if (S.view === 'journey' && dio) zoomCam(dio, 0.75); else if (S.view === 'var' && vv) zoomCam(vv, 0.8); else if (S.view === 'clim' && cv) zoomCam(cv, 0.8); });
$('#zout').addEventListener('click', () => { if (S.view === 'map' && map) map.zoom(1.33); else if (S.view === 'journey' && dio) zoomCam(dio, 1.33); else if (S.view === 'var' && vv) zoomCam(vv, 1.25); else if (S.view === 'clim' && cv) zoomCam(cv, 1.25); });
$('#zreset').addEventListener('click', () => { if (S.view === 'map' && map) { selectCountry(null); map.reset(); } else if (S.view === 'journey' && dio) dio.goStation(dio.station); else if (S.view === 'var' && vv) vv.reset(); else if (S.view === 'clim' && cv) cv.reset(); });

// picking on stage (map)
let down = null;
const tip = $('#tip');
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; if (tour.on && tour.playing) { tour.playing = false; $('#tourPlay').innerHTML = ICON_PLAY; } });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
  if (moved > 6 || S.view !== 'map' || !map) return;
  const r = canvas.getBoundingClientRect();
  const id = map.pick((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
  if (id) selectCountry(id, true);
});
canvas.addEventListener('pointermove', (e) => {
  if (S.view !== 'map' || !map || e.pointerType !== 'mouse') { tip.hidden = true; return; }
  const r = canvas.getBoundingClientRect();
  const id = map.pick((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
  map.setHover(id);
  canvas.style.cursor = id ? 'pointer' : '';
  if (id) {
    const c = byId.get(id);
    const cl = S.mapLayer === 'clim' ? (CLIM_COUNTRY[id] ? CLIM_CATS[CLIM_COUNTRY[id].cat] : CLIM_CATS.na) : null;
    tip.hidden = false;
    tip.innerHTML = `<b>${esc(l(c.name))}</b>${cl ? `<span>${esc(l(cl.n))}</span>` : c.p26 ? `<span>${nf(c.p26 / 1000)} ${ui().mioBags} · ${nf(shareOf(c))} %</span>` : ''}`;
    tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`;
  } else tip.hidden = true;
});
canvas.addEventListener('pointerleave', () => { tip.hidden = true; if (map) map.setHover(null); });

// ---------- resize & loop ----------
let W = 0, H = 0;
function resize() {
  const r = stage.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return;
  W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
  if (!renderer) return;
  renderer.setSize(W, H, false);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  if (map) map.resize(W, H);
  if (dio) dio.resize(W, H);
  if (vv) vv.resize(W, H);
  if (cv) cv.resize(W, H);
}
const ro = new ResizeObserver(resize); ro.observe(stage);

const anatSvg = $('#anat');
function drawAnatomy() {
  if (!(S.view === 'chem' && S.chemView === 'cherry' && bean)) { if (anatSvg.innerHTML) anatSvg.innerHTML = ''; return; }
  bean.root.updateMatrixWorld(true);
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  const narrow = W < 520;
  const pts = LAYERS.map((x) => ({ l: x, p: bean.anchorScreen(x.k, W, H) }));
  const left = pts.filter((q) => ['exo', 'meso', 'silver'].includes(q.l.k)), right = pts.filter((q) => !['exo', 'meso', 'silver'].includes(q.l.k));
  let s = '';
  const col = (arr, side) => {
    arr.sort((a, b) => a.p.y - b.p.y);
    const x = side < 0 ? 12 : W - 12;
    arr.forEach((q, i) => {
      const y = H * (0.2 + 0.6 * (i + 0.5) / arr.length);
      const name = l(q.l.name).split(' (')[0];
      s += `<line x1="${q.p.x}" y1="${q.p.y}" x2="${side < 0 ? x + (narrow ? 70 : 110) : x - (narrow ? 70 : 110)}" y2="${y}" stroke="${ink}" stroke-width="1"/><circle cx="${q.p.x}" cy="${q.p.y}" r="3.5" fill="${q.l.c}" stroke="${ink}"/>`;
      s += `<text x="${x}" y="${y + 4}" text-anchor="${side < 0 ? 'start' : 'end'}" font-size="${narrow ? 12 : 14}" fill="${ink}" style="paint-order:stroke;stroke:${bg};stroke-width:4px">${esc(name)}</text>`;
    });
  };
  col(left, -1); col(right, 1);
  anatSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  anatSvg.innerHTML = s;
}

const EXPO = { map: [1.05, 1.15], journey: [0.92, 1.05], var: [0.92, 1.0], clim: [0.95, 1.05], chem: [1.05, 1.15] };
function renderScene(view, key, ao) {
  if (S.quality === 'high' && ao) { (posts[key] ||= new Post(renderer, view.scene, view.camera, ao)).render(W, H); }
  else view.render(renderer);
}
let last = performance.now();
let anatTick = 0;
function loop(now) {
  requestAnimationFrame(loop);
  if (document.hidden || !renderer) return;
  const dt = Math.min(0.25, (now - last) / 1000); last = now; window.__fps = (window.__fps || 0) * 0.9 + 0.1 / Math.max(dt, 1e-3);
  tourTick(dt);
  if (S.view === 'sources') return;
  renderer.toneMappingExposure = (EXPO[S.view] || EXPO.map)[S.theme === 'dark' ? 1 : 0];
  renderer.setViewport(0, 0, W, H);
  if (S.view === 'map' && map) { map.update(dt); renderer.setClearColor(0x000000, 0); map.render(renderer); }
  else if (S.view === 'journey' && dio) {
    dio.update(dt); renderScene(dio, 'journey', { radius: 1.6, thickness: 2, intensity: 1 });
    if (bean) {
      bean.update(dt, true);
      const ins = $('#insetView').getBoundingClientRect(), sr = stage.getBoundingClientRect();
      if (ins.width > 10 && ins.height > 10) {
        renderer.autoClear = false;
        renderer.toneMappingExposure = EXPO.chem[S.theme === 'dark' ? 1 : 0];
        bean.renderTo(renderer, Math.round(ins.left - sr.left), Math.round(sr.bottom - ins.bottom), Math.round(ins.width), Math.round(ins.height), getComputedStyle(document.documentElement).getPropertyValue('--panel').trim());
        renderer.autoClear = true;
      }
    }
  } else if (S.view === 'var' && vv) { vv.update(dt); renderScene(vv, 'var', { radius: 0.18, thickness: 0.4, intensity: 0.9 }); }
  else if (S.view === 'clim' && cv) { cv.update(dt); cv.render(renderer); }
  else if (S.view === 'chem' && bean) {
    renderer.setClearColor(0x000000, 0);
    if (S.chemView === 'cherry') { bean.root.rotation.y = Math.sin(now / 1000 * 0.4) * 0.45; bean.camera.position.set(0, 0.1, (W < 600 ? 6.2 : 5.1) * (W / H < 0.9 ? 1.25 : 1)); }
    else { bean.update(dt, true); bean.camera.position.set(0.4, 0.35, (W < 600 ? 5.6 : 4.6) * (W / H < 0.9 ? 1.25 : 1)); }
    bean.camera.lookAt(0, 0, 0);
    renderer.clear();
    bean.renderTo(renderer, 0, 0, W, H);
    if (++anatTick % 2 === 0) drawAnatomy();
  }
  layoutLabels();
}

// ---------- boot ----------
async function boot() {
  S.theme = currentTheme();
  const h = location.hash.replace('#', '');
  S.view = UNHASH[h] || (h.startsWith('src-') ? 'sources' : 'map');
  document.body.dataset.view = S.view;
  updateStatic();
  resize();
  if (renderer) {
    try {
      bean = new BeanModel();
      dio = new Diorama(renderer, { mobile });
      dio.resize(W, H); dio.setTheme(S.theme); window.__dio = dio;
      const res = await fetch('world.json');
      const world = await res.json();
      map = new MapView(renderer, world, ALL_COUNTRIES.map((c) => ({ ...c, ref: REFS.includes(c) })), { mobile });
      map.onStyleFail = () => { S.mapStyle = 'thema'; updateStatic(); };
      map.resize(W, H); map.setPalette(S.theme);
      $('#glmsg').textContent = '';
    } catch (e) {
      console.error(e);
      $('#glmsg').textContent = String(e && e.message || e);
    }
  }
  setView(S.view, false);
  requestAnimationFrame(loop);
  if (document.fonts) document.fonts.ready.then(() => { if (dio && S.view === 'journey') applyJourney(false); else if (dio) dio.setSackLabel('COFFEE', 'GREEN COFFEE · 60 KG'); });
  window.addEventListener('hashchange', () => { const hh = location.hash.replace('#', ''); const v = UNHASH[hh]; if (v && v !== S.view) setView(v, false); });
  window.__app = { S, setView, tourStart, tourGo, addProfileText, selectVariety, setMapLayer, get vv() { return vv; }, get cv() { return cv; }, get map() { return map; } };
}
boot();
