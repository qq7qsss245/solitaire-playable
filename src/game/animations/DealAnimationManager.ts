import { Scene } from 'phaser';
import { Card as CardComponent } from '../components/Card';
import { AnimationController } from './AnimationController';
import { CardDealSequencer } from './CardDealSequencer';
import { InteractionController } from './InteractionController';
import { PerformanceMonitor } from './PerformanceMonitor';
import {
  DealAnimationConfig,
  AnimationState,
  DEFAULT_DEAL_CONFIG,
  DEFAULT_AUDIO_SYNC_CONFIG,
  AudioSyncConfig
} from './types/DealAnimationTypes';
import { EventBus } from '../EventBus';

/**
 * 发牌动画主管理器 - 整合所有动画组件，提供统一的接口
 */
export class DealAnimationManager {
  private scene: Scene;
  private config: DealAnimationConfig;
  private audioConfig: AudioSyncConfig;
  
  // 核心组件
  private animationController: AnimationController;
  private sequencer: CardDealSequencer;
  private interactionController: InteractionController;
  private performanceMonitor: PerformanceMonitor;
  
  // 状态管理
  private state: AnimationState;
  private isInitialized: boolean = false;

  constructor(
    scene: Scene, 
    config: Partial<DealAnimationConfig> = {},
    audioConfig: Partial<AudioSyncConfig> = {}
  ) {
    this.scene = scene;
    this.config = { ...DEFAULT_DEAL_CONFIG, ...config };
    this.audioConfig = { ...DEFAULT_AUDIO_SYNC_CONFIG, ...audioConfig };
    
    this.initializeState();
    this.initializeComponents();
    this.setupEventListeners();
    
    this.isInitialized = true;
    console.log('🎮 DealAnimationManager: Initialized successfully');
  }

  /**
   * 初始化动画状态
   */
  private initializeState(): void {
    this.state = {
      isPlaying: false,
      isSkipped: false,
      currentRow: 0,
      totalRows: 7,
      animatedCards: new Set<CardComponent>(),
      startTime: 0
    };
  }

