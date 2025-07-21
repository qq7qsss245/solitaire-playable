import React, { useEffect, useState } from "react";

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
    // 为兼容性添加别名
    'play-click': cardPlaceAudio, // 点击音效使用卡牌放置音效
    'play-deal': cardDealAudio, // 发牌音效别名
    'play-move': cardPlaceAudio, // 移动音效使用卡牌放置音效
    'play-step-complete': cardPlaceAudio, // 步骤完成音效
    'play-tutorial-complete': victoryAudio // 教学完成音效使用胜利音效
};

// 全局音频状态
let isSoundEnabled = false;
let bgmAudioInstance: HTMLAudioElement | null = null;

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
                        bgmAudioInstance.play().catch(() => {});
                    } else {
                        bgmAudioInstance.pause();
                    }
                }
            });

            // 初始状态
            isSoundEnabled = mraid.isViewable();
        }

        // 监听所有音频事件
        Object.keys(AUDIO_MAP).forEach(eventName => {
            EventBus.on(eventName, () => {
                // 只有在可见且允许声音时才播放
                if (!isSoundEnabled) return;

                if (eventName === 'play-bgm') {
                    // 背景音乐特殊处理：循环播放
                    if (!bgmAudioInstance) {
                        bgmAudioInstance = new Audio(AUDIO_MAP[eventName]);
                        bgmAudioInstance.loop = true;
                    }
                    bgmAudioInstance.play().catch(() => {});
                } else {
                    // 其他音效
                    const audio = new Audio(AUDIO_MAP[eventName]);
                    audio.play().catch(() => {});
                }
            });
        });

        // 清理函数
        return () => {
            if (bgmAudioInstance) {
                bgmAudioInstance.pause();
                bgmAudioInstance = null;
            }
            if (mraid) {
                mraid.removeEventListener('viewableChange');
            }
        };
    }, []);

    return <></>;
}

export default Sound;