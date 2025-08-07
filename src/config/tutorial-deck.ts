import { Card, CardSuit, CardValue, KlondikeLayout } from './klondike-layout';

// 教学关卡的固定牌局配置
// 根据需求文档中的具体布局设置

export function generateTutorialLayout(): KlondikeLayout {
    // 创建固定的教学牌局
    const tableau: Card[][] = [
        // 第1列：黑桃K (正面朝上)
        [
            { suit: 's' as CardSuit, value: 'K' as CardValue, faceUp: true }
        ],
        
        // 第2列：方块6 (背面) + 红桃Q (正面)
        [
            { suit: 'd' as CardSuit, value: '6' as CardValue, faceUp: false },
            { suit: 'h' as CardSuit, value: 'Q' as CardValue, faceUp: true }
        ],
        
        // 第3列：梅花5 (背面) + 方块9 (背面) + 黑桃J (正面)
        [
            { suit: 'c' as CardSuit, value: '5' as CardValue, faceUp: false },
            { suit: 'd' as CardSuit, value: '9' as CardValue, faceUp: false },
            { suit: 's' as CardSuit, value: 'J' as CardValue, faceUp: true }
        ],
        
        // 第4列：红桃4 (背面) + 梅花8 (背面) + 方块K (背面) + 红桃10 (正面)
        [
            { suit: 'h' as CardSuit, value: '4' as CardValue, faceUp: false },
            { suit: 'c' as CardSuit, value: '8' as CardValue, faceUp: false },
            { suit: 'd' as CardSuit, value: 'K' as CardValue, faceUp: false },
            { suit: 'h' as CardSuit, value: '10' as CardValue, faceUp: true }
        ],
        
        // 第5列：黑桃3 (背面) + 红桃7 (背面) + 梅花J (背面) + 方块Q (背面) + 黑桃9 (正面)
        [
            { suit: 's' as CardSuit, value: '3' as CardValue, faceUp: false },
            { suit: 'h' as CardSuit, value: '7' as CardValue, faceUp: false },
            { suit: 'c' as CardSuit, value: 'J' as CardValue, faceUp: false },
            { suit: 'd' as CardSuit, value: 'Q' as CardValue, faceUp: false },
            { suit: 's' as CardSuit, value: '9' as CardValue, faceUp: true }
        ],
        
        // 第6列：梅花2 (背面) + 黑桃6 (背面) + 红桃10 (背面) + 梅花K (背面) + 方块A (背面) + 红桃8 (正面)
        [
            { suit: 'c' as CardSuit, value: '2' as CardValue, faceUp: false },
            { suit: 's' as CardSuit, value: '6' as CardValue, faceUp: false },
            { suit: 'h' as CardSuit, value: '10' as CardValue, faceUp: false },
            { suit: 'c' as CardSuit, value: 'K' as CardValue, faceUp: false },
            { suit: 'd' as CardSuit, value: 'A' as CardValue, faceUp: false },
            { suit: 'h' as CardSuit, value: '8' as CardValue, faceUp: true }
        ],
        
        // 第7列：红桃A (背面) + 黑桃5 (背面) + 方块8 (背面) + 梅花Q (背面) + 黑桃K (背面) + 方块3 (背面) + 黑桃7 (正面)
        [
            { suit: 'h' as CardSuit, value: 'A' as CardValue, faceUp: false },
            { suit: 's' as CardSuit, value: '5' as CardValue, faceUp: false },
            { suit: 'd' as CardSuit, value: '8' as CardValue, faceUp: false },
            { suit: 'c' as CardSuit, value: 'Q' as CardValue, faceUp: false },
            { suit: 's' as CardSuit, value: 'K' as CardValue, faceUp: false },
            { suit: 'd' as CardSuit, value: '3' as CardValue, faceUp: false },
            { suit: 's' as CardSuit, value: '7' as CardValue, faceUp: true }
        ]
    ];

    // 库存牌堆：剩余24张牌，顶部是黑桃A
    const stock: Card[] = [
        // 黑桃A在顶部（最后翻出）
        { suit: 's' as CardSuit, value: 'A' as CardValue, faceUp: false },
        
        // 其他剩余卡牌（按教学需要排列）
        { suit: 'd' as CardSuit, value: '2' as CardValue, faceUp: false },
        { suit: 'c' as CardSuit, value: '3' as CardValue, faceUp: false },
        { suit: 'h' as CardSuit, value: '5' as CardValue, faceUp: false },
        { suit: 'd' as CardSuit, value: '7' as CardValue, faceUp: false },
        { suit: 'c' as CardSuit, value: '9' as CardValue, faceUp: false },
        { suit: 'h' as CardSuit, value: 'J' as CardValue, faceUp: false },
        
        { suit: 's' as CardSuit, value: '2' as CardValue, faceUp: false },
        { suit: 'd' as CardSuit, value: '4' as CardValue, faceUp: false },
        { suit: 'c' as CardSuit, value: '6' as CardValue, faceUp: false },
        { suit: 'h' as CardSuit, value: '9' as CardValue, faceUp: false },
        { suit: 's' as CardSuit, value: '8' as CardValue, faceUp: false },
        { suit: 'd' as CardSuit, value: '10' as CardValue, faceUp: false },
        { suit: 'c' as CardSuit, value: 'A' as CardValue, faceUp: false },
        
        { suit: 'h' as CardSuit, value: '2' as CardValue, faceUp: false },
        { suit: 's' as CardSuit, value: '4' as CardValue, faceUp: false },
        { suit: 'd' as CardSuit, value: '5' as CardValue, faceUp: false },
        { suit: 'c' as CardSuit, value: '7' as CardValue, faceUp: false },
        { suit: 'h' as CardSuit, value: '6' as CardValue, faceUp: false },
        { suit: 's' as CardSuit, value: '10' as CardValue, faceUp: false },
        { suit: 'd' as CardSuit, value: 'J' as CardValue, faceUp: false },
        
        { suit: 'c' as CardSuit, value: '4' as CardValue, faceUp: false },
        { suit: 'h' as CardSuit, value: '3' as CardValue, faceUp: false },
        { suit: 'c' as CardSuit, value: '10' as CardValue, faceUp: false }
    ];

    return {
        tableau,
        stock,
        waste: [], // 翻牌区域初始为空
        foundation: [[], [], [], []] // 4个空的基础牌堆
    };
}

