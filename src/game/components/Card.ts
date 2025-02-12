import { GameObjects, Scene } from 'phaser';
import { CardSuit, CardValue } from '../../config/layout';
import { Game } from '../scenes/Game';

export class Card extends GameObjects.Container {
    private sprite: GameObjects.Sprite;
    private _suit: CardSuit;
    private _value: CardValue;
    private _faceUp: boolean;
    private isDragging: boolean = false;
    private startX: number = 0;
    private startY: number = 0;

    // 定义卡牌尺寸
    private static readonly CARD_WIDTH = 120;  // 180 * (2/3)
    private static readonly CARD_HEIGHT = 164; // 246 * (2/3)
    private static readonly CARD_GAP_Y = Card.CARD_HEIGHT / 4; // 垂直间距为卡牌高度的1/4

    constructor(scene: Scene, x: number, y: number, suit: CardSuit, value: CardValue, faceUp: boolean = false) {
        super(scene, x, y);
        
        this._suit = suit;
        this._value = value;
        this._faceUp = faceUp;

        // 创建卡牌精灵
        this.sprite = scene.add.sprite(0, 0, this.getTextureKey());
        
        // 设置卡牌尺寸
        this.sprite.setDisplaySize(Card.CARD_WIDTH, Card.CARD_HEIGHT);
        this.add(this.sprite);

        // 设置交互区域
        this.setSize(Card.CARD_WIDTH, Card.CARD_HEIGHT);
        this.setInteractive();

        // 设置初始深度
        this.setDepth(y);

        // 注册拖拽事件
        scene.input.setDraggable(this);

        this.on('dragstart', this.onDragStart, this);
        this.on('drag', this.onDrag, this);
        this.on('dragend', this.onDragEnd, this);
        this.on('pointerdown', this.onPointerDown, this);
    }

    // 获取卡牌纹理key
    private getTextureKey(): string {
        if (!this._faceUp) {
            return 'card-back';
        }

        // 将花色映射到对应的中文名称
        const suitName = {
            'h': '红桃',
            'd': '方块',
            's': '黑桃',
            'c': '梅花'
        };

        return `${suitName[this._suit]}${this._value}`;
    }

    // 翻转卡牌
    flip(): void {
        this._faceUp = !this._faceUp;
        this.sprite.setTexture(this.getTextureKey());
        
        // 播放翻牌音效
        this.scene.sound.play('flip');
    }

    // 拖拽开始
    private onDragStart(pointer: Phaser.Input.Pointer): void {
        if (!this._faceUp) return;
        
        this.isDragging = true;
        this.startX = this.x;
        this.startY = this.y;
        
        // 播放拾取音效
        this.scene.sound.play('click');
        
        // 设置一个很大的深度值确保显示在最上层
        this.setDepth(1000);
        
        console.log('Drag started from:', this.startX, this.startY);
    }

    // 拖拽中
    private onDrag(pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void {
        if (!this.isDragging) return;
        
        this.x = dragX;
        this.y = dragY;
        
        // 保持在最上层
        this.setDepth(1000);
    }

    // 拖拽结束
    private onDragEnd(pointer: Phaser.Input.Pointer): void {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        console.log('Drag ended at:', this.x, this.y);
        
        // 检查是否可以放置到目标位置
        const dropResult = this.checkDropTarget();
        console.log('Drop result:', dropResult);
        
        if (!dropResult.canDrop) {
            console.log('Cannot drop, returning to:', this.startX, this.startY);
            // 如果不能放置,返回原位
            this.x = this.startX;
            this.y = this.startY;
        } else {
            console.log('Can drop, moving to:', dropResult.x, dropResult.y);
            // 移动到目标位置
            this.x = dropResult.x!;
            this.y = dropResult.y!;
            
            // 设置深度以确保显示在目标卡牌上方
            this.setDepth(this.y);
            
            // 播放成功音效
            this.scene.sound.play('move');
        }
    }

    // 点击事件
    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        // 播放点击音效
        this.scene.sound.play('click');
    }

