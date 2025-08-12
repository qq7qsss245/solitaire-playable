import { Scene } from 'phaser';
import { Card as CardComponent } from '../components/Card';
import { 
  DealAnimationConfig, 
  CardAnimationData, 
  DEFAULT_DEAL_CONFIG 
} from './types/DealAnimationTypes';

/**
 * 动画控制器 - 负责具体的Phaser动画执行
 */
export class AnimationController {
  private scene: Scene;
  private config: DealAnimationConfig;
  private activeTweens: Set<Phaser.Tweens.Tween> = new Set();
  private animationPromises: Map<CardComponent, Promise<void>> = new Map();

  constructor(scene: Scene, config: DealAnimationConfig = DEFAULT_DEAL_CONFIG) {
    this.scene = scene;
    this.config = config;
  }

  /**
   * 将单张卡牌动画到指定位置
   */
  public animateCardToPosition(
    card: CardComponent,
    targetPosition: { x: number; y: number },
    delay: number = 0
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // 如果卡牌已经在动画中，等待之前的动画完成
      if (this.animationPromises.has(card)) {
        this.animationPromises.get(card)!.then(() => {
          this.startCardAnimation(card, targetPosition, delay, resolve, reject);
        });
      } else {
        this.startCardAnimation(card, targetPosition, delay, resolve, reject);
      }
    });
  }

  /**
   * 开始单张卡牌的动画
   */
  private startCardAnimation(
    card: CardComponent,
    targetPosition: { x: number; y: number },
    delay: number,
    resolve: () => void,
    reject: (error: any) => void
  ): void {
    // 确保卡牌在stock位置可见
    card.setVisible(true);
    
    // 设置动画期间的高深度值，确保正在动画的卡牌在最上层
    card.setDepth(1000 + delay / 10); // 使用高深度值，确保动画卡牌不被遮挡

    console.log(`🎮 AnimationController: Starting animation for card ${card.suit}${card.value} from (${card.x}, ${card.y}) to (${targetPosition.x}, ${targetPosition.y})`);

    // 创建移动动画
    const tween = this.scene.tweens.add({
      targets: card,
      x: targetPosition.x,
      y: targetPosition.y,
      duration: this.config.cardMoveSpeed,
      delay: delay,
      ease: this.config.easeFunction,
      onStart: () => {
        this.activeTweens.add(tween);
        console.log(`🎮 AnimationController: Animation started for card ${card.suit}${card.value}`);
        
        // 记录动画Promise
        const promise = new Promise<void>((res) => {
          tween.once('complete', res);
        });
        this.animationPromises.set(card, promise);
      },
      onComplete: () => {
        // 恢复正常深度（基于Y坐标）
        card.setDepth(targetPosition.y);
        
        console.log(`🎮 AnimationController: Animation completed for card ${card.suit}${card.value} at (${card.x}, ${card.y})`);
        
        // 清理动画记录
        this.activeTweens.delete(tween);
        this.animationPromises.delete(card);
        
        resolve();
      },
      onStop: () => {
        // 动画被停止时也要清理
        this.activeTweens.delete(tween);
        this.animationPromises.delete(card);
        reject(new Error('Animation stopped'));
      }
    });
  }

  /**
   * 批量动画多张卡牌
   */
  public async animateCards(animationData: CardAnimationData[]): Promise<void> {
    const promises = animationData.map(data => 
      this.animateCardToPosition(data.card, data.targetPosition, data.delay)
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      console.warn('Some card animations were interrupted:', error);
    }
  }

  /**
   * 停止所有活跃的动画
   */
  public stopAllAnimations(): void {
    this.activeTweens.forEach(tween => {
      tween.stop();
    });
    this.activeTweens.clear();
    this.animationPromises.clear();
  }

  /**
   * 立即将所有卡牌移动到最终位置（跳过动画时使用）
   */
  public snapCardsToFinalPositions(cards: CardComponent[], getTargetPosition: (card: CardComponent) => { x: number; y: number }): void {
    cards.forEach(card => {
      const targetPos = getTargetPosition(card);
      card.setPosition(targetPos.x, targetPos.y);
      card.setDepth(targetPos.y);
      card.setVisible(true);
    });
  }

  /**
   * 批量更新卡牌深度（性能优化）
   */
  public batchUpdateDepth(cards: CardComponent[]): void {
    // 收集所有需要更新的深度值
    const depthUpdates = cards.map(card => ({
      card,
      depth: card.y
    }));

    // 一次性批量更新，减少渲染调用
    depthUpdates.forEach(({ card, depth }) => {
      card.setDepth(depth);
    });
  }

  /**
   * 获取当前活跃的动画数量
   */
  public getActiveAnimationCount(): number {
    return this.activeTweens.size;
  }

  /**
   * 检查是否有动画正在进行
   */
  public isAnimating(): boolean {
    return this.activeTweens.size > 0;
  }

  /**
   * 更新动画配置
   */
  public updateConfig(newConfig: Partial<DealAnimationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    this.stopAllAnimations();
    this.activeTweens.clear();
    this.animationPromises.clear();
  }
}