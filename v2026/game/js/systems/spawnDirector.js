// SpawnDirector: regista delle ondate.
// Legge la tabella spawn del livello (puri dati), applica la curva di
// difficoltà legata alla distanza percorsa, decide élite e formazioni,
// gestisce gli eventi speciali (es. pioggia di regali) e lo spawn
// periodico di regali e power-up.

import { clamp, lerp, rand, chance, weightedPick } from '../core/utils.js';

export class SpawnDirector {
  /** @param {import('../game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.level = null;
    this.reset();
  }

  reset() {
    this.timer = 1.2;
    this.giftTimer = rand(4, 7);
    this.powerupTimer = rand(11, 16);
    this.eventsFired = new Set();
    this.queue = []; // spawn ritardati: { delay, fn }
  }

  setLevel(level) {
    this.level = level;
    this.reset();
  }

  /**
   * @param {number} dt
   * @param {number} progress avanzamento nel livello 0..1
   * @param {number} difficolta scala globale (cresce con la distanza totale)
   */
  update(dt, progress, difficolta) {
    if (!this.level) return;
    const g = this.game;
    const w = g.viewport.w;

    // --- Coda di spawn ritardati (formazioni, eventi) ---
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const q = this.queue[i];
      q.delay -= dt;
      if (q.delay <= 0) {
        q.fn();
        this.queue.splice(i, 1);
      }
    }

    // --- Spawn nemici: intervallo che si accorcia lungo il livello ---
    this.timer -= dt;
    if (this.timer <= 0) {
      const sp = this.level.spawn;
      const base = lerp(sp.intervalloIniziale, sp.intervalloFinale, clamp(progress, 0, 1));
      this.timer = (base / Math.min(1 + (difficolta - 1) * 0.25, 1.8)) * rand(0.7, 1.3);

      const entry = weightedPick(sp.tabella);
      const elite = chance(clamp(0.03 + (difficolta - 1) * 0.04 + progress * 0.08, 0, 0.28));

      if (!elite && chance(0.16) && this._isFormationFriendly(entry.id)) {
        this._spawnFormation(entry.id, w);
      } else {
        g.spawnEnemyById(entry.id, rand(0.08, 0.92) * w, elite);
      }
    }

    // --- Regali periodici ---
    this.giftTimer -= dt;
    if (this.giftTimer <= 0) {
      this.giftTimer = rand(5, 9);
      g.spawnPickup('regalo', rand(0.1, 0.9) * w, -30);
    }

    // --- Power-up periodici ---
    this.powerupTimer -= dt;
    if (this.powerupTimer <= 0) {
      this.powerupTimer = rand(13, 19);
      g.spawnPickup(null, rand(0.12, 0.88) * w, -30); // null = pesca dalla drop table
    }

    // --- Eventi speciali del livello ---
    for (const ev of this.level.eventi || []) {
      const key = `${ev.tipo}@${ev.at}`;
      if (progress >= ev.at && !this.eventsFired.has(key)) {
        this.eventsFired.add(key);
        this._fireEvent(ev);
      }
    }
  }

  _isFormationFriendly(id) {
    // Le formazioni hanno senso solo per chi scende in modo prevedibile.
    const mov = this.game.archetipoMovimento(id);
    return mov === 'straight' || mov === 'sine';
  }

  /** Formazioni: fila orizzontale o cuneo a V dello stesso archetipo. */
  _spawnFormation(id, w) {
    const g = this.game;
    const cx = rand(0.25, 0.75) * w;
    const gap = 60 * g.viewport.scale;
    if (chance(0.5)) {
      // Fila di 3 con piccolo scarto temporale
      for (let i = -1; i <= 1; i++) {
        const x = clamp(cx + i * gap, 20, w - 20);
        this.queue.push({ delay: 0.12 * (i + 1), fn: () => g.spawnEnemyById(id, x, false) });
      }
    } else {
      // Cuneo a V di 5
      for (let i = -2; i <= 2; i++) {
        const x = clamp(cx + i * gap * 0.8, 20, w - 20);
        this.queue.push({ delay: Math.abs(i) * 0.22, fn: () => g.spawnEnemyById(id, x, false) });
      }
    }
  }

  _fireEvent(ev) {
    const g = this.game;
    if (ev.tipo === 'pioggiaRegali') {
      g.annuncio('Pioggia di regali!', 'Raccoglili tutti per la combo');
      const w = g.viewport.w;
      for (let i = 0; i < 8; i++) {
        this.queue.push({
          delay: i * 0.35,
          fn: () => g.spawnPickup('regalo', rand(0.08, 0.92) * w, -30),
        });
      }
    }
  }
}
