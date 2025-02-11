import React, { useEffect } from "react";

import { EventBus } from "./game/EventBus";
const Sound: React.FC = () => {
    useEffect(() => {
        
        document.addEventListener('touchstart', () => {
        })
        document.addEventListener('click', () => {
        })
        EventBus.on('showAd', () => {
        });
        EventBus.on('pauseAd', () => {
        });
    }, []);

    return <></>
}

export default Sound;