// 定义卡牌类型
export type CardSuit = 'h' | 'd' | 's' | 'c';  // h=hearts(红桃), d=diamonds(方块), s=spades(黑桃), c=clubs(梅花)
export type CardValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

// 定义卡牌接口
export interface Card {
    suit: CardSuit;
    value: CardValue;
    faceUp: boolean;
}

// 初始牌局布局
export const initialLayout = {
    // 左侧两组
    leftPiles: [
        {
            // 黑桃6组
            cards: [
                // 4张背面朝上的牌
                { suit: 's', value: '7', faceUp: false },
                { suit: 's', value: '8', faceUp: false },
                { suit: 's', value: '9', faceUp: false },
                { suit: 's', value: '7', faceUp: false },
                // 底部黑桃6
                { suit: 's', value: '6', faceUp: true }
            ]
        },
        {
            // 黑桃8组（原红桃8组）
            cards: [
                // 4张背面朝上的牌
                { suit: 's', value: '9', faceUp: false },
                { suit: 's', value: '10', faceUp: false },
                { suit: 's', value: 'J', faceUp: false },
                { suit: 's', value: 'Q', faceUp: false },
                // 底部黑桃8
                { suit: 's', value: '8', faceUp: true }
            ]
        }
    ],

    // 中间三列
    centerPiles: [
        {
            // 黑桃7列（原梅花7列）
            cards: [
                // 15张背面朝上的牌
                { suit: 's', value: '8', faceUp: false },
                { suit: 's', value: '9', faceUp: false },
                { suit: 's', value: '10', faceUp: false },
                { suit: 's', value: 'J', faceUp: false },
                { suit: 's', value: 'Q', faceUp: false },
                { suit: 's', value: 'K', faceUp: false },
                { suit: 's', value: 'A', faceUp: false },
                { suit: 's', value: '2', faceUp: false },
                { suit: 's', value: '3', faceUp: false },
                { suit: 's', value: '4', faceUp: false },
                { suit: 's', value: '5', faceUp: false },
                { suit: 's', value: '6', faceUp: false },
                { suit: 's', value: '7', faceUp: false },
                { suit: 's', value: '8', faceUp: false },
                { suit: 's', value: '9', faceUp: false },
                // 底部黑桃7
                { suit: 's', value: '7', faceUp: true }
            ]
        },
        {
            // 黑桃5列（原方块5列）
            cards: [
                // 15张背面朝上的牌
                { suit: 's', value: '6', faceUp: false },
                { suit: 's', value: '7', faceUp: false },
                { suit: 's', value: '8', faceUp: false },
                { suit: 's', value: '9', faceUp: false },
                { suit: 's', value: '10', faceUp: false },
                { suit: 's', value: 'J', faceUp: false },
                { suit: 's', value: 'Q', faceUp: false },
                { suit: 's', value: 'K', faceUp: false },
                { suit: 's', value: 'A', faceUp: false },
                { suit: 's', value: '2', faceUp: false },
                { suit: 's', value: '3', faceUp: false },
                { suit: 's', value: '4', faceUp: false },
                { suit: 's', value: '5', faceUp: false },
                { suit: 's', value: '6', faceUp: false },
                { suit: 's', value: '7', faceUp: false },
                // 底部黑桃5
                { suit: 's', value: '5', faceUp: true }
            ]
        },
        {
            // 黑桃4列
            cards: [
                // 15张背面朝上的牌
                { suit: 's', value: '5', faceUp: false },
                { suit: 's', value: '6', faceUp: false },
                { suit: 's', value: '7', faceUp: false },
                { suit: 's', value: '8', faceUp: false },
                { suit: 's', value: '9', faceUp: false },
                { suit: 's', value: '10', faceUp: false },
                { suit: 's', value: 'J', faceUp: false },
                { suit: 's', value: 'Q', faceUp: false },
                { suit: 's', value: 'K', faceUp: false },
                { suit: 's', value: 'A', faceUp: false },
                { suit: 's', value: '2', faceUp: false },
                { suit: 's', value: '3', faceUp: false },
                { suit: 's', value: '4', faceUp: false },
                { suit: 's', value: '5', faceUp: false },
                { suit: 's', value: '6', faceUp: false },
                // 底部黑桃4
                { suit: 's', value: '4', faceUp: true }
            ]
        }
    ],

    // 右侧两组
    rightPiles: [
        {
            // 黑桃3组（原红桃3组）
            cards: [
                // 4张背面朝上的牌
                { suit: 's', value: '4', faceUp: false },
                { suit: 's', value: '5', faceUp: false },
                { suit: 's', value: '6', faceUp: false },
                { suit: 's', value: '7', faceUp: false },
                // 底部黑桃3
                { suit: 's', value: '3', faceUp: true }
            ]
        },
        {
            // 黑桃2组（原方块2组）
            cards: [
                // 4张背面朝上的牌
                { suit: 's', value: '3', faceUp: false },
                { suit: 's', value: '4', faceUp: false },
                { suit: 's', value: '5', faceUp: false },
                { suit: 's', value: '6', faceUp: false },
                // 底部黑桃2
                { suit: 's', value: '2', faceUp: true }
            ]
        }
    ]
};