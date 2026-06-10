// Input unificato: tastiera (frecce/WASD + Spazio + P) e touch
// (joystick virtuale flottante a sinistra, pulsante fuoco a destra).
// I controlli touch compaiono solo quando viene rilevato un tocco.

import { clamp } from './utils.js';

const LS_AUTOFIRE = 'corsaBabbo2026.autofire';

export class Input {
  constructor() {
    this.ax = 0;            // asse orizzontale -1..1
    this.ay = 0;            // asse verticale -1..1
    this.fire = false;      // fuoco premuto (tastiera o touch)
    this.touchActive = false;
    this._pauseRequested = false;
    this._anyKeyRequested = false;

    this._keys = new Set();
    this._joyId = null;
    this._joyBaseX = 0;
    this._joyBaseY = 0;
    this._joyAx = 0;
    this._joyAy = 0;
    this._fireTouch = false;

    const saved = localStorage.getItem(LS_AUTOFIRE);
    this.autoFire = saved === null ? true : saved === '1';

    this._el = {
      layer: document.getElementById('touch-layer'),
      joyZone: document.getElementById('joystick-zone'),
      joyBase: document.getElementById('joystick-base'),
      joyKnob: document.getElementById('joystick-knob'),
      fireZone: document.getElementById('fire-zone'),
      fireBtn: document.getElementById('fire-btn'),
      pauseBtn: document.getElementById('pause-btn'),
    };

    this._bindKeyboard();
    this._bindTouch();
  }

  setAutoFire(v) {
    this.autoFire = v;
    localStorage.setItem(LS_AUTOFIRE, v ? '1' : '0');
  }

  /** Restituisce true una sola volta per ogni pressione di pausa. */
  consumePause() {
    const p = this._pauseRequested;
    this._pauseRequested = false;
    return p;
  }

  consumeAnyKey() {
    const p = this._anyKeyRequested;
    this._anyKeyRequested = false;
    return p;
  }

  showTouchControls(visible) {
    this._el.layer.classList.toggle('hidden', !(visible && this.touchActive));
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Mentre si scrive in un campo di testo (es. nome in classifica)
      // la tastiera appartiene al campo, non al gioco.
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.code;
      if (k === 'KeyP' || k === 'Escape') {
        this._pauseRequested = true;
        e.preventDefault();
        return;
      }
      if (k === 'Space' || k.startsWith('Arrow')) e.preventDefault();
      this._keys.add(k);
      this._anyKeyRequested = true;
      this._recomputeKeyboard();
    });
    window.addEventListener('keyup', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      this._keys.delete(e.code);
      this._recomputeKeyboard();
    });
    window.addEventListener('blur', () => {
      this._keys.clear();
      this._recomputeKeyboard();
    });
  }

  _recomputeKeyboard() {
    const k = this._keys;
    let x = 0;
    let y = 0;
    if (k.has('ArrowLeft') || k.has('KeyA')) x -= 1;
    if (k.has('ArrowRight') || k.has('KeyD')) x += 1;
    if (k.has('ArrowUp') || k.has('KeyW')) y -= 1;
    if (k.has('ArrowDown') || k.has('KeyS')) y += 1;
    this._kbAx = x;
    this._kbAy = y;
    this._kbFire = k.has('Space');
    this._merge();
  }

  _merge() {
    this.ax = clamp((this._kbAx || 0) + this._joyAx, -1, 1);
    this.ay = clamp((this._kbAy || 0) + this._joyAy, -1, 1);
    this.fire = !!this._kbFire || this._fireTouch ||
      (this.touchActive && this.autoFire && this._joyId !== null);
  }

  _bindTouch() {
    const el = this._el;

    const detectTouch = (e) => {
      if (e.pointerType === 'touch' && !this.touchActive) {
        this.touchActive = true;
      }
    };
    window.addEventListener('pointerdown', detectTouch, { passive: true });

    // --- Joystick flottante: la base appare dove tocchi ---
    el.joyZone.addEventListener('pointerdown', (e) => {
      if (this._joyId !== null) return;
      this._joyId = e.pointerId;
      this._joyBaseX = e.clientX;
      this._joyBaseY = e.clientY;
      el.joyBase.style.left = e.clientX + 'px';
      el.joyBase.style.top = e.clientY + 'px';
      el.joyBase.classList.remove('hidden');
      el.joyZone.setPointerCapture(e.pointerId);
      this._updateJoy(e.clientX, e.clientY);
    });
    el.joyZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this._joyId) return;
      this._updateJoy(e.clientX, e.clientY);
    });
    const joyEnd = (e) => {
      if (e.pointerId !== this._joyId) return;
      this._joyId = null;
      this._joyAx = 0;
      this._joyAy = 0;
      el.joyBase.classList.add('hidden');
      el.joyKnob.style.transform = '';
      this._merge();
    };
    el.joyZone.addEventListener('pointerup', joyEnd);
    el.joyZone.addEventListener('pointercancel', joyEnd);

    // --- Pulsante fuoco ---
    const fireOn = (e) => {
      e.preventDefault();
      this._fireTouch = true;
      el.fireBtn.classList.add('active');
      this._merge();
    };
    const fireOff = () => {
      this._fireTouch = false;
      el.fireBtn.classList.remove('active');
      this._merge();
    };
    el.fireBtn.addEventListener('pointerdown', fireOn);
    el.fireBtn.addEventListener('pointerup', fireOff);
    el.fireBtn.addEventListener('pointercancel', fireOff);
    el.fireBtn.addEventListener('pointerleave', fireOff);

    // --- Pulsante pausa ---
    el.pauseBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._pauseRequested = true;
    });
  }

  _updateJoy(cx, cy) {
    const R = 50; // raggio massimo del joystick in px
    let dx = cx - this._joyBaseX;
    let dy = cy - this._joyBaseY;
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    this._el.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    // Zona morta del 18% per evitare derive involontarie.
    const dead = 0.18;
    const nx = dx / R;
    const ny = dy / R;
    this._joyAx = Math.abs(nx) < dead ? 0 : nx;
    this._joyAy = Math.abs(ny) < dead ? 0 : ny;
    this._merge();
  }
}
