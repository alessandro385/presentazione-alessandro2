// Enemy: entità interamente guidata dai dati (data/enemies.js).
// Il movimento e l'attacco sono delegati ai registry: questa classe
// non conosce i singoli archetipi, solo come disegnarne lo sprite.

import { movementRegistry } from '../systems/movementRegistry.js';
import { attackRegistry } from '../systems/attackRegistry.js';
import { TAU, rand } from '../core/utils.js';

export class Enemy {
  /** @param {object} cfg configurazione risolta da resolveEnemy() */
  constructor(cfg, x, y) {
    Object.assign(this, cfg);
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.eta = 0;
    this.seme = rand(0, TAU);
    this.maxHp = this.hp;
    this.flash = 0; // lampo bianco quando colpito
    this.dead = false;
  }

  /** @param {number} dt @param {object} c contesto { w, h, scale, player, fireEnemyShot } */
  update(dt, c) {
    this.eta += dt;
    if (this.flash > 0) this.flash -= dt;

    const move = movementRegistry[this.movimento];
    if (move) move(this, dt, c);

    if (this.attacco !== 'none') {
      const atk = attackRegistry[this.attacco];
      if (atk) atk(this, dt, c);
    }

    // Fuori schermo in basso o molto ai lati: rimosso senza punti.
    if (this.y > c.h + this.dimensione * 2 ||
        this.x < -this.dimensione * 3 || this.x > c.w + this.dimensione * 3) {
      this.dead = true;
    }
  }

  draw(ctx, t) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const r = this.dimensione;

    // Anello dorato per le varianti élite
    if (this.elite) {
      ctx.strokeStyle = 'rgba(251,191,36,0.85)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.25, t * 1.5 + this.seme, t * 1.5 + this.seme + TAU * 0.8);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    this._sprite(ctx, t, r);

    // Lampo bianco quando colpito
    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(this.flash * 6, 0.7);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Barretta HP solo per nemici resistenti già danneggiati
    if (this.maxHp >= 3 && this.hp < this.maxHp) {
      const bw = r * 1.6;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(-bw / 2, -r - 10, bw, 4);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(-bw / 2, -r - 10, bw * (this.hp / this.maxHp), 4);
    }

    ctx.restore();
  }

