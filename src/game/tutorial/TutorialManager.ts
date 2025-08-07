import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { Card as CardComponent } from '../components/Card';
import { Game } from '../scenes/Game';
import { GuideSystem } from './GuideSystem';
import { TutorialSteps, TutorialStep } from './TutorialSteps';
import { TutorialState } from './TutorialState';

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
        EventBus.on('stock-clicked', this.onStockClicked, this);
        EventBus.on('card-flipped', this.onCardFlipped, this);
        
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
                // 直接显示A牌引导，不再单独显示规则说明
                this.isWaitingForAction = true;
                this.guideSystem.showAceToFoundationGuide();
                break;
                
            case TutorialState.STEP_ACE_TO_FOUNDATION:
                // A牌入槽引导
                this.isWaitingForAction = true;
                this.setupAceToFoundationTarget();
                break;
                
            case TutorialState.STEP_CARD_TO_PILE:
                // 卡牌移动引导
                this.isWaitingForAction = true;
                this.setupCardToPileTarget();
                break;
                
            case TutorialState.STEP_STOCK_FLIP:
                // 翻牌操作引导 - 显示stock点击引导
                this.isWaitingForAction = true;
                this.guideSystem.showStockClickGuide();
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
        if (!this.isValidAction('card-move', data)) {
            this.onInvalidAction();
            return;
        }

        // 检查是否完成当前步骤目标
        if (this.checkStepCompletion('card-move', data)) {
            this.nextStep();
        }
    }

    private onCardToFoundation(data: { card: CardComponent, foundationIndex: number }): void {
        if (!this.isValidAction('card-to-foundation', data)) {
            this.onInvalidAction();
            return;
        }

        // 检查是否是红桃A拖拽到基础牌堆
        if (data.card.suit === 'h' && data.card.value === 'A' && this.currentState === TutorialState.STEP_RULES) {
            // 立即隐藏A牌引导
            this.guideSystem.hideAceToFoundationGuide();
            
            // 立即显示stock点击引导
            this.guideSystem.showStockClickGuide();
            
            // 进入下一步
            this.nextStep();
            return;
        }

        if (this.checkStepCompletion('card-to-foundation', data)) {
            this.nextStep();
        }
    }

    private onStockClicked(): void {
        if (!this.isValidAction('stock-click')) {
            this.onInvalidAction();
            return;
        }

        // 如果是在stock引导步骤，隐藏引导
        if (this.currentState === TutorialState.STEP_STOCK_FLIP) {
            this.guideSystem.hideStockClickGuide();
        }

        if (this.checkStepCompletion('stock-click')) {
            this.nextStep();
        }
    }

    private onCardFlipped(data: { card: CardComponent }): void {
        // 卡牌翻转通常是其他操作的结果，不需要验证
        this.checkStepCompletion('card-flip', data);
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
        if (this.currentState === TutorialState.STEP_FREE_PLAY) {
            return true; // 自由游戏模式允许所有操作
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
        console.log(`Completing step ${this.currentStepIndex + 1}`);
        
        // 播放步骤完成音效
        EventBus.emit('play-card-place');
        
        // 清除当前引导
        this.guideSystem.hideAllGuides();
        this.clearCurrentTarget();
        
        // 进入下一步
        this.currentStepIndex++;
        
        if (this.currentStepIndex >= this.steps.length) {
            this.completeTutorial();
        } else {
            // 短暂延迟后执行下一步
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

    public destroy(): void {
        // 清理事件监听器
        EventBus.off('card-moved', this.onCardMoved, this);
        EventBus.off('card-to-foundation', this.onCardToFoundation, this);
        EventBus.off('stock-clicked', this.onStockClicked, this);
        EventBus.off('card-flipped', this.onCardFlipped, this);
        EventBus.off('user-action', this.onUserAction, this);
        EventBus.off('invalid-action', this.onInvalidAction, this);
        EventBus.off('tutorial-invalid-action', this.onTutorialInvalidAction, this);
        
        // 销毁引导系统
        this.guideSystem.destroy();
    }
}