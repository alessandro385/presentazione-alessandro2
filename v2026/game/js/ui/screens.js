// Schermate DOM: menu con selezione slitta, pausa, game over, vittoria,
// banner degli annunci in gioco. Tutto in italiano.

import { SLEDS } from '../data/sleds.js';
import { drawSledSprite } from '../entities/player.js';
import { formatScore } from '../core/utils.js';
import { audio } from '../core/audio.js';
import { suggestName, getPlayerName, setPlayerName } from '../core/leaderboard.js';

export class Screens {
  /**
   * @param {object} handlers callback del Game:
   *  { onStart(sledId), onResume, onRestart, onMenu }
   * @param {import('../core/input.js').Input} input
   */
  constructor(handlers, input) {
    this.handlers = handlers;
    this.input = input;
    this.selectedSled = localStorage.getItem('corsaBabbo2026.sled') || 'classica';
    this._bannerTimer = 0;

    this.el = {
      menu: document.getElementById('screen-menu'),
      pause: document.getElementById('screen-pause'),
      gameover: document.getElementById('screen-gameover'),
      victory: document.getElementById('screen-victory'),
      banner: document.getElementById('banner'),
      bannerTitle: document.getElementById('banner-title'),
      bannerSub: document.getElementById('banner-sub'),
      sledCards: document.getElementById('sled-cards'),
      highscore: document.getElementById('menu-highscore'),
      hint: document.getElementById('menu-hint'),
      pauseInfo: document.getElementById('pause-info'),
      goStats: document.getElementById('go-stats'),
      goRecord: document.getElementById('go-record'),
      goPos: document.getElementById('go-pos'),
      goBoard: document.getElementById('go-board'),
      vicStats: document.getElementById('vic-stats'),
      vicRecord: document.getElementById('vic-record'),
      vicPos: document.getElementById('vic-pos'),
      vicBoard: document.getElementById('vic-board'),
      chkAutofire: document.getElementById('chk-autofire'),
      chkAudio: document.getElementById('chk-audio'),
      nameInput: document.getElementById('player-name'),
      btnDice: document.getElementById('btn-dice'),
      btnFs: document.getElementById('btn-fs'),
    };

    this._buildSledCards();
    this._bind();
  }

  _bind() {
    const h = this.handlers;
    const click = (id, fn) => document.getElementById(id).addEventListener('click', () => {
      audio.unlock();
      fn();
    });

    click('btn-start', () => {
      // Salva (e normalizza) il nome scelto prima di partire
      const nome = setPlayerName(this.el.nameInput.value);
      this.el.nameInput.value = nome;
      h.onStart(this.selectedSled);
    });
    click('btn-resume', h.onResume);
    click('btn-restart-pause', h.onRestart);
    click('btn-menu-pause', h.onMenu);
    click('btn-retry', h.onRestart);
    click('btn-menu-go', h.onMenu);
    click('btn-again', h.onRestart);
    click('btn-menu-vic', h.onMenu);

    this.el.chkAutofire.checked = this.input.autoFire;
    this.el.chkAutofire.addEventListener('change', (e) => {
      this.input.setAutoFire(e.target.checked);
    });

    this.el.chkAudio.checked = !audio.muted;
    this.el.chkAudio.addEventListener('change', (e) => {
      audio.unlock();
      audio.setMuted(!e.target.checked);
    });

    // Nome in classifica: precompilato, col dado per il nome casuale
    this.el.nameInput.value = getPlayerName() || suggestName();
    this.el.btnDice.addEventListener('click', () => {
      this.el.nameInput.value = suggestName();
    });

    // Schermo intero: pulsante sempre disponibile + icona aggiornata
    if (this.el.btnFs) {
      this.el.btnFs.addEventListener('click', () => h.onFullscreen?.());
      document.addEventListener('fullscreenchange', () => {
        const full = !!document.fullscreenElement;
        this.el.btnFs.textContent = full ? '⛶' : '⛶';
        this.el.btnFs.title = full ? 'Esci da schermo intero' : 'Schermo intero';
        this.el.btnFs.classList.toggle('fs-on', full);
      });
    }
  }