// 教学关卡中的关键卡牌位置映射
export const TUTORIAL_KEY_CARDS = {
    // 步骤3需要的黑桃A（在库存牌堆顶部）
    SPADE_ACE: {
        suit: 's' as CardSuit,
        value: 'A' as CardValue,
        location: 'stock',
        position: 0 // 库存牌堆顶部
    },
    
    // 步骤4需要移动的红桃8（第6列顶部）
    HEART_8: {
        suit: 'h' as CardSuit,
        value: '8' as CardValue,
        location: 'tableau',
        column: 5, // 第6列（索引5）
        position: 'top'
    },
    
    // 步骤4的目标黑桃9（第5列顶部）
    SPADE_9: {
        suit: 's' as CardSuit,
        value: '9' as CardValue,
        location: 'tableau',
        column: 4, // 第5列（索引4）
        position: 'top'
    },
    
    // 步骤6需要移动的黑桃7（第7列顶部）
    SPADE_7: {
        suit: 's' as CardSuit,
        value: '7' as CardValue,
        location: 'tableau',
        column: 6, // 第7列（索引6）
        position: 'top'
    }
};

// 教学步骤验证函数
export class TutorialValidator {
    // 验证步骤3：黑桃A放入基础牌堆
    static validateStep3(card: any, foundationIndex: number): boolean {
        return card.suit === 's' && card.value === 'A';
    }
    
    // 验证步骤4：红桃8移动到黑桃9上
    static validateStep4(movedCard: any, targetCard: any): boolean {
        return movedCard.suit === 'h' &&
               movedCard.value === '8' &&
               targetCard.suit === 's' &&
               targetCard.value === '9';
    }
    
    // 验证步骤6：黑桃7移动到红桃8上
    static validateStep6(movedCard: any, targetCard: any): boolean {
        return movedCard.suit === 's' &&
               movedCard.value === '7' &&
               targetCard.suit === 'h' &&
               targetCard.value === '8';
    }
    
    // 检查卡牌是否可以移动到目标位置（Klondike规则）
    static canMoveCard(sourceCard: any, targetCard: any): boolean {
        // 红黑交替，数值递减
        const sourceIsRed = sourceCard.suit === 'h' || sourceCard.suit === 'd';
        const targetIsRed = targetCard.suit === 'h' || targetCard.suit === 'd';
        
        const sourceValue = this.getCardNumericValue(sourceCard.value);
        const targetValue = this.getCardNumericValue(targetCard.value);
        
        return sourceIsRed !== targetIsRed && targetValue === sourceValue + 1;
    }
    
    // 获取卡牌数值
    static getCardNumericValue(value: CardValue): number {
        switch (value) {
            case 'A': return 1;
            case '2': return 2;
            case '3': return 3;
            case '4': return 4;
            case '5': return 5;
            case '6': return 6;
            case '7': return 7;
            case '8': return 8;
            case '9': return 9;
            case '10': return 10;
            case 'J': return 11;
            case 'Q': return 12;
            case 'K': return 13;
            default: return 0;
        }
    }
}

// 导出教学关卡常量
export const TUTORIAL_DECK_CONSTANTS = {
    TOTAL_CARDS: 52,
    TABLEAU_CARDS: 28, // 7列中的卡牌总数
    STOCK_CARDS: 24,   // 库存牌堆中的卡牌数
    FOUNDATION_PILES: 4,
    TABLEAU_COLUMNS: 7
};