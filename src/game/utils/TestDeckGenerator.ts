import { CardSuit, CardValue } from '../../config/klondike-layout';
import { Card as CardComponent } from '../components/Card';
import { Game } from '../scenes/Game';
import { getTestConfig } from '../../config/test-config';

/**
 * 测试牌局生成器
 * 用于创建特定的测试牌局，方便验证AutoComplete功能
 */
export class TestDeckGenerator {
    private scene: Game;

    constructor(scene: Game) {
        this.scene = scene;
    }

    /**
     * 生成所有卡牌翻开的测试牌局
     * 这种牌局便于测试AutoComplete按钮的显示逻辑
     */
    public generateAllFaceUpDeck(): CardComponent[] {
        console.log('🧪 生成所有卡牌翻开的测试牌局');
        
        const cards: CardComponent[] = [];
        const suits: CardSuit[] = ['h', 'd', 'c', 's'];
        const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

        // 创建完整的52张牌
        for (const suit of suits) {
            for (const value of values) {
                const card = new CardComponent(this.scene, 0, 0, suit, value, true); // 创建时就设为翻开
                cards.push(card);
            }
        }

        console.log(`✅ 生成了 ${cards.length} 张卡牌，全部翻开`);
        return this.shuffleCards(cards);
    }

    /**
     * 生成接近胜利的测试牌局
     * Foundation中已有部分卡牌，剩余卡牌便于收集
     */
    public generateNearWinDeck(): CardComponent[] {
        console.log('🧪 生成接近胜利的测试牌局');
        
        const cards: CardComponent[] = [];
        const suits: CardSuit[] = ['h', 'd', 'c', 's'];
        const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

        // 为每个花色创建卡牌，但跳过一些低值卡牌（模拟已经在foundation中）
        for (const suit of suits) {
            // 跳过A-5，从6开始创建（模拟A-5已在foundation中）
            for (let i = 5; i < values.length; i++) {
                const value = values[i];
                const card = new CardComponent(this.scene, 0, 0, suit, value, true); // 创建时就设为翻开
                cards.push(card);
            }
        }

        console.log(`✅ 生成了 ${cards.length} 张卡牌（接近胜利状态）`);
        return this.shuffleCards(cards);
    }

    /**
     * 生成专门的AutoComplete测试牌局
     * 设计能够完整展示收牌动画的牌局布局
     */
    public generateAutoCompleteTestDeck(): CardComponent[] {
        console.log('🧪 生成AutoComplete专用测试牌局');
        
        const cards: CardComponent[] = [];
        
        // 创建特定的卡牌组合，确保能够完整展示AutoComplete动画
        // Foundation预设: 红桃A,2; 方块A; 梅花A,2,3; 黑桃A
        // Tableau: 按顺序可收的卡牌
        // Stock: 剩余可收卡牌
        
        const testCards = [
            // Tableau区域的可收卡牌 (7张，每列一张)
            { suit: 'h' as CardSuit, value: '3' as CardValue, faceUp: true },  // 红桃3 (可收到红桃A,2之后)
            { suit: 'd' as CardSuit, value: '2' as CardValue, faceUp: true },  // 方块2 (可收到方块A之后)
            { suit: 's' as CardSuit, value: '2' as CardValue, faceUp: true },  // 黑桃2 (可收到黑桃A之后)
            { suit: 'h' as CardSuit, value: '4' as CardValue, faceUp: true },  // 红桃4 (可收到红桃3之后)
            { suit: 'd' as CardSuit, value: '3' as CardValue, faceUp: true },  // 方块3 (可收到方块2之后)
            { suit: 'c' as CardSuit, value: '4' as CardValue, faceUp: true },  // 梅花4 (可收到梅花A,2,3之后)
            { suit: 's' as CardSuit, value: '3' as CardValue, faceUp: true },  // 黑桃3 (可收到黑桃2之后)
            
            // Stock区域的可收卡牌 (按花色轮转顺序)
            { suit: 'h' as CardSuit, value: '5' as CardValue, faceUp: false }, // 红桃5
            { suit: 'd' as CardSuit, value: '4' as CardValue, faceUp: false }, // 方块4
            { suit: 's' as CardSuit, value: '4' as CardValue, faceUp: false }, // 黑桃4
            { suit: 'c' as CardSuit, value: '5' as CardValue, faceUp: false }, // 梅花5
            { suit: 'h' as CardSuit, value: '6' as CardValue, faceUp: false }, // 红桃6
            { suit: 'd' as CardSuit, value: '5' as CardValue, faceUp: false }, // 方块5
            { suit: 's' as CardSuit, value: '5' as CardValue, faceUp: false }, // 黑桃5
            { suit: 'c' as CardSuit, value: '6' as CardValue, faceUp: false }, // 梅花6
        ];
        
        for (const cardData of testCards) {
            const card = new CardComponent(this.scene, 0, 0, cardData.suit, cardData.value, cardData.faceUp);
            cards.push(card);
        }
        
        console.log(`✅ 生成了 ${cards.length} 张AutoComplete测试卡牌`);
        return cards;
    }

