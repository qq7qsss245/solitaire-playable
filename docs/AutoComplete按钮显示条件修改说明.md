# AutoComplete按钮显示条件修改说明

## 概述

本次修改实现了AutoComplete按钮的智能显示条件，并创建了测试牌局来验证动画效果。

## 主要修改内容

### 1. 修改AutoComplete按钮显示条件

#### 新增检测函数
- **`areAllTableauCardsFaceUp()`**: 检查tableau区域所有卡牌是否都翻开
- **`canShowAutoCompleteButton()`**: 综合检查显示条件（所有卡牌翻开 + 有可收牌）

#### 显示逻辑
- **初始状态**: 按钮隐藏
- **显示条件**: 
  1. 所有tableau区域的卡牌都翻开（faceUp = true）
  2. 存在可收集的卡牌
- **实时更新**: 在卡牌翻转、移动、收牌等事件后自动检查并更新按钮显示状态

### 2. 创建测试牌局生成器

#### 测试配置系统 (`src/config/test-config.ts`)
```typescript
interface TestConfig {
    ENABLE_TEST_DECK: boolean;      // 启用测试牌局
    ALL_CARDS_FACE_UP: boolean;     // 所有卡牌翻开
    DEBUG_BUTTON_VISIBILITY: boolean; // 调试按钮显示逻辑
    FORCE_SHOW_BUTTON: boolean;     // 强制显示按钮
    TEST_DECK_TYPE: 'all_face_up' | 'near_win' | 'custom'; // 测试牌局类型
}
```

#### 测试牌局生成器 (`src/game/utils/TestDeckGenerator.ts`)
- **`generateAllFaceUpDeck()`**: 生成所有卡牌翻开的测试牌局
- **`generateNearWinDeck()`**: 生成接近胜利的测试牌局
- **`generateCustomDeck()`**: 生成自定义测试牌局
- **`forceFlipAllTableauCards()`**: 强制翻开所有tableau卡牌
- **`presetFoundationCards()`**: 预设Foundation中的卡牌

### 3. 集成检测逻辑到游戏事件

#### 修改的方法
- **`onCardFlipped()`**: 卡牌翻转后更新按钮显示状态
- **`addToFoundation()`**: 收牌后更新按钮显示状态
- **`moveCardToColumn()`**: 移动卡牌后更新按钮显示状态
- **`updateAutoCompleteButtonVisibility()`**: 统一的按钮显示状态更新方法

#### 事件触发时机
- 卡牌翻转时
- 卡牌移动到foundation时
- 卡牌在tableau间移动时
- 游戏初始化完成后

### 4. 测试模式集成

#### 游戏初始化集成
- 在`initializeGame()`中检查测试模式
- 发牌完成后应用测试配置
- 支持多种测试牌局类型

#### 测试配置应用
- 强制翻开所有tableau卡牌
- 预设Foundation卡牌（接近胜利状态）
- 强制显示按钮（用于测试）
- 实时更新按钮显示状态

## 使用方法

### 启用测试模式

1. 修改 `src/config/test-config.ts` 中的配置：
```typescript
const IS_DEVELOPMENT = true; // 设置为true启用测试模式
```

2. 选择测试牌局类型：
```typescript
export const DEV_TEST_CONFIG: TestConfig = {
    ENABLE_TEST_DECK: true,
    ALL_CARDS_FACE_UP: true,        // 所有卡牌翻开
    DEBUG_BUTTON_VISIBILITY: true,
    FORCE_SHOW_BUTTON: false,       // 测试真实显示逻辑
    TEST_DECK_TYPE: 'all_face_up'   // 测试牌局类型
};
```

### 测试场景

#### 场景1: 所有卡牌翻开测试
- 设置: `TEST_DECK_TYPE: 'all_face_up'`, `ALL_CARDS_FACE_UP: true`
- 预期: 游戏开始后，AutoComplete按钮立即显示
- 验证: 可以测试按钮点击和动画效果

#### 场景2: 接近胜利测试
- 设置: `TEST_DECK_TYPE: 'near_win'`
- 预期: Foundation中预设部分卡牌，剩余卡牌便于收集
- 验证: 测试接近胜利时的按钮显示和动画

#### 场景3: 正常游戏流程测试
- 设置: `ENABLE_TEST_DECK: false`
- 预期: 按钮初始隐藏，随着游戏进行逐步显示
- 验证: 测试真实游戏场景下的按钮显示逻辑

## 技术实现细节

### 按钮显示检测算法
```typescript
public canShowAutoCompleteButton(): boolean {
    const allFaceUp = this.areAllTableauCardsFaceUp();
    const hasCollectable = this.hasCollectableCards();
    return allFaceUp && hasCollectable;
}
```

### 卡牌状态检测
```typescript
public areAllTableauCardsFaceUp(): boolean {
    for (let i = 0; i < this.scene.tableau.length; i++) {
        const column = this.scene.tableau[i];
        for (let j = 0; j < column.cards.length; j++) {
            const card = column.cards[j];
            if (!card.faceUp) {
                return false;
            }
        }
    }
    return true;
}
```

### 事件集成
- 在关键游戏事件后调用 `updateAutoCompleteButtonVisibility()`
- 确保按钮显示状态与游戏状态同步
- 提供调试日志便于问题排查

## 预期效果

1. **游戏开始时**: 如果有背面朝上的卡牌，AutoComplete按钮隐藏
2. **游戏进行中**: 当所有tableau卡牌都翻开后，AutoComplete按钮出现
3. **测试模式**: 按钮立即显示，可以测试动画效果
4. **动画验证**: 点击按钮后，可以看到流畅的自动收牌动画

## 调试功能

### 控制台日志
- 按钮显示状态变化日志
- 卡牌状态检测日志
- 测试配置应用日志

### 测试方法
- `testAutoComplete()`: 测试AutoComplete功能
- `applyTestConfiguration()`: 应用测试配置
- 各种测试牌局生成方法

## 注意事项

1. **性能考虑**: 卡牌状态检测在每次相关事件后执行，已优化性能
2. **兼容性**: 保持与现有游戏逻辑的兼容性
3. **测试模式**: 生产环境应关闭测试模式
4. **调试信息**: 可通过配置控制调试日志的显示

## 文件清单

### 新增文件
- `src/config/test-config.ts` - 测试配置
- `src/game/utils/TestDeckGenerator.ts` - 测试牌局生成器
- `docs/AutoComplete按钮显示条件修改说明.md` - 本文档

### 修改文件
- `src/game/components/AutoCompleteManager.ts` - 添加卡牌状态检测函数
- `src/game/scenes/Game.ts` - 集成按钮显示逻辑和测试功能

---

**实现完成日期**: 2025-08-15  
**版本**: v1.0  
**状态**: ✅ 已完成实现，待测试验证