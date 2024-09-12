import store from "@/store";
import { GameObjects, Scene } from "phaser";

export default class Card extends GameObjects.Container {  
  store: typeof store;
  id: string;
  back: boolean;
  constructor(scene: Scene, x:number, y: number, id: string, back: boolean, width: number, height: number) {
    super(scene, x, y);
    this.setInteractive();
    this.store = store;
    this.id = id;
    this.back = back;
    this.scene.add.container(x, y, this);
    if (this.back) {
      this.scene.add.image(0, 0, 'back').setOrigin(0, 0);
    } else {
      const [{size}] = this.store.getModel('game');
      this.scene.add.image(0, 0, `${size}_${this.id}`).setOrigin(0, 0);
    }
  }

  create () {

  }

  update(...args: any[]): void {

  }
}