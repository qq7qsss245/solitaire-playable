import { GameObjects, Scene } from 'phaser';
import { CardSuit, CardValue, portraitLayout, landscapeLayout } from '../../config/klondike-layout';
import { Game } from '../scenes/Game';
import { EventBus } from '../EventBus';
import { AssetKeys } from '../../assets';
import { TutorialState } from '../tutorial/TutorialState';

// 卡牌数据接口
export interface CardData {
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
    value: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
    faceUp: boolean;
}

// 花色映射
const SUIT_KEYS = {
    hearts: AssetKeys.SUIT_HEART,
    diamonds: AssetKeys.SUIT_DIAMOND,
    clubs: AssetKeys.SUIT_CLUB,
    spades: AssetKeys.SUIT_SPADE
};

// 数值映射 (红色/黑色)
const VALUE_KEYS = {
    red: {
        A: AssetKeys.RED_A,
        2: AssetKeys.RED_2,
        3: AssetKeys.RED_3,
        4: AssetKeys.RED_4,
        5: AssetKeys.RED_5,
        6: AssetKeys.RED_6,
        7: AssetKeys.RED_7,
        8: AssetKeys.RED_8,
        9: AssetKeys.RED_9,
        10: AssetKeys.RED_10,
        J: AssetKeys.RED_J,
        Q: AssetKeys.RED_Q,
        K: AssetKeys.RED_K,
    },
    black: {
        A: AssetKeys.BLACK_A,
        2: AssetKeys.BLACK_2,
        3: AssetKeys.BLACK_3,
        4: AssetKeys.BLACK_4,
        5: AssetKeys.BLACK_5,
        6: AssetKeys.BLACK_6,
        7: AssetKeys.BLACK_7,
        8: AssetKeys.BLACK_8,
        9: AssetKeys.BLACK_9,
        10: AssetKeys.BLACK_10,
        J: AssetKeys.BLACK_J,
        Q: AssetKeys.BLACK_Q,
        K: AssetKeys.BLACK_K,
    }
};

export class Card extends GameObjects.Container {
    private _suit: CardSuit;
    private _value: CardValue;
    private _faceUp: boolean;
    private isDragging: boolean = false;
    private isMoving: boolean = false;
    private startX: number = 0;
    private startY: number = 0;
    private normalDepth: number = 0;
    private attachedCards: Card[] = [];
    private actionQueue: (() => Promise<void>)[] = [];
    private isProcessingQueue: boolean = false;
    private isFlipping: boolean = false;
    private clickTimer: number = 0;
    private dragStartTimer: number = 0;
    private static readonly DRAG_THRESHOLD = 150; // 降低阈值，提高点击响应性
    private static readonly MAX_CLICK_TIME = 300; // 最大点击时间
    
    // 错误交互检测相关状态
    private isShaking: boolean = false;
    private lastErrorTime: number = 0;
    private static readonly ERROR_DEBOUNCE_TIME = 1000; // 防抖时间：1秒

    // 卡牌组件
    private cardBackground!: GameObjects.Image;
    private suitTopLeft!: GameObjects.Image;
    private valueTopLeft!: GameObjects.Image;
    private suitTopRight!: GameObjects.Image; // 新增：右上角花色装饰
    private centerSuit!: GameObjects.Image; // 新增：中心大花色

    // 卡牌尺寸和布局常量 - 从配置中获取
    private static get CARD_WIDTH(): number {
        // 根据当前屏幕方向获取卡牌宽度
        const isLandscape = window.innerWidth > window.innerHeight;
        return isLandscape ? landscapeLayout.cardWidth : portraitLayout.cardWidth;
    }
    
    private static get CARD_HEIGHT(): number {
        // 根据当前屏幕方向获取卡牌高度
        const isLandscape = window.innerWidth > window.innerHeight;
        return isLandscape ? landscapeLayout.cardHeight : portraitLayout.cardHeight;
    }
    
    private static get CARD_GAP_Y(): number {
        // 根据当前屏幕方向获取正确的卡牌间距
        const isLandscape = window.innerWidth > window.innerHeight;
        return isLandscape ? landscapeLayout.tableau.cardGap : portraitLayout.tableau.cardGap;
    }
    
    private static readonly DRAG_DEPTH = 10000;

    // 优化后的布局位置常量（保持15px边距）
    private static readonly TOP_LEFT_SUIT_POS = { x: -40, y: -28 };    // 距左边15px，距上边15px
    private static readonly TOP_LEFT_VALUE_POS = { x: -42, y: -70 };    // 花色下方30px
    private static readonly TOP_RIGHT_SUIT_POS = { x: 36, y: - 65 };     // 右上角花色装饰位置
    private static readonly CENTER_SUIT_POS = { x: 0, y: 35 };           // 中心位置
    
    // 中心图标大小常量
    private static readonly CENTER_SUIT_SCALE = 1.5;        // 普通牌花色缩放
    private static readonly CENTER_FACE_SCALE = 0.6;        // 人物牌缩放（调小）
    private static readonly CENTER_SUIT_ALPHA = 1.0;        // 普通牌花色透明度
    private static readonly CENTER_FACE_ALPHA = 1.0;        // 人物牌透明度
    
    // 左上角图标大小常量
    private static readonly TOP_LEFT_SUIT_SCALE = 0.6;      // 左上角花色缩放
    private static readonly TOP_LEFT_VALUE_SCALE = 0.6;     // 左上角数值缩放
    
    // 右上角图标大小常量
    private static readonly TOP_RIGHT_SUIT_SCALE = 1;     // 右上角花色装饰缩放
    private static readonly TOP_RIGHT_SUIT_ALPHA = 1.0;     // 右上角花色装饰透明度

    constructor(scene: Scene, x: number, y: number, suit: CardSuit, value: CardValue, faceUp: boolean = false) {
        super(scene, x, y);
        
        this._suit = suit;
        this._value = value;
        this._faceUp = faceUp;
        
        // 创建卡牌视觉组件
        this.createCardVisuals();
        
        // 设置交互区域 - 确保覆盖整个卡牌
        this.setSize(Card.CARD_WIDTH, Card.CARD_HEIGHT);
        this.setInteractive();
        
        // 设置初始深度
        this.normalDepth = y;
        this.setDepth(this.normalDepth);
        
        // 注册拖拽事件
        scene.input.setDraggable(this);
        
        this.on('dragstart', this.onDragStart, this);
        this.on('drag', this.onDrag, this);
        this.on('dragend', this.onDragEnd, this);
        this.on('pointerdown', this.onPointerDown, this);
        this.on('pointerup', this.onPointerUp, this);

        // 更新显示状态
        this.updateCardDisplay();
    }

