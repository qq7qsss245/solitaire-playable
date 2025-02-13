import { EventBus } from '../EventBus';
import { GameObjects, Scene } from 'phaser';
import { Card as CardComponent } from '../components/Card';
import { initialLayout, Card as CardType, CardSuit, CardValue } from '../../config/layout';

interface CardColumn {
    cards: CardComponent[];
    x: number;
}

interface FoundationPile {
    zone: Phaser.GameObjects.Sprite;
    cards: CardComponent[];
    suit?: CardSuit;  // 一旦放入第一张牌(A)就确定花色
}

export class Game extends Scene {
    public cards: CardComponent[] = [];
    public currentOffsetX: number = 0;
    public currentOffsetY: number = 0;
    public foundationZones: Phaser.GameObjects.Sprite[] = []; // 收牌区位置
    public playNowButton: Phaser.GameObjects.Image; // 添加按钮属性
    private columns: CardColumn[] = []; // 存储每列的卡牌
    private foundations: FoundationPile[] = []; // 存储收牌区状态

    // 定义横竖屏尺寸
    public readonly LANDSCAPE_WIDTH = 1920;
    public readonly LANDSCAPE_HEIGHT = 1080;
    public readonly PORTRAIT_WIDTH = 1080;
    public readonly PORTRAIT_HEIGHT = 1920;
    public readonly ColumGap = 10;

    // 定义卡牌基础尺寸
    public readonly CARD_HEIGHT = 164;     // 246 * (2/3)
    public readonly CARD_WIDTH = 120;      // 180 * (2/3)

    // 定义卡牌布局参数(全部基于卡牌尺寸计算)
    public get CARD_GAP_X() { return this.CARD_WIDTH + this.ColumGap; }
    public get CARD_GAP_Y() { return this.CARD_HEIGHT / 4; }       // 垂直间距为卡牌高度的1/4
    public get MARGIN_TOP() { return this.CARD_HEIGHT * 0.4; }      // 顶部边距为卡牌高度的0.4倍
    public get LAYOUT_OFFSET_X() { return this.CARD_HEIGHT * 4.5; } // 整体右偏移为卡牌高度的4.5倍
    public fillZones: GameObjects.Image[] = [];

    constructor() {
        super('Game');
    }

    create() {
        // 创建初始牌局
        this.createInitialLayout();
        
        // 创建收牌区
        this.createFoundationZones();

        // 创建Play Now按钮
        this.createPlayNowButton();

        // 监听窗口大小变化
        window.addEventListener('resize', this.onResize);

        // 通知场景准备完成
        EventBus.emit('current-scene-ready', this);

        // 设置初始游戏尺寸
        this.updateGameSize();
    }

    private updateGameSize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspectRatio = width / height;

        // 如果宽度大于高度,使用横屏模式
        if (aspectRatio > 1) {
            this.scale.setGameSize(this.LANDSCAPE_WIDTH, this.LANDSCAPE_HEIGHT);
        } else {
            // 否则使用竖屏模式
            this.scale.setGameSize(this.PORTRAIT_WIDTH, this.PORTRAIT_HEIGHT);
        }

