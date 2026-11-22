// Varieties: attributes from the World Coffee Research catalogue (fetched Nov 2026) unless noted.
// stature: tall | dwarf · tip: green | bronze | gb (green or bronze) | dbronze | null (not stated)
// bean: s (below average) | m (average) | l (large) | xl (very large) · yld/rust/q: catalogue wording, mapped to 1–4
const t = (de, en) => ({ de, en });

export const VGROUPS = {
  land: { c: '#7a4fa0', n: t('Äthiopische Landrassen', 'Ethiopian landraces') },
  typ: { c: '#1f7a8c', n: t('Typica-Gruppe', 'Typica group') },
  bou: { c: '#b3202a', n: t('Bourbon-Gruppe', 'Bourbon group') },
  tb: { c: '#c0742a', n: t('Typica × Bourbon', 'Typica × Bourbon') },
  intro: { c: '#3d7a3a', n: t('Introgression (Timor-Hybrid)', 'Introgressed (Timor Hybrid)') },
  f1: { c: '#2f5d9e', n: t('F1-Hybriden', 'F1 hybrids') },
  sp: { c: '#6b5b4b', n: t('Andere Arten', 'Other species') },
};

// scale words (index 1–4) for yield, rust resistance, quality potential
export const SCALE = {
  yld: [t('–', '–'), t('niedrig', 'low'), t('mittel', 'medium'), t('hoch', 'high'), t('sehr hoch', 'very high')],
  rust: [t('–', '–'), t('anfällig', 'susceptible'), t('mittel resistent', 'intermediate'), t('resistent', 'resistant'), t('hoch resistent', 'highly resistant')],
  q: [t('–', '–'), t('gut', 'good'), t('sehr gut', 'very good'), t('aussergewöhnlich', 'exceptional'), ''],
  bean: { s: t('unter Ø', 'below avg.'), m: t('mittel', 'average'), l: t('gross', 'large'), xl: t('sehr gross', 'very large'), v: t('variabel', 'variable') },
  tip: { green: t('grün', 'green'), bronze: t('bronze', 'bronze'), gb: t('grün oder bronze', 'green or bronze'), dbronze: t('dunkelbronze', 'dark bronze'), v: t('variabel', 'variable') },
  stature: { tall: t('hochwüchsig', 'tall'), dwarf: t('kompakt', 'compact') },
};

