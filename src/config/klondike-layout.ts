// Klondike Solitaire 布局配置
export type CardSuit = 'h' | 'd' | 's' | 'c';  // h=hearts(红桃), d=diamonds(方块), s=spades(黑桃), c=clubs(梅花)
export type CardValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

// 调试变量 - 方便调整间距
export const DEBUG_SPACING = {
    // 卡牌纵向间距
    PORTRAIT_CARD_GAP: 35,    // 竖屏模式卡牌间距
    LANDSCAPE_CARD_GAP: 20,   // 横屏模式卡牌间距（缩短）
    
    // 其他间距（预留）
    COLUMN_GAP: 140,          // 列间距
    FOUNDATION_GAP: 140,      // 基础牌堆间距
    
    // 收牌区尺寸调整
    SLOT_SCALE: 1,          // 收牌区相对于卡牌的缩放比例（1.0 = 相同大小，1.1 = 大10%）
    
    // 教学文案配置
    GUIDE_TEXT_SCALE: 0.8,    // 教学文案缩放比例
    GUIDE_TEXT_GAP: 50,       // 两个文案之间的间距（已弃用，改用具体坐标配置）
    GUIDE_TEXT_OFFSET: 50,    // 文案距离牌局下方的距离（已弃用，改用具体坐标配置）
};

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
    
    // 计分板配置
    scoreboard: {
        // 背景图片位置和尺寸
        background: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        // 时间项目
        time: {
            title: {
                x: number;
                y: number;
                fontSize: number;
            };
            value: {
                x: number;
                y: number;
                fontSize: number;
            };
        };
        // 分数项目
        score: {
            title: {
                x: number;
                y: number;
                fontSize: number;
            };
            value: {
                x: number;
                y: number;
                fontSize: number;
            };
        };
        // 步数项目
        moves: {
            title: {
                x: number;
                y: number;
                fontSize: number;
            };
            value: {
                x: number;
                y: number;
                fontSize: number;
            };
        };
    };
    
    // 下载按钮位置
    downloadButton: {
        x: number;
        y: number;
    };
    
    // 教学文案位置配置
    guideTexts: {
        intro: {
            x: number;
            y: number;
        };
        objective: {
            x: number;
            y: number;
        };
        aceToFoundation: {
            x: number;
            y: number;
        };
    };
}

// 竖屏布局位置
export const portraitLayout: LayoutPositions = {
    gameWidth: 1080,
    gameHeight: 1920,
    cardWidth: 132,  // 再缩小80% (132 × 0.8 = 106)
    cardHeight: 194, // 再缩小80% (194 × 0.8 = 155)
    
    tableau: {
        startX: 95,  // 左边距
        startY: 580, // 再向下移动50 (530 + 50 = 580)
        columnGap: DEBUG_SPACING.COLUMN_GAP, // 列间距
        cardGap: DEBUG_SPACING.PORTRAIT_CARD_GAP,    // 同列卡牌垂直间距
    },
    
    foundation: {
        startX: 95,   // 左上角开始位置
        startY: 280,  // 基础牌堆Y位置
        gap: DEBUG_SPACING.FOUNDATION_GAP,     // 基础牌堆间距
    },
    
    stock: {
        x: 935,  // 与第7列对齐 (95 + 6 × 140 = 935)
        y: 280,  // 库存牌堆Y位置
    },
    
    waste: {
        x: 795,  // 与第6列对齐 (95 + 5 × 140 = 795)
        y: 280,  // 翻牌区域Y位置
    },
    
    scoreboard: {
        background: {
            x: 540,  // 居中
            y: 60,
            width: 800,  // 竖屏计分板宽度
            height: 120, // 竖屏计分板高度
        },
        // 竖屏模式：横向分布，时间-分数-步数
        time: {
            title: {
                x: 240,  // 左侧位置
                y: 30,
                fontSize: 32,
            },
            value: {
                x: 240,
                y: 70,
                fontSize: 48,
            },
        },
        score: {
            title: {
                x: 540,  // 中间位置
                y: 25,
                fontSize: 32,
            },
            value: {
                x: 540,
                y: 65,
                fontSize: 48,
            },
        },
        moves: {
            title: {
                x: 840,  // 右侧位置
                y: 30,
                fontSize: 32,
            },
            value: {
                x: 840,
                y: 70,
                fontSize: 48,
            },
        },
    },
    
    downloadButton: {
        x: 540,  // 居中
        y: 1840, // 底部
    },
    
    // 教学文案位置配置
    guideTexts: {
        intro: {
            x: 540,  // 与牌局中心对齐
            y: 1200, // 牌局下方
        },
        objective: {
            x: 540,  // 与牌局中心对齐
            y: 1280, // 第一个文案下方50单位
        },
        aceToFoundation: {
            x: 540,  // 与intro位置相同
            y: 1200, // 与intro位置相同
        },
    },
};

// 横屏布局位置
export const landscapeLayout: LayoutPositions = {
    gameWidth: 1920,
    gameHeight: 1080,
    cardWidth: 132,  // 再缩小80% (132 × 0.8 = 106)
    cardHeight: 194, // 再缩小80% (194 × 0.8 = 155)
    
    tableau: {
        startX: 200,  // 左边距
        startY: 380,  // 向上修正50像素 (430 - 50 = 380)
        columnGap: DEBUG_SPACING.COLUMN_GAP, // 列间距
        cardGap: DEBUG_SPACING.LANDSCAPE_CARD_GAP,    // 同列卡牌垂直间距（横屏缩短）
    },
    
    foundation: {
        startX: 200,  // 左上角开始位置
        startY: 120,  // 向上修正50像素 (150 - 50 = 100)
        gap: DEBUG_SPACING.FOUNDATION_GAP,     // 基础牌堆间距
    },
    
    stock: {
        x: 1040, // 与第7列对齐 (200 + 6 × 140 = 1040)
        y: 120,  // 向上修正50像素 (150 - 50 = 100)
    },
    
    waste: {
        x: 900,  // 与第6列对齐 (200 + 5 × 140 = 900)
        y: 120,  // 向上修正50像素 (150 - 50 = 100)
    },
    
    scoreboard: {
        background: {
            x: 1600, // 右侧位置
            y: 300,
            width: 280,  // 横屏计分板宽度
            height: 400, // 横屏计分板高度
        },
        // 横屏模式：纵向排列，时间在上，分数中间，步数在下
        time: {
            title: {
                x: 1600,
                y: 130,
                fontSize: 28,
            },
            value: {
                x: 1600,
                y: 180,
                fontSize: 42,
            },
        },
        score: {
            title: {
                x: 1600,
                y: 270,
                fontSize: 28,
            },
            value: {
                x: 1600,
                y: 320,
                fontSize: 42,
            },
        },
        moves: {
            title: {
                x: 1600,
                y: 410,
                fontSize: 28,
            },
            value: {
                x: 1600,
                y: 460,
                fontSize: 42,
            },
        },
    },
    
    downloadButton: {
        x: 960,  // 水平居中 (1920 / 2)
        y: 980, // 距离底部50单位 (1080 - 50)
    },
    
    // 教学文案位置配置
    guideTexts: {
        intro: {
            x: 606,  // 与牌局中心对齐 (200 + 3*140 + 132/2)
            y: 650,  // 牌局下方
        },
        objective: {
            x: 606,  // 与牌局中心对齐
            y: 780,  // 第一个文案下方80单位
        },
        aceToFoundation: {
            x: 606,  // 与牌局中心对齐 (200 + 3*140 + 132/2)
            y: 650,    // 与intro位置相同
        },
    },
};
