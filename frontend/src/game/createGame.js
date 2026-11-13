import Phaser from "phaser";
import MatchScene from "./scenes/MatchScene";

export function createGame(parent) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#1b2a1b",
    scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
    scene: [MatchScene],
  });
}