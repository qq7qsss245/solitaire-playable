import { Scene } from 'phaser';
import { Card as CardComponent } from '../components/Card';
import { AssetKeys } from '../../assets';
import { portraitLayout, landscapeLayout } from '../../config/klondike-layout';

/**
 * 圆环中心位置配置
 *
 * 🎯 **配置模式说明**：
 *
 * **1. center 模式（居中）**：
 * ```typescript
 * {
 *   mode: 'center',
 *   offsetX: 0,     // 可选：在屏幕中心基础上的X偏移
 *   offsetY: -50    // 可选：在屏幕中心基础上的Y偏移（向上偏移50px）
 * }
 * ```
 *
 * **2. relative 模式（相对比例）**：
 * ```typescript
 * {
 *   mode: 'relative',
 *   relativeX: 0.6,  // 屏幕宽度的60%位置
 *   relativeY: 0.4,  // 屏幕高度的40%位置
 *   offsetX: 20,     // 可选：额外偏移
 *   offsetY: 0
 * }
 * ```
 *
 * **3. absolute 模式（绝对坐标）**：
 * ```typescript
 * {
 *   mode: 'absolute',
 *   absoluteX: 400,  // 固定X坐标400px
 *   absoluteY: 300,  // 固定Y坐标300px
 *   offsetX: 0,      // 可选：额外偏移
 *   offsetY: 0
 * }
 * ```
 *
 * **4. 横竖屏不同配置示例**：
 * ```typescript
 * circleCenter: {
 *   portrait: {      // 竖屏：圆环稍微上移
 *     mode: 'center',
 *     offsetX: 0,
 *     offsetY: -80
 *   },
 *   landscape: {     // 横屏：圆环居中
 *     mode: 'center',
 *     offsetX: 0,
 *     offsetY: 0
 *   }
 * }
 * ```
 */
export interface CircleCenterConfig {
    /** 中心位置模式：'center' | 'relative' | 'absolute' */
    mode: 'center' | 'relative' | 'absolute';
    
    /** 相对模式：相对于屏幕尺寸的比例 (0.0-1.0) */
    relativeX?: number;
    relativeY?: number;
    
    /** 绝对模式：固定像素坐标 */
    absoluteX?: number;
    absoluteY?: number;
    
    /** 偏移量：在计算出的位置基础上的偏移 */
    offsetX?: number;
    offsetY?: number;
}

/**
 * 胜利动画配置
 */
export interface VictoryAnimationConfig {
    /** 圆环旋转一周的时间(ms) */
    CIRCLE_ROTATION_DURATION: number;
    /** 卡牌飞到圆环位置的时间(ms) */
    CARD_FLY_TO_CIRCLE_DURATION: number;
    /** 参与圆环旋转的卡牌数量 */
    CIRCLE_CARD_COUNT: number;
    /** 多余卡牌淡出时间(ms) */
    FADE_OUT_DURATION: number;
    /** 圆环半径配置(px) */
    circleRadius: {
        portrait: number;   // 竖屏半径
        landscape: number;  // 横屏半径
    };
    /** 圆环中心位置配置 */
    circleCenter: {
        portrait: CircleCenterConfig;   // 竖屏配置
        landscape: CircleCenterConfig;  // 横屏配置
    };
}

/**
 * 默认胜利动画配置
 *
 * 🎯 **延时圆环动画配置说明**：
 *
 * CIRCLE_ROTATION_DURATION: 单张卡牌旋转一周的时间
 * - 这是延时圆环的核心参数
 * - 决定了圆环旋转的速度
 * - 延时间隔 = CIRCLE_ROTATION_DURATION / (实际卡牌数 - 1)
 *
 * CIRCLE_CARD_COUNT: 参与圆环的最大卡牌数量
 * - 用于限制圆环卡牌数量，避免过于拥挤
 * - 实际参与数量 = min(CIRCLE_CARD_COUNT, 可用卡牌数)
 * - 多余卡牌会淡出处理
 *
 * 🧮 **延时计算示例**（24张卡牌）：
 * - 延时间隔 = 2560ms / (24-1) = 111.3ms
 * - 总延时时间 = 23 × 111.3ms = 2560ms
 * - 结果：最后一张卡牌开始旋转时，第一张卡牌正好完成一圈
 */