export const VARIETIES = [
  {
    id: 'landrace', g: 'land', name: t('Äthiopische Landrassen', 'Ethiopian landraces'), stature: 'tall', tip: 'v', bean: 'v', yld: 0, rust: 0, q: 3,
    cherry: '#b5212c', h: 2.6, leaf: 1, origin: t('Südwest- und Süd-Äthiopien, Wild- und Gartenkaffee', 'south-west and south Ethiopia, forest and garden coffee'),
    note: t('Tausende lokale Linien («Heirloom»), genetisch vielfältiger als alle Arabica-Linien ausserhalb Äthiopiens. Daraus stammen Geisha und – über Jemen – Typica und Bourbon.', 'Thousands of local lines (“heirloom”), genetically more diverse than all Arabica outside Ethiopia. Geisha comes from here, and – via Yemen – Typica and Bourbon.'),
    src: ['wcrgroups', 'genome'], where: 'ET',
  },
  {
    id: 'geisha', g: 'land', name: t('Geisha (Gesha)', 'Geisha (Gesha)'), stature: 'tall', tip: 'gb', bean: 'm', yld: 1, rust: 2, q: 3,
    cherry: '#b5212c', h: 2.8, leaf: 0.9, year: '1936 / 1953', origin: t('In den 1930ern im Gori-Gesha-Wald (Äthiopien) gesammelt; 1953 am CATIE als T2722 registriert', 'collected in the Gori Gesha forest (Ethiopia) in the 1930s; logged at CATIE in 1953 as T2722'),
    note: t('Hochgewachsen, lange, schlanke Blätter. Bekannt wurde sie 2004 durch die Hacienda La Esmeralda (Panama). Die panamaische Linie ist laut WCR genetisch eigenständig – nicht jede «Geisha» ist dieselbe.', 'Tall, long slender leaves. Rose to fame in 2004 through Hacienda La Esmeralda (Panama). According to WCR the Panamanian line is genetically distinct – not every “Geisha” is the same.'),
    cup: t('Jasmin, Bergamotte, Pfirsich, teeartig.', 'jasmine, bergamot, peach, tea-like.'), src: ['gesha', 'wcr'], where: 'PA, CO, ET, MW',
  },
  {
    id: 'typica', g: 'typ', name: t('Typica', 'Typica'), stature: 'tall', tip: 'bronze', bean: 'l', yld: 1, rust: 1, q: 2,
    cherry: '#b5212c', h: 3.0, leaf: 1, year: t('1706 Java → Amsterdam', '1706 Java → Amsterdam'), origin: t('Jemen → Indien → Java; 1706 ein Baum nach Amsterdam, von dort in die Karibik und nach Lateinamerika', 'Yemen → India → Java; in 1706 a tree went to Amsterdam, from there to the Caribbean and Latin America'),
    note: t('Bronzefarbene Triebspitzen, lange Internodien, kegelförmiger Wuchs. Niedriger Ertrag, anfällig für alle grossen Krankheiten.', 'Bronze shoot tips, long internodes, conical habit. Low yield, susceptible to all major diseases.'),
    cup: t('sauber, süss, mittlere Säure.', 'clean, sweet, medium acidity.'), src: ['wcrgroups', 'scaplants', 'wcr'], where: 'JM, PG, PE, BO',
  },
  {
    id: 'maragogipe', g: 'typ', name: t('Maragogipe', 'Maragogipe'), stature: 'tall', tip: 'bronze', bean: 'xl', yld: 1, rust: 1, q: 2,
    cherry: '#b5212c', h: 3.1, leaf: 1.35, year: '1870', origin: t('Natürliche Typica-Mutation, 1870 bei Maragogipe (Bahia, Brasilien) entdeckt', 'natural Typica mutation found near Maragogipe (Bahia, Brazil) in 1870'),
    note: t('«Elefantenbohne»: sehr grosse Blätter, Kirschen und Bohnen, sehr niedriger Ertrag.', '“Elephant bean”: very large leaves, cherries and beans, very low yield.'),
    src: ['wcr'], where: 'NI, MX, GT',
  },
  {
    id: 'sl34', g: 'typ', name: t('SL34', 'SL34'), stature: 'tall', tip: 'dbronze', bean: 'l', yld: 2, rust: 1, q: 3,
    cherry: '#b5212c', h: 3.0, leaf: 1.05, year: '1935–39', origin: t('Scott Agricultural Laboratories, Kenia: Einzelbaum-Auslese auf dem Loresho Estate (Kabete)', 'Scott Agricultural Laboratories, Kenya: single-tree selection on Loresho Estate (Kabete)'),
    note: t('Laut DNA-Analysen gehört SL34 zur Typica-Gruppe, obwohl der Baum als «French Mission» (Bourbon) geführt wurde. Sehr anfällig für die Kaffeekirschenkrankheit (CBD).', 'DNA analyses place SL34 in the Typica group, although the tree was labelled “French Mission” (Bourbon). Highly susceptible to coffee berry disease (CBD).'),
    cup: t('schwarze Johannisbeere, dicht, saftig.', 'blackcurrant, dense, juicy.'), src: ['wcrsl34', 'wcr'], where: 'KE, UG',
  },
  {
    id: 'bourbon', g: 'bou', name: t('Bourbon', 'Bourbon'), stature: 'tall', tip: 'green', bean: 'm', yld: 2, rust: 1, q: 2,
    cherry: '#b5212c', h: 2.9, leaf: 1, year: t('frühes 18. Jh.', 'early 1700s'), origin: t('Jemen → Île Bourbon (heute La Réunion); um 1860 nach Brasilien, von dort nach Lateinamerika', 'Yemen → Île Bourbon (today La Réunion); to Brazil around 1860, then across Latin America'),
    note: t('Grüne Triebspitzen, breitere Blätter und rundere Kirschen als Typica, etwas mehr Ertrag. Rote, gelbe und rosa Formen.', 'Green shoot tips, broader leaves and rounder cherries than Typica, somewhat higher yield. Red, yellow and pink forms.'),
    cup: t('süss, Karamell, ausgewogene Säure.', 'sweet, caramel, balanced acidity.'), src: ['wcrbou', 'scaplants'], where: 'RW, BI, SV, GT',
  },
  {
    id: 'sl28', g: 'bou', name: t('SL28', 'SL28'), stature: 'tall', tip: 'green', bean: 'l', yld: 1, rust: 1, q: 2,
    cherry: '#b5212c', h: 3.0, leaf: 1.05, year: '1935', origin: t('Scott Agricultural Laboratories, Kenia; Auslese aus «Tanganyika Drought Resistant» (1931 aus dem heutigen Tansania)', 'Scott Agricultural Laboratories, Kenya; selected from “Tanganyika Drought Resistant” (1931, from today’s Tanzania)'),
    note: t('Trockenheitstolerant, tiefe Wurzeln; anfällig für Rost und CBD. Bourbon-Gruppe, aber nicht identisch mit der Varietät Bourbon.', 'Drought tolerant, deep roots; susceptible to rust and CBD. Bourbon group, but not the same as the Bourbon variety.'),
    cup: t('schwarze Johannisbeere, Grapefruit, Tomate.', 'blackcurrant, grapefruit, tomato.'), src: ['wcrsl28', 'wcrsl34'], where: 'KE, UG, MW, ZW',
  },
  {
    id: 'caturra', g: 'bou', name: t('Caturra', 'Caturra'), stature: 'dwarf', tip: 'green', bean: 'm', yld: 2, rust: 1, q: 1,
    cherry: '#b5212c', h: 1.9, leaf: 1, year: '1915–18', origin: t('Natürliche Bourbon-Mutation in Minas Gerais (Brasilien); vom IAC weiterentwickelt', 'natural Bourbon mutation in Minas Gerais (Brazil); developed by IAC'),
    note: t('Ein einzelnes Gen verkürzt die Internodien: kompakter Wuchs, dichtere Pflanzung möglich. Sehr anfällig für Rost. Elternteil vieler moderner Sorten.', 'A single gene shortens the internodes: compact habit, denser planting. Very susceptible to rust. Parent of many modern varieties.'),
    src: ['wcr', 'castillo'], where: 'CO, CR, HN, PE',
  },
  {
    id: 'pacas', g: 'bou', name: t('Pacas', 'Pacas'), stature: 'dwarf', tip: 'green', bean: 'm', yld: 2, rust: 1, q: 1,
    cherry: '#b5212c', h: 1.9, leaf: 1, year: '1949', origin: t('Bourbon-Mutation auf der Finca San Rafael von Alberto Pacas (El Salvador)', 'Bourbon mutation on Alberto Pacas’ farm San Rafael (El Salvador)'),
    note: t('Kompakt wie Caturra, robust gegen Wind und Trockenheit. Elternteil von Pacamara.', 'Compact like Caturra, tolerates wind and drought. Parent of Pacamara.'),
    src: ['sv', 'wcr'], where: 'SV, HN',
  },
  {
    id: 'villasarchi', g: 'bou', name: t('Villa Sarchí', 'Villa Sarchí'), stature: 'dwarf', tip: 'green', bean: 's', yld: 2, rust: 1, q: 1,
    cherry: '#b5212c', h: 1.85, leaf: 0.95, year: t('1950er/60er', '1950s/60s'), origin: t('Bourbon-Mutation bei Sarchí (Costa Rica), von ICAFE selektiert', 'Bourbon mutation near Sarchí (Costa Rica), selected by ICAFE'),
    note: t('Kompakt, für höchste Lagen geeignet. Elternteil der Sarchimor-Linien.', 'Compact, suited to the highest altitudes. Parent of the Sarchimor lines.'),
    src: ['wcr', 'hdt'], where: 'CR',
  },
  {
    id: 'mundonovo', g: 'tb', name: t('Mundo Novo', 'Mundo Novo'), stature: 'tall', tip: 'gb', bean: 'm', yld: 2, rust: 1, q: 1,
    cherry: '#b5212c', h: 3.2, leaf: 1, year: '1943', origin: t('Natürliche Kreuzung von Typica und Bourbon, in Brasilien gefunden, vom IAC selektiert', 'natural Typica × Bourbon cross found in Brazil, selected by IAC'),
    note: t('Kräftig und ertragreich; lange das Rückgrat des brasilianischen Anbaus.', 'Vigorous and productive; long the backbone of Brazilian farming.'),
    src: ['wcr'], where: 'BR',
  },
  {
    id: 'catuai', g: 'tb', name: t('Catuaí', 'Catuaí'), stature: 'dwarf', tip: 'green', bean: 'm', yld: 3, rust: 1, q: 1,
    cherry: '#b5212c', cherry2: '#e2b21a', h: 1.9, leaf: 1, year: '1949 / 1972', origin: t('IAC Brasilien: Mundo Novo × Caturra, gekreuzt 1949, freigegeben 1972', 'IAC Brazil: Mundo Novo × Caturra, crossed 1949, released 1972'),
    note: t('Kompakt und ertragreich; rote und gelbe Formen. Sehr anfällig für Rost.', 'Compact and productive; red and yellow forms. Highly susceptible to rust.'),
    src: ['wcr'], where: 'BR, HN, CR, NI',
  },
  {
    id: 'pacamara', g: 'tb', name: t('Pacamara', 'Pacamara'), stature: 'dwarf', tip: 'gb', bean: 'xl', yld: 1, rust: 1, q: 3,
    cherry: '#b5212c', h: 2.0, leaf: 1.3, year: '1958', origin: t('ISIC El Salvador: Pacas × Maragogipe', 'ISIC El Salvador: Pacas × Maragogipe'),
    note: t('Kompakter Wuchs von Pacas, sehr grosse Bohnen und Blätter von Maragogipe. In Cup-of-Excellence-Wettbewerben in El Salvador häufig vorne.', 'Compact habit from Pacas, very large beans and leaves from Maragogipe. Often near the top of Cup of Excellence competitions in El Salvador.'),
    cup: t('saftig, würzig-kräutrig bis tropisch.', 'juicy, herbal-spicy to tropical.'), src: ['pacamara', 'wcr'], where: 'SV, GT, NI',
  },
  {
    id: 'catimor', g: 'intro', name: t('Catimor (z. B. Catimor 129)', 'Catimor (e.g. Catimor 129)'), stature: 'dwarf', tip: 'green', bean: 'l', yld: 3, rust: 2, q: 1,
    cherry: '#b5212c', h: 1.8, leaf: 1, year: t('1959 (Gruppe)', '1959 (group)'), origin: t('Caturra × Timor-Hybrid 832/1, am CIFC Portugal begonnen; Catimor 129 von Cenicafé, 2006 in Malawi freigegeben', 'Caturra × Timor Hybrid 832/1, started at CIFC Portugal; Catimor 129 from Cenicafé, released in Malawi in 2006'),
    note: t('Über den Timor-Hybrid trägt Catimor Robusta-Gene gegen Rost. Dominiert in Yunnan (China) und vielen Tieflagen. Die Resistenz kann neue Rostrassen verlieren.', 'Through the Timor Hybrid, Catimor carries Robusta genes against rust. Dominant in Yunnan (China) and many lowland areas. Resistance can be broken by new rust races.'),
    src: ['hdt', 'wcr', 'yunnancat'], where: 'CN, HN, IN, MW',
  },
  {
    id: 'castillo', g: 'intro', name: t('Castillo', 'Castillo'), stature: 'dwarf', tip: null, bean: null, yld: 3, rust: 3, q: 0,
    cherry: '#b5212c', h: 1.9, leaf: 1, year: '2005', origin: t('Cenicafé (Kolumbien): Caturra × Timor-Hybrid CIFC 1343; Mehrlinien-Sorte mit regionalen Komponenten', 'Cenicafé (Colombia): Caturra × Timor Hybrid CIFC 1343; multiline variety with regional components'),
    note: t('Ersetzte nach den Rost-Epidemien 2008–2011 grosse Teile der kolumbianischen Fläche. Nicht im WCR-Katalog; Angaben aus Cenicafé-Publikationen.', 'Replaced large parts of Colombia’s area after the 2008–2011 rust epidemics. Not in the WCR catalogue; data from Cenicafé publications.'),
    src: ['castillo', 'hdt'], where: 'CO',
  },
  {
    id: 'marsellesa', g: 'intro', name: t('Marsellesa', 'Marsellesa'), stature: 'dwarf', tip: 'green', bean: 'm', yld: 3, rust: 2, q: 1,
    cherry: '#b5212c', h: 1.9, leaf: 1, year: '2009', origin: t('CIRAD–ECOM; Sarchimor (Villa Sarchí × Timor-Hybrid 832/2)', 'CIRAD–ECOM; Sarchimor (Villa Sarchí × Timor Hybrid 832/2)'),
    note: t('Rost-tolerante Sarchimor-Linie mit lebhafter Säure in mittleren Lagen.', 'Rust-tolerant Sarchimor line with lively acidity at medium altitudes.'),
    src: ['wcr', 'hdt'], where: 'NI, CR, GT',
  },
  {
    id: 'batian', g: 'intro', name: t('Batian', 'Batian'), stature: 'tall', tip: 'gb', bean: 'xl', yld: 3, rust: 2, q: 2,
    cherry: '#b5212c', h: 2.9, leaf: 1.05, year: '2010', origin: t('Coffee Research Foundation (heute KALRO), Kenia; Rückkreuzungen mit SL28 und SL34 und Resistenzquellen', 'Coffee Research Foundation (now KALRO), Kenya; backcrosses with SL28 and SL34 plus resistance donors'),
    note: t('Hochwüchsig wie die SL-Linien, aber resistent gegen CBD und Rost – Kenias Antwort auf Krankheitsdruck.', 'Tall like the SL lines but resistant to CBD and rust – Kenya’s answer to disease pressure.'),
    src: ['wcr'], where: 'KE',
  },
  {
    id: 'ruiru11', g: 'f1', name: t('Ruiru 11', 'Ruiru 11'), stature: 'dwarf', tip: 'gb', bean: 'l', yld: 4, rust: 4, q: 2,
    cherry: '#b5212c', h: 1.8, leaf: 1, year: '1985', origin: t('Coffee Research Foundation, Kenia; zusammengesetzte F1-Hybride mit Catimor-Mutterlinie', 'Coffee Research Foundation, Kenya; composite F1 hybrid with a Catimor mother line'),
    note: t('Kompakt, sehr ertragreich und resistent; Saatgut muss jedes Mal neu durch Kreuzung erzeugt werden.', 'Compact, very productive and resistant; seed has to be produced by crossing every time.'),
    src: ['wcr'], where: 'KE',
  },
  {
    id: 'centroamericano', g: 'f1', name: t('Centroamericano (H1)', 'Centroamericano (H1)'), stature: 'dwarf', tip: 'green', bean: 'l', yld: 4, rust: 4, q: 3,
    cherry: '#b5212c', h: 2.0, leaf: 1, year: '2010', origin: t('CIRAD, CATIE, ICAFE, IHCAFE, PROCAFE, ANACAFE: F1-Hybride aus einer Sarchimor-Linie und einer äthiopischen/sudanesischen Landrasse', 'CIRAD, CATIE, ICAFE, IHCAFE, PROCAFE, ANACAFE: F1 hybrid of a Sarchimor line and an Ethiopian/Sudanese landrace'),
    note: t('Hybridvigor: hoher Ertrag und Resistenz bei aussergewöhnlichem Qualitätspotenzial in höheren Lagen. Vermehrung über Stecklinge oder Gewebekultur.', 'Hybrid vigour: high yield and resistance with exceptional quality potential at altitude. Propagated by cuttings or tissue culture.'),
    src: ['wcr'], where: 'CR, NI, HN, SV',
  },
  {
    id: 'starmaya', g: 'f1', name: t('Starmaya', 'Starmaya'), stature: 'dwarf', tip: 'green', bean: 'l', yld: 3, rust: 4, q: 3,
    cherry: '#b5212c', h: 2.0, leaf: 1, year: t('Mutterlinie 2001', 'mother line 2001'), origin: t('CIRAD–ECOM; F1-Hybride mit männlich steriler Mutterlinie (2001 gefunden)', 'CIRAD–ECOM; F1 hybrid with a male-sterile mother line (found 2001)'),
    note: t('Die männliche Sterilität erlaubt F1-Saatgut ohne Handbestäubung – günstiger als Stecklinge.', 'Male sterility allows F1 seed without hand pollination – cheaper than cuttings.'),
    src: ['wcr'], where: 'NI, CR',
  },
  {
    id: 'robusta', g: 'sp', name: t('Robusta (Coffea canephora)', 'Robusta (Coffea canephora)'), stature: 'tall', tip: null, bean: null, yld: 0, rust: 0, q: 0,
    cherry: '#8e1b22', h: 3.4, leaf: 1.5, sp: true, origin: t('West- und Zentralafrika; diploid, fremdbestäubend', 'West and Central Africa; diploid, cross-pollinating'),
    note: t('Ein Elternteil von Arabica. Mehr Koffein (~2,2 % statt ~1,2 %) und Chlorogensäuren, weniger Zucker. Fremdbestäubung macht die Bestände genetisch vielfältig.', 'One parent of Arabica. More caffeine (~2.2 % vs ~1.2 %) and chlorogenic acids, less sugar. Cross-pollination keeps stands genetically diverse.'),
    src: ['iarc', 'genome', 'kath'], where: 'VN, BR, UG, ID, IN',
  },
  {
    id: 'eugenioides', g: 'sp', name: t('Coffea eugenioides', 'Coffea eugenioides'), stature: 'tall', tip: null, bean: null, yld: 0, rust: 0, q: 0,
    cherry: '#a42430', h: 2.5, leaf: 0.6, sp: true, origin: t('Ostafrikanisches Hochland; diploid', 'East African highlands; diploid'),
    note: t('Der zweite Elternteil von Arabica: kleine Blätter, kleine Kirschen, wenig Koffein. Arabica entstand vor etwa 350 000–610 000 Jahren aus einer einzigen Kreuzung mit C. canephora.', 'The second parent of Arabica: small leaves, small cherries, little caffeine. Arabica arose from a single cross with C. canephora about 350,000–610,000 years ago.'),
    src: ['genome'], where: '–',
  },
  {
    id: 'stenophylla', g: 'sp', name: t('Coffea stenophylla', 'Coffea stenophylla'), stature: 'tall', tip: null, bean: null, yld: 0, rust: 0, q: 0,
    cherry: '#2a1a22', h: 3.0, leaf: 0.75, sp: true, origin: t('Oberes Westafrika (Guinea, Sierra Leone, Côte d’Ivoire); IUCN: gefährdet', 'Upper West Africa (Guinea, Sierra Leone, Côte d’Ivoire); IUCN: Vulnerable'),
    note: t('Schmale Blätter, schwarze reife Kirschen. Mittlere Jahrestemperatur im Verbreitungsgebiet 24,9 °C – etwa 6 °C wärmer als bei Arabica – und doch ein Arabica-ähnliches Geschmacksprofil (Davis et al. 2021).', 'Narrow leaves, black ripe cherries. Mean annual temperature in its range 24.9 °C – about 6 °C warmer than Arabica – yet an Arabica-like flavour profile (Davis et al. 2021).'),
    src: ['steno', 'wild'], where: '–',
  },
];

