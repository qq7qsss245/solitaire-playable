import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './game/PhaserGame';
import Bg from '@/assets/bg.png';
import './index.css';
import { Start } from './game/scenes/constants/viewable-handler';
import store from '@/store';
import Sound from './sound';
import PopUp from './game/components/popup';

const { Provider } = store;

function App() {
    // The sprite can only be moved in the MainMenu Scene

    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    useEffect(() => {
        Start();
    }, []);

    return (
        <Provider>
            <div id="app" style={{ backgroundImage: `url('${Bg}')` }}>
                <PhaserGame ref={phaserRef} />
            </div>
            <Sound/>
            <PopUp/>
        </Provider>

    )
}

export default App
