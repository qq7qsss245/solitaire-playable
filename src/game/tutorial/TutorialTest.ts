// 教学牌局测试工具
import { generateTutorialLayout, TUTORIAL_KEY_CARDS, TutorialValidator } from '../../config/tutorial-deck';
import { CardSuit, CardValue } from '../../config/klondike-layout';

export class TutorialTest {
    // 测试教学牌局是否正确生成
    static testTutorialLayout(): boolean {
        console.log('🧪 开始测试教学牌局...');
        
        const layout = generateTutorialLayout();
        
        // 验证基本结构
        if (layout.tableau.length !== 7) {
            console.error('❌ 游戏列数量错误，应该是7列');
            return false;
        }
        
        if (layout.foundation.length !== 4) {
            console.error('❌ 基础牌堆数量错误，应该是4个');
            return false;
        }
        
        // 验证每列的卡牌数量
        const expectedColumnCounts = [1, 2, 3, 4, 5, 6, 7];
        for (let i = 0; i < 7; i++) {
            if (layout.tableau[i].length !== expectedColumnCounts[i]) {
                console.error(`❌ 第${i + 1}列卡牌数量错误，期望${expectedColumnCounts[i]}张，实际${layout.tableau[i].length}张`);
                return false;
            }
        }
        
        // 验证顶部卡牌是否正面朝上
        for (let i = 0; i < 7; i++) {
            const topCard = layout.tableau[i][layout.tableau[i].length - 1];
            if (!topCard.faceUp) {
                console.error(`❌ 第${i + 1}列顶部卡牌应该正面朝上`);
                return false;
            }
        }
        
        // 验证关键卡牌位置
        if (!this.validateKeyCards(layout)) {
            return false;
        }
        
        // 验证库存牌堆
        if (layout.stock.length !== 24) {
            console.error(`❌ 库存牌堆卡牌数量错误，期望24张，实际${layout.stock.length}张`);
            return false;
        }
        
        // 验证黑桃A在库存牌堆顶部
        const topStockCard = layout.stock[0];
        if (topStockCard.suit !== 's' || topStockCard.value !== 'A') {
            console.error('❌ 库存牌堆顶部应该是黑桃A');
            return false;
        }
        
        console.log('✅ 教学牌局测试通过！');
        return true;
    }
    
    // 验证关键卡牌位置
    private static validateKeyCards(layout: any): boolean {
        // 验证第1列：黑桃K
        const col1Top = layout.tableau[0][0];
        if (col1Top.suit !== 's' || col1Top.value !== 'K') {
            console.error('❌ 第1列顶部应该是黑桃K');
            return false;
        }
        
        // 验证第2列：红桃Q
        const col2Top = layout.tableau[1][1];
        if (col2Top.suit !== 'h' || col2Top.value !== 'Q') {
            console.error('❌ 第2列顶部应该是红桃Q');
            return false;
        }
        
        // 验证第3列：黑桃J
        const col3Top = layout.tableau[2][2];
        if (col3Top.suit !== 's' || col3Top.value !== 'J') {
            console.error('❌ 第3列顶部应该是黑桃J');
            return false;
        }
        
        // 验证第4列：红桃10
        const col4Top = layout.tableau[3][3];
        if (col4Top.suit !== 'h' || col4Top.value !== '10') {
            console.error('❌ 第4列顶部应该是红桃10');
            return false;
        }
        
        // 验证第5列：黑桃9
        const col5Top = layout.tableau[4][4];
        if (col5Top.suit !== 's' || col5Top.value !== '9') {
            console.error('❌ 第5列顶部应该是黑桃9');
            return false;
        }
        
        // 验证第6列：红桃8
        const col6Top = layout.tableau[5][5];
        if (col6Top.suit !== 'h' || col6Top.value !== '8') {
            console.error('❌ 第6列顶部应该是红桃8');
            return false;
        }
        
        // 验证第7列：黑桃7
        const col7Top = layout.tableau[6][6];
        if (col7Top.suit !== 's' || col7Top.value !== '7') {
            console.error('❌ 第7列顶部应该是黑桃7');
            return false;
        }
        
        console.log('✅ 关键卡牌位置验证通过');
        return true;
    }
    
