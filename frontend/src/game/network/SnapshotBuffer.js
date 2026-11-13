/** Keeps recent server snapshots and finds the pair to blend between at a given time. */
export default class SnapshotBuffer {
  constructor(maxSize = 30) {
    this.maxSize = maxSize;
    this.snapshots = [];
  }

  clear() {
    this.snapshots.length = 0;
  }

  push(snapshot) {
    this.snapshots.push({ ...snapshot, receivedAt: performance.now() });
    if (this.snapshots.length > this.maxSize) this.snapshots.shift();
  }

  /** Returns { from, to, alpha } or null if there is no data yet. */
  sample(renderTime) {
    const s = this.snapshots;
    if (s.length === 0) return null;

    const newest = s[s.length - 1];
    if (renderTime >= newest.receivedAt) {
      return { from: newest, to: newest, alpha: 0 }; // out of data: hold the last state
    }

    for (let i = s.length - 1; i > 0; i--) {
      const a = s[i - 1];
      const b = s[i];
      if (a.receivedAt <= renderTime) {
        const span = Math.max(1, b.receivedAt - a.receivedAt);
        return { from: a, to: b, alpha: (renderTime - a.receivedAt) / span };
      }
    }

    return { from: s[0], to: s[0], alpha: 0 };
  }
}