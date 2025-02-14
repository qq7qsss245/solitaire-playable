
import { GameObjects, Scene } from 'phaser';
import { CardSuit, CardValue } from '../../config/layout';
import { Game } from '../scenes/Game';
import { EventBus } from '../EventBus';

export class Card extends GameObjects.Sprite {
    private _suit: CardSuit;
    private _value: CardValue;
    private _faceUp: boolean;
    private isDragging: boolean = false;
    private isMoving: boolean = false;  // 是否正在移动
    private startX: number = 0;
    private startY: number = 0;
    private normalDepth: number = 0;
    private attachedCards: Card[] = []; // 存储拖拽时附带的卡牌
    private actionQueue: (() => Promise<void>)[] = []; // 动作队列
    private isProcessingQueue: boolean = false; // 是否正在处理队列
    private isFlipping: boolean = false; // 是否正在翻转
    private clickTimer: number = 0;
    private static readonly DRAG_THRESHOLD = 200; // 200毫秒阈值
    
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

    // 定义卡牌尺寸
    private static readonly CARD_WIDTH = 120;  // 180 * (2/3)
    private static readonly CARD_HEIGHT = 164; // 246 * (2/3)
    private static readonly CARD_GAP_Y = Card.CARD_HEIGHT / 4; // 垂直间距为卡牌高度的1/4
    private static readonly DRAG_DEPTH = 10000; // 拖拽时的基础深度值

    constructor(scene: Scene, x: number, y: number, suit: CardSuit, value: CardValue, faceUp: boolean = false) {
        super(scene, x, y, faceUp ? `${Card.getSuitName(suit)}${value}` : 'card-back');
        
        this._suit = suit;
        this._value = value;
        this._faceUp = faceUp;
        
        // 设置卡牌尺寸
        this.setDisplaySize(Card.CARD_WIDTH, Card.CARD_HEIGHT);
        
        // 设置交互区域
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
    }

    // 获取花色的中文名称
    private static getSuitName(suit: CardSuit): string {
        const suitName = {
            'h': '红桃',
            'd': '方块',
            's': '黑桃',
            'c': '梅花'
        };
        return suitName[suit];
    }

