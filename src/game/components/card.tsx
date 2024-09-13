import store from "@/store";
import { GameObjects, Scene } from "phaser";
import { EventBus } from "../EventBus";

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
      this.scene.input.on('dragstart', (pointer, gameObject) => { });
      this.scene.input.on('dragend', (pointer, obj, dropZone) => {
        this.checkFill();
      });

    }
    this.img.setDisplaySize(this.width, this.height);
    this.removeAll();
    this.add(this.img);
  }

  canSnap () {
    
  }

  canFill(index: number) {
    const [{ fills }] = this.store.getModel('game');
    const checkMap = ['f', 'b', 'r', 's'];
    const suitMap = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const lastFill = fills[index][fills[index].length - 1];
    const [suit, number] = lastFill?.suit?.split('_') || ['', ''];
    const next = suitMap[suitMap.indexOf(number) + 1];
    return this.id.startsWith(checkMap[index]) && this.id.endsWith(next);
  }

  checkFill() {
    const [{ fillContainer, size, fills }, {fill}] = this.store.getModel('game');
    fillContainer?.list.forEach((i, index) => {
      const item = i as GameObjects.Image;
      const itemBounds = (item as GameObjects.Image).getBounds();
      const cardBounds = this.img.getBounds();
      // 检查是否相交
      if (Phaser.Geom.Intersects.RectangleToRectangle(itemBounds, cardBounds)) {
        if (this.canFill(index)) {
          this.img.setPosition(item.x, item.y);
          this.parentContainer.remove(this);
          fill({
            index,
            card: {
              suit: this.id,
              back: this.back
            }
          });
          EventBus.emit('card_fill');
          this.destroy();
          this.img.destroy();
        }
      }
    }
  )

    this.img.setPosition(0, 0)
  }


  show() {
    this.back = false;
    //TODO: 翻转动画
    this.render();
  }

  changeToBig() {

  }


}