// Object pool generico: riusa gli oggetti per evitare pressione sul garbage collector.

export class Pool {
  /**
   * @param {() => object} factory crea un nuovo oggetto vuoto
   * @param {number} initial pre-allocazione iniziale
   */
  constructor(factory, initial = 32) {
    this.factory = factory;
    this.free = [];
    for (let i = 0; i < initial; i++) this.free.push(factory());
  }

  get() {
    return this.free.pop() || this.factory();
  }

  release(obj) {
    this.free.push(obj);
  }

  /** Rilascia tutti gli elementi "dead" di un array attivo, compattandolo sul posto. */
  sweep(active) {
    let w = 0;
    for (let i = 0; i < active.length; i++) {
      const o = active[i];
      if (o.dead) this.release(o);
      else active[w++] = o;
    }
    active.length = w;
  }
}
