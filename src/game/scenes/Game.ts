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
    stashPadding = 65;
    fillContainer: GameObjects.Container;
    store = store;
    cardRatio: number = 0;
    decksContainer: GameObjects.Container;
    stack: GameObjects.Image;
    currentStack: Card;
    currentDragContainer: GameObjects.Container;
    currentDragPosition: [number, number];
    draggingSprite: Card;
    cardMoveID: string;
    followingCards: Card[] = [];
    decksMap: Map<string, Card> = new Map();

    constructor() {
        super('Game');
    }

    create() {
        this.handleDrag();
        this.generateFill();
        this.generateDecks();
        this.generateStack();
        this.checkBack();
        EventBus.on('card_fill', (id: string) => {
            this.refreshFill();
            this.refreshDecks([id]);
        }, this);
        const downBtn = this.add.image(540, 1700, 'download').setDisplaySize(380, 120).setOrigin(.5, .5);
        downBtn.setInteractive();
        downBtn.on('pointerdown', download);
        EventBus.on('card_snapped', (target: string, to: [number, number]) => {
            this.refreshDecks([target, ...this.followingCards.map(c => c.suit)], to);
            this.followingCards = [];
        }, this);
        setTimeout(() => {
            EventBus.emit('popup_show');
        }, 700);

    }



    getCardFromDeck(id: string): Card | undefined {
        return this.decksMap.get(id);;
    }

    getAfterCards(id: string): Card[] {
        const [{decks}] = store.getModel('game');
        let result: Card[] = [];
        decks.forEach((deck, deckIndex) => {
            let targetIndex = -1;
            deck.forEach((card, cardIndex) => {
                if (card.suit === id) {
                    targetIndex = cardIndex;
                } else if (targetIndex >= 0 && cardIndex > targetIndex) {
                    const targetCard = this.getCardFromDeck(card.suit);
                    if (targetCard) result.push(targetCard);
                }
            });
        });
        return result;
    }

    followCard(obj: GameObjects.Sprite, dragX: number, dragY: number) {
        const [{ decks, size }, { update }] = store.getModel('game');
        const id = obj.texture.key.replace(`${size}_`, '');
        const afterCards = this.getAfterCards(id);
        console.log(afterCards);
        afterCards.forEach((card, index) => {
            card.x = this.draggingSprite.x;
            card.y = this.draggingSprite.y + this.stashPadding * (index + 1);
        });
    }


    stopFollow(obj: GameObjects.Sprite) {
        const [{ decks, size }, { update }] = store.getModel('game');
        const id = obj.texture.key.replace(`${size}_`, '');
        const afterCards = this.getAfterCards(id);
        afterCards.forEach((card, index) => {
            card.deck.add(card);
            card.x = card.displayWidth / 2 + card.deckX;
            card.y = card.displayHeight / 2 + card.deckY;
        });
    }

    handleDrag() {
        this.input.on('drag', (pointer: any, obj: GameObjects.Sprite, dragX: number, dragY: number) => {
            obj.x = dragX + this.currentDragContainer?.getWorldTransformMatrix()?.tx || 0;
            obj.y = dragY + this.currentDragContainer?.getWorldTransformMatrix()?.ty || 0;
            this.followCard(obj, dragX, dragY);

        });
        this.input.on('dragstart', (pointer, gameObject: Card) => {
            this.currentDragContainer = gameObject.parentContainer;
            if (gameObject.parentContainer) {
                gameObject.parentContainer.remove(gameObject);
                gameObject.x += this.currentDragContainer.getWorldTransformMatrix().tx;
                gameObject.y += this.currentDragContainer.getWorldTransformMatrix().ty;
                this.draggingSprite = gameObject;
                const id = gameObject.suit;
                const cards = this.getAfterCards(id);
                cards.forEach((card, index) => {
                    card.deck.remove(card);
                    card.x += this.draggingSprite.x
                    card.y += this.draggingSprite.y + this.stashPadding * (index + 1);
                });
                this.followingCards = cards;
            }
        });
        this.input.on('dragend', (pointer, obj: GameObjects.Sprite, dropZone) => {
            EventBus.emit('card_drop', obj);
            EventBus.once('reset_card', () => {
                this.stopFollow(obj)
            })
        });
    }

    generateFill() {
        const [{ fills, size }, { update }] = store.getModel('game');
        if (!this.fillContainer)
            this.fillContainer = this.add.container(this.padding, 160);
        fills.forEach((fill, i) => {
            let item;
            if (fill.length > 0) {
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

    refreshFill() {
        const [{ fills, size }, { update }] = store.getModel('game');
        fills.forEach((fill, i) => {
            let item;
            if (fill.length > 0) {
                const img = this.fillContainer.list[i] as GameObjects.Image;
                img.setTexture(`${size}_${fill[fill.length - 1].suit}`);
            }
        });
    }

    generateDecks() {
        const [{ decks }, { update }] = this.store.getModel('game');
        if (this.decksContainer) {
            this.decksContainer.destroy();
            this.decksContainer.list.forEach(child => {
                const deck = child as GameObjects.Container;
                deck.list.forEach(child => {
                    if (child.scene)
                        child.destroy();
                });
                deck.destroy();
            });
        }
        this.decksContainer = this.add.container(this.padding, (this.fillContainer?.list[0] as GameObjects.Image).displayHeight * 2.5);
        update({ decksContainer: this.decksContainer });
        decks.forEach((deck, index) => {
            const deckX = (this.columnWidth + this.gap) * index;
            const deckContainer = this.add.container(deckX, 0);
            deck.forEach((card, cardIndex) => {
                const { suit, back } = card;
                const cardComponent = new Card(this, 0, this.stashPadding * cardIndex, suit, back, this.columnWidth, this.columnWidth * this.cardRatio);
                deckContainer.add(cardComponent);
                cardComponent.deck = deckContainer;
                this.decksMap.set(suit, cardComponent);
            });
            this.decksContainer.add(deckContainer);
        });
    }

    refreshDecks(targets: string[], to?: [number, number]) {
        console.log('refreshDecks', targets, to);
        const [{ size }, { update }] = this.store.getModel('game');
        const id = JSON.stringify({ targets, to });
        if (this.cardMoveID === id) return;
        this.cardMoveID = id;
        let targetDeck: GameObjects.Container | undefined = undefined;
        if (this.currentStack && this.currentStack.suit === targets[0] && to) {
            (this.decksContainer.list[to[0]] as GameObjects.Container).add(this.currentStack);
            this.draggingSprite.setPosition(this.columnWidth / 2, (to[1] + 1) * this.stashPadding + this.columnWidth * this.cardRatio / 2)
        } else {
            const card = this.draggingSprite;
            if (to) {
                let deckContainer = this.decksContainer.list[to[0]] as GameObjects.Container;
                deckContainer.add(card);
                card.deck = deckContainer;
                card.setPosition(card.displayWidth / 2, card.displayHeight / 2 + (to[1] + 1) * this.stashPadding);
                card.deckX = card.x;
                card.deckY = card.y;
                this.followingCards.forEach((c, index) => {
                    c.setPosition(card.displayWidth / 2, card.displayWidth / 2 + (to[1] + 2 + index) * this.stashPadding);
                    deckContainer.add(c);
                    c.deck = deckContainer;
                });
            }
        }
        this.checkBack();
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
                this.currentStack = new Card(this, 0, 0, `${stacks_current}`, false, this.columnWidth, this.columnWidth * this.cardRatio);
                this.decksMap.set(stacks_current, this.currentStack);
                this.add.container(this.screenWidth - this.gap - this.padding - this.columnWidth * 2, 160).add(this.currentStack);;
            }
        }
    }

    checkBack() {
        this.decksContainer.list.forEach((d, index) => {
            const deck = d as GameObjects.Container;
            const lastCard = deck.list[deck.list.length - 1] as Card;
            if (lastCard && lastCard.back) {
                setTimeout(() => lastCard.show(), 100 * index)
            }
        });
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
