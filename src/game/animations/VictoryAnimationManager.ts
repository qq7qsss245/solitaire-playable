import { Scene } from 'phaser';
import { Card as CardComponent } from '../components/Card';

/**
 * 胜利动画配置
 */
export interface VictoryAnimationConfig {
    /** 圆环旋转一周的时间(ms) */
    CIRCLE_ROTATION_DURATION: number;
    /** 卡牌飞到圆环位置的时间(ms) */
    CARD_FLY_TO_CIRCLE_DURATION: number;
    /** 旋转速度(度/秒) */
    ROTATION_SPEED: number;
    /** 圆环半径(px) */
    CIRCLE_RADIUS: number;
    /** 参与圆环旋转的卡牌数量 */
    CIRCLE_CARD_COUNT: number;
    /** 多余卡牌淡出时间(ms) */
    FADE_OUT_DURATION: number;
}

/**
 * 默认胜利动画配置
 */
export const DEFAULT_VICTORY_CONFIG: VictoryAnimationConfig = {
    CIRCLE_ROTATION_DURATION: 5120,   // 圆环旋转一周的时间(ms) - 原来是 80ms * 32张卡牌 = 2560ms
    CARD_FLY_TO_CIRCLE_DURATION: 600, // 卡牌飞到圆环位置的时间(ms)
    ROTATION_SPEED: 88.24,            // 旋转速度(度/秒) - 调整为独立旋转同步速度
    CIRCLE_RADIUS: 480,               // 圆环半径(px)
    CIRCLE_CARD_COUNT: 25,            // 参与圆环旋转的卡牌数量
    FADE_OUT_DURATION: 100            // 多余卡牌淡出时间(ms)
};

/**
 * 动画阶段枚举
 */
export enum VictoryAnimationPhase {
    IDLE = 'idle',
    CARDS_FLYING_TO_CIRCLE = 'cards_flying_to_circle',
    ROTATING = 'rotating'
}

/**
 * 卡牌动画数据
 */
interface CardAnimationData {
    card: CardComponent;
    originalPosition: { x: number; y: number };
    originalRotation: number;
    foundationIndex: number;
    cardIndex: number;
    rotationTween?: Phaser.Tweens.Tween;  // 独立的旋转动画
}

/**
 * 胜利动画管理器
 * 负责管理游戏胜利后的华丽动画效果
 */
export class VictoryAnimationManager {
    private scene: Scene;
    private config: VictoryAnimationConfig;
    private currentPhase: VictoryAnimationPhase = VictoryAnimationPhase.IDLE;
    private animationCards: CardAnimationData[] = [];
    private centerX: number = 0;
    private centerY: number = 0;
    private rotationTween?: Phaser.Tweens.Tween;
    private isAnimationActive: boolean = false;

    constructor(scene: Scene, config: VictoryAnimationConfig = DEFAULT_VICTORY_CONFIG) {
        this.scene = scene;
        this.config = config;
        this.updateScreenCenter();
    }

    /**
     * 设置屏幕方向变化监听器
     */
    private setupOrientationListener(): void {
        // 监听Phaser场景的resize事件
        this.scene.scale.on('resize', this.handleScreenResize, this);
        
        // 也监听浏览器的orientationchange事件作为备用
        if (typeof window !== 'undefined') {
            window.addEventListener('orientationchange', () => {
                // 延迟一点执行，确保屏幕尺寸已经更新
                setTimeout(() => {
                    this.handleScreenResize();
                }, 100);
            });
        }
    }

    /**
     * 处理屏幕尺寸变化
     */
    private handleScreenResize(): void {
        if (!this.isAnimationActive) {
            return; // 如果动画未激活，不需要处理
        }

        console.log('📱 检测到屏幕尺寸变化，更新圆环中心位置');
        
        // 更新屏幕中心位置
        this.updateScreenCenter();
        
        // 如果有正在旋转的卡牌，更新它们的位置
        this.updateRotatingCardsPosition();
    }

