import { Scene } from 'phaser';
import { Card as CardComponent } from './Card';
import { Game } from '../scenes/Game';
import { CardSuit, CardValue } from '../../config/klondike-layout';
import { EventBus } from '../EventBus';
import { AssetKeys } from '../../assets';
import outputConfig from '../../config/output-config.json';

// AutoComplete配置参数
const AUTO_COMPLETE_CONFIG = {
    CARD_MOVE_DELAY: 30,        // 收牌间隔时间(ms)
    CARD_FLIGHT_DURATION: 300,  // 卡牌飞行时间(ms)
    STOCK_FLIP_DURATION: 200,   // Stock翻牌时间(ms)
    MAX_LOOP_ITERATIONS: 100,   // 最大循环次数保护
    DEBUG_MODE: false,          // 调试模式开关
    BUTTON_FADE_DURATION: 400   // 按钮淡出动画时长(ms)
};

// 卡牌移动动作接口
interface CardMoveAction {
    card: CardComponent;
    targetFoundation: number;
    delay: number;
    fromStock?: boolean; // 是否来自stock区域
}

/**
 * AutoComplete自动收牌管理器
 * 负责检测可收牌、执行收牌动画和特效
 */
export class AutoCompleteManager {
    private scene: Game;
    private isRunning: boolean = false;
    private suitOrder: CardSuit[] = ['h', 'd', 'c', 's']; // 红桃、方块、梅花、黑桃

    constructor(scene: Game) {
        this.scene = scene;
    }

    /**
     * 开始自动收牌流程
     */
    public async startAutoComplete(): Promise<void> {
        // 双重检查运行状态
        if (this.isRunning) {
            console.log('🔄 AutoComplete已在运行中，忽略重复调用');
            return;
        }

        // 检查基础条件
        if (!this.scene || !this.scene.foundation || !this.scene.tableau) {
            console.error('❌ 游戏场景未正确初始化，无法执行AutoComplete');
            return;
        }

        console.log('🚀 开始AutoComplete自动收牌');
        console.log('🔍 检查游戏状态:');
        console.log('  - Foundation数量:', this.scene.foundation.length);
        console.log('  - Tableau数量:', this.scene.tableau.length);
        console.log('  - Stock卡牌数量:', this.scene.stock?.cards?.length || 0);
        console.log('  - Waste卡牌数量:', this.scene.waste?.cards?.length || 0);
        
        this.isRunning = true;

        try {
            console.log('📋 开始生成收牌序列...');
            // 生成收牌序列
            const actions = this.generateCollectionSequence();
            
            if (actions.length === 0) {
                console.log('📝 没有找到可收的牌');
                console.log('🔍 检查是否有可收牌:', this.hasCollectableCards());
                return;
            }

            console.log(`📋 找到 ${actions.length} 张可收的牌`);
            actions.forEach((action, index) => {
                console.log(`  ${index + 1}. ${action.card.suit}${action.card.value} -> Foundation ${action.targetFoundation} (延迟: ${action.delay}ms, 来自Stock: ${action.fromStock})`);
            });

            console.log('🎬 开始执行收牌动画序列...');
            // 执行收牌动画序列
            await this.executeCollectionSequence(actions);

            console.log('✅ AutoComplete完成');
            
            // 延迟确保所有收牌动画完成，然后检测胜利并执行淡出动画
            setTimeout(() => {
                console.log('🏆 AutoComplete完成后检测胜利状态...');
                console.log('🔍 当前Foundation状态:', this.scene.foundation.map(pile => pile.cards.length));
                
                if (this.scene.checkGameWinCondition()) {
                    console.log('🎉 检测到游戏胜利，触发胜利动画');
                    this.scene.triggerGameWin();
                } else {
                    console.log('🔍 游戏尚未完成，继续等待玩家操作');
                    console.log('🔍 需要每个Foundation都有13张牌才能胜利');
                }
                
                // 无论是否胜利，都执行按钮淡出动画
                this.requestButtonFadeOut();
            }, 800); // 增加延迟时间，确保所有动画完成
        } catch (error) {
            console.error('❌ AutoComplete执行失败:', error);
            if (error instanceof Error) {
                console.error('❌ 错误堆栈:', error.stack);
            }
            // 尝试恢复游戏状态
            this.handleExecutionError(error);
        } finally {
            this.isRunning = false;
            console.log('🔄 AutoComplete状态已重置');
        }
    }

    /**
     * 处理执行错误
     */
    private handleExecutionError(error: any): void {
        console.log('🔧 尝试恢复AutoComplete状态...');
        
        // 重置运行状态
        this.isRunning = false;
        
        // 可以在这里添加更多的状态恢复逻辑
        console.log('✅ AutoComplete状态已恢复');
    }

    /**
     * 生成收牌序列
     * 修复：每个花色按A→K顺序收牌，避免死循环
     */
    private generateCollectionSequence(): CardMoveAction[] {
        const actions: CardMoveAction[] = [];
        const completedSuits = new Set<CardSuit>();
        let actionDelay = 0;
        let loopIterations = 0;
        
        // 创建虚拟的Foundation状态来模拟收牌过程
        const virtualFoundationCounts = this.scene.foundation.map(pile => pile.cards.length);
        
        // 创建已使用卡牌的集合来避免重复收集同一张牌
        const usedCards = new Set<CardComponent>();

        if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
            console.log('🚀 开始生成收牌序列 - 每个花色按A→K顺序收牌');
            console.log('🔍 初始Foundation状态:', virtualFoundationCounts);
        }

