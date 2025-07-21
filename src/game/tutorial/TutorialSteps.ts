import { Game } from '../scenes/Game';
import { Card as CardComponent } from '../components/Card';
import { TutorialState } from './TutorialState';

export interface TutorialStep {
    id: TutorialState;
    guideText: string; // 对应的引导文案图片key
    description: string; // 步骤描述
    autoAdvanceTime?: number; // 自动推进时间（毫秒），0表示需要用户操作
    allowedActions?: string[]; // 允许的操作类型
    completionCondition?: (actionType: string, data: any, scene: Game) => boolean; // 完成条件检查函数
    onStepStart?: (scene: Game) => void; // 步骤开始时的回调
    onStepComplete?: (scene: Game) => void; // 步骤完成时的回调
}

export class TutorialSteps {
    private static steps: TutorialStep[] = [
        // 第一步：游戏介绍
        {
            id: TutorialState.STEP_INTRO,
            guideText: 'intro', // 使用assets中的键名
            description: '游戏介绍',
            autoAdvanceTime: 3000, // 3秒自动进入下一步
            allowedActions: [],
            onStepStart: (scene: Game) => {
                console.log('Tutorial Step 1: Game Introduction');
            }
        },

        // 第二步：规则说明
        {
            id: TutorialState.STEP_RULES,
            guideText: 'objective', // 使用assets中的键名
            description: '规则说明',
            autoAdvanceTime: 5000, // 5秒自动进入下一步，或用户点击继续
            allowedActions: ['screen-tap'],
            onStepStart: (scene: Game) => {
                console.log('Tutorial Step 2: Rules Explanation');
            }
        },

        // 第三步：A牌入槽引导
        {
            id: TutorialState.STEP_ACE_TO_FOUNDATION,
            guideText: 'aceToFoundation', // 使用assets中的键名
            description: 'A牌放置到基础牌堆',
            autoAdvanceTime: 0, // 需要用户操作
            allowedActions: ['stock-click', 'card-to-foundation'],
            completionCondition: (actionType: string, data: any, scene: Game) => {
                // 检查是否有A牌被放入基础牌堆
                if (actionType === 'card-to-foundation') {
                    const { card } = data;
                    return card && card.numericValue === 1; // A牌的数值是1
                }
                return false;
            },
            onStepStart: (scene: Game) => {
                console.log('Tutorial Step 3: Ace to Foundation');
            }
        },

        // 第四步：卡牌移动引导
        {
            id: TutorialState.STEP_CARD_TO_PILE,
            guideText: 'cardToPile', // 使用assets中的键名
            description: '卡牌移动到牌堆',
            autoAdvanceTime: 0,
            allowedActions: ['card-move'],
            completionCondition: (actionType: string, data: any, scene: Game) => {
                // 检查是否完成了卡牌移动操作
                if (actionType === 'card-move') {
                    // 简化版本：任何卡牌移动都算完成
                    return true;
                }
                return false;
            },
            onStepStart: (scene: Game) => {
                console.log('Tutorial Step 4: Card to Pile');
            }
        },

        // 第五步：库存牌堆引导
        {
            id: TutorialState.STEP_STOCK_FLIP,
            guideText: 'checkStock', // 使用assets中的键名
            description: '翻开库存牌堆',
            autoAdvanceTime: 0,
            allowedActions: ['stock-click'],
            completionCondition: (actionType: string, data: any, scene: Game) => {
                return actionType === 'stock-click';
            },
            onStepStart: (scene: Game) => {
                console.log('Tutorial Step 5: Stock Flip');
            }
        },

        // 第六步：牌堆间移动引导
        {
            id: TutorialState.STEP_PILE_TO_PILE,
            guideText: 'moveCard', // 使用assets中的键名
            description: '牌堆间移动',
            autoAdvanceTime: 0,
            allowedActions: ['card-move'],
            completionCondition: (actionType: string, data: any, scene: Game) => {
                // 检查是否完成了牌堆间移动操作
                if (actionType === 'card-move') {
                    // 简化版本：任何卡牌移动都算完成
                    return true;
                }
                return false;
            },
            onStepStart: (scene: Game) => {
                console.log('Tutorial Step 6: Pile to Pile');
            }
        },

        // 第七步：自由游戏
        {
            id: TutorialState.STEP_FREE_PLAY,
            guideText: 'complete', // 使用assets中的键名
            description: '自由游戏模式',
            autoAdvanceTime: 3000, // 3秒后隐藏文案，进入完全自由模式
            allowedActions: [], // 空数组表示允许所有操作
            onStepStart: (scene: Game) => {
                console.log('Tutorial Step 7: Free Play');
            },
            onStepComplete: (scene: Game) => {
                console.log('Tutorial completed! Free play mode enabled.');
            }
        }
    ];

