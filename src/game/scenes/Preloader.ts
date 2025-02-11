import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { Global } from './constants/state';

// 基础图片资源
import bgImg from '../../assets/bg.png';
import downloadImg from '../../assets/download.png';
import handImg from '../../assets/hand.png';
import iconImg from '../../assets/icon.png';
import noImg from '../../assets/no.png';
import textImg from '../../assets/text.png';
import yesImg from '../../assets/yes.png';
import cardFillImg from '../../assets/cards/fill.png';
import cardBackImg from '../../assets/cards/卡背.png';

// 音频资源
import bgmAudio from '../../assets/audios/bgm.mp3';
import bigAudio from '../../assets/audios/big.mp3';
import clickAudio from '../../assets/audios/click.mp3';
import dealAudio from '../../assets/audios/deal.mp3';
import fillAudio from '../../assets/audios/fill.mp3';
import moveAudio from '../../assets/audios/move.mp3';
import popupAudio from '../../assets/audios/popup.mp3';

// 方块牌
import dA from '../../assets/cards/方块A.png';
import d2 from '../../assets/cards/方块2.png';
import d3 from '../../assets/cards/方块3.png';
import d4 from '../../assets/cards/方块4.png';
import d5 from '../../assets/cards/方块5.png';
import d6 from '../../assets/cards/方块6.png';
import d7 from '../../assets/cards/方块7.png';
import d8 from '../../assets/cards/方块8.png';
import d9 from '../../assets/cards/方块9.png';
import d10 from '../../assets/cards/方块10.png';
import dJ from '../../assets/cards/方块J.png';
import dQ from '../../assets/cards/方块Q.png';
import dK from '../../assets/cards/方块K.png';

// 梅花牌
import cA from '../../assets/cards/梅花A.png';
import c2 from '../../assets/cards/梅花2.png';
import c3 from '../../assets/cards/梅花3.png';
import c4 from '../../assets/cards/梅花4.png';
import c5 from '../../assets/cards/梅花5.png';
import c6 from '../../assets/cards/梅花6.png';
import c7 from '../../assets/cards/梅花7.png';
import c8 from '../../assets/cards/梅花8.png';
import c9 from '../../assets/cards/梅花9.png';
import c10 from '../../assets/cards/梅花10.png';
import cJ from '../../assets/cards/梅花J.png';
import cQ from '../../assets/cards/梅花Q.png';
import cK from '../../assets/cards/梅花K.png';

// 红桃牌
import hA from '../../assets/cards/红桃A.png';
import h2 from '../../assets/cards/红桃2.png';
import h3 from '../../assets/cards/红桃3.png';
import h4 from '../../assets/cards/红桃4.png';
import h5 from '../../assets/cards/红桃5.png';
import h6 from '../../assets/cards/红桃6.png';
import h7 from '../../assets/cards/红桃7.png';
import h8 from '../../assets/cards/红桃8.png';
import h9 from '../../assets/cards/红桃9.png';
import h10 from '../../assets/cards/红桃10.png';
import hJ from '../../assets/cards/红桃J.png';
import hQ from '../../assets/cards/红桃Q.png';
import hK from '../../assets/cards/红桃K.png';

// 黑桃牌
import sA from '../../assets/cards/黑桃A.png';
import s2 from '../../assets/cards/黑桃2.png';
import s3 from '../../assets/cards/黑桃3.png';
import s4 from '../../assets/cards/黑桃4.png';
import s5 from '../../assets/cards/黑桃5.png';
import s6 from '../../assets/cards/黑桃6.png';
import s7 from '../../assets/cards/黑桃7.png';
import s8 from '../../assets/cards/黑桃8.png';
import s9 from '../../assets/cards/黑桃9.png';
import s10 from '../../assets/cards/黑桃10.png';
import sJ from '../../assets/cards/黑桃J.png';
import sQ from '../../assets/cards/黑桃Q.png';
import sK from '../../assets/cards/黑桃K.png';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    init() {
        this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');
    }

    preload() {
        // 加载基础图片资源
        this.load.image('bg', bgImg);
        this.load.image('download', downloadImg);
        this.load.image('hand', handImg);
        this.load.image('icon', iconImg);
        this.load.image('no', noImg);
        this.load.image('text', textImg);
        this.load.image('yes', yesImg);
        this.load.image('card-fill', cardFillImg);
        this.load.image('card-back', cardBackImg);

        // 加载方块牌
        this.load.image('方块A', dA);
        this.load.image('方块2', d2);
        this.load.image('方块3', d3);
        this.load.image('方块4', d4);
        this.load.image('方块5', d5);
        this.load.image('方块6', d6);
        this.load.image('方块7', d7);
        this.load.image('方块8', d8);
        this.load.image('方块9', d9);
        this.load.image('方块10', d10);
        this.load.image('方块J', dJ);
        this.load.image('方块Q', dQ);
        this.load.image('方块K', dK);

        // 加载梅花牌
        this.load.image('梅花A', cA);
        this.load.image('梅花2', c2);
        this.load.image('梅花3', c3);
        this.load.image('梅花4', c4);
        this.load.image('梅花5', c5);
        this.load.image('梅花6', c6);
        this.load.image('梅花7', c7);
        this.load.image('梅花8', c8);
        this.load.image('梅花9', c9);
        this.load.image('梅花10', c10);
        this.load.image('梅花J', cJ);
        this.load.image('梅花Q', cQ);
        this.load.image('梅花K', cK);

        // 加载红桃牌
        this.load.image('红桃A', hA);
        this.load.image('红桃2', h2);
        this.load.image('红桃3', h3);
        this.load.image('红桃4', h4);
        this.load.image('红桃5', h5);
        this.load.image('红桃6', h6);
        this.load.image('红桃7', h7);
        this.load.image('红桃8', h8);
        this.load.image('红桃9', h9);
        this.load.image('红桃10', h10);
        this.load.image('红桃J', hJ);
        this.load.image('红桃Q', hQ);
        this.load.image('红桃K', hK);

        // 加载黑桃牌
        this.load.image('黑桃A', sA);
        this.load.image('黑桃2', s2);
        this.load.image('黑桃3', s3);
        this.load.image('黑桃4', s4);
        this.load.image('黑桃5', s5);
        this.load.image('黑桃6', s6);
        this.load.image('黑桃7', s7);
        this.load.image('黑桃8', s8);
        this.load.image('黑桃9', s9);
        this.load.image('黑桃10', s10);
        this.load.image('黑桃J', sJ);
        this.load.image('黑桃Q', sQ);
        this.load.image('黑桃K', sK);

        // 加载音频资源
        this.load.audio('bgm', bgmAudio);
        this.load.audio('big', bigAudio);
        this.load.audio('click', clickAudio);
        this.load.audio('deal', dealAudio);
        this.load.audio('fill', fillAudio);
        this.load.audio('move', moveAudio);
        this.load.audio('popup', popupAudio);
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
        // 资源加载完成后,通知EventBus
        EventBus.emit('current-scene-ready', this);
        // 切换到游戏场景
        this.scene.start('Game');
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
