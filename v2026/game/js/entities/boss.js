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

// ============================================================
// Sprite dei boss: ognuno disegnato per raggio 60 (la scala la
// applica Boss.draw). Aggiungere un boss = una funzione qui +
// `aspetto` nei dati del livello.
// ============================================================
const BOSS_SPRITES = {

  /** Il classico Grinch col cappello rubato (zona 1). */
  grinch(ctx, t, b) {
    const arm = Math.sin(t * 2.2) * 6;
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
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-26, -14);
    ctx.quadraticCurveTo(0, -4, 26, -14);
    ctx.stroke();
    // Braccia e artigli
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(-44, 14 + arm, 10, 24, 0.5, 0, TAU);
    ctx.ellipse(44, 14 - arm, 10, 24, -0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = b.colore;
    ctx.beginPath();
    ctx.arc(-48, 36 + arm, 7, 0, TAU);
    ctx.arc(48, 36 - arm, 7, 0, TAU);
    ctx.fill();
    grinchHead(ctx, b, 0);
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
  },

  /** Treant innevato: il Guardiano della Foresta (zona 2). */
  guardiano(ctx, t, b) {
    const sway = Math.sin(t * 1.6) * 4;
    // Radici
    ctx.fillStyle = '#3f2b1d';
    for (const [dx, ang] of [[-26, 0.5], [0, 0], [26, -0.5]]) {
      ctx.beginPath();
      ctx.ellipse(dx, 56, 9, 16, ang, 0, TAU);
      ctx.fill();
    }
    // Tronco
    const grad = ctx.createLinearGradient(0, -10, 0, 58);
    grad.addColorStop(0, '#6b4a2f');
    grad.addColorStop(1, '#33231a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-26, 54);
    ctx.quadraticCurveTo(-32, 6, -20, -18);
    ctx.lineTo(20, -18);
    ctx.quadraticCurveTo(32, 6, 26, 54);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Venature della corteccia
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2.5;
    for (const dx of [-12, 0, 12]) {
      ctx.beginPath();
      ctx.moveTo(dx, -10);
      ctx.quadraticCurveTo(dx + 4, 18, dx - 2, 48);
      ctx.stroke();
    }
    // Braccia-ramo
    ctx.strokeStyle = '#4a3423';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-22, 2);
    ctx.quadraticCurveTo(-46, -6 + sway, -54, 18 + sway);
    ctx.moveTo(22, 2);
    ctx.quadraticCurveTo(46, -6 - sway, 54, 18 - sway);
    ctx.stroke();
    // Ciuffi di foglie sulle mani
    ctx.fillStyle = b.colore;
    ctx.beginPath();
    ctx.arc(-54, 20 + sway, 10, 0, TAU);
    ctx.arc(54, 20 - sway, 10, 0, TAU);
    ctx.fill();
    // Chioma con neve
    const fol = ctx.createRadialGradient(-8, -50, 8, 0, -42, 36);
    fol.addColorStop(0, b.colore);
    fol.addColorStop(1, '#14532d');
    ctx.fillStyle = fol;
    ctx.beginPath();
    ctx.arc(-18, -38, 18, 0, TAU);
    ctx.arc(0, -52, 22, 0, TAU);
    ctx.arc(20, -38, 17, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(241,245,249,0.9)';
    ctx.beginPath();
    ctx.ellipse(-2, -64, 18, 6, -0.1, 0, TAU);
    ctx.ellipse(18, -48, 9, 4, 0.4, 0, TAU);
    ctx.fill();
    // Occhi ambra incassati nel tronco
    const look = Math.sin(b.eta * 0.7) * 3;
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(-10 + look, -8, 5, 6.5, 0, 0, TAU);
    ctx.ellipse(10 + look, -8, 5, 6.5, 0, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(-10 + look, -7, 2, 0, TAU);
    ctx.arc(10 + look, -7, 2, 0, TAU);
    ctx.fill();
    // Bocca-fessura
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, 10);
    ctx.quadraticCurveTo(0, 15, 8, 10);
    ctx.stroke();
  },

  /** Re di ghiaccio con corona: il Sindaco di Ghiaccio (zona 3). */
  sindaco(ctx, t, b) {
    const arm = Math.sin(t * 1.8) * 4;
    // Manto gelido
    const grad = ctx.createLinearGradient(0, -20, 0, 58);
    grad.addColorStop(0, '#1e3a8a');
    grad.addColorStop(1, '#0c1a45');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-42, 56);
    ctx.quadraticCurveTo(-48, 2, -24, -18);
    ctx.lineTo(24, -18);
    ctx.quadraticCurveTo(48, 2, 42, 56);
    ctx.quadraticCurveTo(0, 64, -42, 56);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Bordo di brina e bottoni
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-24, -16);
    ctx.quadraticCurveTo(0, -6, 24, -16);
    ctx.stroke();
    ctx.fillStyle = '#93c5fd';
    for (const dy of [4, 20, 36]) {
      ctx.beginPath();
      ctx.arc(0, dy, 3, 0, TAU);
      ctx.fill();
    }
    // Braccio con scettro di ghiaccio
    ctx.fillStyle = '#172e63';
    ctx.beginPath();
    ctx.ellipse(-42, 12 + arm, 9, 22, 0.5, 0, TAU);
    ctx.ellipse(42, 12 - arm, 9, 22, -0.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(46, 34 - arm);
    ctx.lineTo(54, -28 - arm);
    ctx.stroke();
    ctx.fillStyle = b.colore;
    ctx.shadowColor = b.colore;
    ctx.shadowBlur = 14;
    ctx.beginPath(); // gemma dello scettro
    ctx.moveTo(54, -42 - arm);
    ctx.lineTo(61, -30 - arm);
    ctx.lineTo(54, -18 - arm);
    ctx.lineTo(47, -30 - arm);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Testa pallida
    const head = ctx.createRadialGradient(-6, -40, 5, 0, -36, 26);
    head.addColorStop(0, '#e0eaff');
    head.addColorStop(1, '#93a8d8');
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.ellipse(0, -36, 22, 21, 0, 0, TAU);
    ctx.fill();
    // Barba di ghiaccio
    ctx.fillStyle = '#dbeafe';
    ctx.beginPath();
    ctx.moveTo(-18, -28);
    ctx.quadraticCurveTo(-10, -6, 0, -2);
    ctx.quadraticCurveTo(10, -6, 18, -28);
    ctx.closePath();
    ctx.fill();
    // Occhi severi
    const look = Math.sin(b.eta * 0.7) * 2.5;
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.ellipse(-9 + look, -40, 3.6, 4.6, 0, 0, TAU);
    ctx.ellipse(9 + look, -40, 3.6, 4.6, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-16, -48); ctx.lineTo(-4, -45);
    ctx.moveTo(16, -48); ctx.lineTo(4, -45);
    ctx.stroke();
    // Corona dorata
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(-18, -52);
    ctx.lineTo(-18, -66);
    ctx.lineTo(-9, -56);
    ctx.lineTo(0, -70);
    ctx.lineTo(9, -56);
    ctx.lineTo(18, -66);
    ctx.lineTo(18, -52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -58, 2.6, 0, TAU);
    ctx.fill();
  },

  /** Golem di roccia e ghiaccio: il Colosso delle Vette (zona 4). */
  colosso(ctx, t, b) {
    const breathe = Math.sin(t * 1.4) * 3;
    // Pugni enormi
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(-50, 30 + breathe, 16, 0, TAU);
    ctx.arc(50, 30 - breathe, 16, 0, TAU);
    ctx.fill();
    // Spalle-macigno
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(-34, -16, 20, 16, 0.3, 0, TAU);
    ctx.ellipse(34, -16, 20, 16, -0.3, 0, TAU);
    ctx.fill();
    // Torso massiccio
    const grad = ctx.createLinearGradient(0, -30, 0, 58);
    grad.addColorStop(0, '#64748b');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-38, 52);
    ctx.quadraticCurveTo(-44, -8, -28, -26);
    ctx.lineTo(28, -26);
    ctx.quadraticCurveTo(44, -8, 38, 52);
    ctx.quadraticCurveTo(0, 60, -38, 52);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Crepe nella roccia
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, -12); ctx.lineTo(-12, 6); ctx.lineTo(-18, 22);
    ctx.moveTo(18, -4); ctx.lineTo(12, 16); ctx.lineTo(20, 32);
    ctx.stroke();
    // Nucleo glaciale pulsante
    const pulse = 0.75 + 0.25 * Math.sin(t * 3);
    ctx.fillStyle = b.colore;
    ctx.shadowColor = b.colore;
    ctx.shadowBlur = 22 * pulse;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(10, 12);
    ctx.lineTo(0, 26);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Testa piccola incassata con visiera luminosa
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(0, -38, 15, 13, 0, 0, TAU);
    ctx.fill();
    const look = Math.sin(b.eta * 0.7) * 3;
    ctx.fillStyle = b.colore;
    ctx.shadowColor = b.colore;
    ctx.shadowBlur = 10;
    ctx.fillRect(-10 + look, -42, 20, 5);
    ctx.shadowBlur = 0;
    // Ghiaccioli sulle spalle
    ctx.fillStyle = '#bae6fd';
    for (const [dx, dy, h] of [[-40, -26, 12], [-26, -32, 9], [30, -30, 11], [42, -24, 8]]) {
      ctx.beginPath();
      ctx.moveTo(dx - 3, dy);
      ctx.lineTo(dx, dy + h);
      ctx.lineTo(dx + 3, dy);
      ctx.closePath();
      ctx.fill();
    }
  },

  /** Il Grinch finale: corona rubata, mantello e sacco di regali (zona 5). */
  grinchfinale(ctx, t, b) {
    const arm = Math.sin(t * 2.4) * 7;
    // Mantello svolazzante alle spalle
    const wave = Math.sin(t * 3) * 6;
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.moveTo(-30, -20);
    ctx.quadraticCurveTo(-66, 16 + wave, -50, 60);
    ctx.lineTo(-26, 50);
    ctx.moveTo(30, -20);
    ctx.quadraticCurveTo(66, 16 - wave, 50, 60);
    ctx.lineTo(26, 50);
    ctx.closePath();
    ctx.fill();
    // Corpo
    const grad = ctx.createLinearGradient(0, -20, 0, 58);
    grad.addColorStop(0, '#7f1d1d');
    grad.addColorStop(1, '#27060a');
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
    // Cintura col sacco dei regali rubati
    ctx.strokeStyle = '#0f0a06';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-40, 30);
    ctx.quadraticCurveTo(0, 40, 40, 30);
    ctx.stroke();
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(34, 46, 14, 17, -0.3, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(26, 32);
    ctx.quadraticCurveTo(34, 28, 42, 33);
    ctx.stroke();
    // Braccia e artigli
    ctx.fillStyle = '#581c1c';
    ctx.beginPath();
    ctx.ellipse(-44, 14 + arm, 10, 24, 0.5, 0, TAU);
    ctx.ellipse(44, 14 - arm, 10, 24, -0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = b.colore;
    ctx.beginPath();
    ctx.arc(-48, 36 + arm, 8, 0, TAU);
    ctx.arc(48, 36 - arm, 8, 0, TAU);
    ctx.fill();
    grinchHead(ctx, b, 1); // versione più arrabbiata
    // Corona di Natale rubata
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-17, -52);
    ctx.lineTo(-17, -64);
    ctx.lineTo(-8, -55);
    ctx.lineTo(0, -68);
    ctx.lineTo(8, -55);
    ctx.lineTo(17, -64);
    ctx.lineTo(17, -52);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(0, -57, 2.6, 0, TAU);
    ctx.fill();
  },
};

