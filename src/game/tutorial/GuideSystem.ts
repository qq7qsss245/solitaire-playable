import { Scene } from 'phaser';
import { Game } from '../scenes/Game';
import { Card as CardComponent } from '../components/Card';
import { TutorialTarget } from './TutorialManager';
import { DEBUG_SPACING, portraitLayout, landscapeLayout } from '../../config/klondike-layout';
import { AssetKeys } from '../../assets';
import { EventBus } from '../EventBus';

export class GuideSystem {
    private scene: Game;
    
    // UI组件
    private handGuide: Phaser.GameObjects.Image;
    private currentGuideTextImage: Phaser.GameObjects.Image | null = null; // 当前显示的文案图片
    private guideTextImage1: Phaser.GameObjects.Image; // 第一个文案图片（用于开局双文案）
    private guideTextImage2: Phaser.GameObjects.Image; // 第二个文案图片（用于开局双文案）
    private highlightOverlay: Phaser.GameObjects.Graphics;
    private errorFeedback: Phaser.GameObjects.Graphics;
    private clickArea: Phaser.GameObjects.Rectangle; // 点击区域
    private ghostCard: CardComponent; // 幽灵卡牌
    private dragHand: Phaser.GameObjects.Image; // 拖拽手势
    
    // 动画
    private handTween: Phaser.Tweens.Tween | null = null;
    private textTween1: Phaser.Tweens.Tween | null = null;
    private textTween2: Phaser.Tweens.Tween | null = null;
    private currentTextTween: Phaser.Tweens.Tween | null = null; // 当前文案的动画
    private highlightTween: Phaser.Tweens.Tween | null = null;
    
    // 状态
    private isVisible: boolean = false;
    private currentGuideText: string = '';
    private isShowingInitialTexts: boolean = false; // 是否正在显示开局文案
    private onInitialTextsComplete: (() => void) | null = null; // 开局文案完成回调
    private ghostCardTween: Phaser.Tweens.Tween | null = null; // 幽灵卡牌动画
    private isShowingAceGuide: boolean = false; // 是否正在显示A牌引导
    private isShowingWasteToTableauGuide: boolean = false; // 是否正在显示waste到tableau引导
    private currentOrientation: string = ''; // 当前屏幕方向
    
    constructor(scene: Game) {
        this.scene = scene;
        this.createGuideElements();
        this.setupOrientationListener();
        this.setupEventListeners();
    }

    private createGuideElements(): void {
        // 创建手指引导图片
        this.handGuide = this.scene.add.image(0, 0, 'hand');
        this.handGuide.setVisible(false);
        this.handGuide.setDepth(10000);
        this.handGuide.setScale(0.8);
        
        // 创建第一个引导文案图片
        this.guideTextImage1 = this.scene.add.image(0, 0, '');
        this.guideTextImage1.setVisible(false);
        this.guideTextImage1.setDepth(9999);
        this.guideTextImage1.setOrigin(0.5, 0.5);
        this.guideTextImage1.setScale(DEBUG_SPACING.GUIDE_TEXT_SCALE);
        
        // 创建第二个引导文案图片
        this.guideTextImage2 = this.scene.add.image(0, 0, '');
        this.guideTextImage2.setVisible(false);
        this.guideTextImage2.setDepth(9999);
        this.guideTextImage2.setOrigin(0.5, 0.5);
        this.guideTextImage2.setScale(DEBUG_SPACING.GUIDE_TEXT_SCALE);
        
        // 创建点击区域（全屏透明矩形）
        this.clickArea = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0);
        this.clickArea.setVisible(false);
        this.clickArea.setDepth(9998);
        this.clickArea.setInteractive();
        this.clickArea.setOrigin(0, 0);
        
        // 创建幽灵卡牌（用于拖拽演示）
        // 延迟创建，等待需要时再创建
        this.ghostCard = null as any;
        
        // 创建拖拽手势
        this.dragHand = this.scene.add.image(0, 0, 'hand');
        this.dragHand.setVisible(false);
        this.dragHand.setDepth(9998);
        this.dragHand.setOrigin(0, 0); // 设置origin为左上角（手指位置）
        this.dragHand.setScale(0.8);
        
        // 创建高亮遮罩
        this.highlightOverlay = this.scene.add.graphics();
        this.highlightOverlay.setDepth(9996);
        this.highlightOverlay.setVisible(false);
        
