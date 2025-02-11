import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { Card as CardComponent } from '../components/Card';
import { initialLayout, Card as CardType, CardSuit, CardValue } from '../../config/layout';

export class Game extends Scene {
    private cards: CardComponent[] = [];

    // 定义横竖屏尺寸
    private readonly LANDSCAPE_WIDTH = 1920;
    private readonly LANDSCAPE_HEIGHT = 1080;
    private readonly PORTRAIT_WIDTH = 1080;
    private readonly PORTRAIT_HEIGHT = 1920;

    // 定义卡牌基础尺寸
    private readonly CARD_HEIGHT = 164;     // 246 * (2/3)
    private readonly CARD_WIDTH = 120;      // 180 * (2/3)

    // 定义卡牌布局参数(全部基于卡牌尺寸计算)
    private get CARD_GAP_X() { return this.CARD_WIDTH * 1; }       // 水平间距为卡牌宽度的1.2倍
    private get CARD_GAP_Y() { return this.CARD_HEIGHT / 4; }       // 垂直间距为卡牌高度的1/4
    private get MARGIN_TOP() { return this.CARD_HEIGHT * 0.4; }      // 顶部边距为卡牌高度的0.4倍
    private get LAYOUT_OFFSET_X() { return this.CARD_HEIGHT * 4.5; } // 整体右偏移为卡牌高度的4.5倍

    constructor() {
        super('Game');
    }

    create() {
        // 设置初始游戏尺寸
        this.updateGameSize();

        // 创建初始牌局
        this.createInitialLayout();

        // 监听窗口大小变化
        this.scale.on('resize', this.onResize, this);

        // 通知场景准备完成
        EventBus.emit('current-scene-ready', this);
    }

    private updateGameSize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspectRatio = width / height;

        // 如果宽度大于高度,使用横屏模式
        if (aspectRatio > 1) {
            this.scale.setGameSize(this.LANDSCAPE_WIDTH, this.LANDSCAPE_HEIGHT);
            this.cameras.main.setZoom(Math.min(width / this.LANDSCAPE_WIDTH, height / this.LANDSCAPE_HEIGHT));
        } else {
            // 否则使用竖屏模式
            this.scale.setGameSize(this.PORTRAIT_WIDTH, this.PORTRAIT_HEIGHT);
            this.cameras.main.setZoom(Math.min(width / this.PORTRAIT_WIDTH, height / this.PORTRAIT_HEIGHT));
        }

        // 居中显示
        this.cameras.main.centerOn(this.scale.width / 2, this.scale.height / 2);
    }

    private createInitialLayout(): void {
        const centerX = this.scale.width / 2 + this.LAYOUT_OFFSET_X;
        const centerY = this.scale.height / 2;

        // 计算中间三列的起始位置
        const middleStartX = centerX - this.CARD_GAP_X;

        // 计算左右两侧牌堆的起始Y位置(从中间列第六张牌的位置开始)
        const sideStartY = this.MARGIN_TOP + 5 * this.CARD_GAP_Y; // 第六张牌的Y位置

        // 创建左侧两组牌
        initialLayout.leftPiles.forEach((pile, pileIndex) => {
            const pileX = middleStartX - (2 * this.CARD_GAP_X) + (pileIndex * this.CARD_GAP_X);
            pile.cards.forEach((cardData, cardIndex) => {
                const x = pileX;
                const y = sideStartY + cardIndex * this.CARD_GAP_Y;
                const typedCardData = cardData as CardType;
                const card = new CardComponent(this, x, y, typedCardData.suit, typedCardData.value, typedCardData.faceUp);
                this.add.existing(card);
                this.cards.push(card);
            });
        });

        // 创建中间三列牌
        initialLayout.centerPiles.forEach((pile, pileIndex) => {
            const pileX = middleStartX + (pileIndex * this.CARD_GAP_X);
            pile.cards.forEach((cardData, cardIndex) => {
                const x = pileX;
                const y = this.MARGIN_TOP + cardIndex * this.CARD_GAP_Y;
                const typedCardData = cardData as CardType;
                const card = new CardComponent(this, x, y, typedCardData.suit, typedCardData.value, typedCardData.faceUp);
                this.add.existing(card);
                this.cards.push(card);
            });
        });

        // 创建右侧两组牌
        initialLayout.rightPiles.forEach((pile, pileIndex) => {
            const pileX = middleStartX + (3 * this.CARD_GAP_X) + (pileIndex * this.CARD_GAP_X);
            pile.cards.forEach((cardData, cardIndex) => {
                const x = pileX;
                const y = sideStartY + cardIndex * this.CARD_GAP_Y;
                const typedCardData = cardData as CardType;
                const card = new CardComponent(this, x, y, typedCardData.suit, typedCardData.value, typedCardData.faceUp);
                this.add.existing(card);
                this.cards.push(card);
            });
        });
    }

    onResize(): void {
        this.updateGameSize();
    }
}
