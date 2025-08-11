import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { Card as CardComponent } from '../components/Card';
import { Game } from '../scenes/Game';
import { GuideSystem } from './GuideSystem';
import { TutorialSteps, TutorialStep } from './TutorialSteps';
import { TutorialState } from './TutorialState';
import { DEBUG_SPACING } from '../../config/klondike-layout';

export interface TutorialTarget {
    card?: CardComponent;
    position?: { x: number; y: number };
    zone?: string; // 'stock', 'waste', 'foundation', 'tableau'
    columnIndex?: number;
    foundationIndex?: number;
}

export class TutorialManager {
    private scene: Game;
    private guideSystem: GuideSystem;
    private currentState: TutorialState = TutorialState.INACTIVE;
    private currentStepIndex: number = 0;
    private steps: TutorialStep[];
    private isWaitingForAction: boolean = false;
    private stepTimer: number = 0;
    private autoAdvanceTimer: number = 0;
    
    // 教学目标追踪
    private currentTarget: TutorialTarget | null = null;
    private allowedActions: string[] = [];
    
    // 结束文案相关
    private finalMessageTimer: Phaser.Time.TimerEvent | null = null;
    
    constructor(scene: Game) {
        this.scene = scene;
        this.guideSystem = new GuideSystem(scene);
        this.steps = TutorialSteps.getAllSteps();
        
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // 监听卡牌移动事件
        EventBus.on('card-moved', this.onCardMoved, this);
        EventBus.on('card-to-foundation', this.onCardToFoundation, this);
        EventBus.on('waste-to-tableau', this.onWasteToTableau, this);
        EventBus.on('stock-clicked', this.onStockClicked, this);
        EventBus.on('card-flipped', this.onCardFlipped, this);
        
        // 监听拖拽开始事件
        EventBus.on('card-drag-start', this.onCardDragStart, this);
        
        // 监听用户交互
        EventBus.on('user-action', this.onUserAction, this);
        EventBus.on('invalid-action', this.onInvalidAction, this);
        EventBus.on('tutorial-invalid-action', this.onTutorialInvalidAction, this);
    }

    public startTutorial(): void {
        console.log('Starting tutorial...');
        this.currentState = TutorialState.ACTIVE;
        this.currentStepIndex = 0;
        this.isWaitingForAction = false;
        this.stepTimer = 0;
        this.autoAdvanceTimer = 0;
        
        // 开始第一步
        this.executeCurrentStep();
    }

    public stopTutorial(): void {
        console.log('Stopping tutorial...');
        this.currentState = TutorialState.INACTIVE;
        this.guideSystem.hideAllGuides();
        this.clearCurrentTarget();
    }

    public update(time: number, delta: number): void {
        if (this.currentState === TutorialState.INACTIVE) {
            return;
        }

        this.stepTimer += delta;
        this.autoAdvanceTimer += delta;
        
        // 更新引导系统
        this.guideSystem.update(time, delta);
        
        // 处理自动推进逻辑
        this.handleAutoAdvance();
        
        // 处理超时提示
        this.handleTimeoutHints();
    }

    private executeCurrentStep(): void {
        if (this.currentStepIndex >= this.steps.length) {
            this.completeTutorial();
            return;
        }

        const step = this.steps[this.currentStepIndex];
        console.log(`Executing step ${this.currentStepIndex + 1}: ${step.id}`);
        
        this.currentState = step.id as TutorialState;
        this.stepTimer = 0;
        this.autoAdvanceTimer = 0;
        
        // 显示引导文案
        this.guideSystem.showGuideText(step.guideText);
        
        // 设置允许的操作
        this.allowedActions = step.allowedActions || [];
        
        // 执行步骤特定逻辑
        this.executeStepLogic(step);
    }

