import Phaser from 'phaser';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@dropzone/shared/events';
import { GAME_CONFIG } from '@dropzone/shared/constants';
import { WORLD_WIDTH, WORLD_HEIGHT, INTERPOLATION_DELAY_MS } from '../config';
import PlayerView from '../entities/PlayerView';
import InputSystem from '../systems/InputSystem';
import SnapshotBuffer from '../network/SnapshotBuffer';
import { createSocket } from '../network/socket';

const INPUT_INTERVAL_MS = 1000 / GAME_CONFIG.TICK_RATE;

export default class MatchScene extends Phaser.Scene {
  constructor() {
    super('MatchScene');
  }

  create() {
    this.add.grid(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 100, 100, 0x2d4a2d, 1, 0x3a5f3a, 1);
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT).setStrokeStyle(8, 0xff4444);

    this.views = new Map();
    this.selfId = null;
    this.localView = null;
    this.latestTick = 0;
    this.sequence = 0;
    this.inputTimer = 0;
    this.snapshots = new SnapshotBuffer();
    this.inputSystem = new InputSystem(this);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.hud = this.add
      .text(16, 16, 'Connecting...', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(100);

    this.connect();

    const cleanup = () => this.socket?.disconnect();
    this.events.once('shutdown', cleanup);
    this.events.once('destroy', cleanup);
  }

  connect() {
    this.socket = createSocket();

    this.socket.on(SERVER_EVENTS.WELCOME, ({ selfId }) => {
      // Fresh start (also covers reconnects, which give a new socket id)
      this.clearViews();
      this.snapshots.clear();
      this.selfId = selfId;
    });

    this.socket.on(SERVER_EVENTS.SNAPSHOT, (snapshot) => {
      this.latestTick = snapshot.tick;
      this.snapshots.push(snapshot);
    });

    this.socket.on('disconnect', () => this.hud.setText('Disconnected. Reconnecting...'));
  }

  clearViews() {
    this.cameras.main.stopFollow();
    this.views.forEach((view) => view.destroy());
    this.views.clear();
    this.localView = null;
  }

  /** Draws the world as it was INTERPOLATION_DELAY_MS ago, blended between two snapshots. */
  renderSnapshots() {
    const sample = this.snapshots.sample(performance.now() - INTERPOLATION_DELAY_MS);
    if (!sample) return;

    const { from, to, alpha } = sample;
    const fromById = new Map(from.players.map((p) => [p.id, p]));
    const present = new Set();

    for (const target of to.players) {
      const start = fromById.get(target.id) ?? target; // just joined: no previous state
      let view = this.views.get(target.id);

      if (!view) {
        const isLocal = target.id === this.selfId;
        view = new PlayerView(this, isLocal);
        this.views.set(target.id, view);
        if (isLocal) {
          this.localView = view;
          this.cameras.main.startFollow(view.body, true, 0.1, 0.1);
        }
      }

      const x = Phaser.Math.Linear(start.x, target.x, alpha);
      const y = Phaser.Math.Linear(start.y, target.y, alpha);
      // Take the shortest way around the circle, so the aim doesn't spin at the ±π wrap
      const angle = start.aimAngle + Phaser.Math.Angle.Wrap(target.aimAngle - start.aimAngle) * alpha;

      view.setState(x, y, angle);
      present.add(target.id);
    }

    // Anyone not in the newer snapshot has left
    for (const [id, view] of this.views) {
      if (!present.has(id)) {
        view.destroy();
        this.views.delete(id);
      }
    }
  }

  sendInput(delta) {
    this.inputTimer += delta;
    if (this.inputTimer < INPUT_INTERVAL_MS) return;
    this.inputTimer = 0;

    if (!this.localView || !this.socket.connected) return;

    const input = this.inputSystem.read(this.localView);
    this.socket.emit(CLIENT_EVENTS.PLAYER_INPUT, { sequence: ++this.sequence, ...input });
  }

  update(_time, delta) {
    this.renderSnapshots();
    this.sendInput(delta);

    if (this.localView) {
      this.hud.setText(
        `X: ${Math.round(this.localView.x)}  Y: ${Math.round(this.localView.y)}\n` +
        `Players: ${this.views.size}\nServer tick: ${this.latestTick}`
      );
    }
  }
}