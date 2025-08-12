import { Scene } from 'phaser';
import { Card as CardComponent } from '../components/Card';
import { AnimationController } from './AnimationController';
import { 
  DealAnimationConfig, 
  CardAnimationData, 
  AnimationEventData,
  DEFAULT_DEAL_CONFIG 
} from './types/DealAnimationTypes';
import { EventBus } from '../EventBus';

/**
 * 卡牌发牌时序控制器 - 负责按行发牌的时序控制逻辑
 */
export class CardDealSequencer {
  private scene: Scene;
  private animationController: AnimationController;
  private config: DealAnimationConfig;
  private isSequenceRunning: boolean = false;
  private currentRowIndex: number = 0;

  constructor(
    scene: Scene, 
    animationController: AnimationController,
    config: DealAnimationConfig = DEFAULT_DEAL_CONFIG
  ) {
    this.scene = scene;
    this.animationController = animationController;
    this.config = config;
  }

  /**
   * 开始发牌序列
   */
  public async startDealSequence(): Promise<void> {
    if (this.isSequenceRunning) {
      console.warn('Deal sequence is already running');
      return;
    }

    this.isSequenceRunning = true;
    this.currentRowIndex = 0;

    try {
      // 触发动画开始事件
      this.emitAnimationEvent('animation-start', { totalRows: 7 });

      // 按行发牌：从上到下，每行发该行应该有的卡牌
      // 第1行：每列的第1张卡牌（7张）
      // 第2行：第2-7列的第2张卡牌（6张）
      // 第3行：第3-7列的第3张卡牌（5张）
      // ...
      // 第7行：第7列的第7张卡牌（1张）
      for (let rowIndex = 0; rowIndex < 7; rowIndex++) {
        this.currentRowIndex = rowIndex;
        
        // 触发行开始事件
        this.emitAnimationEvent('row-start', { rowIndex, totalRows: 7 });
        
        await this.dealRow(rowIndex);
        
        // 触发行完成事件
        this.emitAnimationEvent('row-complete', { rowIndex, totalRows: 7 });
        
        // 行间延迟（最后一行不需要延迟）
        if (rowIndex < 6) {
          await this.wait(this.config.rowDelay);
        }
      }

      // 触发动画完成事件
      this.emitAnimationEvent('animation-complete', { totalRows: 7 });

    } catch (error) {
      console.error('Deal sequence error:', error);
      throw error;
    } finally {
      this.isSequenceRunning = false;
    }
  }

  /**
   * 发牌到指定行
   */
  private async dealRow(rowIndex: number): Promise<void> {
    const animationData: CardAnimationData[] = [];

    // 计算该行需要发牌的列数
    // 第0行：发第0-6列的第0张卡牌（7张）
    // 第1行：发第1-6列的第1张卡牌（6张）
    // 第2行：发第2-6列的第2张卡牌（5张）
    // ...
    // 第6行：发第6列的第6张卡牌（1张）
    const startColumn = rowIndex;
    const endColumn = 6;
    
    let cardIndex = 0;
    for (let columnIndex = startColumn; columnIndex <= endColumn; columnIndex++) {
      const card = this.getCardForPosition(rowIndex, columnIndex);
      
      if (!card) {
        console.warn(`Card not found for position [row:${rowIndex}, col:${columnIndex}]`);
        continue;
      }

      const targetPosition = this.calculateTargetPosition(rowIndex, columnIndex);
      const delay = cardIndex * this.config.cardStaggerDelay;

      animationData.push({
        card,
        startPosition: this.getStockPosition(),
        targetPosition,
        rowIndex,
        columnIndex,
        delay
      });
      
      cardIndex++;
    }

    console.log(`🎮 CardDealSequencer: Dealing row ${rowIndex + 1}, ${animationData.length} cards`);

    // 执行该行所有卡牌的动画
    await this.animationController.animateCards(animationData);
  }

