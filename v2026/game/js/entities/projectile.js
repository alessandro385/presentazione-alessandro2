// Proiettili come oggetti "piatti" gestiti da un Pool nel Game.
// Niente classi pesanti: init / update / draw.

import { TAU } from '../core/utils.js';

export function initShot(s, { x, y, vx, vy, r = 5, colore = '#e0f2fe', danno = 1, amico = true }) {
  s.x = x; s.y = y;
  s.vx = vx; s.vy = vy;
  s.r = r;
  s.colore = colore;
  s.danno = danno;
  s.amico = amico;
  s.eta = 0;
  s.dead = false;
  return s;
}

export function updateShot(s, dt, w, h) {
  s.eta += dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  if (s.y < -30 || s.y > h + 30 || s.x < -30 || s.x > w + 30) s.dead = true;
}

export function drawShot(ctx, s) {
  ctx.save();
  if (s.amico) {
    // Palla di neve con alone
    ctx.shadowColor = '#bae6fd';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#f0f9ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(186,230,253,0.7)';
    ctx.beginPath();
    ctx.arc(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.45, 0, TAU);
    ctx.fill();
  } else {
    // Scheggia di ghiaccio nemica, orientata lungo la velocità
    const a = Math.atan2(s.vy, s.vx);
    ctx.translate(s.x, s.y);
    ctx.rotate(a);
    ctx.shadowColor = s.colore;
    ctx.shadowBlur = 8;
    ctx.fillStyle = s.colore;
    ctx.beginPath();
    ctx.moveTo(s.r * 1.8, 0);
    ctx.lineTo(-s.r, s.r * 0.7);
    ctx.lineTo(-s.r * 0.4, 0);
    ctx.lineTo(-s.r, -s.r * 0.7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
