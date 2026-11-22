// Climate risk: model mountain bands + study findings + per-country map categories.
const t = (de, en) => ({ de, en });

// Model: T(z) = T0 − lapse·z + ΔT. Arabica thresholds as mean annual temperature (°C).
export const CLIM_MODEL = {
  T0: 28.5, lapse: 6.5, // °C at sea level (equatorial slope), K per km
  bands: [
    { k: 'hot', max: 99, min: 24, c: '#c0392b', n: t('zu heiss (> 24 °C)', 'too hot (> 24 °C)') },
    { k: 'warm', max: 24, min: 21, c: '#e39a3b', n: t('warm-grenzwertig (21–24 °C)', 'warm margin (21–24 °C)') },
    { k: 'opt', max: 21, min: 18, c: '#3f8f3a', n: t('Optimum Arabica (18–21 °C)', 'Arabica optimum (18–21 °C)') },
    { k: 'cool', max: 18, min: 15, c: '#4b8fa8', n: t('kühl-grenzwertig (15–18 °C)', 'cool margin (15–18 °C)') },
    { k: 'cold', max: 15, min: -99, c: '#8c97a3', n: t('zu kühl (< 15 °C)', 'too cool (< 15 °C)') },
  ],
};

export const CLIM_FINDINGS = [
  { k: t('Arabica-Optimum', 'Arabica optimum'), v: t('18–21 °C Jahresmittel, toleriert bis ~24 °C', '18–21 °C annual mean, tolerates up to ~24 °C'), src: 'climgov' },
  { k: t('Robusta', 'Robusta'), v: t('Optimum unter 20,5 °C; je +1 °C rund −14 % Ertrag', 'optimum below 20.5 °C; about −14 % yield per +1 °C'), src: 'kath' },
  { k: t('Höhe', 'Altitude'), v: t('Median der geeigneten Lagen bis 2050 rund +300 m, Südmexiko ~+500 m', 'median suitable elevation about +300 m by 2050, southern Mexico ~+500 m'), src: 'wcr2015' },
  { k: t('Hitze', 'Heat'), v: t('2050: 79 % der Anbaugebiete mit Maxima ≥ 30 °C im heissesten Monat, 54 % ≥ 32 °C', '2050: 79 % of growing areas with hottest-month maxima ≥ 30 °C, 54 % ≥ 32 °C'), src: 'wcr32' },
  { k: t('Wildarten', 'Wild species'), v: t('mindestens 60 % von 124 Kaffeearten bedroht', 'at least 60 % of 124 coffee species threatened'), src: 'wild' },
];

// projected loss of suitable area: [low, high] in % (point estimates as equal values)
export const CLIM_RANGES = [
  { k: t('Welt, Arabica + Robusta bis 2050', 'World, Arabica + Robusta by 2050'), r: [50, 50], approx: true, src: 'bunn' },
  { k: t('Welt, sehr gut geeignet (S1), alle RCPs', 'World, highly suitable (S1), all RCPs'), r: [50, 100], open: true, src: 'gruter' },
  { k: t('BR, VN, ID, CO: sehr gut geeignet (S1)', 'BR, VN, ID, CO: highly suitable (S1)'), r: [48, 97], src: 'gruter' },
  { k: t('BR, VN, ID, CO: gut geeignet (S2)', 'BR, VN, ID, CO: suitable (S2)'), r: [18, 51], src: 'gruter' },
  { k: t('Zentralamerika bis 2050', 'Central America by 2050'), r: [38, 89], src: 'climgov' },
  { k: t('Äthiopien: Fläche könnte ungeeignet werden', 'Ethiopia: area could become unsuitable'), r: [39, 59], src: 'moat' },
];

// map categories per country (ISO numeric). Notes summarise the cited studies.
export const CLIM_CATS = {
  high: { c: '#c0392b', n: t('hohes Verlustrisiko', 'high loss risk') },
  mixed: { c: '#e39a3b', n: t('Verluste, Ausweichen in die Höhe möglich', 'losses, upslope shift possible') },
  gain: { c: '#3f8f3a', n: t('neue Eignung möglich', 'new suitability possible') },
  na: { c: '#9a9188', n: t('nicht einzeln bewertet', 'not assessed individually') },
};