    private executeStepLogic(step: TutorialStep): void {
        // 每个步骤开始前，先清理所有之前的引导效果
        this.guideSystem.hideAllGuides();
        
        switch (step.id) {
            case TutorialState.STEP_INTRO:
                // 游戏介绍，显示开局两个文案，等待用户点击
                this.isWaitingForAction = true;
                // 隐藏默认的单个文案，显示开局双文案
                this.guideSystem.hideGuideText();
                this.guideSystem.showInitialGuideTexts(() => {
                    // 用户点击后进入下一步
                    this.nextStep();
                });
                break;
                
            case TutorialState.STEP_RULES:
                // 第二步：显示"Let's put Ace to foundation"文案和幽灵卡牌引导
                this.isWaitingForAction = true;
                this.guideSystem.showAceToFoundationGuide();
                break;
                
            case TutorialState.STEP_ACE_TO_FOUNDATION:
                // A牌入槽引导（这个步骤实际上已经在STEP_RULES中处理了）
                this.isWaitingForAction = true;
                this.setupAceToFoundationTarget();
                break;
                
            case TutorialState.STEP_CARD_TO_PILE:
                // 卡牌移动引导
                this.isWaitingForAction = true;
                this.setupCardToPileTarget();
                break;
                
            case TutorialState.STEP_STOCK_FLIP:
                // 第三步：显示"Hmmm, now try to look in the stock"文案和stock点击引导
                this.isWaitingForAction = true;
                this.guideSystem.showStockClickGuide();
                break;
                
            case TutorialState.STEP_STOCK_TO_PILE:
                // 第六步：库存牌到牌堆引导 - 将红桃Q拖拽到黑桃K上
                this.isWaitingForAction = true;
                this.guideSystem.showWasteToTableauGuide();
                this.setupStockToPileTarget();
                break;
                
            case TutorialState.STEP_PILE_TO_PILE:
                // 列间移动引导
                this.isWaitingForAction = true;
                this.setupPileToPileTarget();
                break;
                
            case TutorialState.STEP_FREE_PLAY:
                // 自由游戏
                this.isWaitingForAction = false;
                this.guideSystem.hideAllGuides();
                this.enableFreePlay();
                break;
        }
    }

    private setupAceToFoundationTarget(): void {
        // 引导用户翻出黑桃A
        this.currentTarget = {
            zone: 'stock',
            position: { x: this.scene.currentLayout.stock.x, y: this.scene.currentLayout.stock.y }
        };
        if (this.currentTarget.position) {
            this.guideSystem.showHandGuide(this.currentTarget.position.x, this.currentTarget.position.y);
        }
    }

    private setupCardToPileTarget(): void {
        // 寻找可移动的卡牌进行引导
        const targetCard = this.findCardInTableau('hearts', '8');
        const destinationCard = this.findCardInTableau('spades', '9');
        
        if (targetCard && destinationCard) {
            this.currentTarget = {
                card: targetCard,
                position: { x: destinationCard.x, y: destinationCard.y + 30 }
            };
            this.guideSystem.showCardToCardGuide(targetCard, destinationCard);
        }
    }

    private setupStockFlipTarget(): void {
        this.currentTarget = {
            zone: 'stock',
            position: { x: this.scene.currentLayout.stock.x, y: this.scene.currentLayout.stock.y }
        };
        if (this.currentTarget.position) {
            this.guideSystem.showHandGuide(this.currentTarget.position.x, this.currentTarget.position.y);
        }
    }

    private setupPileToPileTarget(): void {
        // 寻找黑桃7，引导移动到红桃8上
        const targetCard = this.findCardInTableau('spades', '7');
        const destinationCard = this.findCardInTableau('hearts', '8');
        
        if (targetCard && destinationCard) {
            this.currentTarget = {
                card: targetCard,
                position: { x: destinationCard.x, y: destinationCard.y + 30 }
            };
            this.guideSystem.showCardToCardGuide(targetCard, destinationCard);
        }
    }

    private setupStockToPileTarget(): void {
        // 引导用户将红桃Q从废牌堆拖拽到黑桃K上（第0列）
        const targetCard = this.findCardInWaste('h', 'Q'); // 红桃Q
        const destinationCard = this.findCardInTableau('s', 'K'); // 黑桃K
        
        if (targetCard && destinationCard) {
            this.currentTarget = {
                card: targetCard,
                position: { x: destinationCard.x, y: destinationCard.y + 30 }
            };
            this.guideSystem.showCardToCardGuide(targetCard, destinationCard);
        }
    }

