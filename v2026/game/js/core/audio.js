// Effetti sonori sintetizzati con WebAudio: nessun file esterno.
// Il contesto audio viene sbloccato al primo gesto dell'utente.

const LS_MUTED = 'corsaBabbo2026.muted';

class AudioFx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = localStorage.getItem(LS_MUTED) === '1';
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);
  }

  setMuted(v) {
    this.muted = v;
    localStorage.setItem(LS_MUTED, v ? '1' : '0');
  }

  _tone({ type = 'sine', from = 440, to = from, dur = 0.12, vol = 1, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.25, vol = 0.8, fromHz = 1200, toHz = 200, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(fromHz, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(toHz, 40), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
  }

  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'shoot':
        this._tone({ type: 'triangle', from: 880, to: 1400, dur: 0.07, vol: 0.35 });
        break;
      case 'hit':
        this._tone({ type: 'square', from: 300, to: 160, dur: 0.08, vol: 0.4 });
        break;
      case 'boom':
        this._noise({ dur: 0.35, vol: 0.7, fromHz: 1600, toHz: 120 });
        this._tone({ type: 'sine', from: 160, to: 50, dur: 0.3, vol: 0.6 });
        break;
      case 'gift':
        this._tone({ type: 'sine', from: 660, dur: 0.08, vol: 0.4 });
        this._tone({ type: 'sine', from: 990, dur: 0.1, vol: 0.4, delay: 0.07 });
        break;
      case 'power':
        this._tone({ type: 'sine', from: 523, dur: 0.09, vol: 0.4 });
        this._tone({ type: 'sine', from: 659, dur: 0.09, vol: 0.4, delay: 0.08 });
        this._tone({ type: 'sine', from: 880, dur: 0.14, vol: 0.45, delay: 0.16 });
        break;
      case 'hurt':
        this._tone({ type: 'sawtooth', from: 320, to: 80, dur: 0.3, vol: 0.55 });
        this._noise({ dur: 0.2, vol: 0.4, fromHz: 900, toHz: 150 });
        break;
      case 'bossPhase':
        this._tone({ type: 'sawtooth', from: 110, to: 220, dur: 0.4, vol: 0.5 });
        break;
      case 'bossDown':
        this._noise({ dur: 0.7, vol: 0.8, fromHz: 2000, toHz: 60 });
        this._tone({ type: 'sine', from: 523, dur: 0.12, vol: 0.5, delay: 0.3 });
        this._tone({ type: 'sine', from: 784, dur: 0.12, vol: 0.5, delay: 0.45 });
        this._tone({ type: 'sine', from: 1047, dur: 0.25, vol: 0.5, delay: 0.6 });
        break;
      case 'victory':
        [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
          this._tone({ type: 'triangle', from: f, dur: 0.16, vol: 0.45, delay: i * 0.13 }));
        break;
      case 'gameover':
        [392, 330, 262, 196].forEach((f, i) =>
          this._tone({ type: 'triangle', from: f, dur: 0.25, vol: 0.45, delay: i * 0.2 }));
        break;
    }
  }
}

export const audio = new AudioFx();