    public static getAllSteps(): TutorialStep[] {
        return [...this.steps]; // 返回副本以防止外部修改
    }

    public static getStep(index: number): TutorialStep | null {
        if (index >= 0 && index < this.steps.length) {
            return this.steps[index];
        }
        return null;
    }

    public static getStepById(id: TutorialState): TutorialStep | null {
        return this.steps.find(step => step.id === id) || null;
    }

    public static getTotalSteps(): number {
        return this.steps.length;
    }

    // 辅助方法：检查特定卡牌移动
    public static checkSpecificCardMove(
        card: CardComponent, 
        fromSuit: string, 
        fromValue: string, 
        toSuit: string, 
        toValue: string
    ): boolean {
        // 检查是否是指定的卡牌移动
        return card.suit === fromSuit && card.value === fromValue;
    }

    // 辅助方法：检查A牌放入基础牌堆
    public static checkAceToFoundation(card: CardComponent, foundationIndex: number): boolean {
        return card.numericValue === 1; // A牌
    }

    // 辅助方法：检查红黑交替规则
    public static checkAlternatingColors(sourceCard: CardComponent, targetCard: CardComponent): boolean {
        return sourceCard.isRed !== targetCard.isRed && 
               targetCard.numericValue === sourceCard.numericValue + 1;
    }

    // 辅助方法：检查基础牌堆规则
    public static checkFoundationRule(card: CardComponent, foundationCards: CardComponent[]): boolean {
        if (foundationCards.length === 0) {
            return card.numericValue === 1; // 空基础牌堆只能放A
        }
        
        const topCard = foundationCards[foundationCards.length - 1];
        return topCard.suit === card.suit && topCard.numericValue === card.numericValue - 1;
    }

    // 更新步骤配置（用于动态调整教学流程）
    public static updateStepConfig(stepIndex: number, updates: Partial<TutorialStep>): boolean {
        if (stepIndex >= 0 && stepIndex < this.steps.length) {
            this.steps[stepIndex] = { ...this.steps[stepIndex], ...updates };
            return true;
        }
        return false;
    }

    // 重置所有步骤到默认配置
    public static resetToDefaults(): void {
        // 这里可以重新加载默认配置
        // 目前步骤是硬编码的，所以不需要特别的重置逻辑
        console.log('Tutorial steps reset to defaults');
    }
}

// 导出教学步骤相关的常量
export const TUTORIAL_CONSTANTS = {
    // 自动推进时间
    AUTO_ADVANCE_INTRO: 3000,
    AUTO_ADVANCE_RULES: 5000,
    AUTO_ADVANCE_FREE_PLAY: 3000,
    
    // 超时提示时间
    TIMEOUT_HINT_DELAY: 5000,
    
    // 动画持续时间
    GUIDE_FADE_DURATION: 500,
    HAND_ANIMATION_DURATION: 750,
    ERROR_FEEDBACK_DURATION: 200,
    
    // 引导文案图片键名映射
    GUIDE_TEXT_KEYS: {
        STEP_INTRO: 'guide-text-1',
        STEP_RULES: 'guide-text-2', 
        STEP_ACE_TO_FOUNDATION: 'guide-text-3',
        STEP_CARD_TO_PILE: 'guide-text-4',
        STEP_STOCK_FLIP: 'guide-text-5',
        STEP_PILE_TO_PILE: 'guide-text-6',
        STEP_FREE_PLAY: 'guide-text-7'
    }
};