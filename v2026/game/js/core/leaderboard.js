// Classifica del gioco. I punteggi reali vivono in localStorage (per browser);
// i SEED sono giocatori "storici" che popolano la classifica fin dal primo avvio.
// Nessun dato personale: solo nickname scelto dal giocatore, punti e metri.

const LS_ENTRIES = 'corsaBabbo2026.classifica';
const LS_NAME = 'corsaBabbo2026.nome';
const MAX_LOCAL = 50; // tetto alle entry salvate in locale

/** Giocatori fittizi: la classifica non parte mai vuota. */
const SEEDS = [
  { nome: 'ElfoTurbo',       punti: 48500, metri: 7500, seed: true },
  { nome: 'Renna_Cometa',    punti: 41200, metri: 7500, seed: true },
  { nome: 'BabboInRitardo',  punti: 36800, metri: 6900, seed: true },
  { nome: 'SlittaSpaziale',  punti: 30500, metri: 6100, seed: true },
  { nome: 'GrinchPentito',   punti: 26400, metri: 5800, seed: true },
  { nome: 'PanDiZenzero',    punti: 22100, metri: 5200, seed: true },
  { nome: 'VigiliaVeloce',   punti: 18750, metri: 4700, seed: true },
  { nome: 'PupazzoBruno',    punti: 15300, metri: 4100, seed: true },
  { nome: 'StellaPolare99',  punti: 12600, metri: 3600, seed: true },
  { nome: 'CapodannoKid',    punti: 9800,  metri: 3000, seed: true },
  { nome: 'FiocchiDiNeve',   punti: 7450,  metri: 2500, seed: true },
  { nome: 'ZampaDiRenna',    punti: 5200,  metri: 1900, seed: true },
  { nome: 'TorroneNero',     punti: 3900,  metri: 1500, seed: true },
  { nome: 'LucinaTimida',    punti: 2450,  metri: 1100, seed: true },
  { nome: 'PrimoVolo',       punti: 1200,  metri: 600,  seed: true },
];

/** Pezzi per il generatore di nickname casuali. */
const NOMI_A = ['Elfo', 'Renna', 'Slitta', 'Babbo', 'Grinch', 'Pupazzo', 'Cometa', 'Vischio', 'Torrone', 'Panettone', 'Fiocco', 'Ghiaccio'];
const NOMI_B = ['Veloce', 'Turbo', 'Glaciale', 'Scintilla', 'Razzo', 'Felice', 'Audace', 'Polare', 'Magico', 'Lampo'];

function loadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_ENTRIES) || '[]');
    return Array.isArray(raw) ? raw.filter(e => e && e.nome && e.punti >= 0) : [];
  } catch {
    return [];
  }
}

function saveLocal(entries) {
  try {
    localStorage.setItem(LS_ENTRIES, JSON.stringify(entries.slice(0, MAX_LOCAL)));
  } catch { /* storage pieno o non disponibile */ }
}

/** Pulisce un nickname: niente HTML, max 14 caratteri, niente vuoti. */
export function sanitizeName(nome) {
  const clean = String(nome || '').replace(/[<>&"'`]/g, '').trim().slice(0, 14);
  return clean || suggestName();
}

/** Propone un nickname casuale. */
export function suggestName() {
  const a = NOMI_A[Math.floor(Math.random() * NOMI_A.length)];
  const b = NOMI_B[Math.floor(Math.random() * NOMI_B.length)];
  return a + b + Math.floor(Math.random() * 90 + 10);
}

export function getPlayerName() {
  try { return localStorage.getItem(LS_NAME) || ''; } catch { return ''; }
}

export function setPlayerName(nome) {
  const clean = sanitizeName(nome);
  try { localStorage.setItem(LS_NAME, clean); } catch { /* ignora */ }
  return clean;
}

/** Classifica completa (seed + locali), ordinata per punti. */
export function getLeaderboard() {
  return [...SEEDS, ...loadLocal()]
    .sort((a, b) => b.punti - a.punti || b.metri - a.metri);
}

/**
 * Registra una partita e restituisce { pos, entry, board }.
 * pos è la posizione 1-based nella classifica aggiornata.
 */
export function submitScore(nome, punti, metri) {
  const entry = {
    nome: sanitizeName(nome),
    punti: Math.max(0, Math.floor(punti)),
    metri: Math.max(0, Math.floor(metri)),
    quando: new Date().toISOString().slice(0, 10),
  };
  const local = loadLocal();
  local.push(entry);
  // In locale tengo solo le migliori MAX_LOCAL partite
  local.sort((a, b) => b.punti - a.punti);
  saveLocal(local);

  const board = getLeaderboard();
  const pos = board.indexOf(entry) + 1 || board.findIndex(e =>
    e.nome === entry.nome && e.punti === entry.punti && e.metri === entry.metri) + 1;
  return { pos, entry, board };
}
