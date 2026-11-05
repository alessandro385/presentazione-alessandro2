# Portfolio — Alessandro Barresi

Portfolio personale in due edizioni, selezionabili dalla pagina iniziale.

## Struttura

```
index.html                  → landing di selezione edizione
versione-2024.html          → edizione 2024/25 (originale, preservata)
script.js, style.css        → asset dell'edizione 2024/25
themes/                     → i 4 temi dell'edizione 2024/25 (Moderno, High-Tech, Matrix, Quantum)
presentaione_mensa/         → presentazione gestionale mensa (2024)
presentazione_parrucchiera/ → presentazione gestionale parrucchiera (2024)
assets/                     → immagini condivise tra le edizioni
├── suite_care/             → illustrazioni SVG della Suite Care
├── football_paper_trading/ → illustrazioni SVG di Football Paper-Trading
├── simecom/                → illustrazioni SVG dei progetti di dati energetici, più i dati della demo meteo:
│   ├── capoluoghi.json     → 107 capoluoghi di provincia (nome, sigla, regione, lat, lon; coordinate GeoNames)
│   └── temperature-esempio.json → istantanea reale di Open-Meteo usata se la richiesta dal vivo fallisce
└── tesi/                   → illustrazioni SVG della tesi ITS

v2026/                      → edizione 2026 (nuova)
├── index.html              → presentazione principale
├── css/                    → design system con 3 temi (Aurora, Lumen, Ember)
│   └── progetti.css        → palette e blocchi dei case study 2026 (care, campo, energia, tesi)
├── js/                     → interazioni (temi, typewriter, scroll reveal)
│   └── demo-energia.js     → le due demo interattive del case study sui dati energetici
├── presentazioni/          → case study dei progetti
│   ├── suite-care.html     → Suite Care: helpdesk, WhatsApp marketing, servizio gestito
│   ├── football-paper-trading.html → modelli statistici sul calcio, denaro 100% virtuale
│   ├── simecom.html        → forecasting energetico e mappa delle temperature
│   ├── tesi.html           → tesi ITS: architettura dati, automazioni, ML e verifica ordini
│   ├── gioco.html          → La Corsa di Babbo Natale, giocabile nella pagina
│   ├── mensa.html          → Gestionale Mensa
│   └── parrucchiera.html   → Gestionale Parrucchiera
└── game/                   → La Corsa di Babbo Natale — Edizione 2026
                              (motore data-driven, desktop + mobile)
```

### Case study dei progetti privati

Suite Care, Football Paper-Trading, gli strumenti di dati energetici e la tesi ITS hanno il
codice privato: le pagine descrivono cosa fanno e con quali tecnologie, senza link ai
repository, nome dell'azienda, dati aziendali, clienti o cifre. La tesi racconta il quadro
d'insieme e rimanda al case study del forecasting (e viceversa). Le immagini sono
**illustrazioni SVG schematiche**, non screenshot, e lo dichiarano nella didascalia. Le palette dei case study stanno in `v2026/css/progetti.css`, caricato dopo
`main.css` e `showcase.css`.

### Demo interattive del case study energetico

`v2026/presentazioni/simecom.html` contiene due demo che ricreano l'esperienza delle app
interne senza usarne i dati (JS in `v2026/js/demo-energia.js`, stili nella sezione "Demo
interattive" di `v2026/css/progetti.css`):

- **Forecast vs consuntivo** — curve a 96 quarti d'ora per le zone del mercato elettrico
  (NORD, CNOR, CSUD, SUD, CALA, SICI, SARD) generate nel browser in modo deterministico
  (seed per zona e giorno). Ritocchi percentuali per fascia, MAPE prima/dopo, grafico SVG
  disegnato a mano. Dati **simulati**, nessun dato aziendale.
- **Temperature dei capoluoghi** — una sola richiesta a [Open-Meteo](https://open-meteo.com)
  (gratuito, senza chiave, CC BY 4.0) per i 107 capoluoghi, mappa Leaflet 1.9.4 da cdnjs con
  le tile standard di OpenStreetMap rese grigie via CSS. Le basemap CARTO ora chiedono una
  chiave (gratuita per uso non commerciale, carto.com/basemaps/apikey): inserendola nella
  costante `CARTO_KEY` di `demo-energia.js` la mappa passa a CARTO light/dark in automatico.
  Leaflet e dati si caricano solo quando la sezione entra in vista;
  la risposta resta in `sessionStorage` per 15 minuti. Se la richiesta fallisce si usa
  `assets/simecom/temperature-esempio.json`, dichiarato come "dati di esempio". Per
  rigenerare l'istantanea basta salvare una risposta reale con lo stesso formato
  (`generato`, `valori: [{sigla, t, min, max}]`).

Eventi analytics: `demo-forecast` (prima interazione) e `demo-temperature` (prima mappa caricata).

## Edizioni

- **2026** — design system su misura (niente framework CSS), tre temi commutabili con
  persistenza, timeline aggiornata (Dog Heroes), gioco natalizio riscritto da zero con
  livelli e nemici definiti come dati.
- **2024/25** — la versione storica, con i quattro temi originali. Non viene più
  modificata: è conservata com'era.

## Classifica del gioco

Il gioco 2026 ha una classifica con nickname (nessun dato personale): i punteggi
reali vivono nel `localStorage` del browser del visitatore, sopra una base di
15 giocatori fittizi (`v2026/game/js/core/leaderboard.js`) così la classifica
non parte mai vuota. È quindi una classifica per-browser, non condivisa tra
visitatori: per renderla globale servirebbe un piccolo backend (es. Supabase).

## Statistiche di accesso

Il sito usa [GoatCounter](https://www.goatcounter.com) (`v2026/js/analytics.js`):
**nessun cookie, nessun dato personale**, quindi niente banner consensi. Traccia
visite per pagina, tempo di permanenza a fasce ed eventi (edizione scelta, tema,
versione del gioco giocata, partite iniziate/finite). In localhost non invia
nulla: logga solo in console.

**Attivazione (una tantum):** registrati gratis su
https://www.goatcounter.com/signup scegliendo il codice sito `alessandro385`.
Da quel momento i dati appaiono su https://alessandro385.goatcounter.com.
Se il codice fosse occupato, scegline un altro e aggiorna la costante `SITE`
in `v2026/js/analytics.js`.

## Sviluppo locale

Serve solo un server statico:

```
python -m http.server 8741
# poi apri http://localhost:8741
```

Le versioni precedenti del gioco vivono nei repository dedicati:
[Space_invaders](https://github.com/alessandro385/Space_invaders),
[space_invaders2](https://github.com/alessandro385/space_invaders2),
[Space_invaders_mobile_version](https://github.com/alessandro385/Space_invaders_mobile_version).
