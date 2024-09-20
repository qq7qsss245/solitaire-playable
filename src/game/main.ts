import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
// import { Game as MainGameLand } from './scenes/Game-LandScape';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1080,
    height: 1920,
    transparent: true,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT, // 缩放模式
        autoCenter: Phaser.Scale.CENTER_BOTH, // 自动居中
    },
    scene: [
        Boot,
        Preloader,
        MainGame,
        GameOver,
        // MainGameLand
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