  /**
   * 获取指定位置的卡牌
   */
  private getCardForPosition(rowIndex: number, columnIndex: number): CardComponent | null {
    try {
      // 从Game场景获取tableau数据
      const gameScene = this.scene as any; // 类型断言，因为我们知道这是Game场景
      
      if (!gameScene.tableau || !gameScene.tableau[columnIndex]) {
        console.warn(`Tableau column ${columnIndex} not found`);
        return null;
      }

      const column = gameScene.tableau[columnIndex];
      if (!column.cards || !column.cards[rowIndex]) {
        console.warn(`Card not found at tableau[${columnIndex}][${rowIndex}]`);
        return null;
      }

      return column.cards[rowIndex];
    } catch (error) {
      console.error(`Error getting card for position [${rowIndex}, ${columnIndex}]:`, error);
      return null;
    }
  }

  /**
   * 计算目标位置
   */
  private calculateTargetPosition(rowIndex: number, columnIndex: number): { x: number; y: number } {
    const gameScene = this.scene as any;
    const layout = gameScene.currentLayout;

    if (!layout || !layout.tableau) {
      console.error('Layout or tableau layout not found');
      return { x: 0, y: 0 };
    }

    return {
      x: layout.tableau.startX + columnIndex * layout.tableau.columnGap,
      y: layout.tableau.startY + rowIndex * layout.tableau.cardGap
    };
  }

  /**
   * 获取stock位置
   */
  private getStockPosition(): { x: number; y: number } {
    const gameScene = this.scene as any;
    const layout = gameScene.currentLayout;

    if (!layout || !layout.stock) {
      console.error('Layout or stock layout not found');
      return { x: 0, y: 0 };
    }

    return {
      x: layout.stock.x,
      y: layout.stock.y
    };
  }

  /**
   * 等待指定时间
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.scene.time.delayedCall(ms, resolve);
    });
  }

  /**
   * 触发动画事件
   */
  private emitAnimationEvent(type: string, data: Partial<AnimationEventData> = {}): void {
    const eventData: AnimationEventData = {
      type: type as any,
      ...data
    };
    
    EventBus.emit(`deal-${type}`, eventData);
  }

  /**
   * 停止发牌序列
   */
  public stopSequence(): void {
    this.isSequenceRunning = false;
    this.animationController.stopAllAnimations();
  }

  /**
   * 获取当前状态
   */
  public getSequenceState(): {
    isRunning: boolean;
    currentRow: number;
    totalRows: number;
    progress: number;
  } {
    return {
      isRunning: this.isSequenceRunning,
      currentRow: this.currentRowIndex,
      totalRows: 7,
      progress: this.isSequenceRunning ? (this.currentRowIndex + 1) / 7 : 0
    };
  }

  /**
   * 立即完成发牌序列（跳过时使用）
   */
  public completeSequenceImmediately(): void {
    this.stopSequence();
    
    // 获取所有需要移动的卡牌
    const allCards: CardComponent[] = [];
    const gameScene = this.scene as any;

    for (let rowIndex = 0; rowIndex < 7; rowIndex++) {
      for (let columnIndex = 0; columnIndex <= rowIndex; columnIndex++) {
        const card = this.getCardForPosition(rowIndex, columnIndex);
        if (card) {
          allCards.push(card);
        }
      }
    }

    // 立即移动所有卡牌到最终位置
    this.animationController.snapCardsToFinalPositions(
      allCards,
      (card) => {
        // 找到卡牌在tableau中的位置
        for (let rowIndex = 0; rowIndex < 7; rowIndex++) {
          for (let columnIndex = 0; columnIndex <= rowIndex; columnIndex++) {
            if (this.getCardForPosition(rowIndex, columnIndex) === card) {
              return this.calculateTargetPosition(rowIndex, columnIndex);
            }
          }
        }
        return { x: 0, y: 0 };
      }
    );

    // 触发完成事件
    this.emitAnimationEvent('animation-complete', { totalRows: 7 });
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<DealAnimationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    this.stopSequence();
  }
}