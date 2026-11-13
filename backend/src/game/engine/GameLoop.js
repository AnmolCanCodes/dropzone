const MAX_CATCH_UP_TICKS = 5;

/**
 * Fixed-timestep loop. setInterval is not exact, so we accumulate real elapsed
 * time and run as many fixed steps as that time covers.
 */
export class GameLoop {
  constructor({ tickRate, onTick }) {
    this.stepMs = 1000 / tickRate;
    this.onTick = onTick;
    this.accumulator = 0;
    this.lastTime = 0;
    this.timer = null;
  }

  start() {
    this.lastTime = performance.now();
    this.timer = setInterval(() => this.step(), this.stepMs / 2);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  step() {
    const now = performance.now();
    this.accumulator += now - this.lastTime;
    this.lastTime = now;

    let ticks = 0;
    while (this.accumulator >= this.stepMs && ticks < MAX_CATCH_UP_TICKS) {
      const startedAt = performance.now();
      this.onTick(this.stepMs / 1000);
      const duration = performance.now() - startedAt;
      if (duration > this.stepMs) {
        console.warn(`Slow tick: ${duration.toFixed(1)}ms (budget ${this.stepMs}ms)`);
      }
      this.accumulator -= this.stepMs;
      ticks += 1;
    }

    // If we fell too far behind, drop the backlog instead of spiralling
    if (ticks === MAX_CATCH_UP_TICKS) this.accumulator = 0;
  }
}