import store from "@/store";
import { GameObjects, Scene } from "phaser";

export default class Card extends GameObjects.Container {
  store: typeof store;
  id: string;
  back: boolean;
  width: number;
  height: number;
  img: GameObjects.Sprite;
  filled: boolean = false;
  constructor(scene: Scene, x: number, y: number, id: string, back: boolean, width: number, height: number) {
    super(scene, x, y);
    this.store = store;
    this.id = id;
    this.back = back;
    this.width = width;
    this.height = height;
    scene.add.container(x, y, this);
    this.render();
  }

  render() {
    if (this.back) {
      this.img = this.scene.add.sprite(0, 0, 'cardBack').setOrigin(0, 0);
      this.removeInteractive();
    } else {
      const [{ size }] = this.store.getModel('game');
      this.img = this.scene.add.sprite(0, 0, `${size}_${this.id}`).setOrigin(0, 0);
      this.img.setInteractive();
      this.setInteractive();
      this.scene.input.setDraggable(this.img);
      this.scene.input.on('drag', (pointer, obj, dragX, dragY) => {
        obj.x = dragX;
        obj.y = dragY;
      });
      this.scene.input.on('dragstart', (pointer, gameObject) => {});
      this.scene.input.on('dragend', (pointer, obj, dropZone) => {
        if (!this.filled) {
          this.img.setPosition(0, 0)
        }
      });

    }
    this.img.setDisplaySize(this.width, this.height);
    this.removeAll();
    this.add(this.img);
  }

  show() {
    this.back = false;
    this.render();
  }

  changeToBig() {

  }
}