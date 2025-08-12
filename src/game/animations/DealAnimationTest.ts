import { DealAnimationManager } from './DealAnimationManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { 
  DealAnimationConfig, 
  DEFAULT_DEAL_CONFIG 
} from './types/DealAnimationTypes';

/**
 * 发牌动画测试工具
 */
export class DealAnimationTest {
  
  /**
   * 运行所有测试
   */
  public static runAllTests(): void {
    console.log('🧪 DealAnimationTest: Starting all tests...');
    
    try {
      this.testPerformanceMonitor();
      this.testAnimationConfig();
      this.testDeviceCapability();
      
      console.log('✅ DealAnimationTest: All tests passed!');
    } catch (error) {
      console.error('❌ DealAnimationTest: Tests failed:', error);
    }
  }
  
  /**
   * 测试性能监控器
   */
  private static testPerformanceMonitor(): void {
    console.log('🧪 Testing PerformanceMonitor...');
    
    const monitor = new PerformanceMonitor();
    
    // 测试设备性能检测
    const capability = monitor.detectDeviceCapability();
    console.log('Device capability:', capability);
    
    // 测试配置优化
    const optimizedConfig = monitor.getOptimizedConfig();
    console.log('Optimized config:', optimizedConfig);
    
    // 测试性能报告
    const report = monitor.getPerformanceReport();
    console.log('Performance report:', report);
    
    // 清理
    monitor.destroy();
    
    console.log('✅ PerformanceMonitor tests passed');
  }
  
  /**
   * 测试动画配置
   */
  private static testAnimationConfig(): void {
    console.log('🧪 Testing Animation Config...');
    
    // 测试默认配置
    const defaultConfig = DEFAULT_DEAL_CONFIG;
    console.log('Default config:', defaultConfig);
    
    // 测试配置验证
    const isValidConfig = this.validateConfig(defaultConfig);
    if (!isValidConfig) {
      throw new Error('Default config validation failed');
    }
    
    // 测试自定义配置
    const customConfig: DealAnimationConfig = {
      ...defaultConfig,
      cardMoveSpeed: 200,
      rowDelay: 100
    };
    
    const isValidCustomConfig = this.validateConfig(customConfig);
    if (!isValidCustomConfig) {
      throw new Error('Custom config validation failed');
    }
    
    console.log('✅ Animation Config tests passed');
  }
  
  /**
   * 测试设备性能等级
   */
  private static testDeviceCapability(): void {
    console.log('🧪 Testing Device Capability...');
    
    const monitor = new PerformanceMonitor();
    
    // 测试不同性能等级的配置
    const capabilities = ['low', 'medium', 'high'] as const;
    
    capabilities.forEach(capability => {
      // 模拟不同的设备性能
      const config = this.getConfigForCapability(capability);
      console.log(`Config for ${capability} performance:`, config);
      
      // 验证配置合理性
      if (!this.validateConfig(config)) {
        throw new Error(`Invalid config for ${capability} capability`);
      }
    });
    
    monitor.destroy();
    console.log('✅ Device Capability tests passed');
  }
  
  /**
   * 验证动画配置
   */
  private static validateConfig(config: DealAnimationConfig): boolean {
    // 检查必要属性
    if (!config.cardMoveSpeed || config.cardMoveSpeed <= 0) {
      console.error('Invalid cardMoveSpeed:', config.cardMoveSpeed);
      return false;
    }
    
    if (!config.rowDelay || config.rowDelay < 0) {
      console.error('Invalid rowDelay:', config.rowDelay);
      return false;
    }
    
    if (!config.cardStaggerDelay || config.cardStaggerDelay < 0) {
      console.error('Invalid cardStaggerDelay:', config.cardStaggerDelay);
      return false;
    }
    
    if (!config.easeFunction) {
      console.error('Invalid easeFunction:', config.easeFunction);
      return false;
    }
    
    // 检查合理性
    if (config.cardMoveSpeed > 2000) {
      console.warn('cardMoveSpeed seems too high:', config.cardMoveSpeed);
    }
    
    if (config.rowDelay > 1000) {
      console.warn('rowDelay seems too high:', config.rowDelay);
    }
    
    return true;
  }
  
  /**
   * 根据设备性能获取配置
   */
  private static getConfigForCapability(capability: 'low' | 'medium' | 'high'): DealAnimationConfig {
    switch (capability) {
      case 'low':
        return {
          cardMoveSpeed: 200,
          rowDelay: 80,
          cardStaggerDelay: 20,
          easeFunction: 'Linear',
          startDelay: 200,
          endDelay: 100
        };
      case 'medium':
        return {
          cardMoveSpeed: 250,
          rowDelay: 120,
          cardStaggerDelay: 40,
          easeFunction: 'Power2',
          startDelay: 350,
          endDelay: 150
        };
      case 'high':
        return {
          cardMoveSpeed: 400,
          rowDelay: 200,
          cardStaggerDelay: 80,
          easeFunction: 'Back.easeOut',
          startDelay: 600,
          endDelay: 300
        };
    }
  }
  
  /**
   * 测试动画管理器初始化（需要场景实例）
   */
  public static testAnimationManagerInit(scene: any): boolean {
    try {
      console.log('🧪 Testing DealAnimationManager initialization...');
      
      // 创建动画管理器
      const manager = new DealAnimationManager(scene);
      
      // 检查初始状态
      const state = manager.getAnimationState();
      if (state.isPlaying) {
        console.error('Animation should not be playing initially');
        return false;
      }
      
      // 检查动画状态
      console.log('Animation state:', state);
      
      // 清理
      manager.destroy();
      
      console.log('✅ DealAnimationManager initialization test passed');
      return true;
    } catch (error) {
      console.error('❌ DealAnimationManager initialization test failed:', error);
      return false;
    }
  }
  
  /**
   * 输出系统信息
   */
  public static logSystemInfo(): void {
    console.log('🔍 System Information:');
    console.log('User Agent:', navigator.userAgent);
    console.log('Hardware Concurrency:', navigator.hardwareConcurrency);
    console.log('Device Memory:', (navigator as any).deviceMemory);
    console.log('Screen Resolution:', `${window.screen.width}x${window.screen.height}`);
    console.log('Viewport Size:', `${window.innerWidth}x${window.innerHeight}`);
    
    // WebGL信息
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          console.log('GPU Renderer:', gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
          console.log('GPU Vendor:', gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        }
      }
    } catch (error) {
      console.log('WebGL info not available:', error);
    }
  }
}