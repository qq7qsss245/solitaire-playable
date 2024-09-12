import { Scene, GameObjects } from 'phaser';
import store from '@/store'
import Card from '../components/card';

export class Game extends Scene {

    screenWidth = 1080;
    padding = 60;
    containerWidth = this.screenWidth - 2 * this.padding;
    gap = 20;
    columnsCount = 7;
    columnWidth = (this.containerWidth - this.gap * (this.columnsCount - 1)) / this.columnsCount;
    stashPadding = 20;
    fillContainer: GameObjects.Container;
    store = store;

    

    constructor() {
        super('Game');
    }

    create() {
        this.generateFill();
        this.generateDecks();
    }

    generateFill () {
        this.fillContainer = this.add.container(this.padding, 160);
        Array.from({ length: 4 }, (_, i) => {
            const item = this.add.image( 0, 0, 'fill');
            item.setDisplaySize(this.columnWidth, this.columnWidth * item.height/item.width).setOrigin(0, 0);
            item.x = (this.columnWidth + this.gap) * i;
            this.fillContainer.add(item);    
        });
    }

    generateDecks () {
        const [{ decks }] = this.store.getModel('game');
        const decksContainer = this.add.container(this.padding, (this.fillContainer?.list[0] as GameObjects.Image).displayHeight);
        decks.forEach((deck, index) => {
            const deckX = (this.columnWidth + this.gap) * index;
            const deckContainer = this.add.container(deckX, 0);
            deck.forEach((card, cardIndex) => {
                const  {suit, back} = card;
                const cardComponent = new Card(this, 0, this.stashPadding * cardIndex, suit, back);
                deckContainer.add(cardComponent);
            });
            decksContainer.add(deckContainer);
        });

    }



    onResize() {

    }




    changeScene() {

    }
    
}
