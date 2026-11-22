// Guided tour: each scene sets a view state; {share:ID} is replaced with the country's share of world production.
const t = (de, en) => ({ de, en });

export const TOUR = [
  {
    k: t('Karte', 'Map'), go: { view: 'map', layer: 'prod', sel: null, home: true }, src: ['usda'],
    h: t('Elf Länder, 91 % der Ernte', 'Eleven countries, 91 % of the crop'),
    p: t('Die Säulen zeigen die USDA-Prognose 2026/27: rot Arabica, orange Robusta. Brasilien und Vietnam liefern zusammen mehr als die Hälfte des Kaffees der Welt.', 'Bars show the USDA forecast for 2026/27: red Arabica, orange Robusta. Brazil and Vietnam together grow more than half of the world’s coffee.'),
  },
  {
    k: t('Karte', 'Map'), go: { view: 'map', layer: 'prod', sel: 76 }, src: ['usda', 'br'],
    h: t('Brasilien: Natural im Grossmassstab', 'Brazil: naturals at scale'),
    p: t('{share:76} der Welternte. Auf flachen Lagen ernten Maschinen ganze Äste ab; der Grossteil trocknet als ganze Kirsche (Natural) auf Patios und in Trommeltrocknern.', '{share:76} of the world crop. On flat land, harvesters strip whole branches; most coffee dries as whole cherry (natural) on patios and in drum dryers.'),
  },
  {
    k: t('Karte', 'Map'), go: { view: 'map', layer: 'prod', sel: 231 }, src: ['igc', 'genome'],
    h: t('Äthiopien: die Heimat von Arabica', 'Ethiopia: home of Arabica'),
    p: t('Wild- und Gartenkaffee mit tausenden Landrassen. Gewaschene und natürliche Aufbereitung stehen hier nebeneinander – mit deutlich unterschiedlichem Preis.', 'Forest and garden coffee with thousands of landraces. Washed and natural processing sit side by side here – at clearly different prices.'),
  },
  {
    k: t('Weg der Bohne', 'Bean journey'), go: { view: 'journey', country: 170, proc: 'washed', step: 'ferment', level: 2 }, src: ['thai', 'ferm', 'cenicafe'],
    h: t('Gärtank: Mikroben lösen das Mucilage', 'Fermentation tank: microbes break down mucilage'),
    p: t('Milchsäurebakterien und Hefen bauen Zucker im Fruchtschleim ab; der pH fällt in 48 Stunden etwa von 6,3 auf 4,0. In Kolumbien dauert die Gärung typischerweise 12 bis 18 Stunden.', 'Lactic acid bacteria and yeasts consume sugars in the mucilage; pH falls from about 6.3 to 4.0 within 48 hours. In Colombia fermentation typically lasts 12 to 18 hours.'),
  },
  {
    k: t('Weg der Bohne', 'Bean journey'), go: { view: 'journey', country: 231, proc: 'natural', step: 'dry_n', level: 1 }, src: ['bytof07', 'sugars'],
    h: t('Natural: der Same lebt weiter', 'Natural: the seed stays alive'),
    p: t('In der trocknenden Kirsche keimt der Same kurzzeitig an – bei Naturals erst nach rund einer Woche, bei gewaschenen Kaffees nach etwa zwei Tagen. Das verändert Zucker und Aminosäuren, die beim Rösten zu Aroma werden.', 'Inside the drying cherry the seed briefly starts to germinate – after about a week in naturals, after about two days in washed coffees. This shifts the sugars and amino acids that become aroma in the roaster.'),
  },
  {
    k: t('Weg der Bohne', 'Bean journey'), go: { view: 'journey', country: 360, proc: 'wethulled', step: 'wethull', level: 1 }, src: ['gb', 'fs'],
    h: t('Giling Basah: geschält bei 30–35 % Feuchte', 'Giling basah: hulled at 30–35 % moisture'),
    p: t('In Sumatra wird das Pergament nass entfernt und die nackte Bohne fertig getrocknet. Das ergibt die typisch erdigen, schweren Tassen – und die dunkelgrüne Farbe des Rohkaffees.', 'In Sumatra the parchment comes off while wet and the naked bean finishes drying. This gives the typical earthy, heavy cups – and the dark green colour of the green coffee.'),
  },
  {
    k: t('Varietäten', 'Varieties'), go: { view: 'var', a: 'geisha', b: 'typica' }, src: ['gesha', 'wcr'],
    h: t('Geisha neben Typica', 'Geisha next to Typica'),
    p: t('Beide sind hochwüchsig, aber Geisha stammt direkt aus äthiopischen Landrassen, Typica aus dem schmalen Genpool, der über Jemen in die Welt ging. Achte auf die Triebspitzen: grün oder bronze.', 'Both are tall, but Geisha comes straight from Ethiopian landraces, Typica from the narrow gene pool that left via Yemen. Watch the shoot tips: green or bronze.'),
  },
  {
    k: t('Varietäten', 'Varieties'), go: { view: 'var', a: 'caturra', b: 'bourbon' }, src: ['wcr'],
    h: t('Ein Gen macht kompakt', 'One gene makes it compact'),
    p: t('Caturra ist eine natürliche Bourbon-Mutation: kürzere Internodien, kompakter Wuchs, dichtere Pflanzung. Aus ihr stammen Catuaí, Catimor und Castillo.', 'Caturra is a natural Bourbon mutation: shorter internodes, compact habit, denser planting. Catuaí, Catimor and Castillo descend from it.'),
  },
  {
    k: t('Chemie', 'Chemistry'), go: { view: 'chem', cv: 'roast', roastT: 205 }, src: ['roastpot', 'acids'],
    h: t('Rösten: aus Vorstufen wird Aroma', 'Roasting: precursors become aroma'),
    p: t('Bis zum ersten Crack ist fast die ganze Saccharose abgebaut; ein grosser Teil der Chlorogensäuren folgt in der Entwicklung. Was die Aufbereitung im Rohkaffee verändert, zeigt sich hier.', 'By first crack almost all sucrose is gone; a large share of the chlorogenic acids follows during development. This is where processing differences show.'),
  },
  {
    k: t('Klima', 'Climate'), go: { view: 'clim', dT: [0, 2] }, src: ['wcr2015', 'climgov'],
    h: t('+2 °C: das Optimum wandert rund 300 m nach oben', '+2 °C: the optimum moves up about 300 m'),
    p: t('Pro Grad Erwärmung steigt das Temperaturband um etwa 154 m. Der Berg wird nach oben schmaler – die Fläche im Optimum schrumpft. WCR erwartet bis 2050 im Median +300 m.', 'Each degree of warming lifts the temperature band by about 154 m. The mountain narrows towards the top – the optimum area shrinks. WCR expects a median +300 m by 2050.'),
  },
  {
    k: t('Karte', 'Map'), go: { view: 'map', layer: 'clim', sel: null, home: true }, src: ['bunn', 'gruter'],
    h: t('Wo das Risiko am grössten ist', 'Where the risk is highest'),
    p: t('Tiefe, heisse Lagen in Brasilien, Vietnam, Indonesien, Indien und Zentralamerika verlieren am meisten. Gewinne sind in höheren Lagen und Breiten möglich – oft fern der heutigen Anbaugebiete.', 'Low, hot zones in Brazil, Vietnam, Indonesia, India and Central America lose most. Gains are possible at higher altitudes and latitudes – often far from today’s growing areas.'),
  },
  {
    k: t('Selbst erkunden', 'Explore'), go: { view: 'chem', cv: 'profile' }, src: ['artisan'],
    h: t('Eigene Röstprofile laden', 'Load your own roast profiles'),
    p: t('Lade bis zu drei CSV-Exporte aus Artisan oder einer anderen Röstsoftware: Phasen, Entwicklungszeit und RoR werden berechnet, die Bohne färbt sich mit. Alle Quellen findest du im Tab «Quellen».', 'Load up to three CSV exports from Artisan or other roasting software: phases, development time and RoR are calculated and the bean changes colour. All sources are in the “Sources” tab.'),
  },
];
