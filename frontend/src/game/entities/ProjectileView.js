import { BULLET_RADIUS } from '../config';

export default class ProjectileView {
  constructor(scene) {
    this.shape = scene.add.circle(0, 0, BULLET_RADIUS, 0xffe066);
  }

  setPosition(x, y) {
    this.shape.setPosition(x, y);
  }

  destroy() {
    this.shape.destroy();
  }
}