import { Scene, GameObjects } from 'phaser';
import store from '@/store'
import Card from '../components/card';
import { EventBus } from '../EventBus';

export class Game extends Scene {

    screenWidth = 1080;
    padding = 60;
    containerWidth = this.screenWidth - 2 * this.padding;
    gap = 20;
    columnsCount = 7;
    columnWidth = (this.containerWidth - this.gap * (this.columnsCount - 1)) / this.columnsCount;
    stashPadding = 30;
    fillContainer: GameObjects.Container;
    store = store;
    cardRatio: number = 0;
    decksContainer: GameObjects.Container;

    constructor() {
        super('Game');
    }

    create() {
        this.generateFill();
        this.generateDecks();
        EventBus.on('card_fill', () => {
            this.generateFill();
            this.generateDecks();
        }, this)
    }

    generateFill() {
        const [{ fills, size }, { update }] = store.getModel('game');
        if (!this.fillContainer)
            this.fillContainer = this.add.container(this.padding, 160);
        fills.forEach((fill, i) => {
            let item;
            if (fill.length > 0) {
                console.log('fill', fill);
                item = this.add.image(0, 0, `${size}_${fill[fill.length - 1].suit}`);
            } else {
                item = this.add.image(0, 0, 'fill');
            }
            this.cardRatio = item.height / item.width;
            item.setDisplaySize(this.columnWidth, this.columnWidth * this.cardRatio).setOrigin(0, 0);
            item.x = (this.columnWidth + this.gap) * i;
            this.fillContainer.add(item);
        });
        update({ fillContainer: this.fillContainer });
    }

    generateDecks() {
        const [{ decks }, {update}] = this.store.getModel('game');
        if (this.decksContainer) this.decksContainer.destroy();
        this.decksContainer = this.add.container(this.padding, (this.fillContainer?.list[0] as GameObjects.Image).displayHeight * 2.5);
        update({ decksContainer: this.decksContainer });
        decks.forEach((deck, index) => {
            const deckX = (this.columnWidth + this.gap) * index;
            const deckContainer = this.add.container(deckX, 0);
            deck.forEach((card, cardIndex) => {
                const { suit, back } = card;
                const cardComponent = new Card(this, 0, this.stashPadding * cardIndex, suit, back, this.columnWidth, this.columnWidth * this.cardRatio);
                deckContainer.add(cardComponent);
            });
            this.decksContainer.add(deckContainer);
        });
    }



    onResize() {

    }




    changeScene() {

    }

}
