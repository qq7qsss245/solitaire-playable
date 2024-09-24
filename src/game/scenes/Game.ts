import { Scene, GameObjects } from 'phaser';
import store from '@/store'
import Card from '../components/card';
import { EventBus } from '../EventBus';
import download from './constants/download';

export class Game extends Scene {

    screenWidth = 1180;
    padding = 100;
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
    dragStart: number = 0;
    dragInterval: number = 200;
    dragInterId: any;
    deckColumns: GameObjects.Graphics[];
    hand: GameObjects.Sprite;
    GameStarted:boolean = false;
    constructor() {
        super('Game');
    }

    checkStep() {
        this.step++;
        console.log(this.step);
        if (this.step > this.maxStep) {
            download();
        }
        if (this.step < 2) {
            this.showTip();
        } else {
            this.hand.destroy();
            this.GameStarted = true;
        }
    }

    checkMove (card: Card) {
        return this.GameStarted || this.step === 0 && card.suit === 'f_A' || this.step === 1 && card.suit === 'f_3';
    }

    create() {
        this.handleDrag();
        this.generateFill();
        this.generateEmpty();
        this.generateDecks();
        this.generateStack();
        this.checkBack();
        this.tweens.add({
            targets: this.hand,
            scaleY: .55,
            scaleX: .55,
            duration: 500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        })
        EventBus.on('card_fill', (id: string) => {
            this.refreshFill();
            this.refreshDecks([id]);
        }, this);
        const downBtn = this.add.image(this.screenWidth/2, 1700, 'download').setDisplaySize(780, 240).setOrigin(.5, .5);
        downBtn.setInteractive();
        downBtn.on('pointerdown', download);
        EventBus.on('card_snapped', (target: string, to: [number, number]) => {
            if (!this.decksMap.get(target)) this.decksMap.set(target, this.currentStack);
            this.refreshDecks([target, ...this.followingCards.map(c => c.suit)], to);
            this.followingCards = [];
        }, this);
        setTimeout(() => {
            EventBus.emit('popup_show');
        }, 1000);

        EventBus.once('popup_hide', () => {
            this.hand = this.add.sprite(0, 0, 'hand').setScale(.4, .4).setAlpha(0);
            this.showTip();
        });
        EventBus.once('change_big', () => {
            this.changeToBig();
        });
        window.addEventListener('resize', () => {
            this.onResize();
        })
    }

