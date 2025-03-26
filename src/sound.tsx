import React, { useEffect, useState } from "react";

// 导入音频文件
import bgmAudio from './assets/audios/bgm.mp3';
import bigAudio from './assets/audios/big.mp3';
import clickAudio from './assets/audios/click.mp3';
import dealAudio from './assets/audios/deal.mp3';
import fillAudio from './assets/audios/fill.mp3';
import moveAudio from './assets/audios/move.mp3';
import popupAudio from './assets/audios/popup.mp3';
import missAudio from './assets/audios/miss.mp3';
import { EventBus } from "./game/EventBus";

// 定义音频事件类型
type AudioEventName = 'play-bgm' | 'play-big' | 'play-click' | 'play-deal' | 'play-fill' | 'play-move' | 'play-popup' | 'play-miss';

// 音频类型映射
const AUDIO_MAP: Record<AudioEventName, string> = {
    'play-bgm': bgmAudio,
    'play-big': bigAudio,
    'play-click': clickAudio,
    'play-deal': dealAudio,
    'play-fill': fillAudio,
    'play-move': moveAudio,
    'play-popup': popupAudio,
    'play-miss': missAudio
};

// 音频缓存，预加载所有音效
const AUDIO_CACHE: Record<AudioEventName, HTMLAudioElement[]> = {
    'play-bgm': [],
    'play-big': [],
    'play-click': [],
    'play-deal': [],
    'play-fill': [],
    'play-move': [],
    'play-popup': [],
    'play-miss': []   // 添加miss音效缓存
};

// 每种音效缓存的实例数量
const INSTANCES_COUNT: Record<AudioEventName, number> = {
    'play-bgm': 1,  // 背景音乐只需要一个实例
    'play-big': 3,  // 其他音效缓存多个实例以支持重叠播放
    'play-click': 3,
    'play-deal': 5, // deal音效可能频繁触发，多缓存几个
    'play-fill': 3,
    'play-move': 5, // 移动音效也较频繁
    'play-popup': 3,
    'play-miss': 5   // miss音效可能频繁触发，多缓存几个实例
};

// 全局音频状态
let isSoundEnabled = true; // 默认开启音效
let bgmAudioInstance: HTMLAudioElement | null = null;

// 从缓存中获取一个可用的音频实例
const getAudioFromCache = (eventName: AudioEventName): HTMLAudioElement | null => {
    const cache = AUDIO_CACHE[eventName];
    if (!cache || cache.length === 0) return null;
    
    // 查找一个当前未播放的实例
    for (const audio of cache) {
        if (audio.paused || audio.ended) {
            // 重置播放位置
            audio.currentTime = 0;
            return audio;
        }
    }
    
    // 如果所有实例都在播放中，返回第一个（最早开始播放的可能已经接近结束）
    const audio = cache[0];
    audio.currentTime = 0; // 重置到开始位置
    return audio;
};

// 预加载所有音频
const preloadAudios = () => {
    console.log("开始预加载所有音频...");
    
    (Object.keys(AUDIO_MAP) as AudioEventName[]).forEach(eventName => {
        const count = INSTANCES_COUNT[eventName];
        console.log(`预加载 ${eventName}: ${count} 个实例`);
        
        for (let i = 0; i < count; i++) {
            const audio = new Audio(AUDIO_MAP[eventName]);
            audio.preload = "auto";
            
            // 对于背景音乐特殊处理
            if (eventName === 'play-bgm') {
                audio.loop = true;
                bgmAudioInstance = audio; // 保存背景音乐实例
            }
            
            // 设置加载事件
            audio.addEventListener('canplaythrough', () => {
                console.log(`${eventName} 音频实例 #${i+1} 已加载完成`);
            }, { once: true });
            
            // 添加到缓存
            AUDIO_CACHE[eventName].push(audio);
            
            // 触发预加载（但不播放）
            audio.load();
        }
    });
};

