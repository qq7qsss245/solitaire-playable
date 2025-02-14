import React, { useEffect } from "react";

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

const Sound: React.FC = () => {
    useEffect(() => {
        // 监听所有音频事件
        Object.keys(AUDIO_MAP).forEach(eventName => {
            EventBus.on(eventName, () => {
                console.log(eventName)
                const audio = new Audio(AUDIO_MAP[eventName] as string);
                audio.play(); //放音频  
            });
        });
    }, []);

    return <></>;
}

export default Sound;