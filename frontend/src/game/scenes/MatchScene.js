import Phaser from 'phaser';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@dropzone/shared/events';
import { GAME_CONFIG, MATCH_STATE } from '@dropzone/shared/constants';
import { WORLD_WIDTH, WORLD_HEIGHT, INTERPOLATION_DELAY_MS } from '../config';
import PlayerView from '../entities/PlayerView';
import ProjectileView from '../entities/ProjectileView';
import LootView from '../entities/LootView';
import InputSystem from '../systems/InputSystem';
import SnapshotBuffer from '../network/SnapshotBuffer';
import { createSocket } from '../network/socket';

const INPUT_INTERVAL_MS = 1000 / GAME_CONFIG.TICK_RATE;
const shortId = (id) => id.slice(0, 4).toUpperCase();

export default class MatchScene extends Phaser.Scene {
  constructor() {
    super('MatchScene');
  }

  create() {
    // Explicit depths: grid < border < zone tint < zone lines < loot < players/bullets < UI
    this.add.grid(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 100, 100, 0x2d4a2d, 1, 0x3a5f3a, 1).setDepth(-10);
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT).setStrokeStyle(8, 0xff4444).setDepth(-9);

    // Red tint everywhere OUTSIDE the safe circle (a circle mask with inverted alpha)
    this.zoneMaskShape = this.make.graphics({ add: false });
    this.zoneOverlay = this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0xff2d2d, 0.16)
      .setDepth(-8)
      .setVisible(false);
    const mask = this.zoneMaskShape.createGeometryMask();
    mask.setInvertAlpha(true);
    this.zoneOverlay.setMask(mask);

    this.zoneLines = this.add.graphics().setDepth(-7);

    this.playerViews = new Map();
    this.projectileViews = new Map();
    this.lootViews = new Map();
    this.selfId = null;
    this.localView = null;
    this.localState = null;
    this.latestMatch = null;
    this.latestZone = null;
    this.latestTick = 0;
    this.sequence = 0;
    this.inputTimer = 0;
    this.snapshots = new SnapshotBuffer();
    this.inputSystem = new InputSystem(this);

    this.input.setDefaultCursor('crosshair');
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.hud = this.add
      .text(16, 16, 'Connecting...', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(100);

    this.banner = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5)
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
      this.clearViews();
      this.snapshots.clear();
      this.selfId = selfId;
    });

    this.socket.on(SERVER_EVENTS.LOOT_STATE, (items) => this.setLoot(items));

    this.socket.on(SERVER_EVENTS.SNAPSHOT, (snapshot) => {
      this.latestTick = snapshot.tick;
      this.latestMatch = snapshot.match;
      this.latestZone = snapshot.zone;
      this.snapshots.push(snapshot);
    });

    this.socket.on('disconnect', () => this.hud.setText('Disconnected. Reconnecting...'));
  }

  clearViews() {
    this.cameras.main.stopFollow();
    this.playerViews.forEach((view) => view.destroy());
    this.playerViews.clear();
    this.projectileViews.forEach((view) => view.destroy());
    this.projectileViews.clear();
    this.localView = null;
    this.localState = null;
    this.latestMatch = null;
    this.latestZone = null;
  }

  setLoot(items) {
    this.lootViews.forEach((view) => view.destroy());
    this.lootViews.clear();
    for (const item of items) this.lootViews.set(item.id, new LootView(this, item));
  }

  /** Draws the world as it was INTERPOLATION_DELAY_MS ago, blended between two snapshots. */
  renderSnapshots() {
    const sample = this.snapshots.sample(performance.now() - INTERPOLATION_DELAY_MS);
    if (!sample) return;

    const { from, to, alpha } = sample;
    this.renderPlayers(from, to, alpha);
    this.renderProjectiles(from, to, alpha);
  }

  renderPlayers(from, to, alpha) {
    const fromById = new Map(from.players.map((p) => [p.id, p]));
    const present = new Set();

    for (const target of to.players) {
      const start = fromById.get(target.id) ?? target;
      let view = this.playerViews.get(target.id);

      if (!view) {
        const isLocal = target.id === this.selfId;
        view = new PlayerView(this, isLocal);
        this.playerViews.set(target.id, view);
        if (isLocal) {
          this.localView = view;
          this.cameras.main.startFollow(view.body, true, 0.1, 0.1);
        }
      }

      const x = Phaser.Math.Linear(start.x, target.x, alpha);
      const y = Phaser.Math.Linear(start.y, target.y, alpha);
      const angle = start.aimAngle + Phaser.Math.Angle.Wrap(target.aimAngle - start.aimAngle) * alpha;

      view.setState(x, y, angle);
      view.setStatus(target);
      if (target.id === this.selfId) this.localState = target;
      present.add(target.id);
    }

    for (const [id, view] of this.playerViews) {
      if (!present.has(id)) {
        view.destroy();
        this.playerViews.delete(id);
      }
    }
  }

  renderProjectiles(from, to, alpha) {
    const fromById = new Map(from.projectiles.map((b) => [b.id, b]));
    const present = new Set();

    for (const target of to.projectiles) {
      const start = fromById.get(target.id) ?? target;
      let view = this.projectileViews.get(target.id);

      if (!view) {
        view = new ProjectileView(this);
        this.projectileViews.set(target.id, view);
      }

      view.setPosition(
        Phaser.Math.Linear(start.x, target.x, alpha),
        Phaser.Math.Linear(start.y, target.y, alpha)
      );
      present.add(target.id);
    }

    for (const [id, view] of this.projectileViews) {
      if (!present.has(id)) {
        view.destroy();
        this.projectileViews.delete(id);
      }
    }
  }

  renderZone() {
    const zone = this.latestZone;
    if (!zone) return;

    this.zoneOverlay.setVisible(true);

    this.zoneMaskShape.clear();
    this.zoneMaskShape.fillStyle(0xffffff, 1);
    this.zoneMaskShape.fillCircle(zone.x, zone.y, zone.radius);

    this.zoneLines.clear();
    this.zoneLines.lineStyle(6, 0xff4d4d, 1).strokeCircle(zone.x, zone.y, zone.radius); // current edge
    this.zoneLines.lineStyle(3, 0xffffff, 0.9).strokeCircle(zone.targetX, zone.targetY, zone.targetRadius); // next safe area
  }

  sendInput(delta) {
    this.inputTimer += delta;
    if (this.inputTimer < INPUT_INTERVAL_MS) return;
    this.inputTimer = 0;

    if (!this.localView || !this.socket.connected) return;

    const input = this.inputSystem.read(this.localView);
    this.socket.emit(CLIENT_EVENTS.PLAYER_INPUT, { sequence: ++this.sequence, ...input });
  }

  updateUi() {
    this.banner.setPosition(this.scale.width / 2, this.scale.height * 0.22);

    const match = this.latestMatch;
    const s = this.localState;
    if (!match || !s) return;

    this.banner.setText(this.bannerText(match, s));

    const lines = [
      `HP: ${s.health}   Kills: ${s.kills}`,
      `Ammo: ${s.ammo}${s.reloading ? '  (RELOADING)' : ''}`,
      `Alive: ${match.aliveCount}/${match.playerCount}   Tick: ${this.latestTick}`,
    ];

    const zone = this.latestZone;
    if (match.state === MATCH_STATE.ACTIVE && zone) {
      if (zone.finished) {
        lines.push('Zone: final circle');
      } else {
        const verb = zone.stage === 'hold' ? 'shrinks in' : 'shrinking, done in';
        lines.push(`Zone ${zone.phase}/${zone.phases}: ${verb} ${zone.timer}s  (${zone.damagePerSecond} dmg/s outside)`);
      }

      const outside = this.localView && Math.hypot(this.localView.x - zone.x, this.localView.y - zone.y) > zone.radius;
      if (outside && s.alive) lines.push('>> OUTSIDE THE ZONE - TAKING DAMAGE <<');
    }

    lines.push('', 'WASD move | Mouse aim | Click fire | R reload | E pick up', 'Green = medkit, Orange = rifle');
    this.hud.setText(lines.join('\n'));
  }

  bannerText(match, s) {
    switch (match.state) {
      case MATCH_STATE.WAITING:
        return `WAITING FOR PLAYERS\n${match.playerCount}/${match.minPlayers}`;
      case MATCH_STATE.COUNTDOWN:
        return `MATCH STARTS IN ${match.timer}`;
      case MATCH_STATE.ACTIVE:
        if (s.spectator) return 'MATCH IN PROGRESS\nYou join the next round';
        return s.alive ? '' : 'ELIMINATED';
      case MATCH_STATE.FINISHED: {
        const result = match.winnerId === this.selfId ? 'VICTORY!' : match.winnerId ? `WINNER: ${shortId(match.winnerId)}` : 'DRAW';
        return `${result}\nNext round in ${match.timer}s`;
      }
      case MATCH_STATE.CANCELLED:
        return 'MATCH CANCELLED';
      default:
        return '';
    }
  }

  update(_time, delta) {
    this.renderSnapshots();
    this.sendInput(delta);
    this.renderZone();
    this.updateUi();
  }
}