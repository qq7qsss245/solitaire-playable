/**
 * 按钮配置文件
 * 独立的按钮样式配置，不依赖于布局初始化时序
 */

export interface ButtonConfig {
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  textColor: string;
  backgroundColor: number;
  borderColor: number;
  borderWidth: number;
  borderRadius: number;
}

export interface ButtonAnimationConfig {
  hoverScale: number;
  breathingScale: number;
  breathingDuration: number;
}

export interface FullButtonConfig {
  style: ButtonConfig;
  animation: ButtonAnimationConfig;
}

/**
 * 按钮配置常量
 */
export const BUTTON_CONFIG = {
  portrait: {
    style: {
      width: 160,
      height: 50,
      fontSize: 18,
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      textColor: '#00AA00', // 绿色文字
      backgroundColor: 0xffffff, // 白色背景
      borderColor: 0xcccccc, // 浅灰色边框
      borderWidth: 2,
      borderRadius: 25, // 胶囊形状：圆角半径为高度的一半
    },
    animation: {
      hoverScale: 1.05,
      breathingScale: 1.1,
      breathingDuration: 500,
    }
  } as FullButtonConfig,
  
  landscape: {
    style: {
      width: 180,
      height: 55,
      fontSize: 20,
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      textColor: '#00AA00', // 绿色文字
      backgroundColor: 0xffffff, // 白色背景
      borderColor: 0xcccccc, // 浅灰色边框
      borderWidth: 2,
      borderRadius: 27.5, // 胶囊形状：圆角半径为高度的一半
    },
    animation: {
      hoverScale: 1.05,
      breathingScale: 1.1,
      breathingDuration: 500,
    }
  } as FullButtonConfig
};

/**
 * 根据屏幕方向获取按钮配置
 * 使用安全的屏幕方向检测，不依赖于布局初始化
 */
export function getButtonConfig(): FullButtonConfig {
  // 使用 window.innerWidth / window.innerHeight 比例来判断横竖屏
  const isLandscape = window.innerWidth / window.innerHeight > 1;
  return isLandscape ? BUTTON_CONFIG.landscape : BUTTON_CONFIG.portrait;
}

/**
 * 获取按钮样式配置
 */
export function getButtonStyleConfig(): ButtonConfig {
  return getButtonConfig().style;
}

/**
 * 获取按钮动画配置
 */
export function getButtonAnimationConfig(): ButtonAnimationConfig {
  return getButtonConfig().animation;
}