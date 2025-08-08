import { EventBus } from '../EventBus';
import { GameObjects, Scene } from 'phaser';
import { Card as CardComponent } from '../components/Card';
import {
    generateKlondikeLayout,
    KlondikeLayout,
    LayoutPositions,
    portraitLayout,
    landscapeLayout,
    CardSuit,
    CardValue,
    DEBUG_SPACING
} from '../../config/klondike-layout';
import { generateTutorialLayout } from '../../config/tutorial-deck';
import { TutorialManager } from '../tutorial/TutorialManager';
import { TutorialTest } from '../tutorial/TutorialTest';
import download from './constants/download';
import { getTranslation } from '../i18n';
import { AssetKeys } from '../../assets';

// 游戏区域类型
interface TableauColumn {
    cards: CardComponent[];
}

interface FoundationPile {
    cards: CardComponent[];
    suit?: CardSuit;  // 一旦放入第一张牌(A)就确定花色
}

interface StockPile {
    cards: CardComponent[];
}

interface WastePile {
    cards: CardComponent[];
}

export class Game extends Scene {
    // 游戏状态
    private gameLayout: KlondikeLayout;
    public currentLayout: LayoutPositions;
    
    // 游戏区域
    public tableau: TableauColumn[] = []; // 7列游戏区域 - 改为public以供教学系统访问
    public foundation: FoundationPile[] = []; // 4个基础牌堆 - 改为public
    public stock: StockPile = { cards: [] }; // 库存牌堆 - 改为public
    public waste: WastePile = { cards: [] }; // 翻牌区域 - 改为public
    
    // UI元素
    private stockZone: Phaser.GameObjects.Sprite; // 库存牌堆区域
    // 移除wasteZone - 翻牌区域不需要背景卡槽，翻出的牌直接显示
    public foundationZones: Phaser.GameObjects.Sprite[] = []; // 基础牌堆区域
    private playNowButton: Phaser.GameObjects.Image;
    private playNowText: Phaser.GameObjects.Text;
    
    // 游戏统计
    private score: number = 0;
    private moves: number = 0;
    private startTime: number = 0;
    
    // 计分板UI元素
    private scoreboardBackground: Phaser.GameObjects.Image;
    private timeTitle: Phaser.GameObjects.Text;
    private timeValue: Phaser.GameObjects.Text;
    private scoreTitle: Phaser.GameObjects.Text;
    private scoreValue: Phaser.GameObjects.Text;
    private movesTitle: Phaser.GameObjects.Text;
    private movesValue: Phaser.GameObjects.Text;
    
    // 保留旧的文本元素用于兼容性
    private scoreText: Phaser.GameObjects.Text;
    private movesText: Phaser.GameObjects.Text;
    
    // 教学系统
    private tutorialManager: TutorialManager | null = null;
    private isTutorialMode: boolean = false;
    
    // 调试模式
    private debugMode: boolean = false;
    
    // 引导系统
    private handGuide: Phaser.GameObjects.Image;
    private guideTimer: number = 0;
    private lastMoves: number = 0;
    
    // 游戏尺寸常量
    public readonly LANDSCAPE_WIDTH = 1920;
    public readonly LANDSCAPE_HEIGHT = 1080;
    public readonly PORTRAIT_WIDTH = 1080;
    public readonly PORTRAIT_HEIGHT = 1920;
    
    constructor() {
        super('Game');
    }

    create() {
        // 播放背景音乐
        EventBus.emit('play-bgm');

        // 记录游戏开始时间
        this.startTime = Date.now();

        // 检查URL参数
        const urlParams = new URLSearchParams(window.location.search);
        this.debugMode = urlParams.get('debug') === 'true';
        const randomMode = urlParams.get('random') === 'true';
        
        // 调试模式下强制使用随机牌局并禁用教学
        const tutorialMode = this.debugMode ? false : !randomMode;
        
        // 调试日志
        if (this.debugMode) {
            console.log('🐛 [DEBUG MODE] 调试模式已启用 - 教学系统已禁用，使用随机牌局');
        }

        // 初始化游戏布局
        this.initializeGame(tutorialMode);
        
        // 创建UI元素
        this.createUI();
        
        // 创建引导手势
        this.createHandGuide();
        
        // 添加全局点击事件监听
        this.input.on('pointerdown', () => {
            this.resetGuideState();
            // 触发用户操作事件
            EventBus.emit('user-action');
        });
        
        // 监听窗口大小变化
        const boundOnResize = this.onResize.bind(this);
        window.addEventListener('resize', boundOnResize);
        
        // 通知场景准备完成
        EventBus.emit('current-scene-ready', this);
        
        // 设置初始游戏尺寸
        this.updateGameSize();
        
        // 添加场景销毁时的清理
        this.events.on('destroy', () => {
            window.removeEventListener('resize', boundOnResize);
            if (this.tutorialManager) {
                this.tutorialManager.destroy();
            }
        });
    }