    // 翻转卡牌
    flip(): Promise<void> {
        if (!this.canInteract(true)) return Promise.resolve();

        // 将翻转操作添加到动作队列中
        return new Promise<void>((resolve, reject) => {
            this.addToQueue(async () => {
                const flipState = {
                    firstAnimationComplete: false,
                    textureLoaded: false,
                    secondAnimationComplete: false,
                    interactionsEnabled: false,
                    error: null as Error | null
                };

                try {
                    const startTime = Date.now();
                    // 如果正在翻转，等待一小段时间后重试
                    if (this.isFlipping) {
                        await new Promise(r => setTimeout(r, 50));
                        if (this.isFlipping) {
                            throw new Error('Card is still flipping');
                        }
                    }

                    this.isFlipping = true;
                    const originalScaleX = this.scaleX;
                    this.disableInteractive();

                    // 第一阶段：缩放到0
                    await new Promise<void>((resolveFirst) => {
                        this.scene.tweens.add({
                            targets: this,
                            scaleX: 0,
                            duration: 150,
                            ease: 'Power1',
                            onComplete: () => {
                                flipState.firstAnimationComplete = true;
                                resolveFirst();
                            }
                        });
                    });

                    // 第二阶段：切换纹理
                    this._faceUp = !this._faceUp;
                    const newTexture = this._faceUp ?
                        `${Card.getSuitName(this._suit)}${this._value}` :
                        'card-back';

                    await new Promise<void>((resolveTexture) => {
                        const texture = this.scene.textures.get(newTexture);
                        if (texture) {
                            this.setTexture(newTexture);
                            flipState.textureLoaded = true;
                            resolveTexture();
                        } else {
                            console.log('Waiting for texture to load');
                            this.scene.load.once('complete', () => {
                                console.log('Texture loaded, applying change');
                                this.setTexture(newTexture);
                                flipState.textureLoaded = true;
                                resolveTexture();
                            });
                        }
                    });

                    // 第三阶段：恢复缩放
                    console.log('=== Phase 3: Scale back ===');
                    console.log('Pre-scale back state:', {
                        card: this._suit + this._value,
                        currentScaleX: this.scaleX,
                        targetScaleX: originalScaleX,
                        texture: this.texture.key,
                        faceUp: this._faceUp,
                        flipState
                    });
                    await new Promise<void>((resolveSecond) => {
                        this.scene.tweens.add({
                            targets: this,
                            scaleX: originalScaleX,
                            duration: 150,
                            ease: 'Power1',
                            onComplete: () => {
                                console.log('Second animation phase complete');
                                flipState.secondAnimationComplete = true;
                                
                                // 更新最终状态
                                EventBus.emit('play-deal');
                                this.isFlipping = false;  // 立即重置翻转状态
                                
                                if (this._faceUp) {
                                    this.setInteractive();
                                    const gameScene = this.scene as Game;
                                    gameScene.input.setDraggable(this);
                                    gameScene.onCardFlipped();
                                    flipState.interactionsEnabled = true;
                                }
                                
                                // 确保状态已完全更新
                                setTimeout(() => {
                                    console.log('State update complete:', {
                                        isFlipping: this.isFlipping,
                                        faceUp: this._faceUp,
                                        interactive: this.input?.enabled
                                    });
                                    resolveSecond();
                                }, 16);
                            }
                        });
                    });

                    // 等待所有动画和状态真正完成
                    await new Promise<void>((resolveDelay) => {
                        const startTime = Date.now();
                        const maxAttempts = 10; // 最多尝试10次
                        let attempts = 0;

                        const checkState = () => {
                            attempts++;
                            console.log('=== Animation state check (attempt ' + attempts + ') ===');
                            console.log('Current state:', {
                                card: this._suit + this._value,
                                scaleX: this.scaleX,
                                texture: this.texture.key,
                                faceUp: this._faceUp,
                                isFlipping: this.isFlipping,
                                flipState,
                                position: { x: this.x, y: this.y },
                                depth: this.depth,
                                interactive: this.input?.enabled,
                                elapsedTime: Date.now() - startTime,
                                attempts
                            });

                            // 验证所有状态
                            const stateValid =
                                flipState.firstAnimationComplete &&
                                flipState.textureLoaded &&
                                flipState.secondAnimationComplete &&
                                Math.abs(this.scaleX - originalScaleX) < 0.01 && // 允许一点误差
                                !this.isFlipping &&
                                ((this._faceUp && this.input?.enabled) || !this._faceUp);

                            if (!stateValid && attempts < maxAttempts) {
                                console.log('State validation failed:', {
                                    firstAnimationComplete: flipState.firstAnimationComplete,
                                    textureLoaded: flipState.textureLoaded,
                                    secondAnimationComplete: flipState.secondAnimationComplete,
                                    scaleXDiff: Math.abs(this.scaleX - originalScaleX),
                                    isFlipping: this.isFlipping,
                                    faceUp: this._faceUp,
                                    interactive: this.input?.enabled
                                });
                                setTimeout(checkState, 32); // 增加检查间隔
                                return;
                            }

                            console.log('=== Animation verification complete ===');
                            console.log('Final state:', {
                                card: this._suit + this._value,
                                scaleX: this.scaleX,
                                texture: this.texture.key,
                                faceUp: this._faceUp,
                                isFlipping: this.isFlipping,
                                flipState,
                                elapsedTime: Date.now() - startTime,
                                attempts,
                                success: stateValid
                            });

                            // 如果达到最大尝试次数但状态仍然不正确，强制修正状态
                            if (!stateValid) {
                                console.warn('Forcing state correction after max attempts');
                                this.scaleX = originalScaleX;
                                this.isFlipping = false;
                                if (this._faceUp) {
                                    this.setInteractive();
                                }
                            }

                            resolveDelay();
                        };

                        checkState();
                    });

                    console.log('=== Flip animation sequence complete ===');
                    console.log('Total time:', Date.now() - startTime);

                    // 动画序列完成后
                    this.isFlipping = false;
                    resolve();
                } catch (error) {
                    console.error('Flip error:', error, {
                        card: this._suit + this._value,
                        state: flipState
                    });
                    this.isFlipping = false;
                    reject(error);
                }
            });
        });
    }


    // 检查卡牌是否可以操作
    private canInteract(allowFaceDown: boolean = false): boolean {
        const canInteract = (allowFaceDown || this._faceUp) && !this.isFlipping && !this.isProcessingQueue && !this.isMoving;

        return canInteract;
    }

