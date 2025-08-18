export type Language =
  | 'en' | 'de' | 'fr' | 'es' | 'pt' | 'ru' | 'ja' | 'kr' | 'vn' | 'id' | 'nl' | 'th' | 'pl' | 'ar' | 'hu' | 'cs' | 'fi'
  | 'af' | 'sq' | 'am' | 'hy' | 'az' | 'bn' | 'eu' | 'be' | 'bg' | 'my' | 'ca'
  | 'zh_hk' | 'zh_cn' | 'zh_tw' | 'hr' | 'da' | 'et' | 'fil' | 'gl' | 'ka' | 'el' | 'gu' | 'he' | 'hi'
  | 'is' | 'it' | 'kn' | 'kk' | 'km' | 'ky' | 'lo' | 'lv' | 'lt' | 'mk' | 'ms' | 'ml' | 'mr'
  | 'mn' | 'ne' | 'no' | 'fa' | 'ro' | 'sr' | 'si' | 'sk' | 'sl' | 'sw' | 'sv' | 'tl' | 'ta'
  | 'te' | 'tr' | 'uk' | 'ur' | 'zu';

export interface Translation {
    moves: string;
    score: string;
    time: string;
    playNow: string;
}