    private initializeGame(tutorialMode: boolean = true): void {
        // 默认使用教学牌局，除非明确指定使用随机牌局
        if (tutorialMode) {
            this.gameLayout = generateTutorialLayout();
            this.isTutorialMode = true;
        } else {
            this.gameLayout = generateKlondikeLayout();
            this.isTutorialMode = false;
        }
        
        // 初始化游戏区域
        this.initializeTableau();
        this.initializeFoundation();
        this.initializeStock();
        this.initializeWaste();
        
        // 创建卡牌
        this.createCards();
        
        // 初始化教学系统
        if (this.isTutorialMode) {
            this.initializeTutorial();
            
            // 在开发环境下运行教学牌局测试
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                this.time.delayedCall(500, () => {
                    console.log('🎮 运行教学牌局测试...');
                    TutorialTest.runAllTests();
                });
            }
        }
        
        // 确保在下一帧更新Stock Zone显示状态
        this.time.delayedCall(1, () => {
            if (this.stockZone) {
                this.updateStockWastePositions();
            }
        });
    }

    private initializeTutorial(): void {
        this.tutorialManager = new TutorialManager(this);
        
        // 延迟启动教学，确保所有组件都已初始化
        this.time.delayedCall(1000, () => {
            if (this.tutorialManager) {
                this.tutorialManager.startTutorial();
            }
        });
    }

    private initializeTableau(): void {
        // 初始化7列游戏区域
        this.tableau = [];
        for (let i = 0; i < 7; i++) {
            this.tableau.push({ cards: [] });
        }
    }

    private initializeFoundation(): void {
        // 初始化4个基础牌堆
        this.foundation = [];
        for (let i = 0; i < 4; i++) {
            this.foundation.push({ cards: [] });
        }
    }

    private initializeStock(): void {
        this.stock = { cards: [] };
    }

    private initializeWaste(): void {
        this.waste = { cards: [] };
    }

    private createCards(): void {
        console.log('🔍 [DEBUG] createCards - 开始创建卡牌:', {
            gameLayoutExists: !!this.gameLayout,
            stockDataLength: this.gameLayout?.stock?.length || 0,
            tableauDataLength: this.gameLayout?.tableau?.length || 0,
            debugMode: this.debugMode,
            isTutorialMode: this.isTutorialMode
        });

        // 创建Tableau区域的卡牌
        this.gameLayout.tableau.forEach((column, columnIndex) => {
            column.forEach((cardData, cardIndex) => {
                const card = new CardComponent(
                    this,
                    0, 0, // 位置稍后设置
                    cardData.suit,
                    cardData.value,
                    cardData.faceUp
                );
                
                this.add.existing(card);
                this.tableau[columnIndex].cards.push(card);
            });
        });

        // 创建Stock区域的卡牌
        console.log('🔍 [DEBUG] createCards - 创建Stock卡牌:', {
            stockDataCount: this.gameLayout.stock.length,
            stockData: this.gameLayout.stock.map(card => `${card.suit}-${card.value}`)
        });
        
        this.gameLayout.stock.forEach((cardData, index) => {
            const card = new CardComponent(
                this,
                0, 0, // 位置稍后设置
                cardData.suit,
                cardData.value,
                cardData.faceUp
            );
            
            this.add.existing(card);
            this.stock.cards.push(card);
            
            console.log(`🔍 [DEBUG] createCards - Stock卡牌${index + 1}创建:`, {
                suit: cardData.suit,
                value: cardData.value,
                faceUp: cardData.faceUp,
                cardCreated: !!card
            });
        });
        
        console.log('🔍 [DEBUG] createCards - Stock卡牌创建完成:', {
            finalStockCount: this.stock.cards.length,
            expectedCount: this.gameLayout.stock.length
        });
    }

    private createUI(): void {
        this.createZones();
        this.createScoreboard();
        this.createPlayNowButton();
    }

    private createZones(): void {
        // 创建库存牌堆区域 - 初始显示牌背，无牌时显示重置图片
        this.stockZone = this.add.sprite(0, 0, AssetKeys.CARD_BACK);
        // 库存牌堆使用与卡牌相同的尺寸
        const layout = this.currentLayout || portraitLayout;
        this.stockZone.setDisplaySize(layout.cardWidth, layout.cardHeight);
        // 修复：将stockZone的深度设置为较高值，确保不被遮挡
        this.stockZone.setDepth(100);
        this.stockZone.setInteractive();
        
        // 添加详细的stockZone创建日志
        console.log('🔍 [DEBUG] createZones - stockZone创建完成:', {
            position: { x: this.stockZone.x, y: this.stockZone.y },
            size: { width: this.stockZone.displayWidth, height: this.stockZone.displayHeight },
            interactive: this.stockZone.input?.enabled,
            depth: this.stockZone.depth,
            visible: this.stockZone.visible,
            alpha: this.stockZone.alpha,
            debugMode: this.debugMode,
            stockCardsLength: this.stock?.cards?.length || 0,
            inputEnabled: this.stockZone.input?.enabled,
            inputHitArea: this.stockZone.input?.hitArea
        });
        
        // 添加多种事件监听来诊断交互问题
        this.stockZone.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
            console.log('🔍 [DEBUG] stockZone pointerdown - 事件触发:', {
                localX, localY,
                stockZonePosition: { x: this.stockZone.x, y: this.stockZone.y },
                stockZoneSize: { width: this.stockZone.displayWidth, height: this.stockZone.displayHeight },
                debugMode: this.debugMode,
                stockCardsCount: this.stock?.cards?.length || 0,
                pointerWorldX: pointer.worldX,
                pointerWorldY: pointer.worldY
            });
            this.onStockClick();
        });
        
        // 添加hover事件来测试交互区域
        this.stockZone.on('pointerover', () => {
            console.log('🔍 [DEBUG] stockZone pointerover - 鼠标悬停');
        });
        
        this.stockZone.on('pointerout', () => {
            console.log('🔍 [DEBUG] stockZone pointerout - 鼠标离开');
        });

        // 不创建翻牌区域的卡槽背景 - 翻出的牌会直接显示，不需要背景卡槽

        // 创建4个基础牌堆区域，使用对应花色的卡槽
        const slotKeys = [
            AssetKeys.SLOT_HEART,    // 索引0: 红桃
            AssetKeys.SLOT_DIAMOND,  // 索引1: 方块
            AssetKeys.SLOT_CLUB,     // 索引2: 梅花
            AssetKeys.SLOT_SPADE     // 索引3: 黑桃
        ];
        
        for (let i = 0; i < 4; i++) {
            const zone = this.add.sprite(0, 0, slotKeys[i]);
            // 基础牌堆使用缩放后的尺寸
            const layout = this.currentLayout || portraitLayout;
            zone.setDisplaySize(
                layout.cardWidth * DEBUG_SPACING.SLOT_SCALE,
                layout.cardHeight * DEBUG_SPACING.SLOT_SCALE
            );
            zone.setDepth(0);
            this.foundationZones.push(zone);
        }
    }

    private createScoreboard(): void {
        const isLandscape = window.innerWidth / window.innerHeight > 1;
        const scoreboardKey = isLandscape ? AssetKeys.SCOREBOARD_LANDSCAPE : AssetKeys.SCOREBOARD_PORTRAIT;
        
        // 创建计分板背景
        this.scoreboardBackground = this.add.image(0, 0, scoreboardKey);
        this.scoreboardBackground.setDepth(100);
        
        // 标题样式
        const titleStyle = {
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        };
        
        // 数值样式 - 金黄色
        const valueStyle = {
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#FFD700', // 金黄色
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        };

        // 创建时间显示
        this.timeTitle = this.add.text(0, 0, 'TIME', titleStyle);
        this.timeTitle.setOrigin(0.5);
        this.timeTitle.setDepth(101);
        
        this.timeValue = this.add.text(0, 0, '00:00', valueStyle);
        this.timeValue.setOrigin(0.5);
        this.timeValue.setDepth(101);

        // 创建分数显示
        this.scoreTitle = this.add.text(0, 0, 'SCORE', titleStyle);
        this.scoreTitle.setOrigin(0.5);
        this.scoreTitle.setDepth(101);
        
        this.scoreValue = this.add.text(0, 0, '0', valueStyle);
        this.scoreValue.setOrigin(0.5);
        this.scoreValue.setDepth(101);

        // 创建步数显示
        this.movesTitle = this.add.text(0, 0, 'MOVES', titleStyle);
        this.movesTitle.setOrigin(0.5);
        this.movesTitle.setDepth(101);
        
        this.movesValue = this.add.text(0, 0, '0', valueStyle);
        this.movesValue.setOrigin(0.5);
        this.movesValue.setDepth(101);

        // 保留旧的文本元素用于兼容性（隐藏）
        const hiddenStyle = { fontSize: '1px', color: '#000000' };
        this.movesText = this.add.text(0, 0, '0', hiddenStyle);
        this.movesText.setVisible(false);
        this.scoreText = this.add.text(0, 0, '0', hiddenStyle);
        this.scoreText.setVisible(false);
    }

    private createPlayNowButton(): void {
        // 创建按钮背景（图片本身带文案，不需要额外文本）
        this.playNowButton = this.add.image(0, 0, 'download');
        this.playNowButton.setScale(0.8);
        this.playNowButton.setInteractive();
        this.playNowButton.on('pointerdown', () => {
            EventBus.emit('play-card-place');
            download();
        });

        // 移除文本创建和文本动画，因为图片本身带文案
        // 只保留按钮缩放动画
        this.tweens.add({
            targets: this.playNowButton,
            scale: 0.8 * 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private createHandGuide(): void {
        // 创建引导手势图片
        this.handGuide = this.add.image(0, 0, 'hand');
        this.handGuide.setVisible(false);
        this.handGuide.setDepth(10000);
        this.handGuide.setScale(0.8);
    }

    private updateGameSize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspectRatio = width / height;
        const isLandscape = aspectRatio > 1;

        // 设置游戏尺寸
        if (isLandscape) {
            this.scale.setGameSize(this.LANDSCAPE_WIDTH, this.LANDSCAPE_HEIGHT);
            this.currentLayout = landscapeLayout;
        } else {
            this.scale.setGameSize(this.PORTRAIT_WIDTH, this.PORTRAIT_HEIGHT);
            this.currentLayout = portraitLayout;
        }

        // 更新所有组件位置
        this.updateAllPositions();
    }

    private updateAllPositions(): void {
        this.updateTableauPositions();
        this.updateFoundationPositions();
        this.updateStockWastePositions();
        this.updateScoreboardPosition();
        this.updatePlayNowButtonPosition();
    }

    private updateTableauPositions(): void {
        // 更新7列游戏区域的卡牌位置
        this.tableau.forEach((column, columnIndex) => {
            const x = this.currentLayout.tableau.startX + columnIndex * this.currentLayout.tableau.columnGap;
            
            column.cards.forEach((card, cardIndex) => {
                const y = this.currentLayout.tableau.startY + cardIndex * this.currentLayout.tableau.cardGap;
                card.setPosition(x, y);
                card.setDepth(y);
            });
        });
    }

    private updateFoundationPositions(): void {
        // 更新4个基础牌堆的位置 - 水平排布
        this.foundationZones.forEach((zone, index) => {
            const x = this.currentLayout.foundation.startX + index * this.currentLayout.foundation.gap;
            const y = this.currentLayout.foundation.startY;
            zone.setPosition(x, y);
            
            // 更新基础牌堆中的卡牌位置
            this.foundation[index].cards.forEach((card) => {
                card.setPosition(x, y);
                card.setDepth(10 + this.foundation[index].cards.length);
            });
        });
    }

    private updateStockWastePositions(): void {
        // 更新库存牌堆位置和显示状态
        this.stockZone.setPosition(this.currentLayout.stock.x, this.currentLayout.stock.y);
        
        console.log('🔍 [DEBUG] updateStockWastePositions - stock区域更新:', {
            position: { x: this.currentLayout.stock.x, y: this.currentLayout.stock.y },
            size: { width: this.stockZone.displayWidth, height: this.stockZone.displayHeight },
            interactive: this.stockZone.input?.enabled,
            depth: this.stockZone.depth,
            visible: this.stockZone.visible,
            alpha: this.stockZone.alpha,
            stockCardsCount: this.stock.cards.length,
            wasteCardsCount: this.waste.cards.length,
            debugMode: this.debugMode,
            stockZoneExists: !!this.stockZone,
            currentLayoutExists: !!this.currentLayout
        });
        
        // 根据库存牌堆是否有牌来决定显示内容
        if (this.stock.cards.length > 0) {
            // 有牌时显示牌背
            this.stockZone.setTexture(AssetKeys.CARD_BACK);
        } else {
            // 无牌时显示重置图片
            this.stockZone.setTexture(AssetKeys.RESET);
        }
        
        this.stock.cards.forEach((card, index) => {
            card.setPosition(this.currentLayout.stock.x, this.currentLayout.stock.y);
            card.setDepth(5 + index);
        });

        // 更新翻牌区域的卡牌位置（不需要背景卡槽）
        this.waste.cards.forEach((card, index) => {
            card.setPosition(this.currentLayout.waste.x, this.currentLayout.waste.y);
            card.setDepth(5 + index);
        });
    }

    private updateScoreboardPosition(): void {
        const layout = this.currentLayout.scoreboard;
        const isLandscape = window.innerWidth / window.innerHeight > 1;
        
        // 根据屏幕方向切换计分板背景图片
        const scoreboardKey = isLandscape ? AssetKeys.SCOREBOARD_LANDSCAPE : AssetKeys.SCOREBOARD_PORTRAIT;
        this.scoreboardBackground.setTexture(scoreboardKey);
        
        // 更新计分板背景位置和尺寸
        this.scoreboardBackground.setPosition(layout.background.x, layout.background.y);
        this.scoreboardBackground.setDisplaySize(layout.background.width, layout.background.height);
        
        // 更新时间显示位置和字体大小
        this.timeTitle.setPosition(layout.time.title.x, layout.time.title.y);
        this.timeTitle.setFontSize(layout.time.title.fontSize);
        this.timeValue.setPosition(layout.time.value.x, layout.time.value.y);
        this.timeValue.setFontSize(layout.time.value.fontSize);
        
        // 更新分数显示位置和字体大小
        this.scoreTitle.setPosition(layout.score.title.x, layout.score.title.y);
        this.scoreTitle.setFontSize(layout.score.title.fontSize);
        this.scoreValue.setPosition(layout.score.value.x, layout.score.value.y);
        this.scoreValue.setFontSize(layout.score.value.fontSize);
        
        // 更新步数显示位置和字体大小
        this.movesTitle.setPosition(layout.moves.title.x, layout.moves.title.y);
        this.movesTitle.setFontSize(layout.moves.title.fontSize);
        this.movesValue.setPosition(layout.moves.value.x, layout.moves.value.y);
        this.movesValue.setFontSize(layout.moves.value.fontSize);
        
        // 隐藏的兼容性元素不需要位置更新
    }

    private updatePlayNowButtonPosition(): void {
        this.playNowButton.setPosition(this.currentLayout.downloadButton.x, this.currentLayout.downloadButton.y);
        // 移除文本位置更新，因为不再显示文本
    }

    private onResize(): void {
        this.updateGameSize();
    }

    // 库存牌堆点击事件
    private onStockClick(): void {
        console.log('🔍 [DEBUG] onStockClick - 库存牌堆被点击');
        
        // 检查基本数据结构
        console.log('🔍 [DEBUG] onStockClick - 数据结构检查:', {
            stockCards: this.stock?.cards?.length || 0,
            wasteCards: this.waste?.cards?.length || 0,
            stockZoneExists: !!this.stockZone,
            currentLayout: !!this.currentLayout,
            debugMode: this.debugMode,
            stockZoneInteractive: this.stockZone?.input?.enabled,
            stockZoneVisible: this.stockZone?.visible,
            stockZoneDepth: this.stockZone?.depth,
            stockZonePosition: this.stockZone ? { x: this.stockZone.x, y: this.stockZone.y } : null,
            isTutorialMode: this.isTutorialMode,
            tutorialManagerExists: !!this.tutorialManager,
            tutorialManagerActive: this.tutorialManager?.isActive()
        });
        
        // 检查教学模式下的交互权限 - 如果不允许则直接返回，不做任何反应
        const canInteract = this.canStockInteractInTutorial();
        console.log('🔍 [DEBUG] onStockClick - 交互权限检查:', {
            isTutorialMode: this.isTutorialMode,
            debugMode: this.debugMode,
            canInteract: canInteract,
            currentState: this.tutorialManager?.getCurrentState()
        });
        
        if (!canInteract) {
            console.log('🔍 [DEBUG] onStockClick - 交互被阻止:', {
                debugMode: this.debugMode,
                canInteract: canInteract,
                isTutorialMode: this.isTutorialMode
            });
            return;
        }
        
        if (this.debugMode) {
            console.log('🐛 [DEBUG MODE] onStockClick - 调试模式下允许交互');
        }
        
        // 触发教学事件
        console.log('🔍 [DEBUG] onStockClick - 触发stock-clicked事件');
        EventBus.emit('stock-clicked');
        
        if (this.stock.cards.length > 0) {
            // 从库存牌堆翻出一张牌到翻牌区域
            const card = this.stock.cards.pop()!;
            console.log('🔍 [DEBUG] onStockClick - 准备翻牌:', {
                cardExists: !!card,
                cardFaceUp: card?.faceUp,
                cardIsFlipping: (card as any)?.isFlipping
            });
            
            card.flip().then(() => {
                console.log('🔍 [DEBUG] onStockClick - 翻牌完成，添加到waste');
                this.waste.cards.push(card);
                this.updateStockWastePositions();
                this.incrementMoves();
                
                // 触发卡牌翻转事件
                EventBus.emit('card-flipped', { card });
                console.log('🔍 [DEBUG] onStockClick - 翻牌流程完成');
            }).catch((error) => {
                console.error('❌ [ERROR] onStockClick - 翻牌失败:', error);
            });
        } else if (this.waste.cards.length > 0) {
            console.log('🔍 [DEBUG] onStockClick - 重置waste到stock');
            // 如果库存牌堆为空，将翻牌区域的牌重新放回库存牌堆
            while (this.waste.cards.length > 0) {
                const card = this.waste.cards.pop()!;
                card.flip().then(() => {
                    this.stock.cards.push(card);
                }).catch((error) => {
                    console.error('❌ [ERROR] onStockClick - 重置翻牌失败:', error);
                });
            }
            this.updateStockWastePositions();
        } else {
            console.log('🔍 [DEBUG] onStockClick - 无牌可翻，stock和waste都为空');
        }
    }

    // 增加移动次数
    private incrementMoves(): void {
        this.moves++;
        
        // 更新新的计分板显示
        this.movesValue.setText(this.moves.toString());
        
        // 保持兼容性，更新隐藏的旧文本
        const t = getTranslation();
        this.movesText.setText(`${t.moves}${this.moves}`);

        // 当移动次数超过10次时自动下载
        if (this.moves > 10) {
            EventBus.emit('play-card-place');
            download();
        }
    }

    // 更新分数
    private updateScore(points: number): void {
        this.score += points;
        
        // 更新新的计分板显示
        this.scoreValue.setText(this.score.toString());
        
        // 保持兼容性，更新隐藏的旧文本
        const t = getTranslation();
        this.scoreText.setText(`${t.score}${this.score}`);
    }

    // 更新时间显示
    private updateTimeDisplay(): void {
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - this.startTime) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.timeValue.setText(timeString);
    }

    // 引导系统相关方法
    private resetGuideState(): void {
        this.guideTimer = 0;
        this.lastMoves = this.moves;
        this.hideGuideHand();
    }

    private hideGuideHand(): void {
        this.handGuide.setVisible(false);
    }

    private showGuideHand(x: number, y: number): void {
        this.handGuide.setPosition(x, y);
        this.handGuide.setVisible(true);
        
        // 添加手指动画
        this.tweens.add({
            targets: this.handGuide,
            y: y + 20,
            duration: 750,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    update(time: number, delta: number): void {
        // 更新时间显示
        this.updateTimeDisplay();
        
        // 更新教学系统
        if (this.tutorialManager && this.isTutorialMode) {
            this.tutorialManager.update(time, delta);
        } else {
            // 只有在非教学模式下才显示普通引导
            this.updateHandGuide();
        }
    }

    private updateHandGuide(): void {
        // 如果5秒内没有移动，显示引导
        this.guideTimer += 16; // 假设60fps
        
        if (this.guideTimer > 5000 && this.lastMoves === this.moves) {
            // 寻找可以移动的卡牌并显示引导
            const clickableCard = this.findClickableCard();
            if (clickableCard) {
                this.showGuideHand(clickableCard.x, clickableCard.y - 50);
            }
        }
    }

    private findClickableCard(): CardComponent | null {
        // 寻找可以点击的卡牌（简化版本）
        // 优先查找Tableau中正面朝上的卡牌
        for (const column of this.tableau) {
            if (column.cards.length > 0) {
                const topCard = column.cards[column.cards.length - 1];
                if (topCard.faceUp) {
                    return topCard;
                }
            }
        }
        
        // 查找翻牌区域的卡牌
        if (this.waste.cards.length > 0) {
            return this.waste.cards[this.waste.cards.length - 1];
        }
        
        return null;
    }

    // 检查胜利条件
    private checkWinCondition(): boolean {
        // 检查所有基础牌堆是否都有13张牌（A到K）
        return this.foundation.every(pile => pile.cards.length === 13);
    }

    // 卡牌翻转回调
    public onCardFlipped(): void {
        // 卡牌翻转后的处理逻辑
        this.resetGuideState();
    }

    // 获取列底部的卡牌（用于拖拽检测）
    public getColumnBottomCards(): CardComponent[] {
        const bottomCards: CardComponent[] = [];
        this.tableau.forEach(column => {
            if (column.cards.length > 0) {
                bottomCards.push(column.cards[column.cards.length - 1]);
            }
        });
        return bottomCards;
    }

    // Klondike游戏逻辑方法

    // 检查是否可以添加到基础牌堆
    public canAddToFoundation(card: CardComponent, foundationIndex: number): boolean {
        const foundation = this.foundation[foundationIndex];
        
        if (foundation.cards.length === 0) {
            // 空的基础牌堆只能放A
            return card.numericValue === 1; // A
        }
        
        const topCard = foundation.cards[foundation.cards.length - 1];
        
        // 必须是相同花色且数值递增
        return topCard.suit === card.suit && topCard.numericValue === card.numericValue - 1;
    }

    // 添加卡牌到基础牌堆
    public addToFoundation(card: CardComponent, foundationIndex: number, countMove: boolean = true): void {
        const foundation = this.foundation[foundationIndex];
        
        // 触发教学事件
        EventBus.emit('card-to-foundation', { card, foundationIndex });
        
        // 从原来的位置移除卡牌
        this.removeCardFromTableau(card);
        this.removeCardFromWaste(card);
        
        // 添加到基础牌堆
        foundation.cards.push(card);
        
        // 设置花色（如果是第一张牌）
        if (foundation.cards.length === 1) {
            foundation.suit = card.suit;
        }
        
        // 更新分数
        this.updateScore(10);
        
        if (countMove) {
            this.incrementMoves();
        }
        
        // 检查胜利条件
        if (this.checkWinCondition()) {
            this.onGameWin();
        }
    }

    // 从Tableau中移除卡牌
    private removeCardFromTableau(card: CardComponent): void {
        for (const column of this.tableau) {
            const index = column.cards.indexOf(card);
            if (index !== -1) {
                column.cards.splice(index);
                break;
            }
        }
    }

    // 从Waste中移除卡牌
    private removeCardFromWaste(card: CardComponent): void {
        const index = this.waste.cards.indexOf(card);
        if (index !== -1) {
            this.waste.cards.splice(index, 1);
        }
    }

    // 获取附带的卡牌（Klondike中，可以移动一串正面朝上的卡牌）
    public getAttachedCards(card: CardComponent): CardComponent[] {
        const attachedCards: CardComponent[] = [];
        
        // 找到卡牌所在的列
        for (const column of this.tableau) {
            const cardIndex = column.cards.indexOf(card);
            if (cardIndex !== -1) {
                // 获取该卡牌之后的所有卡牌
                for (let i = cardIndex + 1; i < column.cards.length; i++) {
                    const nextCard = column.cards[i];
                    if (nextCard.faceUp) {
                        attachedCards.push(nextCard);
                    } else {
                        break; // 遇到背面朝上的卡牌就停止
                    }
                }
                break;
            }
        }
        
        return attachedCards;
    }

    // 获取卡牌的下一张卡牌（用于翻牌）
    public getNextCard(card: CardComponent): CardComponent | null {
        for (const column of this.tableau) {
            const cardIndex = column.cards.indexOf(card);
            if (cardIndex !== -1 && cardIndex > 0) {
                return column.cards[cardIndex - 1];
            }
        }
        return null;
    }

    // 获取卡牌所在的列索引
    public getColumnIndex(card: CardComponent): number {
        for (let i = 0; i < this.tableau.length; i++) {
            if (this.tableau[i].cards.includes(card)) {
                return i;
            }
        }
        return -1;
    }

    // 移动卡牌到指定列
    public moveCardToColumn(card: CardComponent, columnIndex: number, countMove: boolean = false): void {
        // 获取原列索引
        const fromColumnIndex = this.getColumnIndex(card);
        
        // 触发教学事件
        EventBus.emit('card-moved', { card, fromColumn: fromColumnIndex, toColumn: columnIndex });
        
        // 从原来的位置移除卡牌和附带卡牌
        const attachedCards = this.getAttachedCards(card);
        const allCards = [card, ...attachedCards];
        
        // 从所有位置移除这些卡牌
        for (const cardToMove of allCards) {
            this.removeCardFromTableau(cardToMove);
            this.removeCardFromWaste(cardToMove);
        }
        
        // 添加到新列
        this.tableau[columnIndex].cards.push(...allCards);
        
        if (countMove) {
            this.incrementMoves();
        }
        
        // 更新位置
        this.updateTableauPositions();
    }

    // 检查是否可以移动卡牌到指定列
    public canMoveToColumn(card: CardComponent, columnIndex: number): boolean {
        const targetColumn = this.tableau[columnIndex];
        
        if (targetColumn.cards.length === 0) {
            // 空列只能放K
            return card.numericValue === 13;
        }
        
        const topCard = targetColumn.cards[targetColumn.cards.length - 1];
        
        // 必须是不同颜色且数值递减
        return topCard.isRed !== card.isRed && topCard.numericValue === card.numericValue + 1;
    }

    // 游戏胜利处理
    private onGameWin(): void {
        // 播放胜利音效
        EventBus.emit('play-victory');
        
        // 显示胜利界面或执行其他胜利逻辑
        console.log('Game Won!');
        
        // 可以在这里添加胜利动画或切换到胜利场景
    }

    // 重置游戏
    public resetGame(): void {
        // 清除所有卡牌
        this.tableau.forEach(column => {
            column.cards.forEach(card => card.destroy());
            column.cards = [];
        });
        
        this.foundation.forEach(pile => {
            pile.cards.forEach(card => card.destroy());
            pile.cards = [];
            pile.suit = undefined;
        });
        
        this.stock.cards.forEach(card => card.destroy());
        this.stock.cards = [];
        
        this.waste.cards.forEach(card => card.destroy());
        this.waste.cards = [];
        
        // 重置游戏状态
        this.score = 0;
        this.moves = 0;
        
        // 重新初始化游戏
        this.initializeGame();
    }

    // 教学模式相关的公共方法
    public startTutorial(): void {
        if (!this.isTutorialMode) {
            // 重新初始化为教学模式
            this.resetGame();
            this.initializeGame(true);
        } else if (this.tutorialManager) {
            this.tutorialManager.startTutorial();
        }
    }

    public stopTutorial(): void {
        if (this.tutorialManager) {
            this.tutorialManager.stopTutorial();
        }
    }

    public isTutorialActive(): boolean {
        return this.tutorialManager ? this.tutorialManager.isActive() : false;
    }

    public getTutorialState(): string {
        return this.tutorialManager ? this.tutorialManager.getCurrentState() : 'inactive';
    }

    public getTutorialManager(): TutorialManager | null {
        return this.tutorialManager;
    }

    public getIsTutorialMode(): boolean {
        return this.isTutorialMode;
    }
    
    public getDebugMode(): boolean {
        return this.debugMode;
    }

    // 检查库存牌堆在教学模式下是否可以交互
    private canStockInteractInTutorial(): boolean {
        console.log('🔍 [DEBUG] canStockInteractInTutorial - 权限检查:', {
            debugMode: this.debugMode,
            isTutorialMode: this.isTutorialMode,
            tutorialManagerExists: !!this.tutorialManager,
            tutorialManagerActive: this.tutorialManager?.isActive(),
            currentState: this.tutorialManager?.getCurrentState()
        });
        
        // 调试模式下允许所有交互
        if (this.debugMode) {
            console.log('🐛 [DEBUG MODE] canStockInteractInTutorial - 调试模式，允许交互');
            return true;
        }
        
        // 如果不是教学模式，允许所有交互
        if (!this.isTutorialMode) {
            console.log('🔍 [DEBUG] canStockInteractInTutorial - 非教学模式，允许交互');
            return true;
        }
        
        // 获取教学管理器
        if (!this.tutorialManager || !this.tutorialManager.isActive()) {
            console.log('🔍 [DEBUG] canStockInteractInTutorial - 教学管理器未激活，允许交互');
            return true;
        }
        
        // 获取当前教学状态
        const currentState = this.tutorialManager.getCurrentState();
        console.log('🔍 [DEBUG] canStockInteractInTutorial - 当前教学状态:', currentState);
        
        // 根据教学步骤检查交互权限
        switch (currentState) {
            case 'step_intro':
            case 'step_rules':
            case 'step_ace_to_foundation':
            case 'step_card_to_pile':
                // 前几步不允许点击库存牌堆
                console.log('🔍 [DEBUG] canStockInteractInTutorial - 教学前期步骤，禁止交互');
                return false;
                
            case 'step_stock_flip':
                // 第五步：允许点击库存牌堆
                console.log('🔍 [DEBUG] canStockInteractInTutorial - stock翻牌步骤，允许交互');
                return true;
                
            case 'step_pile_to_pile':
                // 第六步：允许点击库存牌堆
                console.log('🔍 [DEBUG] canStockInteractInTutorial - pile间移动步骤，允许交互');
                return true;
                
            case 'step_free_play':
                // 自由游戏模式：允许所有交互
                console.log('🔍 [DEBUG] canStockInteractInTutorial - 自由游戏模式，允许交互');
                return true;
                
            default:
                // 默认不允许交互
                console.log('🔍 [DEBUG] canStockInteractInTutorial - 未知状态，禁止交互');
                return false;
        }
    }

    // 智能提示系统（教学完成后启用）
    public enableSmartHints(): void {
        // 启用智能提示功能
        console.log('Smart hints enabled');
    }

    // 获取所有卡牌（用于教学系统查找特定卡牌）
    public getAllCards(): CardComponent[] {
        const allCards: CardComponent[] = [];
        
        // 添加tableau中的卡牌
        this.tableau.forEach(column => {
            allCards.push(...column.cards);
        });
        
        // 添加foundation中的卡牌
        this.foundation.forEach(pile => {
            allCards.push(...pile.cards);
        });
        
        // 添加stock和waste中的卡牌
        allCards.push(...this.stock.cards);
        allCards.push(...this.waste.cards);
        
        return allCards;
    }

    // 查找特定的卡牌
    public findCard(suit: string, value: string): CardComponent | null {
        const allCards = this.getAllCards();
        return allCards.find(card => card.suit === suit && card.value === value) || null;
    }

    // 检查操作是否被教学系统允许
    public isActionAllowed(actionType: string): boolean {
        // 调试模式下允许所有操作
        if (this.debugMode) {
            return true;
        }
        
        if (!this.isTutorialMode || !this.tutorialManager) {
            return true; // 非教学模式允许所有操作
        }
        
        return this.tutorialManager.isActive() ? false : true; // 简化版本
    }
}