        // 创建错误反馈图形
        this.errorFeedback = this.scene.add.graphics();
        this.errorFeedback.setDepth(9995);
        this.errorFeedback.setVisible(false);
    }

    private setupOrientationListener(): void {
        // 记录初始方向
        this.currentOrientation = this.getOrientation();
        
        // 监听窗口大小变化（包括方向变化）
        window.addEventListener('resize', () => {
            const newOrientation = this.getOrientation();
            if (newOrientation !== this.currentOrientation) {
                this.currentOrientation = newOrientation;
                this.onOrientationChange();
            }
        });
    }

    private setupEventListeners(): void {
        // 监听红桃A开始拖拽事件
        EventBus.on('heart-ace-drag-started', this.onHeartAceDragStarted, this);
    }

    private onHeartAceDragStarted(): void {
        // 当用户开始拖拽红桃A时，立即隐藏引导效果
        if (this.isShowingAceGuide) {
            this.hideAceToFoundationGuide();
        }
    }

    private getOrientation(): string {
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }

    private onOrientationChange(): void {
        // 如果正在显示A牌引导，需要重新初始化
        if (this.isShowingAceGuide) {
            this.restartAceGuideAnimation();
        }
        
        // 如果正在显示waste到tableau引导，需要重新初始化
        if (this.isShowingWasteToTableauGuide) {
            this.restartWasteToTableauAnimation();
        }
        
        // 如果正在显示开局文案，需要更新位置
        if (this.isShowingInitialTexts) {
            this.updateInitialTextsPosition();
        }
        
        // 如果正在显示单个文案，需要更新位置
        if (this.currentGuideTextImage && this.currentGuideTextImage.visible) {
            this.updateSingleTextPosition();
        }
    }

    private restartAceGuideAnimation(): void {
        // 停止当前动画
        if (this.ghostCardTween) {
            this.ghostCardTween.stop();
            this.ghostCardTween = null;
        }
        
        // 重新获取位置并启动动画
        const aceCard = this.findHeartAceCard();
        const targetFoundation = this.findHeartFoundationPosition();
        
        if (aceCard && targetFoundation && this.ghostCard) {
            // 更新幽灵卡牌和手势位置
            this.ghostCard.setPosition(aceCard.x, aceCard.y);
            if (this.dragHand) {
                this.dragHand.setPosition(aceCard.x, aceCard.y);
            }
            
            // 重新创建动画
            this.createDragAnimation(aceCard, targetFoundation);
        }
    }

    private updateInitialTextsPosition(): void {
        // 获取新的布局配置
        const layout = this.scene.currentLayout;
        if (!layout) return;
        
        const introPos = layout.guideTexts.intro;
        const objectivePos = layout.guideTexts.objective;
        
        // 更新文案位置
        this.guideTextImage1.setPosition(introPos.x, introPos.y);
        this.guideTextImage2.setPosition(objectivePos.x, objectivePos.y);
    }

    private updateSingleTextPosition(): void {
        // 获取新的布局配置
        const layout = this.scene.currentLayout;
        if (!layout || !this.currentGuideTextImage) return;
        
        console.log('🔍 [DEBUG] updateSingleTextPosition - 当前文案类型:', this.currentGuideText);
        
        // 从配置中获取对应文案的位置
        const guideTexts = layout.guideTexts as any;
        if (guideTexts && guideTexts[this.currentGuideText]) {
            const textPos = guideTexts[this.currentGuideText];
            console.log('🔍 [DEBUG] updateSingleTextPosition - 更新坐标:', {
                textKey: this.currentGuideText,
                配置坐标: textPos,
                orientation: this.getOrientation(),
                gameSize: `${layout.gameWidth}x${layout.gameHeight}`
            });
            this.currentGuideTextImage.setPosition(textPos.x, textPos.y);
            console.log('🔍 [DEBUG] updateSingleTextPosition - 更新后实际坐标:', {
                x: this.currentGuideTextImage.x,
                y: this.currentGuideTextImage.y
            });
        } else {
            console.warn('⚠️ [WARNING] updateSingleTextPosition - 配置中未找到坐标:', this.currentGuideText);
        }
    }

    private createGhostCard(): void {
        // 直接使用 Card 组件创建红桃A
        this.ghostCard = new CardComponent(this.scene, 0, 0, 'h', 'A', true);
        this.scene.add.existing(this.ghostCard);
        
        // 设置幽灵卡牌属性
        this.ghostCard.setVisible(false);
        this.ghostCard.setDepth(9997);
        this.ghostCard.setAlpha(0.7);
        
        // 禁用交互，避免干扰正常游戏
        this.ghostCard.disableInteractive();
    }

    private createGhostCardForWasteGuide(): void {
        // 为waste到tableau引导创建红桃Q幽灵卡牌
        this.ghostCard = new CardComponent(this.scene, 0, 0, 'h', 'Q', true);
        this.scene.add.existing(this.ghostCard);
        
        // 设置幽灵卡牌属性
        this.ghostCard.setVisible(false);
        this.ghostCard.setDepth(9997);
        this.ghostCard.setAlpha(0.7);
        
        // 禁用交互，避免干扰正常游戏
        this.ghostCard.disableInteractive();
    }

    public showGuideText(textKey: string): void {
        this.currentGuideText = textKey;
        
        // 先隐藏之前的文案图片
        this.hideCurrentGuideText();
        
        // 映射教学步骤键名到资源键名
        const textureKey = this.mapTextKeyToTexture(textKey);
        
        // 为每个文案创建新的图片对象
        this.currentGuideTextImage = this.scene.add.image(0, 0, textureKey);
        this.currentGuideTextImage.setDepth(9999);
        this.currentGuideTextImage.setOrigin(0.5, 0.5);
        this.currentGuideTextImage.setScale(DEBUG_SPACING.GUIDE_TEXT_SCALE);
        this.currentGuideTextImage.setVisible(true);
        
        // 使用配置文件中的坐标而不是计算位置
        const layout = this.scene.currentLayout;
        const guideTexts = layout?.guideTexts as any;
        if (layout && guideTexts && guideTexts[textKey]) {
            const textPos = guideTexts[textKey];
            console.log('🔍 [DEBUG] showGuideText - 使用配置坐标:', {
                textKey: textKey,
                textureKey: textureKey,
                配置坐标: textPos,
                orientation: this.getOrientation()
            });
            this.currentGuideTextImage.setPosition(textPos.x, textPos.y);
        } else {
            // 如果配置中没有对应的坐标，则使用计算的位置作为后备方案
            console.warn('⚠️ [WARNING] showGuideText - 配置中未找到坐标，使用计算位置:', textKey);
            const screenWidth = this.scene.scale.width;
            const screenHeight = this.scene.scale.height;
            
            // 根据屏幕方向调整文案位置
            const isLandscape = screenWidth > screenHeight;
            let textY: number;
            
            if (isLandscape) {
                // 横屏：放在牌局下方，约屏幕高度的85%位置
                textY = screenHeight * 0.85;
            } else {
                // 竖屏：放在牌局下方，约屏幕高度的80%位置
                textY = screenHeight * 0.80;
            }
            
            this.currentGuideTextImage.setPosition(screenWidth / 2, textY);
        }
        
        // 添加淡入动画
        this.currentGuideTextImage.setAlpha(0);
        this.currentTextTween = this.scene.tweens.add({
            targets: this.currentGuideTextImage,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // 动画完成后延时打印调试信息
                this.scene.time.delayedCall(100, () => {
                    if (this.currentGuideTextImage) {
                        console.log('🔍 [DEBUG] showGuideText - 动画完成后状态:', {
                            textKey: textKey,
                            textureKey: textureKey,
                            x: this.currentGuideTextImage.x,
                            y: this.currentGuideTextImage.y,
                            alpha: this.currentGuideTextImage.alpha,
                            visible: this.currentGuideTextImage.visible,
                            scale: this.currentGuideTextImage.scaleX,
                            depth: this.currentGuideTextImage.depth,
                            texture: this.currentGuideTextImage.texture?.key
                        });
                    }
                });
            }
        });
        
        // 立即打印初始状态
        console.log('🔍 [DEBUG] showGuideText - 创建后初始状态:', {
            textKey: textKey,
            textureKey: textureKey,
            x: this.currentGuideTextImage.x,
            y: this.currentGuideTextImage.y,
            alpha: this.currentGuideTextImage.alpha,
            visible: this.currentGuideTextImage.visible,
            scale: this.currentGuideTextImage.scaleX,
            depth: this.currentGuideTextImage.depth,
            texture: this.currentGuideTextImage.texture?.key
        });
    }

    public showInitialGuideTexts(onComplete?: () => void): void {
        // 显示开局的两个文案：intro 和 objective
        this.isShowingInitialTexts = true;
        this.onInitialTextsComplete = onComplete || null;
        
        // 从配置中获取文案位置
        const layout = this.scene.currentLayout;
        const introPos = layout.guideTexts.intro;
        const objectivePos = layout.guideTexts.objective;
        
        // 设置第一个文案 (intro)
        this.guideTextImage1.setTexture('guide-intro');
        this.guideTextImage1.setVisible(true);
        this.guideTextImage1.setScale(DEBUG_SPACING.GUIDE_TEXT_SCALE);
        this.guideTextImage1.setPosition(introPos.x, introPos.y);
        
        // 设置第二个文案 (objective)
        this.guideTextImage2.setTexture('guide-objective');
        this.guideTextImage2.setVisible(true);
        this.guideTextImage2.setScale(DEBUG_SPACING.GUIDE_TEXT_SCALE);
        this.guideTextImage2.setPosition(objectivePos.x, objectivePos.y);
        
        // 添加淡入动画
        this.guideTextImage1.setAlpha(0);
        this.guideTextImage2.setAlpha(0);
        
        this.textTween1 = this.scene.tweens.add({
            targets: this.guideTextImage1,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });
        
        this.textTween2 = this.scene.tweens.add({
            targets: this.guideTextImage2,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });
        
        // 启用点击区域
        this.clickArea.setVisible(true);
        this.clickArea.once('pointerdown', () => {
            this.hideInitialGuideTexts();
        });
    }


    private hideInitialGuideTexts(): void {
        this.isShowingInitialTexts = false;
        
        // 停止动画
        if (this.textTween1) {
            this.textTween1.stop();
            this.textTween1 = null;
        }
        if (this.textTween2) {
            this.textTween2.stop();
            this.textTween2 = null;
        }
        
        // 隐藏文案
        this.guideTextImage1.setVisible(false);
        this.guideTextImage2.setVisible(false);
        
        // 隐藏点击区域
        this.clickArea.setVisible(false);
        
        // 触发完成回调
        if (this.onInitialTextsComplete) {
            this.onInitialTextsComplete();
            this.onInitialTextsComplete = null;
        }
    }

    public showAceToFoundationGuide(): void {
        // 显示"Let's put Ace to foundation"文案和幽灵卡牌拖拽动画
        this.isShowingAceGuide = true;
        
        // 显示文案
        const layout = this.scene.currentLayout;
        const acePos = layout.guideTexts.aceToFoundation;
        
        this.guideTextImage1.setTexture('guide-ace-to-foundation');
        this.guideTextImage1.setVisible(true);
        this.guideTextImage1.setScale(DEBUG_SPACING.GUIDE_TEXT_SCALE);
        this.guideTextImage1.setPosition(acePos.x, acePos.y);
        
        // 淡入动画
        this.guideTextImage1.setAlpha(0);
        this.textTween1 = this.scene.tweens.add({
            targets: this.guideTextImage1,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });
        
        // 创建幽灵卡牌（如果还未创建）
        if (!this.ghostCard) {
            this.createGhostCard();
        }
        
        // 启动幽灵卡牌拖拽动画
        this.startGhostCardDragAnimation();
    }

    private startGhostCardDragAnimation(): void {
        // 找到红桃A的位置和目标基础牌堆位置
        const aceCard = this.findHeartAceCard();
        const targetFoundation = this.findHeartFoundationPosition();
        
        if (!aceCard || !targetFoundation) {
            console.warn('无法找到红桃A或红桃基础牌堆位置');
            return;
        }
        
        // 设置幽灵卡牌位置
        this.ghostCard.setPosition(aceCard.x, aceCard.y);
        this.ghostCard.setVisible(true);
        this.ghostCard.setAlpha(0.7);
        
        // 设置拖拽手势位置（在幽灵卡牌中心）
        this.dragHand.setPosition(aceCard.x, aceCard.y);
        this.dragHand.setVisible(true);
        
        // 创建循环拖拽动画
        this.createDragAnimation(aceCard, targetFoundation);
    }

    private findHeartAceCard(): { x: number; y: number } | null {
        // 在教学牌局中，红桃A应该在第5列（索引4）的顶部
        // 直接从游戏场景中找到实际的红桃A卡牌位置
        const game = this.scene as Game;
        
        // 检查第5列（索引4）是否有卡牌
        if (game.tableau && game.tableau[4] && game.tableau[4].cards.length > 0) {
            const topCard = game.tableau[4].cards[game.tableau[4].cards.length - 1];
            return { x: topCard.x, y: topCard.y };
        }
        
        // 如果找不到实际卡牌，使用布局计算作为后备
        const layout = this.scene.currentLayout;
        if (layout) {
            const columnIndex = 4; // 第5列
            const x = layout.tableau.startX + columnIndex * layout.tableau.columnGap;
            const y = layout.tableau.startY;
            return { x, y };
        }
        
        return null;
    }

    private findHeartFoundationPosition(): { x: number; y: number } | null {
        // 红桃基础牌堆应该是第2个基础牌堆（索引1）
        const layout = this.scene.currentLayout;
        const foundationIndex = 1; // 红桃基础牌堆
        
        const x = layout.foundation.startX + foundationIndex * layout.foundation.gap;
        const y = layout.foundation.startY;
        
        return { x, y };
    }

    private createDragAnimation(startPos: { x: number; y: number }, endPos: { x: number; y: number }): void {
        // 停止之前的动画
        if (this.ghostCardTween) {
            this.ghostCardTween.stop();
        }
        
        // 创建循环拖拽动画：拖动到终点 → 淡出 → 瞬间回到起点 → 淡入 → 重复
        this.startDragAnimationCycle(startPos, endPos);
    }

    private startDragAnimationCycle(startPos: { x: number; y: number }, endPos: { x: number; y: number }): void {
        // 确保元素在起始位置且可见
        this.ghostCard.setPosition(startPos.x, startPos.y);
        this.dragHand.setPosition(startPos.x, startPos.y);
        this.ghostCard.setAlpha(0.7);
        this.dragHand.setAlpha(1);
        
        // 第一步：拖动到终点
        this.ghostCardTween = this.scene.tweens.add({
            targets: [this.ghostCard, this.dragHand],
            x: endPos.x,
            y: endPos.y,
            duration: 1000,
            ease: 'Power2.easeInOut',
            onComplete: () => {
                // 第二步：淡出
                this.scene.tweens.add({
                    targets: [this.ghostCard, this.dragHand],
                    alpha: 0,
                    duration: 200,
                    ease: 'Power2.easeOut',
                    onComplete: () => {
                        // 第三步：瞬间回到起始位置
                        this.ghostCard.setPosition(startPos.x, startPos.y);
                        this.dragHand.setPosition(startPos.x, startPos.y);
                        
                        // 第四步：淡入
                        this.scene.tweens.add({
                            targets: [this.ghostCard, this.dragHand],
                            alpha: { from: 0, to: 0.7 }, // 幽灵卡牌透明度
                            duration: 200,
                            ease: 'Power2.easeIn',
                            onComplete: () => {
                                // 恢复手势的完全不透明
                                this.dragHand.setAlpha(1);
                                
                                // 等待一段时间后重新开始循环
                                this.scene.time.delayedCall(250, () => {
                                    if (this.isShowingAceGuide) {
                                        this.startDragAnimationCycle(startPos, endPos);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    public hideAceToFoundationGuide(): void {
        this.isShowingAceGuide = false;
        
        // 停止幽灵卡牌动画
        if (this.ghostCardTween) {
            this.ghostCardTween.stop();
            this.ghostCardTween = null;
        }
        
        // 隐藏幽灵卡牌和拖拽手势（添加空值检查）
        if (this.ghostCard) {
            this.ghostCard.setVisible(false);
        }
        if (this.dragHand) {
            this.dragHand.setVisible(false);
        }
        
        // 隐藏文案
        if (this.textTween1) {
            this.textTween1.stop();
            this.textTween1 = null;
        }
        this.guideTextImage1.setVisible(false);
    }

    public showStockClickGuide(): void {
        // 显示"Hmmm, now try to..."文案和stock点击引导
        const layout = this.scene.currentLayout;
        if (!layout) {
            console.error('❌ [ERROR] showStockClickGuide - currentLayout未定义');
            return;
        }
        
        // 使用新的showGuideText方法显示stockHint文案
        this.showGuideText('stockHint');
        
        // 在stock位置显示点击手势
        const stockPos = layout.stock;
        this.showHandGuide(stockPos.x, stockPos.y);
        
        console.log('🔍 [DEBUG] showStockClickGuide - 已调用showGuideText和showHandGuide');
    }

    public hideStockClickGuide(): void {
        // 隐藏文案
        if (this.textTween1) {
            this.textTween1.stop();
            this.textTween1 = null;
        }
        this.guideTextImage1.setVisible(false);
        
        // 隐藏手势
        this.hideHandGuide();
    }

    public getIsShowingAceGuide(): boolean {
        return this.isShowingAceGuide;
    }

    private mapTextKeyToTexture(textKey: string): string {
        // 映射教学步骤键名到Preloader中加载的资源键名
        const keyMap: { [key: string]: string } = {
            'intro': 'guide-intro',
            'objective': 'guide-objective',
            'aceToFoundation': 'guide-ace-to-foundation',
            'cardToPile': 'guide-card-to-pile',
            'checkStock': 'guide-check-stock',
            'stockHint': 'guide-stock-hint', // 映射到"Hmmm..."文案
            'moveCard': 'guide-move-card',
            'complete': 'guide-complete'
        };
        
        return keyMap[textKey] || textKey;
    }

    private hideCurrentGuideText(): void {
        // 停止当前文案的动画
        if (this.currentTextTween) {
            this.currentTextTween.stop();
            this.currentTextTween = null;
        }
        
        // 销毁当前文案图片对象
        if (this.currentGuideTextImage) {
            this.currentGuideTextImage.destroy();
            this.currentGuideTextImage = null;
        }
    }

    public hideGuideText(): void {
        // 隐藏当前单个文案
        this.hideCurrentGuideText();
        
        // 隐藏开局双文案
        if (this.textTween1) {
            this.textTween1.stop();
            this.textTween1 = null;
        }
        if (this.textTween2) {
            this.textTween2.stop();
            this.textTween2 = null;
        }
        
        this.guideTextImage1.setVisible(false);
        this.guideTextImage2.setVisible(false);
        this.currentGuideText = '';
    }

    public showHandGuide(x: number, y: number): void {
        this.handGuide.setPosition(x, y);
        this.handGuide.setVisible(true);
        this.isVisible = true;
        
        // 停止之前的动画
        if (this.handTween) {
            this.handTween.stop();
        }
        
        // 添加上下浮动动画
        this.handTween = this.scene.tweens.add({
            targets: this.handGuide,
            y: y + 20,
            duration: 750,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    public showCardToCardGuide(fromCard: CardComponent, toCard: CardComponent): void {
        // 显示从源卡牌到目标卡牌的引导动画
        this.handGuide.setPosition(fromCard.x, fromCard.y);
        this.handGuide.setVisible(true);
        this.isVisible = true;
        
        // 停止之前的动画
        if (this.handTween) {
            this.handTween.stop();
        }
        
        // 创建从源到目标的移动动画
        this.handTween = this.scene.tweens.add({
            targets: this.handGuide,
            x: toCard.x,
            y: toCard.y + 30,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Power2'
        });
    }

    public hideHandGuide(): void {
        if (this.handTween) {
            this.handTween.stop();
            this.handTween = null;
        }
        
        this.handGuide.setVisible(false);
        this.isVisible = false;
    }

    public highlightFoundationZones(): void {
        // 移除遮罩效果，只保留基础牌堆的轻微高亮
        this.highlightOverlay.clear();
        this.highlightOverlay.setVisible(true);
        
        // 在基础牌堆位置绘制轻微的高亮边框
        this.scene.foundationZones.forEach((zone) => {
            const bounds = zone.getBounds();
            this.highlightOverlay.lineStyle(3, 0xffffff, 0.8);
            this.highlightOverlay.strokeRect(
                bounds.x - 5,
                bounds.y - 5,
                bounds.width + 10,
                bounds.height + 10
            );
        });
        
        // 添加轻微的闪烁动画
        this.highlightTween = this.scene.tweens.add({
            targets: this.highlightOverlay,
            alpha: 0.5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    public hideHighlight(): void {
        if (this.highlightTween) {
            this.highlightTween.stop();
            this.highlightTween = null;
        }
        
        this.highlightOverlay.clear();
        this.highlightOverlay.setVisible(false);
    }

    public showTimeoutHint(target: TutorialTarget): void {
        // 显示超时提示（增强手指动画）
        if (target.position) {
            this.showHandGuide(target.position.x, target.position.y);
            
            // 添加更明显的动画效果
            if (this.handTween) {
                this.handTween.stop();
            }
            
            this.handTween = this.scene.tweens.add({
                targets: this.handGuide,
                scale: 1.2,
                y: this.handGuide.y + 30,
                duration: 500,
                yoyo: true,
                repeat: 3,
                ease: 'Back.easeOut',
                onComplete: () => {
                    // 恢复正常动画
                    this.showHandGuide(target.position!.x, target.position!.y);
                }
            });
        }
    }

    public showErrorFeedback(target: TutorialTarget): void {
        // 显示错误反馈（红色闪烁效果）
        this.errorFeedback.clear();
        this.errorFeedback.setVisible(true);
        
        if (target.card) {
            // 在卡牌周围显示红色边框
            const cardBounds = target.card.getBounds();
            this.errorFeedback.lineStyle(4, 0xff0000, 1);
            this.errorFeedback.strokeRect(
                cardBounds.x - 5,
                cardBounds.y - 5,
                cardBounds.width + 10,
                cardBounds.height + 10
            );
        } else if (target.position) {
            // 在指定位置显示红色圆圈
            this.errorFeedback.lineStyle(4, 0xff0000, 1);
            this.errorFeedback.strokeCircle(target.position.x, target.position.y, 60);
        }
        
        // 添加闪烁动画
        this.scene.tweens.add({
            targets: this.errorFeedback,
            alpha: 0,
            duration: 200,
            yoyo: true,
            repeat: 2,
            ease: 'Power2',
            onComplete: () => {
                this.errorFeedback.setVisible(false);
                this.errorFeedback.clear();
            }
        });
        
        // 震动效果
        if (target.card) {
            const originalX = target.card.x;
            this.scene.tweens.add({
                targets: target.card,
                x: originalX + 10,
                duration: 50,
                yoyo: true,
                repeat: 3,
                ease: 'Power2',
                onComplete: () => {
                    target.card!.x = originalX;
                }
            });
        }
    }

    public hideAllGuides(): void {
        this.hideGuideText();
        this.hideHandGuide();
        this.hideHighlight();
        this.hideAceToFoundationGuide();
        this.hideWasteToTableauGuide();
        
        // 隐藏点击区域
        this.clickArea.setVisible(false);
        
        // 清除错误反馈
        this.errorFeedback.setVisible(false);
        this.errorFeedback.clear();
        
        this.isShowingInitialTexts = false;
    }

    public update(time: number, delta: number): void {
        // 更新引导系统状态
        // 这里可以添加一些基于时间的动画或状态更新
    }

    public isGuideVisible(): boolean {
        return this.isVisible;
    }

    public getCurrentGuideText(): string {
        return this.currentGuideText;
    }

    public showWasteToTableauGuide(): void {
        // 显示引导文案（已在前面步骤实现）
        // 启动幽灵拖拽动画
        this.isShowingWasteToTableauGuide = true;
        this.startWasteToTableauDragAnimation();
    }

    public hideWasteToTableauGuide(): void {
        this.isShowingWasteToTableauGuide = false;
        
        // 隐藏引导文案
        this.hideCurrentGuideText();
        
        // 隐藏幽灵卡牌和手势
        if (this.ghostCard) {
            this.ghostCard.setVisible(false);
        }
        if (this.dragHand) {
            this.dragHand.setVisible(false);
        }
        
        // 停止动画
        if (this.ghostCardTween) {
            this.ghostCardTween.stop();
            this.ghostCardTween = null;
        }
    }

    private findWasteHeartQ(): { x: number; y: number } | null {
        const game = this.scene as Game;
        
        // 检查waste区域是否有卡牌
        if (game.waste && game.waste.cards.length > 0) {
            // 获取waste区域的顶部卡牌
            const wasteTopCard = game.waste.cards[game.waste.cards.length - 1];
            
            if (wasteTopCard && wasteTopCard.suit === 'h' && wasteTopCard.value === 'Q') {
                return { x: wasteTopCard.x, y: wasteTopCard.y };
            }
        }
        return null;
    }

    private findSpadeKPosition(): { x: number; y: number } | null {
        const game = this.scene as Game;
        
        // 第1列（索引0）的黑桃K位置
        if (game.tableau && game.tableau[0] && game.tableau[0].cards.length > 0) {
            const spadeK = game.tableau[0].cards[game.tableau[0].cards.length - 1];
            if (spadeK.suit === 's' && spadeK.value === 'K') {
                // 返回黑桃K下方的位置（考虑卡牌间距）
                const layout = this.scene.currentLayout;
                const cardGap = layout.tableau.cardGap || DEBUG_SPACING.PORTRAIT_CARD_GAP;
                return { x: spadeK.x, y: spadeK.y + cardGap };
            }
        }
        return null;
    }

    private startWasteToTableauDragAnimation(): void {
        // 找到waste区域的红桃Q位置
        const wasteCard = this.findWasteHeartQ();
        // 找到第1列黑桃K的位置
        const targetPosition = this.findSpadeKPosition();
        
        if (wasteCard && targetPosition) {
            // 创建或重用幽灵卡牌
            if (!this.ghostCard) {
                this.createGhostCardForWasteGuide();
            }
            
            // 设置幽灵卡牌位置和可见性
            this.ghostCard.setPosition(wasteCard.x, wasteCard.y);
            this.ghostCard.setVisible(true);
            
            // 创建循环拖拽动画
            this.createWasteToTableauDragAnimation(wasteCard, targetPosition);
        }
    }

    private createWasteToTableauDragAnimation(startPos: { x: number; y: number }, endPos: { x: number; y: number }): void {
        if (!this.ghostCard) return;

        // 创建手势图标（如果不存在）
        if (!this.dragHand) {
            this.dragHand = this.scene.add.image(0, 0, 'hand');
            this.dragHand.setDepth(10001);
            this.dragHand.setScale(0.8);
        }

        // 设置初始位置
        this.ghostCard.setPosition(startPos.x, startPos.y);
        this.ghostCard.setAlpha(0.7);
        this.dragHand.setPosition(startPos.x, startPos.y);
        this.dragHand.setVisible(true);

        // 创建循环动画
        this.createDragAnimationLoop(startPos, endPos);
    }

    private createDragAnimationLoop(startPos: { x: number; y: number }, endPos: { x: number; y: number }): void {
        if (!this.ghostCard || !this.dragHand) return;

        // 拖动到终点
        this.ghostCardTween = this.scene.tweens.add({
            targets: [this.ghostCard, this.dragHand],
            x: endPos.x,
            y: endPos.y,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                // 淡出效果
                this.scene.tweens.add({
                    targets: [this.ghostCard, this.dragHand],
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        // 瞬间回到起点
                        if (this.ghostCard && this.dragHand) {
                            this.ghostCard.setPosition(startPos.x, startPos.y);
                            this.dragHand.setPosition(startPos.x, startPos.y);
                            
                            // 淡入效果
                            this.scene.tweens.add({
                                targets: [this.ghostCard, this.dragHand],
                                alpha: { from: 0, to: 0.7 },
                                duration: 300,
                                onComplete: () => {
                                    // 恢复手势的完全不透明
                                    if (this.dragHand) {
                                        this.dragHand.setAlpha(1);
                                    }
                                    
                                    // 延迟后重复动画
                                    this.scene.time.delayedCall(250, () => {
                                        if (this.isShowingWasteToTableauGuide && this.ghostCard && this.dragHand) {
                                            this.createDragAnimationLoop(startPos, endPos);
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            }
        });
    }

    private restartWasteToTableauAnimation(): void {
        // 停止当前动画
        if (this.ghostCardTween) {
            this.ghostCardTween.stop();
        }
        
        // 重新获取位置
        const wasteCard = this.findWasteHeartQ();
        const targetPosition = this.findSpadeKPosition();
        
        if (wasteCard && targetPosition && this.ghostCard) {
            // 更新位置并重启动画
            this.ghostCard.setPosition(wasteCard.x, wasteCard.y);
            this.createWasteToTableauDragAnimation(wasteCard, targetPosition);
        }
    }

    public destroy(): void {
        // 停止所有动画
        if (this.handTween) {
            this.handTween.stop();
        }
        if (this.textTween1) {
            this.textTween1.stop();
        }
        if (this.textTween2) {
            this.textTween2.stop();
        }
        if (this.highlightTween) {
            this.highlightTween.stop();
        }
        if (this.ghostCardTween) {
            this.ghostCardTween.stop();
        }
        
        // 清理事件监听器
        EventBus.off('heart-ace-drag-started', this.onHeartAceDragStarted, this);
        
        // 销毁游戏对象
        this.handGuide?.destroy();
        this.guideTextImage1?.destroy();
        this.guideTextImage2?.destroy();
        this.clickArea?.destroy();
        this.ghostCard?.destroy();
        this.dragHand?.destroy();
        this.highlightOverlay?.destroy();
        this.errorFeedback?.destroy();
    }

    public getIsShowingInitialTexts(): boolean {
        return this.isShowingInitialTexts;
    }
}