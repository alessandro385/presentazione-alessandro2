// Boss: guidato dai dati del livello (data/levels.js).
// Le fasi si attivano a soglie di HP e cambiano pattern d'attacco,
// cadenza e velocità. Ogni attacco è telegrafato da un bagliore.

import { clamp, lerp, rand, pick, TAU, angleTo } from '../core/utils.js';
import { audio } from '../core/audio.js';

const TELEGRAPH = 0.7; // secondi di preavviso prima di un attacco

// Registry dei pattern d'attacco del boss: piccole funzioni pure.
// Aggiungere un pattern = aggiungere una voce e citarla nei dati del livello.
const bossPatterns = {
  /** Ventaglio di colpi centrato sul giocatore. */
  ventaglio(b, g) {
    const aim = angleTo(b.x, b.y, g.player.x, g.player.y);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const a = aim + (i - (n - 1) / 2) * 0.24;
      g.fireEnemyShot(b.x, b.y + b.dimensione * 0.4, a, 195 * g.viewport.scale, b.colore);
    }
  },

  /** Raffica di 4 colpi mirati in successione. */
  raffica(b, g) {
    for (let i = 0; i < 3; i++) {
      b.schedule(i * 0.18, () => {
        const a = angleTo(b.x, b.y, g.player.x, g.player.y) + rand(-0.07, 0.07);
        g.fireEnemyShot(b.x, b.y + b.dimensione * 0.4, a, 225 * g.viewport.scale, b.colore);
      });
    }
  },

  /** Muro di ghiaccio: colpi su tutta la larghezza con 2 varchi. */
  muro(b, g) {
    const w = g.viewport.w;
    const step = 46 * g.viewport.scale;
    const cols = Math.floor(w / step);
    const gap1 = Math.floor(rand(1, cols - 4));
    const gap2 = clamp(gap1 + Math.floor(rand(3, 6)), 0, cols - 1);
    for (let i = 0; i < cols; i++) {
      if (Math.abs(i - gap1) <= 1 || Math.abs(i - gap2) <= 1) continue;
      const x = (i + 0.5) * step;
      g.fireEnemyShot(x, b.y + b.dimensione * 0.3, Math.PI / 2, 180 * g.viewport.scale, b.colore);
    }
  },

  /** Pioggia gelida: colpi casuali dall'alto per ~1.6 secondi. */
  pioggia(b, g) {
    const w = g.viewport.w;
    for (let i = 0; i < 11; i++) {
      b.schedule(i * 0.13, () => {
        const x = rand(0.05, 0.95) * w;
        const a = Math.PI / 2 + rand(-0.18, 0.18);
        g.fireEnemyShot(x, -10, a, rand(180, 250) * g.viewport.scale, b.colore);
      });
    }
  },

  /** Evoca scagnozzi a difesa del boss. */
  evocazione(b, g) {
    const w = g.viewport.w;
    const tipi = ['corvo', 'folletto'];
    for (let i = 0; i < 2; i++) {
      b.schedule(i * 0.3, () => {
        g.spawnEnemyById(pick(tipi), rand(0.15, 0.85) * w, false);
      });
    }
  },
};

export class Boss {
  /**
   * @param {object} data configurazione boss dal livello
   * @param {import('../core/viewport.js').Viewport} viewport
   */
  constructor(data, viewport) {
    this.data = data;
    this.vp = viewport;
    this.nome = data.nome;
    this.maxHp = data.hp;
    this.hp = data.hp;
    this.colore = data.colore;
    this.dimensione = data.dimensione * viewport.scale;
    this.x = viewport.w / 2;
    this.y = -this.dimensione * 2;
    this.targetY = viewport.h * 0.16;
    this.attivo = false;     // true quando è entrato in scena
    this.dead = false;
    this.eta = 0;
    this.faseIdx = 0;
    this.atkTimer = 3.2;     // respiro iniziale prima del primo attacco
    this.telegraphT = 0;     // > 0: attacco in arrivo
    this.pendingPattern = null;
    this.flash = 0;
    this._queue = [];        // azioni ritardate (raffiche, evocazioni)
    this._swayPhase = rand(0, TAU);
  }

  schedule(delay, fn) {
    this._queue.push({ delay, fn });
  }

  get fase() {
    return this.data.fasi[this.faseIdx];
  }

