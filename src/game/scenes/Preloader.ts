import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { Global } from './constants/state';
import pipe from '@/assets/a_023.png';
import adBtn from '@/assets/a_003.png';
import pink from '@/assets/a_004.png';
import brown from '@/assets/a_005.png';
import white from '@/assets/a_006.png';
import blue from '@/assets/a_008.png';
import darkBlue from '@/assets/a_012.png';
import purple from '@/assets/a_013.png';
import red from '@/assets/a_014.png';
import hand from '@/assets/a_015.png';
import waterBlue from '@/assets/a_017.png';
import yellow from '@/assets/a_018.png';
import darkYellow from '@/assets/a_019.png';
import logo from '@/assets/a_007.png';
import orange from '@/assets/a_024.png';
import grey from '@/assets/a_028.png';
import darkGreen from '@/assets/a_029.png';
import green from '@/assets/a_030.png';
import lightPurple from '@/assets/a_034.png';
import candle0 from '@/assets/candle/00.png';
import candle1 from '@/assets/candle/01.png';
import candle2 from '@/assets/candle/02.png';
import candle3 from '@/assets/candle/03.png';
import candle4 from '@/assets/candle/04.png';
import candle5 from '@/assets/candle/05.png';
import candle6 from '@/assets/candle/06.png';
import candle7 from '@/assets/candle/07.png';
import candle8 from '@/assets/candle/08.png';
import candle9 from '@/assets/candle/09.png';
import candle10 from '@/assets/candle/10.png';
import candle11 from '@/assets/candle/11.png';
import candle12 from '@/assets/candle/12.png';
import candle13 from '@/assets/candle/13.png';
import candle14 from '@/assets/candle/14.png';
import candle15 from '@/assets/candle/15.png';
import candle16 from '@/assets/candle/16.png';
import candle17 from '@/assets/candle/17.png';
import candle18 from '@/assets/candle/18.png';
import candle19 from '@/assets/candle/19.png';
import candle20 from '@/assets/candle/20.png';
import candle21 from '@/assets/candle/21.png';
import candle22 from '@/assets/candle/22.png';
import candle23 from '@/assets/candle/23.png';
import candle24 from '@/assets/candle/24.png';
import candle25 from '@/assets/candle/25.png';
import candle26 from '@/assets/candle/26.png';
import candle27 from '@/assets/candle/27.png';
import candle28 from '@/assets/candle/28.png';
import candle29 from '@/assets/candle/29.png';


export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    init() {
        this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');
        EventBus.once('game-start', () => {
            Global.started = true;
        })

    }

    preload() {
       this.load.image('pipe', pipe);
       this.load.image('adBtn', adBtn);
       this.load.image('pink', pink);
       this.load.image('brown', brown);
       this.load.image('white', white);
       this.load.image('blue', blue);
       this.load.image('darkBlue', darkBlue);
       this.load.image('purple', purple);
       this.load.image('red', red);
       this.load.image('hand', hand);
       this.load.image('waterBlue', waterBlue);
       this.load.image('yellow', yellow);
       this.load.image('darkYellow', darkYellow);
       this.load.image('logo', logo);
       this.load.image('orange', orange);
       this.load.image('grey', grey);
       this.load.image('darkGreen', darkGreen);
       this.load.image('green', green);
       this.load.image('lightPurple', lightPurple);
       this.load.image('candle0', candle0);
       this.load.image('candle1', candle1);
       this.load.image('candle2', candle2);
       this.load.image('candle3', candle3);
       this.load.image('candle4', candle4);
       this.load.image('candle5', candle5);
       this.load.image('candle6', candle6);
       this.load.image('candle7', candle7);
       this.load.image('candle8', candle8);
       this.load.image('candle9', candle9);
       this.load.image('candle10', candle10);
       this.load.image('candle11', candle11);
       this.load.image('candle12', candle12);
       this.load.image('candle13', candle13);
       this.load.image('candle14', candle14);
       this.load.image('candle15', candle15);
       this.load.image('candle16', candle16);
       this.load.image('candle17', candle17);
       this.load.image('candle18', candle18);
       this.load.image('candle19', candle19);
       this.load.image('candle20', candle20);
       this.load.image('candle21', candle21);
       this.load.image('candle22', candle22);
       this.load.image('candle23', candle23);
       this.load.image('candle24', candle24);
       this.load.image('candle25', candle25);
       this.load.image('candle26', candle26);
       this.load.image('candle27', candle27);
       this.load.image('candle28', candle28);
       this.load.image('candle29', candle29);
    }


    loadFont(name: string, url: string) {
        var newFont = new FontFace(name, `url(${url})`);
        newFont.load().then(function (loaded) {
            document.fonts.add(loaded);
        }).catch(function (error) {
            return error;
        });
    }

    create() {
        const isLandScape = window.innerHeight < window.innerWidth;
        this.scene.start(`Game${isLandScape ? '' : ''}`);
    }


    base64ToArrayBuffer(base64: string) {
        var binaryString = atob(base64);
        var bytes = new Uint8Array(binaryString.length);
        for (var i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
}
