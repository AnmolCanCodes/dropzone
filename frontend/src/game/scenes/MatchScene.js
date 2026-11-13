import Phaser from "phaser";
import { WORLD_WIDTH, WORLD_HEIGHT } from "../config";
import Player from "../entities/Player";
import InputSystem from "../systems/InputSystem";

export default class MatchScene extends Phaser.Scene {
  constructor() {
    super("MatchScene");
  }

  create() {
    this.add.grid(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 100, 100, 0x2d4a2d, 1, 0x3a5f3a, 1);
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT).setStrokeStyle(8, 0xff4444);

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.inputSystem = new InputSystem(this);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    cam.startFollow(this.player.body, true, 0.1, 0.1);

    // HUD: setScrollFactor(0) pins it to the screen instead of the world
    this.hud = this.add
      .text(16, 16, "", { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" })
      .setScrollFactor(0)
      .setDepth(100);
  }

  update(_time, delta) {
    const dt = delta / 1000;
    const input = this.inputSystem.read(this.player);
    this.player.applyInput(input, dt);

    this.hud.setText(
      `HP: ${this.player.health}\nX: ${Math.round(this.player.x)}  Y: ${Math.round(this.player.y)}`
    );
  }
}