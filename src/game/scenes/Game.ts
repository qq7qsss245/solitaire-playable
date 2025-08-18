import { EventBus } from '../EventBus';
import { GameObjects, Scene } from 'phaser';
import { Card as CardComponent } from '../components/Card';
import { StockStackManager } from '../managers/StockStackManager';
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
import { getOutputConfigValue, getOutputConfigValueAsync } from '../../utils/outputConfigLoader';
import { DealAnimationManager } from '../animations/DealAnimationManager';
import { DealAnimationTest } from '../animations/DealAnimationTest';
import { SuitExplosionManager } from '../animations/SuitExplosionManager';
import { AutoCompleteManager } from '../components/AutoCompleteManager';
import { TestDeckGenerator } from '../utils/TestDeckGenerator';
import { getTestConfig, isTestModeEnabled } from '../../config/test-config';
import { VictoryAnimationManager } from '../animations/VictoryAnimationManager';

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
    private stockStackManager: StockStackManager; // Stock堆叠管理器
    
    // UI元素
    private stockZone: Phaser.GameObjects.Sprite; // 库存牌堆区域
    // 移除wasteZone - 翻牌区域不需要背景卡槽，翻出的牌直接显示
    public foundationZones: Phaser.GameObjects.Sprite[] = []; // 基础牌堆区域
    private playNowButton: Phaser.GameObjects.Container;
    private playNowText: Phaser.GameObjects.Text;
    private autoCompleteButton: Phaser.GameObjects.Image; // AutoComplete按钮
    private productName: Phaser.GameObjects.Image; // 产品名称图片
    private darkMask: Phaser.GameObjects.Image; // 暗色蒙版（仅横屏模式）
    
    // 游戏统计
    private score: number = 0;
    private moves: number = 0;
    private startTime: number = 0;
    private isTimerStarted: boolean = false;
    private isTimerStopped: boolean = false; // 新增：标记计时器是否已停止
    private stoppedTime: number = 0; // 新增：停止时的时间
    
    // 计分板UI元素 - 横板格式（合并标题和数值）
    private timeText: Phaser.GameObjects.Text;
    private scoreText: Phaser.GameObjects.Text;
    private movesText: Phaser.GameObjects.Text;
    
    // 保留旧的分离元素用于兼容性（隐藏）
    private timeTitle: Phaser.GameObjects.Text;
    private timeValue: Phaser.GameObjects.Text;
    private scoreTitle: Phaser.GameObjects.Text;
    private scoreValue: Phaser.GameObjects.Text;
    private movesTitle: Phaser.GameObjects.Text;
    private movesValue: Phaser.GameObjects.Text;
    
    // 教学系统
    private tutorialManager: TutorialManager | null = null;
    private isTutorialMode: boolean = false;
    
    // 发牌动画系统
    private dealAnimationManager: DealAnimationManager | null = null;
    
    // 花色爆炸动画系统
    private suitExplosionManager: SuitExplosionManager | null = null;
    
    // AutoComplete系统
    private autoCompleteManager: AutoCompleteManager | null = null;
    private testDeckGenerator: TestDeckGenerator | null = null;

    // 胜利动画系统
    private victoryAnimationManager: VictoryAnimationManager | null = null;
    
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
        // BGM现在会自动播放，不需要手动触发

        // 初始化计时器状态（不立即启动）
        this.startTime = 0;
        this.isTimerStarted = false;
        console.log('🔍 [INIT_DEBUG] Timer state initialized - started:', this.isTimerStarted);


        // 检查URL参数
        const urlParams = new URLSearchParams(window.location.search);
        this.debugMode = urlParams.get('debug') === 'true' || urlParams.get('debug') === '1';
        const randomMode = urlParams.get('random') === 'true';
        
        // 检查是否启用AutoComplete测试模式
        const autoCompleteTestMode = urlParams.get('debug') === '1';
        
        // 🚫 教学系统已禁用 - 始终使用固定牌局但不启用教学模式
        // 保留固定牌局以确保游戏的可玩性和关卡设计
        const tutorialMode = false; // 强制禁用教学模式
        
        // 调试日志
        if (this.debugMode) {
            console.log('🐛 [DEBUG MODE] 调试模式已启用 - 教学系统已禁用，使用固定牌局');
        }
        
        if (autoCompleteTestMode) {
            console.log('🧪 [AUTOCOMPLETE TEST] AutoComplete测试模式已启用');
        }
        
        console.log('🚫 [TUTORIAL DISABLED] 教学系统已全局禁用，游戏将直接进入正常模式');

        // 异步初始化游戏布局（包含发牌动画）
        this.initializeGameAsync(tutorialMode, autoCompleteTestMode);
        
        // 创建UI元素
        this.createUI();
        
        // 初始化花色爆炸动画管理器
        this.suitExplosionManager = new SuitExplosionManager(this);
        
        // 初始化AutoComplete管理器
        this.autoCompleteManager = new AutoCompleteManager(this);
        
        // 初始化测试牌局生成器
        this.testDeckGenerator = new TestDeckGenerator(this);
        
        // 初始化胜利动画管理器
        this.victoryAnimationManager = new VictoryAnimationManager(this);
        
        // 创建引导手势
        this.createHandGuide();
        
        // 添加全局点击事件监听
        this.input.on('pointerdown', () => {
            console.log('🔍 [USER_ACTION_DEBUG] Pointer down detected');
            console.log('🔍 [USER_ACTION_DEBUG] Tutorial mode:', this.isTutorialMode);
            console.log('🔍 [USER_ACTION_DEBUG] Timer started:', this.isTimerStarted);
            
            this.resetGuideState();
            
            // 无论是教学模式还是非教学模式，都在用户第一次点击时启动计时器
            if (!this.isTimerStarted) {
                console.log('🔍 [USER_ACTION_DEBUG] Starting timer due to first user action');
                console.log('🔍 [USER_ACTION_DEBUG] Mode:', this.isTutorialMode ? 'Tutorial' : 'Normal');
                this.startTimer();
            } else {
                console.log('🔍 [USER_ACTION_DEBUG] Timer already started');
            }
            
            // 触发用户操作事件
            EventBus.emit('user-action');
            // 每次点击都尝试播放BGM（如果BGM没有播放的话）
            EventBus.emit('play-bgm');
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
            this.cleanupGameResources();
        });
    }
    
    /**
     * 异步初始化游戏（包装方法，处理异步调用）
     */
    private async initializeGameAsync(tutorialMode: boolean, autoCompleteTestMode: boolean = false): Promise<void> {
        try {
            await this.initializeGame(tutorialMode, autoCompleteTestMode);
        } catch (error) {
            console.error('Game initialization failed:', error);
            // 确保游戏仍然可以进行，即使动画失败
            this.fallbackToStaticLayout();
        }
    }
    
    /**
     * 清理游戏资源
     */
    private cleanupGameResources(): void {
        // 清理教学系统
        if (this.tutorialManager) {
            this.tutorialManager.destroy();
            this.tutorialManager = null;
        }
        
        // 清理发牌动画系统
        if (this.dealAnimationManager) {
            this.dealAnimationManager.destroy();
            this.dealAnimationManager = null;
        }
        
        // 清理花色爆炸动画系统
        if (this.suitExplosionManager) {
            this.suitExplosionManager.destroy();
            this.suitExplosionManager = null;
        }
        
        // 清理AutoComplete系统
        if (this.autoCompleteManager) {
            this.autoCompleteManager.destroy();
            this.autoCompleteManager = null;
        }
        
        // 清理胜利动画系统
        if (this.victoryAnimationManager) {
            this.victoryAnimationManager.destroy();
            this.victoryAnimationManager = null;
        }
        
        console.log('🎮 Game: Resources cleaned up');
    }

    private async initializeGame(tutorialMode: boolean = true, autoCompleteTestMode: boolean = false): Promise<void> {
        // 检查是否启用测试模式
        const testConfig = getTestConfig();
        
        if (autoCompleteTestMode) {
            console.log('🧪 [AUTOCOMPLETE TEST] 启用AutoComplete测试模式，生成专门的测试牌局');
            // 使用专门的AutoComplete测试牌局
            this.gameLayout = this.generateAutoCompleteTestLayout();
        } else if (isTestModeEnabled()) {
            console.log('🧪 [TEST MODE] 启用测试模式，使用测试牌局');
            // 在测试模式下，我们仍然使用固定的教学牌局布局作为基础
            // 但会在发牌完成后应用测试配置
            this.gameLayout = generateTutorialLayout();
        } else {
            // 🚫 教学系统已禁用 - 始终使用固定牌局但不启用教学模式
            // 保留generateTutorialLayout()以确保固定牌局和关卡设计正常工作
            this.gameLayout = generateTutorialLayout(); // 使用固定的教学牌局布局
            console.log('🚫 [TUTORIAL DISABLED] 使用固定牌局但禁用教学模式');
        }
        
        this.isTutorialMode = false; // 强制禁用教学模式
        
        // 初始化游戏区域
        this.initializeTableau();
        this.initializeFoundation();
        this.initializeStock();
        this.initializeWaste();
        
        // 创建卡牌（但不立即设置位置，由动画系统控制）
        this.createCards();
        
        // 初始化发牌动画系统
        this.initializeDealAnimation();
        
        // 启动发牌动画
        await this.startDealAnimation();
        
        // 应用测试配置
        if (autoCompleteTestMode) {
            this.time.delayedCall(500, () => {
                this.applyAutoCompleteTestConfiguration();
            });
        } else if (isTestModeEnabled()) {
            this.time.delayedCall(500, () => {
                this.applyTestConfiguration();
            });
        }
        
        // 🚫 教学系统已禁用 - 注释掉教学系统初始化
        // 保留代码结构以备后续可能需要重新启用
        // if (this.isTutorialMode) {
        //     this.initializeTutorial();
        //
        //     // 在开发环境下运行教学牌局测试
        //     if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //         this.time.delayedCall(500, () => {
        //             console.log('🎮 运行教学牌局测试...');
        //             TutorialTest.runAllTests();
        //         });
        //     }
        // }
        console.log('🚫 [TUTORIAL DISABLED] 教学系统初始化已跳过');
        
        // 在开发环境下运行发牌动画测试
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.time.delayedCall(1000, () => {
                console.log('🎮 运行发牌动画测试...');
                DealAnimationTest.runAllTests();
                DealAnimationTest.logSystemInfo();
                
                if (this.dealAnimationManager) {
                    DealAnimationTest.testAnimationManagerInit(this);
                }
            });
            
            // AutoComplete测试功能已禁用 - 只能通过点击按钮手动触发
            // this.time.delayedCall(2000, () => {
            //     console.log('🎮 运行AutoComplete测试...');
            //     this.testAutoComplete();
            // });
        }
        
        // 确保在下一帧更新Stock Zone显示状态
        this.time.delayedCall(1, () => {
            if (this.stockZone) {
                this.updateStockWastePositions();
            }
        });
    }

    // 🚫 教学系统已禁用 - 保留方法定义但不执行任何操作
    private initializeTutorial(): void {
        console.log('🚫 [TUTORIAL DISABLED] initializeTutorial() 被调用但已禁用');
        // this.tutorialManager = new TutorialManager(this);
        // 教学管理器不再创建，保持为null
        this.tutorialManager = null;
    }
    
    /**
     * 初始化发牌动画系统
     */
    private initializeDealAnimation(): void {
        try {
            this.dealAnimationManager = new DealAnimationManager(this);
            console.log('🎮 Game: Deal animation manager initialized');
        } catch (error) {
            console.error('Failed to initialize deal animation manager:', error);
        }
    }
    
    /**
     * 启动发牌动画
     */
    private async startDealAnimation(): Promise<void> {
        if (!this.dealAnimationManager) {
            console.warn('Deal animation manager not initialized');
            return;
        }
        
        try {
            console.log('🔍 Game: Starting deal animation, isTutorialMode =', this.isTutorialMode);
            await this.dealAnimationManager.startDealAnimation();
            console.log('🔍 Game: Deal animation completed, tutorialManager exists =', !!this.tutorialManager);
            if (this.tutorialManager) {
                console.log('🔍 Game: After deal animation, tutorialManager.isActive() =', this.tutorialManager.isActive());
            }
        } catch (error) {
            console.error('Deal animation failed:', error);
            // 如果动画失败，确保卡牌仍然显示在正确位置
            this.fallbackToStaticLayout();
        }
    }
    
    /**
     * 发牌动画失败时的后备方案
     */
    private fallbackToStaticLayout(): void {
        console.log('🎮 Game: Falling back to static layout');
        
        // 立即更新所有位置，确保游戏可以正常进行
        this.time.delayedCall(100, () => {
            this.updateAllPositions();
            
            // 确保所有卡牌可见
            this.tableau.forEach(column => {
                column.cards.forEach(card => {
                    card.setVisible(true);
                });
            });
            
            this.stock.cards.forEach(card => {
                card.setVisible(true);
            });
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
        // 初始化4个基础牌堆，预先绑定花色
        // 索引0=红桃(h)，索引1=方块(d)，索引2=梅花(c)，索引3=黑桃(s)
        this.foundation = [];
        const suitOrder: CardSuit[] = ['h', 'd', 'c', 's'];
        
        for (let i = 0; i < 4; i++) {
            this.foundation.push({
                cards: [],
                suit: suitOrder[i]  // 预先绑定花色
            });
        }
    }

    // 花色到收牌区索引的映射
    private getSuitFoundationIndex(suit: CardSuit): number {
        const suitToIndex: Record<CardSuit, number> = {
            'h': 0,  // 红桃
            'd': 1,  // 方块
            'c': 2,  // 梅花
            's': 3   // 黑桃
        };
        return suitToIndex[suit];
    }

    // 根据花色获取正确的收牌区
    private getCorrectFoundationIndex(suit: CardSuit): number {
        return this.getSuitFoundationIndex(suit);
    }

    private initializeStock(): void {
        this.stock = { cards: [] };
        this.stockStackManager = new StockStackManager(this);
        
        // 设置堆叠卡牌的点击交互回调
        this.stockStackManager.setupCardInteractions((card: CardComponent) => {
            console.log(`🔍 [DEBUG] Stock卡牌被点击: ${card.suit}${card.value}`);
            this.onStockClick();
        });
        
        console.log('🔍 [DEBUG] initializeStock - StockStackManager已创建并设置交互');
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

        // 获取stock位置用于初始化卡牌位置
        const stockPosition = this.currentLayout?.stock || { x: 0, y: 0 };
        // 调整发牌动画起始位置，向左上偏移50像素
        const adjustedStockPosition = {
            x: stockPosition.x - 50,
            y: stockPosition.y - 90
        };

        // 创建Tableau区域的卡牌
        this.gameLayout.tableau.forEach((column, columnIndex) => {
            column.forEach((cardData, cardIndex) => {
                const card = new CardComponent(
                    this,
                    adjustedStockPosition.x, // 初始位置设为调整后的stock位置
                    adjustedStockPosition.y,
                    cardData.suit,
                    cardData.value,
                    cardData.faceUp
                );
                
                // 初始时隐藏所有tableau卡牌，由动画系统控制显示
                card.setVisible(false);
                
                this.add.existing(card);
                this.tableau[columnIndex].cards.push(card);
                
                console.log(`🔍 [DEBUG] createCards - Tableau卡牌[${cardIndex}, ${columnIndex}]创建: ${cardData.suit}${cardData.value}, faceUp: ${cardData.faceUp}`);
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
                adjustedStockPosition.x, // 初始位置设为调整后的stock位置
                adjustedStockPosition.y,
                cardData.suit,
                cardData.value,
                false // 🔧 确保stock卡牌始终是背面朝上
            );
            
            this.add.existing(card);
            this.stock.cards.push(card);
            
            // 使用StockStackManager管理堆叠显示
            this.stockStackManager.addCard(card);
            
            console.log(`🔍 [DEBUG] createCards - Stock卡牌${index + 1}创建并添加到堆叠:`, {
                suit: cardData.suit,
                value: cardData.value,
                faceUp: cardData.faceUp,
                cardCreated: !!card,
                stackCount: this.stockStackManager.getCardCount()
            });
        });
        
        console.log('🔍 [DEBUG] createCards - 卡牌创建完成:', {
            tableauCardCount: this.tableau.reduce((sum, col) => sum + col.cards.length, 0),
            stockCardCount: this.stock.cards.length,
            expectedStockCount: this.gameLayout.stock.length
        });
    }

    private createUI(): void {
        this.createZones();
        this.createScoreboard();
        this.createPlayNowButton();
        this.createAutoCompleteButton();
        this.createProductName();
        this.createDarkMask();
    }

    private createZones(): void {
        // 创建库存牌堆区域 - 初始显示牌背，无牌时显示重置图片
        this.stockZone = this.add.sprite(0, 0, AssetKeys.CARD_BACK);
        // 库存牌堆使用与卡牌相同的尺寸
        const layout = this.currentLayout || portraitLayout;
        this.stockZone.setDisplaySize(layout.cardWidth, layout.cardHeight);
        // 🔧 将stockZone的深度设置为较低值，让卡牌覆盖在重置图片上方
        this.stockZone.setDepth(10);
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
        
        // 🔄 移除stockZone的点击事件 - 现在由堆叠卡牌直接处理交互
        // 保留stockZone作为视觉指示器，但不再处理点击事件
        
        // 🔧 修复：确保stockZone不会拦截点击事件，避免与堆叠卡牌的交互冲突
        this.stockZone.disableInteractive();
        
        console.log('🔍 [DEBUG] createZones - stockZone创建完成，交互将由堆叠卡牌处理');

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
        // 横板格式样式 - 白色文字，黑色描边
        const textStyle = {
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        };

        // 创建横板格式的计分板文本（合并标题和数值）
        // 使用国际化文本初始化
        const t = getTranslation();
        
        this.timeText = this.add.text(0, 0, `${t.time}00:00`, textStyle);
        this.timeText.setOrigin(0.5);
        this.timeText.setDepth(101);

        this.scoreText = this.add.text(0, 0, `${t.score}0`, textStyle);
        this.scoreText.setOrigin(0.5);
        this.scoreText.setDepth(101);

        this.movesText = this.add.text(0, 0, `${t.moves}0`, textStyle);
        this.movesText.setOrigin(0.5);
        this.movesText.setDepth(101);

        // 保留旧的分离元素用于兼容性（隐藏）
        const hiddenStyle = { fontSize: '1px', color: '#000000' };
        
        this.timeTitle = this.add.text(0, 0, 'TIME', hiddenStyle);
        this.timeTitle.setVisible(false);
        this.timeValue = this.add.text(0, 0, '00:00', hiddenStyle);
        this.timeValue.setVisible(false);
        
        this.scoreTitle = this.add.text(0, 0, 'SCORE', hiddenStyle);
        this.scoreTitle.setVisible(false);
        this.scoreValue = this.add.text(0, 0, '0', hiddenStyle);
        this.scoreValue.setVisible(false);
        
        this.movesTitle = this.add.text(0, 0, 'MOVES', hiddenStyle);
        this.movesTitle.setVisible(false);
        this.movesValue = this.add.text(0, 0, '0', hiddenStyle);
        this.movesValue.setVisible(false);
    }

    private createPlayNowButton(): void {
        // 获取国际化文案
        const translation = getTranslation();
        
        // 使用防护机制：如果 currentLayout 未初始化，则根据屏幕方向选择默认布局
        const layout = this.currentLayout || (window.innerWidth / window.innerHeight > 1 ? landscapeLayout : portraitLayout);
        const buttonConfig = layout.downloadButton;
        
        // 创建按钮容器
        const buttonContainer = this.add.container(0, 0);
        
        // 创建按钮背景（使用配置的样式）
        const buttonBackground = this.add.graphics();
        buttonBackground.fillStyle(buttonConfig.backgroundColor || 0xffffff, 1);
        buttonBackground.fillRoundedRect(
            -buttonConfig.width / 2,
            -buttonConfig.height / 2,
            buttonConfig.width,
            buttonConfig.height,
            buttonConfig.borderRadius || 0
        );
        
        // 添加按钮边框（使用配置的样式）
        if (buttonConfig.borderWidth && buttonConfig.borderColor !== undefined) {
            buttonBackground.lineStyle(buttonConfig.borderWidth, buttonConfig.borderColor, 1);
            buttonBackground.strokeRoundedRect(
                -buttonConfig.width / 2,
                -buttonConfig.height / 2,
                buttonConfig.width,
                buttonConfig.height,
                buttonConfig.borderRadius || 0
            );
        }
        
        // 创建文字（使用配置的样式）
        this.playNowText = this.add.text(0, 0, translation.playNow, {
            fontSize: `${buttonConfig.fontSize}px`,
            fontFamily: buttonConfig.fontFamily || 'Arial, sans-serif',
            color: buttonConfig.textColor || '#000000',
            fontStyle: buttonConfig.fontStyle || 'normal'
        });
        this.playNowText.setOrigin(0.5, 0.5); // 居中对齐
        
        // 将背景和文字添加到容器
        buttonContainer.add([buttonBackground, this.playNowText]);
        
        // 设置交互
        buttonContainer.setSize(buttonConfig.width, buttonConfig.height);
        buttonContainer.setInteractive();
        
        // 添加点击事件
        buttonContainer.on('pointerdown', () => {
            EventBus.emit('play-ui-click');
            download();
        });
        
        // 添加悬停效果（使用配置的动画参数）
        buttonContainer.on('pointerover', () => {
            buttonContainer.setScale(buttonConfig.hoverScale || 1.05);
        });
        
        buttonContainer.on('pointerout', () => {
            buttonContainer.setScale(1.0);
        });
        
        // 保存按钮引用（现在是容器而不是图片）
        this.playNowButton = buttonContainer as any;
        
        // 设置深度层级，确保高于暗色蒙版(10)
        buttonContainer.setDepth(20);
        
        // 添加呼吸动画效果（使用配置的动画参数）
        this.tweens.add({
            targets: buttonContainer,
            scale: buttonConfig.breathingScale || 1.1,
            duration: buttonConfig.breathingDuration || 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private createAutoCompleteButton(): void {
        // 使用防护机制：如果 currentLayout 未初始化，则根据屏幕方向选择默认布局
        const layout = this.currentLayout || (window.innerWidth / window.innerHeight > 1 ? landscapeLayout : portraitLayout);
        const buttonConfig = layout.autoCompleteButton;
        
        // 创建AutoComplete按钮，使用配置中的位置
        this.autoCompleteButton = this.add.image(buttonConfig.x, buttonConfig.y, AssetKeys.AUTO_COMPLETE_BUTTON);
        this.autoCompleteButton.setInteractive();
        this.autoCompleteButton.setDepth(2000); // 确保在所有游戏元素之上，包括卡牌
        
        // 初始状态隐藏按钮
        this.autoCompleteButton.setVisible(false);
        
        // 根据配置设置初始缩放
        const baseScale = 0.8; // AutoComplete 按钮的基础缩放
        const scaleFactorX = buttonConfig.width / 280; // 相对于配置默认宽度的比例
        const scaleFactorY = buttonConfig.height / 70;  // 相对于配置默认高度的比例
        const scaleFactor = Math.min(scaleFactorX, scaleFactorY); // 使用较小的比例保持比例
        const finalScale = baseScale * scaleFactor;
        
        this.autoCompleteButton.setScale(finalScale);
        
        // 添加点击事件
        this.autoCompleteButton.on('pointerdown', () => {
            EventBus.emit('play-ui-click');
            this.onAutoCompleteClick();
        });

        // 添加悬停效果，使用配置中的hoverScale
        const hoverScale = buttonConfig.hoverScale || 1.05;
        this.autoCompleteButton.on('pointerover', () => {
            this.autoCompleteButton.setScale(finalScale * hoverScale);
        });
        
        this.autoCompleteButton.on('pointerout', () => {
            this.autoCompleteButton.setScale(finalScale);
        });

        // 添加呼吸动画效果，使用配置中的参数
        const breathingScale = buttonConfig.breathingScale || 1.08;
        const breathingDuration = buttonConfig.breathingDuration || 1000;
        
        this.tweens.add({
            targets: this.autoCompleteButton,
            scale: finalScale * breathingScale,
            duration: breathingDuration,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private onAutoCompleteClick(): void {
        if (this.autoCompleteManager) {
            console.log('🚀 AutoComplete按钮被点击');
            this.autoCompleteManager.startAutoComplete();
        }
    }

    private createProductName(): void {
        // 创建产品名称图片
        this.productName = this.add.image(0, 0, AssetKeys.PRODUCT_NAME);
        this.productName.setDepth(50); // 设置合适的深度层级
        
        // 根据当前布局设置初始缩放
        const layout = this.currentLayout || portraitLayout;
        const scale = layout.productName?.scale || 1.0;
        this.productName.setScale(scale);
        
        console.log('🎮 ProductName created with scale:', scale);
    }

    private createDarkMask(): void {
        // 创建暗色蒙版图片
        this.darkMask = this.add.image(0, 0, AssetKeys.DARK_MASK);
        this.darkMask.setDepth(10); // 设置较低的深度层级，低于计分板(50)、productName(50)、下载按钮等
        this.darkMask.setOrigin(0, 0.5); // 设置原点为左中，方便定位到右侧
        
        // 初始状态隐藏，只在横屏模式下显示
        this.darkMask.setVisible(false);
        
        console.log('🎮 DarkMask created');
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
        
        // 🚫 教学系统已禁用 - 移除教学系统布局更新通知
        // if (this.tutorialManager) {
        //     EventBus.emit('layout-updated', this.currentLayout);
        // }
    }

    private updateAllPositions(): void {
        this.updateTableauPositions();
        this.updateFoundationPositions();
        this.updateStockWastePositions();
        this.updateScoreboardPosition();
        this.updatePlayNowButtonPosition();
        this.updateAutoCompleteButtonPosition();
        this.updateProductNamePosition();
        this.updateDarkMaskPosition();
    }

    private updateTableauPositions(): void {
        // 如果正在进行发牌动画，不更新位置
        if (this.dealAnimationManager?.isAnimating()) {
            return;
        }
        
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
            currentLayoutExists: !!this.currentLayout,
            stackManagerExists: !!this.stockStackManager
        });
        
        // 🔧 简化逻辑：始终显示重置状态，卡牌depth更高会覆盖在上方
        this.stockZone.setVisible(true);
        this.stockZone.setTexture(AssetKeys.RESET);
        this.stockZone.setInteractive();
        
        // 为重置操作添加点击事件
        this.stockZone.removeAllListeners('pointerdown');
        this.stockZone.on('pointerdown', () => {
            console.log('🔄 [DEBUG] 重置区域被点击');
            this.onStockClick();
        });
        
        // 使用StockStackManager更新堆叠位置
        if (this.stockStackManager) {
            this.stockStackManager.setBasePosition(this.currentLayout.stock.x, this.currentLayout.stock.y);
            
            console.log('🔍 [DEBUG] updateStockWastePositions - 堆叠管理器调试信息:',
                this.stockStackManager.getDebugInfo());
        } else {
            // 备用方案：使用原有逻辑
            this.stock.cards.forEach((card, index) => {
                card.setPosition(this.currentLayout.stock.x, this.currentLayout.stock.y);
                card.setDepth(5 + index);
            });
        }

        // 更新翻牌区域的卡牌位置（不需要背景卡槽）
        this.waste.cards.forEach((card, index) => {
            card.setPosition(this.currentLayout.waste.x, this.currentLayout.waste.y);
            card.setDepth(5 + index);
        });
    }

    /**
     * 隐藏Stock区域（当最后一张牌被收走时）
     */
    public hideStockZone(): void {
        if (this.stockZone) {
            this.stockZone.setVisible(false);
            console.log('🚫 Stock区域已隐藏 - 最后一张牌已收走');
        }
    }

    private updateScoreboardPosition(): void {
        const layout = this.currentLayout.scoreboard;
        
        // 检测当前是否为横屏模式
        const isLandscape = this.currentLayout === landscapeLayout;
        
        // 根据屏幕方向设置文本对齐方式
        if (isLandscape) {
            // 横屏模式：左对齐
            this.timeText.setOrigin(0, 0.5);
            this.scoreText.setOrigin(0, 0.5);
            this.movesText.setOrigin(0, 0.5);
        } else {
            // 竖屏模式：居中对齐
            this.timeText.setOrigin(0.5, 0.5);
            this.scoreText.setOrigin(0.5, 0.5);
            this.movesText.setOrigin(0.5, 0.5);
        }
        
        // 更新横板格式的计分板文本位置和字体大小
        this.timeText.setPosition(layout.time.x, layout.time.y);
        this.timeText.setFontSize(layout.time.fontSize);
        
        this.scoreText.setPosition(layout.score.x, layout.score.y);
        this.scoreText.setFontSize(layout.score.fontSize);
        
        this.movesText.setPosition(layout.moves.x, layout.moves.y);
        this.movesText.setFontSize(layout.moves.fontSize);
        
        // 隐藏的兼容性元素不需要位置更新
    }

    /**
     * 重绘下载按钮的背景和样式
     * 提取自 createPlayNowButton() 方法，用于响应式更新
     */
    private redrawPlayNowButton(buttonConfig: any): void {
        if (!this.playNowButton) return;
        
        // 获取国际化文案
        const translation = getTranslation();
        
        // 🔧 修复：保存当前的缩放值，避免重绘时丢失动画状态
        const currentScale = this.playNowButton.scale;
        
        // 清除容器中的所有子元素
        this.playNowButton.removeAll(true);
        
        // 重新创建按钮背景
        const buttonBackground = this.add.graphics();
        buttonBackground.fillStyle(buttonConfig.backgroundColor || 0xffffff, 1);
        buttonBackground.fillRoundedRect(
            -buttonConfig.width / 2,
            -buttonConfig.height / 2,
            buttonConfig.width,
            buttonConfig.height,
            buttonConfig.borderRadius || 0
        );
        
        // 添加按钮边框
        if (buttonConfig.borderWidth && buttonConfig.borderColor !== undefined) {
            buttonBackground.lineStyle(buttonConfig.borderWidth, buttonConfig.borderColor, 1);
            buttonBackground.strokeRoundedRect(
                -buttonConfig.width / 2,
                -buttonConfig.height / 2,
                buttonConfig.width,
                buttonConfig.height,
                buttonConfig.borderRadius || 0
            );
        }
        
        // 重新创建文字
        this.playNowText = this.add.text(0, 0, translation.playNow, {
            fontSize: `${buttonConfig.fontSize}px`,
            fontFamily: buttonConfig.fontFamily || 'Arial, sans-serif',
            color: buttonConfig.textColor || '#000000',
            fontStyle: buttonConfig.fontStyle || 'normal'
        });
        this.playNowText.setOrigin(0.5, 0.5);
        
        // 将新的背景和文字添加到容器
        this.playNowButton.add([buttonBackground, this.playNowText]);
        
        // 更新交互区域
        this.playNowButton.setSize(buttonConfig.width, buttonConfig.height);
        
        // 🔧 修复：重置缩放值为1.0，确保动画从正确的基础值开始
        this.playNowButton.setScale(1.0);
    }

    private updatePlayNowButtonPosition(): void {
        // 使用防护机制：如果 currentLayout 未初始化，则根据屏幕方向选择默认布局
        const layout = this.currentLayout || (window.innerWidth / window.innerHeight > 1 ? landscapeLayout : portraitLayout);
        const buttonConfig = layout.downloadButton;
        
        // 🔧 修复：先停止现有的动画，避免动画目标对象在重绘过程中失效
        this.tweens.killTweensOf(this.playNowButton);
        
        // 重绘按钮以适应新的尺寸和样式
        this.redrawPlayNowButton(buttonConfig);
        
        // 更新位置
        this.playNowButton.setPosition(buttonConfig.x, buttonConfig.y);
        
        // 🔧 修复：确保按钮重绘完成后再重新添加呼吸动画效果
        // 使用 nextTick 确保重绘操作完全完成
        this.time.delayedCall(0, () => {
            this.tweens.add({
                targets: this.playNowButton,
                scale: buttonConfig.breathingScale || 1.1,
                duration: buttonConfig.breathingDuration || 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });
    }

    private updateAutoCompleteButtonPosition(): void {
        // 使用防护机制：如果 currentLayout 未初始化，则根据屏幕方向选择默认布局
        const layout = this.currentLayout || (window.innerWidth / window.innerHeight > 1 ? landscapeLayout : portraitLayout);
        const buttonConfig = layout.autoCompleteButton;
        
        // 使用AutoComplete按钮专用配置更新位置
        this.autoCompleteButton.setPosition(buttonConfig.x, buttonConfig.y);
        
        // 确保深度层级始终正确，高于所有游戏元素
        this.autoCompleteButton.setDepth(2000);
        
        // 根据新的按钮配置调整 AutoComplete 按钮的缩放
        // 计算相对于默认尺寸的缩放比例
        const baseScale = 0.8; // AutoComplete 按钮的基础缩放
        const scaleFactorX = buttonConfig.width / 280; // 相对于配置默认宽度的比例
        const scaleFactorY = buttonConfig.height / 70;  // 相对于配置默认高度的比例
        const scaleFactor = Math.min(scaleFactorX, scaleFactorY); // 使用较小的比例保持比例
        const finalScale = baseScale * scaleFactor;
        
        this.autoCompleteButton.setScale(finalScale);
        
        // 停止现有的动画
        this.tweens.killTweensOf(this.autoCompleteButton);
        
        // 重新添加呼吸动画效果，使用配置中的参数
        const breathingScale = buttonConfig.breathingScale || 1.08;
        const breathingDuration = buttonConfig.breathingDuration || 1000;
        
        this.tweens.add({
            targets: this.autoCompleteButton,
            scale: finalScale * breathingScale,
            duration: breathingDuration,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private updateProductNamePosition(): void {
        if (!this.productName || !this.currentLayout.productName) {
            return;
        }
        
        // 设置位置
        this.productName.setPosition(
            this.currentLayout.productName.x,
            this.currentLayout.productName.y
        );
        
        // 根据布局更新缩放
        const scale = this.currentLayout.productName.scale || 1.0;
        this.productName.setScale(scale);
        
        console.log('🎮 ProductName position updated:', {
            x: this.currentLayout.productName.x,
            y: this.currentLayout.productName.y,
            scale: scale
        });
    }

    private updateDarkMaskPosition(): void {
        if (!this.darkMask) {
            return;
        }

        // 检测当前是否为横屏模式
        const isLandscape = this.currentLayout === landscapeLayout;
        
        if (isLandscape && this.currentLayout.darkMask) {
            // 横屏模式：显示暗色蒙版
            this.darkMask.setVisible(true);
            
            // 设置位置和尺寸
            const maskConfig = this.currentLayout.darkMask;
            this.darkMask.setPosition(maskConfig.x, maskConfig.y);
            
            // 根据配置的宽度和高度设置显示尺寸
            this.darkMask.setDisplaySize(maskConfig.width, maskConfig.height);
            
            console.log('🎮 DarkMask position updated (landscape):', {
                x: maskConfig.x,
                y: maskConfig.y,
                width: maskConfig.width,
                height: maskConfig.height,
                visible: true
            });
        } else {
            // 竖屏模式：隐藏暗色蒙版
            this.darkMask.setVisible(false);
            
            console.log('🎮 DarkMask hidden (portrait mode)');
        }
    }

    /**
     * 更新AutoComplete按钮的显示状态
     */
    public updateAutoCompleteButtonVisibility(): void {
        if (!this.autoCompleteManager || !this.autoCompleteButton) {
            return;
        }

        const shouldShow = this.autoCompleteManager.canShowAutoCompleteButton();
        const isCurrentlyVisible = this.autoCompleteButton.visible;

        if (shouldShow && !isCurrentlyVisible) {
            console.log('🔘 显示AutoComplete按钮');
            this.autoCompleteButton.setVisible(true);
            // 确保深度层级正确，高于所有游戏元素
            this.autoCompleteButton.setDepth(2000);
        } else if (!shouldShow && isCurrentlyVisible) {
            console.log('🔘 隐藏AutoComplete按钮');
            this.autoCompleteButton.setVisible(false);
        }
    }


    private onResize(): void {
        this.updateGameSize();
        
        // 🚫 教学系统已禁用 - 移除教学系统布局更新通知
        // if (this.tutorialManager) {
        //     // 使用EventBus通知GuideSystem布局更新
        //     EventBus.emit('layout-updated', this.currentLayout);
        // }
    }

    // 动画状态管理
    private isStockAnimating: boolean = false;
    private animationCard: Phaser.GameObjects.Sprite | null = null;

    // 库存牌堆点击事件 - 优化的200ms动画版本
    private onStockClick(): void {
        console.log('🔍 [DEBUG] onStockClick - 库存牌堆被点击');
        
        // 防止重复点击
        if (this.isStockAnimating) {
            console.log('🔍 [DEBUG] onStockClick - 动画进行中，忽略点击');
            return;
        }
        
        // 🚫 教学系统已禁用 - 移除教学模式交互权限检查
        // const canInteract = this.canStockInteractInTutorial();
        // if (!canInteract) {
        //     console.log('🔍 [DEBUG] onStockClick - 交互被阻止');
        //     return;
        // }
        
        // 🚫 教学系统已禁用 - 移除教学事件触发
        // EventBus.emit('stock-clicked');
        
        if (this.stock.cards.length > 0) {
            // 执行翻牌动画序列
            this.playStockFlipAnimation();
        } else if (this.waste.cards.length > 0) {
            // 重置waste到stock
            this.resetWasteToStock();
        } else {
            console.log('🔍 [DEBUG] onStockClick - 无牌可翻，stock和waste都为空');
        }
    }

    // 执行优化的翻牌动画序列（总计150ms）
    private async playStockFlipAnimation(): Promise<void> {
        this.isStockAnimating = true;
        
        try {
            // 阶段1：点击反馈（0-50ms）
            await this.playClickFeedback();
            
            // 阶段2：卡牌翻转和移动同时进行（50-150ms）
            await this.playCardFlipAndMoveAnimation();
            
            // 完成处理
            this.completeStockAnimation();
            
        } catch (error) {
            console.error('❌ [ERROR] playStockFlipAnimation - 动画失败:', error);
            this.cleanupAnimation();
        }
    }

    // 阶段1：点击反馈动画（0-50ms）
    private playClickFeedback(): Promise<void> {
        return new Promise((resolve) => {
            // 播放点击音效
            EventBus.emit('play-ui-click');
            
            // 移除缩放动画，直接完成
            resolve();
        });
    }

    // 阶段2：卡牌翻转和移动同时进行（50-150ms）
    private playCardFlipAndMoveAnimation(): Promise<void> {
        return new Promise((resolve) => {
            // 获取要翻的卡牌（最顶部的卡牌）
            const card = this.stock.cards.pop()!;
            
            // 从StockStackManager中移除卡牌
            if (this.stockStackManager) {
                this.stockStackManager.removeCard(card);
                console.log('🔍 [DEBUG] playCardFlipAndMoveAnimation - 从堆叠管理器中移除卡牌:',
                    `${card.suit}${card.value}, 剩余堆叠: ${this.stockStackManager.getCardCount()}`);
            }
            
            // 🔧 直接使用现有卡牌进行翻转动画，不创建新卡牌
            card.setDepth(100); // 确保在最上层
            card.setVisible(true);
            
            console.log('🔍 [DEBUG] 开始翻转现有卡牌:', {
                suit: card.suit,
                value: card.value,
                currentPosition: { x: card.x, y: card.y },
                faceUp: card.faceUp
            });
            
            // 第一阶段：向上弹跳 + 翻转到一半 + 开始移动（0-50ms）
            this.tweens.add({
                targets: card,
                y: this.currentLayout.stock.y - 12,
                x: this.currentLayout.stock.x + (this.currentLayout.waste.x - this.currentLayout.stock.x) * 0.3,
                scaleX: 0,
                duration: 150,
                ease: 'Power2',
                onComplete: () => {
                    // 翻转卡牌
                    card.setFaceUp(true);
                    
                    console.log('🔍 [DEBUG] 卡牌翻转完成，开始第二阶段移动');
                    
                    // 第二阶段：完成翻转 + 移动到waste位置（50-100ms）
                    this.tweens.add({
                        targets: card,
                        scaleX: 1.0,
                        x: this.currentLayout.waste.x,
                        y: this.currentLayout.waste.y,
                        duration: 150,
                        ease: 'Power2',
                        onComplete: () => {
                            // 将卡牌添加到waste
                            this.waste.cards.push(card);
                            
                            console.log('🔍 [DEBUG] 翻牌动画完成，卡牌已添加到waste');
                            resolve();
                        }
                    });
                }
            });
        });
    }

    // 完成动画处理
    private completeStockAnimation(): void {
        // 播放翻牌音效
        EventBus.emit('play-card-flip');
        
        // 更新游戏状态
        this.updateStockWastePositions();
        this.incrementMoves();
        
        // 触发卡牌翻转事件
        if (this.waste.cards.length > 0) {
            const flippedCard = this.waste.cards[this.waste.cards.length - 1];
            EventBus.emit('card-flipped', { card: flippedCard });
            
            // 🔧 修复：为添加到waste的卡牌重新启用交互
            this.restoreWasteCardInteraction(flippedCard);
        }
        
        // 清理动画
        this.cleanupAnimation();
        
        console.log('🔍 [DEBUG] completeStockAnimation - 翻牌流程完成');
    }

    // 清理动画资源
    private cleanupAnimation(): void {
        try {
            // 🔧 不再需要清理临时动画卡牌，因为我们直接使用现有卡牌
            console.log('🔍 [DEBUG] cleanupAnimation - 清理动画状态');
        } catch (error) {
            console.warn('⚠️ [WARN] cleanupAnimation - 清理动画时出错:', error);
        } finally {
            this.animationCard = null;
            this.isStockAnimating = false;
        }
    }


    // 重置waste到stock（保持原有逻辑）
    private resetWasteToStock(): void {
        console.log('🔍 [DEBUG] resetWasteToStock - 重置waste到stock');
        
        // 简单的重置动画，不需要复杂的200ms序列
        this.isStockAnimating = true;
        
        // 点击反馈
        this.tweens.add({
            targets: this.stockZone,
            scaleX: 0.95,
            scaleY: 0.95,
            duration: 25,
            ease: 'Power2',
            yoyo: true,
            onComplete: () => {
                // 重置卡牌
                while (this.waste.cards.length > 0) {
                    const card = this.waste.cards.pop()!;
                    card.setFaceUp(false);
                    this.stock.cards.push(card);
                    
                    // 将卡牌重新添加到StockStackManager
                    if (this.stockStackManager) {
                        this.stockStackManager.addCard(card);
                    }
                }
                
                console.log('🔍 [DEBUG] resetWasteToStock - 重置完成:', {
                    stockCardsCount: this.stock.cards.length,
                    stackManagerCount: this.stockStackManager?.getCardCount() || 0
                });
                
                this.updateStockWastePositions();
                this.isStockAnimating = false;
            }
        });
    }

    // 增加移动次数
    private incrementMoves(): void {
        this.moves++;
        
        // 添加调试日志
        console.log('🔍 [DEBUG] incrementMoves - 移动次数增加:', {
            currentMoves: this.moves,
            debugMode: this.debugMode
        });
        
        // 更新横板格式的计分板显示
        const t = getTranslation();
        this.movesText.setText(`${t.moves}${this.moves}`);
        
        // 保持兼容性，更新隐藏的分离元素
        this.movesValue.setText(this.moves.toString());

        // 当移动次数超过配置的最大步数时自动下载
        this.checkMaxMovesAndDownload();
    }

    // 检查最大移动次数并触发下载（异步处理配置读取）
    private async checkMaxMovesAndDownload(): Promise<void> {
        try {
            // 在开发环境使用异步方法，生产环境使用同步方法
            const maxMoves = import.meta.env.DEV
                ? await getOutputConfigValueAsync('maxMoves', 10)
                : getOutputConfigValue('maxMoves', 10);
                
            console.log('🔍 [DEBUG] 配置读取调试:', {
                currentMoves: this.moves,
                maxMoves: maxMoves,
                isDev: import.meta.env.DEV,
                willTriggerDownload: this.moves > maxMoves
            });
            
            if (this.moves > maxMoves) {
                console.log('🚨 [DEBUG] 触发下载! moves:', this.moves, 'maxMoves:', maxMoves);
                EventBus.emit('play-download-trigger');
                download();
            }
        } catch (error) {
            console.error('❌ [DEBUG] 配置读取失败，使用默认值:', error);
            // 配置读取失败时使用默认值
            if (this.moves > 10) {
                EventBus.emit('play-download-trigger');
                download();
            }
        }
    }

    // 更新分数
    private updateScore(points: number): void {
        this.score += points;
        
        // 更新横板格式的计分板显示
        const t = getTranslation();
        this.scoreText.setText(`${t.score}${this.score}`);
        
        // 保持兼容性，更新隐藏的分离元素
        this.scoreValue.setText(this.score.toString());
    }

    // 更新时间显示
    private updateTimeDisplay(): void {
        let elapsedSeconds: number;
        const t = getTranslation();
        
        if (this.isTimerStopped) {
            // 计时器已停止，显示停止时的时间
            elapsedSeconds = this.stoppedTime;
        } else if (!this.isTimerStarted) {
            // 计时器未启动时显示 00:00
            this.timeText.setText(`${t.time}00:00`);
            this.timeValue.setText('00:00');
            return;
        } else {
            // 计时器正在运行，计算当前时间
            const currentTime = Date.now();
            elapsedSeconds = Math.floor((currentTime - this.startTime) / 1000);
        }
        
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.timeText.setText(`${t.time}${timeString}`);
        
        // 保持兼容性，更新隐藏的分离元素
        this.timeValue.setText(timeString);
    }

    /**
     * 启动计时器
     */
    public startTimer(): void {
        if (!this.isTimerStarted) {
            this.startTime = Date.now();
            this.isTimerStarted = true;
            this.isTimerStopped = false; // 重置停止状态
            console.log('🕐 Game: Timer started');
            console.log('🔍 [TIMER_DEBUG] Timer started at:', new Date(this.startTime).toISOString());
            console.log('🔍 [TIMER_DEBUG] Tutorial mode:', this.isTutorialMode);
            console.log('🔍 [TIMER_DEBUG] Tutorial manager active:', this.tutorialManager?.isActive());
        } else {
            console.log('🔍 [TIMER_DEBUG] Timer start attempted but already started');
            console.log('🔍 [TIMER_DEBUG] Current timer state - started:', this.isTimerStarted, 'startTime:', this.startTime);
        }
    }

    /**
     * 停止计时器（保持当前时间显示）
     */
    public stopTimer(): void {
        if (this.isTimerStarted && !this.isTimerStopped) {
            const currentTime = Date.now();
            this.stoppedTime = Math.floor((currentTime - this.startTime) / 1000);
            this.isTimerStopped = true;
            console.log('⏱️ Game: Timer stopped at', this.stoppedTime, 'seconds');
        }
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

    // 🚫 教学系统已禁用 - 手势引导功能已完全禁用
    private showGuideHand(x: number, y: number): void {
        console.log('🚫 [TUTORIAL DISABLED] showGuideHand - 手势引导已禁用');
        // 不再显示任何手势引导
        return;
    }

    update(time: number, delta: number): void {
        // 更新时间显示
        this.updateTimeDisplay();
        
        // 🚫 教学系统已禁用 - 移除教学系统更新逻辑
        // if (this.tutorialManager && this.isTutorialMode) {
        //     this.tutorialManager.update(time, delta);
        // }
        
        // 🚫 手势提示系统已禁用 - 不再显示任何引导手势
        // 确保手势图片不会在游戏中出现
    }

    // 🔧 修复：移除updateHandGuide方法，因为手势提示应该只在教学模式下显示
    // 这个方法之前会在非教学模式下显示手势，导致了用户报告的问题
    // private updateHandGuide(): void {
    //     // 如果5秒内没有移动，显示引导
    //     this.guideTimer += 16; // 假设60fps
    //
    //     if (this.guideTimer > 5000 && this.lastMoves === this.moves) {
    //         // 寻找可以移动的卡牌并显示引导
    //         const clickableCard = this.findClickableCard();
    //         if (clickableCard) {
    //             this.showGuideHand(clickableCard.x, clickableCard.y - 50);
    //         }
    //     }
    // }

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

    /**
     * 公共方法：检查胜利条件
     * 供AutoCompleteManager等外部组件调用
     */
    public checkGameWinCondition(): boolean {
        return this.checkWinCondition();
    }

    /**
     * 公共方法：触发游戏胜利
     * 供AutoCompleteManager等外部组件调用
     */
    public triggerGameWin(): void {
        this.onGameWin();
    }

    // 卡牌翻转回调
    public onCardFlipped(): void {
        // 卡牌翻转后的处理逻辑
        this.resetGuideState();
        
        // 更新AutoComplete按钮显示状态
        this.updateAutoCompleteButtonVisibility();
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

    // 获取waste区域的顶部卡牌（用于教学系统检查）
    public getWasteTopCard(): CardComponent | null {
        if (this.waste.cards.length > 0) {
            return this.waste.cards[this.waste.cards.length - 1];
        }
        return null;
    }

    // Klondike游戏逻辑方法

    // 检查是否可以添加到基础牌堆
    public canAddToFoundation(card: CardComponent, foundationIndex: number): boolean {
        const foundation = this.foundation[foundationIndex];
        
        // 检查花色是否匹配预设的位置
        if (foundation.suit && foundation.suit !== card.suit) {
            return false;
        }
        
        if (foundation.cards.length === 0) {
            // 空的基础牌堆只能放A，且必须是对应花色
            return card.numericValue === 1 && foundation.suit === card.suit;
        }
        
        const topCard = foundation.cards[foundation.cards.length - 1];
        
        // 必须是相同花色且数值递增
        return topCard.suit === card.suit && topCard.numericValue === card.numericValue - 1;
    }

    // 添加卡牌到基础牌堆
    public addToFoundation(card: CardComponent, foundationIndex: number, countMove: boolean = true): void {
        const foundation = this.foundation[foundationIndex];
        
        // 🚫 教学系统已禁用 - 移除教学事件触发
        // EventBus.emit('card-to-foundation', { card, foundationIndex });
        
        // 从原来的位置移除卡牌
        this.removeCardFromTableau(card);
        this.removeCardFromWaste(card);
        
        // 添加到基础牌堆
        foundation.cards.push(card);
        
        // 花色已经预先绑定，无需设置
        
        // 播放基础牌堆放置音效
        EventBus.emit('play-slot-place');
        
        // 播放花色爆炸动画
        if (this.suitExplosionManager && this.foundationZones[foundationIndex]) {
            const foundationZone = this.foundationZones[foundationIndex];
            const cardSuit = card.suit; // 获取卡牌花色
            
            // 在卡槽位置播放对应花色的爆炸动画
            this.suitExplosionManager.playExplosionBySuit(
                cardSuit,
                foundationZone.x,
                foundationZone.y,
                600 // 600ms动画时长
            ).catch(error => {
                console.warn('爆炸动画播放失败:', error);
            });
        }
        
        // 更新分数
        this.updateScore(10);
        
        if (countMove) {
            this.incrementMoves();
        }
        
        // 更新AutoComplete按钮显示状态
        this.updateAutoCompleteButtonVisibility();
        
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
        
        // 🚫 教学系统已禁用 - 移除教学事件触发
        // EventBus.emit('card-moved', { card, fromColumn: fromColumnIndex, toColumn: columnIndex });
        
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
        
        // 更新AutoComplete按钮显示状态
        this.updateAutoCompleteButtonVisibility();
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
        // 停止计时器（保持当前时间显示）
        this.stopTimer();
        
        // 播放胜利音效
        EventBus.emit('play-victory');
        console.log('🎵 Victory sound played for game win');
        
        // 简单的胜利提示
        console.log('🎉 恭喜！游戏胜利！');
        
        // 启动华丽的胜利动画
        if (this.victoryAnimationManager) {
            console.log('💫 开始播放华丽的胜利动画...');
            this.victoryAnimationManager.startVictoryAnimation(this.foundation)
                .then(() => {
                    console.log('🎊 胜利动画播放完成！');
                })
                .catch((error) => {
                    console.error('❌ 胜利动画播放失败:', error);
                });
        } else {
            console.warn('⚠️ 胜利动画管理器未初始化');
        }
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
        
        // 重置游戏状态和计时器状态
        this.score = 0;
        this.moves = 0;
        this.startTime = 0;
        this.isTimerStarted = false;
        this.isTimerStopped = false;
        this.stoppedTime = 0;
        console.log('🔍 [RESET_DEBUG] Game reset - timer state reset to:', this.isTimerStarted);
        
        // 重新初始化游戏
        this.initializeGame();
    }

    // 🚫 教学系统已禁用 - 教学模式相关的公共方法已禁用
    public startTutorial(): void {
        console.log('🚫 [TUTORIAL DISABLED] startTutorial - 教学系统已禁用');
        // 不再启动教学系统
    }

    public stopTutorial(): void {
        console.log('🚫 [TUTORIAL DISABLED] stopTutorial - 教学系统已禁用');
        // 不再停止教学系统
    }

    public isTutorialActive(): boolean {
        return false; // 教学系统永远不活跃
    }

    public getTutorialState(): string {
        return 'disabled'; // 返回禁用状态
    }

    public getTutorialManager(): TutorialManager | null {
        return null; // 教学管理器始终为null
    }

    public getIsTutorialMode(): boolean {
        return false; // 永远不是教学模式
    }

    public setIsTutorialMode(value: boolean): void {
        console.log('🚫 [TUTORIAL DISABLED] setIsTutorialMode - 教学系统已禁用，忽略设置');
        // 强制保持非教学模式
        this.isTutorialMode = false;
        
        // 确保手势图片始终隐藏
        if (this.handGuide) {
            this.handGuide.setVisible(false);
        }
    }
    
    public getDebugMode(): boolean {
        return this.debugMode;
    }

    // 🚫 教学系统已禁用 - 移除教学模式交互权限检查
    private canStockInteractInTutorial(): boolean {
        // 教学系统已禁用，始终允许交互
        return true;
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

    /**
     * 获取StockStackManager实例（供其他组件使用）
     */
    public getStockStackManager(): StockStackManager | null {
        return this.stockStackManager || null;
    }

    /**
     * 🔧 修复：为waste区域的卡牌恢复交互能力
     * 当卡牌从stock移动到waste后，重新启用其交互功能
     */
    private restoreWasteCardInteraction(card: CardComponent): void {
        // 重新启用卡牌的基础交互
        card.setInteractive();
        
        // 重新设置拖拽能力（添加空值检查）
        if (card.input) {
            card.input.draggable = true;
        }
        
        // 重新绑定必要的事件监听器（如果需要的话）
        // 这里可以根据需要添加特定的事件监听器
        
        console.log(`🔧 [WASTE_FIX] 为waste区域卡牌恢复交互: ${card.suit}${card.value}`);
    }

    // 🚫 教学系统已禁用 - 始终允许所有操作
    public isActionAllowed(actionType: string): boolean {
        return true; // 教学系统已禁用，允许所有操作
    }

    // AutoComplete支持方法
    public addScore(points: number): void {
        this.updateScore(points);
    }

    public addMove(): void {
        this.incrementMoves();
    }

    public getSuitExplosionManager(): any {
        return this.suitExplosionManager;
    }

    // AutoComplete测试方法
    public testAutoComplete(): void {
        if (this.autoCompleteManager) {
            this.autoCompleteManager.testAutoComplete();
        } else {
            console.error('❌ AutoCompleteManager未初始化');
        }
    }

    /**
     * 应用测试配置
     */
    private applyTestConfiguration(): void {
        if (!this.testDeckGenerator) {
            console.error('❌ TestDeckGenerator未初始化');
            return;
        }

        const testConfig = getTestConfig();
        console.log('🧪 应用测试配置:', testConfig);

        // 强制翻开所有tableau卡牌
        if (testConfig.ALL_CARDS_FACE_UP) {
            this.testDeckGenerator.forceFlipAllTableauCards();
        }

        // 预设Foundation卡牌（用于接近胜利的测试）
        if (testConfig.TEST_DECK_TYPE === 'near_win') {
            this.testDeckGenerator.presetFoundationCards();
        }

        // 强制显示AutoComplete按钮（用于测试）
        if (testConfig.FORCE_SHOW_BUTTON) {
            console.log('🧪 强制显示AutoComplete按钮');
            if (this.autoCompleteButton) {
                this.autoCompleteButton.setVisible(true);
                // 确保深度层级正确，高于所有游戏元素
                this.autoCompleteButton.setDepth(2000);
            }
        }

        // 更新按钮显示状态
        this.updateAutoCompleteButtonVisibility();

        console.log('✅ 测试配置应用完成');
    }

    /**
     * 生成AutoComplete测试牌局布局
     */
    private generateAutoCompleteTestLayout(): any {
        console.log('🧪 生成AutoComplete测试牌局布局');
        
        if (!this.testDeckGenerator) {
            console.error('❌ TestDeckGenerator未初始化');
            return generateTutorialLayout(); // 回退到默认布局
        }
        
        // 生成专门的AutoComplete测试卡牌
        const testCards = this.testDeckGenerator.generateAutoCompleteTestDeck();
        
        // 创建布局结构
        const layout = {
            tableau: [
                // 7列，每列1张可收的卡牌
                [{ suit: testCards[0].suit, value: testCards[0].value, faceUp: true }], // 红桃3
                [{ suit: testCards[1].suit, value: testCards[1].value, faceUp: true }], // 方块2
                [{ suit: testCards[2].suit, value: testCards[2].value, faceUp: true }], // 黑桃2
                [{ suit: testCards[3].suit, value: testCards[3].value, faceUp: true }], // 红桃4
                [{ suit: testCards[4].suit, value: testCards[4].value, faceUp: true }], // 方块3
                [{ suit: testCards[5].suit, value: testCards[5].value, faceUp: true }], // 梅花4
                [{ suit: testCards[6].suit, value: testCards[6].value, faceUp: true }]  // 黑桃3
            ],
            stock: testCards.slice(7).map(card => ({
                suit: card.suit,
                value: card.value,
                faceUp: false
            })) // 剩余卡牌放入stock
        };
        
        console.log('✅ AutoComplete测试牌局布局生成完成');
        return layout;
    }

    /**
     * 应用AutoComplete测试配置
     */
    private applyAutoCompleteTestConfiguration(): void {
        console.log('🧪 应用AutoComplete测试配置');
        
        if (!this.testDeckGenerator) {
            console.error('❌ TestDeckGenerator未初始化');
            return;
        }
        
        // 预设Foundation卡牌
        this.testDeckGenerator.presetAutoCompleteFoundationCards();
        
        // 确保所有tableau卡牌都是翻开的
        for (const column of this.tableau) {
            for (const card of column.cards) {
                if (!card.faceUp) {
                    card.flip().catch(error => {
                        console.warn('翻转卡牌失败:', error);
                    });
                }
            }
        }
        
        // 更新AutoComplete按钮显示状态
        this.time.delayedCall(100, () => {
            this.updateAutoCompleteButtonVisibility();
        });
        
        console.log('✅ AutoComplete测试配置应用完成');
        console.log('🎯 测试说明: 访问 ?debug=1 启用AutoComplete测试模式');
        console.log('🎯 预期效果: AutoComplete按钮应该立即显示，点击后可看到完整收牌动画');
    }

}