    // 创建卡牌的视觉组件
    private createCardVisuals(): void {
        // 创建卡面背景
        this.cardBackground = this.scene.add.image(0, 0, AssetKeys.CARD_FACE);
        this.cardBackground.setDisplaySize(Card.CARD_WIDTH, Card.CARD_HEIGHT);
        this.add(this.cardBackground);

        // 创建花色图标 - 左上角
        this.suitTopLeft = this.scene.add.image(
            Card.TOP_LEFT_SUIT_POS.x,
            Card.TOP_LEFT_SUIT_POS.y,
            this.getSuitKey()
        );
        this.suitTopLeft.setScale(Card.TOP_LEFT_SUIT_SCALE); // 使用常量
        this.add(this.suitTopLeft);

        // 创建数值图标 - 左上角
        this.valueTopLeft = this.scene.add.image(
            Card.TOP_LEFT_VALUE_POS.x,
            Card.TOP_LEFT_VALUE_POS.y,
            this.getValueKey()
        );
        this.valueTopLeft.setScale(Card.TOP_LEFT_VALUE_SCALE); // 使用常量
        this.add(this.valueTopLeft);

        // 创建花色图标 - 右上角装饰
        this.suitTopRight = this.scene.add.image(
            Card.TOP_RIGHT_SUIT_POS.x,
            Card.TOP_RIGHT_SUIT_POS.y,
            this.getSuitKey()
        );
        this.suitTopRight.setScale(Card.TOP_RIGHT_SUIT_SCALE); // 使用常量
        this.suitTopRight.setAlpha(Card.TOP_RIGHT_SUIT_ALPHA); // 设置透明度
        this.add(this.suitTopRight);


        // 创建中心大花色图标
        this.centerSuit = this.scene.add.image(
            Card.CENTER_SUIT_POS.x,
            Card.CENTER_SUIT_POS.y,
            this.getSuitKey()
        );
        this.centerSuit.setScale(1.8); // 放大1.8倍，比角落花色更大
        this.add(this.centerSuit);
    }

    // 更新卡牌显示状态（正面/背面）
    private updateCardDisplay(): void {
        if (this._faceUp) {
            // 显示正面
            this.cardBackground.setTexture(AssetKeys.CARD_FACE);
            this.suitTopLeft.setVisible(true);
            this.valueTopLeft.setVisible(true);
            this.suitTopRight.setVisible(true); // 显示右上角花色装饰
            this.centerSuit.setVisible(true); // 显示中心图标
            
            // 更新花色和数值纹理
            const suitKey = this.getSuitKey();
            const valueKey = this.getValueKey();
            
            this.suitTopLeft.setTexture(suitKey);
            this.valueTopLeft.setTexture(valueKey);
            this.suitTopRight.setTexture(suitKey); // 更新右上角花色纹理
            
            // 根据是否为人物牌决定中心显示内容
            if (this.isFaceCard()) {
                // J、Q、K显示人物大图
                const faceCardKey = this.getFaceCardKey();
                if (faceCardKey) {
                    this.centerSuit.setTexture(faceCardKey);
                    this.centerSuit.setScale(Card.CENTER_FACE_SCALE); // 使用常量
                    this.centerSuit.setAlpha(Card.CENTER_FACE_ALPHA); // 使用常量
                }
            } else {
                // 其他牌显示花色
                this.centerSuit.setTexture(suitKey);
                this.centerSuit.setScale(Card.CENTER_SUIT_SCALE); // 使用常量
                this.centerSuit.setAlpha(Card.CENTER_SUIT_ALPHA); // 使用常量
            }
        } else {
            // 显示背面
            this.cardBackground.setTexture(AssetKeys.CARD_BACK);
            this.suitTopLeft.setVisible(false);
            this.valueTopLeft.setVisible(false);
            this.suitTopRight.setVisible(false); // 隐藏右上角花色装饰
            this.centerSuit.setVisible(false); // 隐藏中心图标
        }
    }

    // 获取卡牌颜色（红色/黑色）
    private getCardColor(): 'red' | 'black' {
        return (this._suit === 'h' || this._suit === 'd') ? 'red' : 'black';
    }

    // 获取花色资源键名
    private getSuitKey(): string {
        const suitMap = {
            'h': 'hearts',
            'd': 'diamonds', 
            'c': 'clubs',
            's': 'spades'
        } as const;
        
        return SUIT_KEYS[suitMap[this._suit]];
    }

    // 获取数值资源键名
    private getValueKey(): string {
        const color = this.getCardColor();
        return VALUE_KEYS[color][this._value];
    }

    // 获取人物牌大图资源键名
    private getFaceCardKey(): string | null {
        if (this._value === 'J') return AssetKeys.FACE_J;
        if (this._value === 'Q') return AssetKeys.FACE_Q;
        if (this._value === 'K') return AssetKeys.FACE_K;
        return null;
    }

    // 判断是否为人物牌
    private isFaceCard(): boolean {
        return this._value === 'J' || this._value === 'Q' || this._value === 'K';
    }

    // 翻牌动画
    flip(): Promise<void> {
        console.log('🔍 [DEBUG] Card.flip - 开始翻牌:', {
            suit: this.suit,
            value: this.value,
            faceUp: this._faceUp,
            canInteract: this.canInteract(true),
            isFlipping: this.isFlipping
        });
        
        if (!this.canInteract(true)) {
            console.log('🔍 [DEBUG] Card.flip - canInteract检查失败，直接返回');
            return Promise.resolve();
        }

        return new Promise<void>((resolve, reject) => {
            this.addToQueue(async () => {
                try {
                    console.log('🔍 [DEBUG] Card.flip - 进入队列执行');
                    
                    if (this.isFlipping) {
                        console.log('🔍 [DEBUG] Card.flip - 卡牌正在翻转，等待50ms');
                        await new Promise(r => setTimeout(r, 50));
                        if (this.isFlipping) {
                            throw new Error('Card is still flipping');
                        }
                    }

                    console.log('🔍 [DEBUG] Card.flip - 开始翻转动画');
                    this.isFlipping = true;
                    const originalScaleX = this.scaleX;
                    this.disableInteractive();

                    // 第一阶段：缩放到0
                    console.log('🔍 [DEBUG] Card.flip - 第一阶段：缩放到0');
                    await new Promise<void>((resolveFirst) => {
                        this.scene.tweens.add({
                            targets: this,
                            scaleX: 0,
                            duration: 150,
                            ease: 'Power1',
                            onComplete: () => {
                                console.log('🔍 [DEBUG] Card.flip - 第一阶段完成');
                                resolveFirst();
                            }
                        });
                    });

                    // 第二阶段：切换状态和纹理
                    console.log('🔍 [DEBUG] Card.flip - 第二阶段：切换状态和纹理');
                    this._faceUp = !this._faceUp;
                    this.updateCardDisplay();

                    // 第三阶段：恢复缩放
                    console.log('🔍 [DEBUG] Card.flip - 第三阶段：恢复缩放');
                    await new Promise<void>((resolveSecond) => {
                        this.scene.tweens.add({
                            targets: this,
                            scaleX: originalScaleX,
                            duration: 150,
                            ease: 'Power1',
                            onComplete: () => {
                                console.log('🔍 [DEBUG] Card.flip - 翻转动画完成');
                                this.isFlipping = false;
                                
                                if (this._faceUp) {
                                    this.setInteractive();
                                    const gameScene = this.scene as Game;
                                    gameScene.input.setDraggable(this);
                                    gameScene.onCardFlipped();
                                }
                                
                                setTimeout(() => resolveSecond(), 16);
                            }
                        });
                    });

                    console.log('🔍 [DEBUG] Card.flip - 翻转完成，resolve Promise');
                    resolve();
                } catch (error) {
                    console.error('❌ [ERROR] Card.flip - 翻转失败:', error);
                    this.isFlipping = false;
                    reject(error);
                }
            });
        });
    }

