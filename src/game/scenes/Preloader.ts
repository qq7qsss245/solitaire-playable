import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { Global } from './constants/state';






export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    init() {
        this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');

    }

    preload() {
       
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
