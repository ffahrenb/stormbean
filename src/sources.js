// Complete source list, grouped. Used by the app and rendered statically into index.html at build time.
const t = (de, en) => ({ de, en });

export const SOURCE_GROUPS = [
  { id: 'prod', name: t('Produktion, Handel & Länder', 'Production, trade & countries') },
  { id: 'proc', name: t('Verarbeitung & Mikrobiologie', 'Processing & microbiology') },
  { id: 'chem', name: t('Chemie, Röstung & Fehler', 'Chemistry, roasting & defects') },
  { id: 'var', name: t('Varietäten & Genetik', 'Varieties & genetics') },
  { id: 'clim', name: t('Klima', 'Climate') },
  { id: 'tool', name: t('Daten, Software & Medien', 'Data, software & media') },
];

export const SOURCES = [
  // production & countries
  { id: 'usda', g: 'prod', t: 'USDA Foreign Agricultural Service: Coffee – World Markets and Trade (2 July 2026)', u: 'https://apps.fas.usda.gov/psdonline/circulars/2026/07/coffee.pdf' },
  { id: 'ico', g: 'prod', t: 'International Coffee Organization: Coffee Development Report 2022/23 (cherry-to-green yield)', u: 'https://ico.org/documents/cy2024-25/coffee-development-report-2022-23.pdf' },
  { id: 'fao', g: 'prod', t: 'FAO: Coffee – facts, data and global perspectives', u: 'https://www.fao.org/coffee/en/' },
  { id: 'ft', g: 'prod', t: 'Fairtrade International: Coffee (12.5 million farms, 95 % under 5 ha)', u: 'https://fairtrade.net/coffee.html' },
  { id: 'sca', g: 'prod', t: 'Specialty Coffee Association: What we know about smallholder coffee producers', u: 'https://sca.coffee/sca-news/25/issue-16/the-information-landscape-what-we-know-and-dont-know-about-smallholder-coffee-producers' },
  { id: 'pick', g: 'prod', t: 'Coffee Hunter (2025): Labour and coffee picker shortage – an assessment', u: 'https://coffeehunter.com/labour-and-coffee-picker-shortage-an-assessment/' },
  { id: 'br', g: 'prod', t: 'CNA/CaféPoint 2019 survey via Notícias Agrícolas: Brazilian harvest and drying technology', u: 'https://www.noticiasagricolas.com.br/noticia/256974' },
  { id: 'brsp', g: 'prod', t: 'Daily Coffee News (2026): Specialty coffee still a sliver of Brazil’s total crop', u: 'https://dailycoffeenews.com/2026/03/26/specialty-coffee-still-a-sliver-of-brazils-total-crop-study-finds/' },
  { id: 'vn', g: 'prod', t: 'VietNamNet: Central Highlands share of coffee area and output', u: 'https://vietnamnet.vn/en/deep-processing-lifts-vietnam-s-coffee-close-to-us-9-billion-2492047.html' },
  { id: 'colbh', g: 'prod', t: 'Barista Hustle: The Coffee Buyer’s Guide to Colombia', u: 'https://www.baristahustle.com/?p=416653' },
  { id: 'igc', g: 'prod', t: 'International Growth Centre: Adapting Ethiopia’s coffee sector to climate change (washed premium)', u: 'https://www.theigc.org/blogs/climate-priorities-developing-countries/adapting-ethiopias-coffee-sector-climate-change' },
  { id: 'ucda', g: 'prod', t: 'Uganda Coffee Development Authority: Coffee processing (fruit to FAQ)', u: 'https://new.ugandacoffee.go.ug/file-download/download/public/40' },
  { id: 'mm', g: 'prod', t: 'Monsooned Malabar (process overview)', u: 'https://en.wikipedia.org/wiki/Monsooned_Malabar' },
  { id: 'hn', g: 'prod', t: 'Coffee Hunter: Honduras – regions and drying', u: 'https://coffeehunter.com/our-origins/honduras/' },
  { id: 'peru', g: 'prod', t: 'Daily Coffee News (2026): Peru coffee report', u: 'https://dailycoffeenews.com/2026/06/17/peru-coffee-report-production-steady-despite-structural-challenges/' },
  { id: 'kenya', g: 'prod', t: 'Cafe Imports: Origins – Kenya', u: 'https://www.cafeimports.com/north-america/kenya' },
  { id: 'cr', g: 'prod', t: 'Blue Bottle: Costa Rica – an origin of micromills', u: 'https://blog.bluebottlecoffee.com/posts/costa-rica-an-origin-of-micromills' },
  { id: 'honey', g: 'prod', t: 'Perfect Daily Grind (2025): How honey processing is evolving', u: 'https://perfectdailygrind.com/2025/01/how-honey-processing-is-evolving-in-specialty-coffee/' },
  { id: 'burundi', g: 'prod', t: 'Cafe Imports: Origins – Burundi', u: 'https://www.cafeimports.com/europe/Burundi' },
  { id: 'masha', g: 'prod', t: 'Sucafina: Masha fully washed, Kayanza (Burundi processing)', u: 'https://sucafina.com/emea/offerings/masha-fully-washed?price=EUR' },
  { id: 'greatlakes', g: 'prod', t: 'Coffee Review: African Great Lakes coffees (Burundi, Rwanda, Congo, Tanzania)', u: 'https://coffeereview.com/?p=21219' },
  { id: 'tz', g: 'prod', t: 'Royal Coffee: Tanzania export review', u: 'https://royalcoffee.com/tanzania-export-review/' },
  { id: 'tzch', g: 'prod', t: 'Coffee Hunter: Tanzania', u: 'https://coffeehunter.com/our-origins/tanzania/' },
  { id: 'sv', g: 'prod', t: 'Sucafina: Origins – El Salvador (Pacas, Pacamara)', u: 'https://www.Sucafina.com/na/origins/el-salvador' },
  { id: 'ca', g: 'prod', t: 'Dummies: Central America’s influence on coffee production (Nicaragua, Guatemala, Mexico)', u: 'https://dummies.com/article/home-auto-hobbies/food-drink/coffee-tea/central-americas-influence-on-coffee-production-284559' },
  { id: 'yemen', g: 'prod', t: 'FAO: Yemen coffee profile (terraces, rooftop drying)', u: 'https://openknowledge.fao.org/server/api/core/bitstreams/2af6c9a4-4e0b-41a5-ae83-3a41945844ea/content' },
  { id: 'yemen2', g: 'prod', t: 'Royal Coffee: Yemen coffee overview', u: 'https://royalcoffee.com/?p=828323' },
  { id: 'png', g: 'prod', t: 'ACIAR: Improving livelihoods of smallholder coffee communities in Papua New Guinea', u: 'https://www.aciar.gov.au/project/ASEM-2016-100' },
  { id: 'png2', g: 'prod', t: 'DevPolicy (2023): What ails PNG’s coffee production?', u: 'https://devpolicy.org/what-ails-pngs-coffee-production-elections-and-more-20230717/' },
  { id: 'cn', g: 'prod', t: 'Coffee production in China (Yunnan, Pu’er)', u: 'https://Www.Wikipedia.org/wiki/Coffee_production_in_China' },
  { id: 'cn2', g: 'prod', t: 'Perfect Daily Grind (2020): The increasing quality of Chinese-grown coffee', u: 'https://perfectdailygrind.com/2020/09/the-increasing-quality-of-chinese-grown-coffee/' },
  { id: 'jm', g: 'prod', t: 'Perfect Daily Grind (2021): What is Jamaica Blue Mountain coffee?', u: 'https://perfectdailygrind.com/2021/10/what-is-jamaica-blue-mountain-coffee/' },
  { id: 'jm2', g: 'prod', t: 'Barista Magazine: Exploring Jamaica Blue Mountain coffee', u: 'https://www.baristamagazine.com/jamaica-blue-mountain-coffee/' },
  { id: 'ec', g: 'prod', t: 'Coffee Review: Ecuador coffee (production, Sidra)', u: 'https://coffeereview.com/?p=5498' },
  { id: 'ec2', g: 'prod', t: 'Cafe Imports: Origins – Ecuador', u: 'https://www.cafeimports.com/europe/ecuador' },
  { id: 'bo', g: 'prod', t: 'Perfect Daily Grind (2022): Exploring the Bolivian coffee sector', u: 'https://perfectdailygrind.com/2022/02/exploring-the-bolivian-coffee-sector/' },
  { id: 'bo2', g: 'prod', t: 'Coffee Review: Bolivia', u: 'https://www.coffeereview.com/coffee-reference/coffee-categories/geographic-origins/coffees-from-the-americas/bolivia/' },
  // processing
  { id: 'bytof07', g: 'proc', t: 'Bytof et al. 2007: Transient occurrence of seed germination processes during coffee post-harvest treatment (Annals of Botany)', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2735289' },
  { id: 'bytof05', g: 'proc', t: 'Bytof et al. 2005: Influence of processing on the generation of γ-aminobutyric acid in green coffee beans', u: 'https://portal.fis.tum.de/en/publications/influence-of-processing-on-the-generation-of-%CE%B3-aminobutyric-acid-/' },
  { id: 'sugars', g: 'proc', t: 'Selmar group 2010: Influence of drying on the content of sugars in wet processed green coffee (Food Chemistry)', u: 'https://library.sweetmarias.com/wp-content/uploads/2020/08/Influence-of-drying-on-the-content-of-sugars.pdf' },
  { id: 'storage', g: 'proc', t: 'Selmar et al.: Biochemical changes in stored green coffee (2-year study)', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2701840' },
  { id: 'germ', g: 'proc', t: 'Selmar et al. 2006: Germination of coffee seeds and its significance for coffee quality (Plant Biology)', u: 'https://thieme-connect.com/products/ejournals/html/10.1055/s-2006-923845' },
  { id: 'cirad', g: 'proc', t: 'CIRAD 2019: Transfer of volatiles and aroma precursors into the coffee seeds during fermentation', u: 'https://agritrop.cirad.fr/593404' },
  { id: 'ferm', g: 'proc', t: 'Shen et al. 2025: Microbial characteristics and functions in coffee fermentation (Fermentation)', u: 'https://www.mdpi.com/2311-5637/11/1/5' },
  { id: 'thai', g: 'proc', t: 'Wet coffee fermentation in Thailand: pH 6.27 → 4.00 in 48 h (Agriculture and Natural Resources)', u: 'https://li01.tci-thaijo.org/index.php/anres/article/download/243516/166168/836622' },
  { id: 'aem', g: 'proc', t: 'Applied and Environmental Microbiology 2019: lactic acid bacteria present before fermentation onset', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6414394' },
  { id: 'vitae', g: 'proc', t: 'Vitae 2024: Lactic acid bacteria and yeasts in Colombian wet fermentation', u: 'https://revistas.udea.edu.co/index.php/vitae/article/download/351373/20815318?inline=1' },
  { id: 'siaf', g: 'proc', t: 'Foods 2022: Self-induced anaerobic fermentation – microbiological, metabolic and sensory studies', u: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9818356/' },
  { id: 'cm21', g: 'proc', t: 'Food Chemistry 2021: Microbial fermentation under carbonic maceration in coffee', u: 'https://www.pubmed.gov/33046284/' },
  { id: 'cm22', g: 'proc', t: 'Agronomy 2022: Carbonic maceration of Coffea canephora (Conilon)', u: 'https://www.mdpi.com/2073-4395/12/10/2265/htm' },
  { id: 'aims', g: 'proc', t: 'AIMS Agriculture and Food 2026: Ohmic-heated carbonic maceration of Arabica', u: 'https://www.aimspress.com/aimspress-data/aimsagri/2026/1/PDF/agrfood-11-01-009.pdf' },
  { id: 'cenicafe', g: 'proc', t: 'Cenicafé: Cartilla – beneficio del café (fermentation 12–18 h)', u: 'https://www.cenicafe.org/es/publications/cartilla_20_beneficio_del_cafe.pdf' },
  { id: 'cenicafe2', g: 'proc', t: 'Cenicafé: Seven practices in wet processing – Becolsub and Ecomill® water use', u: 'https://publicaciones.cenicafe.org/index.php/avances_tecnicos/article/download/273/332/311' },
  { id: 'fnc', g: 'proc', t: 'Federación Nacional de Cafeteros: Postharvest', u: 'https://cafedecolombia.com/postharvest/?lang=en' },
  { id: 'ra', g: 'proc', t: 'Rainforest Alliance: Coffee conversion rates (cherry, parchment, green)', u: 'https://knowledge.rainforest-alliance.org/docs/conversion-rates-to-indicate-volumes-in-the-new-rainforest-alliance-certification-program' },
  { id: 'ncsu', g: 'proc', t: 'NC State University: Moisture sorption isotherms of specialty green coffee', u: 'https://repository.lib.ncsu.edu/server/api/core/bitstreams/b6cf02c7-d972-44f6-8392-d9b9243292fd/content' },
  { id: 'ucd', g: 'proc', t: 'UC Davis: Desiccants for green coffee storage and transport', u: 'https://escholarship.org/content/qt3zn508qz/qt3zn508qz.pdf' },
  { id: 'gb', g: 'proc', t: 'Giling Basah (wet hulling): moisture 30–35 %', u: 'https://en.wikipedia.org/wiki/Giling_Basah' },
  { id: 'fs', g: 'proc', t: 'Five Senses Coffee: Sumatran wet-hulled process timeline', u: 'https://fivesenses.com.au/blogs/news/more-than-a-process-sumatran-wet-hulled-coffee' },
  // chemistry
  { id: 'bh', g: 'chem', t: 'Barista Hustle: Chemical composition of green coffee', u: 'https://www.baristahustle.com/?p=398140' },
  { id: 'iarc', g: 'chem', t: 'IARC Monographs (after Clarke 1987): Composition of green coffee', u: 'https://publications.iarc.who.int/_publications/media/download/1796/e3b9d8b93f56977f63fd3c4b9aff66e768296f17.pdf' },
  { id: 'grosch', g: 'chem', t: 'Grosch: Key odorants of coffee (summary at coffeeresearch.org)', u: 'https://coffeeresearch.org/science/aromamain.htm' },
  { id: 'tum', g: 'chem', t: 'TU München: 2-Furfurylthiol precursor and influence of drying methods on roast aroma', u: 'https://mediatum.ub.tum.de/?id=1100602' },
  { id: 'acids', g: 'chem', t: 'Ginz et al. 2000: Formation of aliphatic acids by carbohydrate degradation during roasting', u: 'https://link.springer.com/doi/10.1007/s002170000215' },
  { id: 'roastpot', g: 'chem', t: 'Potravinarstvo 2019: Sucrose, chlorogenic acid and acids in medium vs full city roast', u: 'https://potravinarstvo.com/dokumenty/xml/vol13/PSJFS-13-1-344/PSJFS-13-1-344.xml' },
  { id: 'wcrptd', g: 'chem', t: 'World Coffee Research 2023: Potato taste defect – impacts of the antestia bug', u: 'https://worldcoffeeresearch.org/download/a2a841cb-658e-4020-b70d-c38d3bc3f0c3' },
  { id: 'ptd', g: 'chem', t: 'Hale et al. 2022: Fungi associated with the potato taste defect in Rwanda (Botanical Studies)', u: 'https://link.springer.com/doi/10.1186/s40529-022-00346-9' },
  { id: 'rio', g: 'chem', t: 'Spadone et al. 1990: Analytical investigation of Rio off-flavor in green coffee', u: 'https://pages.uoregon.edu/chendon/coffee_literature/old_literature/1990%20J.%20Agric.%20Food%20Chem.,%20Rio%20defect.pdf' },
  { id: 'musty', g: 'chem', t: 'Cantergiani et al. 2001: Characterisation of the aroma of green Mexican coffee with earthy/mouldy off-flavour', u: 'https://digitalcollection.zhaw.ch/bitstream/11475/5457/1/2001_Cantergiani_Characterisation%20of%20the%20aroma_Eur%20Food%20Res%20Technol.pdf' },
  // varieties
  { id: 'wcr', g: 'var', t: 'World Coffee Research: Arabica Coffee Varieties catalog', u: 'https://varieties.worldcoffeeresearch.org/arabica/varieties' },
  { id: 'wcrbou', g: 'var', t: 'World Coffee Research: Bourbon (variety page)', u: 'https://varieties.worldcoffeeresearch.org/varieties/bourbon' },
  { id: 'wcrsl28', g: 'var', t: 'World Coffee Research: SL28 (variety page)', u: 'https://varieties.worldcoffeeresearch.org/varieties/sl28' },
  { id: 'wcrgroups', g: 'var', t: 'World Coffee Research: Varieties catalog goes global – Typica and Bourbon genetic groups', u: 'https://worldcoffeeresearch.org/work/catalog/varieties' },
  { id: 'wcrsl34', g: 'var', t: 'Comunicaffè: WCR catalog update – SL34 and SL14 belong to the Typica group', u: 'https://www.comunicaffe.com/?p=56759' },
  { id: 'scaplants', g: 'var', t: 'Specialty Coffee Association: Coffee plants of the world', u: 'https://sca.coffee/research/coffee-plants-of-the-world' },
  { id: 'gesha', g: 'var', t: 'Gesha (coffee): origin in the Gori Gesha forest, 1936 collection', u: 'https://www.Wikipedia.org/wiki/Geisha_coffee' },
  { id: 'dcnvar', g: 'var', t: 'Daily Coffee News (2019): The coffee roaster’s complete guide to coffee varieties and cultivars', u: 'https://dailycoffeenews.com/2019/02/07/the-coffee-roasters-complete-guide-to-coffee-varieties-and-cultivars/' },
  { id: 'pacamara', g: 'var', t: 'Coffee Review: El Salvador – Pacamara developed by ISIC from 1958', u: 'https://coffeereview.com/?p=5488' },
  { id: 'castillo', g: 'var', t: 'Cenicafé 2005: Castillo – new rust-resistant coffee variety (Caturra × Timor Hybrid CIFC 1343)', u: 'https://www.cenicafe.org/es/publications/avt0337.pdf' },
  { id: 'hdt', g: 'var', t: 'Cenicafé: Catimores (Caturra × HdT 832-1), Sarchimores (Villa Sarchí × HdT 832-2), Colombia (Caturra × HdT 1343)', u: 'https://publicaciones.cenicafe.org/index.php/avances_tecnicos/article/download/304/371/347' },
  { id: 'genome', g: 'var', t: 'Salojärvi et al. 2024: Genome and population genomics of allopolyploid Coffea arabica (Nature Genetics)', u: 'https://repository.up.ac.za/items/a8e96560-6731-4d2a-bc81-ca77e24236ce' },
  { id: 'wild', g: 'var', t: 'Scientific American (2019): At least 60 % of wild coffee species threatened (Davis et al., Science Advances)', u: 'https://www.scientificamerican.com/article/bitter-reality-most-wild-coffee-species-risk-extinction-worldwide1/' },
  { id: 'steno', g: 'var', t: 'Davis et al. 2021: Arabica-like flavour in a heat-tolerant wild coffee species (Nature Plants)', u: 'https://www.nature.com/articles/s41477-021-00891-4.pdf' },
  { id: 'yunnancat', g: 'var', t: 'Yunnan: 90 % Catimor (CIFC 7963) on 43,000 ha in 2011', u: 'https://www.scribd.com/document/658868230/A15-VARZEA' },
  // climate
  { id: 'bunn', g: 'clim', t: 'Bunn et al. 2015: A bitter cup – climate change profile of global production of Arabica and Robusta coffee (Climatic Change)', u: 'https://econpapers.repec.org/RePEc:spr:climat:v:129:y:2015:i:1:p:89-101' },
  { id: 'ovalle', g: 'clim', t: 'Ovalle-Rivera et al. 2015: Projected shifts in Coffea arabica suitability (PLOS ONE)', u: 'https://www.gov.uk/research-for-development-outputs/projected-shifts-in-coffea-arabica-suitability-among-major-global-producing-regions-due-to-climate-change' },
  { id: 'wcr2015', g: 'clim', t: 'World Coffee Research (2015): Pinpointing the world’s most vulnerable coffee zones (+300 m median elevation)', u: 'https://worldcoffeeresearch.org/news/2015/climate-change-pinpointing-the-worlds-most-vulnerable-coffee-zones' },
  { id: 'aez', g: 'clim', t: 'World Coffee Research: Multiclass classification of agro-ecological zones for Arabica coffee', u: 'https://worldcoffeeresearch.org/work/agro-ecological-zones-arabica-coffee/' },
  { id: 'wcr32', g: 'clim', t: 'World Coffee Research (2018): Coping with 32° (heat as the main threat)', u: 'https://worldcoffeeresearch.org/news/2018/coping-with-32' },
  { id: 'gruter', g: 'clim', t: 'Grüter et al. 2022: Expected global suitability of coffee, cashew and avocado due to climate change (PLOS ONE)', u: 'https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0261976' },
  { id: 'kath', g: 'clim', t: 'Kath et al. 2020: Not so robust – robusta coffee production is highly sensitive to temperature (Global Change Biology)', u: 'https://www.pubmed.gov/32223007/' },
  { id: 'moat', g: 'clim', t: 'Moat et al. 2017: Resilience potential of the Ethiopian coffee sector under climate change (Nature Plants)', u: 'https://pages.uoregon.edu/chendon/coffee_literature/old_literature/2017%20Nat.%20Plants,%20Ethiopian%20coffee%20and%20climate%20change.pdf' },
  { id: 'climgov', g: 'clim', t: 'NOAA Climate.gov: Climate & coffee (optimum 18–21 °C, Central America projections)', u: 'https://www.climate.gov/news-features/climate-and/climate-coffee' },
  // tools
  { id: 'artisan', g: 'tool', t: 'Artisan roaster scope: CSV import/export (source code)', u: 'https://github.com/artisan-roaster-scope/artisan' },
  { id: 'three', g: 'tool', t: 'three.js r170 (MIT licence)', u: 'https://threejs.org/' },
  { id: 'atlas', g: 'tool', t: 'world-atlas 2.0.2 / Natural Earth 1:50m country boundaries (public domain)', u: 'https://github.com/topojson/world-atlas' },
  { id: 'nasa', g: 'tool', t: 'NASA Blue Marble and topography textures (public domain), via three-globe examples (MIT)', u: 'https://github.com/vasturiano/three-globe' },
  { id: 'fonts', g: 'tool', t: 'Saira Stencil One & Archivo (SIL Open Font License), self-hosted via Fontsource', u: 'https://fontsource.org/' },
];

export const SRC = Object.fromEntries(SOURCES.map((s, i) => [s.id, { ...s, n: i + 1 }]));

const escH = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SRC_TEXT = {
  de: { h: 'Quellen', lead: 'Alle Quellen, auf die sich Zahlen, Verfahren, Chemie, Varietäten und Klimaprojektionen dieser Visualisierung stützen. Die Nummern entsprechen den Verweisen [n] in den Ansichten.', stand: 'Stand der Daten', note: 'Kurven und 3D-Szenen sind schematisch und an den genannten Messwerten verankert. Produktionszahlen: USDA-Prognose 2026/27.' },
  en: { h: 'Sources', lead: 'Every source behind the figures, methods, chemistry, varieties and climate projections in this visualisation. Numbers match the [n] references in the views.', stand: 'Data as of', note: 'Curves and 3D scenes are schematic and anchored to the cited measurements. Production figures: USDA forecast 2026/27.' },
};
// Static, language-specific HTML for the full source list (used at build time and by the app).
export const STAND = '22.11.2026';
export function sourcesHTML(lang = 'de', stand = STAND) {
  const T = SRC_TEXT[lang] || SRC_TEXT.de;
  const groups = SOURCE_GROUPS.map((g) => {
    const items = SOURCES.map((s, i) => ({ ...s, n: i + 1 })).filter((s) => s.g === g.id);
    if (!items.length) return '';
    return `<section><h3>${escH(g.name[lang] || g.name.de)}</h3><ol start="${items[0].n}">${items.map((s) => `<li id="src-${s.id}"><a href="${escH(s.u)}" target="_blank" rel="noopener">${escH(s.t)}</a></li>`).join('')}</ol></section>`;
  }).join('');
  return `<h2 id="srcHead">${T.h}</h2><p class="lead">${T.lead}</p><div class="cols">${groups}</div><p class="meta2">${T.note}${stand ? ` ${T.stand}: ${escH(stand)}.` : ''}</p>`;
}
