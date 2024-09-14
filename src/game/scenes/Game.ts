import { Scene, GameObjects } from 'phaser';
import store from '@/store'
import Card from '../components/card';
import { EventBus } from '../EventBus';
import download from './constants/download';

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
    currentDeal: string;
    stack: GameObjects.Image;
    currentStack: Card;

    constructor() {
        super('Game');
    }

    create() {
        this.handleDrag();
        this.generateFill();
        this.generateDecks();
        this.generateStack();
        EventBus.on('card_fill', () => {
            this.generateFill();
            this.generateDecks();
        }, this);
        const downBtn = this.add.image(540, 1700, 'download').setDisplaySize(380, 120).setOrigin(.5, .5);
        downBtn.setInteractive();
        downBtn.on('pointerdown', download);
    }

    handleDrag() {
        this.input.on('drag', (pointer, obj, dragX, dragY) => {
            obj.x = dragX;
            obj.y = dragY;
        });
        this.input.on('dragstart', (pointer, gameObject) => { });
        this.input.on('dragend', (pointer, obj, dropZone) => {
            EventBus.emit('card_drop', obj);
        });
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
        const [{ decks }, { update }] = this.store.getModel('game');
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

    generateStack() {
        const [{ stacks, stacks_current, size }] = this.store.getModel('game');
        if (!this.stack) {
            if (stacks.length) {
                this.stack = this.add.image(this.screenWidth - this.padding - this.columnWidth, 160, 'cardBack')
                    .setOrigin(0, 0)
                    .setDisplaySize(this.columnWidth, this.columnWidth * this.cardRatio)
                    .setInteractive();
                this.stack.on('pointerdown', () => {
                    this.deal();
                    this.generateStack();
                });
            }
        } else {
            if (this.stack && !stacks.length) {
                this.stack.destroy();
            }
            if (stacks_current) {
                if (this.currentStack) {
                    this.currentStack.destroy();
                }
                console.log('currentStack', `${size}_${stacks_current}`);
                this.currentStack = new Card(this, 0, 0, `${stacks_current}`, false, this.columnWidth, this.columnWidth * this.cardRatio);
                this.add.container(this.screenWidth - this.gap - this.padding - this.columnWidth * 2, 160).add(this.currentStack);;
            }
        }
    }

    deal() {
        const [{ stacks, stacks_current }, { update }] = this.store.getModel('game');
        const newStacks = stacks.slice();
        if (stacks_current) newStacks.unshift(stacks_current);
        const next = newStacks.pop();
        update({ stacks_current: next, stacks: newStacks });
    }



    onResize() {

    }





    changeScene() {

    }

}
