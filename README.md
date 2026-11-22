# Der Weg der Bohne

Interaktive 3D-Visualisierung für Baristas und Röster:innen: Kaffee im Ursprung – Länder, Verarbeitung, Varietäten, Chemie, Klimarisiko und eigene Röstprofile. Deutsch/Englisch, hell/dunkel, Desktop und Smartphone.

Reine statische Website: HTML, ein JavaScript-Bundle, Texturen, Schriften. Kein Server-Code, keine Cookies, keine Anfragen an Dritte (Schriften und Texturen liegen im Projekt). Röstprofile (CSV) werden nur im Browser gelesen.

## Ansichten

| Tab | Inhalt |
|---|---|
| Karte | Globus ↔ flache Karte, Satellit oder thematisch; Ebenen «Produktion» (USDA 2026/27) und «Klimarisiko»; 11 Hauptländer + 15 Spezialitäten-Herkünfte |
| Weg der Bohne | 3D-Diorama der Aufbereitung (gewaschen, natural, honey, wet-hulled, anaerob) in drei Ebenen: Praxis, Parameter, Chemie |
| Varietäten | 23 Varietäten und Arten als prozedurale 3D-Pflanzen im Vergleich, Merkmale (WCR), vereinfachter Stammbaum |
| Chemie | Anatomie der Kirsche, Röst-Ausblick, **Röstprofil-Import (CSV)** |
| Klima | Modellberg mit Temperaturbändern, Erwärmungsregler, Studienlage |
| Quellen | Vollständige, nummerierte Quellenliste (auch statisch im HTML) |

Oben rechts: **Führung** (automatischer Rundgang, 12 Szenen; Pfeiltasten, Leertaste, Esc), Grafikqualität (Stern: Umgebungsverdeckung an/aus), Sprache, Hell/Dunkel.

## Lokal entwickeln

Voraussetzung: Node.js 20 oder neuer.

```bash
npm ci             # Abhängigkeiten exakt nach package-lock.json
npm run dev        # baut nach dist/ und beobachtet Änderungen
npm run preview    # zweites Terminal: http://localhost:8080
npm run build      # Produktions-Build nach dist/
```

`dist/` liegt im ZIP bereits fertig gebaut bei – zum reinen Anschauen genügt `npm run preview` (oder irgendein statischer Webserver). Direkt per Doppelklick (`file://`) funktioniert die Seite nicht, weil Browser dann `world.json` und die Texturen nicht laden.

## Projektstruktur

```
src/
  main.js        App: Zustand, Panels, Tabs, Führung, Render-Schleife
  content.js     Texte DE/EN, Verarbeitungsschritte, Hauptländer, Chemie
  specialty.js   Spezialitäten-Herkünfte (Kenia … Jamaika)
  varieties.js   Varietäten, Merkmale, Stammbaum
  climate.js     Klimamodell, Studienwerte, Länder-Kategorien
  sources.js     Quellenliste (wird beim Build ins HTML geschrieben)
  tour.js        Szenen der Führung
  roast.js       CSV-Parser (Artisan + generisch), Phasen, RoR, DTR
  map.js, diorama.js, varview.js, climview.js, bean.js, plant.js, env.js, charts.js, profchart.js
public/
  index.html     Vorlage mit Platzhalter <!--SOURCES-->
  world.json, tex/, fonts/, favicon.svg
scripts/
  build.mjs      esbuild-Bundle + public/ kopieren + Quellen einsetzen
  serve.mjs      kleiner Vorschau-Server ohne Abhängigkeiten
  prep-world.mjs erzeugt public/world.json aus world-atlas (npm run world)
```

Inhalte ändern: Zahlen und Texte stehen in den Daten-Dateien in `src/`. Jede neue Quelle in `src/sources.js` eintragen und per `id` referenzieren (`src: ['usda']`); die Nummerierung entsteht automatisch.

## Röstprofile (CSV)

Im Tab **Chemie → Röstprofil** bis zu drei Dateien laden, hineinziehen oder Text einfügen.

- **Artisan:** *Datei → Export → CSV*. Erkannt werden Kopfzeile (`Date:`, `Unit:`, `CHARGE:` …), Spalten `Time1`, `Time2`, `ET`, `BT`, `Event`.
- **Eigene Tabelle:** Komma, Semikolon oder Tab; Zeit als `mm:ss`, `hh:mm:ss`, Sekunden oder Minuten; Spalten für Zeit, BT und optional ET (Zuordnung im Panel änderbar). °F wird erkannt oder kann gewählt werden.
- Berechnet: Wendepunkt, Trocknungsende (Ereignis oder BT ≥ 150 °C, einstellbar), First Crack (nur aus Ereignis, nie geschätzt), Phasenanteile, DTR, ΔBT und mittlere RoR in der Entwicklung, RoR-Kurve (Steigung über 30 s).

