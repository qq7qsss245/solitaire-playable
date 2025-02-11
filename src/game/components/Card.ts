import { GameObjects, Scene } from 'phaser';
import { CardSuit, CardValue } from '../../config/layout';

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
        
        // 将卡牌移到顶层
        this.scene.children.bringToTop(this);
    }

    // 拖拽中
    private onDrag(pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void {
        if (!this.isDragging) return;
        
        this.x = dragX;
        this.y = dragY;
    }

    // 拖拽结束
    private onDragEnd(pointer: Phaser.Input.Pointer): void {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        // 检查是否可以放置到目标位置
        const canDrop = this.checkDropTarget();
        
        if (!canDrop) {
            // 如果不能放置,返回原位
            this.x = this.startX;
            this.y = this.startY;
            // 播放失败音效
            this.scene.sound.play('no');
        } else {
            // 播放成功音效
            this.scene.sound.play('move');
        }
    }

    // 点击事件
    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        // 播放点击音效
        this.scene.sound.play('click');
    }

    // 检查是否可以放置到目标位置
    private checkDropTarget(): boolean {
        // TODO: 实现放置规则检查
        return false;
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