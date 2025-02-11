import Phaser, { Scene, GameObjects } from 'phaser';
import { Global } from './scenes/constants/state';
import { Game } from './scenes/Game';
import { EventBus } from './EventBus';

export default class Block extends GameObjects.Container {

  scene: Game;
  blockNumber: number;
  interId: number;
  id: string;
  offset: number = 0;
  block: Phaser.GameObjects.Image;
  blockSize: number = 192;
  guide: Phaser.GameObjects.Image;
  halo: Phaser.GameObjects.Image;



  constructor(x: number, y: number, blockNumber: number, scene: Game, id: string) {
    super(scene, x, y);
    this.scene = scene;
    this.blockNumber = blockNumber;
    this.id = id;
    this.offset = Global.y;
    this.init();
  }

  canSelect() {
    return !Global.containers.find(i => i !== 0 && i != this.blockNumber);
  }

  canClear() {
    return Global.containers.filter(i => i === this.blockNumber).length === Global.containers.length;
  }

  initGuide() {
    const index = Global.guideBlockId.findIndex(id => id === this.id);
    if (index >= 0) {
      EventBus.on('guide', (i: number) => {
        if (i === index) {
          setTimeout(() => {
            const guide = this.scene.add.image(this.x + this.blockSize / 2, this.y + 380 + this.blockSize / 2, 'hand').setOrigin(0, 0);
            this.guide = guide;
            guide.displayHeight = 160 * .8;
            guide.displayWidth = 190 * .8;
            this.scene.tweens.add({
              targets: guide,
              scaleX: .7,
              scaleY: .7,
              yoyo: true,
              loop: Infinity,
              duration: 400
            });
          }, 10);
        }
      });
    }
    if (index === 0) {
      EventBus.emit('guide', 0);
    }
  }

  handleClick() {
    if (!Global.started && Global.currentGuideId !== this.id) return;
    if (Global.currentGuideId === this.id) {
      const i = Global.guideBlockId.findIndex(id => id === this.id);
      Global.currentGuideId = Global.guideBlockId[i + 1];
      this.guide.destroy();
      if (i < 2) EventBus.emit('guide', i + 1)
    }
    const index = Global.containers.findIndex(c => c === 0);
    const container = this.scene.containers[index];
    if (index >= 0 && this.canSelect()) {
      this.block.disableInteractive();
      const maskImage = this.scene.add.image(this.blockSize/2, this.blockSize/2, 'halo');
      maskImage.displayHeight = this.blockSize * 1.5;
      maskImage.displayWidth = this.blockSize * 1.5;
      this.add(maskImage);
      this.halo = maskImage;
      clearInterval(this.interId);
      this.scene.tweens.add({
        targets: [this],
        x: container.x - 18,
        y: container.y - 378,
        duration: 400,
        persist: true,
        ease: Phaser.Math.Easing.Circular.InOut
      });
      const [i, j] = this.id.split('-').map(id => parseInt(id));
      Global.puzzle[i][j] = 0;
      EventBus.emit("click");
      Global.containers[index] = this.blockNumber;
      this.scene.currentBlocks.push(this);
      if (this.canClear()) {
        setTimeout(() => {
          EventBus.emit('clear');
          Global.clearCount++;
          if (Global.clearCount >= Global.maxClearCount) {
            setTimeout(() => {
              Global.started = false;
              EventBus.emit('game-over')
            }, 400);
          }
        }, 400)
      }
    } else {
      EventBus.emit("error");
    }
  }

  init() {
    if (!this.blockNumber) return;
    const block = this.scene.add.image(0, 0, `b${this.blockNumber}`).setOrigin(0, 0);
    this.block = block;
    block.displayWidth = this.blockSize;
    block.displayHeight = this.blockSize;
    this.add(block);
    block.setInteractive();
    if (this.interId) {
      clearInterval(this.interId);
      this.interId = 0;
    }
    this.y += this.offset;
    this.interId = setInterval(() => {
      if (Global.started) {
        this.y++;
        if (this.y > 1585 - 380 - this.blockSize) {
          EventBus.emit('fail');
        }
      }
    }, 30)
    this.initGuide();
    const _this = this;
    block.on('pointerdown', function () {
      _this.handleClick();
    });
    EventBus.once('fail', () => {
      block.disableInteractive();
    });
  }

  disappear() {
    this.block.setOrigin(.5, .5);
    this.block.x += this.block.displayWidth / 2;
    this.block.y += this.block.displayHeight / 2;
    this.scene.tweens.add({
      targets: [this.block, this.halo],
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      alpha: 0,
      persist: true,
      ease: Phaser.Math.Easing.Circular.InOut
    }).once('finish', this.destroy);
  }

}