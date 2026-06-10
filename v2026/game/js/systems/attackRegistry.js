// Registry dei comportamenti di attacco dei nemici.
// Ogni funzione riceve (e, dt, c) dove c offre:
//   c.player           il giocatore (per la mira)
//   c.fireEnemyShot(x, y, angolo, velocita, colore)
//   c.w, c.h, c.scale
// I timer vivono sul nemico stesso (e._atkTimer, e._burst*).

import { angleTo, rand } from '../core/utils.js';

const SHOT_SPEED = 190; // px/s a scala 1

/** Spara solo se il nemico è visibile nella parte alta/media dello schermo. */
function canShoot(e, c) {
  return e.y > e.dimensione && e.y < c.h * 0.72;
}

function readyTimer(e, dt) {
  if (e._atkTimer === undefined) e._atkTimer = e.attaccoCd * rand(0.4, 1.0);
  e._atkTimer -= dt;
  if (e._atkTimer > 0) return false;
  e._atkTimer = e.attaccoCd * rand(0.85, 1.2);
  return true;
}

export const attackRegistry = {
  /** Colpo singolo mirato verso il giocatore. */
  aimed(e, dt, c) {
    if (!readyTimer(e, dt) || !canShoot(e, c)) return;
    const a = angleTo(e.x, e.y, c.player.x, c.player.y);
    c.fireEnemyShot(e.x, e.y, a, SHOT_SPEED * c.scale, e.proiettile || e.colore);
  },

  /** Ventaglio di 3 colpi verso il basso. */
  spread(e, dt, c) {
    if (!readyTimer(e, dt) || !canShoot(e, c)) return;
    const base = Math.PI / 2; // verso il basso
    for (const off of [-0.38, 0, 0.38]) {
      c.fireEnemyShot(e.x, e.y, base + off, SHOT_SPEED * 0.92 * c.scale, e.proiettile || e.colore);
    }
  },

  /** Raffica: 3 colpi mirati in rapida successione. */
  burst(e, dt, c) {
    if (e._burstLeft > 0) {
      e._burstTimer -= dt;
      if (e._burstTimer <= 0 && canShoot(e, c)) {
        const a = angleTo(e.x, e.y, c.player.x, c.player.y) + rand(-0.08, 0.08);
        c.fireEnemyShot(e.x, e.y, a, SHOT_SPEED * 1.05 * c.scale, e.proiettile || e.colore);
        e._burstLeft--;
        e._burstTimer = 0.16;
      }
      return;
    }
    if (readyTimer(e, dt) && canShoot(e, c)) {
      e._burstLeft = 3;
      e._burstTimer = 0;
    }
  },
};
