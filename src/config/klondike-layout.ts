// Klondike Solitaire 布局配置
export type CardSuit = 'h' | 'd' | 's' | 'c';  // h=hearts(红桃), d=diamonds(方块), s=spades(黑桃), c=clubs(梅花)
export type CardValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

// 定义卡牌接口
export interface Card {
    suit: CardSuit;
    value: CardValue;
    faceUp: boolean;
}

// 生成标准52张牌
export function generateDeck(): Card[] {
    const suits: CardSuit[] = ['h', 'd', 's', 'c'];
    const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck: Card[] = [];
    
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value, faceUp: false });
        }
    }
    
    return deck;
}

// 洗牌算法 (Fisher-Yates)
export function shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Klondike初始布局
export interface KlondikeLayout {
    tableau: Card[][]; // 7列游戏区域
    stock: Card[];     // 库存牌堆
    waste: Card[];     // 翻牌区域
    foundation: Card[][]; // 4个基础牌堆
}

// 生成Klondike初始布局
export function generateKlondikeLayout(): KlondikeLayout {
    const deck = shuffleDeck(generateDeck());
    
    // 初始化7列游戏区域
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    let cardIndex = 0;
    
    // 分发卡牌到7列：第1列1张，第2列2张，...，第7列7张
    for (let col = 0; col < 7; col++) {
        for (let row = 0; row <= col; row++) {
            const card = deck[cardIndex++];
            // 只有每列的最后一张（顶部）卡牌正面朝上
            card.faceUp = row === col;
            tableau[col].push(card);
        }
    }
    
    // 剩余的卡牌放入库存牌堆
    const stock = deck.slice(cardIndex);
    
    return {
        tableau,
        stock,
        waste: [],
        foundation: [[], [], [], []] // 4个空的基础牌堆
    };
}

// 布局位置配置
export interface LayoutPositions {
    // 游戏区域尺寸
    gameWidth: number;
    gameHeight: number;
    
    // 卡牌尺寸
    cardWidth: number;
    cardHeight: number;
    
    // 7列游戏区域 (Tableau)
    tableau: {
        startX: number;
        startY: number;
        columnGap: number;
        cardGap: number; // 同列卡牌间的垂直间距
    };
    
    // 基础牌堆区域 (Foundation) - 右上角4个位置
    foundation: {
        startX: number;
        startY: number;
        gap: number;
    };
    
    // 库存牌堆 (Stock) - 左上角
    stock: {
        x: number;
        y: number;
    };
    
    // 翻牌区域 (Waste) - 库存牌堆右侧
    waste: {
        x: number;
        y: number;
    };
    
    // 计分板位置
    scoreboard: {
        x: number;
        y: number;
    };
    
    // 下载按钮位置
    downloadButton: {
        x: number;
        y: number;
    };
}

// 竖屏布局位置
export const portraitLayout: LayoutPositions = {
    gameWidth: 1080,
    gameHeight: 1920,
    cardWidth: 120,
    cardHeight: 164,
    
    tableau: {
        startX: 75,  // 左边距
        startY: 350, // 顶部边距（为上方区域留空间）
        columnGap: 130, // 列间距
        cardGap: 35,    // 同列卡牌垂直间距
    },
    
    foundation: {
        startX: 615,  // 右上角开始位置
        startY: 180,  // 顶部位置
        gap: 130,     // 基础牌堆间距
    },
    
    stock: {
        x: 75,   // 左上角
        y: 180,
    },
    
    waste: {
        x: 205,  // 库存牌堆右侧
        y: 180,
    },
    
    scoreboard: {
        x: 540,  // 居中
        y: 50,
    },
    
    downloadButton: {
        x: 540,  // 居中
        y: 1720, // 底部
    },
};

// 横屏布局位置
export const landscapeLayout: LayoutPositions = {
    gameWidth: 1920,
    gameHeight: 1080,
    cardWidth: 120,
    cardHeight: 164,
    
    tableau: {
        startX: 200,  // 左边距
        startY: 250,  // 顶部边距
        columnGap: 130, // 列间距
        cardGap: 35,    // 同列卡牌垂直间距
    },
    
    foundation: {
        startX: 1400, // 右上角开始位置
        startY: 100,  // 顶部位置
        gap: 130,     // 基础牌堆间距
    },
    
    stock: {
        x: 200,  // 左上角
        y: 100,
    },
    
    waste: {
        x: 330,  // 库存牌堆右侧
        y: 100,
    },
    
    scoreboard: {
        x: 100,  // 左侧
        y: 500,
    },
    
    downloadButton: {
        x: 1720, // 右下角
        y: 900,
    },
};