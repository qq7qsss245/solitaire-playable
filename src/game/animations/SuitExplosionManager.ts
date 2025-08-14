import { Scene } from 'phaser';
import { AssetKeys, Assets } from '../../assets';
import { CardSuit } from '../../config/klondike-layout';

/**
 * 花色爆炸动画管理器
 * 负责管理4种花色的爆炸动画效果
 */
export class SuitExplosionManager {
    private scene: Scene;
    private explosionAnimations: Map<CardSuit, string> = new Map();
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.initializeAnimations();
    }

    /**
     * 初始化所有花色的爆炸动画
     */
    private initializeAnimations(): void {
        // 创建方块爆炸动画
        this.createExplosionAnimation('d', AssetKeys.EXPLOSION_DIAMOND, Assets.animations.explosions.diamond);
        
        // 创建梅花爆炸动画
        this.createExplosionAnimation('c', AssetKeys.EXPLOSION_CLUB, Assets.animations.explosions.club);
        
        // 创建红桃爆炸动画
        this.createExplosionAnimation('h', AssetKeys.EXPLOSION_HEART, Assets.animations.explosions.heart);
        
        // 创建黑桃爆炸动画
        this.createExplosionAnimation('s', AssetKeys.EXPLOSION_SPADE, Assets.animations.explosions.spade);
    }

    /**
     * 创建单个花色的爆炸动画
     */
    private createExplosionAnimation(suit: CardSuit, animationKey: string, frames: string[]): void {
        // 检查动画是否已存在
        if (this.scene.anims.exists(animationKey)) {
            this.explosionAnimations.set(suit, animationKey);
            return;
        }

        // 创建帧动画配置，使用Preloader中已加载的图片键名
        const frameConfigs = frames.map((frame, index) => ({
            key: `${animationKey}-${index}`,
            frame: 0
        }));

        // 创建动画
        this.scene.anims.create({
            key: animationKey,
            frames: frameConfigs,
            frameRate: 24, // 24fps播放
            repeat: 0, // 不重复
            hideOnComplete: true // 播放完成后隐藏
        });

        this.explosionAnimations.set(suit, animationKey);
    }

    /**
     * 播放指定花色的爆炸动画
     * @param suit 花色 ('h'=红桃, 'd'=方块, 'c'=梅花, 's'=黑桃)
     * @param x 动画播放的X坐标
     * @param y 动画播放的Y坐标
     * @param duration 动画持续时间（毫秒），默认600ms
     */
    public playExplosion(suit: CardSuit, x: number, y: number, duration: number = 600): Promise<void> {
        return new Promise((resolve) => {
            const animationKey = this.explosionAnimations.get(suit);
            
            if (!animationKey) {
                console.warn(`[SuitExplosionManager] 未找到花色 ${suit} 的爆炸动画`);
                resolve();
                return;
            }

            // 创建动画精灵，使用Preloader中的键名格式
            const explosionSprite = this.scene.add.sprite(x, y, `${animationKey}-0`);
            explosionSprite.setDepth(1000); // 确保在最上层显示
            explosionSprite.setAlpha(1);

            // 播放动画
            explosionSprite.play(animationKey);

            // 监听动画完成事件
            explosionSprite.on('animationcomplete', () => {
                explosionSprite.destroy();
                resolve();
            });

            // 设置超时保护，防止动画卡住
            this.scene.time.delayedCall(duration + 100, () => {
                if (explosionSprite && explosionSprite.scene) {
                    explosionSprite.destroy();
                    resolve();
                }
            });
        });
    }

    /**
     * 根据卡牌花色字符获取对应的爆炸动画
     * @param suitChar 花色字符 ('h', 'd', 'c', 's')
     * @param x 动画X坐标
     * @param y 动画Y坐标
     * @param duration 动画持续时间
     */
    public playExplosionBySuit(suitChar: string, x: number, y: number, duration: number = 600): Promise<void> {
        const suit = suitChar.toLowerCase() as CardSuit;
        return this.playExplosion(suit, x, y, duration);
    }

    /**
     * 预加载所有爆炸动画帧
     * 在Preloader中调用此方法
     * 注意：Preloader.ts中已经有了加载代码，这里保持兼容
     */
    public static preloadExplosionFrames(scene: Scene): void {
        // Preloader.ts中已经使用了这种格式加载：
        // this.load.image(`explosion-diamond-${index}`, frame);
        // 所以这里不需要重复加载，只是保持接口兼容性
        console.log('[SuitExplosionManager] 爆炸动画帧已在Preloader中加载');
    }

    /**
     * 销毁管理器，清理资源
     */
    public destroy(): void {
        this.explosionAnimations.clear();
    }

    /**
     * 获取支持的花色列表
     */
    public getSupportedSuits(): CardSuit[] {
        return Array.from(this.explosionAnimations.keys());
    }

    /**
     * 检查指定花色是否有对应的爆炸动画
     */
    public hasSuitExplosion(suit: CardSuit): boolean {
        return this.explosionAnimations.has(suit);
    }
}