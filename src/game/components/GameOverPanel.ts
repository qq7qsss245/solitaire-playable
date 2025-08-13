import { Scene, GameObjects } from 'phaser';
import { AssetKeys } from '../../assets';

export interface GameStats {
    score: number;
    time: number; // 游戏时间（秒）
    moves: number;
}

export interface BestRecords {
    score: number;
    time: number;
    moves: number;
}

export class GameOverPanel {
    private scene: Scene;
    private container: GameObjects.Container;
    private isVisible: boolean = false;
    
    // UI元素
    private background: GameObjects.Image;
    private greatText: GameObjects.Image;
    private yourText: GameObjects.Image;
    private bestText: GameObjects.Image;
    
    // 数据标签
    private scoreLabel: GameObjects.Image;
    private timeLabel: GameObjects.Image;
    private movesLabel: GameObjects.Image;
    
    // 数据值
    private scoreValue: GameObjects.Text;
    private timeValue: GameObjects.Text;
    private movesValue: GameObjects.Text;
    
    // 最佳记录标识
    private bestScoreIcon: GameObjects.Image;
    private bestTimeIcon: GameObjects.Image;
    private bestMovesIcon: GameObjects.Image;
    
    // 最佳记录值
    private bestScoreValue: GameObjects.Text;
    private bestTimeValue: GameObjects.Text;
    private bestMovesValue: GameObjects.Text;
    
    // 继续按钮
    private continueButton: GameObjects.Image;
    private continueText: GameObjects.Image;
    
    // 回调函数
    private onContinueCallback?: () => void;

    constructor(scene: Scene) {
        this.scene = scene;
        this.createPanel();
    }

