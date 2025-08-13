import React, { useState, useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import { GameRecordsManager, GameRecord, BestRecords } from '../utils/GameRecords';

// 导入结算相关图片资源
import gameoverBg from '../assets/images/ui/gameover/结算bg.png';
import bestUi from '../assets/images/ui/gameover/best ui.png';
import continueButton from '../assets/images/ui/gameover/continue button.png';
import greatText from '../assets/images/ui/gameover/GREAT!.png';
import bestText from '../assets/images/ui/gameover/BEST.png';
import continueSmallText from '../assets/images/ui/gameover/CONTINUE_小.png';
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
    const [bestRecords, setBestRecords] = useState<BestRecords>({ score: 0, time: 0, moves: 0 });
    const [newRecords, setNewRecords] = useState({
        isNewScoreRecord: false,
        isNewTimeRecord: false,
        isNewMovesRecord: false
    });

    useEffect(() => {
        // 监听游戏结算事件
        const handleGameOver = (data: GameStats) => {
            console.log('🏁 React: Game over event received', data);
            
            // 获取最佳记录
            const best = GameRecordsManager.getBestRecords();
            
            // 检查新记录
            const newRecordCheck = GameRecordsManager.checkNewRecords(data);
            
            // 保存游戏记录
            GameRecordsManager.saveGameRecord(data);
            
            // 更新状态
            setCurrentStats(data);
            setBestRecords(best);
            setNewRecords(newRecordCheck);
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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease-in-out'
        }}>
            {/* 结算面板背景 */}
            <div style={{
                position: 'relative',
                backgroundImage: `url(${gameoverBg})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                width: '400px',
                height: '500px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {/* 顶部标题 GREAT! */}
                <img 
                    src={greatText} 
                    alt="GREAT!" 
                    style={{
                        position: 'absolute',
                        top: '60px',
                        width: '120px',
                        height: 'auto'
                    }}
                />

                {/* 标题行 YOUR 和 BEST */}
                <div style={{
                    position: 'absolute',
                    top: '140px',
                    display: 'flex',
                    width: '280px',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <img src={yourText} alt="YOUR" style={{ width: '60px', height: 'auto' }} />
                    <img src={bestText} alt="BEST" style={{ width: '60px', height: 'auto' }} />
                </div>

                {/* 数据行 */}
                <div style={{
                    position: 'absolute',
                    top: '180px',
                    width: '320px'
                }}>
                    {/* 分数行 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '15px',
                        height: '30px'
                    }}>
                        <img src={scoreText} alt="SCORE:" style={{ width: '80px', height: 'auto' }} />
                        <div style={{
                            flex: 1,
                            textAlign: 'center',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#000000'
                        }}>
                            {currentStats.score}
                        </div>
                        <div style={{ position: 'relative', width: '60px', textAlign: 'center' }}>
                            {newRecords.isNewScoreRecord ? (
                                <>
                                    <img src={bestUi} alt="NEW RECORD" style={{ width: '50px', height: 'auto' }} />
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        fontSize: '8px',
                                        fontWeight: 'bold',
                                        color: '#FFFFFF',
                                        textAlign: 'center',
                                        lineHeight: '1'
                                    }}>
                                        NEW<br/>RECORD
                                    </div>
                                </>
                            ) : (
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: '#000000'
                                }}>
                                    {bestRecords.score}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 时间行 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '15px',
                        height: '30px'
                    }}>
                        <img src={timeText} alt="TIME:" style={{ width: '80px', height: 'auto' }} />
                        <div style={{
                            flex: 1,
                            textAlign: 'center',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#4A90E2'
                        }}>
                            {formatTime(currentStats.time)}
                        </div>
                        <div style={{ position: 'relative', width: '60px', textAlign: 'center' }}>
                            {newRecords.isNewTimeRecord ? (
                                <>
                                    <img src={bestUi} alt="NEW RECORD" style={{ width: '50px', height: 'auto' }} />
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        fontSize: '8px',
                                        fontWeight: 'bold',
                                        color: '#FFFFFF',
                                        textAlign: 'center',
                                        lineHeight: '1'
                                    }}>
                                        NEW<br/>RECORD
                                    </div>
                                </>
                            ) : (
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: '#000000'
                                }}>
                                    {bestRecords.time > 0 ? formatTime(bestRecords.time) : '--:--'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 步数行 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '15px',
                        height: '30px'
                    }}>
                        <img src={movesText} alt="MOVES:" style={{ width: '80px', height: 'auto' }} />
                        <div style={{
                            flex: 1,
                            textAlign: 'center',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#000000'
                        }}>
                            {currentStats.moves}
                        </div>
                        <div style={{ position: 'relative', width: '60px', textAlign: 'center' }}>
                            {newRecords.isNewMovesRecord ? (
                                <>
                                    <img src={bestUi} alt="NEW RECORD" style={{ width: '50px', height: 'auto' }} />
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        fontSize: '8px',
                                        fontWeight: 'bold',
                                        color: '#FFFFFF',
                                        textAlign: 'center',
                                        lineHeight: '1'
                                    }}>
                                        NEW<br/>RECORD
                                    </div>
                                </>
                            ) : (
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: '#000000'
                                }}>
                                    {bestRecords.moves > 0 ? bestRecords.moves : '--'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 继续提示 */}
                <div style={{
                    position: 'absolute',
                    top: '320px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#FF8C00',
                    textAlign: 'center'
                }}>
                    CONTINUE?
                </div>

                {/* 继续按钮 */}
                <div 
                    style={{
                        position: 'absolute',
                        bottom: '60px',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease'
                    }}
                    onClick={handleContinue}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1.0)';
                    }}
                >
                    <img 
                        src={continueButton} 
                        alt="Continue" 
                        style={{ 
                            width: '200px', 
                            height: 'auto',
                            position: 'relative'
                        }} 
                    />
                    <img 
                        src={continueSmallText} 
                        alt="CONTINUE" 
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '100px',
                            height: 'auto'
                        }}
                    />
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default GameOverModal;