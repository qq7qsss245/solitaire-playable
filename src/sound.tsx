import React, { useEffect, useRef } from "react";

// 导入音频文件
import bgmAudio from './assets/audio/bgm.mp3';
import cardFlipAudio from './assets/audio/card-flip.mp3';
import cardPlaceAudio from './assets/audio/card-place.mp3';
import cardDealAudio from './assets/audio/card-deal.mp3';
import slotPlaceAudio from './assets/audio/slot-place.mp3';
import victoryAudio from './assets/audio/victory.mp3';
import errorAudio from './assets/audio/error.mp3';
import { EventBus } from "./game/EventBus";

// 音频类型映射
const AUDIO_MAP: {
    [key: string]: string;
} = {
    'play-bgm': bgmAudio,
    'play-card-flip': cardFlipAudio,
    'play-card-place': cardPlaceAudio,
    'play-card-deal': cardDealAudio,
    'play-slot-place': slotPlaceAudio,
    'play-victory': victoryAudio,
    'play-error': errorAudio,
    
    // UI交互音效 - 使用更合适的音效
    'play-ui-click': cardFlipAudio, // UI按钮点击音效，使用翻牌音效
    'play-ui-success': cardFlipAudio, // UI操作成功音效，使用翻牌音效
    'play-step-complete': cardFlipAudio, // 教学步骤完成音效，使用翻牌音效
    'play-download-trigger': victoryAudio, // 下载触发音效，使用胜利音效
    
    // 为兼容性保留的别名
    'play-click': cardFlipAudio, // 点击音效改为使用翻牌音效
    'play-deal': cardDealAudio, // 发牌音效别名
    'play-move': cardPlaceAudio, // 移动音效使用卡牌放置音效
    'play-tutorial-complete': victoryAudio // 教学完成音效使用胜利音效
};

// 音频池管理类
class AudioPool {
    private pools: Map<string, HTMLAudioElement[]> = new Map();
    private maxPoolSize = 3; // 每种音效最多缓存3个实例
    
    getAudio(src: string): HTMLAudioElement {
        if (!this.pools.has(src)) {
            this.pools.set(src, []);
        }
        
        const pool = this.pools.get(src)!;
        
        // 查找可用的音频实例
        for (const audio of pool) {
            if (audio.paused || audio.ended) {
                audio.currentTime = 0;
                return audio;
            }
        }
        
        // 如果没有可用实例且池未满，创建新实例
        if (pool.length < this.maxPoolSize) {
            const audio = new Audio(src);
            audio.preload = 'auto';
            pool.push(audio);
            return audio;
        }
        
        // 池已满，返回第一个实例（强制重用）
        const audio = pool[0];
        audio.pause();
        audio.currentTime = 0;
        return audio;
    }
    
    cleanup(): void {
        this.pools.forEach(pool => {
            pool.forEach(audio => {
                audio.pause();
                audio.src = '';
            });
        });
        this.pools.clear();
    }
}

// 音频管理器类
class AudioManager {
    private isEnabled = false;
    private isMuted = false;
    private bgmInstance: HTMLAudioElement | null = null;
    private audioPool = new AudioPool();
    private mraid: any = null;
    private eventListeners: Map<string, () => void> = new Map();
    
    // BGM播放状态管理
    private bgmPlaying = false;
    private bgmAttempted = false;
    private userInteracted = false;
    private interactionListeners: (() => void)[] = [];
    
    constructor() {
        this.initializeMRAID();
        this.setupUserInteractionListeners();
    }
    
    private initializeMRAID(): void {
        try {
            this.mraid = (window as any).mraid;
            
            if (this.mraid) {
                // 检查MRAID状态
                if (this.mraid.getState() === 'loading') {
                    this.mraid.addEventListener('ready', () => {
                        this.setupMRAIDListeners();
                    });
                } else {
                    this.setupMRAIDListeners();
                }
            } else {
                // 非MRAID环境，默认启用音效
                this.isEnabled = true;
            }
        } catch (error) {
            console.warn('MRAID初始化失败:', error);
            // 降级处理：启用音效
            this.isEnabled = true;
        }
    }
    