    showTip() {
        if (this.step === 0) {
            const step1Target = (this.decksContainer.list[6] as GameObjects.Container).list[6] as Card;
            this.hand.setPosition(
                step1Target.x + step1Target.deck.getWorldTransformMatrix().tx + step1Target.displayWidth * .5,
                step1Target.y + step1Target.deck.getWorldTransformMatrix().ty + step1Target.displayHeight * .5
            );
            this.hand.setAlpha(1);
            this.add.tween({
                targets: this.hand,
                x: this.hand.x + 20,
                y: this.hand.y + 20,
                duration: 500,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
        } else if (this.step === 1) {
            console.log('step 2')
            const step2Target = (this.decksContainer.list[0] as GameObjects.Container).list[0] as Card;
            this.hand.setAlpha(1)
            this.add.tween({
                targets: this.hand,
                x: step2Target.x + step2Target.deck.getWorldTransformMatrix().tx + step2Target.displayWidth * .5,
                y: step2Target.y + step2Target.deck.getWorldTransformMatrix().ty + step2Target.displayHeight * .5,
                duration: 500,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    this.add.tween({
                        targets: this.hand,
                        x: this.hand.x + 30,
                        y: this.hand.y + 30,
                        duration: 500,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1
                    });
                }
            })

        }
        
    }

    generateEmpty() {
        const [{ decks }, { snap }] = this.store.getModel('game');
        decks.forEach((deck, index) => {
            const deckX = (this.columnWidth + this.gap) * index;
            const placeHolder = this.add.image(this.padding + deckX, (this.fillContainer?.list[0] as GameObjects.Image).displayHeight * 2.5, 'fill').setDisplaySize(this.columnWidth, this.columnWidth * this.cardRatio).setOrigin(0, 0);
            placeHolder.setAlpha(0);
            EventBus.on('card_drop', (card: Card) => {
                if (card.suit.endsWith('K')) {
                    const emptyBounds = placeHolder.getBounds();
                    const cardBounds = card.getBounds();
                    const following = this.getAfterCards(card.suit);
                    if (Phaser.Geom.Intersects.RectangleToRectangle(emptyBounds, cardBounds)) {
                        const deck = this.decksContainer.list[index] as GameObjects.Container
                        if (deck.list.length === 0) {
                            deck.add(card);
                            card.setPosition(card.displayWidth / 2, card.displayHeight / 2);
                            card.deckX = card.x;
                            card.deckY = card.y;
                            card.deck = deck;
                            snap({
                                target_column: index,
                                card: { suit: card.suit, back: false }
                            });
                            this.checkBack(false);
                            following.forEach((fc, index) => {
                                deck.add(fc);
                                fc.setPosition(card.x, card.y + this.stashPadding * (index + 1));
                                fc.deckX = fc.x;
                                fc.deckY = fc.y;
                                fc.deck = deck;
                            });
                        }
                    }
                }
            })
        });
    }


    auto(card: Card) {
        let result = false;
        // 检查是否可以fill
        const [{ fills }, { fill, snap }] = store.getModel('game');
        for (let i = 0; i < this.fillContainer.list.length; i++) {
            const fillImage = this.fillContainer.list[i] as GameObjects.Image;
            if (card.canFill(i)) {
                result = true;
                card.deck.remove(card);
                card.setOrigin(0, 0);
                card.x -= card.width / 2;
                card.y -= card.height / 2;
                this.tweens.add({
                    targets: card,
                    x: fillImage.x + fillImage.parentContainer.getWorldTransformMatrix().tx,
                    y: fillImage.y + fillImage.parentContainer.getWorldTransformMatrix().ty,
                    duration: 300,
                    onComplete: () => {
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
                    }
                });
                return result;
            }
        }
        //检查snap
        for (let i = 0; i < this.decksContainer.list.length; i++) {
            const deck = this.decksContainer.list[i] as GameObjects.Container;
            const lastCard = deck.list[deck.list.length - 1] as Card;

            if (lastCard && card.isCardRight(lastCard.suit, card.suit) && card.deck !== deck) {
                const following = this.getAfterCards(card.suit);
                result = true;
                card.deck.remove(card);
                console.log('y:', lastCard.y + lastCard.getWorldTransformMatrix().ty - card.displayHeight / 2)
                this.tweens.add({
                    targets: card,
                    x: lastCard.x + lastCard.deck.getWorldTransformMatrix().tx,
                    y: lastCard.y + lastCard.deck.getWorldTransformMatrix().ty + this.stashPadding,
                    ease: 'Sine.easeInOut',
                    duration: 200,
                    onComplete: () => {
                        this.moving = false;
                        deck.add(card);
                        card.setPosition(lastCard.x, lastCard.y + this.stashPadding);
                        card.deckX = card.x;
                        card.deckY = card.y;
                        card.deck = deck;
                        this.decksMap.set(card.suit, card);
                        snap({
                            target_card: {
                                suit: lastCard.suit,
                                back: false
                            },
                            card: { suit: card.suit, back: true }
                        });
                        this.checkBack(false);
                        this.checkStep();
                        EventBus.emit('snapped_sound');
                    }
                });
                following.forEach((fc, index) => {
                    this.tweens.add({
                        targets: fc,
                        x: lastCard.x + lastCard.getWorldTransformMatrix().tx - fc.displayWidth / 2,
                        y: lastCard.y + lastCard.getWorldTransformMatrix().ty - fc.displayHeight / 2 + (index + 1) * this.stashPadding,
                        duration: 200,
                        ease: 'Sine.easeInOut',
                        onComplete: () => {
                            deck.add(fc);
                            fc.setPosition(lastCard.x, lastCard.y + this.stashPadding * (index + 2));
                            fc.deckX = fc.x;
                            fc.deckY = fc.y;
                            fc.deck = deck;
                        }
                    });
                });
                return result;
            }
        }
        // 检查空白列
        if (card.suit.endsWith('K')) {
            for (let i = 0; i < this.decksContainer.list.length; i++) {
                const deck = this.decksContainer.list[i] as GameObjects.Container;
                const following = this.getAfterCards(card.suit);
                if (deck.list.length === 0) {
                    result = true;
                    card.deck.remove(card);
                    this.tweens.add({
                        targets: card,
                        x: (this.columnWidth + this.gap) * i + card.displayWidth / 2 + deck.getWorldTransformMatrix().tx,
                        y: deck.y + card.displayHeight / 2 + deck.getWorldTransformMatrix().ty,
                        duration: 200,
                        onComplete: () => {
                            this.moving = false;
                            deck.add(card);
                            card.setPosition(card.displayWidth / 2, card.displayHeight / 2);
                            card.deckX = card.x;
                            card.deckY = card.y;
                            card.deck = deck;
                            this.checkBack(false);
                            snap({
                                target_column: i,
                                card: { suit: card.suit, back: false }
                            });
                        }
                    });
                    following.forEach((fc, index) => {
                        fc.deck.remove(fc);
                        this.tweens.add({
                            targets: fc,
                            x: (this.columnWidth + this.gap) * i + card.displayWidth / 2 + deck.parentContainer.getWorldTransformMatrix().tx,
                            y: deck.y + card.displayHeight / 2 + deck.parentContainer.getWorldTransformMatrix().ty + (index + 1) * this.stashPadding,
                            duration: 200,
                            ease: 'Sine.easeInOut',
                            onComplete: () => {
                                deck.add(fc);
                                fc.setPosition(fc.displayWidth / 2, fc.displayHeight / 2 + this.stashPadding * (index + 1));
                                fc.deck = deck;
                            }
                        });
                    });
                    break;
                }
            }
        }
        return result;
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
        return this.decksMap.get(id);
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
        console.log('afterCards:', afterCards);
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
        this.input.on('drag', (pointer: any, obj: Card, dragX: number, dragY: number) => {
            if (!this.checkMove(obj)) return;
            if (this.moving) return;
            obj.x = dragX + obj.deck.getWorldTransformMatrix()?.tx || 0;
            obj.y = dragY + obj.deck.getWorldTransformMatrix()?.ty || 0;
            this.followCard(obj, dragX, dragY);

        });
        this.input.on('dragstart', (pointer, gameObject: Card) => {
            if (!this.checkMove(gameObject)) return;
            this.dragStart = Date.now();
            if (gameObject.parentContainer) {
                gameObject.parentContainer.remove(gameObject);
                gameObject.x += gameObject.deck.getWorldTransformMatrix().tx;
                gameObject.y += gameObject.deck.getWorldTransformMatrix().ty;
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
                console.log("following:", this.followingCards)
            }
        });
        this.input.on('dragend', (pointer, obj: Card, dropZone) => {
            if (!this.checkMove(obj)) return;
            if (Date.now() - this.dragStart > this.dragInterval) {
                EventBus.emit('card_drop', obj);
            } else {
                let filled = this.auto(obj);
                if (!filled && !obj.deck.list.find((card: any) => card.suit === obj.suit)) {
                    obj.deck.add(obj);
                    obj.setPosition(obj.deckX, obj.deckY);
                }
            }
            EventBus.once('reset_card', () => {
                this.stopFollow(obj);
            });
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
                    if (!this.GameStarted) return;
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
