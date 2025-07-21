// 背景图片
import bgLandscape from './images/backgrounds/bg-landscape.png';
import bgPortrait from './images/backgrounds/bg-portrait.png';

// 扑克牌基础图片
import cardBack from './images/cards/card-back.png';
import cardFace from './images/cards/card-face.png';

// 花色图片
import suitDiamond from './images/cards/suits/diamond.png';
import suitClub from './images/cards/suits/club.png';
import suitHeart from './images/cards/suits/heart.png';
import suitSpade from './images/cards/suits/spade.png';

// 红色牌值
import redA from './images/cards/values/red/A.png';
import red2 from './images/cards/values/red/2.png';
import red3 from './images/cards/values/red/3.png';
import red4 from './images/cards/values/red/4.png';
import red5 from './images/cards/values/red/5.png';
import red6 from './images/cards/values/red/6.png';
import red7 from './images/cards/values/red/7.png';
import red8 from './images/cards/values/red/8.png';
import red9 from './images/cards/values/red/9.png';
import red10 from './images/cards/values/red/10.png';
import redJ from './images/cards/values/red/J.png';
import redQ from './images/cards/values/red/Q.png';
import redK from './images/cards/values/red/K.png';

// 黑色牌值
import blackA from './images/cards/values/black/A.png';
import black2 from './images/cards/values/black/2.png';
import black3 from './images/cards/values/black/3.png';
import black4 from './images/cards/values/black/4.png';
import black5 from './images/cards/values/black/5.png';
import black6 from './images/cards/values/black/6.png';
import black7 from './images/cards/values/black/7.png';
import black8 from './images/cards/values/black/8.png';
import black9 from './images/cards/values/black/9.png';
import black10 from './images/cards/values/black/10.png';
import blackJ from './images/cards/values/black/J.png';
import blackQ from './images/cards/values/black/Q.png';
import blackK from './images/cards/values/black/K.png';

// UI图片
import hand from './images/ui/hand.png';
import icon from './images/ui/icon.png';
import playFree from './images/ui/play-free.png';
import productName from './images/ui/product-name.png';
import fiveStars from './images/ui/five-stars.png';

// 卡槽图片
import slot from './images/ui/slots/卡槽.png';
import reset from './images/ui/slots/重置.png';

// 计分板图片
import scoreboardLandscape from './images/ui/scoreboard/横计分板.png';
import scoreboardPortrait from './images/ui/scoreboard/竖计分板.png';
import movesText from './images/ui/scoreboard/MOVES_.png';
import scoreText from './images/ui/scoreboard/SCORE_.png';
import timeText from './images/ui/scoreboard/TIME_.png';

// 结算界面图片
import gameoverBg from './images/ui/gameover/结算bg.png';
import bestUi from './images/ui/gameover/best ui.png';
import continueButton from './images/ui/gameover/continue button.png';
import greatText from './images/ui/gameover/GREAT!.png';
import bestText from './images/ui/gameover/BEST.png';
import continueSmallText from './images/ui/gameover/CONTINUE_小.png';
import movesGameoverText from './images/ui/gameover/MOVES_.png';
import scoreGameoverText from './images/ui/gameover/SCORE_.png';
import timeGameoverText from './images/ui/gameover/TIME_.png';
import yourText from './images/ui/gameover/YOUR.png';

// 引导文案图片
import guideText1 from './images/tutorial/guide-texts/This classical card game is also called Klondike or Patience_.png';
import guideText2 from './images/tutorial/guide-texts/Try to build all four suits up from ace to king in separate pil.png';
import guideText3 from './images/tutorial/guide-texts/Let\'s put Ace to the foundation_.png';
import guideText4 from './images/tutorial/guide-texts/Good, let\'s put this card to the pile_.png';
import guideText5 from './images/tutorial/guide-texts/Awesome! Now try to move this card from this pile to another_.png';
import guideText6 from './images/tutorial/guide-texts/Hmmm, now try to look in the stock_.png';
import guideText7 from './images/tutorial/guide-texts/Perfect! Can you try to complete the puzzle now__.png';

// 音频文件
import bgm from './audio/bgm.mp3';
import cardFlip from './audio/card-flip.mp3';
import cardPlace from './audio/card-place.mp3';
import cardDeal from './audio/card-deal.mp3';
import slotPlace from './audio/slot-place.mp3';
import victory from './audio/victory.mp3';
import error from './audio/error.mp3';