const Sound: React.FC = () => {
    useEffect(() => {
        // 获取MRAID环境
        const mraid = (window as any).mraid;

        // 检查MRAID是否可用
        if (mraid) {
            // 监听viewable事件
            mraid.addEventListener('viewableChange', (viewable: boolean) => {
                isSoundEnabled = viewable;
                
                // 处理背景音乐
                if (bgmAudioInstance) {
                    if (viewable) {
                        bgmAudioInstance.play().catch((error) => {
                            console.log("BGM播放失败:", error);
                        });
                    } else {
                        bgmAudioInstance.pause();
                    }
                }
            });

            // 初始状态
            isSoundEnabled = mraid.isViewable();
        } else {
            // 非MRAID环境，默认启用音效
            console.log("非MRAID环境，默认启用音效");
            isSoundEnabled = true;
        }

        // 预加载所有音频
        preloadAudios();

        // 监听所有音频事件
        (Object.keys(AUDIO_MAP) as AudioEventName[]).forEach(eventName => {
            EventBus.on(eventName, () => {
                // 只有在可见且允许声音时才播放
                if (!isSoundEnabled) return;

                if (eventName === 'play-bgm') {
                    // 背景音乐特殊处理：使用预加载的实例
                    if (bgmAudioInstance) {
                        console.log("尝试播放背景音乐");
                        bgmAudioInstance.play().catch((error) => {
                            console.error("背景音乐播放失败:", error);
                            // 在用户首次交互时尝试再次播放
                            document.addEventListener('click', function bgmPlayHandler() {
                                if (bgmAudioInstance) {
                                    bgmAudioInstance.play().catch(e => console.error("交互后播放BGM失败:", e));
                                    document.removeEventListener('click', bgmPlayHandler);
                                }
                            }, { once: true });
                        });
                    }
                } else {
                    // 从缓存获取预加载的音效
                    const audio = getAudioFromCache(eventName);
                    if (audio) {
                        console.log(`播放预加载的音效: ${eventName}`);
                        audio.play().catch((error) => {
                            console.error(`音效 ${eventName} 播放失败:`, error);
                        });
                    } else {
                        // 回退到创建新实例（应该不会发生，除非缓存出问题）
                        console.warn(`未找到预加载的音效 ${eventName}，创建新实例`);
                        const newAudio = new Audio(AUDIO_MAP[eventName]);
                        newAudio.play().catch((error) => {
                            console.error(`音效 ${eventName} 播放失败:`, error);
                        });
                    }
                }
            });
        });

        // 添加对游戏暂停和恢复事件的监听
        EventBus.on('pauseAd', () => {
            console.log('游戏暂停，暂停所有音频');
            if (bgmAudioInstance) {
                bgmAudioInstance.pause();
            }
        });

        EventBus.on('showAd', () => {
            console.log('游戏恢复，尝试恢复背景音乐');
            if (bgmAudioInstance && isSoundEnabled) {
                bgmAudioInstance.play().catch(error => {
                    console.error('恢复背景音乐失败:', error);
                });
            }
        });

        // 添加一个全局的点击事件监听器，确保用户交互后可以播放音频
        const handleUserInteraction = () => {
            console.log('检测到用户交互，尝试初始化音频');
            if (isSoundEnabled && bgmAudioInstance) {
                bgmAudioInstance.play().catch(e => console.error('用户交互后初始化音频失败:', e));
            }
        };

        document.addEventListener('click', handleUserInteraction, { once: true });

        // 清理函数
        return () => {
            if (bgmAudioInstance) {
                bgmAudioInstance.pause();
                bgmAudioInstance = null;
            }
            
            // 移除所有事件监听器
            if (mraid) {
                mraid.removeEventListener('viewableChange');
            }
            
            EventBus.off('pauseAd');
            EventBus.off('showAd');
            document.removeEventListener('click', handleUserInteraction);
            
            // 移除所有音频事件监听器
            Object.keys(AUDIO_MAP).forEach(eventName => {
                EventBus.off(eventName);
            });
        };
    }, []);

    return <></>;
}

export default Sound;