  /**
   * 初始化组件
   */
  private initializeComponents(): void {
    // 创建性能监控器
    this.performanceMonitor = new PerformanceMonitor();
    
    // 根据设备性能优化配置
    const optimizedConfig = this.performanceMonitor.getOptimizedConfig();
    this.config = { ...this.config, ...optimizedConfig };
    
    console.log('🎮 DealAnimationManager: Using optimized config for device:', {
      capability: this.performanceMonitor.detectDeviceCapability(),
      config: this.config
    });
    
    // 创建动画控制器
    this.animationController = new AnimationController(this.scene, this.config);
    
    // 创建时序控制器
    this.sequencer = new CardDealSequencer(this.scene, this.animationController, this.config);
    
    // 创建交互控制器
    this.interactionController = new InteractionController(this.scene);
    
    // 设置跳过回调
    this.interactionController.addSkipCallback(() => {
      this.skipAnimation();
    });
    
    // 检查是否建议跳过动画
    if (this.performanceMonitor.shouldSkipAnimation()) {
      console.warn('🎮 DealAnimationManager: Low performance detected, consider skipping animation');
      // 可以在这里自动跳过动画或显示性能警告
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听行完成事件
    EventBus.on('deal-row-complete', (data: any) => {
      this.state.currentRow = data.rowIndex + 1;
      console.log(`🎮 DealAnimationManager: Row ${data.rowIndex + 1}/7 completed`);
    });

    // 监听动画完成事件
    EventBus.on('deal-animation-complete', () => {
      this.onAnimationComplete();
    });

    // 监听动画跳过事件
    EventBus.on('deal-animation-skipped', () => {
      console.log('🎮 DealAnimationManager: Animation skipped by user');
    });
  }

  /**
   * 开始发牌动画
   */
  public async startDealAnimation(): Promise<void> {
    if (this.state.isPlaying) {
      console.warn('Deal animation is already playing');
      return;
    }

    try {
      console.log('🎮 DealAnimationManager: Starting deal animation');
      
      // 1. 初始化动画状态
      this.state.isPlaying = true;
      this.state.isSkipped = false;
      this.state.currentRow = 0;
      this.state.startTime = Date.now();
      this.state.animatedCards.clear();

      // 2. 准备卡牌（设置初始位置和可见性）
      this.prepareCardsForAnimation();

      // 3. 启动交互控制
      this.interactionController.startDealAnimation();

      // 4. 播放音效
      this.playDealSound();

      // 5. 等待音效启动
      await this.wait(this.audioConfig.animationStartDelay);

      // 6. 检查是否已被跳过
      if (this.state.isSkipped) {
        return;
      }

      // 7. 等待动画开始延迟
      await this.wait(this.config.startDelay);

      // 8. 检查是否已被跳过
      if (this.state.isSkipped) {
        return;
      }

      // 9. 开始发牌序列
      await this.sequencer.startDealSequence();

      // 10. 等待结束延迟
      await this.wait(this.config.endDelay);

      // 11. 完成动画
      this.onAnimationComplete();

    } catch (error) {
      console.error('Deal animation error:', error);
      this.onAnimationError(error);
    }
  }

  /**
   * 跳过动画
   */
  public skipAnimation(): void {
    if (!this.state.isPlaying || this.state.isSkipped) {
      return;
    }

    console.log('🎮 DealAnimationManager: Skipping animation');
    
    this.state.isSkipped = true;

    // 1. 停止音效
    this.stopDealSound();

    // 2. 停止所有动画
    this.animationController.stopAllAnimations();
    this.sequencer.stopSequence();

    // 3. 立即完成发牌
    this.sequencer.completeSequenceImmediately();

    // 4. 完成动画
    this.onAnimationComplete();
  }

  /**
   * 准备卡牌进行动画
   */
  private prepareCardsForAnimation(): void {
    const gameScene = this.scene as any;
    
    // 优先从stockZone获取实际位置，如果不存在则使用layout配置
    let stockPosition;
    if (gameScene.stockZone) {
      stockPosition = {
        x: gameScene.stockZone.x,
        y: gameScene.stockZone.y
      };
      console.log('🎮 DealAnimationManager: Using stockZone position:', stockPosition);
    } else {
      stockPosition = gameScene.currentLayout?.stock;
      console.log('🎮 DealAnimationManager: Using layout stock position:', stockPosition);
    }

    if (!stockPosition) {
      console.error('Stock position not found in layout or stockZone');
      return;
    }

    console.log('🎮 DealAnimationManager: Current layout info:', {
      gameWidth: gameScene.currentLayout?.gameWidth,
      gameHeight: gameScene.currentLayout?.gameHeight,
      stockZoneExists: !!gameScene.stockZone,
      stockZonePosition: gameScene.stockZone ? { x: gameScene.stockZone.x, y: gameScene.stockZone.y } : null
    });

    // 遍历所有tableau卡牌，设置初始状态
    for (let columnIndex = 0; columnIndex < 7; columnIndex++) {
      const column = gameScene.tableau?.[columnIndex];
      if (!column || !column.cards) continue;

      column.cards.forEach((card: CardComponent, rowIndex: number) => {
        // 处理所有卡牌，不管是否应该显示（包括背面朝上的卡牌）
        // 设置初始位置为stock位置
        card.setPosition(stockPosition.x, stockPosition.y);
        
        // 让卡牌在stock位置可见，这样用户可以看到它们从stock飞出
        card.setVisible(true);
        
        // 设置初始深度值，按照发牌顺序递增，确保后发的牌在上层
        // 使用较高的基础值，为动画期间的更高深度值留出空间
        card.setDepth(500 + columnIndex * 10 + rowIndex);
        
        // 记录到动画卡牌集合
        this.state.animatedCards.add(card);
        
        console.log(`🎮 Prepared card [${rowIndex}, ${columnIndex}]: ${card.suit}${card.value}, faceUp: ${card.faceUp}, position: (${card.x}, ${card.y}), depth: ${card.depth}`);
      });
    }

    console.log(`🎮 DealAnimationManager: Prepared ${this.state.animatedCards.size} cards for animation`);
  }

  /**
   * 播放发牌音效
   */
  private playDealSound(): void {
    try {
      EventBus.emit('play-card-deal');
      console.log('🎮 DealAnimationManager: Deal sound triggered');
    } catch (error) {
      console.error('Error playing deal sound:', error);
    }
  }

  /**
   * 停止发牌音效
   */
  private stopDealSound(): void {
    try {
      // 注意：当前音效系统可能不支持停止，这里预留接口
      EventBus.emit('stop-card-deal');
    } catch (error) {
      console.warn('Error stopping deal sound:', error);
    }
  }

  /**
   * 动画完成处理
   */
  private onAnimationComplete(): void {
    if (!this.state.isPlaying) {
      return; // 避免重复调用
    }

    console.log('🎮 DealAnimationManager: Animation completed');
    
    // 1. 更新状态
    this.state.isPlaying = false;
    const duration = Date.now() - this.state.startTime;

    // 2. 结束交互控制
    this.interactionController.endDealAnimation();

    // 3. 清理动画状态
    this.cleanupAnimation();

    // 4. 触发完成事件
    EventBus.emit('deal-animation-complete', {
      duration,
      wasSkipped: this.state.isSkipped,
      totalCards: this.state.animatedCards.size
    });

    // 5. 教学系统集成
    this.handleTutorialIntegration();

    console.log(`🎮 DealAnimationManager: Animation finished in ${duration}ms, skipped: ${this.state.isSkipped}`);
  }

  /**
   * 动画错误处理
   */
  private onAnimationError(error: any): void {
    console.error('🎮 DealAnimationManager: Animation error:', error);
    
    // 强制结束动画
    this.state.isPlaying = false;
    this.interactionController.forceEnd();
    this.cleanupAnimation();
    
    // 触发错误事件
    EventBus.emit('deal-animation-error', { error });
  }

  /**
   * 清理动画状态
   */
  private cleanupAnimation(): void {
    // 确保所有卡牌都有正确的最终状态
    this.state.animatedCards.forEach(card => {
      // 恢复正常深度
      card.setDepth(card.y);
      // 确保卡牌可见
      card.setVisible(true);
    });

    // 清理动画卡牌集合
    this.state.animatedCards.clear();
  }

  /**
   * 教学系统集成处理
   */
  private handleTutorialIntegration(): void {
    const gameScene = this.scene as any;
    
    if (gameScene.isTutorialMode && gameScene.tutorialManager) {
      // 延迟启动教学，给用户时间观察牌局
      this.scene.time.delayedCall(800, () => {
        try {
          if (gameScene.tutorialManager && !gameScene.tutorialManager.isActive) {
            console.log('🎮 DealAnimationManager: Starting tutorial after deal animation');
            gameScene.tutorialManager.startTutorial();
          }
        } catch (error) {
          console.error('Error starting tutorial after deal animation:', error);
        }
      });
    }
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
   * 获取动画状态
   */
  public getAnimationState(): AnimationState {
    return { ...this.state };
  }

  /**
   * 检查动画是否正在进行
   */
  public isAnimationPlaying(): boolean {
    return this.state.isPlaying;
  }

  /**
   * 检查是否有活跃的动画（包括Tween动画）
   */
  public isAnimating(): boolean {
    return this.state.isPlaying || this.animationController.isAnimating();
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<DealAnimationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.animationController.updateConfig(this.config);
    this.sequencer.updateConfig(this.config);
  }

  /**
   * 设置是否允许跳过
   */
  public setAllowSkip(allow: boolean): void {
    this.interactionController.setAllowSkip(allow);
  }

  /**
   * 设置是否显示跳过提示
   */
  public setShowSkipHint(show: boolean): void {
    this.interactionController.setShowSkipHint(show);
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    if (!this.isInitialized) return;

    console.log('🎮 DealAnimationManager: Destroying');

    // 停止动画
    if (this.state.isPlaying) {
      this.skipAnimation();
    }

    // 清理组件
    this.animationController?.destroy();
    this.sequencer?.destroy();
    this.interactionController?.destroy();

    // 清理事件监听器
    EventBus.off('deal-row-complete');
    EventBus.off('deal-animation-complete');
    EventBus.off('deal-animation-skipped');

    // 重置状态
    this.isInitialized = false;
  }
}