    private setupMRAIDListeners(): void {
        if (!this.mraid) return;
        
        try {
            // 监听可见性变化
            const viewableChangeHandler = (viewable: boolean) => {
                this.isEnabled = viewable && !this.isMuted;
                this.handleBackgroundMusic();
            };
            
            this.mraid.addEventListener('viewableChange', viewableChangeHandler);
            
            // 设置初始状态
            this.isEnabled = this.mraid.isViewable() && !this.isMuted;
            
            // 监听音频状态变化（如果支持）
            if (typeof this.mraid.supports === 'function' && this.mraid.supports('audioVolumeChange')) {
                const audioVolumeChangeHandler = (volume: number) => {
                    this.isMuted = volume === 0;
                    this.isEnabled = this.mraid.isViewable() && !this.isMuted;
                    this.handleBackgroundMusic();
                };
                
                this.mraid.addEventListener('audioVolumeChange', audioVolumeChangeHandler);
            }
        } catch (error) {
            console.warn('MRAID事件监听器设置失败:', error);
            this.isEnabled = true;
        }
    }
    
    // 设置用户交互监听器
    private setupUserInteractionListeners(): void {
        const interactionEvents = ['click', 'touchstart', 'keydown', 'mousedown'];
        
        const handleUserInteraction = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                console.log('检测到用户交互');
                
                // 如果BGM还没有成功播放，尝试播放
                if (this.bgmAttempted && !this.bgmPlaying && this.bgmInstance) {
                    console.log('用户交互后重试BGM播放');
                    this.retryBGMPlayback();
                }
                
                // 移除交互监听器
                this.removeUserInteractionListeners();
            }
        };
        
        // 保存监听器引用以便后续移除
        this.interactionListeners = interactionEvents.map(() => handleUserInteraction);
        
        // 添加监听器到document
        interactionEvents.forEach((event, index) => {
            document.addEventListener(event, this.interactionListeners[index], { once: true, passive: true });
        });
    }
    
    // 移除用户交互监听器
    private removeUserInteractionListeners(): void {
        const interactionEvents = ['click', 'touchstart', 'keydown', 'mousedown'];
        
        interactionEvents.forEach((event, index) => {
            if (this.interactionListeners[index]) {
                document.removeEventListener(event, this.interactionListeners[index]);
            }
        });
        
        this.interactionListeners = [];
    }
    
    // 重试BGM播放
    private async retryBGMPlayback(): Promise<void> {
        if (!this.bgmInstance || this.bgmPlaying || !this.isEnabled) return;
        
        try {
            await this.bgmInstance.play();
            this.bgmPlaying = true;
            console.log('用户交互后BGM播放成功');
        } catch (error) {
            console.warn('用户交互后BGM播放仍然失败:', error);
        }
    }
    
    // 自动播放BGM（游戏开始时调用）
    async tryAutoPlayBGM(): Promise<void> {
        if (!this.isEnabled || this.bgmAttempted) return;
        
        try {
            // 尝试自动播放BGM
            await this.playBGM(AUDIO_MAP['play-bgm']);
        } catch (error) {
            console.log('自动播放BGM失败，等待用户交互');
        }
    }
    
    private handleBackgroundMusic(): void {
        if (!this.bgmInstance) return;
        
        try {
            if (this.isEnabled) {
                this.bgmInstance.play().then(() => {
                    this.bgmPlaying = true;
                    console.log('背景音乐播放成功');
                }).catch(error => {
                    console.warn('背景音乐播放失败:', error);
                    this.bgmPlaying = false;
                });
            } else {
                this.bgmInstance.pause();
                this.bgmPlaying = false;
            }
        } catch (error) {
            console.warn('背景音乐控制失败:', error);
            this.bgmPlaying = false;
        }
    }
    
    private async createBGMInstance(src: string): Promise<HTMLAudioElement> {
        return new Promise((resolve, reject) => {
            const audio = new Audio(src);
            audio.loop = true;
            audio.preload = 'auto';
            
            const onCanPlay = () => {
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                resolve(audio);
            };
            
            const onError = () => {
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                reject(new Error('背景音乐加载失败'));
            };
            
            audio.addEventListener('canplaythrough', onCanPlay);
            audio.addEventListener('error', onError);
            
            // 设置超时
            setTimeout(() => {
                if (audio.readyState < 4) {
                    onError();
                }
            }, 5000);
        });
    }
    
    async playBGM(src: string): Promise<void> {
        if (!this.isEnabled) return;
        
        // 标记已尝试播放BGM
        this.bgmAttempted = true;
        
        try {
            if (!this.bgmInstance) {
                this.bgmInstance = await this.createBGMInstance(src);
            }
            
            if (this.bgmInstance.src !== src) {
                this.bgmInstance.src = src;
                await new Promise((resolve, reject) => {
                    const onCanPlay = () => {
                        this.bgmInstance!.removeEventListener('canplaythrough', onCanPlay);
                        this.bgmInstance!.removeEventListener('error', onError);
                        resolve(void 0);
                    };
                    
                    const onError = () => {
                        this.bgmInstance!.removeEventListener('canplaythrough', onCanPlay);
                        this.bgmInstance!.removeEventListener('error', onError);
                        reject(new Error('背景音乐切换失败'));
                    };
                    
                    this.bgmInstance!.addEventListener('canplaythrough', onCanPlay);
                    this.bgmInstance!.addEventListener('error', onError);
                });
            }
            
            await this.bgmInstance.play();
            this.bgmPlaying = true;
            console.log('BGM播放成功');
        } catch (error) {
            console.warn('背景音乐播放失败:', error);
            this.bgmPlaying = false;
            
            // 如果是因为浏览器自动播放策略失败，等待用户交互后重试
            if (error instanceof Error && error.name === 'NotAllowedError' && !this.userInteracted) {
                console.log('等待用户交互后重试BGM播放');
            }
        }
    }
    
    playSound(src: string): void {
        if (!this.isEnabled) return;
        
        try {
            const audio = this.audioPool.getAudio(src);
            audio.play().catch(error => {
                console.warn('音效播放失败:', error);
            });
        } catch (error) {
            console.warn('音效创建失败:', error);
        }
    }
    
    setupEventListeners(): void {
        Object.keys(AUDIO_MAP).forEach(eventName => {
            const handler = () => {
                if (eventName === 'play-bgm') {
                    this.playBGM(AUDIO_MAP[eventName]);
                } else {
                    this.playSound(AUDIO_MAP[eventName]);
                }
            };
            
            this.eventListeners.set(eventName, handler);
            EventBus.on(eventName, handler);
        });
    }
    
    cleanup(): void {
        // 清理事件监听器
        this.eventListeners.forEach((handler, eventName) => {
            EventBus.off(eventName, handler);
        });
        this.eventListeners.clear();
        
        // 清理用户交互监听器
        this.removeUserInteractionListeners();
        
        // 清理背景音乐
        if (this.bgmInstance) {
            this.bgmInstance.pause();
            this.bgmInstance.src = '';
            this.bgmInstance = null;
        }
        
        // 重置BGM状态
        this.bgmPlaying = false;
        this.bgmAttempted = false;
        this.userInteracted = false;
        
        // 清理音频池
        this.audioPool.cleanup();
        
        // 清理MRAID监听器
        if (this.mraid) {
            try {
                this.mraid.removeEventListener('viewableChange');
                if (typeof this.mraid.supports === 'function' && this.mraid.supports('audioVolumeChange')) {
                    this.mraid.removeEventListener('audioVolumeChange');
                }
            } catch (error) {
                console.warn('MRAID监听器清理失败:', error);
            }
        }
    }
}

