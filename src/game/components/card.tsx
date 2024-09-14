import store from "@/store";
import { GameObjects, Scene, Geom } from "phaser";
import { EventBus } from "../EventBus";

const checkMap = ['f', 'b', 'r', 's'];
const suitMap = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export default class Card extends GameObjects.Container {
  store: typeof store;
  id: string;
  back: boolean;
  width: number;
  height: number;
  img: GameObjects.Sprite;
  filled: boolean = false;
  graphics: Phaser.GameObjects.Graphics;
  constructor(scene: Scene, x: number, y: number, id: string, back: boolean, width: number, height: number) {
    super(scene, x, y);
    this.store = store;
    this.id = id;
    this.back = back;
    this.width = width;
    this.height = height;
    scene.add.container(x, y, this);
    this.graphics = this.scene.add.graphics();
    this.graphics.lineStyle(2, 0xff0000, 1); // 红色边框用于碰撞区域
    this.render();
    EventBus.on('card_drop', (obj: GameObjects.Sprite) => {
      const [{size}] = store.getModel("game");
      const objId = obj.texture.key.replace(`${size}_`, '');
      if ( objId === this.id) {
        this.checkFill();
      }
    })
  }

  render() {
    const [{ size }] = this.store.getModel('game');
    if (this.back) {
      this.img = this.scene.add.sprite(0, 0, 'cardBack').setOrigin(0, 0);
      this.removeInteractive();
    } else {
      this.img = this.scene.add.sprite(0, 0, `${size}_${this.id}`).setOrigin(0, 0);
      this.img.setInteractive();
      this.setInteractive();
      this.scene.input.setDraggable(this.img);
    }
    this.img.setDisplaySize(this.width, this.height);
    this.removeAll();
    this.add(this.img);
  }


  isCardRight (id1: string, id2: string) {
    const [suit1, number1] = id1.split('_');
    const [suit2, number2] = id2.split('_');
    const is1Red = checkMap.findIndex(id => id === suit1) > 1;
    const is2Red = checkMap.findIndex(id => id === suit2) > 1;
    const number1Next = suitMap[suitMap.indexOf(number1) - 1];
    console.log(is1Red, is2Red, number1Next, number2);
    return is1Red !== is2Red && number1Next === number2;
  }

  checkSnap() {
    const [{ decksContainer }, {update}] = this.store.getModel('game');
    decksContainer?.list.forEach((d, index) => {
      const deck = d as GameObjects.Container;
      deck.list.forEach((c, cardIndex) => {
        const card = c as Card;
        if (card.back === false) {
          if (Phaser.Geom.Intersects.RectangleToRectangle(card.img.getBounds(), this.img.getBounds())) {
            if (this.isCardRight(card.id, this.id)) {
              update({
                
              });
            }
          }
        }
      });
    });
  }

  canFill(index: number) {
    const [{ fills }] = this.store.getModel('game');

    if (!fills[index]) return false;
    const lastFill = fills[index][fills[index].length - 1];
    const [suit, number] = lastFill?.suit?.split('_') || ['', ''];
    const next = suitMap[suitMap.indexOf(number) + 1];
    return this.id.startsWith(checkMap[index]) && this.id.endsWith(next);
  }

  checkFill() {
    const [{ fillContainer, size, fills }, { fill }] = this.store.getModel('game');
    fillContainer?.list.forEach((i, index) => {
      const item = i as GameObjects.Image;

      const itemBounds = (item as GameObjects.Image).getBounds();
      const cardBounds = this.img.getBounds();
      // 检查是否相交
      if (Phaser.Geom.Intersects.RectangleToRectangle(itemBounds, cardBounds)) {
        if (this.canFill(index)) {
          // this.img.setPosition(item.x, item.y);
          this.parentContainer.remove(this);
          fill({
            index,
            card: {
              suit: this.id,
              back: this.back
            }
          });
          EventBus.emit('card_fill');
          this.removeInteractive();
          this.destroy();
          this.img.destroy();
        }
      } else {
        this.checkSnap();
      }
    }
    )
    this.img.setPosition(0, 0)
  }


  // 更新并绘制容器的边界
  updateCollisionGraphics(bounds1: any, bounds2: any) {
    this.graphics.clear();  // 清除之前的图形
    // 绘制容器1的边界矩形
    this.graphics.lineStyle(10, 0xff0000, 10);  // 红色线条
    this.graphics.strokeRect(bounds1.x, bounds1.y, bounds1.width, bounds1.height);

    // 绘制容器2的边界矩形
    this.graphics.lineStyle(10, 0x00ff00, 10);  // 绿色线条
    this.graphics.strokeRect(bounds2.x, bounds2.y, bounds2.width, bounds2.height);
  }

  checkCardCollisionGraphics (card1: Card, card2: Card) {
    const card1Bounds = card1.img.getBounds();
    const card2Bounds = card2.img.getBounds();
    const matrix1 = card1.getWorldTransformMatrix();
    const matrix2 = card2.getWorldTransformMatrix();
    const x1 = matrix1.tx + card1Bounds.x;
    const y1 = matrix1.ty + card1Bounds.y;
    const x2 = matrix2.tx + card2Bounds.x;
    const y2 = matrix2.ty + card2Bounds.y;
    const absoluteBounds1 = new Phaser.Geom.Rectangle(x1, y1,card1Bounds.width, card1Bounds.height);
    const absoluteBounds2 = new Phaser.Geom.Rectangle(x2, y2, card2Bounds.width, card2Bounds.height);
    return Phaser.Geom.Intersects.RectangleToRectangle(absoluteBounds1, absoluteBounds2);
  }


  show() {
    this.back = false;
    //TODO: 翻转动画
    this.render();
  }

  changeToBig() {

  }


}