    /**
     * 预设AutoComplete测试牌局的Foundation卡牌
     */
    public presetAutoCompleteFoundationCards(): void {
        console.log('🧪 清空Foundation状态，准备手动测试');
        
        // 清空所有Foundation，让玩家可以手动收牌后再测试AutoComplete
        for (let i = 0; i < this.scene.foundation.length; i++) {
            const foundation = this.scene.foundation[i];
            
            // 移除所有预设的卡牌
            for (const card of foundation.cards) {
                if (card && card.destroy) {
                    card.destroy();
                }
            }
            
            // 清空Foundation数组
            foundation.cards = [];
        }
        
        console.log('✅ Foundation状态已清空，可以开始手动收牌测试');
        console.log('🎯 测试流程: 1. 手动收一些牌到Foundation 2. 点击AutoComplete按钮');
    }

    /**
     * 生成自定义测试牌局
     * 可以指定特定的卡牌组合
     */
    public generateCustomDeck(customCards?: { suit: CardSuit; value: CardValue; faceUp: boolean }[]): CardComponent[] {
        console.log('🧪 生成自定义测试牌局');
        
        if (!customCards) {
            // 默认自定义牌局：每个花色只有几张高值牌
            customCards = [
                { suit: 'h', value: 'J', faceUp: true },
                { suit: 'h', value: 'Q', faceUp: true },
                { suit: 'h', value: 'K', faceUp: true },
                { suit: 'd', value: 'J', faceUp: true },
                { suit: 'd', value: 'Q', faceUp: true },
                { suit: 'd', value: 'K', faceUp: true },
                { suit: 'c', value: '10', faceUp: true },
                { suit: 'c', value: 'J', faceUp: true },
                { suit: 'c', value: 'Q', faceUp: true },
                { suit: 's', value: '10', faceUp: true },
                { suit: 's', value: 'J', faceUp: true },
                { suit: 's', value: 'Q', faceUp: true },
            ];
        }

        const cards: CardComponent[] = [];
        for (const cardData of customCards) {
            const card = new CardComponent(this.scene, 0, 0, cardData.suit, cardData.value, cardData.faceUp);
            cards.push(card);
        }

        console.log(`✅ 生成了 ${cards.length} 张自定义卡牌`);
        return cards;
    }

    /**
     * 根据配置生成对应的测试牌局
     */
    public generateTestDeck(): CardComponent[] {
        const config = getTestConfig();
        
        if (!config.ENABLE_TEST_DECK) {
            console.log('🚫 测试模式未启用，使用正常牌局');
            return this.generateNormalDeck();
        }

        console.log(`🧪 测试模式启用，生成测试牌局类型: ${config.TEST_DECK_TYPE}`);

        switch (config.TEST_DECK_TYPE) {
            case 'all_face_up':
                return this.generateAllFaceUpDeck();
            case 'near_win':
                return this.generateNearWinDeck();
            case 'custom':
                return this.generateCustomDeck();
            default:
                console.warn(`⚠️ 未知的测试牌局类型: ${config.TEST_DECK_TYPE}，使用默认牌局`);
                return this.generateNormalDeck();
        }
    }

    /**
     * 生成正常的52张牌（用于非测试模式）
     */
    private generateNormalDeck(): CardComponent[] {
        const cards: CardComponent[] = [];
        const suits: CardSuit[] = ['h', 'd', 'c', 's'];
        const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

        for (const suit of suits) {
            for (const value of values) {
                const card = new CardComponent(this.scene, 0, 0, suit, value, false); // 正常模式下背面朝上
                cards.push(card);
            }
        }

        return this.shuffleCards(cards);
    }

    /**
     * 洗牌算法（Fisher-Yates shuffle）
     */
    private shuffleCards(cards: CardComponent[]): CardComponent[] {
        const shuffled = [...cards];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * 强制翻开所有tableau卡牌（用于测试）
     */
    public forceFlipAllTableauCards(): void {
        const config = getTestConfig();
        if (!config.ALL_CARDS_FACE_UP) {
            return;
        }

        console.log('🧪 强制翻开所有tableau卡牌');
        let flippedCount = 0;

        for (const column of this.scene.tableau) {
            for (const card of column.cards) {
                if (!card.faceUp) {
                    // 使用flip方法来翻转卡牌
                    card.flip().then(() => {
                        flippedCount++;
                    }).catch(error => {
                        console.warn('翻转卡牌失败:', error);
                    });
                }
            }
        }

        console.log(`✅ 强制翻开了 ${flippedCount} 张卡牌`);
        
        // 更新按钮显示状态
        this.scene.updateAutoCompleteButtonVisibility();
    }

    /**
     * 预设Foundation中的卡牌（用于接近胜利的测试）
     */
    public presetFoundationCards(): void {
        const config = getTestConfig();
        if (config.TEST_DECK_TYPE !== 'near_win') {
            return;
        }

        console.log('🧪 预设Foundation中的卡牌');
        const suits: CardSuit[] = ['h', 'd', 'c', 's'];
        const presetValues: CardValue[] = ['A', '2', '3', '4', '5'];

        for (let suitIndex = 0; suitIndex < suits.length; suitIndex++) {
            const suit = suits[suitIndex];
            const foundation = this.scene.foundation[suitIndex];
            
            for (const value of presetValues) {
                const card = new CardComponent(this.scene, 0, 0, suit, value, true); // 创建时就设为翻开
                foundation.cards.push(card);
                
                // 设置卡牌位置
                const foundationZone = this.scene.foundationZones[suitIndex];
                card.setPosition(foundationZone.x, foundationZone.y);
                card.setDepth(10 + foundation.cards.length);
            }
        }

        console.log('✅ 预设Foundation卡牌完成');
    }
}