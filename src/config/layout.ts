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
            // 红心5组
            cards: [
                // 4张背面朝上的牌
                { suit: 'd', value: '2', faceUp: false },
                { suit: 's', value: '3', faceUp: false },
                { suit: 'c', value: '4', faceUp: false },
                { suit: 'h', value: '6', faceUp: false },
                // 底部红心5
                { suit: 'h', value: '5', faceUp: true }
            ]
        },
        {
            // 梅花10组
            cards: [
                // 4张背面朝上的牌
                { suit: 'h', value: '6', faceUp: false },
                { suit: 'd', value: '7', faceUp: false },
                { suit: 's', value: '9', faceUp: false },
                { suit: 'h', value: '8', faceUp: false },
                // 底部梅花10
                { suit: 'c', value: '10', faceUp: true }
            ]
        }
    ],

    // 中间三列
    centerPiles: [
        {
            // 黑桃4列
            cards: [
                // 15张背面朝上的牌
                { suit: 'd', value: '3', faceUp: false },
                { suit: 'h', value: '4', faceUp: false },
                { suit: 'c', value: '5', faceUp: false },
                { suit: 'd', value: '6', faceUp: false },
                { suit: 'h', value: '7', faceUp: false },
                { suit: 'c', value: '8', faceUp: false },
                { suit: 'd', value: '9', faceUp: false },
                { suit: 'h', value: '10', faceUp: false },
                { suit: 'c', value: 'J', faceUp: false },
                { suit: 'd', value: 'Q', faceUp: false },
                { suit: 'h', value: 'K', faceUp: false },
                { suit: 'c', value: 'A', faceUp: false },
                { suit: 'd', value: '4', faceUp: false },
                { suit: 'h', value: '2', faceUp: false },
                { suit: 'c', value: '3', faceUp: false },
                // 底部黑桃4
                { suit: 's', value: '4', faceUp: true }
            ]
        },
        {
            // 黑桃8列
            cards: [
                // 15张背面朝上的牌
                { suit: 'h', value: '3', faceUp: false },
                { suit: 'c', value: '6', faceUp: false },
                { suit: 'd', value: '8', faceUp: false },
                { suit: 'h', value: '9', faceUp: false },
                { suit: 'c', value: '2', faceUp: false },
                { suit: 'd', value: '5', faceUp: false },
                { suit: 'h', value: 'J', faceUp: false },
                { suit: 'c', value: 'Q', faceUp: false },
                { suit: 'd', value: 'K', faceUp: false },
                { suit: 'h', value: 'A', faceUp: false },
                { suit: 'c', value: '7', faceUp: false },
                { suit: 'd', value: '10', faceUp: false },
                { suit: 'h', value: 'Q', faceUp: false },
                { suit: 'c', value: 'K', faceUp: false },
                { suit: 'd', value: 'A', faceUp: false },
                // 底部黑桃8
                { suit: 's', value: '8', faceUp: true }
            ]
        },
        {
            // 红心7列
            cards: [
                // 15张背面朝上的牌
                { suit: 'c', value: '9', faceUp: false },
                { suit: 'd', value: 'J', faceUp: false },
                { suit: 'h', value: 'K', faceUp: false },
                { suit: 'c', value: 'A', faceUp: false },
                { suit: 'd', value: '2', faceUp: false },
                { suit: 'h', value: '3', faceUp: false },
                { suit: 'c', value: '4', faceUp: false },
                { suit: 'd', value: '5', faceUp: false },
                { suit: 'h', value: '6', faceUp: false },
                { suit: 'c', value: '8', faceUp: false },
                { suit: 'd', value: '9', faceUp: false },
                { suit: 'h', value: '10', faceUp: false },
                { suit: 'c', value: 'J', faceUp: false },
                { suit: 'd', value: 'Q', faceUp: false },
                { suit: 's', value: 'K', faceUp: false },
                // 底部红心7
                { suit: 'h', value: '7', faceUp: true }
            ]
        }
    ],

    // 右侧两组
    rightPiles: [
        {
            // 红心A组
            cards: [
                // 4张背面朝上的牌
                { suit: 's', value: '2', faceUp: false },
                { suit: 'c', value: '3', faceUp: false },
                { suit: 'd', value: '4', faceUp: false },
                { suit: 's', value: '5', faceUp: false },
                // 底部红心A
                { suit: 'h', value: 'A', faceUp: true }
            ]
        },
        {
            // 梅花J组
            cards: [
                // 4张背面朝上的牌
                { suit: 'd', value: '6', faceUp: false },
                { suit: 's', value: '7', faceUp: false },
                { suit: 'c', value: '8', faceUp: false },
                { suit: 'd', value: '9', faceUp: false },
                // 底部梅花J
                { suit: 'c', value: 'J', faceUp: true }
            ]
        }
    ]
};