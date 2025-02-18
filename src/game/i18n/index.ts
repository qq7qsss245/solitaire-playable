import { Language, Translation } from './types';
import { translations } from './translations';

// 默认语言为英语
const DEFAULT_LANGUAGE: Language = 'en';

// 语言代码映射表
const LANGUAGE_MAP: Record<string, Language> = {
    'en': 'en',
    'de': 'de',
    'fr': 'fr',
    'es': 'es',
    'pt': 'pt',
    'ru': 'ru',
    'ja': 'ja',
    'ko': 'kr',
    'vi': 'vn',
    'id': 'id',
    'nl': 'nl',
    // 添加区域代码映射
    'en-US': 'en',
    'en-GB': 'en',
    'de-DE': 'de',
    'fr-FR': 'fr',
    'es-ES': 'es',
    'pt-PT': 'pt',
    'pt-BR': 'pt',
    'ru-RU': 'ru',
    'ja-JP': 'ja',
    'ko-KR': 'kr',
    'vi-VN': 'vn',
    'id-ID': 'id',
    'nl-NL': 'nl'
};

/**
 * 检测当前环境的语言
 */
function detectLanguage(): Language {
    // 获取浏览器语言
    const browserLang = navigator.language.toLowerCase();
    
    // 尝试完整匹配（例如 'zh-CN'）
    if (LANGUAGE_MAP[browserLang]) {
        return LANGUAGE_MAP[browserLang];
    }
    
    // 尝试基础语言匹配（例如 'zh'）
    const baseLang = browserLang.split('-')[0];
    if (LANGUAGE_MAP[baseLang]) {
        return LANGUAGE_MAP[baseLang];
    }
    
    // 默认返回英语
    return DEFAULT_LANGUAGE;
}

// 当前语言
let currentLanguage: Language = detectLanguage();

/**
 * 设置当前语言
 * @param lang 语言代码
 */
export function setLanguage(lang: Language): void {
    currentLanguage = lang;
}

/**
 * 获取当前语言的翻译
 */
export function getTranslation(): Translation {
    return translations[currentLanguage] || translations[DEFAULT_LANGUAGE];
}

/**
 * 获取指定语言的翻译
 * @param lang 语言代码
 */
export function getTranslationByLang(lang: Language): Translation {
    return translations[lang] || translations[DEFAULT_LANGUAGE];
}