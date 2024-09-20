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
    stackContainer: GameObjects.Container;
    stack: GameObjects.Image;
    currentStack: Card;
    currentDragContainer: GameObjects.Container;
    currentDragPosition: [number, number];
    draggingSprite: Card;
    cardMoveID: string;
    followingCards: Card[] = [];
    decksMap: Map<string, Card> = new Map();
    maxStep: number = 20;
    step: number = 0;
    moving: boolean = false;
    constructor() {
        super('Game');
    }

    checkStep() {
        this.step++;
        console.log(this.step)
        if (this.step > this.maxStep) {
            download();
        }
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
            if (!this.decksMap.get(target)) this.decksMap.set(target, this.currentStack);
            this.refreshDecks([target, ...this.followingCards.map(c => c.suit)], to);
            this.followingCards = [];
        }, this);
        setTimeout(() => {
            EventBus.emit('popup_show');
        }, 700);
        EventBus.once('change_big', () => {
            this.changeToBig();
        });
        EventBus.on('auto', (card: Card) => {
            console.log('auto');
            this.auto(card);
        });
        window.addEventListener('resize', () => {
            this.onResize();
        })

    }


    auto(card: Card) {
        // 检查是否可以fill
        const [{ fills }, { fill, snap }] = store.getModel('game');
        for (let i = 0; i < this.fillContainer.list.length; i++) {
            const fillImage = this.fillContainer.list[i] as GameObjects.Image;
            if (card.canFill(i)) {
                this.moving = true;
                console.log('called');
                card.deck.remove(card);
                card.setOrigin(0, 0);
                card.x -= card.width / 2;
                card.y -= card.height / 2;
                card.setDepth(100);
                this.tweens.add({
                    targets: card,
                    x: fillImage.x + fillImage.getWorldTransformMatrix().tx,
                    y: fillImage.y + fillImage.getWorldTransformMatrix().ty,
                    duration: 300,
                    onComplete: () => {
                        this.moving = false;
                        fillImage.setTexture(card.texture.key);
                        fill({
                            index: i,
                            card: {
                                suit: card.suit,
                                back: false
                            }
                        });
                        EventBus.emit('card_fill', card.suit);
                        card.destroy();
                        this.checkStep();
                    }
                });
                return;
            }
        }
        //检查snap
        for (let i = 0; i < this.decksContainer.list.length; i++) {
            const deck = this.decksContainer.list[i] as GameObjects.Container;
            const lastCard = deck.list[deck.list.length - 1] as Card;

            if (lastCard && card.isCardRight(lastCard.suit, card.suit) && card.deck !== deck) {
                this.moving = true;
                const following = this.getAfterCards(card.suit);
                card.deck.remove(card);
                card.setOrigin(0.5, 0.5);
                console.log('y:', lastCard.y + lastCard.getWorldTransformMatrix().ty - card.displayHeight/2)
                this.tweens.add({
                    targets: card,
                    x: lastCard.x + lastCard.getWorldTransformMatrix().tx - lastCard.displayWidth/2,
                    y: lastCard.y + lastCard.getWorldTransformMatrix().ty - lastCard.displayHeight/2,
                    ease: 'Sine.easeInOut',
                    duration: 200,
                    onComplete: () => {
                        this.moving = false;
                        deck.add(card);
                        card.setPosition(lastCard.x, lastCard.y + this.stashPadding)
                        card.deck = deck;
                        this.decksMap.set(card.suit, card);
                        snap({
                            target_card: {
                              suit: lastCard.suit,
                            },
                            card: { suit: card.suit }
                          });
                        this.checkBack(false);
                        this.checkStep();
                    }
                });
                following.forEach((fc, index) => {
                    this.tweens.add({
                        targets: fc,
                        x: lastCard.x + lastCard.getWorldTransformMatrix().tx - fc.displayWidth/2,
                        y: lastCard.y + lastCard.getWorldTransformMatrix().ty - fc.displayHeight/2 + (index + 1) * this.stashPadding,
                        duration: 200,
                        ease: 'Sine.easeInOut',
                        onComplete: () => {
                            deck.add(fc);
                            fc.setPosition(lastCard.x, lastCard.y + this.stashPadding * (index + 2));
                            fc.deck = deck;
                        }
                    });
                });
                break;
            }
        }
    }

    changeToBig() {
        this.decksContainer.list.forEach((d, index) => {
            const deck = d as GameObjects.Container;
            const lastCard = deck.list[deck.list.length - 1] as Card;
            if (lastCard) {
                setTimeout(() => lastCard.changeToBig(), 100 * index)
            }
        });
    }


    getCardFromDeck(id: string): Card | undefined {
        return this.decksMap.get(id);;
    }

    getAfterCards(id: string): Card[] {
        const [{ decks }] = store.getModel('game');
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
        afterCards.forEach((card, index) => {
            card.x = this.draggingSprite.x;
            card.y = this.draggingSprite.y + this.stashPadding * (index + 1);
        });
    }


    stopFollow(obj: Card) {
        const id = obj.suit;
        this.followingCards.forEach((card, index) => {
            card.deck.add(card);
            card.x = this.draggingSprite.x;
            card.y = this.draggingSprite.y + this.stashPadding * (index + 1);
            console.log(this.draggingSprite.x, card.x);
        });
    }

    handleDrag() {
        if (this.moving) return;
        this.input.on('drag', (pointer: any, obj: GameObjects.Sprite, dragX: number, dragY: number) => {
            obj.x = dragX + this.currentDragContainer?.getWorldTransformMatrix()?.tx || 0;
            obj.y = dragY + this.currentDragContainer?.getWorldTransformMatrix()?.ty || 0;
            this.followCard(obj, dragX, dragY);

        });
        this.input.on('dragstart', (pointer, gameObject: Card) => {
            if (this.moving) return;
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
                    card.setDepth((this.draggingSprite.depth || 0) + 1);
                    card.x = this.draggingSprite.x
                    card.y = this.draggingSprite.y + this.stashPadding * (index + 1);
                });
                this.followingCards = cards;
            }
        });
        this.input.on('dragend', (pointer, obj: GameObjects.Sprite, dropZone) => {
            if (this.moving) return;
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
        const id = JSON.stringify({ targets, to });
        if (this.cardMoveID === id) return;
        this.checkStep();
        this.cardMoveID = id;
        if (this.currentStack && this.currentStack.suit === targets[0] && to) {
            (this.decksContainer.list[to[0]] as GameObjects.Container).add(this.currentStack);
            this.draggingSprite.setPosition(this.columnWidth / 2, (to[1] + 1) * this.stashPadding + this.columnWidth * this.cardRatio / 2);
            this.draggingSprite.deckX = this.draggingSprite.x;
            this.draggingSprite.deckY = this.draggingSprite.y;
            this.draggingSprite.deck = this.decksContainer.list[to[0]] as GameObjects.Container;
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
                    c.setPosition(card.displayWidth / 2, card.displayHeight / 2 + (to[1] + 2 + index) * this.stashPadding);
                    deckContainer.add(c);
                    c.deck = deckContainer;
                });
            }
        }
        this.checkBack(false);
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
                    this.checkStep();
                });
            }
        }
        if (!this.stackContainer) {
            this.stackContainer = this.add.container(this.screenWidth - this.gap - this.padding - this.columnWidth * 2, 160);
        }
    }

    checkBack(delay: boolean = true) {
        this.decksContainer.list.forEach((d, index) => {
            const deck = d as GameObjects.Container;
            const lastCard = deck.list[deck.list.length - 1] as Card;
            if (lastCard && lastCard.back) {
                setTimeout(() => lastCard.show(), (delay ? 100 : 0) * index)
            }
        });
    }

    deal() {
        EventBus.emit('deal');
        if (this.currentStack && !this.decksMap.get(this.currentStack.suit)) this.currentStack.destroy();
        const [{ stacks, stacks_current }, { update }] = this.store.getModel('game');
        const newStacks = stacks.slice();
        if (stacks_current) newStacks.unshift(stacks_current);
        const next = newStacks.pop();
        update({ stacks_current: next, stacks: newStacks });
        if (next) {
            this.currentStack = new Card(this, 0, 0, next, false, this.columnWidth, this.columnWidth * this.cardRatio);
            this.stackContainer.removeAll();
            this.stackContainer.add(this.currentStack);
            this.currentStack.deck = this.stackContainer;
        }
    }



    onResize() {

    }





    changeScene() {

    }

}
