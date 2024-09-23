import store from "@/store";
import { GameObjects, Scene, Geom } from "phaser";
import { EventBus } from "../EventBus";

const checkMap = ['f', 'b', 'r', 's'];
const suitMap = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export default class Card extends GameObjects.Sprite {
  store: typeof store;
  suit: string = "";
  back: boolean;
  filled: boolean = false;
  graphics: Phaser.GameObjects.Graphics;
  deckX: number = 0;
  deckY: number = 0;
  fillObjId: string = '';
  deck: GameObjects.Container;
  next: Card;
  constructor(scene: Scene, x: number, y: number, id: string, back: boolean, width: number, height: number) {
    super(scene, x + width/2, y + height/2, 'cardBack');
    this.store = store;
    this.suit = id;
    this.back = back;
    this.displayWidth = width;
    this.displayHeight = height;
    this.depth = 1;
    this.deckX = x + width/2;
    this.deckY = y + height/2;
    this.render();
    EventBus.on('card_drop', (obj: GameObjects.Sprite) => {
      const [{ size }] = store.getModel("game");
      const objId = obj.texture.key.replace(`${size}_`, '');
      if (objId === this.suit) {
        this.checkFill(objId);
      }
    });
  }

  render() {
    const [{ size }] = this.store.getModel('game');
    if (this.back) {
      this.setTexture('cardBack');
      this.removeInteractive();
    } else {
      this.setTexture(`${size}_${this.suit}`);
      this.setInteractive();
      this.scene.input.setDraggable(this);
    }
  }




  isCardRight(id1: string, id2: string) {
    const [suit1, number1] = id1.split('_');
    const [suit2, number2] = id2.split('_');
    const is1Red = checkMap.findIndex(id => id === suit1) > 1;
    const is2Red = checkMap.findIndex(id => id === suit2) > 1;
    const number1Next = suitMap[suitMap.indexOf(number1) - 1];
    return is1Red !== is2Red && number1Next === number2;
  }

  checkSnap(): boolean {
    let result = false;
    const [{ decksContainer }, { snap }] = this.store.getModel('game');
    decksContainer?.list.forEach((d, index) => {
      const deck = d as GameObjects.Container;
      deck.list?.forEach((c, cardIndex) => {
        const card = c as Card;
        if (card.back === false) {
          if (Phaser.Geom.Intersects.RectangleToRectangle(card.getBounds(), this.getBounds())) {
            if (this.isCardRight(card.suit, this.suit)) {
              snap({
                target_card: {
                  suit: card.suit,
                },
                card: { suit: this.suit }
              });-
              EventBus.emit('card_snapped', this.suit, [index, cardIndex]);
              result = true;
            }
          }
        }
      });
    });
    return result;
  }

  canFill(index: number) {
    const [{ fills }] = this.store.getModel('game');
    if (!fills[index]) return false;
    const lastFill = fills[index][fills[index].length - 1];
    const [suit, number] = lastFill?.suit?.split('_') || ['', ''];
    const next = suitMap[suitMap.indexOf(number) + 1];
    return this.suit.startsWith(checkMap[index]) && this.suit.endsWith(next);
  }

  checkFill(id: string) {
    if (this.fillObjId === id) return;
    this.fillObjId = id;
    const [{ fillContainer, size, fills }, { fill }] = this.store.getModel('game');
    fillContainer?.list.forEach((i, index) => {
      const item = i as GameObjects.Image;
      const itemBounds = (item as GameObjects.Image).getBounds();
      const cardBounds = this.getBounds();
      // 检查是否相交
      if (Phaser.Geom.Intersects.RectangleToRectangle(itemBounds, cardBounds)) {
        if (this.canFill(index)) {
          // this.img.setPosition(item.x, item.y);
          fill({
            index,
            card: {
              suit: this.suit,
              back: this.back
            }
          });
          EventBus.emit('card_fill', this.suit);
          this.removeInteractive();
          this.destroy();
        }
      } else {
        const snapped = this.checkSnap();
        console.log('snap', snapped);
        if (!snapped) {
          if (this.scene) {
            this.setPosition(this.deckX, this.deckY);
            if (this.deck) {
              this.deck.add(this);
              this.deckX = this.x;
              this.deckY = this.y;
            }
          }
          EventBus.emit('reset_card');
        }
      }
    }
    )
    setTimeout(() => this.fillObjId = '', 100)
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

  checkCardCollisionGraphics(card1: Card, card2: Card) {
    const card1Bounds = card1.getBounds();
    const card2Bounds = card2.getBounds();
    const matrix1 = card1.getWorldTransformMatrix();
    const matrix2 = card2.getWorldTransformMatrix();
    const x1 = matrix1.tx + card1Bounds.x;
    const y1 = matrix1.ty + card1Bounds.y;
    const x2 = matrix2.tx + card2Bounds.x;
    const y2 = matrix2.ty + card2Bounds.y;
    const absoluteBounds1 = new Phaser.Geom.Rectangle(x1, y1, card1Bounds.width, card1Bounds.height);
    const absoluteBounds2 = new Phaser.Geom.Rectangle(x2, y2, card2Bounds.width, card2Bounds.height);
    return Phaser.Geom.Intersects.RectangleToRectangle(absoluteBounds1, absoluteBounds2);
  }


  show() {
    const [{ size }] = this.store.getModel('game');
    this.back = false;
    //TODO: 翻转动画
    const scaleY = this.scaleY;
    this.scene.tweens.add({
      targets: [this],
      scaleY: 0,
      duration: 100,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.setTexture(`${size}_${this.suit}`);
        this.scene.tweens.add({
          targets: [this],
          scaleY,
          duration: 100,
          ease: 'Sine.easeInOut',
        });
      }
    });
    this.setInteractive();
    this.scene.input.setDraggable(this);
  }

  changeToBig() {
    const [{ size }] = this.store.getModel('game');
    this.setTexture(`big_${this.suit}`);
    //TODO: 翻转动画
    const scaleY = this.scaleY;
    const scaleX = this.scaleX;
    EventBus.emit('rotate');
    this.scene.tweens.add({
      targets: [this],
      scaleY: this.scaleY * 1.2,
      scaleX: this.scaleX * 1.2,
      opacity: 0,
      duration: 200,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: [this],
          scaleY,
          scaleX,
          opacity: 1,
          duration: 200,
          ease: 'Sine.easeInOut',
        });
      }
    });
  }


}