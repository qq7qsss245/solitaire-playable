import React, { useEffect, useState } from "react";

// 导入音频文件
import bgmAudio from './assets/audios/bgm.mp3';
import bigAudio from './assets/audios/big.mp3';
import clickAudio from './assets/audios/click.mp3';
import dealAudio from './assets/audios/deal.mp3';
import fillAudio from './assets/audios/fill.mp3';
import moveAudio from './assets/audios/move.mp3';
import popupAudio from './assets/audios/popup.mp3';
import { EventBus } from "./game/EventBus";

// 音频类型映射
const AUDIO_MAP: {
    [key: string]: string;
} = {
    'play-bgm': bgmAudio,
    'play-big': bigAudio,
    'play-click': clickAudio,
    'play-deal': dealAudio,
    'play-fill': fillAudio,
    'play-move': moveAudio,
    'play-popup': popupAudio
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