    // 添加动作到队列
    private async addToQueue(action: () => Promise<void>) {
        this.actionQueue.push(action);
        if (!this.isProcessingQueue) {
            await this.processQueue();
        }
    }
    
    // 处理队列
    private async processQueue() {
        if (this.isProcessingQueue) {
            return;
        }
        
        this.isProcessingQueue = true;
        try {
            while (this.actionQueue.length > 0) {
                const action = this.actionQueue.shift();
                if (action) {
                    await action();
                }
            }
        } catch (error) {
        } finally {
            this.isProcessingQueue = false;
        }
    }

    // 检查卡牌是否可以操作
    private canInteract(allowFaceDown: boolean = false): boolean {
        return (allowFaceDown || this._faceUp) && !this.isFlipping && !this.isProcessingQueue && !this.isMoving && !this.isShaking;
    }

    // 拖拽开始
    private onDragStart(_pointer: Phaser.Input.Pointer): void {
        if (!this.canInteract()) return;
        
        // 检查教学模式下的交互权限 - 如果不允许则直接返回，不做任何反应
        const gameScene = this.scene as Game;
        if (!this.canInteractInTutorial(gameScene)) {
            return;
        }
        
        // 记录拖拽开始时间
        this.dragStartTimer = Date.now();
        
        // 拖拽操作不进行错误反馈检测
        // 拖拽是探索性操作，用户可以自由尝试不同的位置
        console.log(`🔍 [DEBUG] 拖拽操作开始: ${this._suit}${this._value}, dragStartTimer: ${this.dragStartTimer}, clickTimer: ${this.clickTimer}`);
        
        this.isDragging = true;
        this.startX = this.x;
        this.startY = this.y;
        this.normalDepth = this.depth;
        
        // 获取附属卡牌
        this.attachedCards = gameScene.getAttachedCards(this);
        
        // 保存附属卡牌的起始位置
        this.attachedCards.forEach(card => {
            card.startX = card.x;
            card.startY = card.y;
        });
        
        // 移除这里的时间差计算，避免与点击逻辑冲突
        // 拖拽开始时播放音效
        EventBus.emit('play-card-flip');
        
        // 检查是否为红桃A，如果是则通知隐藏引导效果
        if (this._suit === 'h' && this._value === 'A') {
            EventBus.emit('heart-ace-drag-started');
        }
        
        // 检查是否为红桃Q，如果是则通知隐藏引导效果
        if (this._suit === 'h' && this._value === 'Q') {
            EventBus.emit('heart-q-drag-started');
        }
        
        // 发射通用的拖拽开始事件，供教学系统监听
        EventBus.emit('card-drag-start', { card: this });
        
        // 设置深度
        this.setDepth(Card.DRAG_DEPTH);
        this.attachedCards.forEach((card, index) => {
            card.setDepth(Card.DRAG_DEPTH + index + 1);
        });
    }

