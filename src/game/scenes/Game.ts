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

// 布局配置接口
interface LayoutConfig {
    cardColumns: {
        startX: number;
        startY: number;
        gapX: number;
        gapY: number;
    };
    foundation: {
        startX: number;
        startY: number;
        gap: number;
    };
    score: {
        x: number;
        y: number;
    };
    downloadButton: {
        x: number;
        y: number;
    };
}

export class Game extends Scene {
    public cards: CardComponent[] = [];
    public currentOffsetX: number = 0;
    public currentOffsetY: number = 0;
    public foundationZones: Phaser.GameObjects.Sprite[] = []; // 收牌区位置
    public playNowButton: Phaser.GameObjects.Image; // 添加按钮属性
    private columns: CardColumn[] = []; // 存储每列的卡牌
    private foundations: FoundationPile[] = []; // 存储收牌区状态
    private score: number = 0; // 游戏得分
    private moves: number = 0; // 移动次数
    private scoreText: Phaser.GameObjects.Text; // 分数显示
    private movesText: Phaser.GameObjects.Text; // 移动次数显示
    private handGuide: Phaser.GameObjects.Image; // 引导手势图片
    private guideTimer: number = 0; // 无操作计时器
    private lastMoves: number = 0; // 上次的移动次数

    // 布局配置
    private landscapeLayout: LayoutConfig = {
        cardColumns: {
            startX: 0,     // 使用0作为基准点
            startY: 164,   // CARD_HEIGHT
            gapX: 130,     // CARD_WIDTH + 10
            gapY: 41       // CARD_HEIGHT / 4
        },
        foundation: {
            startX: -240,  // -2 * CARD_WIDTH
            startY: 65.6,  // MARGIN_TOP
            gap: 130       // CARD_WIDTH + 10
        },
        score: {
            x: 40,
            y: 360        // height / 3
        },
        downloadButton: {
            x: 240,       // CARD_WIDTH * 2
            y: 880        // height - 200
        }
    };

    // 竖屏布局配置
    private portraitLayout: LayoutConfig = {
        cardColumns: {
            startX: 0,     // 使用0作为基准点
            startY: 164,   // CARD_HEIGHT
            gapX: 130,     // CARD_WIDTH + 10
            gapY: 41       // CARD_HEIGHT / 4
        },
        foundation: {
            startX: -240,  // -2 * CARD_WIDTH
            startY: 164,   // 与cardColumns.startY相同，确保在同一水平线上
            gap: 130       // CARD_WIDTH + 10
        },
        score: {
            x: 40,
            y: 50         // 顶部50单位处
        },
        downloadButton: {
            x: 240,       // CARD_WIDTH * 2
            y: 880        // height - 200
        }
    };

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
    public get MARGIN_TOP() { return this.CARD_HEIGHT * 0.4 - 100; }      // 顶部边距为卡牌高度的0.4倍减去100单位
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

        // 创建引导手势
        this.createHandGuide();

        // 添加全局点击事件监听
        this.input.on('pointerdown', () => {
            this.resetGuideState();
        });

        // 创建分数和移动次数显示
        const textStyle = {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        };

        // 创建移动次数显示
        this.movesText = this.add.text(40, 0, 'Moves: 0', textStyle);
        this.movesText.setScrollFactor(0);
        this.movesText.setDepth(1000);

        // 创建分数显示
        this.scoreText = this.add.text(40, 0, 'Score: 0', textStyle);
        this.scoreText.setScrollFactor(0);
        this.scoreText.setDepth(1000);

        // 设置文本位置
        this.updateScorePosition();

        // 监听窗口大小变化
        const boundOnResize = this.onResize.bind(this);
        window.addEventListener('resize', boundOnResize);

        // 通知场景准备完成
        EventBus.emit('current-scene-ready', this);

        console.log('=== Scene Create Start ===');
        console.log('Initial Screen:', {
            width: window.innerWidth,
            height: window.innerHeight,
            aspectRatio: window.innerWidth / window.innerHeight
        });

        // 记录初始组件状态
        this.logComponentsState('Initial State');

        // 设置初始游戏尺寸
        this.updateGameSize();

        // 记录初始化完成后的状态
        this.logComponentsState('After Initialization');
        console.log('=== Scene Create Complete ===');

