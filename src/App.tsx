import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './game/PhaserGame';
import './index.css';
import { EventBus } from './game/EventBus';
import Sound from './sound';
import { Start } from './viewable-handler';
import bgImage from './assets/bg.png';

function App() {
    // The sprite can only be moved in the MainMenu Scene
    const [gameOver, setGameOver] = useState(false);
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
        <div id="app" style={{
            width: '100vw',
            height: '100vh',
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#006400', // 深绿色作为备用背景色
            display: 'flex',
            justifyContent: 'center'
        }}>
            <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
            <Sound />
        </div>
    )
}

export default App
