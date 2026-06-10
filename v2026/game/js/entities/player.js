// Player: la slitta di Babbo Natale. Statistiche guidate dai dati in
// data/sleds.js, power-up a tempo, sprite disegnato proceduralmente.

import { clamp, TAU } from '../core/utils.js';
import { POWERUPS } from '../data/powerups.js';
import { audio } from '../core/audio.js';

const BASE_SPEED = 330;     // px/s a scala 1
const FIRE_CD = 0.27;       // secondi tra un colpo e l'altro
const SHOT_SPEED = 540;
const MAX_LIVES = 6;

export class Player {
  constructor(sled, viewport) {
    this.sled = sled;
    this.vp = viewport;
    this.reset();
  }

  reset() {
    const { w, h, scale } = this.vp;
    this.x = w / 2;
    this.y = h * 0.82;
    this.raggio = 26 * scale;
    this.vite = this.sled.vite;
    this.morto = false;
    this.invulnerabile = 0;
    this.fireTimer = 0;
    this.tilt = 0;
    this.powerups = { triplo: 0, rapido: 0, scudo: 0, x2: 0, magnete: 0, gelo: 0 };
  }

  /** @param {number} dt @param {import('../core/input.js').Input} input @param {import('../game.js').Game} game */
  update(dt, input, game) {
    if (this.morto) return;
    const { w, h, scale } = this.vp;
    this.raggio = 26 * scale;

    const speed = BASE_SPEED * this.sled.velocita * scale;
    this.x += input.ax * speed * dt;
    this.y += input.ay * speed * dt;
    this.x = clamp(this.x, this.raggio, w - this.raggio);
    this.y = clamp(this.y, h * 0.35, h - this.raggio * 0.9);

    // Inclinazione visiva in curva
    this.tilt += (input.ax * 0.22 - this.tilt) * Math.min(dt * 10, 1);

    if (this.invulnerabile > 0) this.invulnerabile -= dt;
    for (const k in this.powerups) {
      if (this.powerups[k] > 0) this.powerups[k] -= dt;
    }

    // Fuoco
    this.fireTimer -= dt;
    if (input.fire && this.fireTimer <= 0) {
      this._fire(game);
    }

    // Scia della slitta
    if (game.particles.quality > 0.3) {
      game.particles.trail(this.x - 14 * scale, this.y + 12 * scale, 'rgba(165,180,252,0.8)', 2.5);
    }
  }

  _fire(game) {
    const scale = this.vp.scale;
    const rapido = this.powerups.rapido > 0 ? 0.55 : 1;
    this.fireTimer = (FIRE_CD / this.sled.fuoco) * rapido;
    const vy = -SHOT_SPEED * scale;
    const sy = this.y - this.raggio;
    game.firePlayerShot(this.x, sy, 0, vy);
    if (this.powerups.triplo > 0) {
      game.firePlayerShot(this.x, sy, -SHOT_SPEED * 0.3 * scale, vy * 0.94);
      game.firePlayerShot(this.x, sy, SHOT_SPEED * 0.3 * scale, vy * 0.94);
    }
    audio.play('shoot');
  }

  /** Restituisce true se il colpo è stato davvero subito (no scudo/invuln). */
  takeHit() {
    if (this.invulnerabile > 0 || this.morto) return false;
    if (this.powerups.scudo > 0) {
      this.powerups.scudo = 0;
      this.invulnerabile = 1.2;
      return false;
    }
    this.vite--;
    this.invulnerabile = 2.2;
    if (this.vite <= 0) this.morto = true;
    return true;
  }

  applyPowerup(tipo) {
    if (tipo === 'vita') {
      this.vite = Math.min(this.vite + 1, MAX_LIVES);
      return;
    }
    const def = POWERUPS[tipo];
    if (def) this.powerups[tipo] = def.durata;
  }

  draw(ctx, t) {
    if (this.morto) return;
    // Lampeggio durante l'invulnerabilità
    if (this.invulnerabile > 0 && Math.floor(t * 12) % 2 === 0) return;

    const s = this.vp.scale;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.tilt);

    // Scudo attivo: bolla luminosa
    if (this.powerups.scudo > 0) {
      const pulse = 0.85 + 0.15 * Math.sin(t * 6);
      ctx.strokeStyle = `rgba(129,140,248,${0.7 * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, this.raggio * 1.45 * pulse, 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Magnete attivo: anello verde tratteggiato
    if (this.powerups.magnete > 0) {
      ctx.strokeStyle = 'rgba(52,211,153,0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, this.raggio * 1.9, t * 2, t * 2 + TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawSledSprite(ctx, s, this.sled.colore, t);
    ctx.restore();
  }
}

/**
 * Sprite procedurale della slitta (usato anche per le anteprime nel menu).
 * Disegna centrato in (0,0); "scale" 1 = circa 64px di larghezza.
 */
export function drawSledSprite(ctx, scale, colore, t = 0) {
  ctx.save();
  ctx.scale(scale, scale);

  // Bagliore sotto la slitta
  ctx.shadowColor = colore;
  ctx.shadowBlur = 18;

  // Pattini
  ctx.strokeStyle = '#fcd34d';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-26, 18);
  ctx.quadraticCurveTo(-34, 18, -34, 10);
  ctx.lineTo(-34, 8);
  ctx.moveTo(-26, 18);
  ctx.lineTo(26, 18);
  ctx.quadraticCurveTo(34, 18, 34, 10);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Corpo della slitta
  const grad = ctx.createLinearGradient(0, -6, 0, 14);
  grad.addColorStop(0, colore);
  grad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-30, 2);
  ctx.quadraticCurveTo(-32, 14, -22, 14);
  ctx.lineTo(22, 14);
  ctx.quadraticCurveTo(34, 14, 32, 0);
  ctx.quadraticCurveTo(31, -6, 24, -6);
  ctx.lineTo(-24, -4);
  ctx.quadraticCurveTo(-29, -4, -30, 2);
  ctx.closePath();
  ctx.fill();
  // Bordo dorato
  ctx.strokeStyle = '#fcd34d';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Sacco dei regali
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.ellipse(14, -10, 11, 9, -0.25, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.ellipse(11, -13, 6, 4.5, -0.3, 0, TAU);
  ctx.fill();

  // Babbo Natale: corpo, viso, cappello
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.ellipse(-8, -8, 9, 10, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fde8d8';
  ctx.beginPath();
  ctx.arc(-8, -18, 6, 0, TAU);
  ctx.fill();
  // Barba
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(-8, -15.5, 5, 0.2, Math.PI - 0.2);
  ctx.fill();
  // Cappello (ondeggia leggermente)
  const flop = Math.sin(t * 5) * 1.2;
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(-14, -20);
  ctx.quadraticCurveTo(-8, -30, -1, -21);
  ctx.lineTo(-2 + flop, -28);
  ctx.lineTo(-14, -20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-1.5 + flop, -28, 2.4, 0, TAU);
  ctx.fill();
  // Fascia bianca del cappello
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(-8, -21.5, 7, 2.4, -0.12, 0, TAU);
  ctx.fill();

  ctx.restore();
}
