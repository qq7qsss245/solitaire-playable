import { 
  DealAnimationConfig, 
  DeviceCapability, 
  PerformanceConfig,
  DEFAULT_DEAL_CONFIG,
  DEFAULT_PERFORMANCE_CONFIG 
} from './types/DealAnimationTypes';

/**
 * 性能监控器 - 检测设备性能并提供优化的动画配置
 */
export class PerformanceMonitor {
  private frameRate: number = 60;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsHistory: number[] = [];
  private deviceCapability: DeviceCapability | null = null;

  constructor() {
    this.startFPSMonitoring();
  }

  /**
   * 开始FPS监控
   */
  private startFPSMonitoring(): void {
    this.lastFrameTime = performance.now();
    this.monitorFrame();
  }

  /**
   * 监控帧率
   */
  private monitorFrame = (): void => {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    
    if (deltaTime > 0) {
      const currentFPS = 1000 / deltaTime;
      this.fpsHistory.push(currentFPS);
      
      // 保持最近30帧的记录
      if (this.fpsHistory.length > 30) {
        this.fpsHistory.shift();
      }
      
      // 计算平均帧率
      this.frameRate = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    }
    
    this.lastFrameTime = currentTime;
    this.frameCount++;
    
    // 继续监控（在动画期间）
    if (this.frameCount < 1000) { // 限制监控次数，避免无限循环
      requestAnimationFrame(this.monitorFrame);
    }
  };

  /**
   * 检测设备性能等级
   */
  public detectDeviceCapability(): DeviceCapability {
    if (this.deviceCapability) {
      return this.deviceCapability;
    }

    let score = 0;

    // 1. 检测是否为移动设备
    const isMobile = this.isMobileDevice();
    if (!isMobile) {
      score += 30; // 桌面设备加分
    }

    // 2. 检测CPU核心数
    const cores = navigator.hardwareConcurrency || 2;
    if (cores >= 8) {
      score += 25;
    } else if (cores >= 4) {
      score += 15;
    } else if (cores >= 2) {
      score += 5;
    }

    // 3. 检测内存（如果可用）
    const memory = (navigator as any).deviceMemory;
    if (memory) {
      if (memory >= 8) {
        score += 20;
      } else if (memory >= 4) {
        score += 15;
      } else if (memory >= 2) {
        score += 10;
      }
    } else {
      score += 10; // 默认分数
    }

    // 4. 检测GPU信息
    const gpuScore = this.detectGPUCapability();
    score += gpuScore;

    // 5. 检测屏幕分辨率
    const screenScore = this.getScreenScore();
    score += screenScore;

    // 根据总分确定设备等级
    if (score >= 70) {
      this.deviceCapability = 'high';
    } else if (score >= 40) {
      this.deviceCapability = 'medium';
    } else {
      this.deviceCapability = 'low';
    }

    console.log(`🎮 PerformanceMonitor: Device capability detected as '${this.deviceCapability}' (score: ${score})`);
    return this.deviceCapability;
  }

  /**
   * 检测是否为移动设备
   */
  private isMobileDevice(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * 检测GPU性能
   */
  private detectGPUCapability(): number {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
      
      if (!gl) {
        return 0; // 不支持WebGL
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        
        // 根据GPU信息评分
        if (renderer.includes('NVIDIA') || renderer.includes('AMD') || renderer.includes('Intel')) {
          if (renderer.includes('RTX') || renderer.includes('GTX') || renderer.includes('RX')) {
            return 15; // 高端GPU
          } else if (renderer.includes('GT') || renderer.includes('HD')) {
            return 10; // 中端GPU
          } else {
            return 5; // 低端GPU
          }
        } else if (renderer.includes('Adreno')) {
          // 高通GPU
          const adrenoMatch = renderer.match(/Adreno \(TM\) (\d+)/);
          if (adrenoMatch) {
            const model = parseInt(adrenoMatch[1]);
            if (model >= 600) return 10;
            if (model >= 500) return 8;
            if (model >= 400) return 5;
          }
          return 3;
        } else if (renderer.includes('Mali')) {
          // ARM Mali GPU
          return 3;
        } else if (renderer.includes('PowerVR')) {
          // PowerVR GPU
          return 3;
        }
      }

      return 5; // 默认WebGL支持分数
    } catch (error) {
      console.warn('GPU detection failed:', error);
      return 0;
    }
  }

  /**
   * 获取屏幕分辨率评分
   */
  private getScreenScore(): number {
    const width = window.screen.width;
    const height = window.screen.height;
    const pixels = width * height;

    if (pixels >= 2073600) { // 1920x1080及以上
      return 5;
    } else if (pixels >= 1228800) { // 1280x960及以上
      return 3;
    } else {
      return 1;
    }
  }