    /**
     * 更新屏幕中心位置
     */
    private updateScreenCenter(): void {
        this.centerX = this.scene.cameras.main.width / 2;
        this.centerY = this.scene.cameras.main.height / 2;
        
        // 可选：根据屏幕尺寸限制圆环半径的最大值（防止超出屏幕）
        // 如果需要严格按照配置使用半径，可以注释掉下面这行
        const minDimension = Math.min(this.scene.cameras.main.width, this.scene.cameras.main.height);
        const maxAllowedRadius = minDimension * 0.4; // 增加到40%，给更多空间
        if (this.config.CIRCLE_RADIUS > maxAllowedRadius) {
            console.warn(`圆环半径 ${this.config.CIRCLE_RADIUS} 超出屏幕限制，调整为 ${maxAllowedRadius}`);
            this.config.CIRCLE_RADIUS = maxAllowedRadius;
        }
        
        console.log(`📐 更新屏幕中心: (${this.centerX}, ${this.centerY}), 圆环半径: ${this.config.CIRCLE_RADIUS}`);
    }

    /**
     * 更新正在旋转的卡牌位置
     */
    private updateRotatingCardsPosition(): void {
        if (!this.animationCards || this.animationCards.length === 0) {
            return;
        }

        // 计算旋转持续时间（与原始动画保持一致）
        const anglePerCard = (2 * Math.PI) / this.animationCards.length;
        const rotationDuration = this.config.CIRCLE_ROTATION_DURATION;

        // 遍历所有正在动画中的卡牌，更新它们的圆环中心位置
        this.animationCards.forEach((cardData, index) => {
            const card = cardData.card;
            
            // 检查卡牌是否正在进行圆环旋转动画
            if (card && card.visible) {
                // 计算当前卡牌应该在圆环上的角度
                const currentAngle = index * anglePerCard - Math.PI / 2; // -π/2 让第一张卡牌在顶部
                
                // 计算新的位置
                const newX = this.centerX + Math.cos(currentAngle) * this.config.CIRCLE_RADIUS;
                const newY = this.centerY + Math.sin(currentAngle) * this.config.CIRCLE_RADIUS;
                
                // 如果卡牌正在进行tween动画，停止当前动画并重新开始
                this.scene.tweens.killTweensOf(card);
                
                // 平滑移动到新位置
                this.scene.tweens.add({
                    targets: card,
                    x: newX,
                    y: newY,
                    duration: 300, // 快速调整到新位置
                    ease: 'Power2',
                    onComplete: () => {
                        // 重新开始圆环旋转动画
                        this.startCardIndependentRotation(cardData, rotationDuration);
                    }
                });
            }
        });
    }

    /**
     * 开始胜利动画
     * @param foundationPiles 4个Foundation牌堆，每个包含13张卡牌
     */
    public async startVictoryAnimation(foundationPiles: Array<{ cards: CardComponent[] }>): Promise<void> {
        if (this.isAnimationActive) {
            console.warn('胜利动画已在播放中');
            return;
        }

        this.isAnimationActive = true;
        this.updateScreenCenter();
        
        // 禁用所有卡牌的交互
        this.disableAllCardInteractions(foundationPiles);
        
        // 收集所有卡牌数据
        this.collectCardData(foundationPiles);
        
        console.log(`🎉 开始胜利动画，共${this.animationCards.length}张卡牌`);
        
        try {
            // 新方案：卡牌飞到圆环顶部并开始独立旋转
            await this.playCardsFlyToTopAndRotatePhase();
            
        } catch (error) {
            console.error('胜利动画播放失败:', error);
            this.stopAnimation();
        }
    }

    /**
     * 禁用所有卡牌的交互
     */
    private disableAllCardInteractions(foundationPiles: Array<{ cards: CardComponent[] }>): void {
        foundationPiles.forEach(pile => {
            pile.cards.forEach(card => {
                if (card) {
                    card.disableInteractive();
                }
            });
        });
        console.log('🚫 已禁用所有卡牌交互');
    }

