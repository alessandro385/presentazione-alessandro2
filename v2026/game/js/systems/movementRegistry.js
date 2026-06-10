// Registry dei comportamenti di movimento dei nemici: piccole funzioni pure.
// Ogni funzione riceve (e, dt, c) dove:
//   e = il nemico (stato mutabile, può usare campi propri come e._fase)
//   c = contesto { w, h, scale, player }
// Aggiungere un movimento = aggiungere una funzione qui e citarla nei dati.

import { clamp } from '../core/utils.js';

export const movementRegistry = {
  /** Discesa in linea retta. */
  straight(e, dt) {
    e.y += e.velocita * dt;
  },

  /** Discesa con oscillazione sinusoidale orizzontale. */
  sine(e, dt, c) {
    e.y += e.velocita * dt;
    const amp = (e.ampiezza || 50) * c.scale;
    const freq = e.frequenza || 1.5;
    e.x = clamp(e.baseX + Math.sin(e.eta * freq) * amp, e.dimensione, c.w - e.dimensione);
  },

  /** Zigzag: inverte la direzione orizzontale a intervalli regolari. */
  zigzag(e, dt, c) {
    e.y += e.velocita * dt;
    if (e._dirX === undefined) {
      e._dirX = Math.random() < 0.5 ? -1 : 1;
      e._zigTimer = 0.7;
    }
    e._zigTimer -= dt;
    if (e._zigTimer <= 0) {
      e._dirX *= -1;
      e._zigTimer = 0.55 + Math.random() * 0.4;
    }
    e.x += e._dirX * e.velocita * 1.3 * dt;
    if (e.x < e.dimensione) { e.x = e.dimensione; e._dirX = 1; }
    if (e.x > c.w - e.dimensione) { e.x = c.w - e.dimensione; e._dirX = -1; }
  },

  /** Picchiata: scende lentamente, mira il giocatore e si lancia. */
  dive(e, dt, c) {
    if (e._fase === undefined) e._fase = 0;
    if (e._fase === 0) {
      e.y += e.velocita * 0.55 * dt;
      if (e.y > c.h * 0.22) {
        e._fase = 1;
        // Blocca la direzione verso la posizione attuale del giocatore.
        const dx = c.player.x - e.x;
        const dy = Math.max(c.player.y - e.y, 60);
        const len = Math.hypot(dx, dy) || 1;
        e._dvx = (dx / len) * e.velocita * 2.6;
        e._dvy = (dy / len) * e.velocita * 2.6;
      }
    } else {
      e.x += e._dvx * dt;
      e.y += e._dvy * dt;
    }
  },

  /** Hover: si posiziona in alto, plana lateralmente, poi riparte in discesa. */
  hover(e, dt, c) {
    if (e._targetY === undefined) {
      e._targetY = c.h * (0.14 + Math.random() * 0.16);
      e._hoverT = 0;
    }
    if (e.y < e._targetY) {
      e.y += e.velocita * 1.6 * dt;
    } else {
      e._hoverT += dt;
      e.x = clamp(
        e.baseX + Math.sin(e._hoverT * 0.9 + e.seme) * c.w * 0.18,
        e.dimensione, c.w - e.dimensione
      );
      // Dopo un po' abbandona la posizione e scende: niente nemici eterni.
      if (e._hoverT > 9) e.y += e.velocita * 1.2 * dt;
    }
  },
};