    private createPanel(): void {
        // 创建容器
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(1000); // 确保在最上层
        this.container.setVisible(false);

        // 获取屏幕中心
        const centerX = this.scene.cameras.main.width / 2;
        const centerY = this.scene.cameras.main.height / 2;

        // 创建背景
        this.background = this.scene.add.image(centerX, centerY, AssetKeys.GAMEOVER_BG);
        this.background.setOrigin(0.5, 0.5);
        this.container.add(this.background);

        // 创建顶部标题 "GREAT!"
        this.greatText = this.scene.add.image(centerX, centerY - 120, AssetKeys.GREAT_TEXT);
        this.greatText.setOrigin(0.5, 0.5);
        this.container.add(this.greatText);

        // 创建标题行 "YOUR" 和 "BEST"
        this.yourText = this.scene.add.image(centerX - 80, centerY - 60, AssetKeys.YOUR_TEXT);
        this.yourText.setOrigin(0.5, 0.5);
        this.container.add(this.yourText);

        this.bestText = this.scene.add.image(centerX + 80, centerY - 60, AssetKeys.BEST_TEXT);
        this.bestText.setOrigin(0.5, 0.5);
        this.container.add(this.bestText);

        // 创建数据标签
        this.scoreLabel = this.scene.add.image(centerX - 120, centerY - 20, AssetKeys.SCORE_GAMEOVER_TEXT);
        this.scoreLabel.setOrigin(0.5, 0.5);
        this.container.add(this.scoreLabel);

        this.timeLabel = this.scene.add.image(centerX - 120, centerY + 10, AssetKeys.TIME_GAMEOVER_TEXT);
        this.timeLabel.setOrigin(0.5, 0.5);
        this.container.add(this.timeLabel);

        this.movesLabel = this.scene.add.image(centerX - 120, centerY + 40, AssetKeys.MOVES_GAMEOVER_TEXT);
        this.movesLabel.setOrigin(0.5, 0.5);
        this.container.add(this.movesLabel);

        // 创建当前数据值
        this.scoreValue = this.scene.add.text(centerX - 80, centerY - 20, '0', {
            fontSize: '24px',
            color: '#000000',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        this.scoreValue.setOrigin(0.5, 0.5);
        this.container.add(this.scoreValue);

        this.timeValue = this.scene.add.text(centerX - 80, centerY + 10, '00:30', {
            fontSize: '24px',
            color: '#4A90E2',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        this.timeValue.setOrigin(0.5, 0.5);
        this.container.add(this.timeValue);

        this.movesValue = this.scene.add.text(centerX - 80, centerY + 40, '0', {
            fontSize: '24px',
            color: '#000000',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        this.movesValue.setOrigin(0.5, 0.5);
        this.container.add(this.movesValue);

        // 创建最佳记录标识
        this.bestScoreIcon = this.scene.add.image(centerX + 80, centerY - 20, AssetKeys.BEST_UI);
        this.bestScoreIcon.setOrigin(0.5, 0.5);
        this.bestScoreIcon.setScale(0.8);
        this.container.add(this.bestScoreIcon);

        this.bestTimeIcon = this.scene.add.image(centerX + 80, centerY + 10, AssetKeys.BEST_UI);
        this.bestTimeIcon.setOrigin(0.5, 0.5);
        this.bestTimeIcon.setScale(0.8);
        this.container.add(this.bestTimeIcon);

        this.bestMovesIcon = this.scene.add.image(centerX + 80, centerY + 40, AssetKeys.BEST_UI);
        this.bestMovesIcon.setOrigin(0.5, 0.5);
        this.bestMovesIcon.setScale(0.8);
        this.container.add(this.bestMovesIcon);

        // 创建最佳记录值（显示在图标上）
        this.bestScoreValue = this.scene.add.text(centerX + 80, centerY - 20, 'NEW\nRECORD', {
            fontSize: '10px',
            color: '#FFFFFF',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            align: 'center'
        });
        this.bestScoreValue.setOrigin(0.5, 0.5);
        this.container.add(this.bestScoreValue);

        this.bestTimeValue = this.scene.add.text(centerX + 80, centerY + 10, 'NEW\nRECORD', {
            fontSize: '10px',
            color: '#FFFFFF',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            align: 'center'
        });
        this.bestTimeValue.setOrigin(0.5, 0.5);
        this.container.add(this.bestTimeValue);

        this.bestMovesValue = this.scene.add.text(centerX + 80, centerY + 40, 'NEW\nRECORD', {
            fontSize: '10px',
            color: '#FFFFFF',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            align: 'center'
        });
        this.bestMovesValue.setOrigin(0.5, 0.5);
        this.container.add(this.bestMovesValue);

        // 创建继续按钮
        this.continueButton = this.scene.add.image(centerX, centerY + 100, AssetKeys.CONTINUE_BUTTON);
        this.continueButton.setOrigin(0.5, 0.5);
        this.continueButton.setInteractive({ useHandCursor: true });
        this.container.add(this.continueButton);

        this.continueText = this.scene.add.image(centerX, centerY + 100, AssetKeys.CONTINUE_SMALL_TEXT);
        this.continueText.setOrigin(0.5, 0.5);
        this.container.add(this.continueText);

        // 添加按钮点击事件
        this.continueButton.on('pointerdown', () => {
            if (this.onContinueCallback) {
                this.onContinueCallback();
            }
        });

        // 添加按钮悬停效果
        this.continueButton.on('pointerover', () => {
            this.continueButton.setScale(1.05);
        });

        this.continueButton.on('pointerout', () => {
            this.continueButton.setScale(1.0);
        });
    }

    /**
     * 显示结算面板
     */
    public show(currentStats: GameStats, bestRecords: BestRecords, onContinue?: () => void): void {
        this.onContinueCallback = onContinue;
        
        // 更新当前数据
        this.updateCurrentStats(currentStats);
        
        // 更新最佳记录显示
        this.updateBestRecords(currentStats, bestRecords);
        
        // 显示面板
        this.container.setVisible(true);
        this.isVisible = true;

        // 添加淡入动画
        this.container.setAlpha(0);
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }

    /**
     * 隐藏结算面板
     */
    public hide(): void {
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                this.container.setVisible(false);
                this.isVisible = false;
            }
        });
    }

    /**
     * 更新当前游戏数据
     */
    private updateCurrentStats(stats: GameStats): void {
        this.scoreValue.setText(stats.score.toString());
        
        // 格式化时间显示
        const minutes = Math.floor(stats.time / 60);
        const seconds = stats.time % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.timeValue.setText(timeString);
        
        this.movesValue.setText(stats.moves.toString());
    }

    /**
     * 更新最佳记录显示
     */
    private updateBestRecords(currentStats: GameStats, bestRecords: BestRecords): void {
        // 检查是否创造新记录
        const isNewScoreRecord = currentStats.score > bestRecords.score;
        const isNewTimeRecord = currentStats.time < bestRecords.time || bestRecords.time === 0;
        const isNewMovesRecord = currentStats.moves < bestRecords.moves || bestRecords.moves === 0;

        // 更新分数记录显示
        if (isNewScoreRecord) {
            this.bestScoreValue.setText('NEW\nRECORD');
            this.bestScoreIcon.setVisible(true);
        } else {
            this.bestScoreValue.setText(bestRecords.score.toString());
            this.bestScoreIcon.setVisible(false);
        }

        // 更新时间记录显示
        if (isNewTimeRecord) {
            this.bestTimeValue.setText('NEW\nRECORD');
            this.bestTimeIcon.setVisible(true);
        } else {
            const minutes = Math.floor(bestRecords.time / 60);
            const seconds = bestRecords.time % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            this.bestTimeValue.setText(timeString);
            this.bestTimeIcon.setVisible(false);
        }

        // 更新步数记录显示
        if (isNewMovesRecord) {
            this.bestMovesValue.setText('NEW\nRECORD');
            this.bestMovesIcon.setVisible(true);
        } else {
            this.bestMovesValue.setText(bestRecords.moves.toString());
            this.bestMovesIcon.setVisible(false);
        }
    }

    /**
     * 检查面板是否可见
     */
    public get visible(): boolean {
        return this.isVisible;
    }

    /**
     * 销毁面板
     */
    public destroy(): void {
        if (this.container) {
            this.container.destroy();
        }
    }
}