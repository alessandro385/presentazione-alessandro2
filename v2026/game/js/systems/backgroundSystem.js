// BackgroundSystem: cielo a gradiente, stelle, aurora boreale animata,
// due layer di decorazioni parallax (silhouette per livello) e neve.
// Al cambio livello la palette fa crossfade fluido e le nuove decorazioni
// subentrano naturalmente dall'alto.

import { clamp, lerp, rand, TAU } from '../core/utils.js';

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(lerp(ca[0], cb[0], t));
  const g = Math.round(lerp(ca[1], cb[1], t));
  const bl = Math.round(lerp(ca[2], cb[2], t));
  return `rgb(${r},${g},${bl})`;
}

const DEFAULT_BG = {
  cieloTop: '#0a0e1a', cieloBottom: '#1c2547',
  decor: 'villaggio', decorColori: ['#161e3c', '#243260'],
  luci: '#fbbf24', aurora: ['#34d399', '#22d3ee'],
  auroraIntensita: 0.3, neve: 0.5,
};

export class BackgroundSystem {
  constructor(viewport) {
    this.vp = viewport;
    this.current = DEFAULT_BG;
    this.next = null;
    this.transT = 1; // 1 = transizione completata
    this.t = 0;
    this.quality = 1;

    this.stars = [];
    this.flakes = [];
    // Due layer parallax: lontano (lento, scuro) e vicino (più rapido).
    this.layers = [
      { items: [], speed: 0.22, alpha: 0.55, timer: 0, interval: [1.6, 3.2], colorIdx: 0, sMin: 0.5, sMax: 0.8 },
      { items: [], speed: 0.5, alpha: 0.9, timer: 0, interval: [2.0, 4.0], colorIdx: 1, sMin: 0.8, sMax: 1.25 },
    ];

    viewport.onResize(() => this._regen());
    this._regen();
  }

  _regen() {
    const { w, h } = this.vp;
    this.stars = [];
    const nStars = Math.round((w * h) / 9000);
    for (let i = 0; i < nStars; i++) {
      this.stars.push({
        x: Math.random() * w, y: Math.random() * h * 0.85,
        r: rand(0.4, 1.4), ph: rand(0, TAU), sp: rand(0.5, 2),
      });
    }
    this._syncFlakes(true);
  }

  _targetFlakeCount() {
    const { w, h } = this.vp;
    const intensita = this.next ? lerp(this.current.neve, this.next.neve, this.transT) : this.current.neve;
    return Math.round(((w * h) / 14000) * intensita * this.quality) + 8;
  }

  _syncFlakes(reset = false) {
    const { w, h } = this.vp;
    const target = this._targetFlakeCount();
    if (reset) this.flakes.length = 0;
    while (this.flakes.length < target) {
      this.flakes.push({
        x: Math.random() * w, y: Math.random() * h,
        z: rand(0.3, 1), ph: rand(0, TAU),
      });
    }
    if (this.flakes.length > target) this.flakes.length = target;
  }

  /** Cambia la palette del livello; instant=true al primo avvio. */
  setLevel(sfondo, instant = false) {
    if (instant || !this.current) {
      this.current = sfondo;
      this.next = null;
      this.transT = 1;
    } else {
      // Se c'era già una transizione in corso, consolida prima.
      if (this.next) this.current = this.next;
      this.next = sfondo;
      this.transT = 0;
    }
    this._syncFlakes();
  }

  /** Palette effettiva corrente (con crossfade durante la transizione). */
  _bg() {
    if (!this.next) return this.current;
    return this.transT >= 0.5 ? this.next : this.current;
  }

  _mix(key) {
    if (!this.next) return this.current[key];
    return mixHex(this.current[key], this.next[key], this.transT);
  }

  update(dt, speedMult = 1) {
    this.t += dt;
    if (this.next) {
      this.transT = Math.min(this.transT + dt / 2.2, 1);
      if (this.transT >= 1) {
        this.current = this.next;
        this.next = null;
      }
    }

    const { w, h, scale } = this.vp;
    const worldSpeed = 130 * scale * speedMult;

    // --- Decorazioni parallax ---
    const decorType = this._bg().decor;
    for (const layer of this.layers) {
      for (const it of layer.items) it.y += worldSpeed * layer.speed * dt;
      layer.items = layer.items.filter((it) => it.y < h + 160);

      layer.timer -= dt;
      if (layer.timer <= 0) {
        layer.timer = rand(layer.interval[0], layer.interval[1]) / Math.max(speedMult, 0.4);
        layer.items.push({
          x: rand(0.04, 0.96) * w,
          y: -140,
          s: rand(layer.sMin, layer.sMax) * scale,
          tipo: decorType,
          variante: Math.random(),
          seme: Math.random() * 10,
        });
      }
    }

    // --- Neve ---
    this._syncFlakes();
    for (const f of this.flakes) {
      f.y += (45 + 150 * f.z) * scale * dt * (0.6 + speedMult * 0.4);
      f.x += Math.sin(this.t * 1.4 + f.ph) * 22 * dt;
      if (f.y > h + 6) {
        f.y = -6;
        f.x = Math.random() * w;
      }
      if (f.x < -8) f.x = w + 8;
      if (f.x > w + 8) f.x = -8;
    }
  }

