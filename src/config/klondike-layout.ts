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
    cardWidth: 147,  // 更新为卡牌实际尺寸
    cardHeight: 230, // 更新为卡牌实际尺寸
    
    tableau: {
        startX: 75,  // 左边距
        startY: 530, // 向下移动50单位 (480 + 50 = 530)
        columnGap: 150, // 列间距保持不变
        cardGap: 35,    // 同列卡牌垂直间距
    },
    
    foundation: {
        startX: 75,   // 左上角开始位置
        startY: 230,  // 向下移动50单位 (180 + 50 = 230)
        gap: 160,     // 基础牌堆间距增加30像素以适应更宽的卡槽
    },
    
    stock: {
        x: 975,  // 与最右侧列对齐位置保持不变
        y: 230,  // 向下移动50单位 (180 + 50 = 230)
    },
    
    waste: {
        x: 815,  // stock左侧，间距调整为160 (975 - 160 = 815)
        y: 230,  // 向下移动50单位 (180 + 50 = 230)
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
    cardWidth: 147,  // 更新为卡牌实际尺寸
    cardHeight: 230, // 更新为卡牌实际尺寸
    
    tableau: {
        startX: 200,  // 左边距
        startY: 430,  // 向下移动50单位 (380 + 50 = 430)
        columnGap: 150, // 列间距保持不变
        cardGap: 35,    // 同列卡牌垂直间距
    },
    
    foundation: {
        startX: 200,  // 左上角开始位置
        startY: 150,  // 向下移动50单位 (100 + 50 = 150)
        gap: 160,     // 基础牌堆间距增加30像素以适应更宽的卡槽
    },
    
    stock: {
        x: 1100, // 与最右侧列对齐位置保持不变
        y: 150,  // 向下移动50单位 (100 + 50 = 150)
    },
    
    waste: {
        x: 940,  // stock左侧，间距调整为160 (1100 - 160 = 940)
        y: 150,  // 向下移动50单位 (100 + 50 = 150)
    },
    
    scoreboard: {
        x: 100,  // 左侧
        y: 500,
    },
    
    downloadButton: {
        x: 1620, // 右下角，向左移动100
        y: 800,  // 向上移动100
    },
};