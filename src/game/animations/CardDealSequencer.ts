import { Scene } from 'phaser';
import { Card as CardComponent } from '../components/Card';
import { AnimationController } from './AnimationController';
import {
  DealAnimationConfig,
  CardAnimationData,
  AnimationEventData,
  DEFAULT_DEAL_CONFIG,
  DealAnimationMode
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

      // 根据动画模式选择不同的发牌策略
      console.log('🎮 CardDealSequencer: Animation mode:', this.config.mode);
      if (this.config.mode === DealAnimationMode.SIMULTANEOUS) {
        console.log('🎮 CardDealSequencer: Using SIMULTANEOUS mode');
        await this.dealSimultaneous();
      } else if (this.config.mode === DealAnimationMode.CARD_BY_CARD) {
        console.log('🎮 CardDealSequencer: Using CARD_BY_CARD mode');
        await this.dealCardByCard();
      } else {
        console.log('🎮 CardDealSequencer: Using ROW_BY_ROW mode');
        await this.dealRowByRow();
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
   * 逐行发牌模式（原始模式）
   */
  private async dealRowByRow(): Promise<void> {
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
  }

  /**
   * 同时发牌模式（新模式）
   */
  private async dealSimultaneous(): Promise<void> {
    console.log('🎮 CardDealSequencer: Starting simultaneous deal mode');
    
    // 1. 准备所有卡牌的动画数据，所有卡牌都设为背面朝上
    const allAnimationData: CardAnimationData[] = [];
    
    for (let rowIndex = 0; rowIndex < 7; rowIndex++) {
      const startColumn = rowIndex;
      const endColumn = 6;
      
      for (let columnIndex = startColumn; columnIndex <= endColumn; columnIndex++) {
        const card = this.getCardForPosition(rowIndex, columnIndex);
        if (card) {
          // 确保卡牌是背面朝上
          card.setFaceUp(false);
          
          const targetPosition = this.calculateTargetPosition(rowIndex, columnIndex);
          const animationData: CardAnimationData = {
            card,
            startPosition: { x: card.x, y: card.y },
            targetPosition,
            rowIndex,
            columnIndex,
            delay: 0 // 所有卡牌同时开始
          };
          
          console.log(`🎮 CardDealSequencer: Card ${card.suit}${card.value} [${rowIndex},${columnIndex}] delay: ${animationData.delay}`);
          allAnimationData.push(animationData);
        }
      }
    }
    
    // 2. 同时开始所有卡牌的移动动画
    console.log(`🎮 CardDealSequencer: Starting ${allAnimationData.length} simultaneous animations`);
    await this.animationController.animateCards(allAnimationData);
    
    // 3. 动画完成后，翻开每列的最后一张卡牌（最下面的卡牌）
    console.log('🎮 CardDealSequencer: Flipping bottom cards');
    await this.flipBottomCards();
  }

  /**
   * 按张发牌模式（快速连续发牌）
   */
  private async dealCardByCard(): Promise<void> {
    console.log('🎮 CardDealSequencer: Starting card-by-card deal mode');
    
    // 1. 计算发牌序列（28张卡牌的顺序和延迟）
    const cardSequence = this.calculateCardByCardSequence();
    console.log(`🎮 CardDealSequencer: Card sequence calculated, ${cardSequence.length} cards`);
    
    // 2. 准备所有卡牌动画数据
    const allAnimationData: CardAnimationData[] = [];
    
    for (const sequenceItem of cardSequence) {
      const card = this.getCardForPosition(sequenceItem.rowIndex, sequenceItem.columnIndex);
      if (card) {
        // 确保卡牌是背面朝上
        card.setFaceUp(false);
        
        const targetPosition = this.calculateTargetPosition(sequenceItem.rowIndex, sequenceItem.columnIndex);
        const animationData: CardAnimationData = {
          card,
          startPosition: this.getStockPosition(),
          targetPosition,
          rowIndex: sequenceItem.rowIndex,
          columnIndex: sequenceItem.columnIndex,
          delay: sequenceItem.delay
        };
        
        console.log(`🎮 CardDealSequencer: Card ${card.suit}${card.value} [${sequenceItem.rowIndex},${sequenceItem.columnIndex}] delay: ${sequenceItem.delay}ms`);
        allAnimationData.push(animationData);
      }
    }
    
    // 3. 开始所有卡牌的动画（带不同延迟）
    console.log(`🎮 CardDealSequencer: Starting ${allAnimationData.length} card-by-card animations`);
    await this.animationController.animateCards(allAnimationData);
    
    // 4. 翻开每列的最后一张卡牌
    console.log('🎮 CardDealSequencer: Flipping bottom cards');
    await this.flipBottomCards();
  }

  /**
   * 计算按张发牌序列
   * 按行遍历，每行从该行的起始列开始，全局连续计数，每张卡牌延迟30ms
   */
  private calculateCardByCardSequence(): Array<{rowIndex: number, columnIndex: number, delay: number}> {
    const sequence: Array<{rowIndex: number, columnIndex: number, delay: number}> = [];
    let globalCardIndex = 0;
    
    // 按行遍历：
    // 第1行: (0,0), (0,1), (0,2), (0,3), (0,4), (0,5), (0,6) - 7张
    // 第2行: (1,1), (1,2), (1,3), (1,4), (1,5), (1,6) - 6张
    // 第3行: (2,2), (2,3), (2,4), (2,5), (2,6) - 5张
    // 第4行: (3,3), (3,4), (3,5), (3,6) - 4张
    // 第5行: (4,4), (4,5), (4,6) - 3张
    // 第6行: (5,5), (5,6) - 2张
    // 第7行: (6,6) - 1张
    
    for (let rowIndex = 0; rowIndex < 7; rowIndex++) {
      const startColumn = rowIndex;
      const endColumn = 6;
      
      for (let columnIndex = startColumn; columnIndex <= endColumn; columnIndex++) {
        const delay = globalCardIndex * this.config.cardByCardDelay;
        
        sequence.push({
          rowIndex,
          columnIndex,
          delay
        });
        
        console.log(`🎮 CardDealSequencer: Sequence[${globalCardIndex}]: Row ${rowIndex}, Col ${columnIndex}, Delay ${delay}ms`);
        globalCardIndex++;
      }
    }
    
    return sequence;
  }

  /**
   * 翻开每列的最后一张卡牌
   */
  private async flipBottomCards(): Promise<void> {
    const flipPromises: Promise<void>[] = [];
    
    for (let columnIndex = 0; columnIndex < 7; columnIndex++) {
      const bottomCard = this.getBottomCardForColumn(columnIndex);
      if (bottomCard) {
        // 添加延迟的翻牌动画
        const delayedFlipPromise = new Promise<void>((resolve) => {
          setTimeout(async () => {
            await this.animateCardFlip(bottomCard);
            resolve();
          }, columnIndex * this.config.flipDelay); // 使用配置的翻牌延迟
        });
        flipPromises.push(delayedFlipPromise);
      }
    }
    
    // 等待所有翻牌动画完成
    await Promise.all(flipPromises);
  }

  /**
   * 获取指定列的最后一张卡牌（最下面的卡牌）
   */
  private getBottomCardForColumn(columnIndex: number): CardComponent | null {
    const gameScene = this.scene as any;
    const column = gameScene.tableau?.[columnIndex];
    if (!column || !column.cards || column.cards.length === 0) {
      return null;
    }
    
    // 返回该列的最后一张卡牌
    return column.cards[column.cards.length - 1];
  }

  /**
   * 翻牌动画
   */
  private async animateCardFlip(card: CardComponent): Promise<void> {
    return new Promise<void>((resolve) => {
      // 创建翻牌动画：先缩小到0，然后翻面，再放大到原尺寸
      this.scene.tweens.add({
        targets: card,
        scaleX: 0,
        duration: 150,
        ease: 'Power2',
        onComplete: () => {
          // 翻面
          card.setFaceUp(true);
          
          // 放大回原尺寸
          this.scene.tweens.add({
            targets: card,
            scaleX: 1,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
              resolve();
            }
          });
        }
      });
    });
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