    // 测试教学步骤验证函数
    static testValidationFunctions(): boolean {
        console.log('🧪 开始测试验证函数...');
        
        // 测试步骤3验证：黑桃A
        const spadeAce = { suit: 's', value: 'A' };
        if (!TutorialValidator.validateStep3(spadeAce, 0)) {
            console.error('❌ 步骤3验证失败：黑桃A应该通过验证');
            return false;
        }
        
        const wrongCard = { suit: 'h', value: 'K' };
        if (TutorialValidator.validateStep3(wrongCard, 0)) {
            console.error('❌ 步骤3验证失败：红桃K不应该通过验证');
            return false;
        }
        
        // 测试步骤4验证：红桃8移动到黑桃9
        const heart8 = { suit: 'h', value: '8' };
        const spade9 = { suit: 's', value: '9' };
        if (!TutorialValidator.validateStep4(heart8, spade9)) {
            console.error('❌ 步骤4验证失败：红桃8移动到黑桃9应该通过验证');
            return false;
        }
        
        // 测试步骤6验证：黑桃7移动到红桃8
        const spade7 = { suit: 's', value: '7' };
        const heart8_target = { suit: 'h', value: '8' };
        if (!TutorialValidator.validateStep6(spade7, heart8_target)) {
            console.error('❌ 步骤6验证失败：黑桃7移动到红桃8应该通过验证');
            return false;
        }
        
        // 测试移动规则验证
        if (!TutorialValidator.canMoveCard(heart8, spade9)) {
            console.error('❌ 移动规则验证失败：红桃8应该可以移动到黑桃9');
            return false;
        }
        
        const invalidMove = { suit: 'h', value: '8' };
        const invalidTarget = { suit: 'h', value: '9' };
        if (TutorialValidator.canMoveCard(invalidMove, invalidTarget)) {
            console.error('❌ 移动规则验证失败：同色卡牌不应该可以移动');
            return false;
        }
        
        console.log('✅ 验证函数测试通过！');
        return true;
    }
    
    // 运行所有测试
    static runAllTests(): boolean {
        console.log('🚀 开始运行教学牌局测试套件...');
        
        const layoutTest = this.testTutorialLayout();
        const validationTest = this.testValidationFunctions();
        
        const allPassed = layoutTest && validationTest;
        
        if (allPassed) {
            console.log('🎉 所有测试通过！教学牌局配置正确。');
        } else {
            console.log('❌ 部分测试失败，请检查配置。');
        }
        
        return allPassed;
    }
    
    // 打印牌局信息（用于调试）
    static printLayoutInfo(): void {
        const layout = generateTutorialLayout();
        
        console.log('📋 教学牌局信息：');
        console.log('游戏列配置：');
        for (let i = 0; i < layout.tableau.length; i++) {
            const column = layout.tableau[i];
            const cards = column.map(card => `${this.getSuitSymbol(card.suit)}${card.value}${card.faceUp ? '↑' : '↓'}`);
            console.log(`  第${i + 1}列 (${column.length}张): ${cards.join(' ')}`);
        }
        
        console.log('\n库存牌堆 (24张):');
        const stockCards = layout.stock.slice(0, 10).map(card => `${this.getSuitSymbol(card.suit)}${card.value}`);
        console.log(`  前10张: ${stockCards.join(' ')} ...`);
        
        console.log('\n关键卡牌位置:');
        console.log(`  黑桃A: 库存牌堆顶部`);
        console.log(`  红桃8: 第6列顶部`);
        console.log(`  黑桃9: 第5列顶部`);
        console.log(`  黑桃7: 第7列顶部`);
    }
    
    // 获取花色符号
    private static getSuitSymbol(suit: CardSuit): string {
        switch (suit) {
            case 'h': return '♥';
            case 'd': return '♦';
            case 's': return '♠';
            case 'c': return '♣';
            default: return suit;
        }
    }
}

// 在开发环境下自动运行测试
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    // 延迟执行，确保模块加载完成
    setTimeout(() => {
        TutorialTest.runAllTests();
        TutorialTest.printLayoutInfo();
    }, 1000);
}