    private findCardInWaste(suit: string, value: string): CardComponent | null {
        // 通过Game场景的公共方法获取废牌堆信息
        const wasteCards = this.scene.getColumnBottomCards(); // 暂时使用现有方法，实际应该是获取废牌堆
        for (const card of wasteCards) {
            if (card.suit === suit && card.value === value && card.faceUp) {
                return card;
            }
        }
        return null;
    }

    private findCardInTableau(suit: string, value: string): CardComponent | null {
        // 通过Game场景的公共方法获取tableau信息
        const bottomCards = this.scene.getColumnBottomCards();
        for (const card of bottomCards) {
            if (card.suit === suit && card.value === value && card.faceUp) {
                return card;
            }
        }
        return null;
    }

    private handleAutoAdvance(): void {
        const step = this.steps[this.currentStepIndex];
        if (!step || this.isWaitingForAction) {
            return;
        }

        const autoAdvanceTime = step.autoAdvanceTime || 0;
        if (autoAdvanceTime > 0 && this.autoAdvanceTimer >= autoAdvanceTime) {
            this.nextStep();
        }
    }

    private handleTimeoutHints(): void {
        if (!this.isWaitingForAction || this.stepTimer < 5000) {
            return;
        }

        // 5秒无操作显示提示
        if (this.currentTarget) {
            this.guideSystem.showTimeoutHint(this.currentTarget);
        }
    }

    private onCardMoved(data: { card: CardComponent, fromColumn: number, toColumn: number }): void {
        console.log('🔍 [DEBUG] Tutorial: Card move detected', {
            card: `${data.card.suit}${data.card.value}`,
            fromColumn: data.fromColumn,
            toColumn: data.toColumn,
            currentState: this.currentState
        });
        
        if (!this.isValidAction('card-move', data)) {
            console.log('🔍 [DEBUG] Invalid card-move action');
            this.onInvalidAction();
            return;
        }

        // 特殊处理STEP_STOCK_TO_PILE步骤
        if (this.currentState === TutorialState.STEP_STOCK_TO_PILE) {
            const { card, toColumn } = data;
            if (card.suit === 'h' && card.value === 'Q' && toColumn === 0) {
                console.log('🔍 [DEBUG] Tutorial: Heart Q successfully moved to Spade K column via card-move');
                this.guideSystem.hideWasteToTableauGuide();
                this.nextStep();
                return;
            }
        }

        // 检查是否完成当前步骤目标
        if (this.checkStepCompletion('card-move', data)) {
            console.log('🔍 [DEBUG] Step completion condition met via checkStepCompletion');
            this.nextStep();
        }
    }

    private onCardToFoundation(data: { card: CardComponent, foundationIndex: number }): void {
        if (!this.isValidAction('card-to-foundation', data)) {
            this.onInvalidAction();
            return;
        }

        // 检查是否是红桃A拖拽到正确的基础牌堆（索引0）
        if (data.card.suit === 'h' && data.card.value === 'A' && data.foundationIndex === 0 && this.currentState === TutorialState.STEP_RULES) {
            // 立即隐藏A牌引导
            this.guideSystem.hideAceToFoundationGuide();
            
            // 直接跳到STEP_STOCK_FLIP步骤（跳过STEP_ACE_TO_FOUNDATION和STEP_CARD_TO_PILE）
            this.jumpToStepById(TutorialState.STEP_STOCK_FLIP);
            return;
        }

        if (this.checkStepCompletion('card-to-foundation', data)) {
            this.nextStep();
        }
    }

    private onWasteToTableau(data: { card: CardComponent, fromWaste: boolean, toColumn: number }): void {
        console.log('🔍 [DEBUG] Tutorial: Waste to tableau move detected', {
            card: `${data.card.suit}${data.card.value}`,
            toColumn: data.toColumn,
            currentState: this.currentState
        });
        
        if (!this.isValidAction('waste-to-tableau', data)) {
            console.log('🔍 [DEBUG] Invalid waste-to-tableau action');
            this.onInvalidAction();
            return;
        }

        // 检查是否是红桃Q拖拽到第1列
        if (data.card.suit === 'h' && data.card.value === 'Q' &&
            data.toColumn === 0 && this.currentState === TutorialState.STEP_STOCK_TO_PILE) {
            
            console.log('🔍 [DEBUG] Tutorial: Heart Q successfully moved to Spade K column - STEP_STOCK_TO_PILE completed!');
            
            // 立即隐藏引导
            this.guideSystem.hideWasteToTableauGuide();
            
            // 完成当前步骤
            console.log('🔍 [DEBUG] Calling nextStep() for STEP_STOCK_TO_PILE completion');
            this.nextStep();
            return;
        }

        // 检查其他步骤的完成条件
        if (this.checkStepCompletion('waste-to-tableau', data)) {
            console.log('🔍 [DEBUG] Step completion condition met via checkStepCompletion');
            this.nextStep();
        }
    }

