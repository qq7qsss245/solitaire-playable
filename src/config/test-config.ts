/**
 * 测试配置文件
 * 用于控制测试牌局和调试功能
 */

export interface TestConfig {
    ENABLE_TEST_DECK: boolean;      // 启用测试牌局
    ALL_CARDS_FACE_UP: boolean;     // 所有卡牌翻开
    DEBUG_BUTTON_VISIBILITY: boolean; // 调试按钮显示逻辑
    FORCE_SHOW_BUTTON: boolean;     // 强制显示按钮（用于测试）
    TEST_DECK_TYPE: 'all_face_up' | 'near_win' | 'custom'; // 测试牌局类型
}

// 默认测试配置
export const DEFAULT_TEST_CONFIG: TestConfig = {
    ENABLE_TEST_DECK: false,        // 默认关闭测试模式
    ALL_CARDS_FACE_UP: false,       // 默认不强制翻开所有卡牌
    DEBUG_BUTTON_VISIBILITY: false, // 默认关闭调试
    FORCE_SHOW_BUTTON: false,       // 默认不强制显示按钮
    TEST_DECK_TYPE: 'all_face_up'   // 默认测试类型
};

// 开发环境测试配置
export const DEV_TEST_CONFIG: TestConfig = {
    ENABLE_TEST_DECK: true,         // 开发时启用测试模式
    ALL_CARDS_FACE_UP: true,        // 开发时所有卡牌翻开
    DEBUG_BUTTON_VISIBILITY: true,  // 开发时启用调试
    FORCE_SHOW_BUTTON: false,       // 不强制显示，测试真实逻辑
    TEST_DECK_TYPE: 'all_face_up'   // 使用全翻开测试牌局
};

// 当前使用的配置（手动切换开发/生产模式）
// 开发时设置为true，生产时设置为false
const IS_DEVELOPMENT = false; // 手动控制开发模式 - 修复自动触发问题

export const CURRENT_TEST_CONFIG: TestConfig =
    IS_DEVELOPMENT ? DEV_TEST_CONFIG : DEFAULT_TEST_CONFIG;

/**
 * 获取当前测试配置
 */
export function getTestConfig(): TestConfig {
    return CURRENT_TEST_CONFIG;
}

/**
 * 检查是否启用测试模式
 */
export function isTestModeEnabled(): boolean {
    return CURRENT_TEST_CONFIG.ENABLE_TEST_DECK;
}

/**
 * 检查是否应该强制翻开所有卡牌
 */
export function shouldForceAllCardsFaceUp(): boolean {
    return CURRENT_TEST_CONFIG.ALL_CARDS_FACE_UP;
}

/**
 * 检查是否启用调试模式
 */
export function isDebugModeEnabled(): boolean {
    return CURRENT_TEST_CONFIG.DEBUG_BUTTON_VISIBILITY;
}