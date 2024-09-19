import React, { useEffect, useRef } from "react";
import bgm from '@/assets/audios/bgm.mp3';
import popup from '@/assets/audios/popup.mp3';
import move from '@/assets/audios/move.mp3';
import fill from '@/assets/audios/fill.mp3';
import deal from '@/assets/audios/deal.mp3';
import click from '@/assets/audios/click.mp3';
import big from '@/assets/audios/big.mp3';
import { EventBus } from "./game/EventBus";

const Sound: React.FC = () => {
    useEffect(() => {
        const bgmEffect = new Audio(bgm);
        const popupEffect = new Audio(popup);
        const moveEffect = new Audio(move);
        const fillEffect = new Audio(fill);
        const dealEffect = new Audio(deal);
        const clickEffect = new Audio(click);
        const bigEffect = new Audio(big);
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
        EventBus.on('popup_show', () => {
            popupEffect.play();
        });
        EventBus.on('card_snapped', () => {
            moveEffect.play();
        });
        EventBus.on('rotate', () => {
            moveEffect.play();
        });
        EventBus.on('card_fill', () => {
            fillEffect.play();
        });
        EventBus.on('deal', () => {
            dealEffect.play();
        });
        EventBus.on('click', () => {
            clickEffect.play();
        });
        EventBus.on('change_big', () => {
            bigEffect.play();
        });
    }, []);

    return <></>
}

export default Sound;