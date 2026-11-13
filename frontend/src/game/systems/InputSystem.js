export default class InputSystem {
  constructor(scene) {
    this.scene = scene;
    this.keys = scene.input.keyboard.addKeys({
      up: "W", down: "S", left: "A", right: "D", pickup: "E",
    });
  }

  read(player) {
    const pointer = this.scene.input.activePointer;
    pointer.updateWorldPoint(this.scene.cameras.main); // keeps aim correct while camera moves

    return {
      movement: {
        up: this.keys.up.isDown,
        down: this.keys.down.isDown,
        left: this.keys.left.isDown,
        right: this.keys.right.isDown,
      },
      aimAngle: Math.atan2(pointer.worldY - player.y, pointer.worldX - player.x),
      fire: pointer.leftButtonDown(),
    };
  }
}