    private onStockClicked(): void {
        console.log('🔍 [DEBUG] TutorialManager.onStockClicked - 收到stock-clicked事件', {
            currentState: this.currentState,
            isActive: this.isActive()
        });
        
        if (!this.isValidAction('stock-click')) {
            console.log('🔍 [DEBUG] TutorialManager.onStockClicked - 无效操作，触发错误处理');
            this.onInvalidAction();
            return;
        }

        console.log('🔍 [DEBUG] TutorialManager.onStockClicked - 操作有效，继续处理');

        // 如果是在stock引导步骤，隐藏引导
        if (this.currentState === TutorialState.STEP_STOCK_FLIP) {
            console.log('🔍 [DEBUG] TutorialManager.onStockClicked - 隐藏stock引导');
            this.guideSystem.hideStockClickGuide();
            
            // TODO: 检查是否翻出了红桃Q，如果是则跳转到新的STEP_STOCK_TO_PILE步骤
            // 暂时简化实现，直接跳转到新步骤进行测试
            console.log('🔍 [DEBUG] TutorialManager.onStockClicked - 跳转到STEP_STOCK_TO_PILE进行测试');
            this.jumpToStepById(TutorialState.STEP_STOCK_TO_PILE);
            return;
        }

        if (this.checkStepCompletion('stock-click')) {
            console.log('🔍 [DEBUG] TutorialManager.onStockClicked - 步骤完成，进入下一步');
            this.nextStep();
        } else {
            console.log('🔍 [DEBUG] TutorialManager.onStockClicked - 步骤未完成');
        }
    }

    private onCardFlipped(data: { card: CardComponent }): void {
        // 卡牌翻转通常是其他操作的结果，不需要验证
        this.checkStepCompletion('card-flip', data);
    }

    private onCardDragStart(data: { card: CardComponent }): void {
        console.log('Tutorial: Card drag start detected', data);
        
        // 如果是在 STEP_STOCK_TO_PILE 步骤中，且拖拽的是红桃Q
        if (this.currentState === TutorialState.STEP_STOCK_TO_PILE) {
            const { card } = data;
            if (card.suit === 'h' && card.value === 'Q') {
                console.log('Tutorial: User started dragging Heart Q, hiding guide');
                // 立即隐藏引导
                this.guideSystem.hideWasteToTableauGuide();
            }
        }
    }

    private onUserAction(data: any): void {
        // 重置超时计时器
        this.stepTimer = 0;
    }

    private onInvalidAction(): void {
        console.log('Invalid action during tutorial');
        EventBus.emit('play-error');
        
        // 显示错误提示
        if (this.currentTarget) {
            this.guideSystem.showErrorFeedback(this.currentTarget);
        }
    }

    private onTutorialInvalidAction(data: { card: CardComponent | null, action: string, position?: { x: number; y: number } }): void {
        if (data.card) {
            console.log(`Tutorial invalid action: ${data.action} on card ${data.card.suit}${data.card.value}`);
        } else {
            console.log(`Tutorial invalid action: ${data.action}`);
        }
        
        // 显示错误提示
        const target: TutorialTarget = {
            card: data.card || undefined,
            position: data.position || (data.card ? { x: data.card.x, y: data.card.y } : undefined)
        };
        this.guideSystem.showErrorFeedback(target);
    }

