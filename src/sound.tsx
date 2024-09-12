import React, { useEffect, useRef } from "react";
import bgm from '@/assets/audios/bgm.mp3';
import { EventBus } from "./game/EventBus";

const Sound: React.FC = () => {
    useEffect(() => {
        const bgmEffect = new Audio(bgm);
        bgmEffect.loop = true;
        window.addEventListener('touchstart', () => {
            setTimeout(() => {
                bgmEffect.play();
            }, 200)
        }, );
        window.addEventListener('click', () => {
            setTimeout(() => {
                bgmEffect.play();
            })
        });
        setTimeout(() => {
            bgmEffect.play();
        });
        EventBus.on('showAd', () => {
            bgmEffect.play();
        });
        EventBus.on('pauseAd', () => {
            bgmEffect.pause();
        });
    }, []);

    return <></>
}

export default Sound;