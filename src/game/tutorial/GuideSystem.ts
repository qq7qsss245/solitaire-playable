import { Scene } from 'phaser';
import { Game } from '../scenes/Game';
import { Card as CardComponent } from '../components/Card';
import { TutorialTarget } from './TutorialManager';

export class GuideSystem {
    private scene: Game;
    
    // UI组件
    private handGuide: Phaser.GameObjects.Image;
    private guideTextImage: Phaser.GameObjects.Image;
    private highlightOverlay: Phaser.GameObjects.Graphics;
    private errorFeedback: Phaser.GameObjects.Graphics;
    
    // 动画
    private handTween: Phaser.Tweens.Tween | null = null;
    private textTween: Phaser.Tweens.Tween | null = null;
    private highlightTween: Phaser.Tweens.Tween | null = null;
    
    // 状态
    private isVisible: boolean = false;
    private currentGuideText: string = '';
    
    constructor(scene: Game) {
        this.scene = scene;
        this.createGuideElements();
    }

    private createGuideElements(): void {
        // 创建手指引导图片
        this.handGuide = this.scene.add.image(0, 0, 'hand');
        this.handGuide.setVisible(false);
        this.handGuide.setDepth(10000);
        this.handGuide.setScale(0.8);
        
        // 创建引导文案图片容器
        this.guideTextImage = this.scene.add.image(0, 0, '');
        this.guideTextImage.setVisible(false);
        this.guideTextImage.setDepth(9999);
        this.guideTextImage.setOrigin(0.5, 0.5);
        
        // 创建高亮遮罩
        this.highlightOverlay = this.scene.add.graphics();
        this.highlightOverlay.setDepth(9998);
        this.highlightOverlay.setVisible(false);
        
        // 创建错误反馈图形
        this.errorFeedback = this.scene.add.graphics();
        this.errorFeedback.setDepth(9997);
        this.errorFeedback.setVisible(false);
    }

    public showGuideText(textKey: string): void {
        this.currentGuideText = textKey;
        
        // 映射教学步骤键名到资源键名
        const textureKey = this.mapTextKeyToTexture(textKey);
        
        // 设置引导文案图片
        this.guideTextImage.setTexture(textureKey);
        this.guideTextImage.setVisible(true);
        
        // 计算文案位置（牌局下方中央）
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
        
        this.guideTextImage.setPosition(screenWidth / 2, textY);
        
        // 添加淡入动画
        this.guideTextImage.setAlpha(0);
        this.textTween = this.scene.tweens.add({
            targets: this.guideTextImage,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });
    }

    private mapTextKeyToTexture(textKey: string): string {
        // 映射教学步骤键名到Preloader中加载的资源键名
        const keyMap: { [key: string]: string } = {
            'intro': 'guide-intro',
            'objective': 'guide-objective',
            'aceToFoundation': 'guide-ace-to-foundation',
            'cardToPile': 'guide-card-to-pile',
            'checkStock': 'guide-check-stock',
            'moveCard': 'guide-move-card',
            'complete': 'guide-complete'
        };
        
        return keyMap[textKey] || textKey;
    }

    public hideGuideText(): void {
        if (this.textTween) {
            this.textTween.stop();
            this.textTween = null;
        }
        
        this.guideTextImage.setVisible(false);
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
        
        // 清除错误反馈
        this.errorFeedback.setVisible(false);
        this.errorFeedback.clear();
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

    public destroy(): void {
        // 停止所有动画
        if (this.handTween) {
            this.handTween.stop();
        }
        if (this.textTween) {
            this.textTween.stop();
        }
        if (this.highlightTween) {
            this.highlightTween.stop();
        }
        
        // 销毁游戏对象
        this.handGuide?.destroy();
        this.guideTextImage?.destroy();
        this.highlightOverlay?.destroy();
        this.errorFeedback?.destroy();
    }
}