  /** @param {number} dt @param {import('../game.js').Game} game */
  update(dt, game) {
    if (this.dead) return;
    this.eta += dt;
    if (this.flash > 0) this.flash -= dt;
    this.dimensione = this.data.dimensione * this.vp.scale;

    // --- Coda di azioni ritardate ---
    for (let i = this._queue.length - 1; i >= 0; i--) {
      const q = this._queue[i];
      q.delay -= dt;
      if (q.delay <= 0) {
        q.fn();
        this._queue.splice(i, 1);
      }
    }

    // --- Entrata in scena ---
    if (!this.attivo) {
      this.y = Math.min(this.y + 120 * this.vp.scale * dt, this.targetY);
      if (this.y >= this.targetY) this.attivo = true;
      return;
    }

    // --- Cambio fase a soglie di HP ---
    const hpFrac = this.hp / this.maxHp;
    let idx = 0;
    for (let i = 0; i < this.data.fasi.length; i++) {
      if (hpFrac <= this.data.fasi[i].sotto) idx = i;
    }
    if (idx !== this.faseIdx) {
      this.faseIdx = idx;
      this.flash = 0.5;
      audio.play('bossPhase');
      game.shake.add(0.4);
      game.particles.explosion(this.x, this.y, this.colore, 26, 220);
      game.annuncio(this.nome, `Fase ${idx + 1}`);
    }

    // --- Movimento: oscillazione che accelera con le fasi ---
    // Ampiezza e frequenza contenute: il giocatore deve poter stare
    // sotto al boss per colpirlo (velocità di picco < velocità slitta).
    const f = this.fase;
    const freq = 0.55 * f.velocitaMult * (this.data.velocita / 100);
    const sway = Math.sin(this.eta * freq + this._swayPhase);
    const range = Math.min(this.vp.w * 0.32, this.vp.w * 0.5 - this.dimensione - 10);
    this.x = this.vp.w / 2 + sway * Math.max(range, 30);
    this.y = this.targetY + Math.sin(this.eta * 1.3) * 14 * this.vp.scale;

    // --- Ciclo di attacco con telegrafia ---
    if (this.telegraphT > 0) {
      this.telegraphT -= dt;
      if (this.telegraphT <= 0 && this.pendingPattern) {
        const pattern = bossPatterns[this.pendingPattern];
        if (pattern) pattern(this, game);
        this.pendingPattern = null;
        this.atkTimer = f.cooldown * rand(0.85, 1.15);
      }
      return;
    }
    this.atkTimer -= dt;
    if (this.atkTimer <= 0) {
      this.pendingPattern = pick(f.pattern);
      this.telegraphT = TELEGRAPH;
    }
  }

  takeDamage(dmg) {
    if (!this.attivo || this.dead) return false;
    this.hp -= dmg;
    this.flash = Math.max(this.flash, 0.12);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
    return true;
  }

  draw(ctx, t) {
    if (this.dead) return;
    const r = this.dimensione;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Telegrafia: anello che si stringe prima dell'attacco
    if (this.telegraphT > 0) {
      const p = 1 - this.telegraphT / TELEGRAPH;
      ctx.strokeStyle = `rgba(248,113,113,${0.35 + p * 0.55})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f87171';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, r * lerp(1.7, 1.05, p), 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Aura della fase
    const auraPulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.shadowColor = this.colore;
    ctx.shadowBlur = 24 + auraPulse * 14 + this.faseIdx * 6;

    const k = r / 60; // sprite progettato per raggio 60
    ctx.scale(k, k);

    // Mantello / corpo
    const grad = ctx.createLinearGradient(0, -20, 0, 58);
    grad.addColorStop(0, '#b91c1c');
    grad.addColorStop(1, '#450a0a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-44, 56);
    ctx.quadraticCurveTo(-50, 0, -26, -16);
    ctx.lineTo(26, -16);
    ctx.quadraticCurveTo(50, 0, 44, 56);
    ctx.quadraticCurveTo(0, 66, -44, 56);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Bordo di pelliccia
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-26, -14);
    ctx.quadraticCurveTo(0, -4, 26, -14);
    ctx.stroke();

    // Braccia che ondeggiano
    const arm = Math.sin(t * 2.2) * 6;
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(-44, 14 + arm, 10, 24, 0.5, 0, TAU);
    ctx.ellipse(44, 14 - arm, 10, 24, -0.5, 0, TAU);
    ctx.fill();
    // Artigli verdi
    ctx.fillStyle = this.colore;
    ctx.beginPath();
    ctx.arc(-48, 36 + arm, 7, 0, TAU);
    ctx.arc(48, 36 - arm, 7, 0, TAU);
    ctx.fill();

    // Testa verde del Grinch
    const headGrad = ctx.createRadialGradient(-8, -40, 6, 0, -34, 30);
    headGrad.addColorStop(0, this.colore);
    headGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(0, -34, 26, 24, 0, 0, TAU);
    ctx.fill();

    // Occhi cattivi (seguono leggermente il movimento)
    const look = Math.sin(this.eta * 0.7) * 3;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(-10 + look, -38, 6, 4.5, 0.18, 0, TAU);
    ctx.ellipse(10 + look, -38, 6, 4.5, -0.18, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(-10 + look, -38, 2.2, 0, TAU);
    ctx.arc(10 + look, -38, 2.2, 0, TAU);
    ctx.fill();
    // Sopracciglia
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, -47); ctx.lineTo(-4, -43);
    ctx.moveTo(18, -47); ctx.lineTo(4, -43);
    ctx.stroke();

    // Sorriso malefico
    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-14, -24);
    ctx.quadraticCurveTo(0, -14, 14, -26);
    ctx.stroke();

    // Cappello da Babbo Natale rubato
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-22, -50);
    ctx.quadraticCurveTo(0, -78, 24, -52);
    ctx.quadraticCurveTo(34, -64, 40, -56);
    ctx.lineTo(-22, -50);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(40, -56, 5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -52, 24, 5, 0.05, 0, TAU);
    ctx.fill();

    // Lampo bianco quando colpito
    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(this.flash * 5, 0.65);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 64, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}
