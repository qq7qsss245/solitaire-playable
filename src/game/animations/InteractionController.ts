import { Scene } from 'phaser';
import { Card as CardComponent } from '../components/Card';
import { 
  InteractionState, 
  DEFAULT_DEAL_CONFIG 
} from './types/DealAnimationTypes';
import { EventBus } from '../EventBus';

/**
 * 交互控制器 - 负责动画期间的用户交互控制和跳过功能
 */
export class InteractionController {
  private scene: Scene;
  private state: InteractionState;
  private skipHintText: Phaser.GameObjects.Text | null = null;
  private skipHintBackground: Phaser.GameObjects.Graphics | null = null;
  private skipHintTween: Phaser.Tweens.Tween | null = null;
  private skipCallbacks: (() => void)[] = [];
  private longPressTimer: number | null = null;
  private isDestroyed: boolean = false;

  constructor(scene: Scene) {
    this.scene = scene;
    this.state = {
      isDealAnimationPlaying: false,
      isUserInteractionBlocked: false,
      allowSkip: true,
      showSkipHint: true
    };
  }

  /**
   * 开始动画时的交互控制
   */
  public startDealAnimation(): void {
    this.state.isDealAnimationPlaying = true;
    this.state.isUserInteractionBlocked = true;

    // 禁用所有卡牌交互
    this.disableCardInteractions();

    // 设置跳过控制
    this.setupSkipControls();

    // 显示跳过提示
    if (this.state.showSkipHint) {
      this.showSkipHint();
    }

    console.log('🎮 InteractionController: Deal animation started, interactions disabled');
  }

  /**
   * 结束动画时恢复交互
   */
  public endDealAnimation(): void {
    this.state.isDealAnimationPlaying = false;
    this.state.isUserInteractionBlocked = false;

    // 恢复卡牌交互
    this.enableCardInteractions();

    // 清理跳过控制
    this.cleanupSkipControls();

    // 隐藏跳过提示
    this.hideSkipHint();

    console.log('🎮 InteractionController: Deal animation ended, interactions enabled');
  }

  /**
   * 设置跳过控制
   */
  private setupSkipControls(): void {
    if (!this.state.allowSkip) return;

    // 1. 点击屏幕跳过
    this.scene.input.once('pointerdown', this.handleSkipInput, this);

    // 2. 键盘ESC键跳过（桌面端）
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.once('keydown-ESC', this.handleSkipInput, this);
    }

