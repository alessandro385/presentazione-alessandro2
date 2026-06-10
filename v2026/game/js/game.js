// Game: orchestratore. Macchina a stati (menu, playing, boss, transition,
// gameover, victory), entità, punteggio, combo, distanza e progressione
// dei 5 livelli. La logica dei contenuti vive nei file dati.

import { LEVELS } from './data/levels.js';
import { ENEMIES, resolveEnemy } from './data/enemies.js';
import { getSled } from './data/sleds.js';
import { POWERUP_DROP_TABLE } from './data/powerups.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { Boss } from './entities/boss.js';
import { Pickup } from './entities/pickup.js';
import { initShot, updateShot, drawShot } from './entities/projectile.js';
import { SpawnDirector } from './systems/spawnDirector.js';
import { CollisionSystem } from './systems/collisionSystem.js';
import { BackgroundSystem } from './systems/backgroundSystem.js';
import { ParticleSystem } from './systems/particleSystem.js';
import { ScreenShake } from './systems/screenShake.js';
import { Pool } from './core/pool.js';
import { clamp, lerp, rand, chance, weightedPick, formatScore } from './core/utils.js';
import { audio } from './core/audio.js';
import { Hud } from './ui/hud.js';
import { Screens } from './ui/screens.js';

const LS_HS_SCORE = 'corsaBabbo2026.hs.score';
const LS_HS_METERS = 'corsaBabbo2026.hs.meters';
const COMBO_WINDOW = 4; // secondi per mantenere la combo