        // 持续查找直到没有可收的牌
        while (completedSuits.size < 4 && loopIterations < AUTO_COMPLETE_CONFIG.MAX_LOOP_ITERATIONS) {
            let foundAnyCard = false;
            loopIterations++;

            // 对每个花色，每轮只收集一张牌（轮流收牌）
            for (const suit of this.suitOrder) {
                if (completedSuits.has(suit)) {
                    continue; // 跳过已完成的花色
                }

                const foundationIndex = this.getSuitFoundationIndex(suit);
                const nextCard = this.findNextCardForSuitWithExclusions(suit, virtualFoundationCounts[foundationIndex], usedCards);
                
                if (nextCard) {
                    actions.push({
                        card: nextCard.card,
                        targetFoundation: foundationIndex,
                        delay: actionDelay,
                        fromStock: nextCard.fromStock
                    });

                    // 模拟收牌：更新虚拟Foundation计数并标记卡牌为已使用
                    virtualFoundationCounts[foundationIndex]++;
                    usedCards.add(nextCard.card);
                    
                    actionDelay += AUTO_COMPLETE_CONFIG.CARD_MOVE_DELAY;
                    foundAnyCard = true;

                    if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                        console.log(`🎯 轮流收牌: ${nextCard.card.suit}${nextCard.card.value} -> Foundation ${foundationIndex} (虚拟计数: ${virtualFoundationCounts[foundationIndex]})`);
                    }

                    // 检查该花色是否完成（K已收集）
                    if (virtualFoundationCounts[foundationIndex] >= 13) {
                        completedSuits.add(suit);
                        if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                            console.log(`✅ 花色 ${suit} 将完成`);
                        }
                    }
                } else {
                    if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                        console.log(`🔍 花色 ${suit} 暂时没有可收的牌`);
                    }
                }
            }

            if (!foundAnyCard) {
                if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                    console.log('🔍 本轮未找到任何可收的牌，退出循环');
                }
                break; // 没有找到任何可收的牌，退出循环
            }

            // 防止无限循环的额外保护
            if (loopIterations >= AUTO_COMPLETE_CONFIG.MAX_LOOP_ITERATIONS) {
                console.warn(`⚠️ AutoComplete循环达到最大次数限制 (${AUTO_COMPLETE_CONFIG.MAX_LOOP_ITERATIONS})，强制退出`);
                break;
            }
        }

        console.log(`📋 生成收牌序列完成: ${actions.length} 个动作，循环 ${loopIterations} 次`);
        return actions;
    }

    /**
     * 查找指定花色的下一张可收牌（带排除列表，避免重复收集）
     */
    private findNextCardForSuitWithExclusions(suit: CardSuit, currentCount: number, usedCards: Set<CardComponent>): { card: CardComponent; fromStock: boolean } | null {
        const expectedValue = this.getNextExpectedValue(currentCount);

        if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
            console.log(`🔍 查找花色 ${suit} 的下一张牌，期望值: ${expectedValue}, 当前计数: ${currentCount}`);
        }

        if (!expectedValue) {
            if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                console.log(`🔍 花色 ${suit} 已完成，跳过`);
            }
            return null; // 该花色已完成
        }

        // 1. 先检查tableau区域（已翻开的卡牌）
        for (let i = 0; i < this.scene.tableau.length; i++) {
            const column = this.scene.tableau[i];
            if (column.cards.length > 0) {
                const topCard = column.cards[column.cards.length - 1];
                if (topCard.suit === suit && topCard.value === expectedValue && topCard.faceUp && !usedCards.has(topCard)) {
                    if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                        console.log(`🎯 在tableau列${i}找到可收牌: ${topCard.suit}${topCard.value}`);
                    }
                    return { card: topCard, fromStock: false };
                }
            }
        }

        // 2. 检查waste区域（翻牌区域的顶牌）
        if (this.scene.waste.cards.length > 0) {
            const topCard = this.scene.waste.cards[this.scene.waste.cards.length - 1];
            if (topCard.suit === suit && topCard.value === expectedValue && !usedCards.has(topCard)) {
                if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                    console.log(`🎯 在waste区域找到可收牌: ${topCard.suit}${topCard.value}`);
                }
                return { card: topCard, fromStock: false };
            }
        }

        // 3. 检查stock区域（未翻开的卡牌）
        const stockResult = this.findCardInStockWithExclusions(suit, expectedValue, usedCards);
        if (stockResult) {
            if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                console.log(`🎯 在stock区域找到可收牌: ${stockResult.card.suit}${stockResult.card.value}`);
            }
            return { card: stockResult.card, fromStock: true };
        }

        // 4. 检查deck中的所有卡牌（包括未翻开的）
        const deckResult = this.findCardInDeckWithExclusions(suit, expectedValue, usedCards);
        if (deckResult) {
            if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                console.log(`🎯 在deck中找到可收牌: ${deckResult.card.suit}${deckResult.card.value}`);
            }
            return { card: deckResult.card, fromStock: true };
        }
        
        if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
            console.log(`🔍 未找到花色 ${suit} 值为 ${expectedValue} 的可收牌`);
        }
        return null;
    }

    /**
     * 查找指定花色的下一张可收牌
     */
    private findNextCardForSuit(suit: CardSuit): { card: CardComponent; fromStock: boolean } | null {
        const foundationIndex = this.getSuitFoundationIndex(suit);
        const foundation = this.scene.foundation[foundationIndex];
        const expectedValue = this.getNextExpectedValue(foundation.cards.length);

        if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
            console.log(`🔍 查找花色 ${suit} 的下一张牌，期望值: ${expectedValue}, 当前foundation有 ${foundation.cards.length} 张牌`);
        }

        if (!expectedValue) {
            if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                console.log(`🔍 花色 ${suit} 已完成，跳过`);
            }
            return null; // 该花色已完成
        }

        // 1. 先检查tableau区域（已翻开的卡牌）
        for (let i = 0; i < this.scene.tableau.length; i++) {
            const column = this.scene.tableau[i];
            if (column.cards.length > 0) {
                const topCard = column.cards[column.cards.length - 1];
                if (topCard.suit === suit && topCard.value === expectedValue && topCard.faceUp) {
                    if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                        console.log(`🎯 在tableau列${i}找到可收牌: ${topCard.suit}${topCard.value}`);
                    }
                    return { card: topCard, fromStock: false };
                }
            }
        }

        // 2. 检查waste区域（翻牌区域的顶牌）
        if (this.scene.waste.cards.length > 0) {
            const topCard = this.scene.waste.cards[this.scene.waste.cards.length - 1];
            if (topCard.suit === suit && topCard.value === expectedValue) {
                if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                    console.log(`🎯 在waste区域找到可收牌: ${topCard.suit}${topCard.value}`);
                }
                return { card: topCard, fromStock: false };
            }
        }

        // 3. 检查stock区域（未翻开的卡牌）
        const stockResult = this.findCardInStock(suit, expectedValue);
        if (stockResult) {
            if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                console.log(`🎯 在stock区域找到可收牌: ${stockResult.card.suit}${stockResult.card.value}`);
            }
            return { card: stockResult.card, fromStock: true };
        }

        // 4. 检查deck中的所有卡牌（包括未翻开的）
        const deckResult = this.findCardInDeck(suit, expectedValue);
        if (deckResult) {
            if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                console.log(`🎯 在deck中找到可收牌: ${deckResult.card.suit}${deckResult.card.value}`);
            }
            return { card: deckResult.card, fromStock: true };
        }
        
        if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
            console.log(`🔍 未找到花色 ${suit} 值为 ${expectedValue} 的可收牌`);
        }
        return null;
    }

    /**
     * 在stock区域查找指定卡牌（带排除列表，适配StockStackManager）
     */
    private findCardInStockWithExclusions(suit: CardSuit, value: CardValue, usedCards: Set<CardComponent>): { card: CardComponent; fromStock: boolean } | null {
        // 优先从StockStackManager获取卡牌
        const stockStackManager = this.scene.getStockStackManager();
        if (stockStackManager) {
            const allCards = stockStackManager.getAllCards();
            for (let i = 0; i < allCards.length; i++) {
                const card = allCards[i];
                
                if (card.suit === suit && card.value === value && !usedCards.has(card)) {
                    if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                        console.log(`🎯 在堆叠stock[${i}]找到目标卡牌: ${card.suit}${card.value}`);
                    }
                    return { card: card, fromStock: true };
                }
            }
        } else {
            // 回退到原有逻辑：检查stock中的所有卡牌（包括未翻开的）
            for (let i = 0; i < this.scene.stock.cards.length; i++) {
                const card = this.scene.stock.cards[i];
                
                if (card.suit === suit && card.value === value && !usedCards.has(card)) {
                    if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                        console.log(`🎯 在stock[${i}]找到目标卡牌: ${card.suit}${card.value}`);
                    }
                    return { card: card, fromStock: true };
                }
            }
        }
        
        return null;
    }

    /**
     * 在stock区域查找指定卡牌（适配StockStackManager）
     */
    private findCardInStock(suit: CardSuit, value: CardValue): { card: CardComponent; fromStock: boolean } | null {
        // 优先从StockStackManager获取卡牌
        const stockStackManager = this.scene.getStockStackManager();
        if (stockStackManager) {
            const allCards = stockStackManager.getAllCards();
            for (let i = 0; i < allCards.length; i++) {
                const card = allCards[i];
                
                if (card.suit === suit && card.value === value) {
                    if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                        console.log(`🎯 在堆叠stock[${i}]找到目标卡牌: ${card.suit}${card.value}`);
                    }
                    return { card: card, fromStock: true };
                }
            }
        } else {
            // 回退到原有逻辑：检查stock中的所有卡牌（包括未翻开的）
            for (let i = 0; i < this.scene.stock.cards.length; i++) {
                const card = this.scene.stock.cards[i];
                
                if (card.suit === suit && card.value === value) {
                    if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                        console.log(`🎯 在stock[${i}]找到目标卡牌: ${card.suit}${card.value}`);
                    }
                    return { card: card, fromStock: true };
                }
            }
        }
        
        return null;
    }

    /**
     * 在deck中查找指定卡牌（包括所有未翻开的卡牌，带排除列表）
     */
    private findCardInDeckWithExclusions(suit: CardSuit, value: CardValue, usedCards: Set<CardComponent>): { card: CardComponent; fromStock: boolean } | null {
        // 获取所有卡牌（包括tableau、foundation、stock、waste中的所有卡牌）
        const allCards = this.scene.getAllCards();
        
        // 查找目标卡牌
        for (let i = 0; i < allCards.length; i++) {
            const card = allCards[i];
            
            // 跳过已使用的卡牌
            if (usedCards.has(card)) {
                continue;
            }
            
            // 跳过已经在foundation中的卡牌
            if (this.isCardInFoundation(card)) {
                continue;
            }
            
            // 跳过已经在tableau顶部且正面朝上的卡牌（已经被前面的检查覆盖）
            if (this.isCardAccessibleInTableau(card)) {
                continue;
            }
            
            // 跳过waste顶部的卡牌（已经被前面的检查覆盖）
            if (this.isCardTopOfWaste(card)) {
                continue;
            }
            
            if (card.suit === suit && card.value === value) {
                if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                    console.log(`🎯 在deck中找到目标卡牌: ${card.suit}${card.value} (位置: ${this.getCardLocation(card)})`);
                }
                return { card: card, fromStock: true };
            }
        }
        
        return null;
    }

    /**
     * 在deck中查找指定卡牌（包括所有未翻开的卡牌）
     */
    private findCardInDeck(suit: CardSuit, value: CardValue): { card: CardComponent; fromStock: boolean } | null {
        // 获取所有卡牌（包括tableau、foundation、stock、waste中的所有卡牌）
        const allCards = this.scene.getAllCards();
        
        // 查找目标卡牌
        for (let i = 0; i < allCards.length; i++) {
            const card = allCards[i];
            
            // 跳过已经在foundation中的卡牌
            if (this.isCardInFoundation(card)) {
                continue;
            }
            
            // 跳过已经在tableau顶部且正面朝上的卡牌（已经被前面的检查覆盖）
            if (this.isCardAccessibleInTableau(card)) {
                continue;
            }
            
            // 跳过waste顶部的卡牌（已经被前面的检查覆盖）
            if (this.isCardTopOfWaste(card)) {
                continue;
            }
            
            if (card.suit === suit && card.value === value) {
                if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                    console.log(`🎯 在deck中找到目标卡牌: ${card.suit}${card.value} (位置: ${this.getCardLocation(card)})`);
                }
                return { card: card, fromStock: true };
            }
        }
        
        return null;
    }

    /**
     * 检查卡牌是否在foundation中
     */
    private isCardInFoundation(card: CardComponent): boolean {
        for (const pile of this.scene.foundation) {
            if (pile.cards.includes(card)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 检查卡牌是否在tableau中且可访问（顶部且正面朝上）
     */
    private isCardAccessibleInTableau(card: CardComponent): boolean {
        for (const column of this.scene.tableau) {
            if (column.cards.length > 0) {
                const topCard = column.cards[column.cards.length - 1];
                if (topCard === card && card.faceUp) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 检查卡牌是否是waste区域的顶牌
     */
    private isCardTopOfWaste(card: CardComponent): boolean {
        if (this.scene.waste.cards.length > 0) {
            const topCard = this.scene.waste.cards[this.scene.waste.cards.length - 1];
            return topCard === card;
        }
        return false;
    }

    /**
     * 获取卡牌的位置描述（用于调试）
     */
    private getCardLocation(card: CardComponent): string {
        // 检查tableau
        for (let i = 0; i < this.scene.tableau.length; i++) {
            const column = this.scene.tableau[i];
            const index = column.cards.indexOf(card);
            if (index !== -1) {
                return `tableau[${i}][${index}]`;
            }
        }
        
        // 检查stock
        const stockIndex = this.scene.stock.cards.indexOf(card);
        if (stockIndex !== -1) {
            return `stock[${stockIndex}]`;
        }
        
        // 检查waste
        const wasteIndex = this.scene.waste.cards.indexOf(card);
        if (wasteIndex !== -1) {
            return `waste[${wasteIndex}]`;
        }
        
        // 检查foundation
        for (let i = 0; i < this.scene.foundation.length; i++) {
            const pile = this.scene.foundation[i];
            const index = pile.cards.indexOf(card);
            if (index !== -1) {
                return `foundation[${i}][${index}]`;
            }
        }
        
        return 'unknown';
    }

    /**
     * 执行收牌动画序列
     */
    private async executeCollectionSequence(actions: CardMoveAction[]): Promise<void> {
        // 创建所有动画的Promise数组，每个动画有自己的开始延迟
        const animationPromises = actions.map(action => {
            return new Promise<void>(async (resolve) => {
                // 等待开始延迟
                if (action.delay > 0) {
                    await this.delay(action.delay);
                }

                // 执行单个收牌动作
                await this.executeCardCollection(action);
                resolve();
            });
        });

        // 等待所有动画完成
        await Promise.all(animationPromises);
    }

    /**
     * 执行单个收牌动作
     * 修复：添加Stock区域翻牌动画功能
     */
    private async executeCardCollection(action: CardMoveAction): Promise<void> {
        const { card, targetFoundation, fromStock } = action;
        
        console.log(`🎯 收集卡牌: ${card.suit}${card.value} -> Foundation ${targetFoundation}${fromStock ? ' (来自Stock)' : ''}`);

        // 获取目标位置
        const targetX = this.scene.foundationZones[targetFoundation].x;
        const targetY = this.scene.foundationZones[targetFoundation].y;

        // 如果卡牌来自Stock且是背面朝上
        if (fromStock && !card.faceUp) {
            // 检查是否是Stock的最后一张牌（适配StockStackManager）
            let isLastStockCard = false;
            const stockStackManager = this.scene.getStockStackManager();
            if (stockStackManager) {
                isLastStockCard = stockStackManager.getCardCount() === 1;
            } else {
                isLastStockCard = this.scene.stock.cards.length === 1;
            }
            
            console.log(`🔄 Stock卡牌翻牌+飞行: ${card.suit}${card.value}${isLastStockCard ? ' (最后一张)' : ''}`);
            
            // 播放翻牌音效
            EventBus.emit('play-card-flip');
            
            if (isLastStockCard) {
                // 最后一张牌：使用stockZone进行翻转飞出动画
                await this.playStockZoneFlipAndFlyAnimation(card, targetX, targetY);
            } else {
                // 普通Stock卡牌：简化翻牌+飞行
                await this.playStockFlipAndFlightAnimation(card, targetX, targetY);
            }
        } else {
            // 普通卡牌只播放飞行动画
            await this.playCardFlightAnimation(card, targetX, targetY);
        }

        // 更新游戏状态
        this.updateGameState(card, targetFoundation);

        // 实时检查是否需要隐藏Stock区域（在更新游戏状态后重新检查，适配StockStackManager）
        if (fromStock) {
            const stockStackManager = this.scene.getStockStackManager();
            const isEmpty = stockStackManager ? stockStackManager.getCardCount() === 0 : this.scene.stock.cards.length === 0;
            if (isEmpty) {
                this.hideStockArea();
            }
        }

        // 播放音效
        EventBus.emit('play-slot-place');

        // 播放花色爆炸特效（稍微延迟以配合音效）
        await this.delay(50);
        await this.playExplosionEffect(card.suit, targetFoundation);
    }

    /**
     * 播放Stock区域卡牌翻牌动画
     */
    private async playStockFlipAnimation(card: CardComponent): Promise<void> {
        return new Promise((resolve) => {
            // 确保卡牌在最高层级
            card.setDepth(1000);

            // 翻牌动画：先缩小到0，然后翻面，再放大回原尺寸
            this.scene.tweens.add({
                targets: card,
                scaleX: 0,
                duration: AUTO_COMPLETE_CONFIG.STOCK_FLIP_DURATION / 2,
                ease: 'Power2.easeIn',
                onComplete: () => {
                    // 翻面
                    if (!card.faceUp) {
                        card.flip().then(() => {
                            // 放大回原尺寸
                            this.scene.tweens.add({
                                targets: card,
                                scaleX: 1,
                                duration: AUTO_COMPLETE_CONFIG.STOCK_FLIP_DURATION / 2,
                                ease: 'Power2.easeOut',
                                onComplete: () => {
                                    resolve();
                                }
                            });
                        }).catch(error => {
                            console.warn('翻牌失败:', error);
                            // 即使翻牌失败也要完成动画
                            this.scene.tweens.add({
                                targets: card,
                                scaleX: 1,
                                duration: AUTO_COMPLETE_CONFIG.STOCK_FLIP_DURATION / 2,
                                ease: 'Power2.easeOut',
                                onComplete: () => {
                                    resolve();
                                }
                            });
                        });
                    } else {
                        // 如果已经是正面，直接放大回原尺寸
                        this.scene.tweens.add({
                            targets: card,
                            scaleX: 1,
                            duration: AUTO_COMPLETE_CONFIG.STOCK_FLIP_DURATION / 2,
                            ease: 'Power2.easeOut',
                            onComplete: () => {
                                resolve();
                            }
                        });
                    }
                }
            });
        });
    }

    /**
     * 播放卡牌飞行动画（根据配置选择轨迹）
     */
    private playCardFlightAnimation(card: CardComponent, targetX: number, targetY: number): Promise<void> {
        const trajectory = outputConfig.autoCompleteAnimation?.trajectory || 'curve';
        
        if (trajectory === 'linear') {
            return this.playLinearFlightAnimation(card, targetX, targetY);
        } else {
            return this.playCurveFlightAnimation(card, targetX, targetY);
        }
    }

    /**
     * 播放直线飞行动画
     */
    private playLinearFlightAnimation(card: CardComponent, targetX: number, targetY: number): Promise<void> {
        return new Promise((resolve) => {
            // 设置卡牌为最高层级
            card.setDepth(1000);

            // 直线飞行动画
            this.scene.tweens.add({
                targets: card,
                x: targetX,
                y: targetY,
                duration: AUTO_COMPLETE_CONFIG.CARD_FLIGHT_DURATION,
                ease: 'Power2.easeInOut',
                onComplete: () => {
                    // 确保最终位置准确
                    card.setPosition(targetX, targetY);
                    resolve();
                }
            });

            // 添加轻微的旋转效果
            this.scene.tweens.add({
                targets: card,
                rotation: 0.05,
                duration: AUTO_COMPLETE_CONFIG.CARD_FLIGHT_DURATION / 2,
                yoyo: true,
                ease: 'Sine.easeInOut'
            });

            if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                console.log(`🎬 直线飞行动画: ${card.suit}${card.value} -> (${targetX}, ${targetY})`);
            }
        });
    }

    /**
     * 播放弧线飞行动画
     */
    private playCurveFlightAnimation(card: CardComponent, targetX: number, targetY: number): Promise<void> {
        return new Promise((resolve) => {
            // 设置卡牌为最高层级
            card.setDepth(1000);

            // 记录起始位置
            const startX = card.x;
            const startY = card.y;

            // 计算弧形路径的中点
            const midX = (startX + targetX) / 2;
            const midY = Math.min(startY, targetY) - 50; // 弧形高度

            // 创建弧形飞行动画
            this.scene.tweens.add({
                targets: card,
                x: targetX,
                y: targetY,
                duration: AUTO_COMPLETE_CONFIG.CARD_FLIGHT_DURATION,
                ease: 'Power2.easeOut',
                onUpdate: (tween) => {
                    // 实现弧形路径
                    const progress = tween.progress;
                    if (progress < 0.5) {
                        // 前半段：从起点到中点
                        const t = progress * 2;
                        card.y = startY + (midY - startY) * t;
                    } else {
                        // 后半段：从中点到终点
                        const t = (progress - 0.5) * 2;
                        card.y = midY + (targetY - midY) * t;
                    }
                },
                onComplete: () => {
                    // 确保最终位置准确
                    card.setPosition(targetX, targetY);
                    resolve();
                }
            });

            // 添加轻微的旋转效果
            this.scene.tweens.add({
                targets: card,
                rotation: 0.1,
                duration: AUTO_COMPLETE_CONFIG.CARD_FLIGHT_DURATION / 2,
                yoyo: true,
                ease: 'Sine.easeInOut'
            });

            if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                console.log(`🎬 弧线飞行动画: ${card.suit}${card.value} -> (${targetX}, ${targetY})`);
            }
        });
    }

    /**
     * 更新游戏状态
     */
    private updateGameState(card: CardComponent, foundationIndex: number): void {
        // 从原位置移除卡牌
        this.removeCardFromOriginalPosition(card);
        
        // 禁用卡牌交互（Foundation区域的卡牌不应该可以拖拽）
        card.disableInteractive();
        
        // 添加到foundation
        this.scene.foundation[foundationIndex].cards.push(card);

        // 重新设置整个Foundation的深度，确保每张卡牌都有递增的深度
        this.updateFoundationDepth(foundationIndex);

        // 更新分数和步数
        this.scene.addScore(10);
        this.scene.addMove();

        // 触发事件
        EventBus.emit('card-to-foundation', {
            card: card,
            foundationIndex: foundationIndex
        });
    }

    /**
     * 更新指定Foundation的所有卡牌深度，确保每张卡牌都有递增的深度值
     */
    private updateFoundationDepth(foundationIndex: number): void {
        const foundation = this.scene.foundation[foundationIndex];
        foundation.cards.forEach((card, index) => {
            // 每张卡牌都有递增的深度值：基础深度10 + 卡牌在堆中的位置
            card.setDepth(10 + index + 1);
        });
        
        if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
            console.log(`🎯 更新Foundation ${foundationIndex} 深度，共 ${foundation.cards.length} 张卡牌`);
        }
    }

    /**
     * 从原位置移除卡牌
     */
    private removeCardFromOriginalPosition(card: CardComponent): void {
        // 从tableau移除
        for (const column of this.scene.tableau) {
            const index = column.cards.indexOf(card);
            if (index !== -1) {
                column.cards.splice(index, 1);
                return;
            }
        }

        // 从waste移除
        const wasteIndex = this.scene.waste.cards.indexOf(card);
        if (wasteIndex !== -1) {
            this.scene.waste.cards.splice(wasteIndex, 1);
            return;
        }

        // 从stock移除
        const stockIndex = this.scene.stock.cards.indexOf(card);
        if (stockIndex !== -1) {
            this.scene.stock.cards.splice(stockIndex, 1);
            
            // 从StockStackManager中移除卡牌
            const stockStackManager = this.scene.getStockStackManager();
            if (stockStackManager) {
                stockStackManager.removeCard(card);
                console.log('🔍 [AutoCompleteManager] 从堆叠管理器中移除卡牌:',
                    `${card.suit}${card.value}`);
            }
            return;
        }
    }

    /**
     * 播放花色爆炸特效
     */
    private async playExplosionEffect(suit: CardSuit, foundationIndex: number): Promise<void> {
        try {
            // 获取爆炸位置
            const x = this.scene.foundationZones[foundationIndex].x;
            const y = this.scene.foundationZones[foundationIndex].y;

            console.log(`🎆 播放花色爆炸特效: ${suit} 在位置 (${x}, ${y})`);

            // 使用现有的花色爆炸管理器
            const explosionManager = this.scene.getSuitExplosionManager();
            if (explosionManager) {
                await explosionManager.playExplosion(suit, x, y, 400); // 400ms爆炸动画
            } else {
                console.warn('⚠️ 花色爆炸管理器不可用');
            }
        } catch (error) {
            console.error('❌ 播放爆炸特效失败:', error);
        }
    }

    /**
     * 获取花色对应的foundation索引
     */
    private getSuitFoundationIndex(suit: CardSuit): number {
        const suitToIndex: Record<CardSuit, number> = {
            'h': 0,  // 红桃
            'd': 1,  // 方块
            'c': 2,  // 梅花
            's': 3   // 黑桃
        };
        return suitToIndex[suit];
    }

    /**
     * 获取下一个期望的卡牌值
     */
    private getNextExpectedValue(currentCount: number): CardValue | null {
        const valueOrder: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        if (currentCount >= 13) {
            return null; // 已完成
        }
        
        return valueOrder[currentCount];
    }

    /**
     * 检查foundation是否已完成
     */
    private isFoundationComplete(foundationIndex: number): boolean {
        return this.scene.foundation[foundationIndex].cards.length >= 13;
    }

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 检查tableau区域所有卡牌是否都翻开
     */
    public areAllTableauCardsFaceUp(): boolean {
        for (let i = 0; i < this.scene.tableau.length; i++) {
            const column = this.scene.tableau[i];
            for (let j = 0; j < column.cards.length; j++) {
                const card = column.cards[j];
                if (!card.faceUp) {
                    if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                        console.log(`❌ 发现背面朝上的卡牌: 列${i}[${j}] ${card.suit}${card.value}`);
                    }
                    return false;
                }
            }
        }
        
        if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
            console.log('✅ 所有tableau卡牌都已翻开');
        }
        return true;
    }

    /**
     * 检查是否可以显示AutoComplete按钮
     * 条件：所有tableau卡牌都翻开 且 有可收的牌
     */
    public canShowAutoCompleteButton(): boolean {
        const allFaceUp = this.areAllTableauCardsFaceUp();
        const hasCollectable = this.hasCollectableCards();
        
        if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
            console.log(`🔍 AutoComplete按钮显示检查: 所有卡牌翻开=${allFaceUp}, 有可收牌=${hasCollectable}`);
        }
        
        return allFaceUp && hasCollectable;
    }

    /**
     * 检查是否有可收的牌
     */
    public hasCollectableCards(): boolean {
        for (const suit of this.suitOrder) {
            if (this.findNextCardForSuit(suit)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 测试AutoComplete功能
     */
    public testAutoComplete(): void {
        console.log('🧪 开始测试AutoComplete功能');
        
        // 检查基础组件
        console.log('🔍 检查基础组件:');
        console.log('  - Scene存在:', !!this.scene);
        console.log('  - Foundation数量:', this.scene.foundation.length);
        console.log('  - Tableau数量:', this.scene.tableau.length);
        console.log('  - Stock卡牌数量:', this.scene.stock.cards.length);
        console.log('  - Waste卡牌数量:', this.scene.waste.cards.length);
        
        // 检查foundation状态
        console.log('🏗️ Foundation状态:');
        this.scene.foundation.forEach((pile, index) => {
            console.log(`  - Foundation ${index} (${pile.suit}): ${pile.cards.length} 张牌`);
        });
        
        // 检查tableau状态
        console.log('🃏 Tableau状态:');
        this.scene.tableau.forEach((column, index) => {
            const topCard = column.cards.length > 0 ? column.cards[column.cards.length - 1] : null;
            console.log(`  - 列 ${index}: ${column.cards.length} 张牌, 顶牌: ${topCard ? `${topCard.suit}${topCard.value}(${topCard.faceUp ? '正面' : '背面'})` : '无'}`);
        });
        
        // 测试检测逻辑
        console.log('🔍 测试可收牌检测:');
        const hasCollectable = this.hasCollectableCards();
        console.log(`  - 有可收牌: ${hasCollectable}`);
        
        if (hasCollectable) {
            console.log('🎯 生成收牌序列:');
            const actions = this.generateCollectionSequence();
            console.log(`  - 找到 ${actions.length} 个收牌动作`);
            actions.forEach((action, index) => {
                console.log(`    ${index + 1}. ${action.card.suit}${action.card.value} -> Foundation ${action.targetFoundation} (延迟: ${action.delay}ms)`);
            });
        }
        
        console.log('✅ AutoComplete测试完成');
    }

    /**
     * 简化版Stock卡牌翻牌+飞行动画
     * 反转在移动的前50%时间内完成，后50%时间以正面状态继续飞行
     */
    private async playStockFlipAndFlightAnimation(card: CardComponent, targetX: number, targetY: number): Promise<void> {
        return new Promise((resolve) => {
            // 获取StockStackManager以便在动画完成后更新堆叠
            const stockStackManager = this.scene.getStockStackManager();
            
            // 确保卡牌在最高层级
            card.setDepth(1000);

            // 先翻面到正面
            if (!card.faceUp) {
                card.flip().catch(error => {
                    console.warn('翻牌失败:', error);
                });
            }

            // 设置初始状态：正面但scaleX=0（不可见）
            card.setScale(0, 1);

            const flightDuration = AUTO_COMPLETE_CONFIG.CARD_FLIGHT_DURATION;
            const flipDuration = flightDuration * 0.5; // 翻转在前50%时间内完成

            // 翻转动画：scaleX从0到1，在前50%时间内完成
            this.scene.tweens.add({
                targets: card,
                scaleX: 1,
                duration: flipDuration,
                ease: 'Power2.easeOut'
            });

            // 飞行动画：整个过程移动到目标位置（根据配置选择轨迹）
            const trajectory = outputConfig.autoCompleteAnimation?.trajectory || 'curve';
            
            const onAnimationComplete = () => {
                // 动画完成后从StockStackManager中移除卡牌
                if (stockStackManager) {
                    stockStackManager.removeCard(card);
                    if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                        console.log(`🔍 从堆叠管理器中移除卡牌: ${card.suit}${card.value}, 剩余: ${stockStackManager.getCardCount()}`);
                    }
                }
                resolve();
            };
            
            if (trajectory === 'linear') {
                // 直线飞行
                this.scene.tweens.add({
                    targets: card,
                    x: targetX,
                    y: targetY,
                    duration: flightDuration,
                    ease: 'Power2.easeInOut',
                    onComplete: onAnimationComplete
                });
            } else {
                // 弧线飞行
                const startX = card.x;
                const startY = card.y;
                const midY = Math.min(startY, targetY) - 50; // 弧形高度
                
                this.scene.tweens.add({
                    targets: card,
                    x: targetX,
                    y: targetY,
                    duration: flightDuration,
                    ease: 'Power2.easeOut',
                    onUpdate: (tween) => {
                        // 实现弧形路径
                        const progress = tween.progress;
                        if (progress < 0.5) {
                            // 前半段：从起点到中点
                            const t = progress * 2;
                            card.y = startY + (midY - startY) * t;
                        } else {
                            // 后半段：从中点到终点
                            const t = (progress - 0.5) * 2;
                            card.y = midY + (targetY - midY) * t;
                        }
                    },
                    onComplete: onAnimationComplete
                });
            }

            if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                console.log(`🎬 优化翻牌+飞行动画: ${card.suit}${card.value} 前50%时间翻转，全程移动`);
            }
        });
    }

    /**
     * 🔧 修复：直接使用现有卡牌进行翻转飞出动画（用于最后一张牌，适配StockStackManager）
     */
    private async playStockZoneFlipAndFlyAnimation(card: CardComponent, targetX: number, targetY: number): Promise<void> {
        return new Promise((resolve) => {
            // 获取StockStackManager以便在动画完成后更新堆叠
            const stockStackManager = this.scene.getStockStackManager();
            
            // 🔧 直接使用现有卡牌，不再使用stockZone
            card.setDepth(1000); // 确保在最高层级
            card.setVisible(true);

            // 定义动画完成后的处理函数
            const onAnimationComplete = () => {
                // 从StockStackManager中移除卡牌
                if (stockStackManager) {
                    stockStackManager.removeCard(card);
                    if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                        console.log(`🔍 从堆叠管理器中移除最后一张卡牌: ${card.suit}${card.value}, 剩余: ${stockStackManager.getCardCount()}`);
                    }
                }
                
                resolve();
            };

            // 第一阶段：翻转动画（卡牌从背面变为正面）
            this.scene.tweens.add({
                targets: card,
                scaleX: 0,
                duration: AUTO_COMPLETE_CONFIG.STOCK_FLIP_DURATION / 2,
                ease: 'Power2.easeIn',
                onComplete: () => {
                    // 翻转卡牌到正面
                    if (!card.faceUp) {
                        card.setFaceUp(true);
                    }
                    
                    // 第二阶段：放大并飞行（根据配置选择轨迹）
                    const trajectory = outputConfig.autoCompleteAnimation?.trajectory || 'curve';
                    
                    if (trajectory === 'linear') {
                        // 直线飞行
                        this.scene.tweens.add({
                            targets: card,
                            scaleX: 1,
                            x: targetX,
                            y: targetY,
                            duration: AUTO_COMPLETE_CONFIG.CARD_FLIGHT_DURATION,
                            ease: 'Power2.easeInOut',
                            onComplete: onAnimationComplete
                        });
                    } else {
                        // 弧线飞行
                        const startX = card.x;
                        const startY = card.y;
                        const midY = Math.min(startY, targetY) - 50; // 弧形高度
                        
                        this.scene.tweens.add({
                            targets: card,
                            scaleX: 1,
                            x: targetX,
                            y: targetY,
                            duration: AUTO_COMPLETE_CONFIG.CARD_FLIGHT_DURATION,
                            ease: 'Power2.easeOut',
                            onUpdate: (tween) => {
                                // 实现弧形路径
                                const progress = tween.progress;
                                if (progress < 0.5) {
                                    // 前半段：从起点到中点
                                    const t = progress * 2;
                                    card.y = startY + (midY - startY) * t;
                                } else {
                                    // 后半段：从中点到终点
                                    const t = (progress - 0.5) * 2;
                                    card.y = midY + (targetY - midY) * t;
                                }
                            },
                            onComplete: onAnimationComplete
                        });
                    }
                }
            });

            if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
                console.log(`🎬 直接卡牌翻转飞出动画: ${card.suit}${card.value} (最后一张Stock卡牌)`);
            }
        });
    }

    /**
     * 隐藏Stock区域
     */
    private hideStockArea(): void {
        // 通过Game场景的公共方法来隐藏Stock区域
        this.scene.hideStockZone();
        
        if (AUTO_COMPLETE_CONFIG.DEBUG_MODE) {
            console.log('🚫 AutoComplete: 调用隐藏Stock区域');
        }
    }

    /**
     * 请求Game场景执行AutoComplete按钮淡出动画
     * 在自动完成功能执行完成后调用，提供优雅的按钮消失动画
     */
    private requestButtonFadeOut(): void {
        console.log('🎭 请求AutoComplete按钮淡出动画');
        
        // 通过Game场景的公共方法来执行淡出动画
        this.scene.fadeOutAutoCompleteButton();
    }

    /**
     * 销毁管理器
     */
    public destroy(): void {
        this.isRunning = false;
        console.log('🗑️ AutoCompleteManager已销毁');
    }
}