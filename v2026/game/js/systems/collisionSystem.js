// CollisionSystem: tutte le collisioni circle-vs-circle del gioco.
// Non decide gli effetti: chiama i callback del Game (hitEnemy, playerHit...).

import { dist2 } from '../core/utils.js';

export function circleHit(ax, ay, ar, bx, by, br) {
  const r = ar + br;
  return dist2(ax, ay, bx, by) < r * r;
}

export class CollisionSystem {
  /** @param {import('../game.js').Game} game */
  run(game) {
    const p = game.player;

    // --- Palle di neve vs nemici / boss ---
    for (const s of game.shots) {
      if (s.dead) continue;
      for (const e of game.enemies) {
        if (e.dead) continue;
        if (circleHit(s.x, s.y, s.r, e.x, e.y, e.dimensione * 0.9)) {
          s.dead = true;
          game.hitEnemy(e, s.danno, s.x, s.y);
          break;
        }
      }
      if (s.dead) continue;
      const b = game.boss;
      if (b && !b.dead && b.attivo &&
          circleHit(s.x, s.y, s.r, b.x, b.y, b.dimensione * 0.85)) {
        s.dead = true;
        game.hitBoss(s.danno, s.x, s.y);
      }
    }

    if (!p || p.morto) return;
    const pr = p.raggio * 0.78; // hitbox generosa verso il giocatore

    if (p.invulnerabile <= 0) {
      // --- Nemici vs giocatore (scontro fisico) ---
      for (const e of game.enemies) {
        if (e.dead) continue;
        if (circleHit(p.x, p.y, pr, e.x, e.y, e.dimensione * 0.85)) {
          game.hitEnemy(e, 999, e.x, e.y, { silenzioso: true });
          game.playerHit();
          break;
        }
      }
      // --- Proiettili nemici vs giocatore ---
      if (p.invulnerabile <= 0) {
        for (const s of game.enemyShots) {
          if (s.dead) continue;
          if (circleHit(p.x, p.y, pr, s.x, s.y, s.r)) {
            s.dead = true;
            game.playerHit();
            break;
          }
        }
      }
      // --- Corpo del boss vs giocatore ---
      const b = game.boss;
      if (p.invulnerabile <= 0 && b && !b.dead && b.attivo &&
          circleHit(p.x, p.y, pr, b.x, b.y, b.dimensione * 0.8)) {
        game.playerHit();
      }
    }

    // --- Pickup vs giocatore (raggio di raccolta ampio) ---
    for (const k of game.pickups) {
      if (k.dead) continue;
      if (circleHit(p.x, p.y, p.raggio * 1.5, k.x, k.y, k.raggio)) {
        k.dead = true;
        game.collectPickup(k);
      }
    }
  }
}
