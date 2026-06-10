// Pickup: regali (combo) e power-up. Disegnati proceduralmente,
// attratti dal giocatore quando il magnete è attivo.

import { TAU, rand } from '../core/utils.js';
import { POWERUPS } from '../data/powerups.js';

const FALL_SPEED = 80; // px/s a scala 1

export class Pickup {
  /** @param {string} tipo 'regalo' oppure una chiave di POWERUPS */
  constructor(tipo, x, y, scale) {
    this.tipo = tipo;
    this.x = x;
    this.y = y;
    this.raggio = (tipo === 'regalo' ? 16 : 18) * scale;
    this.vy = FALL_SPEED * scale * rand(0.9, 1.2);
    this.vx = 0;
    this.seme = rand(0, TAU);
    this.eta = 0;
    this.dead = false;
    // Colore del regalo scelto una volta sola
    this.colReg = ['#f87171', '#22d3ee', '#34d399', '#a78bfa'][Math.floor(rand(0, 4))];
  }

  /** @param {object} c contesto { h, scale, player, magnete } */
  update(dt, c) {
    this.eta += dt;

    // Magnete: i pickup vengono risucchiati verso la slitta
    if (c.magnete && c.player && !c.player.morto) {
      const dx = c.player.x - this.x;
      const dy = c.player.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 260 * c.scale && d > 1) {
        const pull = 420 * c.scale;
        this.vx += (dx / d) * pull * dt * 2.2;
        this.vy += (dy / d) * pull * dt * 2.2;
      }
    } else {
      this.vx *= 0.95;
    }

    this.x += this.vx * dt + Math.sin(this.eta * 2 + this.seme) * 18 * dt;
    this.y += this.vy * dt;
    if (this.y > c.h + 40) this.dead = true;
  }

  draw(ctx, t) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const bob = Math.sin(t * 3 + this.seme) * 0.12;
    ctx.rotate(bob);
    const k = this.raggio / 16;
    ctx.scale(k, k);

    if (this.tipo === 'regalo') {
      // Pacco regalo con fiocco
      ctx.shadowColor = this.colReg;
      ctx.shadowBlur = 12;
      ctx.fillStyle = this.colReg;
      ctx.fillRect(-12, -10, 24, 22);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(-2.5, -10, 5, 22);
      ctx.fillRect(-12, -2, 24, 4.5);
      // Fiocco
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-4, -13, 3.5, 0, TAU);
      ctx.arc(4, -13, 3.5, 0, TAU);
      ctx.stroke();
    } else {
      const def = POWERUPS[this.tipo];
      const col = def ? def.colore : '#fff';
      // Capsula esagonale luminosa
      const pulse = 0.85 + 0.15 * Math.sin(t * 5 + this.seme);
      ctx.shadowColor = col;
      ctx.shadowBlur = 16 * pulse;
      ctx.fillStyle = 'rgba(10,14,26,0.85)';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i / 6) * TAU;
        const px = Math.cos(a) * 15;
        const py = Math.sin(a) * 15;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Glifo del power-up
      this._glifo(ctx, col);
    }
    ctx.restore();
  }

  _glifo(ctx, col) {
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    switch (this.tipo) {
      case 'triplo': // tre frecce verso l'alto
        for (const dx of [-6, 0, 6]) {
          ctx.beginPath();
          ctx.moveTo(dx, 6); ctx.lineTo(dx, -5);
          ctx.moveTo(dx - 2.5, -2); ctx.lineTo(dx, -5); ctx.lineTo(dx + 2.5, -2);
          ctx.stroke();
        }
        break;
      case 'rapido': // fulmine
        ctx.beginPath();
        ctx.moveTo(2, -8); ctx.lineTo(-4, 1); ctx.lineTo(0, 1); ctx.lineTo(-2, 8); ctx.lineTo(5, -2); ctx.lineTo(1, -2);
        ctx.closePath();
        ctx.fill();
        break;
      case 'scudo': // scudo
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.quadraticCurveTo(8, -6, 7, 0);
        ctx.quadraticCurveTo(6, 6, 0, 9);
        ctx.quadraticCurveTo(-6, 6, -7, 0);
        ctx.quadraticCurveTo(-8, -6, 0, -8);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'vita': // cuore
        ctx.beginPath();
        ctx.moveTo(0, 7);
        ctx.bezierCurveTo(-9, 0, -7, -8, 0, -3);
        ctx.bezierCurveTo(7, -8, 9, 0, 0, 7);
        ctx.fill();
        break;
      case 'x2': // ×2
        ctx.font = '800 13px Sora, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×2', 0, 1);
        break;
      case 'magnete': // ferro di cavallo
        ctx.beginPath();
        ctx.arc(0, -1, 6.5, Math.PI * 0.15, Math.PI * 0.85, true);
        ctx.stroke();
        ctx.fillRect(-8.2, 2, 4, 5);
        ctx.fillRect(4.2, 2, 4, 5);
        break;
      case 'gelo': // fiocco di neve
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
          ctx.moveTo(Math.cos(a) * 5 - Math.cos(a + 1.1) * 2.6, Math.sin(a) * 5 - Math.sin(a + 1.1) * 2.6);
          ctx.lineTo(Math.cos(a) * 5, Math.sin(a) * 5);
          ctx.lineTo(Math.cos(a) * 5 - Math.cos(a - 1.1) * 2.6, Math.sin(a) * 5 - Math.sin(a - 1.1) * 2.6);
          ctx.stroke();
        }
        break;
      case 'bomba': // bomba con miccia accesa
        ctx.beginPath();
        ctx.arc(0, 2, 6.5, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2.5, -3.5);
        ctx.quadraticCurveTo(5.5, -7.5, 8, -6.5);
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(8.4, -6.8, 2, 0, TAU);
        ctx.fill();
        break;
    }
  }
}