    private isValidAction(actionType: string, data?: any): boolean {
        console.log(`Tutorial: Validating action ${actionType} in state ${this.currentState}`, data);
        
        if (this.currentState === TutorialState.STEP_FREE_PLAY) {
            return true; // 自由游戏模式允许所有操作
        }

        // 特殊处理STEP_STOCK_TO_PILE步骤
        if (this.currentState === TutorialState.STEP_STOCK_TO_PILE) {
            // 只允许特定的卡牌移动操作
            if (actionType === 'waste-to-tableau' || actionType === 'card-move') {
                if (data && data.card) {
                    const { card, toColumn } = data;
                    // 只允许红桃Q移动到第1列（黑桃K所在列）
                    return card.suit === 'h' && card.value === 'Q' && toColumn === 0;
                }
            }
            return false;
        }

        return this.allowedActions.includes(actionType);
    }

    private checkStepCompletion(actionType: string, data?: any): boolean {
        const step = this.steps[this.currentStepIndex];
        if (!step.completionCondition) {
            return false;
        }

        return step.completionCondition(actionType, data, this.scene);
    }

    private nextStep(): void {
        const currentStep = this.steps[this.currentStepIndex];
        console.log(`🔍 [DEBUG] Completing step ${this.currentStepIndex + 1}: ${currentStep?.id}`);
        
        // 🔧 修复：调用当前步骤的onStepComplete回调
        if (currentStep?.onStepComplete) {
            console.log(`🔍 [DEBUG] Calling onStepComplete for step: ${currentStep.id}`);
            currentStep.onStepComplete(this.scene);
        }
        
        // 播放步骤完成音效
        EventBus.emit('play-card-place');
        
        // 清除当前引导
        this.guideSystem.hideAllGuides();
        this.clearCurrentTarget();
        
        // 进入下一步
        this.currentStepIndex++;
        
        if (this.currentStepIndex >= this.steps.length) {
            console.log(`🔍 [DEBUG] All steps completed, calling completeTutorial()`);
            this.completeTutorial();
        } else {
            // 短暂延迟后执行下一步
            console.log(`🔍 [DEBUG] Moving to next step: ${this.currentStepIndex + 1}`);
            this.scene.time.delayedCall(1000, () => {
                this.executeCurrentStep();
            });
        }
    }

    private jumpToStepById(targetStepId: TutorialState): void {
        console.log(`Jumping to step: ${targetStepId}`);
        
        // 播放步骤完成音效
        EventBus.emit('play-card-place');
        
        // 清除当前引导
        this.guideSystem.hideAllGuides();
        this.clearCurrentTarget();
        
        // 找到目标步骤的索引
        const targetIndex = this.steps.findIndex(step => step.id === targetStepId);
        if (targetIndex === -1) {
            console.error(`Target step ${targetStepId} not found`);
            return;
        }
        
        // 跳转到目标步骤
        this.currentStepIndex = targetIndex;
        
        if (this.currentStepIndex >= this.steps.length) {
            this.completeTutorial();
        } else {
            // 短暂延迟后执行目标步骤
            this.scene.time.delayedCall(1000, () => {
                this.executeCurrentStep();
            });
        }
    }

    private completeTutorial(): void {
        console.log('Tutorial completed!');
        this.currentState = TutorialState.COMPLETED;
        this.guideSystem.hideAllGuides();
        
        // 播放教学完成音效
        EventBus.emit('play-victory');
        
        // 启用自由游戏模式
        this.enableFreePlay();
        
        // 通知教学完成
        EventBus.emit('tutorial-completed');
    }

    private enableFreePlay(): void {
        // 移除教学限制，允许所有操作
        this.allowedActions = [];
        
        // 启用智能提示系统
        this.scene.enableSmartHints?.();
    }

    private clearCurrentTarget(): void {
        this.currentTarget = null;
    }

    // 公共接口
    public getCurrentState(): TutorialState {
        return this.currentState;
    }

    public getCurrentStepIndex(): number {
        return this.currentStepIndex;
    }

    public isActive(): boolean {
        return this.currentState !== TutorialState.INACTIVE && this.currentState !== TutorialState.COMPLETED;
    }

    public isFreePlay(): boolean {
        return this.currentState === TutorialState.STEP_FREE_PLAY;
    }

