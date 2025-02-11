import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './game/PhaserGame';
import './index.css';
import { EventBus } from './game/EventBus';
import Sound from './sound';
import { Start } from './viewable-handler';


function App() {
    // The sprite can only be moved in the MainMenu Scene

    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    useEffect(() => {
        EventBus.once('game-over', () => {
            setGameOver(true);
        });
        Start();
    }, []);



    // Event emitted from the PhaserGame component
    const currentScene = (scene: Phaser.Scene) => {


    }

    return (
        <div id="app">
            <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
            <Sound />
        </div>
    )
}

export default App
