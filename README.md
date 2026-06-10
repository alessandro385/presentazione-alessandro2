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

v2026/                      → edizione 2026 (nuova)
├── index.html              → presentazione principale
├── css/                    → design system con 3 temi (Aurora, Lumen, Ember)
├── js/                     → interazioni (temi, typewriter, scroll reveal)
├── presentazioni/          → presentazioni 2026 dei gestionali
└── game/                   → La Corsa di Babbo Natale — Edizione 2026
                              (motore data-driven, desktop + mobile)
```

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