    public showFinalTutorialMessage(): void {
        console.log('Tutorial: Showing final tutorial message');
        
        // 立即进入自由游戏模式，允许用户操作所有卡牌
        this.currentState = TutorialState.STEP_FREE_PLAY;
        this.isWaitingForAction = false;
        
        // 隐藏所有教学相关的引导效果
        this.guideSystem.hideWasteToTableauGuide();
        this.guideSystem.hideGuideText();
        
        // 使用独立的逻辑显示结束文案，不依赖教学系统
        this.showIndependentFinalMessage();
    }

    private showIndependentFinalMessage(): void {
        console.log('Tutorial: Showing independent final message');
        
        // 直接在游戏场景中创建结束文案图像
        const layout = this.scene.currentLayout;
        const completePos = layout.guideTexts.complete;
        
        if (!completePos) {
            console.warn('Complete guide text position not found');
            return;
        }
        
        // 创建独立的结束文案图像
        const finalMessageImage = this.scene.add.image(completePos.x, completePos.y, 'guide-complete');
        finalMessageImage.setVisible(true);
        finalMessageImage.setDepth(9999);
        finalMessageImage.setScale(DEBUG_SPACING.GUIDE_TEXT_SCALE);
        
        // 淡入效果
        finalMessageImage.setAlpha(0);
        this.scene.tweens.add({
            targets: finalMessageImage,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
        
        // 3秒后自动淡出并销毁
        this.scene.time.delayedCall(3000, () => {
            this.scene.tweens.add({
                targets: finalMessageImage,
                alpha: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    finalMessageImage.destroy();
                    console.log('Tutorial: Final message hidden and destroyed');
                }
            });
        });
        
        // 如果用户开始拖拽，立即隐藏文案
        const onDragStart = () => {
            console.log('Tutorial: User started dragging, hiding final message immediately');
            this.scene.tweens.add({
                targets: finalMessageImage,
                alpha: 0,
                duration: 200,
                ease: 'Power2',
                onComplete: () => {
                    finalMessageImage.destroy();
                    this.scene.events.off('card-drag-start', onDragStart);
                }
            });
        };
        
        this.scene.events.on('card-drag-start', onDragStart);
    }

    private setupFinalMessageAutoHide(): void {
        // 3秒后自动隐藏
        this.finalMessageTimer = this.scene.time.delayedCall(3000, () => {
            this.hideFinalTutorialMessage();
        });
        
        // 监听用户拖拽事件，立即隐藏
        this.scene.events.on('card-drag-start', this.onFinalMessageDragStart, this);
    }

    private onFinalMessageDragStart(): void {
        console.log('Tutorial: User started dragging, hiding final message');
        this.hideFinalTutorialMessage();
    }

    private hideFinalTutorialMessage(): void {
        // 清除定时器
        if (this.finalMessageTimer) {
            this.finalMessageTimer.destroy();
            this.finalMessageTimer = null;
        }
        
        // 移除拖拽监听
        this.scene.events.off('card-drag-start', this.onFinalMessageDragStart, this);
        
        // 隐藏文案
        this.guideSystem.hideFinalTutorialMessage();
        
        console.log('Tutorial: Final message hidden, tutorial completely finished');
    }

    public destroy(): void {
        // 清理结束文案相关的定时器和事件监听器
        if (this.finalMessageTimer) {
            this.finalMessageTimer.destroy();
            this.finalMessageTimer = null;
        }
        this.scene.events.off('card-drag-start', this.onFinalMessageDragStart, this);
        
        // 清理事件监听器
        EventBus.off('card-moved', this.onCardMoved, this);
        EventBus.off('card-to-foundation', this.onCardToFoundation, this);
        EventBus.off('waste-to-tableau', this.onWasteToTableau, this);
        EventBus.off('stock-clicked', this.onStockClicked, this);
        EventBus.off('card-flipped', this.onCardFlipped, this);
        EventBus.off('card-drag-start', this.onCardDragStart, this);
        EventBus.off('user-action', this.onUserAction, this);
        EventBus.off('invalid-action', this.onInvalidAction, this);
        EventBus.off('tutorial-invalid-action', this.onTutorialInvalidAction, this);

        // 销毁引导系统
        this.guideSystem.destroy();
    }
}