import { GameObjects, Scene } from 'phaser';
import { CardSuit, CardValue } from '../../config/layout';
import { Game } from '../scenes/Game';
import { EventBus } from '../EventBus';

export class Card extends GameObjects.Sprite {
    private _suit: CardSuit;
    private _value: CardValue;
    private _faceUp: boolean;
    private isDragging: boolean = false;
    private startX: number = 0;
    private startY: number = 0;
    private normalDepth: number = 0;
    private attachedCards: Card[] = []; // 存储拖拽时附带的卡牌

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
    flip(): void {
        // 保存原始缩放值
        const originalScaleX = this.scaleX;
        
        // 在动画期间禁用交互
        this.disableInteractive();
        
        // 创建翻转动画
        this.scene.tweens.add({
            targets: this,
            scaleX: 0,
            duration: 150,
            ease: 'Power1',
            onComplete: () => {
                // 在缩放到0时切换纹理
                this._faceUp = !this._faceUp;
                this.setTexture(this._faceUp ? `${Card.getSuitName(this._suit)}${this._value}` : 'card-back');
                
                // 创建展开动画,恢复到原始缩放值
                this.scene.tweens.add({
                    targets: this,
                    scaleX: originalScaleX,
                    duration: 150,
                    ease: 'Power1',
                    onComplete: () => {
                        // 播放翻牌音效
                        EventBus.emit('play-sound', 'flip');
                        
                        // 如果是正面朝上,启用交互和拖拽
                        if (this._faceUp) {
                            this.setInteractive();
                            (this.scene as Game).input.setDraggable(this);
                        }
                    }
                });
            }
        });
    }

    // 拖拽开始
    private onDragStart(pointer: Phaser.Input.Pointer): void {
        if (!this._faceUp) return;
        
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
        
        // 播放拾取音效
        EventBus.emit('play-sound', 'click');
        
        // 设置一个很大的深度值确保显示在最上层
        this.setDepth(Card.DRAG_DEPTH);
        // 设置附属卡牌的深度
        this.attachedCards.forEach((card, index) => {
            card.setDepth(Card.DRAG_DEPTH + index + 1);
        });

        console.log(`[DragStart] Card: ${this._suit}${this._value}, Position: (${this.x}, ${this.y}), Attached: ${this.attachedCards.map(c => `${c.suit}${c.value}`).join(', ')}`);
    }

    // 拖拽中
    private onDrag(pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void {
        if (!this.isDragging) return;
        
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
    private onDragEnd(pointer: Phaser.Input.Pointer): void {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        // 检查是否可以放置到目标位置
        const dropResult = this.checkDropTarget();

        console.log(`[DropResult] Card: ${this._suit}${this._value}, CanDrop: ${dropResult.canDrop}, Position: ${dropResult.x}, ${dropResult.y}`);

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

            console.log(`[ReturnToStart] Card: ${this._suit}${this._value}, Position: (${this.startX}, ${this.startY})`);
        } else {
            const gameScene = this.scene as Game;
            
            // 在移动前先找到原来的列和下一张卡牌
            const nextCard = gameScene.getNextCard(this);
            
            // 移动到目标位置
            this.x = dropResult.x!;
            this.y = dropResult.y!;
            
            // 设置深度以确保显示在目标卡牌上方
            this.setDepth(this.y);
            
            // 移动附属卡牌到新位置
            this.attachedCards.forEach((card, index) => {
                card.x = dropResult.x!;
                card.y = dropResult.y! + (index + 1) * Card.CARD_GAP_Y;
                card.setDepth(card.y);
            });
            
            // 播放成功音效
            EventBus.emit('play-sound', 'move');

            if (dropResult.onDrop) {
                // 如果有onDrop回调(收牌区),执行它
                dropResult.onDrop();
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
                    console.log(`[ColumnCalc] Left: RelativeX=${relativeX}, Index=${newColumnIndex}`);
                } else if (cardX < middleStartX + 3 * gameScene.CARD_GAP_X) {
                    // 中间三列
                    const relativeX = cardX - middleStartX;
                    newColumnIndex = Math.floor(relativeX / gameScene.CARD_GAP_X) + 2;
                    console.log(`[ColumnCalc] Middle: RelativeX=${relativeX}, Index=${newColumnIndex}`);
                } else {
                    // 右侧两列
                    const relativeX = cardX - (middleStartX + 3 * gameScene.CARD_GAP_X);
                    newColumnIndex = Math.floor(relativeX / gameScene.CARD_GAP_X) + 5;
                    console.log(`[ColumnCalc] Right: RelativeX=${relativeX}, Index=${newColumnIndex}`);
                }

                // 确保列索引在有效范围内
                newColumnIndex = Math.max(0, Math.min(6, newColumnIndex));
                
                console.log(`[MoveToColumn] Card: ${this._suit}${this._value}, Column: ${newColumnIndex}`);
                
                // 更新卡牌所在的列
                gameScene.moveCardToColumn(this, newColumnIndex);
            }

            // 翻转原列中的下一张卡牌
            if (nextCard && !nextCard.faceUp) {
                nextCard.flip();
            }
        }
        
        // 清空附属卡牌数组
        this.attachedCards = [];
    }