export const DEFAULT_VICTORY_CONFIG: VictoryAnimationConfig = {
    CIRCLE_ROTATION_DURATION: 2560,   // 圆环旋转一周的时间(ms) - 延时圆环的核心参数
    CARD_FLY_TO_CIRCLE_DURATION: 300, // 卡牌飞到圆环顶部的时间(ms)
    CIRCLE_CARD_COUNT: 24,            // 参与圆环旋转的最大卡牌数量
    FADE_OUT_DURATION: 100,           // 多余卡牌淡出时间(ms)
    
    // 圆环半径配置(px)
    circleRadius: {
        portrait: 480,    // 竖屏半径
        landscape: 400    // 横屏半径（稍小一些适应横屏布局）
    },
    
    // 圆环中心位置配置
    circleCenter: {
        // 竖屏配置：默认居中模式
        portrait: {
            mode: 'center',
            offsetX: 0,
            offsetY: 0
        },
        // 横屏配置：默认居中模式
        landscape: {
            mode: 'center',
            offsetX: -400,
            offsetY: 0
        }
    }
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
    private orientationChangeHandler?: () => void; // 保存orientationchange事件处理器的引用
    
    // 胜利动画中心元素
    private victoryIcon?: Phaser.GameObjects.Image;
    private solitaireText?: Phaser.GameObjects.Image;

    constructor(scene: Scene, config: VictoryAnimationConfig = DEFAULT_VICTORY_CONFIG) {
        this.scene = scene;
        this.config = config;
        this.updateScreenCenter();
        
        // 🔧 修复：初始化屏幕方向变化监听器
        this.setupOrientationListener();
        console.log('📱 VictoryAnimationManager: 屏幕方向监听器已初始化');
    }

    /**
     * 设置屏幕方向变化监听器
     */
    private setupOrientationListener(): void {
        // 监听Phaser场景的resize事件
        this.scene.scale.on('resize', this.handleScreenResize, this);
        
        // 也监听浏览器的orientationchange事件作为备用
        if (typeof window !== 'undefined') {
            // 保存事件处理器引用，以便后续清理
            this.orientationChangeHandler = () => {
                // 延迟一点执行，确保屏幕尺寸已经更新
                setTimeout(() => {
                    this.handleScreenResize();
                }, 100);
            };
            window.addEventListener('orientationchange', this.orientationChangeHandler);
        }
    }

    /**
     * 处理屏幕尺寸变化
     */
    private handleScreenResize(): void {
        console.log('📱 VictoryAnimationManager: 检测到屏幕尺寸变化');
        console.log(`📱 动画状态: ${this.isAnimationActive ? '激活' : '未激活'}`);
        console.log(`📱 动画卡牌数量: ${this.animationCards?.length || 0}`);
        
        if (!this.isAnimationActive) {
            console.log('📱 动画未激活，跳过位置更新');
            return; // 如果动画未激活，不需要处理
        }

        console.log('📱 开始更新圆环中心位置和卡牌位置');
        
        // 更新屏幕中心位置
        this.updateScreenCenter();
        
        // 如果有正在旋转的卡牌，更新它们的位置
        this.updateRotatingCardsPosition();
        
        // 更新胜利元素位置
        this.updateVictoryElementsPosition();
        
        console.log('📱 屏幕方向变化处理完成');
    }

    /**
     * 检测当前屏幕方向
     * @returns 'portrait' | 'landscape'
     */
    private detectScreenOrientation(): 'portrait' | 'landscape' {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        return width > height ? 'landscape' : 'portrait';
    }

    /**
     * 获取当前屏幕方向对应的圆环半径
     * @returns 当前方向的圆环半径
     */
    private getCurrentCircleRadius(): number {
        const orientation = this.detectScreenOrientation();
        return this.config.circleRadius[orientation];
    }

    /**
     * 根据配置计算圆环中心位置
     * @param config 圆环中心位置配置
     * @returns 计算后的中心坐标
     */
    private calculateCenterPosition(config: CircleCenterConfig): { x: number; y: number } {
        const screenWidth = this.scene.cameras.main.width;
        const screenHeight = this.scene.cameras.main.height;
        
        let centerX: number;
        let centerY: number;
        
        switch (config.mode) {
            case 'center':
                // 居中模式：屏幕中心
                centerX = screenWidth / 2;
                centerY = screenHeight / 2;
                break;
                
            case 'relative':
                // 相对模式：相对于屏幕尺寸的比例
                centerX = screenWidth * (config.relativeX ?? 0.5);
                centerY = screenHeight * (config.relativeY ?? 0.5);
                break;
                
            case 'absolute':
                // 绝对模式：固定像素坐标
                centerX = config.absoluteX ?? screenWidth / 2;
                centerY = config.absoluteY ?? screenHeight / 2;
                break;
                
            default:
                // 默认居中
                centerX = screenWidth / 2;
                centerY = screenHeight / 2;
                break;
        }
        
        // 应用偏移量
        centerX += config.offsetX ?? 0;
        centerY += config.offsetY ?? 0;
        
        return { x: centerX, y: centerY };
    }

    /**
     * 更新屏幕中心位置（配置化版本）
     */
    private updateScreenCenter(): void {
        console.log('[ROTATION_DEBUG] 🎯 updateScreenCenter 开始执行（配置化版本）');
        console.log('[ROTATION_DEBUG] 📊 场景状态检查:');
        console.log(`[ROTATION_DEBUG]   场景存在: ${!!this.scene}`);
        console.log(`[ROTATION_DEBUG]   相机存在: ${!!this.scene?.cameras?.main}`);
        console.log(`[ROTATION_DEBUG]   相机宽度: ${this.scene?.cameras?.main?.width}`);
        console.log(`[ROTATION_DEBUG]   相机高度: ${this.scene?.cameras?.main?.height}`);
        
        // 检测屏幕方向
        const orientation = this.detectScreenOrientation();
        console.log(`[ROTATION_DEBUG] 📱 检测到屏幕方向: ${orientation}`);
        
        // 获取对应方向的配置
        const centerConfig = this.config.circleCenter[orientation];
        console.log(`[ROTATION_DEBUG] 📋 使用配置:`, centerConfig);
        
        // 根据配置计算中心位置
        const centerPosition = this.calculateCenterPosition(centerConfig);
        this.centerX = centerPosition.x;
        this.centerY = centerPosition.y;
        
        console.log(`[ROTATION_DEBUG] 📐 配置化中心位置计算完成: (${this.centerX}, ${this.centerY})`);
        
        // 可选：根据屏幕尺寸限制圆环半径的最大值（防止超出屏幕）
        // 如果需要严格按照配置使用半径，可以注释掉下面这行
        const currentRadius = this.getCurrentCircleRadius();
        const minDimension = Math.min(this.scene.cameras.main.width, this.scene.cameras.main.height);
        const maxAllowedRadius = minDimension * 0.4; // 增加到40%，给更多空间
        if (currentRadius > maxAllowedRadius) {
            console.warn(`[ROTATION_DEBUG] ⚠️ 圆环半径 ${currentRadius} 超出屏幕限制，调整为 ${maxAllowedRadius}`);
            this.config.circleRadius[orientation] = maxAllowedRadius;
        }
        
        console.log(`[ROTATION_DEBUG] 📐 最终结果: 中心(${this.centerX}, ${this.centerY}), 圆环半径: ${this.getCurrentCircleRadius()}`);
    }

    /**
     * 更新正在旋转的卡牌位置
     */
    private updateRotatingCardsPosition(): void {
        console.log('🔄 updateRotatingCardsPosition: 开始更新延时圆环卡牌位置');
        console.log(`🔄 动画卡牌数量: ${this.animationCards?.length || 0}`);
        console.log(`🔄 新的圆环中心: (${this.centerX}, ${this.centerY})`);
        
        if (!this.animationCards || this.animationCards.length === 0) {
            console.log('🔄 没有动画卡牌，跳过位置更新');
            return;
        }

        const rotationDuration = this.config.CIRCLE_ROTATION_DURATION;
        const cardCount = this.animationCards.length;
        
        console.log(`🔄 延时圆环重构: ${cardCount} 张卡牌，旋转周期: ${rotationDuration}ms`);

        // 🎯 **关键修复：重构延时圆环**
        // 需要计算每张卡牌在延时圆环中的当前角度位置，然后重新分布
        this.animationCards.forEach((cardData, index) => {
            const card = cardData.card;
            
            if (!card || !card.visible) {
                console.log(`🔄 卡牌 ${index}: 无效或不可见，跳过`);
                return;
            }

            // 🧮 **计算延时圆环中的角度分布**
            // 在延时圆环中，每张卡牌都有固定的角度间隔
            const anglePerCard = (2 * Math.PI) / cardCount;
            const targetAngle = index * anglePerCard; // 卡牌在圆环中的目标角度位置
            
            // 🎯 **获取当前旋转动画的进度**
            let currentRotationProgress = 0;
            if (cardData.rotationTween && cardData.rotationTween.isPlaying()) {
                // 获取当前旋转动画的进度（0-1）
                currentRotationProgress = cardData.rotationTween.progress;
                console.log(`🔄 卡牌 ${index}: 当前旋转进度 ${(currentRotationProgress * 100).toFixed(1)}%`);
            }
            
            // 🧮 **计算当前应该在圆环上的角度**
            // 基于延时圆环的原理：每张卡牌从顶部开始旋转
            const currentAngle = targetAngle + (currentRotationProgress * 2 * Math.PI);
            
            // 🎯 **计算新圆环中心下的位置**
            const angle = currentAngle - Math.PI / 2; // 转换为标准坐标系（顶部为起点）
            const currentRadius = this.getCurrentCircleRadius();
            const newX = this.centerX + currentRadius * Math.cos(angle);
            const newY = this.centerY + currentRadius * Math.sin(angle);
            const newRotation = angle + Math.PI / 2 + Math.PI; // 🎯 **修改：+π让卡牌上方朝向圆心**
            
            console.log(`🔄 卡牌 ${index}: 目标角度=${(targetAngle * 180 / Math.PI).toFixed(1)}°, 当前角度=${(currentAngle * 180 / Math.PI).toFixed(1)}°`);
            console.log(`🔄 卡牌 ${index}: 从 (${card.x.toFixed(1)}, ${card.y.toFixed(1)}) 移动到 (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
            
            // 🛑 **停止当前的旋转动画**
            if (cardData.rotationTween) {
                cardData.rotationTween.destroy();
                cardData.rotationTween = undefined;
            }
            this.scene.tweens.killTweensOf(card);
            
            // 🎯 **立即设置到新的位置和角度**
            card.setPosition(newX, newY);
            card.setRotation(newRotation);
            
            // 🔄 **重新开始独立旋转动画，保持延时圆环效果**
            // 计算剩余的旋转角度，确保动画的连续性
            const remainingAngle = (1 - currentRotationProgress) * 2 * Math.PI;
            const remainingDuration = rotationDuration * (1 - currentRotationProgress);
            
            console.log(`🔄 卡牌 ${index}: 重新开始旋转，剩余角度=${(remainingAngle * 180 / Math.PI).toFixed(1)}°, 剩余时间=${remainingDuration.toFixed(0)}ms`);
            
            // 🎯 **创建新的连续旋转动画**
            this.startCardContinuousRotation(cardData, currentAngle, rotationDuration);
        });
        
        console.log('🔄 updateRotatingCardsPosition: 延时圆环重构完成');
    }

    /**
     * 🎯 **延时圆环均匀分布调整（基于数学原理的角度偏移版本）**
     *
     * 基于延时圆环的数学原理：最后一张卡飞入结束时，第一张卡刚好转动到原点
     * 此时所有卡牌都处于理想的均匀分布状态，只需要调整每张卡牌的转动角度偏移
     * 不重置位置，仅调整角度偏移量
     */
    private async adjustCircleUniformDistribution(): Promise<void> {
        console.log('[UNIFORM_DEBUG] 🎯 开始基于数学原理的圆环角度偏移调整');
        console.log(`[UNIFORM_DEBUG] 📊 待调整卡牌数量: ${this.animationCards.length}`);
        
        if (!this.animationCards || this.animationCards.length === 0) {
            console.log('[UNIFORM_DEBUG] ⚠️ 没有卡牌需要调整，跳过');
            return;
        }

        const cardCount = this.animationCards.length;
        
        // 🧮 **延时圆环数学原理分析**
        // 根据延时圆环的设计：
        // - 延时间隔 = rotationDuration / (cardCount - 1)
        // - 最后一张卡开始旋转时，第一张卡刚好完成一圈回到原点
        // - 此时所有卡牌都处于理想的均匀分布状态
        const idealAngleStep = (2 * Math.PI) / cardCount;
        console.log(`[UNIFORM_DEBUG] 📐 理想角度间隔: ${(idealAngleStep * 180 / Math.PI).toFixed(1)}°`);
        console.log(`[UNIFORM_DEBUG] 🧮 数学原理: 最后一张卡飞入时，圆环已达到理想均匀分布状态`);
        
        // 🎯 **仅调整每张卡牌的角度偏移，不改变位置**
        this.animationCards.forEach((cardData, index) => {
            const card = cardData.card;
            
            if (!card || !card.visible || !cardData.rotationTween) {
                console.log(`[UNIFORM_DEBUG] ⚠️ 卡牌 ${index} 无效、不可见或无旋转动画，跳过调整`);
                return;
            }
            
            // 🧮 **计算理想的角度偏移**
            // 每张卡牌应该在圆环中的理想角度位置
            const idealAngleOffset = index * idealAngleStep;
            
            // 🎯 **获取当前旋转动画的角度**
            const currentTweenAngle = cardData.rotationTween.getValue();
            
            // 🧮 **计算需要的角度调整**
            // 基于延时圆环原理，调整到理想的角度偏移
            const currentBaseAngle = currentTweenAngle % (2 * Math.PI);
            const targetAngleOffset = idealAngleOffset - currentBaseAngle;
            
            console.log(`[UNIFORM_DEBUG] 🔧 卡牌 ${index} 角度偏移调整:`);
            console.log(`[UNIFORM_DEBUG]   - 当前基础角度: ${(currentBaseAngle * 180 / Math.PI).toFixed(1)}°`);
            console.log(`[UNIFORM_DEBUG]   - 理想角度偏移: ${(idealAngleOffset * 180 / Math.PI).toFixed(1)}°`);
            console.log(`[UNIFORM_DEBUG]   - 需要调整: ${(targetAngleOffset * 180 / Math.PI).toFixed(1)}°`);
            
            // 🎯 **直接调整旋转动画的角度偏移**
            // 不停止动画，不重置位置，只是微调角度偏移
            if (Math.abs(targetAngleOffset) > 0.01) { // 只有需要调整时才执行
                // 🛑 **停止当前动画**
                cardData.rotationTween.destroy();
                cardData.rotationTween = undefined;
                
                // 🔄 **从调整后的角度继续旋转**
                const adjustedStartAngle = currentTweenAngle + targetAngleOffset;
                console.log(`[UNIFORM_DEBUG] 🔄 卡牌 ${index} 从调整后角度继续旋转: ${(adjustedStartAngle * 180 / Math.PI).toFixed(1)}°`);
                
                this.startCardContinuousRotation(cardData, adjustedStartAngle, this.config.CIRCLE_ROTATION_DURATION);
            } else {
                console.log(`[UNIFORM_DEBUG] ✅ 卡牌 ${index} 已处于理想位置，无需调整`);
            }
        });
        
        console.log('[UNIFORM_DEBUG] 🎊 基于数学原理的圆环角度偏移调整完成！');
        console.log('[UNIFORM_DEBUG] 📊 调整结果: 所有卡牌角度偏移已调整到理想状态');
    }

    /**
     * 🎯 **延时圆环重构专用：开始卡牌的连续旋转动画**
     *
     * 用于横竖屏切换时重新构建延时圆环，保持动画的连续性
     *
     * @param cardData 卡牌动画数据
     * @param startAngle 起始角度（当前角度位置）
     * @param rotationDuration 单圈旋转持续时间
     */
    private startCardContinuousRotation(cardData: CardAnimationData, startAngle: number, rotationDuration: number): void {
        const { card } = cardData;
        
        console.log(`🔄 startCardContinuousRotation: 开始连续旋转`);
        console.log(`🔄 起始角度: ${(startAngle * 180 / Math.PI).toFixed(1)}°`);
        console.log(`🔄 旋转周期: ${rotationDuration}ms`);
        
        if (!card || !card.visible) {
            console.error('🔄 卡牌无效或不可见，无法开始连续旋转');
            return;
        }
        
        // 🎯 **创建从当前角度开始的连续旋转动画**
        const totalRotations = 1000; // 连续旋转1000圈
        const totalAngle = startAngle + (Math.PI * 2 * totalRotations); // 从当前角度开始
        const totalDuration = rotationDuration * totalRotations;
        
        console.log(`🔄 连续旋转参数: 总角度=${(totalAngle * 180 / Math.PI).toFixed(1)}°, 总时长=${totalDuration}ms`);
        
        // 🎯 **创建新的旋转动画**
        cardData.rotationTween = this.scene.tweens.add({
            targets: {},
            angle: { from: startAngle, to: totalAngle },
            duration: totalDuration,
            ease: 'Linear',
            onStart: () => {
                console.log(`🔄 连续旋转动画启动，从角度 ${(startAngle * 180 / Math.PI).toFixed(1)}° 开始`);
            },
            onUpdate: (tween) => {
                const currentAngle = tween.getValue();
                
                // 🧮 **实时位置计算**
                const angle = currentAngle - Math.PI / 2; // 转换为标准坐标系
                const currentRadius = this.getCurrentCircleRadius();
                const x = this.centerX + currentRadius * Math.cos(angle);
                const y = this.centerY + currentRadius * Math.sin(angle);
                const rotation = angle + Math.PI / 2 + Math.PI; // 🎯 **修改：+π让卡牌上方朝向圆心**
                
                card.setPosition(x, y);
                card.setRotation(rotation);
            },
            onComplete: () => {
                console.log(`🔄 连续旋转动画完成，重新启动以保持圆环`);
                // 如果动画完成，重新启动以保持圆环效果
                if (this.isAnimationActive && card.visible) {
                    this.startCardIndependentRotation(cardData, rotationDuration);
                }
            }
        });
        
        if (cardData.rotationTween) {
            console.log(`🔄 连续旋转动画创建成功`);
        } else {
            console.error(`🔄 连续旋转动画创建失败`);
        }
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
            CIRCLE_RADIUS: this.getCurrentCircleRadius(),
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
            
            // 🎯 所有卡牌飞入圆环后，创建并显示胜利动画中心元素
            console.log('[ROTATION_DEBUG] 🎨 所有卡牌已飞入圆环，开始显示胜利元素');
            this.createVictoryElements();
            
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
        
        // 🚨 **修复卡牌收集逻辑的系统性偏差** 🚨
        console.log('[ALGORITHM_DEBUG] 🔄 开始修复后的卡牌收集逻辑');
        
        // 🔍 **分析旧收集逻辑的问题**
        console.log('[ALGORITHM_DEBUG] ⚠️ 旧收集逻辑问题分析:');
        console.log('[ALGORITHM_DEBUG]   - 外层循环: 卡牌值 (K→A)');
        console.log('[ALGORITHM_DEBUG]   - 内层循环: 花色 (♠→♥→♦→♣)');
        console.log('[ALGORITHM_DEBUG]   - 结果: 相同卡牌值聚集，花色分布不均');
        console.log('[ALGORITHM_DEBUG]   - 示例: 索引0-3全是K牌，索引4-7全是Q牌');
        
        // 🔧 **新的均匀分布收集策略**
        // 策略1: 交替花色收集，确保花色均匀分布
        // 策略2: 限制每个花色的连续卡牌数量
        
        const allValidCards: Array<{
            card: CardComponent;
            foundationIndex: number;
            cardIndex: number;
            suit: number; // 花色索引
            value: number; // 卡牌值
            position: { x: number; y: number };
        }> = [];
        
        // 首先收集所有有效卡牌并标记花色信息
        try {
            for (let cardIndex = 12; cardIndex >= 0; cardIndex--) { // K=12 到 A=0
                for (let foundationIndex = 0; foundationIndex < foundationPiles.length; foundationIndex++) {
                    const pile = foundationPiles[foundationIndex];
                    
                    if (!pile || !pile.cards || !Array.isArray(pile.cards)) {
                        console.log(`[ALGORITHM_DEBUG] ⚠️ 跳过无效牌堆: ${foundationIndex}`);
                        continue;
                    }
                    
                    if (cardIndex >= pile.cards.length) {
                        console.log(`[ALGORITHM_DEBUG] ⚠️ 卡牌索引超出范围: 牌堆${foundationIndex}, 索引${cardIndex}, 长度${pile.cards.length}`);
                        continue;
                    }
                    
                    const card = pile.cards[cardIndex];
                    
                    if (!card || typeof card !== 'object') {
                        console.log(`[ALGORITHM_DEBUG] ⚠️ 跳过无效卡牌: 牌堆${foundationIndex}, 卡牌索引${cardIndex}`);
                        continue;
                    }
                    
                    if (typeof card.x !== 'number' || typeof card.y !== 'number') {
                        console.log(`[ALGORITHM_DEBUG] ⚠️ 卡牌位置无效: 牌堆${foundationIndex}, 卡牌${cardIndex}, x=${card.x}, y=${card.y}`);
                        continue;
                    }
                    
                    // 收集有效卡牌信息
                    allValidCards.push({
                        card,
                        foundationIndex,
                        cardIndex,
                        suit: foundationIndex, // 花色索引 (0=♠, 1=♥, 2=♦, 3=♣)
                        value: cardIndex, // 卡牌值 (0=A, 1=2, ..., 12=K)
                        position: { x: card.x, y: card.y }
                    });
                }
            }
            
            console.log(`[ALGORITHM_DEBUG] 📊 收集到 ${allValidCards.length} 张有效卡牌`);
            
            // 🔧 **新的均匀分布算法**
            // 使用交替花色策略，确保圆环上花色分布均匀
            const redistributedCards: typeof allValidCards = [];
            const suitGroups = [[], [], [], []] as Array<typeof allValidCards>;
            
            // 按花色分组
            allValidCards.forEach(cardInfo => {
                suitGroups[cardInfo.suit].push(cardInfo);
            });
            
            console.log('[ALGORITHM_DEBUG] 📊 花色分组统计:');
            suitGroups.forEach((group, suitIndex) => {
                const suitNames = ['♠', '♥', '♦', '♣'];
                console.log(`[ALGORITHM_DEBUG]   ${suitNames[suitIndex]}: ${group.length}张`);
            });
            
            // 交替选择花色，确保均匀分布
            const maxCardsPerSuit = Math.ceil(circleCardCount / 4);
            let currentSuit = 0;
            const suitCounters = [0, 0, 0, 0];
            
            console.log(`[ALGORITHM_DEBUG] 🔧 开始均匀分布重排，每花色最多${maxCardsPerSuit}张`);
            
            for (let i = 0; i < circleCardCount && redistributedCards.length < circleCardCount; i++) {
                let attempts = 0;
                let cardAdded = false;
                
                // 尝试从当前花色添加卡牌
                while (attempts < 4 && !cardAdded) {
                    const suitIndex = (currentSuit + attempts) % 4;
                    const suitGroup = suitGroups[suitIndex];
                    
                    if (suitCounters[suitIndex] < maxCardsPerSuit &&
                        suitCounters[suitIndex] < suitGroup.length) {
                        
                        const cardInfo = suitGroup[suitCounters[suitIndex]];
                        redistributedCards.push(cardInfo);
                        suitCounters[suitIndex]++;
                        cardAdded = true;
                        
                        const suitNames = ['♠', '♥', '♦', '♣'];
                        console.log(`[ALGORITHM_DEBUG] ✅ 添加卡牌 ${redistributedCards.length-1}: ${suitNames[suitIndex]} 值${cardInfo.value}`);
                    }
                    attempts++;
                }
                
                if (!cardAdded) {
                    console.warn(`[ALGORITHM_DEBUG] ⚠️ 无法为位置 ${i} 找到合适的卡牌`);
                    break;
                }
                
                currentSuit = (currentSuit + 1) % 4; // 轮换到下一个花色
            }
            
            // 将重排后的卡牌添加到动画列表
            redistributedCards.forEach((cardInfo, index) => {
                if (index < circleCardCount) {
                    this.animationCards.push({
                        card: cardInfo.card,
                        originalPosition: cardInfo.position,
                        originalRotation: cardInfo.card.rotation || 0,
                        foundationIndex: cardInfo.foundationIndex,
                        cardIndex: cardInfo.cardIndex
                    });
                }
            });
            
            // 淡出多余的卡牌
            allValidCards.forEach(cardInfo => {
                if (!redistributedCards.includes(cardInfo)) {
                    console.log(`[ALGORITHM_DEBUG] 💨 淡出多余卡牌: 花色${cardInfo.suit}, 值${cardInfo.value}`);
                    this.scene.tweens.add({
                        targets: cardInfo.card,
                        alpha: 0,
                        duration: this.config.FADE_OUT_DURATION,
                        ease: 'Power2'
                    });
                }
            });
            
        } catch (error) {
            console.error('[ALGORITHM_DEBUG] ❌ 收集卡牌数据时发生错误:', error);
            if (error instanceof Error) {
                console.error('[ALGORITHM_DEBUG] ❌ 错误堆栈:', error.stack);
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
     * 🎯 **延时圆环动画核心方法**
     *
     * 延时圆环是一种视觉效果，通过时间差让卡牌依次开始旋转，形成圆环状的动画。
     *
     * 🔄 **延时圆环设计原理**：
     * 1. 所有卡牌都飞到圆环顶部（初始旋转角度为0）
     * 2. 每张卡牌按照固定延时间隔开始旋转
     * 3. 延时间隔 = 圆环旋转一周时间 / (参与卡牌数量 - 1)  ⚠️ 注意减1
     * 4. 当最后一张卡牌开始旋转时，第一张卡牌正好转完一圈回到顶部
     * 5. 形成完美的延时圆环效果，视觉上看起来像一个连续的圆环
     *
     * 🧮 **数学原理**：
     * - 第i张卡牌的延时 = i × (rotationDuration / (cardCount - 1))
     * - 总延时时间 = (cardCount - 1) × 延时间隔 = rotationDuration
     * - 确保时序完美同步，形成稳定的圆环效果
     *
     * 🎨 **视觉效果**：
     * - 卡牌依次"点亮"并开始旋转
     * - 形成从静止到旋转的渐进效果
     * - 最终所有卡牌同步旋转，保持圆环形状
     */
    private async playCardsFlyToTopAndRotatePhase(): Promise<void> {
        console.log('[DELAY_RING_DEBUG] 🎯 延时圆环动画开始执行');
        this.currentPhase = VictoryAnimationPhase.CARDS_FLYING_TO_CIRCLE;
        console.log('[DELAY_RING_DEBUG] 📍 当前阶段设置为: CARDS_FLYING_TO_CIRCLE');

        // 🎯 **步骤1：计算圆环顶部的固定位置**
        // 所有卡牌都要先飞到这个位置
        const circleTopX = this.centerX;
        const currentRadius = this.getCurrentCircleRadius();
        const circleTopY = this.centerY - currentRadius;
        console.log('[DELAY_RING_DEBUG] 📐 圆环顶部位置:', { circleTopX, circleTopY });
        console.log('[DELAY_RING_DEBUG] 📐 屏幕中心:', { centerX: this.centerX, centerY: this.centerY });
        console.log('[DELAY_RING_DEBUG] 📐 圆环半径:', currentRadius);

        // 🎯 **步骤2：延时计算的数学分析**
        const actualCardCount = this.animationCards.length;
        const rotationDuration = this.config.CIRCLE_ROTATION_DURATION;
        
        console.log(`[DELAY_RING_DEBUG] 🧮 延时圆环数学分析:`);
        console.log(`[DELAY_RING_DEBUG]   - 参与卡牌数量: ${actualCardCount}`);
        console.log(`[DELAY_RING_DEBUG]   - 圆环旋转一周时间: ${rotationDuration}ms`);
        console.log(`[DELAY_RING_DEBUG]   - 延时圆环原理: 所有卡牌飞到顶部，然后按延时开始旋转`);
        
        // 🔧 **关键修复：正确的延时计算公式**
        //
        // 🚨 **数学错误分析**：
        // 错误公式：延时间隔 = rotationDuration / actualCardCount
        // 问题：最后一张卡牌开始旋转时，第一张卡牌还没完成一圈
        //
        // 🎯 **正确公式**：延时间隔 = rotationDuration / (actualCardCount - 1)
        // 原理：总延时时间 = (actualCardCount - 1) × 延时间隔 = rotationDuration
        // 结果：当最后一张卡牌开始旋转时，第一张卡牌正好完成一圈回到顶部
        
        if (actualCardCount <= 1) {
            console.error('[DELAY_RING_DEBUG] ❌ 卡牌数量不足，无法形成延时圆环');
            return;
        }
        
        const cardStartRotationDelay = rotationDuration / (actualCardCount - 1);
        
        console.log(`[DELAY_RING_DEBUG] 🔧 延时计算结果（修复后）:`);
        console.log(`[DELAY_RING_DEBUG]   - 每张卡牌延时间隔: ${cardStartRotationDelay.toFixed(2)}ms`);
        console.log(`[DELAY_RING_DEBUG]   - 总延时时间: ${((actualCardCount - 1) * cardStartRotationDelay).toFixed(2)}ms`);
        console.log(`[DELAY_RING_DEBUG]   - 验证：总延时时间 = 旋转一周时间? ${((actualCardCount - 1) * cardStartRotationDelay) === rotationDuration ? '✅' : '❌'}`);
        
        // 🧮 **数学验证**
        const totalDelayTime = (actualCardCount - 1) * cardStartRotationDelay;
        const timeDifference = Math.abs(totalDelayTime - rotationDuration);
        console.log(`[DELAY_RING_DEBUG] 🧮 数学验证:`);
        console.log(`[DELAY_RING_DEBUG]   - 期望总延时: ${rotationDuration}ms`);
        console.log(`[DELAY_RING_DEBUG]   - 实际总延时: ${totalDelayTime.toFixed(2)}ms`);
        console.log(`[DELAY_RING_DEBUG]   - 时间差: ${timeDifference.toFixed(2)}ms`);
        console.log(`[DELAY_RING_DEBUG]   - 精度验证: ${timeDifference < 0.01 ? '✅ 完美同步' : '⚠️ 存在误差'}`);

        const flyPromises: Promise<void>[] = [];

        // 🎯 **步骤3：所有卡牌飞到顶部，然后按延时开始旋转**
        console.log('[DELAY_RING_DEBUG] 🚀 开始延时圆环动画序列');
        
        for (let i = 0; i < this.animationCards.length; i++) {
            const cardData = this.animationCards[i];
            const rotationStartDelay = i * cardStartRotationDelay;
            
            console.log(`[DELAY_RING_DEBUG] 📋 卡牌 ${i} 延时圆环参数:`);
            console.log(`[DELAY_RING_DEBUG]   - 旋转开始延时: ${rotationStartDelay.toFixed(2)}ms`);
            console.log(`[DELAY_RING_DEBUG]   - 卡牌存在: ${!!cardData?.card}`);
            console.log(`[DELAY_RING_DEBUG]   - 卡牌可见: ${cardData?.card?.visible}`);
            
            const promise = new Promise<void>((resolve) => {
                this.scene.time.delayedCall(rotationStartDelay, () => {
                    console.log(`[DELAY_RING_DEBUG] ⏰ 卡牌 ${i} 延时触发，开始飞到顶部并旋转`);
                    
                    // 🎯 **核心逻辑：飞到圆环顶部，然后开始旋转**
                    this.flyCardToTopAndStartRotation(
                        cardData,
                        circleTopX,
                        circleTopY,
                        rotationDuration,
                        resolve
                    );
                });
            });
            
            flyPromises.push(promise);
        }

        console.log('[DELAY_RING_DEBUG] ⏳ 等待所有卡牌完成延时圆环动画...');
        // 等待所有卡牌开始旋转
        await Promise.all(flyPromises);
        
        console.log('[DELAY_RING_DEBUG] 🎊 延时圆环动画完成，所有卡牌已开始独立旋转');
        
        // 🎯 **关键优化：延时完成后的圆环均匀分布调整**
        // 由于延时机制的不稳定性，需要重新调整卡牌的相对位置，确保圆环均匀分布
        console.log('[DELAY_RING_DEBUG] 🔧 开始执行圆环均匀分布调整...');
        await this.adjustCircleUniformDistribution();
        
        this.currentPhase = VictoryAnimationPhase.ROTATING;
        console.log('[DELAY_RING_DEBUG] 📍 当前阶段设置为: ROTATING');
    }


    /**
     * 🎯 **延时圆环核心方法：单张卡牌飞到圆环顶部并开始独立旋转**
     *
     * 这是延时圆环动画的核心实现：
     * 1. 卡牌飞到圆环顶部（初始旋转角度为0）
     * 2. 到达后立即开始从顶部位置的圆形轨迹旋转
     * 3. 通过延时调用此方法，形成延时圆环效果
     */
    private flyCardToTopAndStartRotation(
        cardData: CardAnimationData,
        topX: number,
        topY: number,
        rotationDuration: number,
        onComplete: () => void
    ): void {
        const { card } = cardData;
        
        console.log(`[DELAY_RING_DEBUG] 🎯 flyCardToTopAndStartRotation 开始执行`);
        console.log(`[DELAY_RING_DEBUG] 📋 卡牌信息:`, {
            cardExists: !!card,
            cardVisible: card?.visible,
            cardPosition: { x: card?.x, y: card?.y },
            cardRotation: card?.rotation,
            foundationIndex: cardData.foundationIndex,
            cardIndex: cardData.cardIndex
        });
        console.log(`[DELAY_RING_DEBUG] 📍 圆环顶部位置:`, { topX, topY });
        console.log(`[DELAY_RING_DEBUG] ⏱️ 旋转持续时间:`, rotationDuration);
        
        if (!card) {
            console.error('[DELAY_RING_DEBUG] ❌ 卡牌对象不存在，跳过动画');
            onComplete();
            return;
        }
        
        // 提升卡牌深度，确保在最前面
        const newDepth = 1000 + cardData.foundationIndex * 13 + cardData.cardIndex;
        card.setDepth(newDepth);
        console.log(`[DELAY_RING_DEBUG] 📏 设置卡牌深度: ${newDepth}`);
        
        // 🎯 **步骤1：飞到圆环顶部**
        console.log(`[DELAY_RING_DEBUG] 🚀 开始飞行到圆环顶部，持续时间: ${this.config.CARD_FLY_TO_CIRCLE_DURATION}ms`);
        this.scene.tweens.add({
            targets: card,
            x: topX,
            y: topY,
            rotation: Math.PI, // 🎯 **修改：旋转180度，让卡牌上方朝向圆环中心**
            duration: this.config.CARD_FLY_TO_CIRCLE_DURATION,
            // 🔧 **修复圆环分布不均匀问题**：使用linear缓动确保所有卡牌以相同速度飞行
            // 这样可以保证卡牌到达圆环顶部的时间间隔完全一致，避免因缓动函数导致的时序偏差
            ease: Phaser.Math.Easing.Linear,
            onStart: () => {
                console.log(`[DELAY_RING_DEBUG] ✅ 卡牌飞行动画开始`);
            },
            onComplete: () => {
                console.log(`[DELAY_RING_DEBUG] ✅ 卡牌飞行到顶部完成，位置: (${card.x}, ${card.y})`);
                
                // 🎯 **步骤2：立即开始从顶部的圆形轨迹旋转**
                console.log(`[DELAY_RING_DEBUG] 🔄 飞行完成，立即开始从顶部的圆形轨迹旋转`);
                this.startCardIndependentRotation(cardData, rotationDuration);
                
                onComplete();
            }
        });
    }


    /**
     * 🎯 **延时圆环核心方法：开始卡牌的独立圆形轨迹旋转**
     *
     * 🔄 **延时圆环旋转原理**：
     * 1. 所有卡牌都从圆环顶部开始旋转（角度0）
     * 2. 每张卡牌独立进行圆形轨迹旋转
     * 3. 通过延时调用此方法，形成视觉上的圆环效果
     * 4. 旋转速度恒定，确保圆环形状稳定
     *
     * 🧮 **数学原理**：
     * - 起始角度：0（圆环顶部，-π/2 in standard coordinate）
     * - 角度计算：currentAngle - π/2（转换为标准坐标系）
     * - 位置计算：(centerX + radius*cos(angle), centerY + radius*sin(angle))
     * - 卡牌朝向：angle + π/2（纵向指向圆心）
     */
    private startCardIndependentRotation(cardData: CardAnimationData, rotationDuration: number): void {
        const { card } = cardData;
        
        console.log(`[DELAY_RING_DEBUG] 🎯 startCardIndependentRotation 开始执行`);
        console.log(`[DELAY_RING_DEBUG] 📋 参数检查:`, {
            cardExists: !!card,
            cardVisible: card?.visible,
            cardActive: card?.active,
            cardAlpha: card?.alpha,
            cardPosition: { x: card?.x, y: card?.y },
            rotationDuration,
            centerX: this.centerX,
            centerY: this.centerY,
            circleRadius: this.getCurrentCircleRadius()
        });
        
        if (!card) {
            console.error('[DELAY_RING_DEBUG] ❌ 卡牌对象不存在，无法开始旋转');
            return;
        }
        
        // 🛠️ 确保卡牌处于正确状态
        if (!card.visible) {
            console.warn('[DELAY_RING_DEBUG] ⚠️ 卡牌不可见，尝试恢复可见性');
            card.setVisible(true);
            if (card.alpha < 1) {
                card.setAlpha(1);
            }
            
            if (!card.visible) {
                console.error('[DELAY_RING_DEBUG] ❌ 无法恢复卡牌可见性，跳过旋转动画');
                return;
            }
        }
        
        if (rotationDuration <= 0) {
            console.error('[DELAY_RING_DEBUG] ❌ 旋转持续时间无效:', rotationDuration);
            return;
        }
        
        if (!card.active) {
            console.log('[DELAY_RING_DEBUG] 🔧 激活卡牌对象');
            card.setActive(true);
        }
        
        console.log(`[DELAY_RING_DEBUG] 🔄 创建从顶部开始的连续圆形轨迹旋转，持续时间: ${rotationDuration}ms`);
        
        // 🎯 **延时圆环旋转实现**
        // 使用连续角度避免循环重置抖动，确保圆环稳定
        const totalRotations = 1000; // 连续旋转1000圈，足够长时间运行
        const totalAngle = Math.PI * 2 * totalRotations; // 总角度
        const totalDuration = rotationDuration * totalRotations; // 总持续时间
        
        console.log(`[DELAY_RING_DEBUG] 🔧 连续旋转参数:`, {
            totalRotations,
            totalAngle: `${totalAngle.toFixed(2)} 弧度`,
            totalDuration: `${totalDuration}ms`,
            singleRotationDuration: `${rotationDuration}ms`
        });
        
        // 🎯 **创建独立的圆形轨迹旋转动画**
        cardData.rotationTween = this.scene.tweens.add({
            targets: {},
            angle: { from: 0, to: totalAngle }, // 🎯 **从0开始连续旋转（圆环顶部）**
            duration: totalDuration,
            ease: 'Linear', // 🎯 **线性缓动确保恒定速度**
            onStart: () => {
                console.log(`[DELAY_RING_DEBUG] ✅ 从圆环顶部开始的连续旋转动画启动`);
            },
            onUpdate: (tween) => {
                const currentAngle = tween.getValue();
                
                // 🧮 **延时圆环位置计算**
                // 转换为标准坐标系：从圆环顶部开始（-π/2）
                const angle = currentAngle - Math.PI / 2;
                const currentRadius = this.getCurrentCircleRadius();
                const x = this.centerX + currentRadius * Math.cos(angle);
                const y = this.centerY + currentRadius * Math.sin(angle);
                const rotation = angle + Math.PI / 2 + Math.PI; // 🎯 **修改：+π让卡牌上方朝向圆心**
                
                card.setPosition(x, y);
                card.setRotation(rotation);
            },
            onComplete: () => {
                console.log(`[DELAY_RING_DEBUG] 🔄 连续旋转动画完成，重新启动以保持圆环`);
                // 如果动画完成（1000圈后），重新启动以保持圆环效果
                if (this.isAnimationActive && card.visible) {
                    this.startCardIndependentRotation(cardData, rotationDuration);
                }
            }
        });
        
        if (cardData.rotationTween) {
            console.log(`[DELAY_RING_DEBUG] ✅ 延时圆环旋转动画创建成功`);
        } else {
            console.error(`[DELAY_RING_DEBUG] ❌ 延时圆环旋转动画创建失败`);
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
        
        // 移除window的orientationchange事件监听器
        if (typeof window !== 'undefined' && this.orientationChangeHandler) {
            window.removeEventListener('orientationchange', this.orientationChangeHandler);
            this.orientationChangeHandler = undefined;
        }
        
        console.log('🧹 已清理所有事件监听器');
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
     * 动态更新圆环中心位置配置
     * @param orientation 屏幕方向 ('portrait' | 'landscape')
     * @param config 新的圆环中心配置
     */
    public updateCircleCenterConfig(orientation: 'portrait' | 'landscape', config: CircleCenterConfig): void {
        console.log(`[CONFIG_UPDATE] 🔧 更新${orientation}模式的圆环中心配置:`, config);
        
        // 更新配置
        this.config.circleCenter[orientation] = { ...config };
        
        // 如果当前就是这个方向，立即更新中心位置
        const currentOrientation = this.detectScreenOrientation();
        if (currentOrientation === orientation) {
            console.log(`[CONFIG_UPDATE] 📱 当前方向匹配，立即更新中心位置`);
            this.updateScreenCenter();
            
            // 如果动画正在进行，更新旋转卡牌位置
            if (this.isAnimationActive) {
                this.updateRotatingCardsPosition();
            }
        }
        
        console.log(`[CONFIG_UPDATE] ✅ 圆环中心配置更新完成`);
    }

    /**
     * 获取当前圆环中心位置配置
     * @param orientation 可选：指定方向，不指定则返回当前方向的配置
     * @returns 圆环中心位置配置
     */
    public getCircleCenterConfig(orientation?: 'portrait' | 'landscape'): CircleCenterConfig {
        const targetOrientation = orientation || this.detectScreenOrientation();
        return { ...this.config.circleCenter[targetOrientation] };
    }

    /**
     * 获取当前计算出的圆环中心坐标
     * @returns 当前圆环中心坐标
     */
    public getCurrentCenterPosition(): { x: number; y: number } {
        return { x: this.centerX, y: this.centerY };
    }

    /**
     * 获取当前屏幕方向
     * @returns 当前屏幕方向
     */
    public getCurrentOrientation(): 'portrait' | 'landscape' {
        return this.detectScreenOrientation();
    }

    /**
     * 创建胜利动画中心元素（icon和solitaire文字）
     */
    private createVictoryElements(): void {
        console.log('🎨 创建胜利动画中心元素');
        
        // 获取当前屏幕方向
        const orientation = this.detectScreenOrientation();
        const layout = orientation === 'portrait' ? portraitLayout : landscapeLayout;
        const victoryConfig = layout.victoryAnimation;
        
        // 创建游戏图标
        this.victoryIcon = this.scene.add.image(
            victoryConfig.icon.x,
            victoryConfig.icon.y,
            AssetKeys.ICON
        );
        this.victoryIcon.setScale(victoryConfig.icon.scale);
        this.victoryIcon.setOrigin(0.5, 0.5);
        this.victoryIcon.setAlpha(0); // 初始透明
        this.victoryIcon.setDepth(3000); // 确保在圆环上方
        
        // 创建Solitaire文字
        this.solitaireText = this.scene.add.image(
            victoryConfig.solitaireText.x,
            victoryConfig.solitaireText.y,
            AssetKeys.SOLITAIRE_TEXT
        );
        this.solitaireText.setScale(victoryConfig.solitaireText.scale);
        this.solitaireText.setOrigin(0.5, 0.5);
        this.solitaireText.setAlpha(0); // 初始透明
        this.solitaireText.setDepth(3000); // 确保在圆环上方
        
        // 淡入动画
        this.scene.tweens.add({
            targets: [this.victoryIcon, this.solitaireText],
            alpha: 1,
            duration: 800,
            ease: 'Power2.easeOut',
            onComplete: () => {
                console.log('✨ 胜利元素淡入完成');
            }
        });
        
        console.log(`🎨 胜利元素创建完成 - 方向: ${orientation}`);
        console.log(`🎨 图标位置: (${victoryConfig.icon.x}, ${victoryConfig.icon.y}), 缩放: ${victoryConfig.icon.scale}`);
        console.log(`🎨 文字位置: (${victoryConfig.solitaireText.x}, ${victoryConfig.solitaireText.y}), 缩放: ${victoryConfig.solitaireText.scale}`);
    }
    
    /**
     * 更新胜利元素位置（屏幕方向变化时调用）
     */
    private updateVictoryElementsPosition(): void {
        if (!this.victoryIcon || !this.solitaireText) {
            return;
        }
        
        console.log('🔄 更新胜利元素位置');
        
        // 获取当前屏幕方向
        const orientation = this.detectScreenOrientation();
        const layout = orientation === 'portrait' ? portraitLayout : landscapeLayout;
        const victoryConfig = layout.victoryAnimation;
        
        // 更新图标位置和缩放
        this.victoryIcon.setPosition(victoryConfig.icon.x, victoryConfig.icon.y);
        this.victoryIcon.setScale(victoryConfig.icon.scale);
        
        // 更新文字位置和缩放
        this.solitaireText.setPosition(victoryConfig.solitaireText.x, victoryConfig.solitaireText.y);
        this.solitaireText.setScale(victoryConfig.solitaireText.scale);
        
        console.log(`🔄 胜利元素位置更新完成 - 方向: ${orientation}`);
    }

    /**
     * 销毁管理器
     */
    public destroy(): void {
        this.stopAnimation();
        
        // 清理胜利元素
        if (this.victoryIcon) {
            this.victoryIcon.destroy();
            this.victoryIcon = undefined;
        }
        if (this.solitaireText) {
            this.solitaireText.destroy();
            this.solitaireText = undefined;
        }
        
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