// pedigree graph (simplified): rows top → bottom, edges parent → child
export const PEDIGREE = {
  nodes: [
    { id: 'eugenioides', r: 0, x: 0.3, label: 'C. eugenioides' }, { id: 'robusta', r: 0, x: 0.72, label: 'C. canephora' },
    { id: 'arabica', r: 1, x: 0.36, label: t('C. arabica', 'C. arabica') },
    { id: 'landrace', r: 2, x: 0.12, label: { de: 'Äthiop. Landrassen', en: 'Ethiopian landraces' } }, { id: 'yemen', r: 2, x: 0.42, label: t('Jemen', 'Yemen') }, { id: 'hdt', r: 2, x: 0.78, label: t('Timor-Hybrid', 'Timor Hybrid') },
    { id: 'geisha', r: 3, x: 0.06 }, { id: 'typica', r: 3, x: 0.28 }, { id: 'bourbon', r: 3, x: 0.56 },
    { id: 'maragogipe', r: 4, x: 0.04 }, { id: 'sl34', r: 4, x: 0.2 }, { id: 'mundonovo', r: 4, x: 0.35 }, { id: 'sl28', r: 4, x: 0.5 }, { id: 'caturra', r: 4, x: 0.65 }, { id: 'pacas', r: 4, x: 0.8 }, { id: 'villasarchi', r: 4, x: 0.96 },
    { id: 'pacamara', r: 5, x: 0.16 }, { id: 'catuai', r: 5, x: 0.4 }, { id: 'catimor', r: 5, x: 0.64 }, { id: 'sarchimor', r: 5, x: 0.88, label: t('Sarchimor', 'Sarchimor') },
    { id: 'batian', r: 6, x: 0.04 }, { id: 'ruiru11', r: 6, x: 0.21 }, { id: 'castillo', r: 6, x: 0.38 }, { id: 'marsellesa', r: 6, x: 0.56 }, { id: 'centroamericano', r: 6, x: 0.77, label: 'Centroamericano' }, { id: 'starmaya', r: 6, x: 0.97 },
  ],
  edges: [
    ['eugenioides', 'arabica'], ['robusta', 'arabica'], ['arabica', 'landrace'], ['landrace', 'yemen'], ['arabica', 'hdt'], ['robusta', 'hdt'],
    ['landrace', 'geisha'], ['yemen', 'typica'], ['yemen', 'bourbon'],
    ['typica', 'maragogipe'], ['typica', 'sl34'], ['typica', 'mundonovo'], ['bourbon', 'mundonovo'], ['bourbon', 'sl28'], ['bourbon', 'caturra'], ['bourbon', 'pacas'], ['bourbon', 'villasarchi'],
    ['pacas', 'pacamara'], ['maragogipe', 'pacamara'], ['mundonovo', 'catuai'], ['caturra', 'catuai'], ['caturra', 'catimor'], ['hdt', 'catimor'], ['villasarchi', 'sarchimor'], ['hdt', 'sarchimor'],
    ['sl28', 'batian'], ['sl34', 'batian'], ['hdt', 'batian'], ['catimor', 'ruiru11'], ['sl28', 'ruiru11'], ['caturra', 'castillo'], ['hdt', 'castillo'], ['sarchimor', 'marsellesa'], ['sarchimor', 'centroamericano'], ['landrace', 'centroamericano'], ['sarchimor', 'starmaya', 1],
  ],
};
