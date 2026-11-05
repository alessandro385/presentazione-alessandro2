# Skill per Claude dedicate a grafica e design frontend

Ricerca del 4 novembre 2026. Stelle e date dell'ultimo aggiornamento sono state lette dall'API di
GitHub quel giorno. Tutti gli `SKILL.md` qui sotto sono stati letti per intero come testo:
nessuno script delle skill è stato eseguito e niente è stato installato.

Le skill con script (Python, Node o binari scaricati) vanno trattate come codice di terzi:
prima di installarle conviene leggere cosa eseguono.

## Consigliate

### 1. frontend-design (Anthropic, ufficiale)

- **Link:** https://github.com/anthropics/skills/tree/main/skills/frontend-design
  (lo stesso contenuto è anche nel plugin `frontend-design` di
  https://github.com/anthropics/claude-plugins-official)
- **A cosa serve:** dà a Claude una direzione estetica precisa invece dei default "da template":
  tipografia con carattere, gerarchia, composizione, motion misurato. Contiene un elenco esplicito
  dei tratti che fanno sembrare una pagina "generata dall'AI" (etichette maiuscole sopra ogni
  titolo, una parola colorata nel titolo, kit di card tutte uguali, gradienti decorativi, mono
  usato come costume) e chiede un piano in due passaggi: token di colore e tipo, poi revisione
  contro il brief prima di scrivere codice.
- **Perché è valida:** è ufficiale, il repo ha circa 187.000 stelle ed è aggiornato (ultimo push
  28 ottobre 2026), licenza Apache 2.0. Il testo è breve, solo istruzioni, nessuno script.
- **Installazione in Claude Code:**
  ```
  /plugin install frontend-design@claude-plugins-official
  ```
  oppure, con tutto il pacchetto di esempio:
  ```
  /plugin marketplace add anthropics/skills
  /plugin install example-skills@anthropic-agent-skills
  ```

### 2. theme-factory (Anthropic, ufficiale)

- **Link:** https://github.com/anthropics/skills/tree/main/skills/theme-factory
- **A cosa serve:** dieci temi pronti (palette in esadecimale + coppia di font) e istruzioni per
  generarne di nuovi e applicarli in modo coerente a pagine, slide e documenti.
- **Perché è valida:** ufficiale, Apache 2.0, nessuno script. Utile per un sito come questo che ha
  più temi commutabili: aiuta a mantenere ogni tema un sistema completo e non una semplice
  sostituzione di colori.
- **Installazione:** compresa in `example-skills@anthropic-agent-skills` (vedi sopra).

### 3. canvas-design (Anthropic, ufficiale)

- **Link:** https://github.com/anthropics/skills/tree/main/skills/canvas-design
- **A cosa serve:** grafica statica in PNG e PDF (poster, copertine, immagini) partendo da una
  "filosofia visiva" scritta prima.
- **Perché è valida:** ufficiale, Apache 2.0. Non serve per il CSS del sito, ma per gli asset che
  gli girano intorno: immagine di anteprima per i link condivisi (Open Graph), copertine dei case
  study, grafiche per LinkedIn.
- **Installazione:** compresa in `example-skills@anthropic-agent-skills`.

### 4. webapp-testing (Anthropic, ufficiale)

- **Link:** https://github.com/anthropics/skills/tree/main/skills/webapp-testing
- **A cosa serve:** verificare pagine web locali con Playwright: screenshot, controllo della
  console, interazioni. È il complemento delle skill di design: guardare il risultato a varie
  larghezze invece di fidarsi del CSS.
- **Perché è valida:** ufficiale, Apache 2.0. Contiene script Python di supporto: richiede Python
  e Playwright installati.
- **Installazione:** compresa in `example-skills@anthropic-agent-skills`.

### 5. impeccable (Paul Bakaus, community)

- **Link:** https://github.com/pbakaus/impeccable (sito: https://impeccable.style)
- **A cosa serve:** una skill con 24 comandi (`/impeccable audit`, `critique`, `polish`, `typeset`,
  `animate`, `quieter`, `bolder`…) e un "craft floor" di controlli concreti: contrasto, misura del
  testo 65–75 caratteri, ombre con offset reale, stati di hover/focus/errore, selezione del testo e
  scrollbar a tema, un solo momento di motion orchestrato.
- **Perché è valida:** circa 102.000 stelle, aggiornata ogni giorno, Apache 2.0, contenuto molto
  concreto e verificabile.
- **Attenzione:** al primo avvio il launcher `scripts/impeccable` scarica ed esegue un binario.
  Leggi il README prima di installarla; il file `reference/craft-floor.md` si può usare anche da
  solo come checklist.
- **Installazione:**
  ```
  /plugin marketplace add pbakaus/impeccable
  /plugin install impeccable@impeccable
  ```

### 6. taste-skill (Leonxlnx, community)

- **Link:** https://github.com/Leonxlnx/taste-skill
- **A cosa serve:** direzione artistica per landing page e portfolio, ricavata dallo studio di 247
  siti premiati. Regole "house style" misurabili (niente eyebrow, niente testo in gradiente, niente
  righe di card identiche, al massimo due font, titoli su massimo due righe) e un ciclo
  screenshot → critica → correzione.
- **Perché è valida:** circa 110.000 stelle, aggiornata oggi, licenza MIT. Le regole sono rigide
  (vieta del tutto gradienti e monospace): vanno usate come guida, non alla lettera, su un sito che
  ha già un'identità.
- **Attenzione:** gli script (`draw.mjs`, `inspect.mjs`) richiedono Node e un Chrome locale.
- **Installazione:**
  ```
  /plugin marketplace add Leonxlnx/taste-skill
  /plugin install taste-skill@taste-skill
  ```

### 7. unslop (Damir Sokolovsky, community)

- **Link:** https://github.com/heydamir/unslop
- **A cosa serve:** trasforma un'interfaccia "vibecoded" in una progettata: prima un audit con
  l'elenco dei segnali tipici (gradienti viola-blu, glow colorati, emoji come icone, etichette
  maiuscole spaziate, badge "New ✨", spaziature casuali), poi correzione strato per strato.
  Distingue tra rifacimento completo e semplice rifinitura quando il sito ha già un'identità.