        // 添加场景销毁时的清理
        this.events.on('destroy', () => {
            window.removeEventListener('resize', boundOnResize);
        });
    }

    private calculateOffsets(isLandscape: boolean): { offsetX: number; offsetY: number } {
        const layout = this.getCurrentLayout();
        if (isLandscape) {
            return {
                offsetX: layout.cardColumns.startX + this.LANDSCAPE_WIDTH - (this.CARD_WIDTH * 5),
                offsetY: layout.cardColumns.startY
            };
        } else {
            // 计算计分板的高度和位置
            const scoreboardTop = 50; // 计分板顶部位置
            const scoreboardHeight = 64; // 文本高度（根据fontSize: '64px'）
            const scoreboardGap = 50; // 计分板与牌组之间的间距
            const startY = scoreboardTop + scoreboardHeight + scoreboardGap;

            console.log('Portrait offsets calculation:', {
                scoreboardTop,
                scoreboardHeight,
                scoreboardGap,
                startY,
                scale: this.scale.height
            });

            return {
                offsetX: layout.cardColumns.startX + this.PORTRAIT_WIDTH / 2,
                offsetY: startY
            };
        }
    }

    private updateGameSize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspectRatio = width / height;
        const isLandscape = aspectRatio > 1;
        const layout = this.getCurrentLayout();

        console.log('=== updateGameSize ===');
        console.log('Screen:', { width, height, aspectRatio });
        console.log('Current Layout:', layout);
        console.log('Current Offsets:', {
            x: this.currentOffsetX,
            y: this.currentOffsetY
        });

        // 设置游戏尺寸
        if (isLandscape) {
            this.scale.setGameSize(this.LANDSCAPE_WIDTH, this.LANDSCAPE_HEIGHT);
            console.log('Switching to Landscape:', {
                width: this.LANDSCAPE_WIDTH,
                height: this.LANDSCAPE_HEIGHT
            });
        } else {
            this.scale.setGameSize(this.PORTRAIT_WIDTH, this.PORTRAIT_HEIGHT);
            console.log('Switching to Portrait:', {
                width: this.PORTRAIT_WIDTH,
                height: this.PORTRAIT_HEIGHT
            });
        }

        // 计算新的偏移量
        const offsets = this.calculateOffsets(isLandscape);
        this.currentOffsetX = offsets.offsetX;
        this.currentOffsetY = offsets.offsetY;

        console.log('New Offsets:', {
            x: this.currentOffsetX,
            y: this.currentOffsetY
        });

        // 记录组件位置更新前的状态
        this.logComponentsState('Before Update');

        // 更新组件位置
        this.updateComponents();

        // 记录组件位置更新后的状态
        this.logComponentsState('After Update');
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

    // 更新分数
    private updateScore(points: number) {
        this.score += points;
        this.scoreText.setText(`Score: ${this.score}`);
    }

    // 增加移动次数
    private incrementMoves() {
        this.moves++;
        this.movesText.setText(`Moves: ${this.moves}`);
        console.log('=== Increment Moves ===');
        console.log('Current moves:', this.moves);
        console.trace(); // 打印调用栈
        console.log('=====================');
    }

    private updatePlayNowButtonPosition(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspectRatio = width / height;

        if (aspectRatio > 1) {
            // 横屏模式
            this.playNowButton.setPosition(
                this.CARD_WIDTH * 2,
                this.scale.height - 200
            );
        } else {
            // 竖屏模式
            this.playNowButton.setPosition(
                this.CARD_WIDTH,
                this.scale.height - 200
            );
        }
    }

    private getCurrentLayout(): LayoutConfig {
        const aspectRatio = window.innerWidth / window.innerHeight;
        return aspectRatio > 1 ? this.landscapeLayout : this.portraitLayout;
    }

    private updateCardPositions(): void {
        const layout = this.getCurrentLayout();
        const middleStartX = -this.CARD_GAP_X;
        const sideStartY = this.MARGIN_TOP + 5 * this.CARD_GAP_Y;

        console.log('=== updateCardPositions ===');
        console.log('Layout:', layout);
        console.log('Base positions:', {
            middleStartX,
            sideStartY,
            currentOffsetX: this.currentOffsetX,
            currentOffsetY: this.currentOffsetY
        });

        // 更新每列中卡牌的位置
        this.columns.forEach((column, columnIndex) => {
            let baseX;
            if (columnIndex < 2) {
                // 左侧两列
                baseX = middleStartX - (2 * (this.CARD_WIDTH + this.ColumGap)) + (columnIndex * (this.CARD_WIDTH + this.ColumGap));
            } else if (columnIndex < 5) {
                // 中间三列
                baseX = middleStartX + ((columnIndex - 2) * this.CARD_GAP_X);
            } else {
                // 右侧两列
                baseX = middleStartX + (3 * this.CARD_GAP_X) + ((columnIndex - 5) * this.CARD_GAP_X);
            }

            column.cards.forEach((card, cardIndex) => {
                const x = baseX + this.currentOffsetX;
                const y = (columnIndex < 2 || columnIndex > 4)
                    ? sideStartY + cardIndex * this.CARD_GAP_Y + this.currentOffsetY
                    : this.MARGIN_TOP + cardIndex * this.CARD_GAP_Y + this.currentOffsetY;

                console.log('Setting card position:', {
                    card: card.suit + card.value,
                    column: columnIndex,
                    index: cardIndex,
                    baseX,
                    x,
                    y
                });

                card.setPosition(x, y);
                card.setDepth(y);
            });
        });
    }

    private updateFoundationPositions(): void {
        const layout = this.getCurrentLayout();
        const middleStartX = -this.CARD_GAP_X;
        const leftmostPileX = middleStartX - (2 * (this.CARD_WIDTH + this.ColumGap));
        const rightSecondLastX = middleStartX + (3 * this.CARD_GAP_X);
        const rightLastX = middleStartX + (4 * this.CARD_GAP_X);

        console.log('=== updateFoundationPositions ===');
        console.log('Base positions:', {
            middleStartX,
            leftmostPileX,
            rightSecondLastX,
            rightLastX,
            currentOffsetX: this.currentOffsetX,
            currentOffsetY: this.currentOffsetY
        });

        // 更新左侧两个收牌区
        for (let i = 0; i < 2; i++) {
            const x = leftmostPileX + (i * (this.CARD_WIDTH + this.ColumGap)) + this.currentOffsetX;
            const y = this.MARGIN_TOP + this.currentOffsetY;
            const zone = this.foundationZones[i];
            const foundation = this.foundations[i];

            console.log('Setting left foundation position:', {
                index: i,
                x,
                y
            });

            zone.setPosition(x, y);
            zone.setDepth(0);

            // 更新收牌区中的卡牌位置
            foundation.cards.forEach((card, cardIndex) => {
                card.setPosition(x, y);
                card.setDepth(10 + cardIndex);
            });
        }

        // 更新右侧两个收牌区
        const rightPositions = [rightLastX, rightSecondLastX];
        for (let i = 0; i < 2; i++) {
            const x = rightPositions[i] + this.currentOffsetX;
            const y = this.MARGIN_TOP + this.currentOffsetY;
            const zone = this.foundationZones[i + 2];
            const foundation = this.foundations[i + 2];

            console.log('Setting right foundation position:', {
                index: i + 2,
                x,
                y
            });

            zone.setPosition(x, y);
            zone.setDepth(0);

            // 更新收牌区中的卡牌位置
            foundation.cards.forEach((card, cardIndex) => {
                card.setPosition(x, y);
                card.setDepth(10 + cardIndex);
            });
        }
    }

    private updateScorePosition(): void {
        const layout = this.getCurrentLayout();
        const aspectRatio = window.innerWidth / window.innerHeight;
        const isLandscape = aspectRatio > 1;

        console.log('=== updateScorePosition ===');
        console.log('Mode:', isLandscape ? 'Landscape' : 'Portrait');

        if (isLandscape) {
            // 横屏模式：使用原有布局
            this.movesText.setPosition(layout.score.x, layout.score.y - 50);
            this.scoreText.setPosition(layout.score.x, layout.score.y + 50);
        } else {
            // 竖屏模式：横向平铺
            const screenWidth = this.scale.width;
            const scoreboardWidth = screenWidth * 0.8; // 计分板宽度为屏幕宽度的80%
            const margin = (screenWidth - scoreboardWidth) / 2; // 两侧边距

            // 设置移动次数文本位置（左端）
            this.movesText.setPosition(margin, layout.score.y);

            // 设置分数文本位置（右端）
            const scoreTextWidth = this.scoreText.width;
            this.scoreText.setPosition(screenWidth - margin - scoreTextWidth, layout.score.y);
        }

        console.log('Score positions:', {
            moves: { x: this.movesText.x, y: this.movesText.y },
            score: { x: this.scoreText.x, y: this.scoreText.y }
        });
    }

    private updateButtonPosition(): void {
        const layout = this.getCurrentLayout();
        this.playNowButton.setPosition(layout.downloadButton.x, layout.downloadButton.y);
    }

    private updateComponents(): void {
        // 更新所有组件位置
        this.updateCardPositions();
        this.updateFoundationPositions();
        this.updateScorePosition();
        this.updateButtonPosition();
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

    update(time: number, delta: number): void {
        super.update(time, delta);
        this.updateHandGuide();
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

    // 卡牌翻转成功时调用
    public onCardFlipped() {
        this.updateScore(5); // 翻开新卡牌得5分
    }

    // 移动卡牌到新列
    public moveCardToColumn(card: CardComponent, columnIndex: number, countMove: boolean = false) {
        console.log('=== moveCardToColumn ===');
        console.log('Card:', card.suit + card.value);
        console.log('Column:', columnIndex);
        console.log('Count Move:', countMove);
        
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

        // 只有在指定时才增加移动次数
        if (countMove) {
            console.log('Incrementing moves from moveCardToColumn');
            this.incrementMoves();
        }

        // 检查所有列是否有可以翻转的卡牌
        this.columns.forEach((column, index) => {
            if (column.cards.length > 0) {
                const topCard = column.cards[column.cards.length - 1];
                if (!topCard.faceUp) {
                    console.log('Found face down card to flip:', {
                        column: index,
                        card: topCard.suit + topCard.value
                    });
                    topCard.flip().catch(error => {
                        console.warn('Failed to flip card:', error);
                    });
                }
            }
        });

        console.log('=====================');
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
    public addToFoundation(card: CardComponent, foundationIndex: number, countMove: boolean = true) {
        console.log('=== addToFoundation ===');
        console.log('Card:', card.suit + card.value);
        console.log('Foundation:', foundationIndex);
        console.log('Count Move:', countMove);
        
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
        
        // 增加分数和移动次数
        this.updateScore(10); // 移动到收牌区得10分
        if (countMove) {
            console.log('Incrementing moves from addToFoundation');
            this.incrementMoves(); // 增加移动次数
        }
        
        // 检查是否胜利
        this.checkWinCondition();
        console.log('=====================');
    }

    // 检查胜利条件
    private createHandGuide(): void {
        // 创建手势图片
        this.handGuide = this.add.image(0, 0, 'hand');
        this.handGuide.setOrigin(0, 0); // 设置origin为左上角
        this.handGuide.setScale(0.5);
        this.handGuide.setDepth(2000);
        this.handGuide.setVisible(false);

        // 添加缩放动画
        this.tweens.add({
            targets: this.handGuide,
            scale: 0.4,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // 查找可点击的卡牌
    private findClickableCard(): CardComponent | null {
        // 获取所有可见且不在收牌区的卡牌
        const visibleCards = this.cards.filter(card => {
            if (!card.faceUp) return false;
            
            // 检查卡牌是否在任何收牌区中
            for (const foundation of this.foundations) {
                if (foundation.cards.includes(card)) {
                    return false;
                }
            }
            return true;
        });
        
        // 检查每张卡是否可以移动到收牌区
        for (let i = 0; i < this.foundationZones.length; i++) {
            for (const card of visibleCards) {
                if (this.canAddToFoundation(card, i)) {
                    return card;
                }
            }
        }

        // 如果没有可以移动到收牌区的卡牌,查找可以移动到其他列的卡牌
        const bottomCards = this.getColumnBottomCards();
        for (const card of visibleCards) {
            for (const target of bottomCards) {
                if (target !== card &&
                    target.isRed !== card.isRed &&
                    target.numericValue === card.numericValue + 1) {
                    return card;
                }
            }
        }

        return null;
    }

    // 显示引导手势
    private showGuideHand(card: CardComponent): void {
        if (!this.handGuide) return;

        this.handGuide.setPosition(card.x, card.y);
        this.handGuide.setVisible(true);
    }

    // 隐藏引导手势
    private hideGuideHand(): void {
        if (!this.handGuide) return;
        this.handGuide.setVisible(false);
    }

    // 重置引导状态
    private resetGuideState(): void {
        this.guideTimer = 0;
        this.hideGuideHand();
    }

    // 更新手势状态
    private updateHandGuide(): void {
        // 检查移动次数是否变化
        if (this.moves !== this.lastMoves) {
            this.lastMoves = this.moves;
            this.resetGuideState();
            return;
        }

        // 更新计时器
        this.guideTimer += this.game.loop.delta;
        
        // 2秒无操作显示引导
        if (this.guideTimer >= 2000) {
            const targetCard = this.findClickableCard();
            if (targetCard) {
                this.showGuideHand(targetCard);
            } else {
                this.hideGuideHand();
            }
        }
    }

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

    private logComponentsState(phase: string) {
        console.log(`=== Components State (${phase}) ===`);
        
        // 记录卡牌位置
        console.log('Cards Sample:', this.cards.slice(0, 3).map(card => ({
            card: card.suit + card.value,
            position: { x: card.x, y: card.y }
        })));

        // 记录收牌区位置
        console.log('Foundation Zones:', this.foundationZones.map((zone, index) => ({
            index,
            position: { x: zone.x, y: zone.y }
        })));

        // 记录分数和移动次数文本位置
        console.log('UI Elements:', {
            movesText: { x: this.movesText.x, y: this.movesText.y },
            scoreText: { x: this.scoreText.x, y: this.scoreText.y },
            playNowButton: { x: this.playNowButton.x, y: this.playNowButton.y }
        });

        // 记录当前布局信息
        console.log('Layout Info:', {
            currentOffsetX: this.currentOffsetX,
            currentOffsetY: this.currentOffsetY,
            scaleWidth: this.scale.width,
            scaleHeight: this.scale.height
        });

        console.log('=====================');
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
