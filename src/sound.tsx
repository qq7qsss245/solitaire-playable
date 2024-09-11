import React, { useEffect, useRef } from "react";
import bgm from './assets/c_002.mp3';
import pong from './assets/c_000.mp3';
import clear from './assets/c_001.mp3';
import { EventBus } from "./game/EventBus";

const Sound: React.FC = () => {
    useEffect(() => {
        const bgmEffect = new Audio(bgm);
        bgmEffect.loop = true;
        const clearEffect = new Audio(clear);
        EventBus.on('clear', () => {
            clearEffect.play();
        });
        EventBus.on('pong', () => {
            const pongEffect = new Audio(pong);
            pongEffect.play();
        });
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