import { Language, Translation } from './types';
import { translations } from './translations';

// 默认语言为英语
const DEFAULT_LANGUAGE: Language = 'en';

// 语言代码映射表
const LANGUAGE_MAP: Record<string, Language> = {
    // 基础语言代码映射
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
    'th': 'th',
    'pl': 'pl',
    'ar': 'ar',
    'hu': 'hu',
    'cs': 'cs',
    'cz': 'cs', // 捷克语的替代代码
    'fi': 'fi',
    'af': 'af',
    'sq': 'sq',
    'am': 'am',
    'hy': 'hy',
    'az': 'az',
    'bn': 'bn',
    'eu': 'eu',
    'be': 'be',
    'bg': 'bg',
    'my': 'my',
    'ca': 'ca',
    'zh': 'zh_cn', // 默认中文为简体中文
    'hr': 'hr',
    'da': 'da',
    'et': 'et',
    'fil': 'fil',
    'gl': 'gl',
    'ka': 'ka',
    'el': 'el',
    'gu': 'gu',
    'he': 'he',
    'hi': 'hi',
    'is': 'is',
    'it': 'it',
    'kn': 'kn',
    'kk': 'kk',
    'km': 'km',
    'ky': 'ky',
    'lo': 'lo',
    'lv': 'lv',
    'lt': 'lt',
    'mk': 'mk',
    'ms': 'ms',
    'ml': 'ml',
    'mr': 'mr',
    'mn': 'mn',
    'ne': 'ne',
    'no': 'no',
    'fa': 'fa',
    'ro': 'ro',
    'sr': 'sr',
    'si': 'si',
    'sk': 'sk',
    'sl': 'sl',
    'sw': 'sw',
    'sv': 'sv',
    'tl': 'tl',
    'ta': 'ta',
    'te': 'te',
    'tr': 'tr',
    'uk': 'uk',
    'ur': 'ur',
    'zu': 'zu',
    
    // 区域代码映射
    'en-US': 'en',
    'en-GB': 'en',
    'de-DE': 'de',
    'fr-FR': 'fr',
    'fr-CA': 'fr',
    'es-ES': 'es',
    'es-419': 'es',
    'es-US': 'es',
    'pt-PT': 'pt',
    'pt-BR': 'pt',
    'ru-RU': 'ru',
    'ja-JP': 'ja',
    'ko-KR': 'kr',
    'vi-VN': 'vn',
    'id-ID': 'id',
    'nl-NL': 'nl',
    'th-TH': 'th',
    'pl-PL': 'pl',
    'ar-SA': 'ar',
    'ar-AE': 'ar',
    'ar-EG': 'ar',
    'hu-HU': 'hu',
    'cs-CZ': 'cs',
    'fi-FI': 'fi',
    'af-ZA': 'af',
    'sq-AL': 'sq',
    'am-ET': 'am',
    'hy-AM': 'hy',
    'az-AZ': 'az',
    'bn-BD': 'bn',
    'bn-IN': 'bn',
    'eu-ES': 'eu',
    'be-BY': 'be',
    'bg-BG': 'bg',
    'my-MM': 'my',
    'ca-ES': 'ca',
    'zh-HK': 'zh_hk',
    'zh-CN': 'zh_cn',
    'zh-TW': 'zh_tw',
    'hr-HR': 'hr',
    'da-DK': 'da',
    'et-EE': 'et',
    'fil-PH': 'fil',
    'gl-ES': 'gl',
    'ka-GE': 'ka',
    'el-GR': 'el',
    'gu-IN': 'gu',
    'he-IL': 'he',
    'hi-IN': 'hi',
    'is-IS': 'is',
    'it-IT': 'it',
    'kn-IN': 'kn',
    'kk-KZ': 'kk',
    'km-KH': 'km',
    'ky-KG': 'ky',
    'lo-LA': 'lo',
    'lv-LV': 'lv',
    'lt-LT': 'lt',
    'mk-MK': 'mk',
    'ms-MY': 'ms',
    'ml-IN': 'ml',
    'mr-IN': 'mr',
    'mn-MN': 'mn',
    'ne-NP': 'ne',
    'no-NO': 'no',
    'fa-IR': 'fa',
    'ro-RO': 'ro',
    'sr-RS': 'sr',
    'si-LK': 'si',
    'sk-SK': 'sk',
    'sl-SI': 'sl',
    'sw-KE': 'sw',
    'sv-SE': 'sv',
    'ta-IN': 'ta',
    'te-IN': 'te',
    'tr-TR': 'tr',
    'uk-UA': 'uk',
    'ur-PK': 'ur',
    'zu-ZA': 'zu'
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