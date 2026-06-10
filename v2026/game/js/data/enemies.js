// Archetipi dei nemici: PURI DATI.
// Aggiungere un nemico = aggiungere una voce qui (movimento e attacco
// vengono risolti dai registry in js/systems/).
//
//  hp        punti vita base
//  velocita  discesa in px/s (a scala 1)
//  punti     punteggio alla distruzione
//  dimensione raggio di collisione in px (a scala 1)
//  movimento chiave in movementRegistry: straight | sine | zigzag | dive | hover
//  attacco   chiave in attackRegistry:   none | aimed | spread | burst
//  spriteId  forma procedurale disegnata da entities/enemy.js

export const ENEMIES = {
  albero: {
    id: 'albero', nome: 'Abete Vagante',
    hp: 1, velocita: 70, punti: 50, dimensione: 26,
    movimento: 'straight', attacco: 'none',
    spriteId: 'tree', colore: '#34d399',
  },
  pupazzo: {
    id: 'pupazzo', nome: 'Pupazzo Burbero',
    hp: 2, velocita: 55, punti: 80, dimensione: 28,
    movimento: 'sine', attacco: 'none',
    spriteId: 'snowman', colore: '#e2e8f0',
    ampiezza: 60, frequenza: 1.6,
  },
  folletto: {
    id: 'folletto', nome: 'Folletto Dispettoso',
    hp: 2, velocita: 85, punti: 120, dimensione: 22,
    movimento: 'zigzag', attacco: 'aimed',
    spriteId: 'elf', colore: '#a78bfa',
    attaccoCd: 2.4, proiettile: '#c4b5fd',
  },
  corvo: {
    id: 'corvo', nome: 'Corvo Gelido',
    hp: 1, velocita: 95, punti: 150, dimensione: 20,
    movimento: 'dive', attacco: 'none',
    spriteId: 'crow', colore: '#94a3b8',
  },
  drone: {
    id: 'drone', nome: 'Drone di Ghiaccio',
    hp: 3, velocita: 45, punti: 200, dimensione: 26,
    movimento: 'hover', attacco: 'spread',
    spriteId: 'drone', colore: '#22d3ee',
    attaccoCd: 2.9, proiettile: '#67e8f9',
  },
  stalattite: {
    id: 'stalattite', nome: 'Stalattite Impazzita',
    hp: 1, velocita: 175, punti: 90, dimensione: 16,
    movimento: 'straight', attacco: 'none',
    spriteId: 'icicle', colore: '#7dd3fc',
  },
  globo: {
    id: 'globo', nome: 'Globo Oscuro',
    hp: 5, velocita: 35, punti: 300, dimensione: 32,
    movimento: 'sine', attacco: 'burst',
    spriteId: 'orb', colore: '#6366f1',
    attaccoCd: 3.4, proiettile: '#818cf8',
    ampiezza: 40, frequenza: 1.0,
  },
};

// Modificatori applicati alle varianti élite (più rare, brillano d'oro).
export const ELITE_MOD = {
  hpMult: 2.5,
  velocitaMult: 1.15,
  puntiMult: 3,
  dimensioneMult: 1.2,
};

/**
 * Risolve un archetipo in una configurazione concreta, applicando
 * la variante élite e la scala di difficoltà (cresce con la distanza).
 */
export function resolveEnemy(id, { elite = false, difficolta = 1, scala = 1 } = {}) {
  const base = ENEMIES[id];
  if (!base) throw new Error(`Archetipo nemico sconosciuto: ${id}`);
  const m = elite ? ELITE_MOD : { hpMult: 1, velocitaMult: 1, puntiMult: 1, dimensioneMult: 1 };
  const diffSpeed = 1 + (difficolta - 1) * 0.12;
  const diffHp = 1 + Math.floor((difficolta - 1) / 2) * 0.5;
  return {
    ...base,
    elite,
    hp: Math.max(1, Math.round(base.hp * m.hpMult * diffHp)),
    velocita: base.velocita * m.velocitaMult * diffSpeed * scala,
    punti: Math.round(base.punti * m.puntiMult),
    dimensione: base.dimensione * m.dimensioneMult * scala,
    attaccoCd: base.attaccoCd ? base.attaccoCd / Math.min(diffSpeed, 1.4) : 0,
  };
}
