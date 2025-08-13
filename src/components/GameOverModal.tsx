import React, { useState, useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import './GameOverModal.css';

// 导入结算相关图片资源
import gameoverBg from '../assets/images/ui/gameover/结算bg.png';
import bestUi from '../assets/images/ui/gameover/best ui.png';
import continueButton from '../assets/images/ui/gameover/continue button.png';
import bestText from '../assets/images/ui/gameover/BEST.png';
import movesText from '../assets/images/ui/gameover/MOVES_.png';
import scoreText from '../assets/images/ui/gameover/SCORE_.png';
import timeText from '../assets/images/ui/gameover/TIME_.png';
import yourText from '../assets/images/ui/gameover/YOUR.png';

export interface GameStats {
    score: number;
    time: number; // 游戏时间（秒）
    moves: number;
}

interface GameOverModalProps {
    // 可以添加额外的props
}

const GameOverModal: React.FC<GameOverModalProps> = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [currentStats, setCurrentStats] = useState<GameStats>({ score: 0, time: 0, moves: 0 });

    useEffect(() => {
        // 监听游戏结算事件
        const handleGameOver = (data: GameStats) => {
            console.log('🏁 React: Game over event received', data);
            
            // 更新状态
            setCurrentStats(data);
            setIsVisible(true);
        };

        // 监听隐藏事件
        const handleHideGameOver = () => {
            setIsVisible(false);
        };

        EventBus.on('show-game-over', handleGameOver);
        EventBus.on('hide-game-over', handleHideGameOver);

        return () => {
            EventBus.off('show-game-over', handleGameOver);
            EventBus.off('hide-game-over', handleHideGameOver);
        };
    }, []);

    const handleContinue = () => {
        console.log('🔄 React: Continue game clicked');
        setIsVisible(false);
        EventBus.emit('game-continue');
    };

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="game-over-overlay">
            {/* 结算面板背景 */}
            <div className="game-over-panel" style={{ backgroundImage: `url(${gameoverBg})` }}>
                {/* 标题行 YOUR 和 BEST */}
                <div className="title-row">
                    <img src={yourText} alt="YOUR" className="title-your" />
                    <img src={bestText} alt="BEST" className="title-best" />
                </div>

                {/* 数据区域 */}
                <div className="data-section">
                    {/* 分数行 */}
                    <div className="data-row">
                        <img src={scoreText} alt="SCORE:" className="data-label" />
                        <div className="data-value">
                            {currentStats.score}
                        </div>
                        <div className="best-record-container">
                            <img src={bestUi} alt="NEW RECORD" className="best-record-icon" />
                            <div className="best-record-text">
                                NEW<br/>RECORD
                            </div>
                        </div>
                    </div>

                    {/* 时间行 */}
                    <div className="data-row">
                        <img src={timeText} alt="TIME:" className="data-label" />
                        <div className="data-value time">
                            {formatTime(currentStats.time)}
                        </div>
                        <div className="best-record-container">
                            <img src={bestUi} alt="NEW RECORD" className="best-record-icon" />
                            <div className="best-record-text">
                                NEW<br/>RECORD
                            </div>
                        </div>
                    </div>

                    {/* 步数行 */}
                    <div className="data-row">
                        <img src={movesText} alt="MOVES:" className="data-label" />
                        <div className="data-value">
                            {currentStats.moves}
                        </div>
                        <div className="best-record-container">
                            <img src={bestUi} alt="NEW RECORD" className="best-record-icon" />
                            <div className="best-record-text">
                                NEW<br/>RECORD
                            </div>
                        </div>
                    </div>
                </div>

                {/* 继续提示 */}
                <div className="continue-prompt">
                    CONTINUE?
                </div>

                {/* 继续按钮 */}
                <div
                    className="continue-button-container"
                    onClick={handleContinue}
                >
                    <img
                        src={continueButton}
                        alt="Continue"
                        className="continue-button"
                    />
                </div>
            </div>
        </div>
    );
};

export default GameOverModal;