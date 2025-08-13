export interface GameRecord {
    score: number;
    time: number; // 游戏时间（秒）
    moves: number;
    date: string; // 记录创建日期
}

export interface BestRecords {
    score: number;
    time: number;
    moves: number;
}

export class GameRecordsManager {
    private static readonly STORAGE_KEY = 'solitaire_game_records';
    private static readonly BEST_RECORDS_KEY = 'solitaire_best_records';

    /**
     * 保存游戏记录
     */
    public static saveGameRecord(record: Omit<GameRecord, 'date'>): void {
        try {
            const gameRecord: GameRecord = {
                ...record,
                date: new Date().toISOString()
            };

            // 获取现有记录
            const existingRecords = this.getGameRecords();
            existingRecords.push(gameRecord);

            // 只保留最近100条记录
            const recentRecords = existingRecords.slice(-100);

            // 保存到本地存储
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentRecords));

            // 更新最佳记录
            this.updateBestRecords(gameRecord);

            console.log('🏆 Game record saved:', gameRecord);
        } catch (error) {
            console.error('❌ Failed to save game record:', error);
        }
    }

    /**
     * 获取所有游戏记录
     */
    public static getGameRecords(): GameRecord[] {
        try {
            const records = localStorage.getItem(this.STORAGE_KEY);
            return records ? JSON.parse(records) : [];
        } catch (error) {
            console.error('❌ Failed to load game records:', error);
            return [];
        }
    }

    /**
     * 获取最佳记录
     */
    public static getBestRecords(): BestRecords {
        try {
            const bestRecords = localStorage.getItem(this.BEST_RECORDS_KEY);
            if (bestRecords) {
                return JSON.parse(bestRecords);
            }
        } catch (error) {
            console.error('❌ Failed to load best records:', error);
        }

        // 返回默认值
        return {
            score: 0,
            time: 0,
            moves: 0
        };
    }

    /**
     * 更新最佳记录
     */
    private static updateBestRecords(newRecord: GameRecord): void {
        try {
            const currentBest = this.getBestRecords();
            let updated = false;

            // 更新最高分
            if (newRecord.score > currentBest.score) {
                currentBest.score = newRecord.score;
                updated = true;
                console.log('🎯 New best score:', newRecord.score);
            }

            // 更新最短时间（只有在有效时间且比当前记录更短时才更新）
            if (newRecord.time > 0 && (currentBest.time === 0 || newRecord.time < currentBest.time)) {
                currentBest.time = newRecord.time;
                updated = true;
                console.log('⏱️ New best time:', newRecord.time);
            }

            // 更新最少步数（只有在有效步数且比当前记录更少时才更新）
            if (newRecord.moves > 0 && (currentBest.moves === 0 || newRecord.moves < currentBest.moves)) {
                currentBest.moves = newRecord.moves;
                updated = true;
                console.log('👣 New best moves:', newRecord.moves);
            }

            if (updated) {
                localStorage.setItem(this.BEST_RECORDS_KEY, JSON.stringify(currentBest));
                console.log('🏆 Best records updated:', currentBest);
            }
        } catch (error) {
            console.error('❌ Failed to update best records:', error);
        }
    }

    /**
     * 检查是否创造了新记录
     */
    public static checkNewRecords(newRecord: Omit<GameRecord, 'date'>): {
        isNewScoreRecord: boolean;
        isNewTimeRecord: boolean;
        isNewMovesRecord: boolean;
    } {
        const currentBest = this.getBestRecords();

        return {
            isNewScoreRecord: newRecord.score > currentBest.score,
            isNewTimeRecord: newRecord.time > 0 && (currentBest.time === 0 || newRecord.time < currentBest.time),
            isNewMovesRecord: newRecord.moves > 0 && (currentBest.moves === 0 || newRecord.moves < currentBest.moves)
        };
    }

    /**
     * 清除所有记录（用于测试或重置）
     */
    public static clearAllRecords(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.BEST_RECORDS_KEY);
            console.log('🗑️ All game records cleared');
        } catch (error) {
            console.error('❌ Failed to clear records:', error);
        }
    }

    /**
     * 获取统计信息
     */
    public static getStatistics(): {
        totalGames: number;
        averageScore: number;
        averageTime: number;
        averageMoves: number;
    } {
        const records = this.getGameRecords();
        
        if (records.length === 0) {
            return {
                totalGames: 0,
                averageScore: 0,
                averageTime: 0,
                averageMoves: 0
            };
        }

        const validRecords = records.filter(r => r.time > 0 && r.moves > 0);
        
        return {
            totalGames: records.length,
            averageScore: records.reduce((sum, r) => sum + r.score, 0) / records.length,
            averageTime: validRecords.length > 0 ? validRecords.reduce((sum, r) => sum + r.time, 0) / validRecords.length : 0,
            averageMoves: validRecords.length > 0 ? validRecords.reduce((sum, r) => sum + r.moves, 0) / validRecords.length : 0
        };
    }
}