    // 拖拽开始
    private onDragStart(pointer: Phaser.Input.Pointer): void {
        if (!this.canInteract()) return;
        
        this.isDragging = true;
        this.startX = this.x;
        this.startY = this.y;
        this.normalDepth = this.depth;
        
        // 获取附属卡牌
        const gameScene = this.scene as Game;
        this.attachedCards = gameScene.getAttachedCards(this);
        
        // 保存附属卡牌的起始位置
        this.attachedCards.forEach(card => {
            card.startX = card.x;
            card.startY = card.y;
        });
        
        const timeDiff = Date.now() - this.clickTimer;
        if (timeDiff > Card.DRAG_THRESHOLD) {
            // 如果超过阈值，说明是拖拽操作
            EventBus.emit('play-click');
        }
        
        // 设置一个很大的深度值确保显示在最上层
        this.setDepth(Card.DRAG_DEPTH);
        // 设置附属卡牌的深度
        this.attachedCards.forEach((card, index) => {
            card.setDepth(Card.DRAG_DEPTH + index + 1);
        });
    }

    // 拖拽中
    private onDrag(pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void {
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
    private async onDragEnd(pointer: Phaser.Input.Pointer): Promise<void> {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.isMoving = false;  // 确保重置移动状态
        console.log('=== onDragEnd ===');
        console.log('Card:', this._suit + this._value);
        console.log('State reset:', {
            isDragging: this.isDragging,
            isMoving: this.isMoving
        });
        
        // 检查是否可以放置到目标位置
        const dropResult = this.checkDropTarget();

        if (!dropResult.canDrop) {
            // 如果不能放置,返回原位
            this.x = this.startX;
            this.y = this.startY;
            // 恢复原来的深度
            this.setDepth(this.normalDepth);
            
            // 返回附属卡牌到原位
            this.attachedCards.forEach(card => {
                card.x = card.startX;
                card.y = card.startY;
                card.setDepth(card.y);
            });
        } else {
            const gameScene = this.scene as Game;
            
            // 在移动前先找到原来的列和下一张卡牌
            const nextCard = gameScene.getNextCard(this);
            
            if (dropResult.canDrop) {
                // 播放成功音效
                EventBus.emit('play-move');

                // 开始动画移动
                await this.animateMove(
                    dropResult.x!,
                    dropResult.y!,
                    () => {
                        // 动画完成后更新状态
                        const updateState = async () => {
                            try {
                                if (dropResult.onDrop) {
                                    // 如果有onDrop回调(收牌区),执行它
                                    await dropResult.onDrop();
                                } else {
                                    // 否则是普通列的移动
                                    // 计算新的列索引
                                    const gameScene = this.scene as Game;
                                    const middleStartX = -gameScene.CARD_GAP_X;
                                    const cardX = this.x - gameScene.currentOffsetX; // 减去偏移量得到相对位置
                                    
                                    let newColumnIndex;
                                    if (cardX < middleStartX - gameScene.CARD_WIDTH) {
                                        // 左侧两列
                                        const relativeX = cardX - (middleStartX - 2 * (gameScene.CARD_WIDTH + gameScene.ColumGap));
                                        newColumnIndex = Math.floor(relativeX / (gameScene.CARD_WIDTH + gameScene.ColumGap));
                                    } else if (cardX < middleStartX + 3 * gameScene.CARD_GAP_X) {
                                        // 中间三列
                                        const relativeX = cardX - middleStartX;
                                        newColumnIndex = Math.floor(relativeX / gameScene.CARD_GAP_X) + 2;
                                    } else {
                                        // 右侧两列
                                        const relativeX = cardX - (middleStartX + 3 * gameScene.CARD_GAP_X);
                                        newColumnIndex = Math.floor(relativeX / gameScene.CARD_GAP_X) + 5;
                                    }
            
                                    // 确保列索引在有效范围内
                                    newColumnIndex = Math.max(0, Math.min(6, newColumnIndex));
                                    
                                    // 更新卡牌所在的列,并计数
                                    gameScene.moveCardToColumn(this, newColumnIndex, true);
                                }

                                // 翻转原列中的下一张卡牌
                                if (nextCard && !nextCard.faceUp && !nextCard.isFlipping) {
                                    try {
                                        console.log('Flipping next card:', {
                                            card: nextCard._suit + nextCard._value,
                                            state: {
                                                isFlipping: nextCard.isFlipping,
                                                faceUp: nextCard._faceUp,
                                                isProcessingQueue: nextCard.isProcessingQueue
                                            }
                                        });
                                        await nextCard.flip();
                                    } catch (error) {
                                        console.warn('Failed to flip next card:', error);
                                        // 继续执行，不影响主要流程
                                    }
                                } else if (nextCard) {
                                    console.log('Skipping next card flip:', {
                                        card: nextCard._suit + nextCard._value,
                                        state: {
                                            isFlipping: nextCard.isFlipping,
                                            faceUp: nextCard._faceUp,
                                            isProcessingQueue: nextCard.isProcessingQueue
                                        }
                                    });
                                }
                            } catch (error) {
                                console.error('Error updating state:', error);
                                // 出错时恢复到原始状态
                                this.x = this.startX;
                                this.y = this.startY;
                                this.setDepth(this.normalDepth);
                                this.isMoving = false;  // 确保重置移动状态
                                console.log('Error recovery:', {
                                    position: { x: this.x, y: this.y },
                                    isMoving: this.isMoving
                                });
                            }
                        };

                        // 执行状态更新
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
    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        if (!this.canInteract()) return;
        this.clickTimer = Date.now();
    }

    private onPointerUp(pointer: Phaser.Input.Pointer): void {
        if (!this.canInteract()) return;
        
        const timeDiff = Date.now() - this.clickTimer;
        if (timeDiff < Card.DRAG_THRESHOLD && !this.isDragging) {
            // 如果时间小于阈值且没有拖拽，说明是点击操作
            EventBus.emit('play-click');
            this.tryAutoMove();
        }
    }

    // 尝试自动移动卡牌
    private tryAutoMove(): void {
        this.addToQueue(async () => {
            try {
                console.log('=== tryAutoMove ===');
                console.log('Card:', this._suit + this._value);
                
                const gameScene = this.scene as Game;
                const attachedCards = gameScene.getAttachedCards(this);
                
                // 首先尝试移动到收牌区
                for (let i = 0; i < gameScene.foundationZones.length; i++) {
                    if (gameScene.canAddToFoundation(this, i) && attachedCards.length === 0) {
                        // 获取并保存当前卡牌的上一张牌
                        const nextCard = gameScene.getNextCard(this);
                        
                        // 提升卡牌渲染优先级
                        this.setDepth(Card.DRAG_DEPTH);
                        attachedCards.forEach((card, index) => {
                            card.setDepth(Card.DRAG_DEPTH + index + 1);
                        });

                        // 可以移动到收牌区
                        await this.animateMove(
                            gameScene.foundationZones[i].x,
                            gameScene.foundationZones[i].y,
                            () => new Promise<void>(async (resolveMove) => {
                                try {
                                    // 先执行收牌
                                    gameScene.addToFoundation(this, i, true); // 在这里计数,因为是直接的移动操作

                                    // 检查下一张卡牌
                                    if (nextCard && !nextCard.faceUp && !nextCard.isFlipping) {
                                        console.log('Flipping next card in foundation move:', {
                                            card: nextCard._suit + nextCard._value,
                                            state: {
                                                isFlipping: nextCard.isFlipping,
                                                faceUp: nextCard._faceUp,
                                                isProcessingQueue: nextCard.isProcessingQueue
                                            }
                                        });
                                        await nextCard.flip();
                                        console.log('Next card flip complete in foundation move');
                                    } else if (nextCard) {
                                        console.log('Skipping next card flip in foundation move:', {
                                            card: nextCard._suit + nextCard._value,
                                            state: {
                                                isFlipping: nextCard.isFlipping,
                                                faceUp: nextCard._faceUp,
                                                isProcessingQueue: nextCard.isProcessingQueue
                                            }
                                        });
                                    }
                                    resolveMove();
                                } catch (error) {
                                    console.error('Error in foundation move:', error);
                                    resolveMove();
                                }
                            }),
                            attachedCards
                        );
                        
                        // 移动成功后返回
                        return;
                    }
                }

                // 如果不能移动到收牌区,尝试移动到其他卡牌上
                const targets = gameScene.getColumnBottomCards()
                    .filter(card => !([this, ...attachedCards].includes(card)) && card.faceUp);

                for (const target of targets) {
                    if (target.isRed !== this.isRed && target.numericValue === this.numericValue + 1) {
                        // 先检查是否可以移动到这个目标
                        const newColumnIndex = gameScene.getColumnIndex(target);
                        if (newColumnIndex !== -1) {
                            // 提升卡牌渲染优先级
                            this.setDepth(Card.DRAG_DEPTH);
                            attachedCards.forEach((card, index) => {
                                card.setDepth(Card.DRAG_DEPTH + index + 1);
                            });

                            // 可以移动到这张卡上
                            await this.animateMove(
                                target.x,
                                target.y + Card.CARD_GAP_Y,
                                () => new Promise<void>((resolveMove) => {
                                    // 更新列的数据并计数
                                    gameScene.moveCardToColumn(this, newColumnIndex, true);
                                    resolveMove();
                                }),
                                attachedCards
                            );
                            return;
                        }
                    }
                }

                // 如果没有可移动位置,播放错误音效
                EventBus.emit('play-click');
            } catch (error) {
                console.error('Error during move:', error);
                // 出错时恢复到原始状态
                this.x = this.startX;
                this.y = this.startY;
                this.setDepth(this.normalDepth);
            }
        });
    }

    // 移动动画
    private animateMove(targetX: number, targetY: number, onComplete: () => void, attachedCards: Card[] = [], canDrop: boolean = true): Promise<void> {
        if (this.isMoving) {
            console.log('Card is already moving:', {
                card: this._suit + this._value,
                from: { x: this.x, y: this.y },
                to: { x: targetX, y: targetY }
            });
            return Promise.resolve();
        }

        this.isMoving = true;
        console.log('=== animateMove start ===');
        console.log('Card:', this._suit + this._value);
        console.log('Animation params:', {
            targetX,
            targetY,
            currentX: this.x,
            currentY: this.y,
            attachedCardsCount: attachedCards.length,
            canDrop,
            isFlipping: this.isFlipping,
            isMoving: this.isMoving,
            faceUp: this._faceUp
        });

        return new Promise<void>((resolve) => {
            let completedAnimations = 0;
            const totalAnimations = 1 + attachedCards.length;
            
            const checkAllComplete = () => {
                completedAnimations++;
                console.log('Animation progress:', {
                    card: this._suit + this._value,
                    completed: completedAnimations,
                    total: totalAnimations,
                    position: { x: this.x, y: this.y }
                });

                if (completedAnimations === totalAnimations) {
                    console.log('=== All animations complete ===');
                    console.log('Main card:', {
                        card: this._suit + this._value,
                        position: { x: this.x, y: this.y },
                        isFlipping: this.isFlipping,
                        faceUp: this._faceUp
                    });
                    console.log('Attached cards:', attachedCards.map(card => ({
                        card: card._suit + card._value,
                        position: { x: card.x, y: card.y }
                    })));

                    // 等待一帧以确保所有状态都已更新
                    setTimeout(() => {
                        // 等待一帧以确保位置和深度更新完成
                        setTimeout(() => {
                            // 验证最终位置
                            const finalState = {
                                card: this._suit + this._value,
                                position: { x: this.x, y: this.y },
                                targetPosition: { x: targetX, y: targetY },
                                depth: this.depth,
                                isFlipping: this.isFlipping,
                                faceUp: this._faceUp
                            };
                            console.log('Verifying final position:', finalState);
    
                            // 检查位置是否正确
                            const positionOk =
                                Math.abs(this.x - targetX) < 0.1 &&
                                Math.abs(this.y - targetY) < 0.1;
    
                            if (!positionOk) {
                                console.warn('Position not exact, forcing correction');
                                this.x = targetX;
                                this.y = targetY;
                                this.setDepth(targetY);
                            }
    
                            if (canDrop) {
                                console.log('Executing onComplete callback');
                                Promise.resolve(onComplete()).then(() => {
                                    console.log('onComplete callback finished');
                                    console.log('Animation sequence finished');
                                    this.isMoving = false;
                                    resolve();
                                }).catch(error => {
                                    console.error('Error in onComplete callback:', error);
                                    console.log('Animation sequence finished with error');
                                    this.isMoving = false;
                                    resolve();
                                });
                            } else {
                                console.log('Animation sequence finished (no callback)');
                                this.isMoving = false;
                                resolve();
                            }
                        }, 16);
                    }, 16);
                }
            };
            
            // 创建主卡牌动画
            console.log('Starting main card animation:', {
                card: this._suit + this._value,
                from: { x: this.x, y: this.y },
                to: { x: targetX, y: targetY }
            });

            this.scene.tweens.add({
                targets: this,
                x: targetX,
                y: targetY,
                duration: 200,
                ease: 'Power2',
                onComplete: () => {
                    console.log('Main card animation complete:', {
                        card: this._suit + this._value,
                        position: { x: this.x, y: this.y }
                    });
                    this.setDepth(targetY);
                    checkAllComplete();
                }
            });
            
            // 创建附属卡牌动画
            if (attachedCards.length > 0) {
                console.log('Starting attached cards animations:', {
                    count: attachedCards.length,
                    cards: attachedCards.map(card => card._suit + card._value)
                });
            }

            attachedCards.forEach((card, index) => {
                const cardY = targetY + (index + 1) * Card.CARD_GAP_Y;
                console.log('Animating attached card:', {
                    card: card._suit + card._value,
                    from: { x: card.x, y: card.y },
                    to: { x: targetX, y: cardY }
                });

                this.scene.tweens.add({
                    targets: card,
                    x: targetX,
                    y: cardY,
                    duration: 200,
                    ease: 'Power2',
                    onComplete: () => {
                        console.log('Attached card animation complete:', {
                            card: card._suit + card._value,
                            position: { x: card.x, y: card.y }
                        });
                        card.setDepth(cardY);
                        checkAllComplete();
                    }
                });
            });
            
            // 播放移动音效
            EventBus.emit('play-move');
        });
    }

    // 检查是否可以放置到目标位置,返回目标位置信息
    private checkDropTarget(): { canDrop: boolean; x?: number; y?: number; onDrop?: () => void } {
        // 获取所有可能的目标卡牌
        const gameScene = this.scene as Game;
        
        // 获取每列最底部的卡牌作为可能的目标
        const targets = gameScene.getColumnBottomCards()
            .filter(card => !([this, ...this.attachedCards].includes(card)) && card.faceUp);

        // 获取收牌区
        const foundationZones = (this.scene as Game).foundationZones;

        // 检查是否在收牌区范围内
        for (let i = 0; i < foundationZones.length; i++) {
            const zone = foundationZones[i];
            const bounds = zone.getBounds();

            // 使用当前位置直接判断
            if (this.x >= bounds.left && this.x <= bounds.right &&
                this.y >= bounds.top && this.y <= bounds.bottom) {
                // 收牌区不允许放置多张卡牌
                if (this.attachedCards.length > 0) {
                    return { canDrop: false };
                }
                
                // 使用Game类的收牌区验证方法
                if (gameScene.canAddToFoundation(this, i)) {
                    return {
                        canDrop: true,
                        x: bounds.centerX,
                        y: bounds.centerY,
                        onDrop: () => {
                            gameScene.addToFoundation(this, i, false); // 不在这里计数,因为moveCardToColumn会计数
                        }
                    };
                }
                return { canDrop: false };
            }
        }

        // 检查是否可以放在其他卡牌上
        for (const target of targets) {
            // 计算相对位置
            const dx = Math.abs(this.x - target.x);
            const dy = this.y - target.y;
            
            // 如果卡牌在目标卡牌的上方且水平距离合适
            // 放宽检测条件:水平距离小于卡牌宽度,垂直距离在一定范围内
            if (dx < Card.CARD_WIDTH &&
                dy > -Card.CARD_HEIGHT / 2 &&
                dy < Card.CARD_HEIGHT * 2) {
                
                // 基本移动规则验证
                // 1. 红黑交替
                if (target.isRed === this.isRed) {
                    return { canDrop: false };
                }
                // 2. 数字必须按降序排列
                if (target.numericValue !== this.numericValue + 1) {
                    return { canDrop: false };
                }
                return {
                    canDrop: true,
                    x: target.x,
                    y: target.y + Card.CARD_GAP_Y
                };
            }
        }

        // 检查是否放在空列(只允许K)
        const emptyColumns = this.scene.children.list
            .filter(obj => obj instanceof GameObjects.Zone);
        for (const column of emptyColumns) {
            const bounds = column.getBounds();
            if (this.x >= bounds.left && this.x <= bounds.right &&
                this.y >= bounds.top && this.y <= bounds.bottom) {
                if (this.numericValue === 13) { // 只允许K放在空列
                    return {
                        canDrop: true,
                        x: bounds.centerX,
                        y: bounds.top + Card.CARD_GAP_Y
                    };
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
}