  draw(ctx) {
    const { w, h } = this.vp;

    // --- Cielo ---
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, this._mix('cieloTop'));
    grad.addColorStop(1, this._mix('cieloBottom'));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // --- Stelle ---
    ctx.fillStyle = '#dbe4ff';
    for (const s of this.stars) {
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.t * s.sp + s.ph));
      ctx.globalAlpha = tw * 0.8;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    // --- Aurora boreale ---
    this._drawAurora(ctx);

    // --- Decorazioni parallax ---
    const bg = this._bg();
    for (const layer of this.layers) {
      const col = bg.decorColori[layer.colorIdx] || bg.decorColori[0];
      ctx.globalAlpha = layer.alpha;
      for (const it of layer.items) this._drawDecor(ctx, it, col, bg.luci);
      ctx.globalAlpha = 1;
    }

    // --- Neve ---
    ctx.fillStyle = '#eef3ff';
    for (const f of this.flakes) {
      ctx.globalAlpha = 0.25 + f.z * 0.6;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 0.8 + f.z * 1.9, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawAurora(ctx) {
    const { w, h } = this.vp;
    const bg = this._bg();
    const intensita = (this.next
      ? lerp(this.current.auroraIntensita, this.next.auroraIntensita, this.transT)
      : this.current.auroraIntensita) * (this.quality > 0.5 ? 1 : 0.6);
    if (intensita <= 0.01) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const colori = bg.aurora;
    for (let i = 0; i < colori.length; i++) {
      const baseY = h * (0.12 + i * 0.07);
      const amp = h * 0.045;
      const speed = 0.5 + i * 0.25;
      ctx.beginPath();
      ctx.moveTo(-20, baseY);
      const step = this.quality > 0.5 ? 36 : 64;
      for (let x = -20; x <= w + 20; x += step) {
        const y = baseY + Math.sin(x * 0.006 + this.t * speed + i * 2) * amp
          + Math.sin(x * 0.013 - this.t * speed * 0.7) * amp * 0.5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w + 20, baseY + h * 0.16);
      ctx.lineTo(-20, baseY + h * 0.16);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, baseY - amp, 0, baseY + h * 0.16);
      const [r, gr, b] = hexToRgb(colori[i]);
      g.addColorStop(0, `rgba(${r},${gr},${b},${0.55 * intensita})`);
      g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.restore();
  }

  /** Silhouette procedurali per tipo di livello. */
  _drawDecor(ctx, it, colore, luci) {
    const { x, y, s } = it;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = colore;

    switch (it.tipo) {
      case 'villaggio':
        if (it.variante < 0.55) {
          // Casetta con tetto e finestra accesa
          ctx.fillRect(-26, -18, 52, 40);
          ctx.beginPath();
          ctx.moveTo(-32, -16); ctx.lineTo(0, -44); ctx.lineTo(32, -16);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = luci;
          ctx.globalAlpha *= 0.9;
          ctx.fillRect(-8, -6, 14, 14);
        } else {
          this._pino(ctx, 38);
        }
        break;

      case 'foresta':
        this._pino(ctx, 46 + it.variante * 26);
        break;

      case 'citta': {
        // Palazzo con griglia di finestre accese
        const bw = 40 + it.variante * 26;
        const bh = 80 + it.seme * 14;
        ctx.fillRect(-bw / 2, -bh, bw, bh + 20);
        ctx.fillStyle = luci;
        ctx.globalAlpha *= 0.75;
        for (let fy = -bh + 8; fy < 8; fy += 16) {
          for (let fx = -bw / 2 + 6; fx < bw / 2 - 8; fx += 14) {
            // Alcune finestre spente, in modo deterministico per item
            if (Math.sin(it.seme * 37 + fx * 1.7 + fy * 0.9) > -0.25) {
              ctx.fillRect(fx, fy, 6, 8);
            }
          }
        }
        break;
      }

      case 'vette':
        // Guglia di ghiaccio frastagliata
        ctx.beginPath();
        ctx.moveTo(-40, 30);
        ctx.lineTo(-18, -30 - it.variante * 30);
        ctx.lineTo(-6, -12);
        ctx.lineTo(8, -46 - it.seme * 6);
        ctx.lineTo(22, -8);
        ctx.lineTo(40, 30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha *= 0.18;
        ctx.beginPath();
        ctx.moveTo(8, -46 - it.seme * 6);
        ctx.lineTo(14, -22);
        ctx.lineTo(2, -20);
        ctx.closePath();
        ctx.fill();
        break;

      case 'cielo':
      default:
        // Nuvola soffice
        ctx.globalAlpha *= 0.7;
        ctx.beginPath();
        ctx.ellipse(0, 0, 46, 16, 0, 0, TAU);
        ctx.ellipse(-22, 4, 26, 12, 0, 0, TAU);
        ctx.ellipse(24, 5, 28, 13, 0, 0, TAU);
        ctx.fill();
        break;
    }
    ctx.restore();
  }

  _pino(ctx, hgt) {
    ctx.beginPath();
    ctx.moveTo(0, -hgt);
    ctx.lineTo(hgt * 0.42, -hgt * 0.35);
    ctx.lineTo(hgt * 0.2, -hgt * 0.35);
    ctx.lineTo(hgt * 0.55, 4);
    ctx.lineTo(-hgt * 0.55, 4);
    ctx.lineTo(-hgt * 0.2, -hgt * 0.35);
    ctx.lineTo(-hgt * 0.42, -hgt * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-4, 2, 8, 12);
  }

  clearDecor() {
    for (const layer of this.layers) layer.items.length = 0;
  }
}
