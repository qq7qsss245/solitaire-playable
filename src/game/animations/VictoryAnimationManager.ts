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
    CIRCLE_ROTATION_DURATION: 2560,   // 圆环旋转一周的时间(ms) - 原来是 80ms * 32张卡牌 = 2560ms
    CARD_FLY_TO_CIRCLE_DURATION: 300, // 卡牌飞到圆环位置的时间(ms)
    CIRCLE_RADIUS: 480,               // 圆环半径(px)
    CIRCLE_CARD_COUNT: 24,            // 参与圆环旋转的卡牌数量 - 恢复原始配置
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
        console.log('[ROTATION_DEBUG] 🎯 updateScreenCenter 开始执行');
        console.log('[ROTATION_DEBUG] 📊 场景状态检查:');
        console.log(`[ROTATION_DEBUG]   场景存在: ${!!this.scene}`);
        console.log(`[ROTATION_DEBUG]   相机存在: ${!!this.scene?.cameras?.main}`);
        console.log(`[ROTATION_DEBUG]   相机宽度: ${this.scene?.cameras?.main?.width}`);
        console.log(`[ROTATION_DEBUG]   相机高度: ${this.scene?.cameras?.main?.height}`);
        
        this.centerX = this.scene.cameras.main.width / 2;
        this.centerY = this.scene.cameras.main.height / 2;
        
        // 可选：根据屏幕尺寸限制圆环半径的最大值（防止超出屏幕）
        // 如果需要严格按照配置使用半径，可以注释掉下面这行
        const minDimension = Math.min(this.scene.cameras.main.width, this.scene.cameras.main.height);
        const maxAllowedRadius = minDimension * 0.4; // 增加到40%，给更多空间
        if (this.config.CIRCLE_RADIUS > maxAllowedRadius) {
            console.warn(`[ROTATION_DEBUG] ⚠️ 圆环半径 ${this.config.CIRCLE_RADIUS} 超出屏幕限制，调整为 ${maxAllowedRadius}`);
            this.config.CIRCLE_RADIUS = maxAllowedRadius;
        }
        
        console.log(`[ROTATION_DEBUG] 📐 屏幕中心更新完成: (${this.centerX}, ${this.centerY}), 圆环半径: ${this.config.CIRCLE_RADIUS}`);
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
        console.log('[ROTATION_DEBUG] 🎯 startVictoryAnimation 被调用');
        console.log('[ROTATION_DEBUG] 📊 传入的foundationPiles数量:', foundationPiles?.length || 0);
        
        if (this.isAnimationActive) {
            console.warn('[ROTATION_DEBUG] ⚠️ 胜利动画已在播放中，跳过');
            return;
        }

        console.log('[ROTATION_DEBUG] ✅ 开始初始化胜利动画');
        this.isAnimationActive = true;
        this.updateScreenCenter();
        
        // 禁用所有卡牌的交互
        this.disableAllCardInteractions(foundationPiles);
        
        // 收集所有卡牌数据
        this.collectCardData(foundationPiles);
        
        console.log(`[ROTATION_DEBUG] 🎉 胜利动画初始化完成，共${this.animationCards.length}张卡牌`);
        console.log('[ROTATION_DEBUG] 📋 动画配置:', {
            CIRCLE_ROTATION_DURATION: this.config.CIRCLE_ROTATION_DURATION,
            CARD_FLY_TO_CIRCLE_DURATION: this.config.CARD_FLY_TO_CIRCLE_DURATION,
            CIRCLE_RADIUS: this.config.CIRCLE_RADIUS,
            CIRCLE_CARD_COUNT: this.config.CIRCLE_CARD_COUNT
        });
        
        try {
            // 新方案：卡牌飞到圆环顶部并开始独立旋转
            console.log('[ROTATION_DEBUG] 🚀 准备开始卡牌飞行和旋转阶段');
            console.log('[ROTATION_DEBUG] 🔍 DEBUG: 动画卡牌数量检查:', this.animationCards.length);
            
            if (this.animationCards.length === 0) {
                console.error('[ROTATION_DEBUG] ❌ 致命错误: 没有收集到任何动画卡牌！');
                console.error('[ROTATION_DEBUG] 🔍 DEBUG: foundationPiles详情:', foundationPiles);
                console.error('[ROTATION_DEBUG] 🔧 尝试启用备用简化动画...');
                
                // 备用方案：尝试直接从foundationPiles中找到任何可用的卡牌
                this.tryFallbackAnimation(foundationPiles);
                return;
            }
            
            await this.playCardsFlyToTopAndRotatePhase();
            console.log('[ROTATION_DEBUG] ✅ 卡牌飞行和旋转阶段完成');
            
        } catch (error) {
            console.error('[ROTATION_DEBUG] ❌ 胜利动画播放失败:', error);
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
        console.log('[ROTATION_DEBUG] 🎯 collectCardData 开始执行');
        
        // 强化数据验证
        if (!foundationPiles || !Array.isArray(foundationPiles)) {
            console.error('[ROTATION_DEBUG] ❌ foundationPiles 无效:', foundationPiles);
            this.animationCards = [];
            return;
        }
        
        console.log('[ROTATION_DEBUG] 📊 Foundation牌堆详情:');
        console.log(`[ROTATION_DEBUG] 📊 牌堆数量: ${foundationPiles.length}`);
        
        // 详细检查每个牌堆
        let totalValidCards = 0;
        foundationPiles.forEach((pile, index) => {
            console.log(`[ROTATION_DEBUG] 🔍 牌堆 ${index}:`);
            console.log(`[ROTATION_DEBUG]   - 牌堆对象存在: ${!!pile}`);
            console.log(`[ROTATION_DEBUG]   - cards数组存在: ${!!pile?.cards}`);
            console.log(`[ROTATION_DEBUG]   - cards数组长度: ${pile?.cards?.length || 0}`);
            
            if (pile && pile.cards && Array.isArray(pile.cards)) {
                pile.cards.forEach((card, cardIndex) => {
                    if (card && typeof card === 'object') {
                        console.log(`[ROTATION_DEBUG]     卡牌 ${cardIndex}: 存在=true, 可见=${card.visible}, 位置=(${card.x}, ${card.y})`);
                        totalValidCards++;
                    } else {
                        console.log(`[ROTATION_DEBUG]     卡牌 ${cardIndex}: 无效或不存在`);
                    }
                });
            }
        });
        
        console.log(`[ROTATION_DEBUG] 📊 总有效卡牌数: ${totalValidCards}`);
        
        this.animationCards = [];
        
        // 修复：使用配置中的圆环卡牌数量，确保延时计算正确
        const circleCardCount = Math.min(this.config.CIRCLE_CARD_COUNT, totalValidCards);
        console.log('[ROTATION_DEBUG] 📊 圆环卡牌数量计算:');
        console.log(`[ROTATION_DEBUG]   配置最大数量: ${this.config.CIRCLE_CARD_COUNT}`);
        console.log(`[ROTATION_DEBUG]   实际有效卡牌数: ${totalValidCards}`);
        console.log(`[ROTATION_DEBUG]   最终圆环数量: ${circleCardCount} (使用配置限制)`);
        
        if (circleCardCount === 0) {
            console.error('[ROTATION_DEBUG] ❌ 没有有效的卡牌可以参与动画');
            return;
        }
        
        // 从K开始（cardIndex = 12），按花色循环收集
        console.log('[ROTATION_DEBUG] 🔄 开始收集卡牌数据（从K到A）');
        
        try {
            for (let cardIndex = 12; cardIndex >= 0; cardIndex--) { // K=12, Q=11, J=10, ..., A=0
                for (let foundationIndex = 0; foundationIndex < foundationPiles.length; foundationIndex++) {
                    const pile = foundationPiles[foundationIndex];
                    
                    // 强化安全检查
                    if (!pile || !pile.cards || !Array.isArray(pile.cards)) {
                        console.log(`[ROTATION_DEBUG] ⚠️ 跳过无效牌堆: ${foundationIndex}`);
                        continue;
                    }
                    
                    if (cardIndex >= pile.cards.length) {
                        console.log(`[ROTATION_DEBUG] ⚠️ 卡牌索引超出范围: 牌堆${foundationIndex}, 索引${cardIndex}, 长度${pile.cards.length}`);
                        continue;
                    }
                    
                    const card = pile.cards[cardIndex];
                    
                    if (!card || typeof card !== 'object') {
                        console.log(`[ROTATION_DEBUG] ⚠️ 跳过无效卡牌: 牌堆${foundationIndex}, 卡牌索引${cardIndex}`);
                        continue;
                    }
                    
                    // 检查卡牌是否有必要的属性
                    if (typeof card.x !== 'number' || typeof card.y !== 'number') {
                        console.log(`[ROTATION_DEBUG] ⚠️ 卡牌位置无效: 牌堆${foundationIndex}, 卡牌${cardIndex}, x=${card.x}, y=${card.y}`);
                        continue;
                    }
                    
                    const globalIndex = this.animationCards.length;
                    console.log(`[ROTATION_DEBUG] 📋 处理有效卡牌: 牌堆${foundationIndex}, 卡牌${cardIndex}, 全局索引${globalIndex}`);
                    
                    // 修复：只有前circleCardCount张卡牌参与圆环动画
                    if (this.animationCards.length < circleCardCount) {
                        console.log(`[ROTATION_DEBUG] ✅ 卡牌加入圆环: 牌堆${foundationIndex}, 卡牌${cardIndex}, 圆环索引${this.animationCards.length}`);
                        this.animationCards.push({
                            card,
                            originalPosition: { x: card.x, y: card.y },
                            originalRotation: card.rotation || 0,
                            foundationIndex,
                            cardIndex
                        });
                    } else {
                        console.log(`[ROTATION_DEBUG] 💨 卡牌淡出: 牌堆${foundationIndex}, 卡牌${cardIndex} (超出圆环数量限制)`);
                        // 多余的卡牌执行淡出动画
                        this.scene.tweens.add({
                            targets: card,
                            alpha: 0,
                            duration: this.config.FADE_OUT_DURATION,
                            ease: 'Power2'
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[ROTATION_DEBUG] ❌ 收集卡牌数据时发生错误:', error);
            if (error instanceof Error) {
                console.error('[ROTATION_DEBUG] ❌ 错误堆栈:', error.stack);
            }
        }
        
        console.log(`[ROTATION_DEBUG] 🎴 卡牌收集完成: 参与圆环=${this.animationCards.length}张, 目标=${circleCardCount}张`);
        
        if (this.animationCards.length === 0) {
            console.error('[ROTATION_DEBUG] ❌ 致命错误: 没有收集到任何有效的动画卡牌！');
            console.error('[ROTATION_DEBUG] 🔍 请检查Foundation牌堆的数据结构和卡牌对象');
        } else {
            console.log('[ROTATION_DEBUG] 📋 最终动画卡牌列表:');
            this.animationCards.forEach((cardData, index) => {
                console.log(`[ROTATION_DEBUG]   ${index}: 牌堆${cardData.foundationIndex}, 卡牌${cardData.cardIndex}, 位置=(${cardData.originalPosition.x}, ${cardData.originalPosition.y})`);
            });
        }
    }

    /**
     * 新方案：卡牌飞到圆环顶部并开始独立旋转
     */
    private async playCardsFlyToTopAndRotatePhase(): Promise<void> {
        console.log('[ROTATION_DEBUG] 🎯 playCardsFlyToTopAndRotatePhase 开始执行');
        this.currentPhase = VictoryAnimationPhase.CARDS_FLYING_TO_CIRCLE;
        console.log('[ROTATION_DEBUG] 📍 当前阶段设置为: CARDS_FLYING_TO_CIRCLE');

        // 计算圆环顶部的固定位置（场景坐标系）
        const circleTopX = this.centerX;
        const circleTopY = this.centerY - this.config.CIRCLE_RADIUS;
        console.log('[ROTATION_DEBUG] 📐 圆环顶部位置:', { circleTopX, circleTopY });
        console.log('[ROTATION_DEBUG] 📐 屏幕中心:', { centerX: this.centerX, centerY: this.centerY });
        console.log('[ROTATION_DEBUG] 📐 圆环半径:', this.config.CIRCLE_RADIUS);

        // 修复：使用配置中的圆环卡牌数量进行延时计算
        const circleCardCount = this.config.CIRCLE_CARD_COUNT;
        // 旋转一周的时间直接使用配置值
        const rotationDuration = this.config.CIRCLE_ROTATION_DURATION;
        
        // 🔧 修正延迟时间计算，确保每张卡牌的延时间隔相同
        // 正确的延迟时间计算：总旋转时间除以圆环卡牌数量
        const cardFlyDelay = this.config.CIRCLE_ROTATION_DURATION / circleCardCount;
        
        // 每张卡牌之间的角度差
        const anglePerCard = (2 * Math.PI) / circleCardCount;
        
        // 数学验证
        const totalDelayTime = (this.animationCards.length - 1) * cardFlyDelay;
        const expectedAngleSpacing = (2 * Math.PI) / circleCardCount;
        
        console.log(`[ROTATION_DEBUG] 📊 关键动画参数:`);
        console.log(`[ROTATION_DEBUG]   - 实际参与卡牌数: ${this.animationCards.length}`);
        console.log(`[ROTATION_DEBUG]   - 圆环配置卡牌数: ${circleCardCount}`);
        console.log(`[ROTATION_DEBUG]   - 旋转一周时间: ${rotationDuration}ms`);
        console.log(`[ROTATION_DEBUG]   - 每卡牌角度间隔: ${(anglePerCard * 180 / Math.PI).toFixed(2)}°`);
        console.log(`[ROTATION_DEBUG]   - 卡牌飞入延时: ${cardFlyDelay.toFixed(2)}ms (固定间隔)`);
        console.log(`[ROTATION_DEBUG] 🔍 数学验证:`);
        console.log(`[ROTATION_DEBUG]   - 总延迟时间: ${totalDelayTime.toFixed(2)}ms`);
        console.log(`[ROTATION_DEBUG]   - 预期角度间隔: ${(expectedAngleSpacing * 180 / Math.PI).toFixed(2)}°`);

        const flyPromises: Promise<void>[] = [];

        // 修复：只处理实际收集到的动画卡牌
        console.log('[ROTATION_DEBUG] 🚀 开始处理动画卡牌参与圆环旋转');
        for (let i = 0; i < this.animationCards.length; i++) {
            const cardData = this.animationCards[i];
            const delay = i * cardFlyDelay;
            
            console.log(`[ROTATION_DEBUG] 📋 卡牌 ${i}: 延时=${delay.toFixed(2)}ms, 卡牌存在=${!!cardData?.card}, 卡牌可见=${cardData?.card?.visible}`);
            
            const promise = new Promise<void>((resolve) => {
                this.scene.time.delayedCall(delay, () => {
                    console.log(`[ROTATION_DEBUG] ⏰ 卡牌 ${i} 延时触发，开始飞行到顶部`);
                    // 所有卡牌：飞入圆环并开始旋转
                    this.flyCardToTopAndStartRotation(cardData, circleTopX, circleTopY, rotationDuration, resolve);
                });
            });
            
            flyPromises.push(promise);
        }

        console.log('[ROTATION_DEBUG] ⏳ 等待所有卡牌飞行Promise完成...');
        // 等待所有卡牌开始旋转
        await Promise.all(flyPromises);
        
        this.currentPhase = VictoryAnimationPhase.ROTATING;
        console.log('[ROTATION_DEBUG] 🎊 所有卡牌已开始独立旋转，形成完整圆环');
        console.log('[ROTATION_DEBUG] 📍 当前阶段设置为: ROTATING');
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
        
        console.log(`[ROTATION_DEBUG] 🎯 flyCardToTopAndStartRotation 开始执行`);
        console.log(`[ROTATION_DEBUG] 📋 卡牌信息:`, {
            cardExists: !!card,
            cardVisible: card?.visible,
            cardPosition: { x: card?.x, y: card?.y },
            cardRotation: card?.rotation,
            foundationIndex: cardData.foundationIndex,
            cardIndex: cardData.cardIndex
        });
        console.log(`[ROTATION_DEBUG] 📍 目标位置:`, { topX, topY });
        console.log(`[ROTATION_DEBUG] ⏱️ 旋转持续时间:`, rotationDuration);
        
        if (!card) {
            console.error('[ROTATION_DEBUG] ❌ 卡牌对象不存在，跳过动画');
            onComplete();
            return;
        }
        
        // 提升卡牌深度，确保在最前面
        const newDepth = 1000 + cardData.foundationIndex * 13 + cardData.cardIndex;
        card.setDepth(newDepth);
        console.log(`[ROTATION_DEBUG] 📏 设置卡牌深度: ${newDepth}`);
        
        // 飞到圆环顶部
        console.log(`[ROTATION_DEBUG] 🚀 开始飞行动画，持续时间: ${this.config.CARD_FLY_TO_CIRCLE_DURATION}ms`);
        this.scene.tweens.add({
            targets: card,
            x: topX,
            y: topY,
            rotation: 0, // 纵向指向圆心（顶部位置）
            duration: this.config.CARD_FLY_TO_CIRCLE_DURATION,
            ease: 'Power2',
            onStart: () => {
                console.log(`[ROTATION_DEBUG] ✅ 卡牌飞行动画开始`);
            },
            onComplete: () => {
                console.log(`[ROTATION_DEBUG] ✅ 卡牌飞行动画完成，到达位置: (${card.x}, ${card.y})`);
                
                // 🛠️ 修复：在飞行动画完成后立即启动旋转，确保时序同步
                console.log(`[ROTATION_DEBUG] 🔄 飞行完成，立即开始独立旋转动画`);
                this.startCardIndependentRotation(cardData, rotationDuration);
                
                onComplete();
            }
        });
    }

    /**
     * 开始卡牌的独立圆形轨迹旋转
     */
    private startCardIndependentRotation(cardData: CardAnimationData, rotationDuration: number): void {
        const { card } = cardData;
        
        console.log(`[ROTATION_DEBUG] 🎯 startCardIndependentRotation 开始执行`);
        console.log(`[ROTATION_DEBUG] 📋 参数检查:`, {
            cardExists: !!card,
            cardVisible: card?.visible,
            cardActive: card?.active,
            cardAlpha: card?.alpha,
            cardPosition: { x: card?.x, y: card?.y },
            rotationDuration,
            centerX: this.centerX,
            centerY: this.centerY,
            circleRadius: this.config.CIRCLE_RADIUS
        });
        
        if (!card) {
            console.error('[ROTATION_DEBUG] ❌ 卡牌对象不存在，无法开始旋转');
            return;
        }
        
        // 🛠️ 修复：增强可见性检查，确保卡牌处于正确状态
        if (!card.visible) {
            console.warn('[ROTATION_DEBUG] ⚠️ 卡牌不可见，尝试恢复可见性');
            console.log('[ROTATION_DEBUG] 🔍 卡牌状态详情:', {
                visible: card.visible,
                alpha: card.alpha,
                active: card.active,
                scaleX: card.scaleX,
                scaleY: card.scaleY
            });
            
            // 尝试恢复卡牌可见性
            card.setVisible(true);
            if (card.alpha < 1) {
                card.setAlpha(1);
            }
            
            console.log('[ROTATION_DEBUG] 🔧 已尝试恢复卡牌可见性，当前状态:', {
                visible: card.visible,
                alpha: card.alpha
            });
            
            // 再次检查，如果仍然不可见则跳过
            if (!card.visible) {
                console.error('[ROTATION_DEBUG] ❌ 无法恢复卡牌可见性，跳过旋转动画');
                return;
            }
        }
        
        if (rotationDuration <= 0) {
            console.error('[ROTATION_DEBUG] ❌ 旋转持续时间无效:', rotationDuration);
            return;
        }
        
        // 🛠️ 修复：确保卡牌处于活跃状态
        if (!card.active) {
            console.log('[ROTATION_DEBUG] 🔧 激活卡牌对象');
            card.setActive(true);
        }
        
        console.log(`[ROTATION_DEBUG] 🔄 创建连续旋转动画，持续时间: ${rotationDuration}ms`);
        
        // 🛠️ 修复方案：使用连续角度避免循环重置抖动
        // 计算一个足够大的角度值，避免使用 repeat: -1
        const totalRotations = 1000; // 连续旋转1000圈，足够长时间运行
        const totalAngle = Math.PI * 2 * totalRotations; // 总角度
        const totalDuration = rotationDuration * totalRotations; // 总持续时间
        
        console.log(`[ROTATION_DEBUG] 🔧 连续旋转参数:`, {
            totalRotations,
            totalAngle: `${totalAngle.toFixed(2)} 弧度`,
            totalDuration: `${totalDuration}ms`,
            singleRotationDuration: `${rotationDuration}ms`
        });
        
        // 创建独立的圆形轨迹旋转动画 - 使用连续角度
        cardData.rotationTween = this.scene.tweens.add({
            targets: {},
            angle: { from: 0, to: totalAngle }, // 连续旋转，不重置
            duration: totalDuration,
            ease: 'Linear',
            // 移除 repeat: -1，使用连续角度避免重置抖动
            onStart: () => {
                console.log(`[ROTATION_DEBUG] ✅ 连续旋转动画开始`);
            },
            onUpdate: (tween) => {
                const currentAngle = tween.getValue();
                // 计算当前在圆环上的位置（从顶部开始，即 -Math.PI/2）
                const angle = currentAngle - Math.PI / 2; // 从圆环顶部开始
                const x = this.centerX + this.config.CIRCLE_RADIUS * Math.cos(angle);
                const y = this.centerY + this.config.CIRCLE_RADIUS * Math.sin(angle);
                const rotation = angle + Math.PI / 2; // 纵向指向圆心
                
                card.setPosition(x, y);
                card.setRotation(rotation);
            },
            onComplete: () => {
                console.log(`[ROTATION_DEBUG] 🔄 连续旋转动画完成，重新启动`);
                // 如果动画完成（1000圈后），重新启动
                if (this.isAnimationActive && card.visible) {
                    this.startCardIndependentRotation(cardData, rotationDuration);
                }
            }
        });
        
        if (cardData.rotationTween) {
            console.log(`[ROTATION_DEBUG] ✅ 连续旋转动画创建成功`);
        } else {
            console.error(`[ROTATION_DEBUG] ❌ 连续旋转动画创建失败`);
        }
    }


    /**
     * 停止动画
     */
    public stopAnimation(): void {
        console.log('[ROTATION_DEBUG] 🎯 stopAnimation 被调用');
        console.log('[ROTATION_DEBUG] 📊 当前状态:', {
            isAnimationActive: this.isAnimationActive,
            currentPhase: this.currentPhase,
            animationCardsCount: this.animationCards.length
        });
        
        if (!this.isAnimationActive) {
            console.log('[ROTATION_DEBUG] ⚠️ 动画未激活，跳过停止操作');
            return;
        }

        console.log('[ROTATION_DEBUG] ⏹️ 开始停止胜利动画');

        // 停止所有卡牌的独立旋转动画
        console.log('[ROTATION_DEBUG] 🛑 停止所有卡牌的独立旋转动画');
        this.animationCards.forEach((cardData, index) => {
            if (cardData.rotationTween) {
                console.log(`[ROTATION_DEBUG] 🛑 停止卡牌 ${index} 的旋转动画`);
                cardData.rotationTween.destroy();
                cardData.rotationTween = undefined;
            }
        });

        // 停止旋转动画（如果存在）
        if (this.rotationTween) {
            console.log('[ROTATION_DEBUG] 🛑 停止主旋转动画');
            this.rotationTween.destroy();
            this.rotationTween = undefined;
        }

        // 停止所有相关的tweens
        console.log('[ROTATION_DEBUG] 🛑 停止所有相关的Tween动画');
        this.scene.tweens.killTweensOf(this.animationCards.map(data => data.card));

        // 清理事件监听器
        this.cleanupEventListeners();

        // 重置状态
        this.currentPhase = VictoryAnimationPhase.IDLE;
        this.isAnimationActive = false;
        this.animationCards = [];
        
        console.log('[ROTATION_DEBUG] ✅ 胜利动画停止完成');
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
     * 备用简化动画方案
     */
    private tryFallbackAnimation(foundationPiles: Array<{ cards: CardComponent[] }>): void {
        console.log('[ROTATION_DEBUG] 🔧 启动备用简化动画方案');
        
        // 尝试找到任何可用的卡牌进行简单的旋转动画
        const fallbackCards: CardComponent[] = [];
        
        try {
            foundationPiles.forEach((pile, pileIndex) => {
                if (pile && pile.cards && Array.isArray(pile.cards)) {
                    pile.cards.forEach((card, cardIndex) => {
                        if (card && typeof card === 'object' &&
                            typeof card.x === 'number' && typeof card.y === 'number' &&
                            card.visible !== false && fallbackCards.length < 10) {
                            fallbackCards.push(card);
                            console.log(`[ROTATION_DEBUG] 🔧 备用卡牌: 牌堆${pileIndex}, 卡牌${cardIndex}`);
                        }
                    });
                }
            });
            
            if (fallbackCards.length > 0) {
                console.log(`[ROTATION_DEBUG] 🔧 找到 ${fallbackCards.length} 张备用卡牌，开始简化动画`);
                
                // 简单的原地旋转动画
                fallbackCards.forEach((card, index) => {
                    const delay = index * 100;
                    
                    this.scene.time.delayedCall(delay, () => {
                        this.scene.tweens.add({
                            targets: card,
                            rotation: card.rotation + Math.PI * 2,
                            duration: 2000,
                            ease: 'Linear',
                            repeat: 2,
                            onStart: () => {
                                console.log(`[ROTATION_DEBUG] 🔧 备用卡牌 ${index} 开始旋转`);
                            },
                            onComplete: () => {
                                console.log(`[ROTATION_DEBUG] 🔧 备用卡牌 ${index} 旋转完成`);
                            }
                        });
                    });
                });
            } else {
                console.error('[ROTATION_DEBUG] ❌ 备用方案也无法找到有效卡牌');
            }
        } catch (error) {
            console.error('[ROTATION_DEBUG] ❌ 备用动画方案失败:', error);
        }
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