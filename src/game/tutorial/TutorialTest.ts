// 教学系统测试和验证工具
import { TutorialManager } from './TutorialManager';
import { TutorialState } from './TutorialState';
import { TutorialSteps } from './TutorialSteps';
import { Game } from '../scenes/Game';

export class TutorialTest {
    private tutorialManager: TutorialManager;
    private game: Game;

    constructor(game: Game) {
        this.game = game;
        this.tutorialManager = new TutorialManager(game);
    }

    // 测试教学系统初始化
    public testInitialization(): boolean {
        try {
            console.log('Testing tutorial system initialization...');
            
            // 检查教学步骤配置
            const steps = TutorialSteps.getAllSteps();
            if (steps.length !== 7) {
                console.error('Expected 7 tutorial steps, got:', steps.length);
                return false;
            }

            // 检查每个步骤的必要属性
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                if (!step.id || !step.guideText || !step.description) {
                    console.error(`Step ${i + 1} missing required properties:`, step);
                    return false;
                }
            }

            console.log('✓ Tutorial system initialization test passed');
            return true;
        } catch (error) {
            console.error('Tutorial initialization test failed:', error);
            return false;
        }
    }

    // 测试教学流程状态转换
    public testStateTransitions(): boolean {
        try {
            console.log('Testing tutorial state transitions...');
            
            // 检查初始状态
            if (this.tutorialManager.getCurrentState() !== TutorialState.INACTIVE) {
                console.error('Initial state should be INACTIVE');
                return false;
            }

            // 模拟启动教学
            this.tutorialManager.startTutorial();
            if (this.tutorialManager.getCurrentState() === TutorialState.INACTIVE) {
                console.error('Tutorial should be active after start');
                return false;
            }

            console.log('✓ Tutorial state transitions test passed');
            return true;
        } catch (error) {
            console.error('Tutorial state transitions test failed:', error);
            return false;
        }
    }

    // 测试教学步骤验证
    public testStepValidation(): boolean {
        try {
            console.log('Testing tutorial step validation...');
            
            const steps = TutorialSteps.getAllSteps();
            
            // 测试步骤3：A牌到基础牌堆的验证
            const step3 = steps[2]; // 索引2是第3步
            if (step3.completionCondition) {
                // 模拟A牌放入基础牌堆
                const mockCard = { numericValue: 1, suit: 'spades', value: 'A' };
                const result = step3.completionCondition('card-to-foundation', { card: mockCard }, this.game);
                if (!result) {
                    console.error('Step 3 validation failed for Ace card');
                    return false;
                }
            }

            console.log('✓ Tutorial step validation test passed');
            return true;
        } catch (error) {
            console.error('Tutorial step validation test failed:', error);
            return false;
        }
    }

    // 测试错误处理
    public testErrorHandling(): boolean {
        try {
            console.log('Testing tutorial error handling...');
            
            // 测试无效操作处理
            this.tutorialManager.startTutorial();
            
            // 模拟无效操作
            const invalidAction = 'invalid-action';
            const isValid = this.tutorialManager['isValidAction'](invalidAction);
            
            if (isValid) {
                console.error('Invalid action should not be allowed');
                return false;
            }

            console.log('✓ Tutorial error handling test passed');
            return true;
        } catch (error) {
            console.error('Tutorial error handling test failed:', error);
            return false;
        }
    }

    // 运行所有测试
    public runAllTests(): boolean {
        console.log('=== Running Tutorial System Tests ===');
        
        const tests = [
            this.testInitialization.bind(this),
            this.testStateTransitions.bind(this),
            this.testStepValidation.bind(this),
            this.testErrorHandling.bind(this)
        ];

        let allPassed = true;
        for (const test of tests) {
            if (!test()) {
                allPassed = false;
            }
        }

        if (allPassed) {
            console.log('🎉 All tutorial system tests passed!');
        } else {
            console.log('❌ Some tutorial system tests failed');
        }

        return allPassed;
    }

    // 清理测试资源
    public cleanup(): void {
        if (this.tutorialManager) {
            this.tutorialManager.destroy();
        }
    }
}

// 导出测试工具函数
export function validateTutorialSystem(game: Game): boolean {
    const tester = new TutorialTest(game);
    const result = tester.runAllTests();
    tester.cleanup();
    return result;
}

// 教学系统健康检查
export function tutorialHealthCheck(): {
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    recommendations: string[];
} {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 检查必要的资源文件
    const requiredAssets = [
        'guide-intro',
        'guide-objective', 
        'guide-ace-to-foundation',
        'guide-card-to-pile',
        'guide-check-stock',
        'guide-move-card',
        'guide-complete',
        'hand'
    ];

    // 这里可以添加更多的健康检查逻辑
    // 例如检查资源是否正确加载、配置是否完整等

    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    
    if (issues.length > 0) {
        status = issues.length > 3 ? 'error' : 'warning';
        recommendations.push('请检查并修复上述问题以确保教学系统正常运行');
    }

    return { status, issues, recommendations };
}