  /**
   * 获取当前FPS
   */
  public getCurrentFPS(): number {
    return this.frameRate;
  }

  /**
   * 获取优化的动画配置
   */
  public getOptimizedConfig(): DealAnimationConfig {
    const capability = this.detectDeviceCapability();
    const currentFPS = this.getCurrentFPS();

    // 根据设备性能和当前帧率调整配置
    switch (capability) {
      case 'low':
        return this.getLowPerformanceConfig();
      case 'medium':
        return currentFPS < 30 ? this.getLowPerformanceConfig() : this.getMediumPerformanceConfig();
      case 'high':
        return currentFPS < 45 ? this.getMediumPerformanceConfig() : this.getHighPerformanceConfig();
      default:
        return DEFAULT_DEAL_CONFIG;
    }
  }

  /**
   * 低性能设备配置
   */
  private getLowPerformanceConfig(): DealAnimationConfig {
    return {
      cardMoveSpeed: 200,      // 更快的动画，减少总时间
      rowDelay: 80,            // 更短的延迟
      cardStaggerDelay: 20,    // 减少错开时间
      easeFunction: 'Linear',  // 简单的缓动函数
      startDelay: 200,         // 减少开始延迟
      endDelay: 100            // 减少结束延迟
    };
  }

  /**
   * 中等性能设备配置
   */
  private getMediumPerformanceConfig(): DealAnimationConfig {
    return {
      cardMoveSpeed: 250,      // 适中的动画速度
      rowDelay: 120,           // 适中的延迟
      cardStaggerDelay: 40,    // 适中的错开时间
      easeFunction: 'Power2',  // 标准缓动函数
      startDelay: 350,         // 适中的开始延迟
      endDelay: 150            // 适中的结束延迟
    };
  }

  /**
   * 高性能设备配置
   */
  private getHighPerformanceConfig(): DealAnimationConfig {
    return {
      cardMoveSpeed: 400,      // 更平滑的动画
      rowDelay: 200,           // 更长的延迟，更有节奏感
      cardStaggerDelay: 80,    // 更明显的错开效果
      easeFunction: 'Back.easeOut', // 复杂的缓动函数
      startDelay: 600,         // 更长的开始延迟
      endDelay: 300            // 更长的结束延迟
    };
  }

  /**
   * 获取优化的性能配置
   */
  public getOptimizedPerformanceConfig(): PerformanceConfig {
    const capability = this.detectDeviceCapability();
    const currentFPS = this.getCurrentFPS();

    const config = { ...DEFAULT_PERFORMANCE_CONFIG };

    // 根据设备性能调整
    switch (capability) {
      case 'low':
        config.maxConcurrentAnimations = 3;
        config.enableGPUAcceleration = false;
        config.updateDepthBatching = true;
        break;
      case 'medium':
        config.maxConcurrentAnimations = 5;
        config.enableGPUAcceleration = true;
        config.updateDepthBatching = true;
        break;
      case 'high':
        config.maxConcurrentAnimations = 7;
        config.enableGPUAcceleration = true;
        config.updateDepthBatching = false; // 高性能设备可以实时更新
        break;
    }

    // 根据当前帧率进一步调整
    if (currentFPS < 30) {
      config.maxConcurrentAnimations = Math.min(config.maxConcurrentAnimations, 3);
      config.enableGPUAcceleration = false;
    }

    return config;
  }

  /**
   * 检查是否应该跳过动画
   */
  public shouldSkipAnimation(): boolean {
    const capability = this.detectDeviceCapability();
    const currentFPS = this.getCurrentFPS();

    // 在极低性能设备上建议跳过动画
    return capability === 'low' && currentFPS < 20;
  }

  /**
   * 获取性能报告
   */
  public getPerformanceReport(): {
    deviceCapability: DeviceCapability;
    currentFPS: number;
    isMobile: boolean;
    cores: number;
    memory?: number;
    recommendSkip: boolean;
  } {
    return {
      deviceCapability: this.detectDeviceCapability(),
      currentFPS: this.getCurrentFPS(),
      isMobile: this.isMobileDevice(),
      cores: navigator.hardwareConcurrency || 2,
      memory: (navigator as any).deviceMemory,
      recommendSkip: this.shouldSkipAnimation()
    };
  }

  /**
   * 重置监控
   */
  public reset(): void {
    this.frameRate = 60;
    this.frameCount = 0;
    this.fpsHistory = [];
    this.deviceCapability = null;
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    this.fpsHistory = [];
    this.deviceCapability = null;
  }
}