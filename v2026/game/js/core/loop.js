// Game loop: update a timestep fisso (determinismo della fisica)
// e render agganciato a requestAnimationFrame.

export class GameLoop {
  /**
   * @param {(dt:number)=>void} update chiamato a passi fissi di 1/60s
   * @param {(alpha:number, rawDt:number)=>void} render chiamato una volta per frame
   */
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.step = 1 / 60;
    this.acc = 0;
    this.last = 0;
    this.running = false;
    this._raf = 0;
    this._frame = (t) => this._tick(t);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    this._raf = requestAnimationFrame(this._frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  _tick(t) {
    if (!this.running) return;
    // Cap a 250ms: evita la "spirale della morte" dopo tab inattiva.
    const rawDt = Math.min((t - this.last) / 1000, 0.25);
    this.last = t;
    this.acc += rawDt;
    let safety = 6;
    while (this.acc >= this.step && safety-- > 0) {
      this.update(this.step);
      this.acc -= this.step;
    }
    if (safety <= 0) this.acc = 0;
    this.render(this.acc / this.step, rawDt);
    this._raf = requestAnimationFrame(this._frame);
  }
}