// 导出所有资源
export const Assets = {
  // 背景
  backgrounds: {
    landscape: bgLandscape,
    portrait: bgPortrait,
  },
  
  // 扑克牌
  cards: {
    back: cardBack,
    face: cardFace,
    suits: {
      diamond: suitDiamond,
      club: suitClub,
      heart: suitHeart,
      spade: suitSpade,
    },
    values: {
      red: {
        A: redA,
        2: red2,
        3: red3,
        4: red4,
        5: red5,
        6: red6,
        7: red7,
        8: red8,
        9: red9,
        10: red10,
        J: redJ,
        Q: redQ,
        K: redK,
      },
      black: {
        A: blackA,
        2: black2,
        3: black3,
        4: black4,
        5: black5,
        6: black6,
        7: black7,
        8: black8,
        9: black9,
        10: black10,
        J: blackJ,
        Q: blackQ,
        K: blackK,
      },
    },
  },
  
  // UI元素
  ui: {
    hand,
    icon,
    playFree,
    productName,
    fiveStars,
    slots: {
      slot,
      reset,
    },
    scoreboard: {
      landscape: scoreboardLandscape,
      portrait: scoreboardPortrait,
      moves: movesText,
      score: scoreText,
      time: timeText,
    },
    gameover: {
      bg: gameoverBg,
      bestUi,
      continueButton,
      great: greatText,
      best: bestText,
      continueSmall: continueSmallText,
      moves: movesGameoverText,
      score: scoreGameoverText,
      time: timeGameoverText,
      your: yourText,
    },
  },
  
  // 教学引导
  tutorial: {
    guideTexts: {
      intro: guideText1,
      objective: guideText2,
      aceToFoundation: guideText3,
      cardToPile: guideText4,
      moveCard: guideText5,
      checkStock: guideText6,
      complete: guideText7,
    },
  },
  
  // 音频
  audio: {
    bgm,
    cardFlip,
    cardPlace,
    cardDeal,
    slotPlace,
    victory,
    error,
  },
};

// 资源键名常量
export const AssetKeys = {
  // 背景
  BG_LANDSCAPE: 'bg-landscape',
  BG_PORTRAIT: 'bg-portrait',
  
  // 扑克牌
  CARD_BACK: 'card-back',
  CARD_FACE: 'card-face',
  
  // 花色
  SUIT_DIAMOND: 'suit-diamond',
  SUIT_CLUB: 'suit-club',
  SUIT_HEART: 'suit-heart',
  SUIT_SPADE: 'suit-spade',
  
  // 红色牌值
  RED_A: 'red-A',
  RED_2: 'red-2',
  RED_3: 'red-3',
  RED_4: 'red-4',
  RED_5: 'red-5',
  RED_6: 'red-6',
  RED_7: 'red-7',
  RED_8: 'red-8',
  RED_9: 'red-9',
  RED_10: 'red-10',
  RED_J: 'red-J',
  RED_Q: 'red-Q',
  RED_K: 'red-K',
  
  // 黑色牌值
  BLACK_A: 'black-A',
  BLACK_2: 'black-2',
  BLACK_3: 'black-3',
  BLACK_4: 'black-4',
  BLACK_5: 'black-5',
  BLACK_6: 'black-6',
  BLACK_7: 'black-7',
  BLACK_8: 'black-8',
  BLACK_9: 'black-9',
  BLACK_10: 'black-10',
  BLACK_J: 'black-J',
  BLACK_Q: 'black-Q',
  BLACK_K: 'black-K',
  
  // UI元素
  HAND: 'hand',
  ICON: 'icon',
  PLAY_FREE: 'play-free',
  PRODUCT_NAME: 'product-name',
  FIVE_STARS: 'five-stars',
  
  // 卡槽
  SLOT: 'slot',
  RESET: 'reset',
  
  // 计分板
  SCOREBOARD_LANDSCAPE: 'scoreboard-landscape',
  SCOREBOARD_PORTRAIT: 'scoreboard-portrait',
  MOVES_TEXT: 'moves-text',
  SCORE_TEXT: 'score-text',
  TIME_TEXT: 'time-text',
  
  // 结算界面
  GAMEOVER_BG: 'gameover-bg',
  BEST_UI: 'best-ui',
  CONTINUE_BUTTON: 'continue-button',
  GREAT_TEXT: 'great-text',
  BEST_TEXT: 'best-text',
  CONTINUE_SMALL_TEXT: 'continue-small-text',
  MOVES_GAMEOVER_TEXT: 'moves-gameover-text',
  SCORE_GAMEOVER_TEXT: 'score-gameover-text',
  TIME_GAMEOVER_TEXT: 'time-gameover-text',
  YOUR_TEXT: 'your-text',
  
  // 引导文案
  GUIDE_INTRO: 'guide-intro',
  GUIDE_OBJECTIVE: 'guide-objective',
  GUIDE_ACE_TO_FOUNDATION: 'guide-ace-to-foundation',
  GUIDE_CARD_TO_PILE: 'guide-card-to-pile',
  GUIDE_MOVE_CARD: 'guide-move-card',
  GUIDE_CHECK_STOCK: 'guide-check-stock',
  GUIDE_COMPLETE: 'guide-complete',
  
  // 音频
  BGM: 'bgm',
  CARD_FLIP: 'card-flip',
  CARD_PLACE: 'card-place',
  CARD_DEAL: 'card-deal',
  SLOT_PLACE: 'slot-place',
  VICTORY: 'victory',
  ERROR: 'error',
};