    // 拖拽中
    private onDrag(_pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void {
        if (!this.isDragging || !this.canInteract()) return;
        
        // 计算位移
        const dx = dragX - this.x;
        const dy = dragY - this.y;
        
        // 移动主卡牌
        this.x = dragX;
        this.y = dragY;
        
        // 移动附属卡牌
        this.attachedCards.forEach((card, index) => {
            card.x += dx;
            card.y += dy;
        });
        
        // 保持在最上层
        this.setDepth(Card.DRAG_DEPTH);
        this.attachedCards.forEach((card, index) => {
            card.setDepth(Card.DRAG_DEPTH + index + 1);
        });
    }

    // 拖拽结束
    private async onDragEnd(_pointer: Phaser.Input.Pointer): Promise<void> {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.isMoving = false;
        
        // 重置计时器
        this.clickTimer = 0;
        this.dragStartTimer = 0;
        
        console.log(`🔍 [DEBUG] Card.onDragEnd - 重置计时器: ${this._suit}${this._value}`);
        
        // 检查是否可以放置到目标位置
        const dropResult = this.checkDropTarget();

        if (!dropResult.canDrop) {
            // 如果不能放置,返回原位
            this.x = this.startX;
            this.y = this.startY;
            this.setDepth(this.normalDepth);
            
            // 返回附属卡牌到原位
            this.attachedCards.forEach(card => {
                card.x = card.startX;
                card.y = card.startY;
                card.setDepth(card.y);
            });
        } else {
            const gameScene = this.scene as Game;
            
            // 在移动前记录原始位置信息，用于后续的自动翻牌检测
            const originalColumnIndex = gameScene.getColumnIndex(this);
            const originalCardIndex = originalColumnIndex !== -1 ?
                gameScene.tableau[originalColumnIndex].cards.indexOf(this) : -1;
            
            if (dropResult.canDrop) {
                // 播放成功音效
                EventBus.emit('play-card-place');

                // 开始动画移动
                await this.animateMove(
                    dropResult.x!,
                    dropResult.y!,
                    () => {
                        // 动画完成后更新状态
                        const updateState = async () => {
                            try {
                                if (dropResult.onDrop) {
                                    await dropResult.onDrop();
                                } else {
                                    const gameScene = this.scene as Game;
                                    console.log('Card moved to new position:', { x: this.x, y: this.y });
                                }

                                // 使用可靠的自动翻牌机制
                                await this.performAutoFlip(originalColumnIndex, originalCardIndex);
                            } catch (error) {
                                console.error('Error updating state:', error);
                                this.x = this.startX;
                                this.y = this.startY;
                                this.setDepth(this.normalDepth);
                                this.isMoving = false;
                            }
                        };

                        updateState();
                    },
                    this.attachedCards
                );
            }
        }
        
        // 清空附属卡牌数组
        this.attachedCards = [];
    }

    // 点击事件
    private onPointerDown(_pointer: Phaser.Input.Pointer): void {
        this.clickTimer = Date.now();
        console.log(`🔍 [DEBUG] Card.onPointerDown - 设置点击时间: ${this._suit}${this._value}, clickTimer: ${this.clickTimer}, canInteract: ${this.canInteract()}`);
    }

    private onPointerUp(_pointer: Phaser.Input.Pointer): void {
        console.log(`🔍 [DEBUG] Card.onPointerUp - 开始处理点击: ${this._suit}${this._value}`);
        
        if (!this.canInteract()) {
            console.log(`🔍 [DEBUG] Card.onPointerUp - canInteract检查失败: ${this._suit}${this._value}`);
            return;
        }
        
        const currentTime = Date.now();
        let timeDiff = 0;
        
        // 优化时间差计算逻辑
        if (this.clickTimer === 0) {
            console.log(`🚨 [ERROR] Card.onPointerUp - clickTimer 为 0，onPointerDown 可能没有被调用: ${this._suit}${this._value}`);
            // 如果没有clickTimer，但有dragStartTimer，说明是拖拽操作
            if (this.dragStartTimer > 0) {
                timeDiff = currentTime - this.dragStartTimer;
                console.log(`🔍 [DEBUG] Card.onPointerUp - 使用dragStartTimer计算: ${this._suit}${this._value}, timeDiff: ${timeDiff}`);
            } else {
                // 都没有，设置为快速点击
                timeDiff = 50;
                console.log(`🔍 [DEBUG] Card.onPointerUp - 设置为快速点击: ${this._suit}${this._value}, timeDiff: ${timeDiff}`);
            }
        } else {
            timeDiff = currentTime - this.clickTimer;
        }
        
        // 限制最大时间差，防止异常值
        if (timeDiff > Card.MAX_CLICK_TIME) {
            console.log(`🚨 [WARNING] Card.onPointerUp - 时间差异常大，限制为最大值: ${this._suit}${this._value}, 原始timeDiff: ${timeDiff}, 限制后: ${Card.MAX_CLICK_TIME}`);
            timeDiff = Card.MAX_CLICK_TIME;
        }
        
        console.log(`🔍 [DEBUG] Card.onPointerUp - 最终时间差检查: ${this._suit}${this._value}, timeDiff: ${timeDiff}, isDragging: ${this.isDragging}, DRAG_THRESHOLD: ${Card.DRAG_THRESHOLD}`);
        
        // 只要不是真正的拖拽，就应该进行错误检测
        if (!this.isDragging) {
            console.log(`🔍 [DEBUG] Card.onPointerUp - 进入错误检测逻辑: ${this._suit}${this._value}`);
            
            // 检查教学模式下的交互权限 - 如果不允许则直接返回，不做任何反应
            const gameScene = this.scene as Game;
            const canInteractInTutorial = this.canInteractInTutorial(gameScene);
            console.log(`🔍 [DEBUG] Card.onPointerUp - 教学交互检查: ${this._suit}${this._value}, canInteractInTutorial: ${canInteractInTutorial}`);
            
            if (!canInteractInTutorial) {
                if (gameScene.getDebugMode()) {
                    console.log(`🐛 [DEBUG MODE] Card.onPointerUp - 调试模式下忽略教学限制 (${this._suit}${this._value})`);
                } else {
                    console.log(`🔍 [DEBUG] Card.onPointerUp - 教学模式下点击被阻止 (${this._suit}${this._value})`);
                    return;
                }
            }
            
            // 错误交互检测逻辑 - 只在教学结束后生效
            const isTutorialMode = gameScene.getIsTutorialMode();
            console.log(`🔍 [DEBUG] Card.onPointerUp - 教学状态检查: ${this._suit}${this._value}, isTutorialMode: ${isTutorialMode}`);
            
            if (isTutorialMode) {
                // 仍在教学模式中，跳过错误检测
                console.log(`🔍 [DEBUG] Card.onPointerUp - 仍在教学模式中，跳过错误检测: ${this._suit}${this._value}`);
            } else {
                // 教学已结束，启用错误检测
                console.log(`🔍 [DEBUG] Card.onPointerUp - 教学已结束，开始错误检测: ${this._suit}${this._value}`);
                const hasValidMove = this.hasAnyValidMove();
                console.log(`🔍 [DEBUG] Card.onPointerUp - 有效移动检查: ${this._suit}${this._value}, hasValidMove: ${hasValidMove}`);
                
                if (!hasValidMove) {
                    console.log(`🚫 [DEBUG] Card.onPointerUp - 触发错误反馈: ${this._suit}${this._value}`);
                    this.triggerErrorFeedback();
                    return;
                } else {
                    console.log(`✅ [DEBUG] Card.onPointerUp - 有有效移动，继续自动移动: ${this._suit}${this._value}`);
                }
            }
            
            // 只有在点击时间较短时才播放音效和执行自动移动
            if (timeDiff < Card.DRAG_THRESHOLD) {
                console.log(`🔍 [CRITICAL DEBUG] onPointerUp - 播放翻牌音效并尝试自动移动: ${this._suit}${this._value} (timeDiff: ${timeDiff})`);
                EventBus.emit('play-card-flip');
                this.tryAutoMove();
            } else {
                console.log(`🔍 [DEBUG] onPointerUp - 点击时间过长，跳过自动移动: ${this._suit}${this._value} (timeDiff: ${timeDiff})`);
            }
        } else {
            console.log(`🔍 [DEBUG] Card.onPointerUp - 正在拖拽中，跳过处理: ${this._suit}${this._value}`);
        }
    }

    // 尝试自动移动卡牌
    private tryAutoMove(): void {
        this.addToQueue(async () => {
            try {
                const gameScene = this.scene as Game;
                const attachedCards = gameScene.getAttachedCards(this);
                
                // 记录原始位置信息，用于自动翻牌
                const originalColumnIndex = gameScene.getColumnIndex(this);
                const originalCardIndex = originalColumnIndex !== -1 ?
                    gameScene.tableau[originalColumnIndex].cards.indexOf(this) : -1;
                
                // 首先尝试移动到收牌区
                for (let i = 0; i < gameScene.foundationZones.length; i++) {
                    if (gameScene.canAddToFoundation(this, i) && attachedCards.length === 0) {
                        this.setDepth(Card.DRAG_DEPTH);
                        attachedCards.forEach((card, index) => {
                            card.setDepth(Card.DRAG_DEPTH + index + 1);
                        });

                        console.log(`✅ [CRITICAL DEBUG] tryAutoMove - 成功移动到Foundation[${i}]: ${this._suit}${this._value}`);
                        await this.animateMove(
                            gameScene.foundationZones[i].x,
                            gameScene.foundationZones[i].y,
                            () => new Promise<void>(async (resolveMove) => {
                                try {
                                    gameScene.addToFoundation(this, i, true);

                                    // 使用可靠的自动翻牌机制
                                    await this.performAutoFlip(originalColumnIndex, originalCardIndex);
                                    resolveMove();
                                } catch (error) {
                                    console.error('Error in foundation move:', error);
                                    resolveMove();
                                }
                            }),
                            attachedCards
                        );
                        
                        console.log(`✅ [CRITICAL DEBUG] tryAutoMove - Foundation移动完成，提前返回: ${this._suit}${this._value}`);
                        return;
                    }
                }

                // 如果不能移动到收牌区,尝试移动到其他卡牌上
                const targets = gameScene.getColumnBottomCards()
                    .filter(card => !([this, ...attachedCards].includes(card)) && card.faceUp);

                for (const target of targets) {
                    if (target.isRed !== this.isRed && target.numericValue === this.numericValue + 1) {
                        const newColumnIndex = gameScene.getColumnIndex(target);
                        if (newColumnIndex !== -1) {
                            this.setDepth(Card.DRAG_DEPTH);
                            attachedCards.forEach((card, index) => {
                                card.setDepth(Card.DRAG_DEPTH + index + 1);
                            });

                            await this.animateMove(
                                target.x,
                                target.y + Card.CARD_GAP_Y,
                                () => new Promise<void>(async (resolveMove) => {
                                    try {
                                        gameScene.moveCardToColumn(this, newColumnIndex, true);
                                        
                                        // 使用可靠的自动翻牌机制
                                        await this.performAutoFlip(originalColumnIndex, originalCardIndex);
                                        resolveMove();
                                    } catch (error) {
                                        console.error('Error in tableau move:', error);
                                        resolveMove();
                                    }
                                }),
                                attachedCards
                            );
                            console.log(`✅ [CRITICAL DEBUG] tryAutoMove - Tableau移动完成，提前返回: ${this._suit}${this._value}`);
                            return;
                        }
                    }
                }

                // 检查是否可以移动到空列（只允许K）
                if (this.numericValue === 13) {
                    for (let columnIndex = 0; columnIndex < 7; columnIndex++) {
                        const columnCards = gameScene.getColumnBottomCards();
                        const hasCardInColumn = columnCards.some(card => gameScene.getColumnIndex(card) === columnIndex);
                        
                        if (!hasCardInColumn) {
                            // 找到空列，移动K牌到空列
                            const columnX = gameScene.currentLayout.tableau.startX + columnIndex * gameScene.currentLayout.tableau.columnGap;
                            const columnY = gameScene.currentLayout.tableau.startY;
                            
                            this.setDepth(Card.DRAG_DEPTH);
                            attachedCards.forEach((card, index) => {
                                card.setDepth(Card.DRAG_DEPTH + index + 1);
                            });

                            await this.animateMove(
                                columnX,
                                columnY,
                                () => new Promise<void>(async (resolveMove) => {
                                    try {
                                        gameScene.moveCardToColumn(this, columnIndex, true);
                                        
                                        // 使用可靠的自动翻牌机制
                                        await this.performAutoFlip(originalColumnIndex, originalCardIndex);
                                        resolveMove();
                                    } catch (error) {
                                        console.error('Error in empty column move:', error);
                                        resolveMove();
                                    }
                                }),
                                attachedCards
                            );
                            console.log(`✅ [CRITICAL DEBUG] tryAutoMove - 空列移动完成，提前返回: ${this._suit}${this._value}`);
                            return;
                        }
                    }
                }

                // 如果没有可移动位置,播放错误音效
                console.log(`🚫 [CRITICAL DEBUG] tryAutoMove - 没有找到移动位置，准备播放错误音效: ${this._suit}${this._value}`);
                console.log(`🚫 [CRITICAL DEBUG] tryAutoMove - 当前教学状态: ${gameScene.getIsTutorialMode()}`);
                console.log(`🚫 [CRITICAL DEBUG] tryAutoMove - 当前时间: ${Date.now()}, 上次错误时间: ${this.lastErrorTime}`);
                
                // 检查是否在教学模式中 - 教学模式下不应该播放错误音效
                if (gameScene.getIsTutorialMode()) {
                    console.log(`🚫 [CRITICAL DEBUG] tryAutoMove - 教学模式中，跳过错误音效: ${this._suit}${this._value}`);
                    return;
                }
                
                // 检查防抖
                const currentTime = Date.now();
                if (currentTime - this.lastErrorTime < Card.ERROR_DEBOUNCE_TIME) {
                    console.log(`🚫 [CRITICAL DEBUG] tryAutoMove - 防抖阻止错误音效: ${this._suit}${this._value}`);
                    return;
                }
                
                this.lastErrorTime = currentTime;
                console.log(`🚫 [CRITICAL DEBUG] tryAutoMove - 播放错误音效: ${this._suit}${this._value}`);
                EventBus.emit('play-error');
            } catch (error) {
                console.error('Error during move:', error);
                this.x = this.startX;
                this.y = this.startY;
                this.setDepth(this.normalDepth);
            }
        });
    }

    // 移动动画
    private animateMove(targetX: number, targetY: number, onComplete: () => void, attachedCards: Card[] = [], canDrop: boolean = true): Promise<void> {
        if (this.isMoving) {
            return Promise.resolve();
        }

        this.isMoving = true;

        return new Promise<void>((resolve) => {
            let completedAnimations = 0;
            const totalAnimations = 1 + attachedCards.length;
            
            const checkAllComplete = () => {
                completedAnimations++;

                if (completedAnimations === totalAnimations) {
                    setTimeout(() => {
                        setTimeout(() => {
                            const positionOk =
                                Math.abs(this.x - targetX) < 0.1 &&
                                Math.abs(this.y - targetY) < 0.1;
    
                            if (!positionOk) {
                                this.x = targetX;
                                this.y = targetY;
                                this.setDepth(targetY);
                            }
    
                            if (canDrop) {
                                Promise.resolve(onComplete()).then(() => {
                                    this.isMoving = false;
                                    resolve();
                                }).catch(error => {
                                    console.error('Error in onComplete callback:', error);
                                    this.isMoving = false;
                                    resolve();
                                });
                            } else {
                                this.isMoving = false;
                                resolve();
                            }
                        }, 16);
                    }, 16);
                }
            };
            
            // 创建主卡牌动画
            this.scene.tweens.add({
                targets: this,
                x: targetX,
                y: targetY,
                duration: 200,
                ease: 'Power2',
                onComplete: () => {
                    this.setDepth(targetY);
                    checkAllComplete();
                }
            });
            
            // 创建附属卡牌动画
            attachedCards.forEach((card, index) => {
                const cardY = targetY + (index + 1) * Card.CARD_GAP_Y;

                this.scene.tweens.add({
                    targets: card,
                    x: targetX,
                    y: cardY,
                    duration: 200,
                    ease: 'Power2',
                    onComplete: () => {
                        card.setDepth(cardY);
                        checkAllComplete();
                    }
                });
            });
            
            // 播放移动音效
            EventBus.emit('play-card-place');
        });
    }

    // 检查是否可以放置到目标位置,返回目标位置信息
    private checkDropTarget(): { canDrop: boolean; x?: number; y?: number; onDrop?: () => void } {
        const gameScene = this.scene as Game;
        
        // 检查基础牌堆（Foundation）- 实现智能吸附
        // 首先检查是否在任何收牌区范围内
        let isInAnyFoundationZone = false;
        for (let i = 0; i < gameScene.foundationZones.length; i++) {
            const zone = gameScene.foundationZones[i];
            const bounds = zone.getBounds();

            if (this.x >= bounds.left && this.x <= bounds.right &&
                this.y >= bounds.top && this.y <= bounds.bottom) {
                isInAnyFoundationZone = true;
                break;
            }
        }

        // 如果在收牌区范围内，实现智能吸附
        if (isInAnyFoundationZone) {
            // 基础牌堆不允许放置多张卡牌
            if (this.attachedCards.length > 0) {
                return { canDrop: false };
            }

            // 获取正确的花色位置
            const correctFoundationIndex = (gameScene as any).getCorrectFoundationIndex(this._suit);
            
            // 检查正确的花色位置是否可以放置
            if (gameScene.canAddToFoundation(this, correctFoundationIndex)) {
                const correctZone = gameScene.foundationZones[correctFoundationIndex];
                const correctBounds = correctZone.getBounds();
                
                return {
                    canDrop: true,
                    x: correctBounds.centerX,
                    y: correctBounds.centerY,
                    onDrop: () => {
                        gameScene.addToFoundation(this, correctFoundationIndex, true);
                    }
                };
            }
            
            // 如果正确位置不能放置，则拒绝
            return { canDrop: false };
        }

        // 检查Tableau列
        const targets = gameScene.getColumnBottomCards()
            .filter(card => !([this, ...this.attachedCards].includes(card)) && card.faceUp);

        for (const target of targets) {
            const dx = Math.abs(this.x - target.x);
            const dy = this.y - target.y;
            
            // 检测范围：水平距离小于卡牌宽度，垂直距离合理
            if (dx < Card.CARD_WIDTH && dy > -Card.CARD_HEIGHT / 2 && dy < Card.CARD_HEIGHT * 2) {
                // Klondike规则：红黑交替，数值递减
                if (target.isRed !== this.isRed && target.numericValue === this.numericValue + 1) {
                    const targetColumnIndex = gameScene.getColumnIndex(target);
                    return {
                        canDrop: true,
                        x: target.x,
                        y: target.y + Card.CARD_GAP_Y,
                        onDrop: () => {
                            gameScene.moveCardToColumn(this, targetColumnIndex, true);
                        }
                    };
                }
                return { canDrop: false };
            }
        }

        // 检查空列（只允许K）
        if (this.numericValue === 13) {
            const tableauBounds = {
                left: gameScene.currentLayout?.tableau.startX || 0,
                right: (gameScene.currentLayout?.tableau.startX || 0) + 7 * (gameScene.currentLayout?.tableau.columnGap || 130),
                top: gameScene.currentLayout?.tableau.startY || 0,
                bottom: (gameScene.currentLayout?.tableau.startY || 0) + 500
            };

            if (this.x >= tableauBounds.left && this.x <= tableauBounds.right &&
                this.y >= tableauBounds.top && this.y <= tableauBounds.bottom) {
                
                const columnIndex = Math.floor((this.x - tableauBounds.left) / (gameScene.currentLayout?.tableau.columnGap || 130));
                if (columnIndex >= 0 && columnIndex < 7) {
                    const columnCards = gameScene.getColumnBottomCards();
                    const hasCardInColumn = columnCards.some(card => gameScene.getColumnIndex(card) === columnIndex);
                    
                    if (!hasCardInColumn) {
                        const targetX = tableauBounds.left + columnIndex * (gameScene.currentLayout?.tableau.columnGap || 130);
                        const targetY = tableauBounds.top;
                        
                        return {
                            canDrop: true,
                            x: targetX,
                            y: targetY,
                            onDrop: () => {
                                gameScene.moveCardToColumn(this, columnIndex, true);
                            }
                        };
                    }
                }
            }
        }

        return { canDrop: false };
    }

    // Getters
    get suit(): CardSuit {
        return this._suit;
    }

    get value(): CardValue {
        return this._value;
    }

    get faceUp(): boolean {
        return this._faceUp;
    }

    // 设置卡牌正面/背面状态的公共方法
    public setFaceUp(faceUp: boolean): void {
        this._faceUp = faceUp;
        this.updateCardDisplay();
    }

    // 判断卡牌颜色
    get isRed(): boolean {
        return this._suit === 'h' || this._suit === 'd';
    }

    // 获取卡牌数值
    get numericValue(): number {
        switch (this._value) {
            case 'A': return 1;
            case 'J': return 11;
            case 'Q': return 12;
            case 'K': return 13;
            default: return parseInt(this._value);
        }
    }

    // 检查在教学模式下是否可以交互
    private canInteractInTutorial(gameScene: Game): boolean {
        // 调试模式下允许所有交互
        if (gameScene.getDebugMode()) {
            return true;
        }
        
        // 如果不是教学模式，允许所有交互
        if (!gameScene.getIsTutorialMode()) {
            return true;
        }
        
        // 获取教学管理器
        const tutorialManager = gameScene.getTutorialManager();
        // 在教学模式下，如果教学管理器不存在或未激活，默认禁止交互
        // 这样可以避免教学系统启动前的可操作间隙
        if (!tutorialManager || !tutorialManager.isActive()) {
            return false;
        }
        
        // 获取当前教学状态
        const currentState = tutorialManager.getCurrentState();
        
        // 根据教学步骤检查交互权限
        switch (currentState) {
            case TutorialState.STEP_INTRO:
                // 第一步：任何卡牌都不能交互
                return false;
                
            case TutorialState.STEP_RULES:
                // 第二步：只能拖拽红桃A
                return this._suit === 'h' && this._value === 'A';
                
            case TutorialState.STEP_ACE_TO_FOUNDATION:
                // 第三步：只能拖拽红桃A
                return this._suit === 'h' && this._value === 'A';
                
            case TutorialState.STEP_CARD_TO_PILE:
                // 第四步：允许特定卡牌移动（这里可以根据具体需求调整）
                return this._faceUp; // 暂时允许所有正面朝上的卡牌
                
            case TutorialState.STEP_STOCK_FLIP:
                // 第五步：不允许卡牌交互，只能点击库存牌堆
                return false;
                
            case TutorialState.STEP_STOCK_TO_PILE:
                // 只允许waste区域的红桃Q进行交互
                if (this._suit === 'h' && this._value === 'Q') {
                    // 检查这张卡是否在waste区域（通过检查是否是waste的顶部卡牌）
                    const wasteTopCard = gameScene.getWasteTopCard();
                    return wasteTopCard === this;
                }
                return false;
                
            case TutorialState.STEP_PILE_TO_PILE:
                // 第六步：允许特定卡牌移动
                return this._faceUp; // 暂时允许所有正面朝上的卡牌
                
            case TutorialState.STEP_FREE_PLAY:
                // 自由游戏模式：允许所有交互
                return true;
                
            default:
                // 默认不允许交互
                return false;
        }
    }

    // 错误交互检测方法
    
    /**
     * 检查卡牌是否可以移动到任何Foundation位置
     */
    private canMoveToAnyFoundation(): boolean {
        const gameScene = this.scene as Game;
        
        // Foundation只接受单张卡牌
        const attachedCards = gameScene.getAttachedCards(this);
        console.log(`🔍 [DEBUG] canMoveToAnyFoundation - ${this._suit}${this._value}, attachedCards.length: ${attachedCards.length}`);
        
        if (attachedCards.length > 0) {
            console.log(`🔍 [DEBUG] canMoveToAnyFoundation - ${this._suit}${this._value}, 有附属卡牌，不能移动到Foundation`);
            return false;
        }
        
        // 检查所有Foundation位置
        for (let i = 0; i < gameScene.foundationZones.length; i++) {
            const canAdd = gameScene.canAddToFoundation(this, i);
            console.log(`🔍 [DEBUG] canMoveToAnyFoundation - ${this._suit}${this._value}, Foundation[${i}] canAdd: ${canAdd}`);
            if (canAdd) {
                console.log(`🔍 [DEBUG] canMoveToAnyFoundation - ${this._suit}${this._value}, 可以移动到Foundation[${i}]`);
                return true;
            }
        }
        
        console.log(`🔍 [DEBUG] canMoveToAnyFoundation - ${this._suit}${this._value}, 不能移动到任何Foundation`);
        return false;
    }
    
    /**
     * 检查卡牌是否可以移动到任何Tableau位置
     */
    private canMoveToAnyTableau(): boolean {
        const gameScene = this.scene as Game;
        const attachedCards = gameScene.getAttachedCards(this);
        
        // 获取所有列底部卡牌
        const targets = gameScene.getColumnBottomCards()
            .filter(card => !([this, ...attachedCards].includes(card)) && card.faceUp);
        
        console.log(`🔍 [DEBUG] canMoveToAnyTableau - ${this._suit}${this._value}, targets.length: ${targets.length}, attachedCards.length: ${attachedCards.length}`);
        console.log(`🔍 [DEBUG] canMoveToAnyTableau - ${this._suit}${this._value}, this.isRed: ${this.isRed}, this.numericValue: ${this.numericValue}`);
        
        // 检查是否可以放置到任何现有卡牌上
        for (const target of targets) {
            const canPlace = target.isRed !== this.isRed && target.numericValue === this.numericValue + 1;
            console.log(`🔍 [DEBUG] canMoveToAnyTableau - ${this._suit}${this._value} -> ${target._suit}${target._value}, target.isRed: ${target.isRed}, target.numericValue: ${target.numericValue}, canPlace: ${canPlace}`);
            
            // Klondike规则：红黑交替，数值递减
            if (canPlace) {
                console.log(`🔍 [DEBUG] canMoveToAnyTableau - ${this._suit}${this._value}, 可以移动到 ${target._suit}${target._value}`);
                return true;
            }
        }
        
        // 检查是否可以放置到空列（只允许K）
        if (this.numericValue === 13) {
            console.log(`🔍 [DEBUG] canMoveToAnyTableau - ${this._suit}${this._value}, 是K，检查空列`);
            for (let columnIndex = 0; columnIndex < 7; columnIndex++) {
                const columnCards = gameScene.getColumnBottomCards();
                const hasCardInColumn = columnCards.some(card => gameScene.getColumnIndex(card) === columnIndex);
                console.log(`🔍 [DEBUG] canMoveToAnyTableau - ${this._suit}${this._value}, column[${columnIndex}] hasCard: ${hasCardInColumn}`);
                
                if (!hasCardInColumn) {
                    console.log(`🔍 [DEBUG] canMoveToAnyTableau - ${this._suit}${this._value}, 可以移动到空列[${columnIndex}]`);
                    return true;
                }
            }
        }
        
        console.log(`🔍 [DEBUG] canMoveToAnyTableau - ${this._suit}${this._value}, 不能移动到任何Tableau位置`);
        return false;
    }
    
    /**
     * 检查卡牌是否有任何有效移动
     */
    private hasAnyValidMove(): boolean {
        const canMoveToFoundation = this.canMoveToAnyFoundation();
        const canMoveToTableau = this.canMoveToAnyTableau();
        const result = canMoveToFoundation || canMoveToTableau;
        
        console.log(`🔍 [DEBUG] hasAnyValidMove - ${this._suit}${this._value}, canMoveToFoundation: ${canMoveToFoundation}, canMoveToTableau: ${canMoveToTableau}, result: ${result}`);
        
        return result;
    }
    
    /**
     * 晃动动画
     */
    private shake(): void {
        // 防止重复晃动
        if (this.isShaking) return;
        
        // 设置晃动状态
        this.isShaking = true;
        
        // 记录原始位置
        const originalX = this.x;
        const originalY = this.y;
        
        // 新的六阶段震动参数
        const shakeAmplitudes = [12, -15, 10, -6, 3, 0]; // 六阶段震动幅度
        const stageDurations = [60, 80, 60, 60, 60, 80]; // 六阶段时长分配（毫秒）
        const verticalAmplitude = 1; // 减小垂直偏移到1px
        const easeTypes = [
            'Power3.easeOut',
            'Back.easeInOut',
            'Power2.easeInOut',
            'Sine.easeInOut',
            'Power1.easeOut',
            'Elastic.easeOut'
        ];
        
        console.log(`🎯 [SHAKE] 开始六阶段晃动动画: ${this._suit}${this._value}`);
        
        // 第一阶段：+12px震动 (0-60ms)
        this.scene.tweens.add({
            targets: this,
            x: originalX + shakeAmplitudes[0],
            y: originalY - verticalAmplitude,
            duration: stageDurations[0],
            ease: easeTypes[0],
            onComplete: () => {
                // 第二阶段：-15px震动 (60-140ms)
                this.scene.tweens.add({
                    targets: this,
                    x: originalX + shakeAmplitudes[1],
                    y: originalY + verticalAmplitude,
                    duration: stageDurations[1],
                    ease: easeTypes[1],
                    onComplete: () => {
                        // 第三阶段：+10px震动 (140-200ms)
                        this.scene.tweens.add({
                            targets: this,
                            x: originalX + shakeAmplitudes[2],
                            y: originalY - verticalAmplitude,
                            duration: stageDurations[2],
                            ease: easeTypes[2],
                            onComplete: () => {
                                // 第四阶段：-6px震动 (200-260ms)
                                this.scene.tweens.add({
                                    targets: this,
                                    x: originalX + shakeAmplitudes[3],
                                    y: originalY + verticalAmplitude,
                                    duration: stageDurations[3],
                                    ease: easeTypes[3],
                                    onComplete: () => {
                                        // 第五阶段：+3px震动 (260-320ms)
                                        this.scene.tweens.add({
                                            targets: this,
                                            x: originalX + shakeAmplitudes[4],
                                            y: originalY - verticalAmplitude,
                                            duration: stageDurations[4],
                                            ease: easeTypes[4],
                                            onComplete: () => {
                                                // 第六阶段：回到原位 (320-400ms)
                                                this.scene.tweens.add({
                                                    targets: this,
                                                    x: originalX + shakeAmplitudes[5],
                                                    y: originalY,
                                                    duration: stageDurations[5],
                                                    ease: easeTypes[5],
                                                    onComplete: () => {
                                                        // 动画结束后恢复状态
                                                        this.isShaking = false;
                                                        console.log(`🎯 [SHAKE] 六阶段晃动动画完成: ${this._suit}${this._value}`);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 触发错误反馈
     */
    private triggerErrorFeedback(): void {
        const currentTime = Date.now();
        
        console.log(`🚫 [DEBUG] triggerErrorFeedback - 开始: ${this._suit}${this._value}, currentTime: ${currentTime}, lastErrorTime: ${this.lastErrorTime}`);
        
        // 防抖检查
        const timeSinceLastError = currentTime - this.lastErrorTime;
        console.log(`🚫 [DEBUG] triggerErrorFeedback - 防抖检查: ${this._suit}${this._value}, timeSinceLastError: ${timeSinceLastError}, ERROR_DEBOUNCE_TIME: ${Card.ERROR_DEBOUNCE_TIME}`);
        
        if (timeSinceLastError < Card.ERROR_DEBOUNCE_TIME) {
            console.log(`🚫 [DEBUG] triggerErrorFeedback - 防抖阻止: ${this._suit}${this._value}, 距离上次错误时间太短`);
            return;
        }
        
        this.lastErrorTime = currentTime;
        console.log(`🚫 [DEBUG] triggerErrorFeedback - 更新lastErrorTime: ${this._suit}${this._value}, newLastErrorTime: ${this.lastErrorTime}`);
        
        // 播放错误音效
        console.log(`🚫 [CRITICAL DEBUG] triggerErrorFeedback - 播放错误音效: ${this._suit}${this._value}`);
        console.log(`🚫 [CRITICAL DEBUG] triggerErrorFeedback - 调用堆栈:`, new Error().stack);
        EventBus.emit('play-error');
        
        // 触发晃动动画
        console.log(`🚫 [DEBUG] triggerErrorFeedback - 触发晃动动画: ${this._suit}${this._value}, isShaking: ${this.isShaking}`);
        this.shake();
        
        console.log(`🚫 [ERROR FEEDBACK] 卡牌无法移动: ${this._suit}${this._value}`);
    }

    /**
     * 可靠的自动翻牌机制
     * @param originalColumnIndex 原始列索引
     * @param originalCardIndex 原始卡牌在列中的索引
     */
    private async performAutoFlip(originalColumnIndex: number, originalCardIndex: number): Promise<void> {
        console.log('🔄 [AUTO-FLIP] 开始自动翻牌检测:', {
            originalColumnIndex,
            originalCardIndex,
            card: `${this._suit}${this._value}`
        });

        const gameScene = this.scene as Game;
        
        // 验证原始位置信息的有效性
        if (originalColumnIndex < 0 || originalColumnIndex >= gameScene.tableau.length) {
            console.log('🔄 [AUTO-FLIP] 原始列索引无效，跳过自动翻牌');
            return;
        }

        const originalColumn = gameScene.tableau[originalColumnIndex];
        
        // 检查原始位置是否还有卡牌需要翻转
        if (originalCardIndex > 0 && originalCardIndex <= originalColumn.cards.length) {
            // 获取应该被翻转的卡牌（原来在移动卡牌下面的那张）
            const cardToFlip = originalColumn.cards[originalCardIndex - 1];
            
            if (cardToFlip && !cardToFlip.faceUp && !cardToFlip.isFlipping) {
                console.log('🔄 [AUTO-FLIP] 找到需要翻转的卡牌:', {
                    cardToFlip: `${cardToFlip.suit}${cardToFlip.value}`,
                    faceUp: cardToFlip.faceUp,
                    isFlipping: cardToFlip.isFlipping
                });

                // 执行翻牌，带重试机制
                await this.flipCardWithRetry(cardToFlip, 3);
            } else {
                console.log('🔄 [AUTO-FLIP] 没有找到需要翻转的卡牌或卡牌已经是正面朝上');
            }
        } else {
            console.log('🔄 [AUTO-FLIP] 原始位置没有需要翻转的卡牌');
        }

        // 额外的安全检查：扫描所有列，确保没有遗漏的翻牌
        await this.performSafetyFlipCheck();
    }

    /**
     * 带重试机制的翻牌方法
     * @param card 要翻转的卡牌
     * @param maxRetries 最大重试次数
     */
    private async flipCardWithRetry(card: Card, maxRetries: number): Promise<void> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 [AUTO-FLIP] 尝试翻牌 (第${attempt}次):`, `${card.suit}${card.value}`);
                
                // 确保卡牌状态正确
                if (card.faceUp || card.isFlipping) {
                    console.log('🔄 [AUTO-FLIP] 卡牌已经是正面朝上或正在翻转，跳过');
                    return;
                }

                await card.flip();
                console.log('🔄 [AUTO-FLIP] 翻牌成功:', `${card.suit}${card.value}`);
                return;
            } catch (error) {
                console.warn(`🔄 [AUTO-FLIP] 翻牌失败 (第${attempt}次):`, error);
                
                if (attempt < maxRetries) {
                    // 等待一段时间后重试
                    await new Promise(resolve => setTimeout(resolve, 100 * attempt));
                } else {
                    console.error('🔄 [AUTO-FLIP] 翻牌重试次数用尽，放弃翻牌');
                }
            }
        }
    }

    /**
     * 安全检查：扫描所有列，确保没有遗漏需要翻转的卡牌
     */
    private async performSafetyFlipCheck(): Promise<void> {
        const gameScene = this.scene as Game;
        
        console.log('🔄 [SAFETY-CHECK] 开始安全翻牌检查');
        
        for (let columnIndex = 0; columnIndex < gameScene.tableau.length; columnIndex++) {
            const column = gameScene.tableau[columnIndex];
            
            if (column.cards.length > 0) {
                const bottomCard = column.cards[column.cards.length - 1];
                
                // 如果底部卡牌是背面朝上且没有在翻转中，则翻转它
                if (!bottomCard.faceUp && !bottomCard.isFlipping) {
                    console.log('🔄 [SAFETY-CHECK] 发现需要翻转的底部卡牌:', {
                        column: columnIndex,
                        card: `${bottomCard.suit}${bottomCard.value}`
                    });
                    
                    try {
                        await bottomCard.flip();
                        console.log('🔄 [SAFETY-CHECK] 安全检查翻牌成功:', `${bottomCard.suit}${bottomCard.value}`);
                    } catch (error) {
                        console.warn('🔄 [SAFETY-CHECK] 安全检查翻牌失败:', error);
                    }
                }
            }
        }
        
        console.log('🔄 [SAFETY-CHECK] 安全翻牌检查完成');
    }

    // 兼容性方法 - 保持与现有代码的兼容性
    static getSuitName(suit: CardSuit): string {
        const suitName = {
            'h': '红桃',
            'd': '方块',
            's': '黑桃',
            'c': '梅花'
        };
        return suitName[suit];
    }

    // 设置卡牌花色
    public setSuit(suit: CardSuit): void {
        this._suit = suit;
        this.updateCardDisplay();
    }

    // 设置卡牌数值
    public setValue(value: CardValue): void {
        this._value = value;
        this.updateCardDisplay();
    }
}