// 全局音频管理器实例
let audioManager: AudioManager | null = null;

const Sound: React.FC = () => {
    const managerRef = useRef<AudioManager | null>(null);

    useEffect(() => {
        // 初始化音频管理器
        if (!managerRef.current) {
            managerRef.current = new AudioManager();
            audioManager = managerRef.current;
        }

        // 设置事件监听器
        managerRef.current.setupEventListeners();

        // 尝试自动播放BGM
        const tryAutoPlay = async () => {
            if (managerRef.current) {
                await managerRef.current.tryAutoPlayBGM();
            }
        };
        
        // 延迟一点时间确保音频管理器完全初始化
        setTimeout(tryAutoPlay, 100);

        // 清理函数
        return () => {
            if (managerRef.current) {
                managerRef.current.cleanup();
                managerRef.current = null;
                audioManager = null;
            }
        };
    }, []);

    return <></>;
}

// 导出音频管理器访问函数（可选，用于外部控制）
export const getAudioManager = (): AudioManager | null => audioManager;

// 导出音效控制函数
export const playSound = (eventName: string): void => {
    if (audioManager && AUDIO_MAP[eventName]) {
        if (eventName === 'play-bgm') {
            audioManager.playBGM(AUDIO_MAP[eventName]);
        } else {
            audioManager.playSound(AUDIO_MAP[eventName]);
        }
    }
};

// 导出BGM自动播放函数
export const tryAutoPlayBGM = (): void => {
    if (audioManager) {
        audioManager.tryAutoPlayBGM();
    }
};

// 导出静音控制函数
export const setMuted = (muted: boolean): void => {
    if (audioManager) {
        (audioManager as any).isMuted = muted;
        (audioManager as any).isEnabled = !(audioManager as any).mraid?.isViewable() === false || muted;
        (audioManager as any).handleBackgroundMusic();
    }
};

export default Sound;