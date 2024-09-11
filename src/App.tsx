import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './game/PhaserGame';
import Bg from '@/assets/a_011.png';
import './index.css';
import Sound from './sound';
import { Start } from './game/scenes/constants/viewable-handler';


function App() {
    // The sprite can only be moved in the MainMenu Scene

    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    useEffect(() => {
        Start();
    }, []);

    return (
        <div id="app" style={{ backgroundImage: `url('${Bg}')` }}>
            <PhaserGame ref={phaserRef} />
            <Sound/>
        </div>
    )
}

export default App
