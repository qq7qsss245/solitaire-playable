import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './game/PhaserGame';
import './index.css';
import { EventBus } from './game/EventBus';
import Sound from './sound';
import { Start } from './viewable-handler';
import bgPortrait from './assets/images/backgrounds/bg-portrait.png';
import bgLandscape from './assets/images/backgrounds/bg-landscape.png';

function App() {
    // The sprite can only be moved in the MainMenu Scene
    const [gameOver, setGameOver] = useState(false);
    const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    // 检测屏幕方向
    const checkOrientation = () => {
        const isLandscapeMode = window.innerWidth > window.innerHeight;
        setIsLandscape(isLandscapeMode);
    };

    useEffect(() => {
        EventBus.once('game-over', () => {
            setGameOver(true);
        });
        Start();

        // 初始检测屏幕方向
        checkOrientation();

        // 监听屏幕方向变化
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        // 清理事件监听器
        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    // Event emitted from the PhaserGame component
    const currentScene = (scene: Phaser.Scene) => {

    }

    // 根据屏幕方向选择背景图片
    const currentBgImage = isLandscape ? bgLandscape : bgPortrait;

    return (
        <div id="app" style={{
            width: '100vw',
            height: '100vh',
            backgroundImage: `url(${currentBgImage})`,
            backgroundSize: '100% 100%', // 强制拉伸覆盖整个页面
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            display: 'flex',
            justifyContent: 'center'
        }}>
            <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
            <Sound />
        </div>
    )
}

export default App
