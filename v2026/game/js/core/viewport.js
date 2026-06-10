// Gestione del canvas responsive con supporto devicePixelRatio.
// Le coordinate di gioco sono in pixel CSS; "scale" adatta le dimensioni
// delle entità alla grandezza dello schermo (portrait o landscape).

import { clamp } from './utils.js';

export class Viewport {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.scale = 1;
    this._listeners = [];

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => {
      // Alcuni browser mobili aggiornano le dimensioni con un frame di ritardo.
      setTimeout(() => this.resize(), 60);
    });
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // DPR limitato a 2: oltre non si nota e costa molto in fill-rate.
    this.dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // Fattore di scala logico: 1 su uno schermo ~700px, ridotto sui telefoni.
    this.scale = clamp(Math.min(w, h) / 700, 0.55, 1.4);
    for (const fn of this._listeners) fn(this);
  }

  onResize(fn) {
    this._listeners.push(fn);
  }
}
