import { Card as CardComponent } from '../../components/Card';

/**
 * 发牌动画模式
 */
export enum DealAnimationMode {
  /** 逐行发牌模式（原始模式） */
  ROW_BY_ROW = 'row_by_row',
  /** 同时发牌模式（新模式） */
  SIMULTANEOUS = 'simultaneous'
}

/**
 * 发牌动画配置接口
 */
export interface DealAnimationConfig {
  /** 动画模式 */
  mode: DealAnimationMode;
  /** 单张卡牌移动速度 (ms) */
  cardMoveSpeed: number;
  /** 行与行之间的延迟 (ms) */
  rowDelay: number;
  /** 同行卡牌之间的微小延迟 (ms) */
  cardStaggerDelay: number;
  /** Phaser缓动函数名 */
  easeFunction: string;
  /** 动画开始前延迟 (ms) */
  startDelay: number;
  /** 动画结束后延迟 (ms) */
  endDelay: number;
}

/**
 * 卡牌动画数据接口
 */
export interface CardAnimationData {
  /** 要动画的卡牌 */
  card: CardComponent;
  /** 起始位置 */
  startPosition: { x: number; y: number };
  /** 目标位置 */
  targetPosition: { x: number; y: number };
  /** 行索引 (0-6) */
  rowIndex: number;
  /** 列索引 (0-6) */
  columnIndex: number;
  /** 动画延迟 (ms) */
  delay: number;
}

/**
 * 动画状态接口
 */
export interface AnimationState {
  /** 是否正在播放动画 */
  isPlaying: boolean;
  /** 是否已被跳过 */
  isSkipped: boolean;
  /** 当前正在动画的行 */
  currentRow: number;
  /** 总行数 */
  totalRows: number;
  /** 已动画的卡牌集合 */
  animatedCards: Set<CardComponent>;
  /** 动画开始时间 */
  startTime: number;
}

/**
 * 动画事件类型
 */
export type AnimationEventType = 
  | 'animation-start'
  | 'animation-complete'
  | 'animation-skipped'
  | 'row-complete'
  | 'row-start';

/**
 * 动画事件数据接口
 */
export interface AnimationEventData {
  type: AnimationEventType;
  rowIndex?: number;
  totalRows?: number;
  duration?: number;
}

/**
 * 性能配置接口
 */
export interface PerformanceConfig {
  /** 最大并发动画数量 */
  maxConcurrentAnimations: number;
  /** 是否使用对象池 */
  useObjectPool: boolean;
  /** 启用GPU加速 */
  enableGPUAcceleration: boolean;
  /** 批量更新深度 */
  updateDepthBatching: boolean;
  /** 动画期间禁用交互 */
  disableInteractionDuringAnim: boolean;
  /** 预加载动画资源 */
  preloadAnimationAssets: boolean;
  /** 动画后清理临时对象 */
  cleanupAfterAnimation: boolean;
}

/**
 * 设备性能等级
 */
export type DeviceCapability = 'low' | 'medium' | 'high';

/**
 * 音效同步配置接口
 */
export interface AudioSyncConfig {
  /** 音效启动延迟 (ms) */
  audioStartDelay: number;
  /** 动画启动延迟（相对于音效） (ms) */
  animationStartDelay: number;
  /** 是否在动画结束时淡出音效 */
  audioFadeOut: boolean;
  /** 淡出持续时间 (ms) */
  audioFadeOutDuration: number;
}

/**
 * 交互状态接口
 */
export interface InteractionState {
  /** 发牌动画是否正在播放 */
  isDealAnimationPlaying: boolean;
  /** 用户交互是否被阻止 */
  isUserInteractionBlocked: boolean;
  /** 是否允许跳过 */
  allowSkip: boolean;
  /** 是否显示跳过提示 */
  showSkipHint: boolean;
}

/**
 * 默认发牌动画配置
 */
export const DEFAULT_DEAL_CONFIG: DealAnimationConfig = {
  mode: DealAnimationMode.SIMULTANEOUS, // 默认使用同时发牌模式
  cardMoveSpeed: 300,          // 300ms每张卡牌
  rowDelay: 150,              // 行间延迟150ms
  cardStaggerDelay: 50,       // 同行卡牌50ms错开
  easeFunction: 'Power2',     // 平滑缓动
  startDelay: 500,           // 开始前0.5秒延迟
  endDelay: 200              // 结束后0.2秒延迟
};

/**
 * 默认性能配置
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  maxConcurrentAnimations: 7,       // 最多7张卡牌同时动画
  useObjectPool: true,              // 使用对象池减少GC
  enableGPUAcceleration: true,      // 启用GPU加速
  updateDepthBatching: true,        // 批量更新深度值
  disableInteractionDuringAnim: true, // 动画期间禁用用户交互
  preloadAnimationAssets: false,    // 不需要额外资源预加载
  cleanupAfterAnimation: true       // 清理动画临时数据
};

/**
 * 默认音效同步配置
 */
export const DEFAULT_AUDIO_SYNC_CONFIG: AudioSyncConfig = {
  audioStartDelay: 0,           // 立即播放音效
  animationStartDelay: 100,     // 音效播放100ms后开始动画
  audioFadeOut: true,           // 动画结束时淡出音效
  audioFadeOutDuration: 500     // 0.5秒淡出
};