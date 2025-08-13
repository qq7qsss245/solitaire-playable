import React, { useState, useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import downloadApp from '../game/scenes/constants/download';
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
    const [isVisible, setIsVisible] = useState(false);
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

    const handleDownload = () => {
        console.log('📱 React: Download app clicked');
        downloadApp();
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
            <div className='line ver id1'/>
            <div className='line ver id2'/>
            <div className='line hor id3'/>
            <div className='line ver id4'/>
            <div className='line ver id5'/>
            {/* 结算面板背景 */}
            <div className="game-over-panel" style={{ backgroundImage: `url(${gameoverBg})` }} onClick={handleDownload}>
                {/* 表格式布局 */}
                <div className="stats-table">
                    {/* 标题行 */}
                    <div className="table-header">
                        <div className="col-empty"></div>
                        <div className="col-your">
                            <img src={yourText} alt="YOUR" className="header-text" />
                        </div>
                        <div className="col-best">
                            <img src={bestText} alt="BEST" className="header-text" />
                        </div>
                    </div>

                    {/* 分数行 */}
                    <div className="table-row">
                        <div className="col-label">
                            <img src={scoreText} alt="SCORE" className="label-text" />
                        </div>
                        <div className="col-value">
                            {currentStats.score}
                        </div>
                        <div className="col-record">
                            <img src={bestUi} alt="NEW RECORD" className="record-badge" />
                        </div>
                    </div>

                    {/* 时间行 */}
                    <div className="table-row">
                        <div className="col-label">
                            <img src={timeText} alt="TIME" className="label-text" />
                        </div>
                        <div className="col-value">
                            {formatTime(currentStats.time)}
                        </div>
                        <div className="col-record">
                            <img src={bestUi} alt="NEW RECORD" className="record-badge" />
                        </div>
                    </div>

                    {/* 步数行 */}
                    <div className="table-row">
                        <div className="col-label">
                            <img src={movesText} alt="MOVES" className="label-text" />
                        </div>
                        <div className="col-value">
                            {currentStats.moves}
                        </div>
                        <div className="col-record">
                            <img src={bestUi} alt="NEW RECORD" className="record-badge" />
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