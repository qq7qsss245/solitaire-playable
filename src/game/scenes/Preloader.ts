import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { Global } from './constants/state';

import cardBack from '@/assets/cards/back.png';
import fill from '@/assets/cards/fill.png';
import big_b_2 from '@/assets/cards/big/b_2.png';
import big_b_3 from '@/assets/cards/big/b_3.png';
import big_b_4 from '@/assets/cards/big/b_4.png';
import big_b_5 from '@/assets/cards/big/b_5.png';
import big_b_6 from '@/assets/cards/big/b_6.png';
import big_b_7 from '@/assets/cards/big/b_7.png';
import big_b_8 from '@/assets/cards/big/b_8.png';
import big_b_9 from '@/assets/cards/big/b_9.png';
import big_b_10 from '@/assets/cards/big/b_10.png';
import big_b_A from '@/assets/cards/big/b_A.png';
import big_b_J from '@/assets/cards/big/b_J.png';
import big_b_Q from '@/assets/cards/big/b_Q.png';
import big_b_K from '@/assets/cards/big/b_K.png';
import big_f_2 from '@/assets/cards/big/f_2.png';
import big_f_3 from '@/assets/cards/big/f_3.png';
import big_f_4 from '@/assets/cards/big/f_4.png';
import big_f_5 from '@/assets/cards/big/f_5.png';
import big_f_6 from '@/assets/cards/big/f_6.png';
import big_f_7 from '@/assets/cards/big/f_7.png';
import big_f_8 from '@/assets/cards/big/f_8.png';
import big_f_9 from '@/assets/cards/big/f_9.png';
import big_f_10 from '@/assets/cards/big/f_10.png';
import big_f_A from '@/assets/cards/big/f_A.png';
import big_f_J from '@/assets/cards/big/f_J.png';
import big_f_Q from '@/assets/cards/big/f_Q.png';
import big_f_K from '@/assets/cards/big/f_K.png';
import big_r_2 from '@/assets/cards/big/r_2.png';
import big_r_3 from '@/assets/cards/big/r_3.png';
import big_r_4 from '@/assets/cards/big/r_4.png';
import big_r_5 from '@/assets/cards/big/r_5.png';
import big_r_6 from '@/assets/cards/big/r_6.png';
import big_r_7 from '@/assets/cards/big/r_7.png';
import big_r_8 from '@/assets/cards/big/r_8.png';
import big_r_9 from '@/assets/cards/big/r_9.png';
import big_r_10 from '@/assets/cards/big/r_10.png';
import big_r_A from '@/assets/cards/big/r_A.png';
import big_r_J from '@/assets/cards/big/r_J.png';
import big_r_Q from '@/assets/cards/big/r_Q.png';
import big_r_K from '@/assets/cards/big/r_K.png';
import big_s_2 from '@/assets/cards/big/s_2.png';
import big_s_3 from '@/assets/cards/big/s_3.png';
import big_s_4 from '@/assets/cards/big/s_4.png';
import big_s_5 from '@/assets/cards/big/s_5.png';
import big_s_6 from '@/assets/cards/big/s_6.png';
import big_s_7 from '@/assets/cards/big/s_7.png';
import big_s_8 from '@/assets/cards/big/s_8.png';
import big_s_9 from '@/assets/cards/big/s_9.png';
import big_s_10 from '@/assets/cards/big/s_10.png';
import big_s_A from '@/assets/cards/big/s_A.png';
import big_s_J from '@/assets/cards/big/s_J.png';
import big_s_Q from '@/assets/cards/big/s_Q.png';
import big_s_K from '@/assets/cards/big/s_K.png';
import small_b_2 from '@/assets/cards/small/b_2.png';
import small_b_3 from '@/assets/cards/small/b_3.png';
import small_b_4 from '@/assets/cards/small/b_4.png';
import small_b_5 from '@/assets/cards/small/b_5.png';
import small_b_6 from '@/assets/cards/small/b_6.png';
import small_b_7 from '@/assets/cards/small/b_7.png';
import small_b_8 from '@/assets/cards/small/b_8.png';
import small_b_9 from '@/assets/cards/small/b_9.png';
import small_b_10 from '@/assets/cards/small/b_10.png';
import small_b_A from '@/assets/cards/small/b_A.png';
import small_b_J from '@/assets/cards/small/b_J.png';
import small_b_Q from '@/assets/cards/small/b_Q.png';
import small_b_K from '@/assets/cards/small/b_K.png';
import small_f_2 from '@/assets/cards/small/f_2.png';
import small_f_3 from '@/assets/cards/small/f_3.png';
import small_f_4 from '@/assets/cards/small/f_4.png';
import small_f_5 from '@/assets/cards/small/f_5.png';
import small_f_6 from '@/assets/cards/small/f_6.png';
import small_f_7 from '@/assets/cards/small/f_7.png';
import small_f_8 from '@/assets/cards/small/f_8.png';
import small_f_9 from '@/assets/cards/small/f_9.png';
import small_f_10 from '@/assets/cards/small/f_10.png';
import small_f_A from '@/assets/cards/small/f_A.png';
import small_f_J from '@/assets/cards/small/f_J.png';
import small_f_Q from '@/assets/cards/small/f_Q.png';
import small_f_K from '@/assets/cards/small/f_K.png';
import small_r_2 from '@/assets/cards/small/r_2.png';
import small_r_3 from '@/assets/cards/small/r_3.png';
import small_r_4 from '@/assets/cards/small/r_4.png';
import small_r_5 from '@/assets/cards/small/r_5.png';
import small_r_6 from '@/assets/cards/small/r_6.png';
import small_r_7 from '@/assets/cards/small/r_7.png';
import small_r_8 from '@/assets/cards/small/r_8.png';
import small_r_9 from '@/assets/cards/small/r_9.png';
import small_r_10 from '@/assets/cards/small/r_10.png';
import small_r_A from '@/assets/cards/small/r_A.png';
import small_r_J from '@/assets/cards/small/r_J.png';
import small_r_Q from '@/assets/cards/small/r_Q.png';
import small_r_K from '@/assets/cards/small/r_K.png';
import small_s_2 from '@/assets/cards/small/s_2.png';
import small_s_3 from '@/assets/cards/small/s_3.png';
import small_s_4 from '@/assets/cards/small/s_4.png';
import small_s_5 from '@/assets/cards/small/s_5.png';
import small_s_6 from '@/assets/cards/small/s_6.png';
import small_s_7 from '@/assets/cards/small/s_7.png';
import small_s_8 from '@/assets/cards/small/s_8.png';
import small_s_9 from '@/assets/cards/small/s_9.png';
import small_s_10 from '@/assets/cards/small/s_10.png';
import small_s_A from '@/assets/cards/small/s_A.png';
import small_s_J from '@/assets/cards/small/s_J.png';
import small_s_Q from '@/assets/cards/small/s_Q.png';
import small_s_K from '@/assets/cards/small/s_K.png';

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
       const images = [
        {fill}, {cardBack},
        {big_b_2}, {big_b_3}, {big_b_4}, {big_b_5}, {big_b_6}, {big_b_7}, {big_b_8}, {big_b_9}, {big_b_10}, {big_b_A}, {big_b_J}, {big_b_Q}, {big_b_K},
        {big_f_2}, {big_f_3}, {big_f_4}, {big_f_5}, {big_f_6}, {big_f_7}, {big_f_8}, {big_f_9}, {big_f_10}, {big_f_A}, {big_f_J}, {big_f_Q}, {big_f_K},
        {big_r_2}, {big_r_3}, {big_r_4}, {big_r_5}, {big_r_6}, {big_r_7}, {big_r_8}, {big_r_9}, {big_r_10}, {big_r_A}, {big_r_J}, {big_r_Q}, {big_r_K},
        {big_s_2}, {big_s_3}, {big_s_4}, {big_s_5}, {big_s_6}, {big_s_7}, {big_s_8}, {big_s_9}, {big_s_10}, {big_s_A}, {big_s_J}, {big_s_Q}, {big_s_K},
        {small_b_2}, {small_b_3}, {small_b_4}, {small_b_5}, {small_b_6}, {small_b_7}, {small_b_8}, {small_b_9}, {small_b_10}, {small_b_A}, {small_b_J}, {small_b_Q}, {small_b_K},
        {small_f_2}, {small_f_3}, {small_f_4}, {small_f_5}, {small_f_6}, {small_f_7}, {small_f_8}, {small_f_9}, {small_f_10}, {small_f_A}, {small_f_J}, {small_f_Q}, {small_f_K},
        {small_r_2}, {small_r_3}, {small_r_4}, {small_r_5}, {small_r_6}, {small_r_7}, {small_r_8}, {small_r_9}, {small_r_10}, {small_r_A}, {small_r_J}, {small_r_Q}, {small_r_K},
        {small_s_2}, {small_s_3}, {small_s_4}, {small_s_5}, {small_s_6}, {small_s_7}, {small_s_8}, {small_s_9}, {small_s_10}, {small_s_A}, {small_s_J}, {small_s_Q}, {small_s_K},
       ];
       images.forEach(image => {
        const [[key, value]] = Object.entries(image);
        this.load.image(key, value);
       });
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