  /** Render della classifica con la posizione del giocatore evidenziata. */
  _renderBoard(posEl, boardEl, classifica) {
    if (!classifica) { posEl.textContent = ''; boardEl.innerHTML = ''; return; }
    const { pos, board } = classifica;
    posEl.innerHTML = pos > 0
      ? `Sei <strong>#${pos}</strong> in classifica su ${board.length} giocatori`
      : '';

    const TOP = 7;
    const rows = [];
    const fmt = (e, i) => {
      const me = i + 1 === pos;
      return `<li class="${me ? 'me' : ''}${e.seed ? '' : ' real'}">
        <span class="rank">${i + 1}</span>
        <span class="bname">${e.nome}</span>
        <span class="bpts">${formatScore(e.punti)}</span>
      </li>`;
    };
    board.slice(0, TOP).forEach((e, i) => rows.push(fmt(e, i)));
    if (pos > TOP) {
      rows.push('<li class="dots" aria-hidden="true">···</li>');
      rows.push(fmt(board[pos - 1], pos - 1));
    }
    boardEl.innerHTML = rows.join('');
  }

  _buildSledCards() {
    this.el.sledCards.innerHTML = '';
    for (const sled of SLEDS) {
      const card = document.createElement('button');
      card.className = 'sled-card';
      card.style.setProperty('--sled-color', sled.colore);
      if (sled.id === this.selectedSled) card.classList.add('selected');

      // Anteprima disegnata con lo stesso sprite procedurale del gioco
      const cv = document.createElement('canvas');
      cv.width = 176;
      cv.height = 112;
      const cx = cv.getContext('2d');
      cx.translate(88, 62);
      drawSledSprite(cx, 1.5, sled.colore, 0.4);

      const stats = Object.entries(sled.statistiche).map(([nome, val]) =>
        `<div class="sled-stat"><span>${nome}</span><span class="bar"><i style="width:${Math.round(val * 100)}%"></i></span></div>`
      ).join('');

      card.appendChild(cv);
      card.insertAdjacentHTML('beforeend', `
        <div class="sled-name">${sled.nome}</div>
        <div class="sled-desc">${sled.desc} Vite: ${sled.vite}.</div>
        <div class="sled-stats">${stats}</div>
      `);

      card.addEventListener('click', () => {
        this.selectedSled = sled.id;
        localStorage.setItem('corsaBabbo2026.sled', sled.id);
        for (const c of this.el.sledCards.children) c.classList.remove('selected');
        card.classList.add('selected');
      });

      this.el.sledCards.appendChild(card);
    }
  }

  _hideAll() {
    for (const k of ['menu', 'pause', 'gameover', 'victory']) {
      this.el[k].classList.add('hidden');
    }
  }

  showMenu({ punteggio, metri }) {
    this._hideAll();
    if (punteggio > 0) {
      this.el.highscore.textContent =
        `Record: ${formatScore(punteggio)} punti · ${formatScore(metri)} m`;
    } else {
      this.el.highscore.textContent = 'Nessun record... ancora.';
    }
    if (this.input.touchActive) {
      this.el.hint.textContent = 'Joystick a sinistra per muoverti · pulsante a destra per sparare';
    }
    this.el.menu.classList.remove('hidden');
  }

  showPause({ nomeLivello, punteggio }) {
    this._hideAll();
    this.el.pauseInfo.textContent = `${nomeLivello} · ${formatScore(punteggio)} punti`;
    this.el.pause.classList.remove('hidden');
  }

  hidePause() {
    this.el.pause.classList.add('hidden');
  }

  _renderStats(el, stats) {
    el.innerHTML = stats.map(([nome, valore]) =>
      `<div><dt>${nome}</dt><dd>${valore}</dd></div>`).join('');
  }

  showGameOver(stats, nuovoRecord, classifica) {
    this._hideAll();
    this._renderStats(this.el.goStats, stats);
    this.el.goRecord.classList.toggle('hidden', !nuovoRecord);
    this._renderBoard(this.el.goPos, this.el.goBoard, classifica);
    this.el.gameover.classList.remove('hidden');
  }

  showVictory(stats, nuovoRecord, classifica) {
    this._hideAll();
    this._renderStats(this.el.vicStats, stats);
    this.el.vicRecord.classList.toggle('hidden', !nuovoRecord);
    this._renderBoard(this.el.vicPos, this.el.vicBoard, classifica);
    this.el.victory.classList.remove('hidden');
  }

  hideAllScreens() {
    this._hideAll();
  }

  /** Banner di annuncio in gioco (zona, boss, eventi). */
  banner(titolo, sottotitolo = '') {
    const el = this.el.banner;
    el.classList.remove('hidden', 'banner-out');
    this.el.bannerTitle.textContent = titolo;
    this.el.bannerSub.textContent = sottotitolo;
    this._bannerTimer = 2.2;
  }

  update(dt) {
    if (this._bannerTimer > 0) {
      this._bannerTimer -= dt;
      if (this._bannerTimer <= 0) {
        this.el.banner.classList.add('banner-out');
        setTimeout(() => this.el.banner.classList.add('hidden'), 450);
      }
    }
  }
}
