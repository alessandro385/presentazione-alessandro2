// HUD in DOM (glassmorphism): aggiorna solo gli elementi che cambiano,
// per non toccare il DOM a ogni frame inutilmente.

import { POWERUPS } from '../data/powerups.js';
import { formatScore } from '../core/utils.js';

export class Hud {
  constructor() {
    this.el = {
      root: document.getElementById('hud'),
      hearts: document.getElementById('hud-hearts'),
      levelName: document.getElementById('hud-level-name'),
      progressFill: document.getElementById('hud-progress-fill'),
      meters: document.getElementById('hud-meters'),
      score: document.getElementById('hud-score'),
      combo: document.getElementById('hud-combo'),
      powerups: document.getElementById('hud-powerups'),
      boss: document.getElementById('hud-boss'),
      bossName: document.getElementById('hud-boss-name'),
      bossFill: document.getElementById('hud-boss-fill'),
    };
    this._cache = {};
  }

  show() { this.el.root.classList.remove('hidden'); }
  hide() { this.el.root.classList.add('hidden'); }

  _set(key, value, apply) {
    if (this._cache[key] === value) return;
    this._cache[key] = value;
    apply(value);
  }

  /**
   * @param {object} s stato dell'HUD prodotto dal Game:
   * { vite, viteMax, punteggio, combo, nomeLivello, progresso, metri,
   *   powerups: {tipo: secondiRestanti}, boss: {nome, frac} | null }
   */
  update(s) {
    const el = this.el;

    this._set('vite', `${s.vite}/${s.viteMax}`, () => {
      let html = '';
      for (let i = 0; i < s.viteMax; i++) {
        html += `<span class="heart${i < s.vite ? '' : ' empty'}">&#9829;</span>`;
      }
      el.hearts.innerHTML = html;
    });

    this._set('nome', s.nomeLivello, (v) => { el.levelName.textContent = v; });
    this._set('prog', Math.round(s.progresso * 100), (v) => {
      el.progressFill.style.width = v + '%';
    });
    this._set('metri', Math.floor(s.metri), (v) => {
      el.meters.textContent = `${v} m`;
    });
    this._set('punti', s.punteggio, (v) => {
      el.score.textContent = formatScore(v);
    });

    this._set('combo', s.combo, (v) => {
      el.combo.classList.toggle('hidden', v < 2);
      if (v >= 2) el.combo.textContent = `COMBO ×${v}`;
    });

    // Chip dei power-up attivi (ricostruiti solo quando cambia il set)
    const puKey = Object.entries(s.powerups)
      .filter(([, t]) => t > 0)
      .map(([k, t]) => `${k}:${Math.ceil(t)}`)
      .join('|');
    this._set('pu', puKey, () => {
      let html = '';
      for (const [tipo, rest] of Object.entries(s.powerups)) {
        if (rest <= 0) continue;
        const def = POWERUPS[tipo];
        html += `<span class="pu-chip" style="color:${def.colore}">${def.etichetta} ${Math.ceil(rest)}s</span>`;
      }
      el.powerups.innerHTML = html;
    });

    // Barra del boss
    const bossKey = s.boss ? `${s.boss.nome}:${Math.round(s.boss.frac * 200)}` : 'no';
    this._set('boss', bossKey, () => {
      if (!s.boss) {
        el.boss.classList.add('hidden');
      } else {
        el.boss.classList.remove('hidden');
        el.bossName.textContent = s.boss.nome;
        el.bossFill.style.width = (s.boss.frac * 100) + '%';
      }
    });
  }
}