  _sprite(ctx, t, r) {
    const k = r / 26; // gli sprite sono progettati per raggio 26
    ctx.scale(k, k);
    switch (this.spriteId) {
      case 'tree': {
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(14, -8); ctx.lineTo(7, -8);
        ctx.lineTo(20, 12); ctx.lineTo(-20, 12);
        ctx.lineTo(-7, -8); ctx.lineTo(-14, -8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = this.colore;
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(11, -9); ctx.lineTo(5, -9);
        ctx.lineTo(16, 9); ctx.lineTo(-16, 9);
        ctx.lineTo(-5, -9); ctx.lineTo(-11, -9);
        ctx.closePath();
        ctx.fill();
        // Neve sulla punta e tronco
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(0, -25, 4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(-4, 12, 8, 8);
        // Occhi arrabbiati
        this._angryEyes(ctx, -6, -2, 6, -2, '#fbbf24');
        break;
      }
      case 'snowman': {
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.arc(0, 8, 16, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -12, 11, 0, TAU);
        ctx.fill();
        // Cappello a cilindro
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-9, -26, 18, 4);
        ctx.fillRect(-6, -36, 12, 11);
        // Occhi e naso carota
        this._angryEyes(ctx, -4.5, -14, 4.5, -14, '#0f172a');
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.moveTo(0, -12); ctx.lineTo(0, -8); ctx.lineTo(7, -9);
        ctx.closePath();
        ctx.fill();
        // Bottoni
        ctx.fillStyle = '#334155';
        for (const by of [2, 9]) {
          ctx.beginPath(); ctx.arc(0, by, 1.8, 0, TAU); ctx.fill();
        }
        break;
      }
      case 'elf': {
        // Corpo
        ctx.fillStyle = this.colore;
        ctx.beginPath();
        ctx.ellipse(0, 6, 11, 13, 0, 0, TAU);
        ctx.fill();
        // Viso
        ctx.fillStyle = '#fde8d8';
        ctx.beginPath();
        ctx.arc(0, -8, 8, 0, TAU);
        ctx.fill();
        // Orecchie a punta
        ctx.fillStyle = '#fbd0b0';
        ctx.beginPath();
        ctx.moveTo(-8, -10); ctx.lineTo(-14, -14); ctx.lineTo(-7, -5);
        ctx.moveTo(8, -10); ctx.lineTo(14, -14); ctx.lineTo(7, -5);
        ctx.fill();
        // Cappello con punta che dondola
        const sw = Math.sin(t * 6 + this.seme) * 2;
        ctx.fillStyle = '#7c3aed';
        ctx.beginPath();
        ctx.moveTo(-8, -13);
        ctx.quadraticCurveTo(0, -20, 8, -13);
        ctx.lineTo(10 + sw, -24);
        ctx.closePath();
        ctx.fill();
        this._angryEyes(ctx, -3.5, -9, 3.5, -9, '#312e81');
        // Sogghigno
        ctx.strokeStyle = '#9a3412';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, -5.5, 3.4, 0.25, Math.PI - 0.25);
        ctx.stroke();
        break;
      }
      case 'crow': {
        const flap = Math.sin(t * 14 + this.seme) * 10;
        ctx.fillStyle = '#334155';
        // Ali
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.quadraticCurveTo(-18, -6 - flap, -26, 2 - flap);
        ctx.quadraticCurveTo(-16, 6, -4, 5);
        ctx.moveTo(4, 0);
        ctx.quadraticCurveTo(18, -6 - flap, 26, 2 - flap);
        ctx.quadraticCurveTo(16, 6, 4, 5);
        ctx.fill();
        // Corpo
        ctx.fillStyle = this.colore;
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 12, 0, 0, TAU);
        ctx.fill();
        // Becco verso il basso
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-3, 10); ctx.lineTo(3, 10); ctx.lineTo(0, 17);
        ctx.closePath();
        ctx.fill();
        // Occhi
        ctx.fillStyle = '#f87171';
        ctx.beginPath(); ctx.arc(-3.5, 4, 1.7, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(3.5, 4, 1.7, 0, TAU); ctx.fill();
        break;
      }
      case 'drone': {
        const spin = t * 2.4 + this.seme;
        // Anello rotante
        ctx.strokeStyle = this.colore;
        ctx.lineWidth = 3;
        ctx.shadowColor = this.colore;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 19, spin, spin + TAU * 0.7);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Cristallo esagonale
        ctx.fillStyle = '#0e7490';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = spin * 0.5 + (i / 6) * TAU;
          const px = Math.cos(a) * 12;
          const py = Math.sin(a) * 12;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Nucleo pulsante
        ctx.fillStyle = '#cffafe';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5 + Math.sin(t * 8) * 1.2, 0, TAU);
        ctx.fill();
        break;
      }
      case 'icicle': {
        ctx.rotate(Math.sin(this.seme) * 0.18);
        const g = ctx.createLinearGradient(0, -18, 0, 26);
        g.addColorStop(0, '#bae6fd');
        g.addColorStop(1, this.colore);
        ctx.fillStyle = g;
        ctx.shadowColor = this.colore;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-9, -18);
        ctx.lineTo(9, -18);
        ctx.lineTo(3, 4);
        ctx.lineTo(0, 26);
        ctx.lineTo(-3, 4);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        // Riflesso
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(-4, -15); ctx.lineTo(-1, -15); ctx.lineTo(-2, 6); ctx.lineTo(-4, 2);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'orb':
      default: {
        // Sfera oscura con nucleo e satelliti
        const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, 24);
        g.addColorStop(0, '#4338ca');
        g.addColorStop(0.6, '#1e1b4b');
        g.addColorStop(1, '#0f0c29');
        ctx.fillStyle = g;
        ctx.shadowColor = this.colore;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Occhio centrale
        ctx.fillStyle = '#818cf8';
        ctx.beginPath();
        ctx.arc(0, 0, 7 + Math.sin(t * 5 + this.seme) * 1.5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, TAU);
        ctx.fill();
        // Scintille orbitanti
        ctx.fillStyle = '#a5b4fc';
        for (let i = 0; i < 3; i++) {
          const a = t * 3 + this.seme + (i / 3) * TAU;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 26, Math.sin(a) * 26 * 0.4, 2, 0, TAU);
          ctx.fill();
        }
        break;
      }
    }
  }

  _angryEyes(ctx, x1, y1, x2, y2, colore) {
    ctx.fillStyle = colore;
    ctx.beginPath(); ctx.arc(x1, y1, 2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x2, y2, 2, 0, TAU); ctx.fill();
    // Sopracciglia inclinate
    ctx.strokeStyle = colore;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1 - 2.5, y1 - 4.5); ctx.lineTo(x1 + 2.5, y1 - 2.5);
    ctx.moveTo(x2 + 2.5, y2 - 4.5); ctx.lineTo(x2 - 2.5, y2 - 2.5);
    ctx.stroke();
  }
}