        // 更新组件位置
        this.updateComponents();
    }

    private createFoundationZones(): void {
        // 计算最左侧牌组的x坐标(与createInitialLayout中的计算保持一致)
        const middleStartX = -this.CARD_GAP_X;
        const leftmostPileX = middleStartX - (2 * (this.CARD_WIDTH + this.ColumGap));
        
        // 计算右侧倒数第二列和最后一列的x坐标
        const rightSecondLastX = middleStartX + (3 * this.CARD_GAP_X); // 倒数第二列
        const rightLastX = middleStartX + (4 * this.CARD_GAP_X);       // 最后一列
        
        // 存储所有cardFill的x坐标
        const cardFillXPositions = [];
        
        // 创建前两个收牌区(左侧)
        for (let i = 0; i < 2; i++) {
            const x = leftmostPileX + (i * (this.CARD_WIDTH + this.ColumGap)) + this.currentOffsetX;
            cardFillXPositions.push(x);
            const zone = this.add.sprite(x, this.MARGIN_TOP + this.currentOffsetY, 'card-fill');
            zone.setDisplaySize(this.CARD_WIDTH, this.CARD_HEIGHT);
            zone.setDepth(0); // 设置收牌区基础深度为0
            this.foundationZones.push(zone);
            this.fillZones.push(zone);
            
            // 初始化收牌区状态
            this.foundations.push({
                zone: zone,
                cards: []
            });
        }

        // 创建后两个收牌区(右侧),但位置相反
        const rightPositions = [
            rightLastX,      // 第四个位置(最右列)
            rightSecondLastX // 第三个位置(倒数第二列)
        ];
        
        for (let i = 0; i < 2; i++) {
            const x = rightPositions[i] + this.currentOffsetX;
            cardFillXPositions.push(x);
            const zone = this.add.sprite(x, this.MARGIN_TOP + this.currentOffsetY, 'card-fill');
            zone.setDisplaySize(this.CARD_WIDTH, this.CARD_HEIGHT);
            zone.setDepth(0); // 设置收牌区基础深度为0
            this.foundationZones.push(zone);
            this.fillZones.push(zone);
            
            // 初始化收牌区状态
            this.foundations.push({
                zone: zone,
                cards: []
            });
        }
    }

    private createPlayNowButton(): void {
        this.playNowButton = this.add.image(0, 0, 'download');
        this.playNowButton.setInteractive();
        this.playNowButton.on('pointerdown', () => {
            // 在这里添加点击按钮后的逻辑

        });
        
        // 添加缩放动画,持续时间改为750ms
        this.tweens.add({
            targets: this.playNowButton,
            scale: 1.15,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.updatePlayNowButtonPosition();
    }

    private updatePlayNowButtonPosition(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspectRatio = width / height;

        if (aspectRatio > 1) {
            // 横屏模式
            this.playNowButton.setPosition(
                this.CARD_WIDTH * 2,
                this.scale.height / 2
            );
        } else {
            // 竖屏模式
            this.playNowButton.setPosition(
                this.CARD_WIDTH,
                this.scale.height / 4
            );
        }
    }

    private updateComponents(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspectRatio = width / height;

        // 计算新的偏移值
        if (aspectRatio > 1) {
            // 横屏模式
            this.currentOffsetX = 1920 - this.CARD_WIDTH * 5;
            this.currentOffsetY = this.CARD_HEIGHT;
        } else {
            // 竖屏模式
            this.currentOffsetX = this.scale.width / 2;
            this.currentOffsetY = this.scale.height / 2 - this.LAYOUT_OFFSET_X;
        }

        // 更新所有卡牌的位置
        this.cards.forEach(card => {
            const originalX = card.x - (card.parentContainer?.x || 0);
            const originalY = card.y - (card.parentContainer?.y || 0);
            card.setPosition(originalX + this.currentOffsetX, originalY + this.currentOffsetY);
        });

        // 更新所有foundation zones的位置
        this.foundationZones.forEach(zone => {
            const originalX = zone.x - (zone.parentContainer?.x || 0);
            const originalY = zone.y - (zone.parentContainer?.y || 0);
            zone.setPosition(originalX + this.currentOffsetX, originalY + this.currentOffsetY);
        });

        // 更新Play Now按钮位置
        this.updatePlayNowButtonPosition();
    }

    private createInitialLayout(): void {
        // 计算中间三列的起始位置
        const middleStartX = -this.CARD_GAP_X;

        // 计算左右两侧牌堆的起始Y位置(从中间列第六张牌的位置开始)
        const sideStartY = this.MARGIN_TOP + 5 * this.CARD_GAP_Y; // 第六张牌的Y位置

        // 创建左侧两组牌
        initialLayout.leftPiles.forEach((pile, pileIndex) => {
            const pileX = middleStartX - (2 * (this.CARD_WIDTH + this.ColumGap)) + (pileIndex * (this.CARD_WIDTH + this.ColumGap));
            pile.cards.forEach((cardData, cardIndex) => {
                const x = pileX + this.currentOffsetX;
                const y = sideStartY + cardIndex * this.CARD_GAP_Y + this.currentOffsetY;
                const typedCardData = cardData as CardType;
                const card = new CardComponent(this, x, y, typedCardData.suit, typedCardData.value, typedCardData.faceUp);
                this.add.existing(card);
                card.setDepth(y); // 设置深度与y坐标相关
                this.cards.push(card);
                this.addCardToColumn(pileIndex, card);
            });
        });

        // 创建中间三列牌
        initialLayout.centerPiles.forEach((pile, pileIndex) => {
            const columnIndex = pileIndex + 2; // 中间列从索引2开始
            const pileX = middleStartX + (pileIndex * this.CARD_GAP_X);
            pile.cards.forEach((cardData, cardIndex) => {
                const x = pileX + this.currentOffsetX;
                const y = this.MARGIN_TOP + cardIndex * this.CARD_GAP_Y + this.currentOffsetY;
                const typedCardData = cardData as CardType;
                const card = new CardComponent(this, x, y, typedCardData.suit, typedCardData.value, typedCardData.faceUp);
                this.add.existing(card);
                card.setDepth(y); // 设置深度与y坐标相关
                this.cards.push(card);
                this.addCardToColumn(columnIndex, card);
            });
        });

        // 创建右侧两组牌
        initialLayout.rightPiles.forEach((pile, pileIndex) => {
            const columnIndex = pileIndex + 5; // 右侧列从索引5开始
            const pileX = middleStartX + (3 * this.CARD_GAP_X) + (pileIndex * this.CARD_GAP_X);
            pile.cards.forEach((cardData, cardIndex) => {
                const x = pileX + this.currentOffsetX;
                const y = sideStartY + cardIndex * this.CARD_GAP_Y + this.currentOffsetY;
                const typedCardData = cardData as CardType;
                const card = new CardComponent(this, x, y, typedCardData.suit, typedCardData.value, typedCardData.faceUp);
                this.add.existing(card);
                card.setDepth(y); // 设置深度与y坐标相关
                this.cards.push(card);
                this.addCardToColumn(columnIndex, card);
            });
        });
    }

    onResize(): void {
        this.updateGameSize();
    }

    // 添加卡牌到列
    private addCardToColumn(columnIndex: number, card: CardComponent) {
        if (!this.columns[columnIndex]) {
            this.columns[columnIndex] = { cards: [], x: card.x };
        }
        this.columns[columnIndex].cards.push(card);
        
    }

    // 从列中移除卡牌
    private removeCardFromColumn(card: CardComponent): number {
        for (let i = 0; i < this.columns.length; i++) {
            const column = this.columns[i];
            const index = column.cards.indexOf(card);
            if (index !== -1) {
                column.cards.splice(index, 1);
                return i;
            }
        }
        return -1;
    }

    // 获取卡牌所在列中上一张牌(视觉上的"下一张"要翻开的牌)
    public getNextCard(card: CardComponent): CardComponent | null {
        // 找到卡牌所在的列和位置
        for (let i = 0; i < this.columns.length; i++) {
            const column = this.columns[i];
            const index = column.cards.indexOf(card);
            if (index !== -1 && index > 0) {
                return column.cards[index - 1];
            }
        }
        return null;
    }

    // 获取卡牌所在的列索引
    public getColumnIndex(card: CardComponent): number {
        for (let i = 0; i < this.columns.length; i++) {
            if (this.columns[i].cards.indexOf(card) !== -1) {
                return i;
            }
        }
        return -1;
    }

    // 获取卡牌下面的所有卡牌
    public getAttachedCards(card: CardComponent): CardComponent[] {
        const columnIndex = this.getColumnIndex(card);
        
        if (columnIndex === -1) {
            return [];
        }

        const column = this.columns[columnIndex];
        const cardIndex = column.cards.indexOf(card);
        
        if (cardIndex === -1) {
            return [];
        }

        // 返回从当前卡牌到列尾的所有卡牌
        const attachedCards = column.cards.slice(cardIndex + 1);
        return attachedCards;
    }

    // 移动卡牌到新列
    public moveCardToColumn(card: CardComponent, columnIndex: number) {
        // 获取要移动的所有卡牌
        const attachedCards = this.getAttachedCards(card);
        
        
        // 从原列中移除所有卡牌
        this.removeCardFromColumn(card);
        attachedCards.forEach(attachedCard => {
            this.removeCardFromColumn(attachedCard);
        });

        // 添加到新列
        this.addCardToColumn(columnIndex, card);
        attachedCards.forEach(attachedCard => {
            this.addCardToColumn(columnIndex, attachedCard);
        });
    }

    // 检查收牌区是否可以接收卡牌
    public canAddToFoundation(card: CardComponent, foundationIndex: number): boolean {
        const foundation = this.foundations[foundationIndex];
        // 如果是空的收牌区,只接受A
        if (foundation.cards.length === 0) {
            return card.numericValue === 1;
        }
        
        // 如果已经有牌,检查花色和顺序
        if (!foundation.suit) {
            foundation.suit = card.suit;
        }
        
        const topCard = foundation.cards[foundation.cards.length - 1];
        return card.suit === foundation.suit &&
               card.numericValue === topCard.numericValue + 1;
    }

    // 添加卡牌到收牌区
    public addToFoundation(card: CardComponent, foundationIndex: number) {
        const foundation = this.foundations[foundationIndex];
        // 从原列中移除
        this.removeCardFromColumn(card);
        
        // 添加到收牌区
        foundation.cards.push(card);
        if (!foundation.suit) {
            foundation.suit = card.suit;
        }

        // 设置卡牌位置到收牌区中心
        card.x = foundation.zone.x;
        card.y = foundation.zone.y;
        card.setDepth(10 + foundation.cards.length); // 确保卡牌在收牌区上方,且新卡牌在顶部
        
        // 禁用卡牌交互
        card.disableInteractive();
        card.removeAllListeners(); // 移除所有事件监听器
        
        // 播放收牌音效
        EventBus.emit('play-sound', 'fill');
        
        // 检查是否胜利
        this.checkWinCondition();
    }

    // 检查胜利条件
    private checkWinCondition() {
        // 检查每个收牌区是否都收集了13张牌(A到K)
        const isComplete = this.foundations.every(foundation =>
            foundation.cards.length === 13
        );
        
        if (isComplete) {
            // 发送胜利事件
            EventBus.emit('game-win');
        }
    }

    // 获取每列最底部的卡牌
    public getColumnBottomCards(): CardComponent[] {
        const bottomCards: CardComponent[] = [];
        this.columns.forEach(column => {
            if (column.cards.length > 0) {
                bottomCards.push(column.cards[column.cards.length - 1]);
            }
        });
        return bottomCards;
    }
}