export class Game {
  /**
   * @param {import('./core/viewport.js').Viewport} viewport
   * @param {import('./core/input.js').Input} input
   */
  constructor(viewport, input) {
    this.viewport = viewport;
    this.input = input;

    this.bg = new BackgroundSystem(viewport);
    this.particles = new ParticleSystem();
    this.shake = new ScreenShake();
    this.collisions = new CollisionSystem();
    this.spawner = new SpawnDirector(this);

    this.hud = new Hud();
    this.screens = new Screens({
      onStart: (sledId) => this.startRun(sledId),
      onResume: () => this.togglePause(),
      onRestart: () => this.startRun(this.lastSledId),
      onMenu: () => this.showMenu(),
    }, input);

    this.shotPool = new Pool(() => ({}), 48);
    this.shots = [];        // proiettili del giocatore
    this.enemyShots = [];   // proiettili nemici
    this.enemies = [];
    this.pickups = [];
    this.player = null;
    this.boss = null;

    this.state = 'menu';
    this.paused = false;
    this.t = 0;
    this.lastSledId = 'classica';
    this._frameAvg = 1 / 60;

    // Contesto condiviso passato a nemici e pickup (riusato, zero allocazioni)
    this._ctx = {
      w: 0, h: 0, scale: 1, player: null, magnete: false,
      fireEnemyShot: (x, y, a, v, col) => this.fireEnemyShot(x, y, a, v, col),
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this._inPlay() && !this.paused) this.togglePause();
    });

    this.showMenu();
  }

  _inPlay() {
    return this.state === 'playing' || this.state === 'boss' || this.state === 'transition';
  }

  // ====================== Flusso di gioco ======================

  showMenu() {
    this.state = 'menu';
    this.paused = false;
    this._clearWorld();
    this.hud.hide();
    this.input.showTouchControls(false);
    this.screens.showMenu(this._loadHighscore());
  }

  startRun(sledId) {
    audio.unlock();
    this.lastSledId = sledId;
    window.abTrack?.('gioco/partita-iniziata-' + sledId);
    this._clearWorld();

    this.player = new Player(getSled(sledId), this.viewport);
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.kills = 0;
    this.gifts = 0;
    this.totalMeters = 0;
    this.levelMeters = 0;
    this.levelIndex = 0;
    this.runTime = 0;
    this.endTimer = 0;
    this._endShown = false;

    this._applyLevel(0, true);
    this.state = 'playing';
    this.paused = false;
    this.screens.hideAllScreens();
    this.hud.show();
    this.input.showTouchControls(true);
  }

  _clearWorld() {
    for (const s of this.shots) this.shotPool.release(s);
    for (const s of this.enemyShots) this.shotPool.release(s);
    this.shots = [];
    this.enemyShots = [];
    this.enemies = [];
    this.pickups = [];
    this.boss = null;
    this.particles.clear();
    this.bg.clearDecor();
  }

  _applyLevel(i, instant = false) {
    this.levelIndex = i;
    this.levelMeters = 0;
    const lv = LEVELS[i];
    this.spawner.setLevel(lv);
    this.bg.setLevel(lv.sfondo, instant);
    this.annuncio(lv.nome, `Zona ${i + 1} di ${LEVELS.length}`);
  }

  get level() {
    return LEVELS[this.levelIndex];
  }

  get difficolta() {
    return 1 + this.totalMeters / 1500;
  }

  get moltiplicatore() {
    return this.player && this.player.powerups.x2 > 0 ? 2 : 1;
  }

  togglePause() {
    if (!this._inPlay()) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.screens.showPause({ nomeLivello: this.level.nome, punteggio: this.score });
      this.input.showTouchControls(false);
    } else {
      this.screens.hidePause();
      this.input.showTouchControls(true);
    }
  }

  // ====================== Update ======================

  update(dt) {
    if (this.input.consumePause()) this.togglePause();
    if (this.paused) return;
    this.t += dt;
    this.screens.update(dt);

    switch (this.state) {
      case 'menu':
        this.bg.update(dt, 0.5);
        this.particles.update(dt);
        return;

      case 'playing': {
        this.runTime += dt;
        // Avanzamento: ~16 m/s all'inizio (il livello 1 dura ~1 minuto),
        // fino a 26 m/s a fine campagna.
        const mps = Math.min(16 + (this.difficolta - 1) * 4, 26);
        this.levelMeters += mps * dt;
        this.totalMeters += mps * dt;
        const progress = this.levelMeters / this.level.lunghezzaMetri;
        this.spawner.update(dt, progress, this.difficolta);
        this.bg.update(dt, 1 + (this.difficolta - 1) * 0.12);
        this._updateWorld(dt);
        if (this.levelMeters >= this.level.lunghezzaMetri) this._enterBoss();
        break;
      }

      case 'boss': {
        this.runTime += dt;
        this.bg.update(dt, 0.4);
        this._updateWorld(dt);
        if (this.boss) {
          this.boss.update(dt, this);
          if (this.boss.dead) this._onBossDefeated();
        }
        break;
      }

      case 'transition': {
        this.runTime += dt;
        this.bg.update(dt, 0.8);
        this._updateWorld(dt);
        this.endTimer -= dt;
        if (this.endTimer <= 0) {
          if (this.levelIndex + 1 < LEVELS.length) {
            this._applyLevel(this.levelIndex + 1);
            this.state = 'playing';
          } else {
            this._victory();
          }
        }
        break;
      }

      case 'gameover':
      case 'victory': {
        this.bg.update(dt, 0.4);
        this._updateWorld(dt);
        this.endTimer -= dt;
        if (this.endTimer <= 0 && !this._endShown) {
          this._endShown = true;
          this.hud.hide();
          this.input.showTouchControls(false);
          const { stats, record } = this._buildEndStats();
          if (this.state === 'victory') this.screens.showVictory(stats, record);
          else this.screens.showGameOver(stats, record);
        }
        break;
      }
    }

    this._updateHud();
  }

  /** Aggiorna entità, proiettili, particelle e collisioni (comune a tutti gli stati di gioco). */
  _updateWorld(dt) {
    const { w, h, scale } = this.viewport;
    const c = this._ctx;
    c.w = w; c.h = h; c.scale = scale;
    c.player = this.player;
    c.magnete = !!(this.player && this.player.powerups.magnete > 0);

    if (this.player && !this.player.morto) {
      this.player.update(dt, this.input, this);
    }

    for (const e of this.enemies) e.update(dt, c);
    this.enemies = this.enemies.filter((e) => !e.dead);

    for (const s of this.shots) updateShot(s, dt, w, h);
    this.shotPool.sweep(this.shots);
    for (const s of this.enemyShots) updateShot(s, dt, w, h);
    this.shotPool.sweep(this.enemyShots);

    for (const k of this.pickups) k.update(dt, c);
    this.pickups = this.pickups.filter((k) => !k.dead);

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    this.particles.update(dt);
    this.shake.update(dt);
    this.collisions.run(this);
  }

  _enterBoss() {
    this.state = 'boss';
    this.boss = new Boss(this.level.boss, this.viewport);
    this.annuncio(this.level.boss.nome, 'Boss in arrivo!');
    audio.play('bossPhase');
    this.shake.add(0.3);
  }

  _onBossDefeated() {
    const b = this.boss;
    this.score += b.data.punti * this.moltiplicatore;
    this.particles.explosion(b.x, b.y, b.colore, 46, 320);
    this.particles.explosion(b.x, b.y, '#fbbf24', 30, 220);
    this.particles.floater(b.x, b.y, `+${formatScore(b.data.punti)}`, '#fbbf24');
    this.shake.add(0.8);
    audio.play('bossDown');

    // Il boss esplode in regali e un power-up
    for (let i = 0; i < 3; i++) {
      this.spawnPickup('regalo', b.x + rand(-70, 70), b.y + rand(-30, 30));
    }
    this.spawnPickup(null, b.x, b.y + 40);

    this.boss = null;
    this.enemyShots.forEach((s) => { s.dead = true; });

    if (this.levelIndex + 1 < LEVELS.length) {
      this.annuncio('Zona superata!', `Prossima: ${LEVELS[this.levelIndex + 1].nome}`);
    } else {
      this.annuncio('Il Grinch è sconfitto!', 'Il Natale è salvo');
    }
    this.state = 'transition';
    this.endTimer = 2.6;
  }

  _victory() {
    this.state = 'victory';
    this.endTimer = 1.6;
    this._endShown = false;
    window.abTrack?.('gioco/vittoria');
    audio.play('victory');
  }

  _gameOver() {
    this.state = 'gameover';
    this.endTimer = 1.6;
    this._endShown = false;
    window.abTrack?.('gioco/game-over-livello-' + (this.levelIndex + 1));
    audio.play('gameover');
  }

  // ====================== Spawn & fuoco ======================

  archetipoMovimento(id) {
    return ENEMIES[id] ? ENEMIES[id].movimento : 'straight';
  }

  spawnEnemyById(id, x, elite = false) {
    const cfg = resolveEnemy(id, {
      elite,
      difficolta: this.difficolta,
      scala: this.viewport.scale,
    });
    const e = new Enemy(cfg, clamp(x, cfg.dimensione, this.viewport.w - cfg.dimensione), -cfg.dimensione * 1.5);
    this.enemies.push(e);
    return e;
  }

  /** tipo null = power-up casuale dalla drop table. */
  spawnPickup(tipo, x, y) {
    const t = tipo || weightedPick(POWERUP_DROP_TABLE).tipo;
    this.pickups.push(new Pickup(t, clamp(x, 20, this.viewport.w - 20), y, this.viewport.scale));
  }

  firePlayerShot(x, y, vx, vy) {
    const s = this.shotPool.get();
    initShot(s, { x, y, vx, vy, r: 5.5 * this.viewport.scale, danno: 1, amico: true });
    this.shots.push(s);
  }

  fireEnemyShot(x, y, angolo, velocita, colore) {
    const s = this.shotPool.get();
    initShot(s, {
      x, y,
      vx: Math.cos(angolo) * velocita,
      vy: Math.sin(angolo) * velocita,
      r: 5 * this.viewport.scale,
      colore, danno: 1, amico: false,
    });
    this.enemyShots.push(s);
  }

  // ====================== Effetti delle collisioni ======================

  hitEnemy(e, danno, x, y, { silenzioso = false } = {}) {
    e.hp -= danno;
    e.flash = 0.15;
    if (e.hp > 0) {
      if (!silenzioso) {
        this.particles.puff(x, y, '#e0f2fe', 5);
        audio.play('hit');
      }
      return;
    }
    e.dead = true;
    this.kills++;
    const punti = e.punti * this.moltiplicatore;
    this.score += punti;
    this.particles.explosion(e.x, e.y, e.colore, e.elite ? 26 : 15);
    this.particles.floater(e.x, e.y, `+${punti}`, e.elite ? '#fbbf24' : '#e2e8f0');
    this.shake.add(e.elite ? 0.25 : 0.1);
    if (!silenzioso) audio.play('boom');

    // Drop: regali e power-up (gli élite sono più generosi)
    const dropGift = e.elite ? 0.6 : 0.2;
    const dropPower = e.elite ? 0.35 : 0.08;
    if (chance(dropGift)) this.spawnPickup('regalo', e.x, e.y);
    else if (chance(dropPower)) this.spawnPickup(null, e.x, e.y);
  }

  hitBoss(danno, x, y) {
    if (!this.boss || !this.boss.takeDamage(danno)) return;
    this.particles.puff(x, y, '#fecaca', 6);
    audio.play('hit');
  }

  playerHit() {
    const p = this.player;
    if (!p) return;
    const subito = p.takeHit();
    if (!subito) {
      // Lo scudo ha assorbito il colpo
      this.particles.explosion(p.x, p.y, '#818cf8', 18, 180);
      audio.play('hit');
      return;
    }
    this.combo = 0;
    this.comboTimer = 0;
    this.particles.explosion(p.x, p.y, '#f87171', 24, 240);
    this.shake.add(0.55);
    audio.play('hurt');
    if (p.morto) {
      this.particles.explosion(p.x, p.y, '#fbbf24', 40, 300);
      this.shake.add(0.9);
      this._gameOver();
    }
  }

  collectPickup(k) {
    const p = this.player;
    if (k.tipo === 'regalo') {
      this.gifts++;
      this.combo = Math.min(this.combo + 1, 10);
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.comboTimer = COMBO_WINDOW;
      const punti = 100 * Math.max(this.combo, 1) * this.moltiplicatore;
      this.score += punti;
      this.particles.puff(k.x, k.y, '#fbbf24', 12);
      this.particles.floater(k.x, k.y, this.combo >= 2 ? `+${punti} ×${this.combo}` : `+${punti}`, '#fbbf24');
      audio.play('gift');
    } else {
      p.applyPowerup(k.tipo);
      this.particles.explosion(k.x, k.y, '#22d3ee', 14, 160);
      this.particles.floater(k.x, k.y, this._nomePowerup(k.tipo), '#22d3ee');
      audio.play('power');
    }
  }

  _nomePowerup(tipo) {
    const nomi = {
      triplo: 'Sparo Triplo!', rapido: 'Fuoco Rapido!', scudo: 'Scudo!',
      vita: '+1 Vita!', x2: 'Punti ×2!', magnete: 'Magnete!',
    };
    return nomi[tipo] || tipo;
  }

  annuncio(titolo, sottotitolo) {
    this.screens.banner(titolo, sottotitolo);
  }

  // ====================== HUD & statistiche ======================

  _updateHud() {
    if (!this._inPlay() && this.state !== 'gameover' && this.state !== 'victory') return;
    const p = this.player;
    this.hud.update({
      vite: p ? Math.max(p.vite, 0) : 0,
      viteMax: p ? Math.max(p.sled.vite, p.vite) : 3,
      punteggio: this.score,
      combo: this.combo,
      nomeLivello: this.level.nome,
      progresso: clamp(this.levelMeters / this.level.lunghezzaMetri, 0, 1),
      metri: this.totalMeters,
      powerups: p ? p.powerups : {},
      boss: this.boss && this.boss.attivo
        ? { nome: this.boss.nome, frac: this.boss.hp / this.boss.maxHp }
        : null,
    });
  }

  _loadHighscore() {
    return {
      punteggio: parseInt(localStorage.getItem(LS_HS_SCORE) || '0', 10),
      metri: parseInt(localStorage.getItem(LS_HS_METERS) || '0', 10),
    };
  }

  _buildEndStats() {
    const hs = this._loadHighscore();
    const record = this.score > hs.punteggio;
    if (record) localStorage.setItem(LS_HS_SCORE, String(this.score));
    if (this.totalMeters > hs.metri) {
      localStorage.setItem(LS_HS_METERS, String(Math.floor(this.totalMeters)));
    }
    const min = Math.floor(this.runTime / 60);
    const sec = Math.floor(this.runTime % 60);
    return {
      record,
      stats: [
        ['Punteggio', formatScore(this.score)],
        ['Distanza', `${formatScore(Math.floor(this.totalMeters))} m`],
        ['Nemici sconfitti', formatScore(this.kills)],
        ['Regali raccolti', formatScore(this.gifts)],
        ['Combo massima', `×${this.maxCombo}`],
        ['Tempo', `${min}:${String(sec).padStart(2, '0')}`],
      ],
    };
  }

  // ====================== Render ======================

  render(alpha, rawDt) {
    // Qualità adattiva: media mobile del frame time
    this._frameAvg = lerp(this._frameAvg, rawDt, 0.04);
    const q = this._frameAvg > 0.032 ? 0.35 : this._frameAvg > 0.022 ? 0.65 : 1;
    this.particles.quality = q;
    this.bg.quality = q;

    const ctx = this.viewport.ctx;
    const { w, h } = this.viewport;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    const off = this.shake.getOffset();
    ctx.translate(off.x, off.y);

    this.bg.draw(ctx);

    if (this.state !== 'menu') {
      for (const k of this.pickups) k.draw(ctx, this.t);
      for (const e of this.enemies) e.draw(ctx, this.t);
      if (this.boss) this.boss.draw(ctx, this.t);
      if (this.player) this.player.draw(ctx, this.t);
      for (const s of this.shots) drawShot(ctx, s);
      for (const s of this.enemyShots) drawShot(ctx, s);
    }

    this.particles.draw(ctx);
    ctx.restore();
  }
}