    /**
     * 收集所有卡牌数据 - 从K开始，按花色循环收集
     */
    private collectCardData(foundationPiles: Array<{ cards: CardComponent[] }>): void {
        this.animationCards = [];
        
        // 先让不参与圆环的卡牌消失
        const circleCardCount = Math.min(this.config.CIRCLE_CARD_COUNT, foundationPiles.length * 13);
        
        // 从K开始（cardIndex = 12），按花色循环收集
        for (let cardIndex = 12; cardIndex >= 0; cardIndex--) { // K=12, Q=11, J=10, ..., A=0
            foundationPiles.forEach((pile, foundationIndex) => {
                if (pile.cards[cardIndex]) {
                    const card = pile.cards[cardIndex];
                    const globalIndex = this.animationCards.length;
                    
                    if (globalIndex < circleCardCount) {
                        // 参与圆环的卡牌
                        this.animationCards.push({
                            card,
                            originalPosition: { x: card.x, y: card.y },
                            originalRotation: card.rotation,
                            foundationIndex,
                            cardIndex
                        });
                    } else {
                        // 不参与圆环的卡牌立即消失
                        this.scene.tweens.add({
                            targets: card,
                            alpha: 0,
                            duration: this.config.FADE_OUT_DURATION,
                            ease: 'Power2',
                            onComplete: () => {
                                card.setVisible(false);
                            }
                        });
                    }
                }
            });
        }
        
        console.log(`🎴 收集卡牌: 参与圆环=${this.animationCards.length}张, 总配置=${circleCardCount}张`);
    }

    /**
     * 新方案：卡牌飞到圆环顶部并开始独立旋转
     */
    private async playCardsFlyToTopAndRotatePhase(): Promise<void> {
        this.currentPhase = VictoryAnimationPhase.CARDS_FLYING_TO_CIRCLE;
        console.log('🚀 开始卡牌飞到圆环顶部并独立旋转阶段');

        // 计算圆环顶部的固定位置（场景坐标系）
        const circleTopX = this.centerX;
        const circleTopY = this.centerY - this.config.CIRCLE_RADIUS;

        // 计算旋转一周的时间：基于完整圆环的均匀分布
        const circleCardCount = Math.min(this.config.CIRCLE_CARD_COUNT, this.animationCards.length);
        // 旋转一周的时间直接使用配置值
        const rotationDuration = this.config.CIRCLE_ROTATION_DURATION;
        // 计算卡牌飞入延时 = 圆环旋转一周时间 / 参与旋转的卡牌数量
        const cardFlyDelay = this.config.CIRCLE_ROTATION_DURATION / this.config.CIRCLE_CARD_COUNT;

        console.log(`📊 动画参数: 总卡牌=${this.animationCards.length}张, 圆环卡牌=${circleCardCount}张, 旋转一周时间=${rotationDuration}ms`);

        const flyPromises: Promise<void>[] = [];

        // 只处理参与圆环旋转的卡牌
        for (let i = 0; i < circleCardCount; i++) {
            const cardData = this.animationCards[i];
            const delay = i * cardFlyDelay;
            
            const promise = new Promise<void>((resolve) => {
                this.scene.time.delayedCall(delay, () => {
                    // 前N张卡牌：飞入圆环并开始旋转
                    this.flyCardToTopAndStartRotation(cardData, circleTopX, circleTopY, rotationDuration, resolve);
                });
            });
            
            flyPromises.push(promise);
        }

        // 多余的卡牌直接在foundation位置消失
        for (let i = circleCardCount; i < this.animationCards.length; i++) {
            const cardData = this.animationCards[i];
            const delay = i * cardFlyDelay;
            
            this.scene.time.delayedCall(delay, () => {
                // 直接淡出消失，不飞入圆环
                this.scene.tweens.add({
                    targets: cardData.card,
                    alpha: 0,
                    duration: this.config.FADE_OUT_DURATION,
                    ease: 'Power2',
                    onComplete: () => {
                        cardData.card.setVisible(false);
                    }
                });
            });
        }

        // 等待所有卡牌开始旋转
        await Promise.all(flyPromises);
        
        this.currentPhase = VictoryAnimationPhase.ROTATING;
        console.log('🎊 所有卡牌已开始独立旋转，形成完整圆环');
    }

    /**
     * 单张卡牌飞到圆环顶部并开始独立旋转
     */
    private flyCardToTopAndStartRotation(
        cardData: CardAnimationData,
        topX: number,
        topY: number,
        rotationDuration: number,
        onComplete: () => void
    ): void {
        const { card } = cardData;
        
        // 提升卡牌深度，确保在最前面
        card.setDepth(1000 + cardData.foundationIndex * 13 + cardData.cardIndex);
        
        // 飞到圆环顶部
        this.scene.tweens.add({
            targets: card,
            x: topX,
            y: topY,
            rotation: 0, // 纵向指向圆心（顶部位置）
            duration: this.config.CARD_FLY_TO_CIRCLE_DURATION,
            ease: 'Power2',
            onComplete: () => {
                onComplete();
            }
        });
        
        // 延迟启动旋转动画，在飞入完成的瞬间开始
        this.scene.time.delayedCall(this.config.CARD_FLY_TO_CIRCLE_DURATION, () => {
            this.startCardIndependentRotation(cardData, rotationDuration);
        });
    }

