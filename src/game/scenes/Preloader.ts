import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { Global } from './constants/state';
import { Assets, AssetKeys } from '../../assets';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    init() {
        this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');
    }

    preload() {
        // 加载背景图片
        this.load.image(AssetKeys.BG_LANDSCAPE, Assets.backgrounds.landscape);
        this.load.image(AssetKeys.BG_PORTRAIT, Assets.backgrounds.portrait);

        // 加载扑克牌基础图片
        this.load.image(AssetKeys.CARD_BACK, Assets.cards.back);
        this.load.image(AssetKeys.CARD_FACE, Assets.cards.face);

        // 加载花色图片
        this.load.image(AssetKeys.SUIT_DIAMOND, Assets.cards.suits.diamond);
        this.load.image(AssetKeys.SUIT_CLUB, Assets.cards.suits.club);
        this.load.image(AssetKeys.SUIT_HEART, Assets.cards.suits.heart);
        this.load.image(AssetKeys.SUIT_SPADE, Assets.cards.suits.spade);

        // 加载红色牌值
        this.load.image(AssetKeys.RED_A, Assets.cards.values.red.A);
        this.load.image(AssetKeys.RED_2, Assets.cards.values.red[2]);
        this.load.image(AssetKeys.RED_3, Assets.cards.values.red[3]);
        this.load.image(AssetKeys.RED_4, Assets.cards.values.red[4]);
        this.load.image(AssetKeys.RED_5, Assets.cards.values.red[5]);
        this.load.image(AssetKeys.RED_6, Assets.cards.values.red[6]);
        this.load.image(AssetKeys.RED_7, Assets.cards.values.red[7]);
        this.load.image(AssetKeys.RED_8, Assets.cards.values.red[8]);
        this.load.image(AssetKeys.RED_9, Assets.cards.values.red[9]);
        this.load.image(AssetKeys.RED_10, Assets.cards.values.red[10]);
        this.load.image(AssetKeys.RED_J, Assets.cards.values.red.J);
        this.load.image(AssetKeys.RED_Q, Assets.cards.values.red.Q);
        this.load.image(AssetKeys.RED_K, Assets.cards.values.red.K);

        // 加载黑色牌值
        this.load.image(AssetKeys.BLACK_A, Assets.cards.values.black.A);
        this.load.image(AssetKeys.BLACK_2, Assets.cards.values.black[2]);
        this.load.image(AssetKeys.BLACK_3, Assets.cards.values.black[3]);
        this.load.image(AssetKeys.BLACK_4, Assets.cards.values.black[4]);
        this.load.image(AssetKeys.BLACK_5, Assets.cards.values.black[5]);
        this.load.image(AssetKeys.BLACK_6, Assets.cards.values.black[6]);
        this.load.image(AssetKeys.BLACK_7, Assets.cards.values.black[7]);
        this.load.image(AssetKeys.BLACK_8, Assets.cards.values.black[8]);
        this.load.image(AssetKeys.BLACK_9, Assets.cards.values.black[9]);
        this.load.image(AssetKeys.BLACK_10, Assets.cards.values.black[10]);
        this.load.image(AssetKeys.BLACK_J, Assets.cards.values.black.J);
        this.load.image(AssetKeys.BLACK_Q, Assets.cards.values.black.Q);
        this.load.image(AssetKeys.BLACK_K, Assets.cards.values.black.K);

        // 加载人物牌大图
        this.load.image(AssetKeys.FACE_J, Assets.cards.faceCards.j);
        this.load.image(AssetKeys.FACE_Q, Assets.cards.faceCards.q);
        this.load.image(AssetKeys.FACE_K, Assets.cards.faceCards.k);

        // 加载UI图片
        this.load.image(AssetKeys.HAND, Assets.ui.hand);
        this.load.image(AssetKeys.ICON, Assets.ui.icon);
        this.load.image(AssetKeys.PLAY_FREE, Assets.ui.playFree);
        this.load.image(AssetKeys.PRODUCT_NAME, Assets.ui.productName);
        this.load.image(AssetKeys.FIVE_STARS, Assets.ui.fiveStars);

        // 加载卡槽图片 - 按花色分别加载
        this.load.image(AssetKeys.SLOT_HEART, Assets.ui.slots.heart);
        this.load.image(AssetKeys.SLOT_DIAMOND, Assets.ui.slots.diamond);
        this.load.image(AssetKeys.SLOT_CLUB, Assets.ui.slots.club);
        this.load.image(AssetKeys.SLOT_SPADE, Assets.ui.slots.spade);
        this.load.image(AssetKeys.RESET, Assets.ui.slots.reset);

        // 加载计分板图片
        this.load.image(AssetKeys.SCOREBOARD_LANDSCAPE, Assets.ui.scoreboard.landscape);
        this.load.image(AssetKeys.SCOREBOARD_PORTRAIT, Assets.ui.scoreboard.portrait);
        this.load.image(AssetKeys.MOVES_TEXT, Assets.ui.scoreboard.moves);
        this.load.image(AssetKeys.SCORE_TEXT, Assets.ui.scoreboard.score);
        this.load.image(AssetKeys.TIME_TEXT, Assets.ui.scoreboard.time);

        // 加载结算界面图片
        this.load.image(AssetKeys.GAMEOVER_BG, Assets.ui.gameover.bg);
        this.load.image(AssetKeys.BEST_UI, Assets.ui.gameover.bestUi);
        this.load.image(AssetKeys.CONTINUE_BUTTON, Assets.ui.gameover.continueButton);
        this.load.image(AssetKeys.GREAT_TEXT, Assets.ui.gameover.great);
        this.load.image(AssetKeys.BEST_TEXT, Assets.ui.gameover.best);
        this.load.image(AssetKeys.CONTINUE_SMALL_TEXT, Assets.ui.gameover.continueSmall);
        this.load.image(AssetKeys.MOVES_GAMEOVER_TEXT, Assets.ui.gameover.moves);
        this.load.image(AssetKeys.SCORE_GAMEOVER_TEXT, Assets.ui.gameover.score);
        this.load.image(AssetKeys.TIME_GAMEOVER_TEXT, Assets.ui.gameover.time);
        this.load.image(AssetKeys.YOUR_TEXT, Assets.ui.gameover.your);

        // 加载引导文案图片
        this.load.image(AssetKeys.GUIDE_INTRO, Assets.tutorial.guideTexts.intro);
        this.load.image(AssetKeys.GUIDE_OBJECTIVE, Assets.tutorial.guideTexts.objective);
        this.load.image(AssetKeys.GUIDE_ACE_TO_FOUNDATION, Assets.tutorial.guideTexts.aceToFoundation);
        this.load.image(AssetKeys.GUIDE_CARD_TO_PILE, Assets.tutorial.guideTexts.cardToPile);
        this.load.image(AssetKeys.GUIDE_MOVE_CARD, Assets.tutorial.guideTexts.moveCard);
        this.load.image(AssetKeys.GUIDE_CHECK_STOCK, Assets.tutorial.guideTexts.checkStock);
        this.load.image(AssetKeys.GUIDE_STOCK_HINT, Assets.tutorial.guideTexts.stockHint); // 加载"Hmmm..."文案
        this.load.image(AssetKeys.GUIDE_COMPLETE, Assets.tutorial.guideTexts.complete);

        // 音频文件现在通过React组件(src/sound.tsx)直接导入，不需要在Phaser中加载

        // 兼容性：保持原有的键名以确保现有代码正常工作
        // 这些可以在后续重构时逐步替换为新的键名
        this.load.image('card-back', Assets.cards.back);
        this.load.image('card-fill', Assets.ui.slots.heart); // 用于空区域显示，使用红桃卡槽作为默认
        this.load.image('download', Assets.ui.playFree); // 下载按钮
        this.load.image('hand', Assets.ui.hand);
        this.load.image('icon', Assets.ui.icon);

        // 方块牌 - 兼容性映射
        this.load.image('方块A', Assets.cards.values.red.A);
        this.load.image('方块2', Assets.cards.values.red[2]);
        this.load.image('方块3', Assets.cards.values.red[3]);
        this.load.image('方块4', Assets.cards.values.red[4]);
        this.load.image('方块5', Assets.cards.values.red[5]);
        this.load.image('方块6', Assets.cards.values.red[6]);
        this.load.image('方块7', Assets.cards.values.red[7]);
        this.load.image('方块8', Assets.cards.values.red[8]);
        this.load.image('方块9', Assets.cards.values.red[9]);
        this.load.image('方块10', Assets.cards.values.red[10]);
        this.load.image('方块J', Assets.cards.values.red.J);
        this.load.image('方块Q', Assets.cards.values.red.Q);
        this.load.image('方块K', Assets.cards.values.red.K);

        // 梅花牌 - 兼容性映射
        this.load.image('梅花A', Assets.cards.values.black.A);
        this.load.image('梅花2', Assets.cards.values.black[2]);
        this.load.image('梅花3', Assets.cards.values.black[3]);
        this.load.image('梅花4', Assets.cards.values.black[4]);
        this.load.image('梅花5', Assets.cards.values.black[5]);
        this.load.image('梅花6', Assets.cards.values.black[6]);
        this.load.image('梅花7', Assets.cards.values.black[7]);
        this.load.image('梅花8', Assets.cards.values.black[8]);
        this.load.image('梅花9', Assets.cards.values.black[9]);
        this.load.image('梅花10', Assets.cards.values.black[10]);
        this.load.image('梅花J', Assets.cards.values.black.J);
        this.load.image('梅花Q', Assets.cards.values.black.Q);
        this.load.image('梅花K', Assets.cards.values.black.K);

        // 红桃牌 - 兼容性映射
        this.load.image('红桃A', Assets.cards.values.red.A);
        this.load.image('红桃2', Assets.cards.values.red[2]);
        this.load.image('红桃3', Assets.cards.values.red[3]);
        this.load.image('红桃4', Assets.cards.values.red[4]);
        this.load.image('红桃5', Assets.cards.values.red[5]);
        this.load.image('红桃6', Assets.cards.values.red[6]);
        this.load.image('红桃7', Assets.cards.values.red[7]);
        this.load.image('红桃8', Assets.cards.values.red[8]);
        this.load.image('红桃9', Assets.cards.values.red[9]);
        this.load.image('红桃10', Assets.cards.values.red[10]);
        this.load.image('红桃J', Assets.cards.values.red.J);
        this.load.image('红桃Q', Assets.cards.values.red.Q);
        this.load.image('红桃K', Assets.cards.values.red.K);

        // 黑桃牌 - 兼容性映射
        this.load.image('黑桃A', Assets.cards.values.black.A);
        this.load.image('黑桃2', Assets.cards.values.black[2]);
        this.load.image('黑桃3', Assets.cards.values.black[3]);
        this.load.image('黑桃4', Assets.cards.values.black[4]);
        this.load.image('黑桃5', Assets.cards.values.black[5]);
        this.load.image('黑桃6', Assets.cards.values.black[6]);
        this.load.image('黑桃7', Assets.cards.values.black[7]);
        this.load.image('黑桃8', Assets.cards.values.black[8]);
        this.load.image('黑桃9', Assets.cards.values.black[9]);
        this.load.image('黑桃10', Assets.cards.values.black[10]);
        this.load.image('黑桃J', Assets.cards.values.black.J);
        this.load.image('黑桃Q', Assets.cards.values.black.Q);
        this.load.image('黑桃K', Assets.cards.values.black.K);
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