    // 点击事件
    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        // 播放点击音效
        EventBus.emit('play-sound', 'click');
    }

    // 检查是否可以放置到目标位置,返回目标位置信息
    private checkDropTarget(): { canDrop: boolean; x?: number; y?: number; onDrop?: () => void } {
        // 获取所有可能的目标卡牌
        const gameScene = this.scene as Game;
        
        // 获取每列最底部的卡牌作为可能的目标
        const targets = gameScene.getColumnBottomCards()
            .filter(card => !([this, ...this.attachedCards].includes(card)) && card.faceUp);

        console.log(`[CheckDropTarget] Card: ${this._suit}${this._value}, Position: (${this.x}, ${this.y})`);
        console.log(`[Targets] Count: ${targets.length}, Cards: ${targets.map(c => `${c.suit}${c.value}`).join(', ')}`);

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
                    console.log(`[Foundation] Rejected: Has attached cards`);
                    return { canDrop: false };
                }
                
                // 使用Game类的收牌区验证方法
                if (gameScene.canAddToFoundation(this, i)) {
                    console.log(`[Foundation] Accepted: Zone ${i}`);
                    return {
                        canDrop: true,
                        x: bounds.centerX,
                        y: bounds.centerY,
                        onDrop: () => {
                            gameScene.addToFoundation(this, i);
                        }
                    };
                }
                console.log(`[Foundation] Rejected: Invalid card for zone ${i}`);
                return { canDrop: false };
            }
        }

        // 检查是否可以放在其他卡牌上
        for (const target of targets) {
            // 计算相对位置
            const dx = Math.abs(this.x - target.x);
            const dy = this.y - target.y;
            
            console.log(`[CheckTarget] Target: ${target.suit}${target.value}, Distance: dx=${dx}, dy=${dy}`);
            
            // 如果卡牌在目标卡牌的上方且水平距离合适
            // 放宽检测条件:水平距离小于卡牌宽度,垂直距离在一定范围内
            if (dx < Card.CARD_WIDTH &&
                dy > -Card.CARD_HEIGHT / 2 &&
                dy < Card.CARD_HEIGHT * 2) {
                
                console.log(`[PositionValid] Checking rules for ${target.suit}${target.value}`);
                
                // 基本移动规则验证
                // 1. 红黑交替
                if (target.isRed === this.isRed) {
                    console.log(`[RuleCheck] Failed: Same color`);
                    return { canDrop: false };
                }
                // 2. 数字必须按降序排列
                if (target.numericValue !== this.numericValue + 1) {
                    console.log(`[RuleCheck] Failed: Invalid number sequence (${target.numericValue} vs ${this.numericValue})`);
                    return { canDrop: false };
                }
                
                console.log(`[RuleCheck] Passed: Can drop on ${target.suit}${target.value}`);
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
                    console.log(`[EmptyColumn] Accepted: King`);
                    return {
                        canDrop: true,
                        x: bounds.centerX,
                        y: bounds.top + Card.CARD_GAP_Y
                    };
                }
                console.log(`[EmptyColumn] Rejected: Not a King`);
            }
        }

        console.log(`[NoTarget] Cannot drop here`);
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