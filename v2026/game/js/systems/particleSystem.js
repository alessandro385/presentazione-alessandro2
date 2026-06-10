// ParticleSystem con object pooling e qualità adattiva:
// quando gli FPS calano, "quality" < 1 riduce il numero di particelle.

import { Pool } from '../core/pool.js';
import { rand, TAU } from '../core/utils.js';

const MAX_PARTICLES = 550;

export class ParticleSystem {
  constructor() {
    this.pool = new Pool(() => ({
      x: 0, y: 0, vx: 0, vy: 0, vita: 0, vitaMax: 1,
      size: 2, colore: '#fff', tipo: 'dot', grav: 0,
      testo: '', dead: false,
    }), 128);
    this.active = [];
    this.quality = 1; // 1 = pieno, scende con FPS bassi
  }

  _spawn(props) {
    if (this.active.length >= MAX_PARTICLES) return null;
    const p = this.pool.get();
    p.x = props.x; p.y = props.y;
    p.vx = props.vx || 0; p.vy = props.vy || 0;
    p.vitaMax = props.vita || 0.6;
    p.vita = p.vitaMax;
    p.size = props.size || 3;
    p.colore = props.colore || '#fff';
    p.tipo = props.tipo || 'dot';
    p.grav = props.grav || 0;
    p.testo = props.testo || '';
    p.dead = false;
    this.active.push(p);
    return p;
  }

  /** Esplosione radiale (distruzione nemico, impatto boss...). */
  explosion(x, y, colore, count = 16, speed = 160) {
    const n = Math.max(3, Math.round(count * this.quality));
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const v = rand(speed * 0.3, speed);
      this._spawn({
        x, y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        vita: rand(0.35, 0.8), size: rand(2, 5),
        colore, tipo: 'spark', grav: 120,
      });
    }
  }

  /** Sbuffo soffice (raccolta pickup, scudo). */
  puff(x, y, colore, count = 10) {
    const n = Math.max(2, Math.round(count * this.quality));
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const v = rand(20, 70);
      this._spawn({
        x, y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30,
        vita: rand(0.4, 0.9), size: rand(2, 4),
        colore, tipo: 'dot',
      });
    }
  }

  /** Scia dietro la slitta o i proiettili. */
  trail(x, y, colore, size = 3) {
    if (this.quality < 0.5 && Math.random() > 0.5) return;
    this._spawn({
      x: x + rand(-2, 2), y: y + rand(-2, 2),
      vx: rand(-12, 12), vy: rand(10, 36),
      vita: rand(0.25, 0.5), size, colore, tipo: 'dot',
    });
  }

  /** Testo fluttuante (punteggi, combo). */
  floater(x, y, testo, colore = '#fff') {
    this._spawn({
      x, y, vy: -54, vita: 0.95, size: 14,
      colore, tipo: 'text', testo,
    });
  }

  update(dt) {
    const arr = this.active;
    for (const p of arr) {
      p.vita -= dt;
      if (p.vita <= 0) { p.dead = true; continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.pool.sweep(arr);
  }

  draw(ctx) {
    for (const p of this.active) {
      const a = Math.max(p.vita / p.vitaMax, 0);
      if (p.tipo === 'text') {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.colore;
        ctx.font = `700 ${p.size}px Sora, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.testo, p.x, p.y);
      } else {
        ctx.globalAlpha = a * (p.tipo === 'spark' ? 1 : 0.8);
        ctx.fillStyle = p.colore;
        const s = p.size * (p.tipo === 'spark' ? a : 1);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(s, 0.5), 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    for (const p of this.active) this.pool.release(p);
    this.active.length = 0;
  }
}
