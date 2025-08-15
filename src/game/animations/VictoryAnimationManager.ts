import { Scene } from 'phaser';
import { Card as CardComponent } from '../components/Card';

/**
 * 胜利动画配置
 */
export interface VictoryAnimationConfig {
    /** 卡牌飞出间隔(ms) */
    CARD_FLY_OUT_DELAY: number;
    /** 卡牌飞到圆环位置的时间(ms) */
    CARD_FLY_TO_CIRCLE_DURATION: number;
    /** 旋转速度(度/秒) */
    ROTATION_SPEED: number;
    /** 圆环半径(px) */
    CIRCLE_RADIUS: number;
}

/**
 * 默认胜利动画配置
 */
export const DEFAULT_VICTORY_CONFIG: VictoryAnimationConfig = {
    CARD_FLY_OUT_DELAY: 80,           // 卡牌飞出间隔(ms)
    CARD_FLY_TO_CIRCLE_DURATION: 1200, // 卡牌飞到圆环位置的时间(ms)
    ROTATION_SPEED: 45,               // 旋转速度(度/秒)
    CIRCLE_RADIUS: 250                // 圆环半径(px)
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
     * 更新屏幕中心位置
     */
    private updateScreenCenter(): void {
        this.centerX = this.scene.cameras.main.width / 2;
        this.centerY = this.scene.cameras.main.height / 2;
        
        // 根据屏幕尺寸动态调整圆环半径
        const minDimension = Math.min(this.scene.cameras.main.width, this.scene.cameras.main.height);
        this.config.CIRCLE_RADIUS = Math.min(this.config.CIRCLE_RADIUS, minDimension * 0.3);
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
        
        // 收集所有卡牌数据
        this.collectCardData(foundationPiles);
        
        console.log(`🎉 开始胜利动画，共${this.animationCards.length}张卡牌`);
        
        try {
            // 阶段1：卡牌直接飞到圆环位置
            await this.playCardsDirectFlyToCirclePhase();
            
            // 阶段2：持续旋转
            this.playRotationPhase();
            
        } catch (error) {
            console.error('胜利动画播放失败:', error);
            this.stopAnimation();
        }
    }

    /**
     * 收集所有卡牌数据
     */
    private collectCardData(foundationPiles: Array<{ cards: CardComponent[] }>): void {
        this.animationCards = [];
        
        foundationPiles.forEach((pile, foundationIndex) => {
            pile.cards.forEach((card, cardIndex) => {
                this.animationCards.push({
                    card,
                    originalPosition: { x: card.x, y: card.y },
                    originalRotation: card.rotation,
                    foundationIndex,
                    cardIndex
                });
            });
        });
    }

    /**
     * 阶段1：卡牌直接飞到圆环位置动画
     */
    private async playCardsDirectFlyToCirclePhase(): Promise<void> {
        this.currentPhase = VictoryAnimationPhase.CARDS_FLYING_TO_CIRCLE;
        console.log('🚀 开始卡牌直接飞到圆环位置阶段');

        const flyToCirclePromises: Promise<void>[] = [];
        const angleStep = (Math.PI * 2) / 52; // 52张卡牌均匀分布

        this.animationCards.forEach((cardData, index) => {
            const delay = index * this.config.CARD_FLY_OUT_DELAY;
            
            const promise = new Promise<void>((resolve) => {
                this.scene.time.delayedCall(delay, () => {
                    this.flyCardDirectlyToCircle(cardData, index, angleStep, resolve);
                });
            });
            
            flyToCirclePromises.push(promise);
        });

        // 等待所有卡牌飞到圆环位置完成
        await Promise.all(flyToCirclePromises);
        console.log('✅ 卡牌直接飞到圆环位置阶段完成');
    }

    /**
     * 单张卡牌直接飞到圆环位置并调整角度
     */
    private flyCardDirectlyToCircle(cardData: CardAnimationData, index: number, angleStep: number, onComplete: () => void): void {
        const { card } = cardData;
        
        // 计算圆环上的目标位置
        const angle = index * angleStep;
        const targetX = this.centerX + this.config.CIRCLE_RADIUS * Math.cos(angle);
        const targetY = this.centerY + this.config.CIRCLE_RADIUS * Math.sin(angle);
        const targetRotation = angle + Math.PI / 2; // 纵向指向圆心的放射状排列
        
        // 提升卡牌深度，确保在最前面
        card.setDepth(1000 + cardData.foundationIndex * 13 + cardData.cardIndex);
        
        // 直接飞行到圆环位置并同时调整角度
        this.scene.tweens.add({
            targets: card,
            x: targetX,
            y: targetY,
            rotation: targetRotation,
            duration: this.config.CARD_FLY_TO_CIRCLE_DURATION,
            ease: 'Power2',
            onComplete: () => {
                onComplete();
            }
        });
    }

    /**
     * 阶段2：持续旋转动画
     */
    private playRotationPhase(): void {
        this.currentPhase = VictoryAnimationPhase.ROTATING;
        console.log('🌀 开始持续旋转阶段');

        // 创建一个容器来统一旋转所有卡牌
        const rotationContainer = this.scene.add.container(this.centerX, this.centerY);
        rotationContainer.setDepth(999);

        // 将所有卡牌添加到旋转容器中，卡牌已经在正确的圆环位置
        this.animationCards.forEach((cardData, index) => {
            const angle = index * (Math.PI * 2) / 52;
            const relativeX = this.config.CIRCLE_RADIUS * Math.cos(angle);
            const relativeY = this.config.CIRCLE_RADIUS * Math.sin(angle);
            
            // 将卡牌从世界坐标转换为容器内的相对坐标
            cardData.card.setPosition(relativeX, relativeY);
            rotationContainer.add(cardData.card);
        });

        // 开始无限旋转
        this.rotationTween = this.scene.tweens.add({
            targets: rotationContainer,
            rotation: Math.PI * 2, // 360度
            duration: (360 / this.config.ROTATION_SPEED) * 1000, // 根据速度计算持续时间
            ease: 'Linear',
            repeat: -1, // 无限循环
            onUpdate: () => {
                // 可以在这里添加额外的效果，比如卡牌的微小摆动
            }
        });

        console.log('🎊 胜利动画完成，开始无限旋转');
    }

    /**
     * 停止动画
     */
    public stopAnimation(): void {
        if (!this.isAnimationActive) {
            return;
        }

        console.log('⏹️ 停止胜利动画');

        // 停止旋转动画
        if (this.rotationTween) {
            this.rotationTween.destroy();
            this.rotationTween = undefined;
        }

        // 停止所有相关的tweens
        this.scene.tweens.killTweensOf(this.animationCards.map(data => data.card));

        // 重置状态
        this.currentPhase = VictoryAnimationPhase.IDLE;
        this.isAnimationActive = false;
        this.animationCards = [];
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
        this.animationCards = [];
    }
}