## Veröffentlichen auf stormbean.fyi

Ziel: `https://stormbean.fyi`, gehostet über GitHub Pages; `www.stormbean.fyi` leitet auf die Hauptadresse weiter. Canonical-URL, Vorschaubild (`og-image.jpg`), `robots.txt` und `sitemap.xml` sind bereits auf diese Domain eingestellt.

**Reihenfolge einhalten:** zuerst die Domain bei GitHub eintragen, dann DNS ändern – sonst kann jemand anderes die Domain mit einer eigenen Pages-Seite belegen.

### 1. Repository und Pages

1. Repository anlegen, z. B. `ffahrenb/weg-der-bohne`, Projekt auf `main` pushen.
   Hinweis: Mit GitHub Free funktioniert Pages nur bei **öffentlichen** Repositories; für private braucht es GitHub Pro oder Team.
2. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**. Der erste Push startet `.github/workflows/deploy.yml`.
3. Empfohlen: Domain verifizieren unter *Profil-Settings → Pages → Add a domain* → `stormbean.fyi`. GitHub zeigt einen TXT-Eintrag an (Host `_github-pages-challenge-ffahrenb`).
4. *Repository → Settings → Pages → Custom domain:* `stormbean.fyi` eintragen, speichern.

### 2. DNS beim Domain-Anbieter (Beispiel Porkbun)

Bei Porkbun: *Account → Domain Management → stormbean.fyi → Details → DNS Records*. Bei anderen Anbietern heissen die Menüs anders, die Einträge sind dieselben.

1. **Löschen:** die Standard-Einträge, die auf `pixie.porkbun.com` zeigen (ALIAS für die Hauptdomain und CNAME mit Host `*`). Der Platzhalter-Eintrag `*` muss weg – GitHub rät von Wildcard-Einträgen ab. Kein ALIAS auf `@` zusätzlich zu den A-Einträgen stehen lassen.
2. **Anlegen:**

| Typ | Host | Antwort / Wert |
|---|---|---|
| A | *(leer)* | 185.199.108.153 |
| A | *(leer)* | 185.199.109.153 |
| A | *(leer)* | 185.199.110.153 |
| A | *(leer)* | 185.199.111.153 |
| AAAA | *(leer)* | 2606:50c0:8000::153 |
| AAAA | *(leer)* | 2606:50c0:8001::153 |
| AAAA | *(leer)* | 2606:50c0:8002::153 |
| AAAA | *(leer)* | 2606:50c0:8003::153 |
| CNAME | www | ffahrenb.github.io |
| TXT | _github-pages-challenge-ffahrenb | *(Wert aus Schritt 1.3)* |

Porkbun bietet unter DNS Records auch eine Schnellverbindung für GitHub Pages an; danach trotzdem prüfen, dass keine `pixie.porkbun.com`-Einträge übrig sind.

### 3. HTTPS und Kontrolle

1. Warten, bis *Settings → Pages* «DNS check successful» meldet (Minuten bis einige Stunden), dann **Enforce HTTPS** aktivieren.
2. Prüfen: `dig stormbean.fyi +short` liefert die vier 185.199.x.153-Adressen, `dig www.stormbean.fyi +short` zeigt `ffahrenb.github.io`.
3. Hängt das Zertifikat, die Custom Domain in den Pages-Settings entfernen und neu eintragen.

Bei Actions-Deployments ist keine `CNAME`-Datei im Repo nötig. Doku: <https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site>

### Alternativen

- **Cloudflare Pages oder Netlify:** Repository verbinden, Build-Befehl `npm run build`, Ausgabeordner `dist`, Node 20; Domain im jeweiligen Dashboard hinzufügen und die dort angezeigten DNS-Einträge beim Domain-Anbieter setzen.
- **Eigener Webserver:** `npm run build`, dann den Inhalt von `dist/` per SFTP ins Web-Verzeichnis kopieren.

Für eine andere Domain die Adresse in `public/index.html` (canonical, og:url, og:image), `public/robots.txt` und `public/sitemap.xml` ersetzen.

## Technik

three.js r170 (WebGL), physikalischer Himmel mit bildbasierter Beleuchtung, optional GTAO-Umgebungsverdeckung; Globus-zu-Karte-Morph im Shader; prozedurale Kaffeepflanzen (kreuzgegenständige Seitenäste, gegenständige Blätter, Kirschbüschel in den Blattachseln). Bundle mit esbuild.

## Lizenzen

Drittanbieter-Komponenten: siehe [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Lizenz für den eigenen Code und die Texte: noch festzulegen.
