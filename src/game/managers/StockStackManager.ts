import { Card as CardComponent } from '../components/Card';
import { Game } from '../scenes/Game';

/**
 * Stock堆叠配置参数
 */
export const STACK_CONFIG = {
    MAX_VISIBLE_CARDS: 5,        // 最多显示5张卡牌
    STACK_OFFSET_X: 2,           // 每层水平偏移2px
    STACK_OFFSET_Y: 1,           // 每层垂直偏移1px
    BASE_DEPTH: 50,              // 基础深度值
    DEPTH_INCREMENT: 1           // 每层深度递增
};

/**
 * 堆叠卡牌信息
 */
interface StackedCard {
    card: CardComponent;
    stackIndex: number;          // 在堆叠中的索引（0为底部）
    isVisible: boolean;          // 是否可见
    offsetX: number;             // X轴偏移
    offsetY: number;             // Y轴偏移
    depth: number;               // 深度值
}

/**
 * Stock区域堆叠管理器
 * 负责管理stock区域中所有卡牌的堆叠显示效果
 */
export class StockStackManager {
    private scene: Game;
    private basePosition: { x: number; y: number };
    private stackedCards: StackedCard[] = [];
    private onCardClickCallback: ((card: CardComponent) => void) | null = null;

    constructor(scene: Game) {
        this.scene = scene;
        this.basePosition = { x: 0, y: 0 };
    }

    /**
     * 设置堆叠的基础位置
     */
    public setBasePosition(x: number, y: number): void {
        this.basePosition = { x, y };
        this.updateStackPositions();
    }

    /**
     * 添加卡牌到堆叠中
     */
    public addCard(card: CardComponent): void {
        const stackIndex = this.stackedCards.length;
        const isVisible = this.shouldCardBeVisible(stackIndex);
        
        const stackedCard: StackedCard = {
            card,
            stackIndex,
            isVisible,
            offsetX: this.calculateOffsetX(stackIndex),
            offsetY: this.calculateOffsetY(stackIndex),
            depth: this.calculateDepth(stackIndex)
        };

        this.stackedCards.push(stackedCard);
        this.updateCardDisplay(stackedCard);

        // 如果有回调函数，更新交互状态
        if (this.onCardClickCallback) {
            this.updateCardInteractions(this.onCardClickCallback);
        }

        console.log(`🔍 [StockStackManager] 添加卡牌到堆叠: ${card.suit}${card.value}, 索引: ${stackIndex}, 可见: ${isVisible}`);
    }

    /**
     * 从堆叠中移除卡牌
     */
    public removeCard(card: CardComponent): boolean {
        const index = this.stackedCards.findIndex(sc => sc.card === card);
        if (index === -1) {
            console.warn(`🔍 [StockStackManager] 尝试移除不存在的卡牌: ${card.suit}${card.value}`);
            return false;
        }

        // 只移除stock特定的交互事件，保留基础交互能力
        card.removeAllListeners('pointerdown');
        card.removeAllListeners('pointerover');
        card.removeAllListeners('pointerout');
        // 注释掉 card.disableInteractive() 以保留卡牌的基础交互能力
        // card.disableInteractive();

        this.stackedCards.splice(index, 1);
        
        // 重新计算所有卡牌的堆叠信息
        this.recalculateStack();
        
        // 如果有回调函数，更新交互状态
        if (this.onCardClickCallback) {
            this.updateCardInteractions(this.onCardClickCallback);
        }
        
        console.log(`🔍 [StockStackManager] 从堆叠中移除卡牌: ${card.suit}${card.value}, 剩余: ${this.stackedCards.length}`);
        return true;
    }

    /**
     * 获取堆叠中的卡牌数量
     */
    public getCardCount(): number {
        return this.stackedCards.length;
    }

    /**
     * 获取顶部卡牌
     */
    public getTopCard(): CardComponent | null {
        if (this.stackedCards.length === 0) {
            return null;
        }
        return this.stackedCards[this.stackedCards.length - 1].card;
    }