/** Testa del Grinch, riusata dal boss 1 e dal boss finale. */
function grinchHead(ctx, b, rabbia) {
  const headGrad = ctx.createRadialGradient(-8, -40, 6, 0, -34, 30);
  headGrad.addColorStop(0, b.colore);
  headGrad.addColorStop(1, '#14532d');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(0, -34, 26, 24, 0, 0, TAU);
  ctx.fill();
  const look = Math.sin(b.eta * 0.7) * 3;
  ctx.fillStyle = rabbia ? '#fecaca' : '#fef08a';
  ctx.beginPath();
  ctx.ellipse(-10 + look, -38, 6, 4.5, 0.18, 0, TAU);
  ctx.ellipse(10 + look, -38, 6, 4.5, -0.18, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.arc(-10 + look, -38, 2.2, 0, TAU);
  ctx.arc(10 + look, -38, 2.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#14532d';
  ctx.lineWidth = rabbia ? 4 : 3;
  ctx.beginPath();
  ctx.moveTo(-18, rabbia ? -49 : -47); ctx.lineTo(-4, -43);
  ctx.moveTo(18, rabbia ? -49 : -47); ctx.lineTo(4, -43);
  ctx.stroke();
  ctx.strokeStyle = '#052e16';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-14, -24);
  ctx.quadraticCurveTo(0, rabbia ? -10 : -14, 14, -26);
  ctx.stroke();
}

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

    // Ogni boss ha il suo aspetto (campo `aspetto` nei dati del livello)
    const sprite = BOSS_SPRITES[this.data.aspetto] || BOSS_SPRITES.grinch;
    sprite(ctx, t, this);

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
