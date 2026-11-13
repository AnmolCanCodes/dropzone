import Phaser from 'phaser';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@dropzone/shared/events';
import { GAME_CONFIG } from '@dropzone/shared/constants';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../config';
import Player from '../entities/Player';
import RemotePlayer from '../entities/RemotePlayer';
import InputSystem from '../systems/InputSystem';
import { createSocket } from '../network/socket';

const SEND_INTERVAL_MS = 1000 / GAME_CONFIG.TICK_RATE;

export default class MatchScene extends Phaser.Scene {
  constructor() {
    super('MatchScene');
  }

  create() {
    this.add.grid(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 100, 100, 0x2d4a2d, 1, 0x3a5f3a, 1);
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT).setStrokeStyle(8, 0xff4444);

    this.player = null;
    this.remotePlayers = new Map();
    this.sendTimer = 0;
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

    this.socket.on(SERVER_EVENTS.WORLD_STATE, ({ selfId, players }) => {
      this.resetPlayers(); // also covers reconnects
      for (const p of players) {
        if (p.id === selfId) this.spawnLocalPlayer(p);
        else this.addRemotePlayer(p);
      }
    });

    this.socket.on(SERVER_EVENTS.PLAYER_JOINED, (p) => this.addRemotePlayer(p));

    this.socket.on(SERVER_EVENTS.PLAYER_LEFT, ({ id }) => {
      this.remotePlayers.get(id)?.destroy();
      this.remotePlayers.delete(id);
    });

    this.socket.on(SERVER_EVENTS.PLAYER_MOVED, ({ id, x, y, aimAngle }) => {
      this.remotePlayers.get(id)?.setTarget(x, y, aimAngle);
    });

    this.socket.on('disconnect', () => this.hud.setText('Disconnected. Reconnecting...'));
  }

  resetPlayers() {
    this.player?.body.destroy();
    this.player?.gun.destroy();
    this.player = null;
    this.remotePlayers.forEach((r) => r.destroy());
    this.remotePlayers.clear();
  }

  spawnLocalPlayer(p) {
    this.player = new Player(this, p.x, p.y);
    this.cameras.main.startFollow(this.player.body, true, 0.1, 0.1);
  }

  addRemotePlayer(p) {
    if (this.remotePlayers.has(p.id)) return;
    this.remotePlayers.set(p.id, new RemotePlayer(this, p.id, p.x, p.y, p.aimAngle));
  }

  update(_time, delta) {
    if (!this.player) return; // not spawned yet

    const dt = delta / 1000;
    const input = this.inputSystem.read(this.player);
    this.player.applyInput(input, dt);

    // Send position ~20 times per second, not every frame
    this.sendTimer += delta;
    if (this.sendTimer >= SEND_INTERVAL_MS) {
      this.sendTimer = 0;
      this.socket.emit(CLIENT_EVENTS.PLAYER_MOVE, {
        x: this.player.x,
        y: this.player.y,
        aimAngle: input.aimAngle,
      });
    }

    this.remotePlayers.forEach((r) => r.update(dt));

    this.hud.setText(
      `HP: ${this.player.health}\nX: ${Math.round(this.player.x)}  Y: ${Math.round(this.player.y)}\nPlayers: ${this.remotePlayers.size + 1}`
    );
  }
}