    /**
     * 获取所有卡牌
     */
    public getAllCards(): CardComponent[] {
        return this.stackedCards.map(sc => sc.card);
    }

    /**
     * 清空堆叠
     */
    public clear(): void {
        this.stackedCards.forEach(stackedCard => {
            stackedCard.card.setVisible(false);
        });
        this.stackedCards = [];
        console.log('🔍 [StockStackManager] 清空堆叠');
    }

    /**
     * 更新所有卡牌的堆叠位置
     */
    public updateStackPositions(): void {
        this.stackedCards.forEach(stackedCard => {
            this.updateCardDisplay(stackedCard);
        });
    }

    /**
     * 判断卡牌是否应该可见
     */
    private shouldCardBeVisible(stackIndex: number): boolean {
        const totalCards = this.stackedCards.length + 1; // +1 因为正在添加新卡牌
        
        if (totalCards <= STACK_CONFIG.MAX_VISIBLE_CARDS) {
            return true;
        }
        
        // 只显示最顶部的几张卡牌
        const visibleStartIndex = totalCards - STACK_CONFIG.MAX_VISIBLE_CARDS;
        return stackIndex >= visibleStartIndex;
    }

    /**
     * 重新计算所有卡牌的可见性（在重新计算堆叠时使用）
     */
    private recalculateVisibility(): void {
        const totalCards = this.stackedCards.length;
        
        this.stackedCards.forEach((stackedCard, index) => {
            if (totalCards <= STACK_CONFIG.MAX_VISIBLE_CARDS) {
                stackedCard.isVisible = true;
            } else {
                const visibleStartIndex = totalCards - STACK_CONFIG.MAX_VISIBLE_CARDS;
                stackedCard.isVisible = index >= visibleStartIndex;
            }
        });
    }

    /**
     * 计算X轴偏移
     */
    private calculateOffsetX(stackIndex: number): number {
        const totalCards = this.stackedCards.length + 1;
        
        if (totalCards <= STACK_CONFIG.MAX_VISIBLE_CARDS) {
            return stackIndex * STACK_CONFIG.STACK_OFFSET_X;
        }
        
        // 只为可见卡牌计算偏移
        const visibleStartIndex = totalCards - STACK_CONFIG.MAX_VISIBLE_CARDS;
        const visibleIndex = Math.max(0, stackIndex - visibleStartIndex);
        return visibleIndex * STACK_CONFIG.STACK_OFFSET_X;
    }

    /**
     * 计算Y轴偏移
     */
    private calculateOffsetY(stackIndex: number): number {
        const totalCards = this.stackedCards.length + 1;
        
        if (totalCards <= STACK_CONFIG.MAX_VISIBLE_CARDS) {
            return stackIndex * STACK_CONFIG.STACK_OFFSET_Y;
        }
        
        // 只为可见卡牌计算偏移
        const visibleStartIndex = totalCards - STACK_CONFIG.MAX_VISIBLE_CARDS;
        const visibleIndex = Math.max(0, stackIndex - visibleStartIndex);
        return visibleIndex * STACK_CONFIG.STACK_OFFSET_Y;
    }

    /**
     * 计算深度值
     */
    private calculateDepth(stackIndex: number): number {
        return STACK_CONFIG.BASE_DEPTH + (stackIndex * STACK_CONFIG.DEPTH_INCREMENT);
    }

    /**
     * 更新卡牌的显示状态
     */
    private updateCardDisplay(stackedCard: StackedCard): void {
        const { card, isVisible, offsetX, offsetY, depth } = stackedCard;
        
        // 设置位置
        card.setPosition(
            this.basePosition.x + offsetX,
            this.basePosition.y + offsetY
        );
        
        // 设置深度
        card.setDepth(depth);
        
        // 设置可见性
        card.setVisible(isVisible);
        
        console.log(`🔍 [StockStackManager] 更新卡牌显示: ${card.suit}${card.value}, 位置: (${card.x}, ${card.y}), 深度: ${depth}, 可见: ${isVisible}`);
    }

