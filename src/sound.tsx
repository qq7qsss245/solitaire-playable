import React, { useEffect } from "react";

import { EventBus } from "./game/EventBus";
const Sound: React.FC = () => {
    useEffect(() => {
        
        // 监听游戏声音事件
        EventBus.on('play-sound', (soundKey: string) => {
            const game = (window as any).game;
            if (game && game.sound) {
                game.sound.play(soundKey);
            }
        });
    }, []);

    return <></>
}

export default Sound;