    // 检查是否可以放置到目标位置,返回目标位置信息
    private checkDropTarget(): { canDrop: boolean; x?: number; y?: number } {
        // 获取所有可能的目标卡牌
        const gameScene = this.scene as Game;
        console.log('Card container position:', gameScene.cardContainer.x, gameScene.cardContainer.y);
        
        // 从Game场景的cards数组中获取所有卡牌
        const targets = gameScene.cards
            .filter(card => card !== this && card.faceUp);
        
        console.log('Found potential target cards:', targets.length);
        targets.forEach(card => {
            console.log('Target card:', card.suit, card.value,
                'at position:', card.x, card.y,
                'face up:', card.faceUp);
        });

        // 获取收牌区
        const foundationZones = (this.scene as Game).foundationZones;

        // 检查是否在收牌区范围内
        for (const zone of foundationZones) {
            const bounds = zone.getBounds();
            if (this.x >= bounds.left && this.x <= bounds.right &&
                this.y >= bounds.top && this.y <= bounds.bottom) {
                // 收牌区规则验证
                // 1. 必须是A开始
                if (this.numericValue === 1) {
                    return { canDrop: true, x: bounds.centerX, y: bounds.centerY };
                }
                // 2. 必须按花色和顺序放置
                const cardsInZone = targets.filter(card => {
                    const cardBounds = card.getBounds();
                    return cardBounds.centerX === bounds.centerX &&
                           cardBounds.centerY === bounds.centerY;
                });
                if (cardsInZone.length > 0) {
                    const topCard = cardsInZone[cardsInZone.length - 1];
                    if (topCard.suit === this.suit &&
                        topCard.numericValue === this.numericValue - 1) {
                        return { canDrop: true, x: bounds.centerX, y: bounds.centerY };
                    }
                }
                return { canDrop: false };
            }
        }

        // 检查是否可以放在其他卡牌上
        for (const target of targets) {
            // 获取相对于容器的坐标
            const gameScene = this.scene as Game;
            const containerX = gameScene.cardContainer.x;
            const containerY = gameScene.cardContainer.y;
            
            // 计算相对位置
            const dx = Math.abs(this.x - target.x);
            const dy = this.y - target.y;
            
            console.log('Container position:', containerX, containerY);
            console.log('Found potential target:', target.suit, target.value);
            console.log('Target position (local):', target.x, target.y);
            console.log('Target position (global):', target.x + containerX, target.y + containerY);
            console.log('Current position (local):', this.x, this.y);
            console.log('Current position (global):', this.x + containerX, this.y + containerY);
            console.log('Distance (dx, dy):', dx, dy);
            
            // 打印详细的位置信息
            console.log('Checking card:', this._suit, this._value, 'against target:', target.suit, target.value);
            console.log('Current card container position:', (this.scene as Game).cardContainer.x, (this.scene as Game).cardContainer.y);
            console.log('Current card local position:', this.x, this.y);
            console.log('Target card local position:', target.x, target.y);
            console.log('Distance - dx:', dx, 'dy:', dy);
            
            // 如果卡牌在目标卡牌的上方且水平距离合适
            // 放宽检测条件:水平距离小于卡牌宽度,垂直距离在一定范围内
            if (dx < Card.CARD_WIDTH &&
                dy > -Card.CARD_HEIGHT / 2 &&
                dy < Card.CARD_HEIGHT * 2) {
                
                console.log('Position check passed');
                
                // 基本移动规则验证
                // 1. 红黑交替
                if (target.isRed === this.isRed) {
                    console.log('Color rule failed');
                    return { canDrop: false };
                }
                // 2. 数字必须按降序排列
                if (target.numericValue !== this.numericValue + 1) {
                    console.log('Number rule failed');
                    return { canDrop: false };
                }
                const dropPosition = {
                    canDrop: true,
                    x: target.x,
                    y: target.y + Card.CARD_HEIGHT + Card.CARD_GAP_Y
                };
                console.log('Drop position:', dropPosition);
                return dropPosition;
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