- **Perché è valida:** circa 8.000 stelle, aggiornata il 1° novembre 2026, licenza CC BY 4.0 (va
  mantenuto il credito all'autore). Quasi tutto testo; lo script di snapshot è facoltativo.
- **Installazione (manuale):**
  ```
  git clone https://github.com/heydamir/unslop
  mkdir -p ~/.claude/skills && cp -r unslop/skills/unslop ~/.claude/skills/
  ```
  oppure copiala in `.claude/skills/` dentro il progetto per usarla solo qui.

### 8. emilkowalski/skills (Emil Kowalski, community)

- **Link:** https://github.com/emilkowalski/skills
- **A cosa serve:** design engineering e animazioni: `emil-design-eng` (filosofia e dettagli
  invisibili), `animate`, `review-animations`, `improve-animations`, `remove-animations`,
  `animation-performance`. Spiega quando un'animazione non serve affatto, quali curve usare
  (ease-out per ciò che risponde all'utente), lo stato `:active` dei pulsanti e altro.
- **Perché è valida:** circa 53.000 stelle, aggiornata il 2 novembre 2026, licenza MIT. L'autore è
  un riferimento riconosciuto sulle animazioni di interfaccia.
- **Installazione:**
  ```
  npx skills@latest add emilkowalski/skills
  ```
  (usa la CLI `skills` di terze parti) oppure copia le cartelle che ti interessano da `skills/` in
  `~/.claude/skills/`.

### 9. web-design-guidelines (Vercel)

- **Link:** https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines
- **A cosa serve:** revisione di file HTML/CSS contro le Web Interface Guidelines di Vercel
  (accessibilità, focus, form, tipografia, performance), con risultati nel formato `file:riga`.
- **Perché è valida:** repo ufficiale Vercel, circa 33.000 stelle, aggiornato a fine ottobre 2026.
  Non dichiara una licenza nel repo; la skill scarica le regole aggiornate da GitHub a ogni uso.
- **Installazione:** copia `skills/web-design-guidelines` in `~/.claude/skills/`, oppure
  `npx skills add vercel-labs/agent-skills --skill web-design-guidelines`.

## Quali sono state applicate al restyling

- **frontend-design**: direzione estetica legata al mondo del soggetto (supply chain, etichette di
  spedizione, tracciamento), un solo elemento audace, niente parola colorata nei titoli, niente
  gradienti decorativi, etichette non più in maiuscolo.
- **impeccable (craft floor)**: contrasto AA verificato, selezione del testo e focus a tema, cifre
  tabellari, una sola sequenza di motion all'apertura, ombre solo dove qualcosa "galleggia".
- **unslop**: audit dei segnali (glow, gradienti viola-ciano, pill ovunque, pulsazioni, backdrop
  sfocati) e scelta della modalità "rifinitura" che mantiene contenuti e identità.
- **emilkowalski/skills**: curve ease-out, `:active` sui pulsanti, niente hover che solleva ogni
  card, transizioni su proprietà specifiche invece di `all`.
- **taste-skill**: usata come guida, non alla lettera (il sito mantiene un monospace per dati e
  codice e i tre temi).

## Scartate

| Candidato | Motivo |
| --- | --- |
| `anthropics/skills` → `web-artifacts-builder` | Pensata per artifact React + Tailwind + shadcn/ui con script di bundling: contraria al vincolo "niente framework né build". |
| `anthropics/skills` → `brand-guidelines` | Applica il marchio Anthropic: farebbe somigliare il portfolio ad Anthropic. |
| `anthropics/skills` → `algorithmic-art` | Arte generativa con p5.js, fuori tema per lo stile di un sito. |
| Plugin `playground` (claude-plugins-official) | Crea esploratori HTML interattivi, non serve a definire uno stile. |
| `nextlevelbuilder/ui-ux-pro-max-skill` (≈145.000 stelle) | Molto popolare ma è un catalogo di stili e palette interrogato con script Python: si sovrappone a impeccable e taste-skill e tende a scelte da catalogo, cioè generiche. |
| `ComposioHQ/awesome-claude-skills`, `travisvn/awesome-claude-skills`, `BehiSecc/awesome-claude-skills` | Liste di link, non skill; per il design rimandano quasi solo alle skill ufficiali già elencate. |
| `VoltAgent/awesome-design-md`, `bergside/awesome-design-skills` | Raccolte di DESIGN.md di marchi esistenti: utili come riferimento, ma copiare il sistema di un altro marchio va contro l'identità personale del portfolio. |
| `alirezarezvani/claude-skills`, `Jeffallan/claude-skills` | Mega-collezioni generaliste; la parte di design è sottile o duplica le skill ufficiali. |
| `obra/superpowers` | Metodologia di sviluppo, non design visivo. |
| `arhamhi/oxfords`, `nicohodt/claude-code-ui-ux-skill`, altri repo con meno di 50 stelle | Poca adozione; alcuni sono fork di ui-ux-pro-max. |