export const CLIM_COUNTRY = {
  76: { cat: 'high', n: t('Starke Verluste bei sehr gut geeigneten Flächen; heiss-trockene Zonen wie Nord-Minas Gerais am stärksten betroffen; im Süden neue Flächen möglich.', 'Strong losses of highly suitable land; hot-dry zones such as northern Minas Gerais hit hardest; new land possible in the south.'), src: ['gruter', 'aez'] },
  704: { cat: 'high', n: t('Grosse Verluste projiziert; Robusta reagiert empfindlich auf Wärme.', 'Large losses projected; Robusta is sensitive to warming.'), src: ['gruter', 'ovalle', 'kath'] },
  360: { cat: 'high', n: t('Grosse Verluste sehr gut geeigneter Flächen projiziert.', 'Large losses of highly suitable land projected.'), src: ['gruter'] },
  170: { cat: 'high', n: t('Grosse Verluste sehr gut geeigneter Flächen projiziert; kühle äquatoriale Lagen etwas weniger betroffen.', 'Large losses of highly suitable land projected; cool equatorial zones somewhat less affected.'), src: ['gruter', 'aez'] },
  231: { cat: 'mixed', n: t('39–59 % der Anbaufläche könnten ungeeignet werden; höher gelegene Flächen könnten geeigneter werden.', '39–59 % of the growing area could become unsuitable; higher land could become more suitable.'), src: ['moat', 'ovalle'] },
  800: { cat: 'mixed', n: t('Robusta reagiert empfindlich auf Wärme; für Ostafrika werden auch Gewinne in höheren Lagen projiziert.', 'Robusta is sensitive to warming; gains at higher elevations are also projected for East Africa.'), src: ['kath', 'gruter'] },
  356: { cat: 'high', n: t('Wird weniger geeignet; heiss-trockene Zonen verlieren am meisten.', 'Becomes less suitable; hot-dry zones lose most.'), src: ['ovalle', 'aez'] },
  340: { cat: 'high', n: t('Zentralamerika: −38 bis −89 % geeigneter Fläche bis 2050; Mindesthöhe steigt von ~600 auf ~1000 m.', 'Central America: −38 to −89 % suitable area by 2050; minimum altitude rises from ~600 to ~1000 m.'), src: ['climgov'] },
  320: { cat: 'high', n: t('Zentralamerika: −38 bis −89 % geeigneter Fläche bis 2050.', 'Central America: −38 to −89 % suitable area by 2050.'), src: ['climgov'] },
  484: { cat: 'high', n: t('Geeignete Lagen in Südmexiko steigen bis 2050 um rund 500 m.', 'Suitable elevations in southern Mexico rise by about 500 m by 2050.'), src: ['wcr2015'] },
  558: { cat: 'high', n: t('Zentralamerika: −38 bis −89 % geeigneter Fläche bis 2050.', 'Central America: −38 to −89 % suitable area by 2050.'), src: ['climgov'] },
  222: { cat: 'high', n: t('Zentralamerika: −38 bis −89 % geeigneter Fläche bis 2050.', 'Central America: −38 to −89 % suitable area by 2050.'), src: ['climgov'] },
  188: { cat: 'high', n: t('Zentralamerika: −38 bis −89 % geeigneter Fläche bis 2050.', 'Central America: −38 to −89 % suitable area by 2050.'), src: ['climgov'] },
  591: { cat: 'high', n: t('Zentralamerika: −38 bis −89 % geeigneter Fläche bis 2050.', 'Central America: −38 to −89 % suitable area by 2050.'), src: ['climgov'] },
  404: { cat: 'mixed', n: t('In höheren Lagen könnte die Eignung zunehmen.', 'Suitability could increase at higher altitudes.'), src: ['ovalle'] },
  834: { cat: 'mixed', n: t('Ostafrika: Gewinne in höheren Lagen projiziert, Verluste in tieferen.', 'East Africa: gains projected at higher elevations, losses lower down.'), src: ['gruter'] },
  646: { cat: 'mixed', n: t('Ostafrika: Gewinne in höheren Lagen projiziert, Verluste in tieferen.', 'East Africa: gains projected at higher elevations, losses lower down.'), src: ['gruter'] },
  108: { cat: 'mixed', n: t('Ostafrika: Gewinne in höheren Lagen projiziert, Verluste in tieferen.', 'East Africa: gains projected at higher elevations, losses lower down.'), src: ['gruter'] },
  156: { cat: 'gain', n: t('Für China werden neue geeignete Flächen projiziert.', 'New suitable land is projected for China.'), src: ['gruter'] },
};
// countries without production that may gain suitability (hatched on the map)
export const CLIM_GAIN_ONLY = { 858: 'Uruguay', 32: 'Argentina', 152: 'Chile', 840: 'USA', 710: 'South Africa', 554: 'New Zealand' };
