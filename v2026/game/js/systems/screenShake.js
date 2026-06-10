// Screen shake basato su "trauma": l'intensità decade nel tempo e
// l'offset è proporzionale al quadrato del trauma (più naturale).

import { clamp, rand } from '../core/utils.js';

export class ScreenShake {
  constructor() {
    this.trauma = 0;
    this.maxOffset = 14;
  }

  add(amount) {
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  update(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
  }

  getOffset() {
    if (this.trauma <= 0) return { x: 0, y: 0 };
    const s = this.trauma * this.trauma * this.maxOffset;
    return { x: rand(-s, s), y: rand(-s, s) };
  }
}