    /**
     * 开始卡牌的独立圆形轨迹旋转
     */
    private startCardIndependentRotation(cardData: CardAnimationData, rotationDuration: number): void {
        const { card } = cardData;
        
        // 创建独立的圆形轨迹旋转动画
        // 所有卡牌都从圆环顶部（角度 -Math.PI/2）开始，按相同轨迹旋转
        cardData.rotationTween = this.scene.tweens.add({
            targets: {},
            angle: { from: 0, to: Math.PI * 2 }, // 旋转一周
            duration: rotationDuration,
            ease: 'Linear',
            repeat: -1, // 无限循环
            onUpdate: (tween) => {
                const currentAngle = tween.getValue();
                // 计算当前在圆环上的位置（从顶部开始，即 -Math.PI/2）
                const angle = currentAngle - Math.PI / 2; // 从圆环顶部开始
                const x = this.centerX + this.config.CIRCLE_RADIUS * Math.cos(angle);
                const y = this.centerY + this.config.CIRCLE_RADIUS * Math.sin(angle);
                const rotation = angle + Math.PI / 2; // 纵向指向圆心
                
                card.setPosition(x, y);
                card.setRotation(rotation);
            }
        });
    }


    /**
     * 停止动画
     */
    public stopAnimation(): void {
        if (!this.isAnimationActive) {
            return;
        }

        console.log('⏹️ 停止胜利动画');

        // 停止所有卡牌的独立旋转动画
        this.animationCards.forEach(cardData => {
            if (cardData.rotationTween) {
                cardData.rotationTween.destroy();
                cardData.rotationTween = undefined;
            }
        });

        // 停止旋转动画（如果存在）
        if (this.rotationTween) {
            this.rotationTween.destroy();
            this.rotationTween = undefined;
        }

        // 停止所有相关的tweens
        this.scene.tweens.killTweensOf(this.animationCards.map(data => data.card));

        // 清理事件监听器
        this.cleanupEventListeners();

        // 重置状态
        this.currentPhase = VictoryAnimationPhase.IDLE;
        this.isAnimationActive = false;
        this.animationCards = [];
    }

    /**
     * 清理事件监听器
     */
    private cleanupEventListeners(): void {
        // 移除Phaser场景的resize事件监听器
        this.scene.scale.off('resize', this.handleScreenResize, this);
        
        // 注意：window的orientationchange事件监听器无法直接移除，
        // 因为我们使用了匿名函数。在实际项目中，建议保存函数引用以便清理。
        console.log('🧹 已清理事件监听器');
    }

    /**
     * 重置所有卡牌到原始位置（可选功能）
     */
    public resetCardsToOriginalPositions(): void {
        if (this.isAnimationActive) {
            this.stopAnimation();
        }

        this.animationCards.forEach((cardData) => {
            cardData.card.setPosition(cardData.originalPosition.x, cardData.originalPosition.y);
            cardData.card.setRotation(cardData.originalRotation);
        });

        console.log('🔄 卡牌已重置到原始位置');
    }

    /**
     * 获取当前动画阶段
     */
    public getCurrentPhase(): VictoryAnimationPhase {
        return this.currentPhase;
    }

    /**
     * 检查动画是否正在播放
     */
    public isPlaying(): boolean {
        return this.isAnimationActive;
    }

    /**
     * 更新配置
     */
    public updateConfig(newConfig: Partial<VictoryAnimationConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * 销毁管理器
     */
    public destroy(): void {
        this.stopAnimation();
        
        // 清理所有卡牌的旋转动画引用
        this.animationCards.forEach(cardData => {
            if (cardData.rotationTween) {
                cardData.rotationTween.destroy();
                cardData.rotationTween = undefined;
            }
        });
        
        this.animationCards = [];
    }
}