    /**
     * 重新计算整个堆叠
     */
    private recalculateStack(): void {
        // 重新计算可见性
        this.recalculateVisibility();
        
        this.stackedCards.forEach((stackedCard, index) => {
            stackedCard.stackIndex = index;
            stackedCard.offsetX = this.calculateOffsetX(index);
            stackedCard.offsetY = this.calculateOffsetY(index);
            stackedCard.depth = this.calculateDepth(index);
            
            this.updateCardDisplay(stackedCard);
        });
        
        console.log(`🔍 [StockStackManager] 重新计算堆叠完成, 总卡牌数: ${this.stackedCards.length}, 可见卡牌数: ${this.stackedCards.filter(sc => sc.isVisible).length}`);
    }

    /**
     * 获取所有可见的卡牌（按深度排序，顶层优先）
     */
    public getVisibleCards(): CardComponent[] {
        return this.stackedCards
            .filter(sc => sc.isVisible)
            .sort((a, b) => b.depth - a.depth) // 按深度降序排列，深度高的在前（顶层优先）
            .map(sc => sc.card);
    }

    /**
     * 获取顶层可见卡牌
     */
    public getTopVisibleCard(): CardComponent | null {
        const visibleCards = this.getVisibleCards();
        return visibleCards.length > 0 ? visibleCards[0] : null;
    }

    /**
     * 设置所有可见卡牌的交互回调
     */
    public setupCardInteractions(onCardClick: (card: CardComponent) => void): void {
        // 保存回调函数
        this.onCardClickCallback = onCardClick;
        
        this.stackedCards.forEach(stackedCard => {
            if (stackedCard.isVisible) {
                this.setupSingleCardInteraction(stackedCard.card, onCardClick);
            }
        });
        
        console.log(`🔍 [StockStackManager] 为 ${this.stackedCards.filter(sc => sc.isVisible).length} 张可见卡牌设置交互`);
    }

    /**
     * 为单张卡牌设置交互
     */
    private setupSingleCardInteraction(card: CardComponent, onCardClick: (card: CardComponent) => void): void {
        // 移除之前的交互事件（如果有）
        card.removeAllListeners('pointerdown');
        
        // 设置为可交互
        card.setInteractive();
        
        // 添加点击事件
        card.on('pointerdown', () => {
            console.log(`🔍 [StockStackManager] 卡牌被点击: ${card.suit}${card.value}`);
            onCardClick(card);
        });
        
        // 添加悬停效果（可选）
        card.on('pointerover', () => {
            console.log(`🔍 [StockStackManager] 鼠标悬停: ${card.suit}${card.value}`);
        });
        
        card.on('pointerout', () => {
            console.log(`🔍 [StockStackManager] 鼠标离开: ${card.suit}${card.value}`);
        });
    }

    /**
     * 移除所有卡牌的交互
     */
    public removeCardInteractions(): void {
        this.stackedCards.forEach(stackedCard => {
            stackedCard.card.removeAllListeners('pointerdown');
            stackedCard.card.removeAllListeners('pointerover');
            stackedCard.card.removeAllListeners('pointerout');
            stackedCard.card.disableInteractive();
        });
        
        console.log('🔍 [StockStackManager] 移除所有卡牌交互');
    }

    /**
     * 更新卡牌交互状态（在添加/移除卡牌后调用）
     */
    public updateCardInteractions(onCardClick: (card: CardComponent) => void): void {
        // 先移除所有交互
        this.removeCardInteractions();
        
        // 重新设置可见卡牌的交互
        this.setupCardInteractions(onCardClick);
    }

    /**
     * 获取调试信息
     */
    public getDebugInfo(): any {
        return {
            totalCards: this.stackedCards.length,
            basePosition: this.basePosition,
            visibleCards: this.stackedCards.filter(sc => sc.isVisible).length,
            stackedCards: this.stackedCards.map(sc => ({
                card: `${sc.card.suit}${sc.card.value}`,
                stackIndex: sc.stackIndex,
                isVisible: sc.isVisible,
                position: { x: sc.card.x, y: sc.card.y },
                depth: sc.depth,
                interactive: sc.card.input?.enabled || false
            }))
        };
    }
}