const COLORS = { medkit: 0x51cf66, rifle: 0xffa94d };

export default class LootView {
  constructor(scene, item) {
    this.shape =
      item.type === 'rifle'
        ? scene.add.rectangle(item.x, item.y, 38, 12, COLORS.rifle)
        : scene.add.circle(item.x, item.y, 13, COLORS.medkit);

    this.shape.setStrokeStyle(3, 0xffffff).setDepth(-5);
  }

  destroy() {
    this.shape.destroy();
  }
}