    // 3. 长按跳过（移动端）
    this.scene.input.on('pointerdown', this.startLongPress, this);
    this.scene.input.on('pointerup', this.cancelLongPress, this);
  }

  /**
   * 开始长按检测
   */
  private startLongPress = (): void => {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }

    this.longPressTimer = window.setTimeout(() => {
      this.handleSkipInput();
    }, 1000); // 长按1秒跳过
  };

  /**
   * 取消长按检测
   */
  private cancelLongPress = (): void => {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  };

  /**
   * 处理跳过输入
   */
  private handleSkipInput = (): void => {
    if (!this.state.isDealAnimationPlaying || !this.state.allowSkip) return;

    console.log('🎮 InteractionController: Skip input detected');
    this.triggerSkip();
  };

  /**
   * 触发跳过动画
   */
  private triggerSkip(): void {
    // 触发跳过回调
    this.skipCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Skip callback error:', error);
      }
    });

    // 触发跳过事件
    EventBus.emit('deal-animation-skipped');

    // 立即结束动画状态
    this.endDealAnimation();
  }

  /**
   * 添加跳过回调
   */
  public addSkipCallback(callback: () => void): void {
    this.skipCallbacks.push(callback);
  }

  /**
   * 清理跳过控制
   */
  private cleanupSkipControls(): void {
    // 移除事件监听器
    this.scene.input.off('pointerdown', this.handleSkipInput, this);
    this.scene.input.off('pointerdown', this.startLongPress, this);
    this.scene.input.off('pointerup', this.cancelLongPress, this);

    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown-ESC', this.handleSkipInput, this);
    }

    // 清理长按定时器
    this.cancelLongPress();

    // 清理跳过回调
    this.skipCallbacks = [];
  }

  /**
   * 禁用卡牌交互
   */
  private disableCardInteractions(): void {
    this.scene.children.list.forEach(child => {
      if (child instanceof CardComponent) {
        child.disableInteractive();
      }
    });
  }

  /**
   * 启用卡牌交互
   */
  private enableCardInteractions(): void {
    this.scene.children.list.forEach(child => {
      if (child instanceof CardComponent) {
        child.setInteractive();
      }
    });
  }

  /**
   * 显示跳过提示
   */
  private showSkipHint(): void {
    if (this.isDestroyed) return;

    try {
      const camera = this.scene.cameras.main;
      const centerX = camera.width / 2;
      const bottomY = camera.height - 100;

      // 创建半透明背景
      this.skipHintBackground = this.scene.add.graphics();
      this.skipHintBackground.fillStyle(0x000000, 0.7);
      this.skipHintBackground.fillRoundedRect(
        centerX - 150,
        bottomY - 30,
        300, 60, 10
      );
      this.skipHintBackground.setDepth(1000);
      this.skipHintBackground.setScrollFactor(0); // 固定在屏幕上

      // 创建提示文本
      this.skipHintText = this.scene.add.text(
        centerX,
        bottomY,
        '点击屏幕跳过动画',
        {
          fontSize: '24px',
          color: '#ffffff',
          align: 'center',
          fontFamily: 'Arial, sans-serif'
        }
      );
      this.skipHintText.setOrigin(0.5);
      this.skipHintText.setDepth(1001);
      this.skipHintText.setScrollFactor(0); // 固定在屏幕上

      // 淡入动画
      this.skipHintText.setAlpha(0);
      this.skipHintBackground.setAlpha(0);

      this.skipHintTween = this.scene.tweens.add({
        targets: [this.skipHintText, this.skipHintBackground],
        alpha: 1,
        duration: 500,
        ease: 'Power2'
      });

      // 3秒后自动隐藏
      this.scene.time.delayedCall(3000, () => {
        this.hideSkipHint();
      });

    } catch (error) {
      console.error('Error showing skip hint:', error);
    }
  }

  /**
   * 隐藏跳过提示
   */
  private hideSkipHint(): void {
    if (this.isDestroyed) return;

    if (this.skipHintText && this.skipHintBackground) {
      try {
        // 停止之前的动画
        if (this.skipHintTween) {
          this.skipHintTween.stop();
          this.skipHintTween = null;
        }

        // 淡出动画
        this.scene.tweens.add({
          targets: [this.skipHintText, this.skipHintBackground],
          alpha: 0,
          duration: 300,
          ease: 'Power2',
          onComplete: () => {
            this.destroySkipHintElements();
          }
        });
      } catch (error) {
        console.error('Error hiding skip hint:', error);
        this.destroySkipHintElements();
      }
    }
  }

  /**
   * 销毁跳过提示元素
   */
  private destroySkipHintElements(): void {
    if (this.skipHintText) {
      this.skipHintText.destroy();
      this.skipHintText = null;
    }
    if (this.skipHintBackground) {
      this.skipHintBackground.destroy();
      this.skipHintBackground = null;
    }
    if (this.skipHintTween) {
      this.skipHintTween.stop();
      this.skipHintTween = null;
    }
  }

  /**
   * 设置是否允许跳过
   */
  public setAllowSkip(allow: boolean): void {
    this.state.allowSkip = allow;
    
    if (!allow) {
      this.cleanupSkipControls();
      this.hideSkipHint();
    } else if (this.state.isDealAnimationPlaying) {
      this.setupSkipControls();
      if (this.state.showSkipHint) {
        this.showSkipHint();
      }
    }
  }

  /**
   * 设置是否显示跳过提示
   */
  public setShowSkipHint(show: boolean): void {
    this.state.showSkipHint = show;
    
    if (!show) {
      this.hideSkipHint();
    }
  }

  /**
   * 获取当前交互状态
   */
  public getState(): InteractionState {
    return { ...this.state };
  }

  /**
   * 强制结束所有交互控制
   */
  public forceEnd(): void {
    this.endDealAnimation();
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    this.isDestroyed = true;
    
    this.cleanupSkipControls();
    this.destroySkipHintElements();
    this.enableCardInteractions(); // 确保交互被恢复
    
    this.skipCallbacks = [];
  }
}