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
    stashPadding = 60;
    fillContainer: GameObjects.Container;
    store = store;
    cardRatio: number = 0;
    decksContainer: GameObjects.Container;
    stack: GameObjects.Image;
    currentStack: Card;
    currentDragContainer: GameObjects.Container;
    currentDragPosition: [number, number];
    draggingSprite: GameObjects.Sprite;
    cardMoveID: string;
    followingCards: Card[] = [];

    constructor() {
        super('Game');
    }

    create() {
        this.handleDrag();
        this.generateFill();
        this.generateDecks();
        this.generateStack();
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
    }



    getCardFromDeck(id: string): Card | undefined {
        let result: Card | undefined = undefined;
        this.decksContainer.list.forEach((d, deckIndex) => {
            const deck = d as GameObjects.Container;
            deck.list.forEach((child, index) => {
                const card = child as Card;
                if (card.suit === id) {
                    result = card;
                }
            });
        });
        return result;
    }

    getAfterCards (id: string): Card[] {
        let result: Card[] = [];
        this.decksContainer.list.forEach((d, deckIndex) => {
            const deck = d as GameObjects.Container;
            let cardIndex = -1;
            deck.list.forEach((child, index) => {
                const card = child as Card;
                if (card.suit === id) {
                    cardIndex = index;
                } else if (cardIndex >= 0 && index > cardIndex) {
                    result.push(card);
                }
            });
        });
        return result;
    }

    followCard(obj: GameObjects.Sprite, dragX: number, dragY: number) {
        const [{ decks, size }, { update }] = store.getModel('game');
        const id = obj.texture.key.replace(`${size}_`, '');
        const afterCards = this.getAfterCards(id);
        afterCards.forEach((card, index) => {
            card.img.x = dragX + card.getWorldTransformMatrix().tx;
            card.img.y = dragY + card.getWorldTransformMatrix().ty ;        
        });
    }


    stopFollow(obj: GameObjects.Sprite) {
        const [{ decks, size }, { update }] = store.getModel('game');
        const id = obj.texture.key.replace(`${size}_`, '');
        const afterCards = this.getAfterCards(id);
        afterCards.forEach((card, index) => {
            card.img.x = 0;
            card.img.y = 0;
            card.add(card.img);       
        });
    }

    handleDrag() {
        this.input.on('drag', (pointer: any, obj: GameObjects.Sprite, dragX: number, dragY: number) => {
            obj.x = dragX + this.currentDragContainer?.getWorldTransformMatrix()?.tx || 0;
            obj.y = dragY + this.currentDragContainer?.getWorldTransformMatrix()?.ty || 0;
            this.followCard(obj, dragX, dragY);

        });
        this.input.on('dragstart', (pointer, gameObject: GameObjects.Sprite) => {
            this.currentDragContainer = gameObject.parentContainer;
            this.currentDragPosition = [gameObject.x, gameObject.y];
            if (gameObject.parentContainer) {
                const container = gameObject.parentContainer as Card;
                gameObject.parentContainer.remove(gameObject);
                gameObject.x += this.currentDragContainer.getWorldTransformMatrix().tx;
                gameObject.y += this.currentDragContainer.getWorldTransformMatrix().ty;
                this.draggingSprite = gameObject;
                const id = container.suit;
                const cards = this.getAfterCards(id);
                cards.forEach(card => {
                    card.removeAll();
                    card.img.x += card.getWorldTransformMatrix().tx;
                    card.img.y += card.getWorldTransformMatrix().ty;
                });
                this.followingCards = cards;
            }
        });
        this.input.on('dragend', (pointer, obj: GameObjects.Sprite, dropZone) => {
            EventBus.emit('card_drop', obj);
            this.stopFollow(obj);
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
            });
            this.decksContainer.add(deckContainer);
        });
    }

    refreshDecks(targets: string[], to?: [number, number]) {
        const [{ decks }, { update }] = this.store.getModel('game');
        const id = JSON.stringify({ targets, to });
        if (this.cardMoveID === id) return;
        this.cardMoveID = id;
        let targetDeck: GameObjects.Container | undefined = undefined;
        if (this.currentStack && this.currentStack.suit === targets[0] && to) {
            (this.decksContainer.list[to[0]] as GameObjects.Container).add(this.currentStack);
            this.currentStack.x = 0;
            this.currentStack.y = (to[1] + 1) * this.stashPadding;
            this.currentStack.add(this.draggingSprite);
            this.draggingSprite.setPosition(0, 0)
        } else {
            //把下面的foreach 改成 for循环
            for (let i = 0; i < this.decksContainer.list.length; i++) {
                let found = false
                const deck = this.decksContainer.list[i] as GameObjects.Container;
                for (let j = 0; j < deck.list.length; j++) {
                    const card = deck.list[j] as Card;
                    if (card.suit === targets[0]) {
                        targetDeck = deck as GameObjects.Container;
                        targetDeck.remove(card);
                        this.followingCards.forEach(c => targetDeck?.remove(c))
                        if (to) {
                            let deckContainer = this.decksContainer.list[to[0]] as GameObjects.Container;
                            deckContainer.add(card);
                            card.x = 0;
                            card.y = (to[1] + 1) * this.stashPadding;
                            this.draggingSprite.destroy();
                            card.img = this.add.sprite(0, 0, this.draggingSprite.texture.key).setDisplaySize(card.width, card.height).setOrigin(0, 0);
                            card.add(card.img);
                            this.draggingSprite.setPosition(0, 0);
                            let front = card;
                            this.followingCards.forEach((c, index) => {
                                deckContainer.add(c);
                                c.setDepth(100);
                                c.x = 0;
                                c.y = (to[1] + 2 + index) * this.stashPadding;
                                c.img.destroy();
                                c.img = this.add.sprite(0, 0, c.img.texture.key).setDisplaySize(c.width, c.height).setOrigin(0, 0);
                                c.add(c.img);
                                // deckContainer.moveTo(c, deckContainer.list.length - 1);
                                console.log(deckContainer.getAll());
                                front = c;
                            });
                        }
                        const prev = targetDeck.list[j - 1] as Card;
                        if (prev && prev.suit) {
                            prev.show();
                            prev.removeInteractive();
                            prev.img.removeInteractive();
                        }
                        found = true;
                    }
                    if (j === deck.list.length - 1 && card.back) {
                        card.show();
                    }
                }
                if (found) {
                    break;
                }
            }
        }



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
