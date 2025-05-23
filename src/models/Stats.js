/**
 * Stats Model - Defines the schema and methods for player statistics
 * Focused on Zombies game mode, but extensible to other game modes
 */
class Stats {
    /**
     * Create a new Stats object
     * @param {Object} data - Stats data
     */
    constructor(data = {}) {
        // Core identifiers
        this.id = data.id || null;
        this.playerId = data.playerId || data.player_id || null;
        
        // Basic stats
        this.kills = data.kills || 0;
        this.downs = data.downs || 0;
        this.revives = data.revives || 0;
        this.headshots = data.headshots || 0;
        this.roundsSurvived = data.roundsSurvived || data.rounds_survived || 0;
        
        // Highest/record stats
        this.highestRound = data.highestRound || data.highest_round || 0;
        this.highestScore = data.highestScore || data.highest_score || 0;
        this.highestKills = data.highestKills || data.highest_kills || 0;
        this.highestHeadshots = data.highestHeadshots || data.highest_headshots || 0;
        this.highestRevives = data.highestRevives || data.highest_revives || 0;
        this.highestDowns = data.highestDowns || data.highest_downs || 0;
        
        // Current game stats (reset each match)
        this.currentKills = data.currentKills || data.current_kills || 0;
        this.currentDowns = data.currentDowns || data.current_downs || 0;
        this.currentRevives = data.currentRevives || data.current_revives || 0;
        this.currentHeadshots = data.currentHeadshots || data.current_headshots || 0;
        this.currentRoundsSurvived = data.currentRoundsSurvived || data.current_rounds_survived || 0;
        
        // Period tracking - reference to stats periods
        this.periods = data.periods || [];
        
        // Timestamps
        this.lastGameDate = data.lastGameDate || data.last_game_date || null;
        this.createdAt = data.createdAt || data.created_at || new Date();
        this.updatedAt = data.updatedAt || data.updated_at || new Date();
    }
    
    /**
     * Convert database row to Stats model
     * @param {Object} row - Database row
     * @returns {Stats} Stats instance
     */
    static fromDatabaseRow(row) {
        if (!row) return null;
        
        return new Stats({
            id: row.id,
            playerId: row.player_id,
            kills: row.kills,
            downs: row.downs,
            revives: row.revives,
            headshots: row.headshots,
            roundsSurvived: row.rounds_survived,
            highestRound: row.highest_round,
            highestScore: row.highest_score,
            highestKills: row.highest_kills,
            highestHeadshots: row.highest_headshots,
            highestRevives: row.highest_revives,
            highestDowns: row.highest_downs,
            currentKills: row.current_kills,
            currentDowns: row.current_downs,
            currentRevives: row.current_revives,
            currentHeadshots: row.current_headshots,
            currentRoundsSurvived: row.current_rounds_survived,
            lastGameDate: row.last_game_date,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    }
    
    /**
     * Convert to database format for storage
     * @returns {Object} Database format
     */
    toDatabase() {
        return {
            player_id: this.playerId,
            kills: this.kills,
            downs: this.downs,
            revives: this.revives,
            headshots: this.headshots,
            rounds_survived: this.roundsSurvived,
            highest_round: this.highestRound,
            highest_score: this.highestScore,
            highest_kills: this.highestKills,
            highest_headshots: this.highestHeadshots,
            highest_revives: this.highestRevives,
            highest_downs: this.highestDowns,
            current_kills: this.currentKills,
            current_downs: this.currentDowns,
            current_revives: this.currentRevives,
            current_headshots: this.currentHeadshots,
            current_rounds_survived: this.currentRoundsSurvived,
            last_game_date: this.lastGameDate
        };
    }
    
    /**
     * Update stats with new round data
     * @param {Object} data New stats data to merge
     */
    updateWithGameData(data) {
        // Update current stats
        if (data.kills !== undefined) this.currentKills = data.kills;
        if (data.downs !== undefined) this.currentDowns = data.downs;
        if (data.revives !== undefined) this.currentRevives = data.revives;
        if (data.headshots !== undefined) this.currentHeadshots = data.headshots;
        if (data.roundsSurvived !== undefined) this.currentRoundsSurvived = data.roundsSurvived;
        
        // Update lifetime stats
        this.kills += (data.kills || 0) - (this.currentKills || 0);
        this.downs += (data.downs || 0) - (this.currentDowns || 0);
        this.revives += (data.revives || 0) - (this.currentRevives || 0);
        this.headshots += (data.headshots || 0) - (this.currentHeadshots || 0);
        this.roundsSurvived += (data.roundsSurvived || 0) - (this.currentRoundsSurvived || 0);
        
        // Update records if current values are higher
        if ((data.round || 0) > this.highestRound) {
            this.highestRound = data.round;
        }
        
        if ((data.score || 0) > this.highestScore) {
            this.highestScore = data.score;
        }
        
        if (this.currentKills > this.highestKills) {
            this.highestKills = this.currentKills;
        }
        
        if (this.currentHeadshots > this.highestHeadshots) {
            this.highestHeadshots = this.currentHeadshots;
        }
        
        if (this.currentRevives > this.highestRevives) {
            this.highestRevives = this.currentRevives;
        }
        
        if (this.currentDowns > this.highestDowns) {
            this.highestDowns = this.currentDowns;
        }
        
        // Update timestamps
        this.lastGameDate = new Date();
        this.updatedAt = new Date();
    }
    
    /**
     * Reset current game stats
     */
    resetCurrentStats() {
        this.currentKills = 0;
        this.currentDowns = 0;
        this.currentRevives = 0;
        this.currentHeadshots = 0;
        this.currentRoundsSurvived = 0;
    }
    
    /**
     * Convert to API response format
     * @param {boolean} includePeriods Include period stats
     * @returns {Object} API format
     */
    toJSON(includePeriods = false) {
        const result = {
            id: this.id,
            playerId: this.playerId,
            kills: this.kills,
            downs: this.downs,
            revives: this.revives,
            headshots: this.headshots,
            roundsSurvived: this.roundsSurvived,
            records: {
                highestRound: this.highestRound,
                highestScore: this.highestScore,
                highestKills: this.highestKills,
                highestHeadshots: this.highestHeadshots,
                highestRevives: this.highestRevives,
                highestDowns: this.highestDowns
            },
            current: {
                kills: this.currentKills,
                downs: this.currentDowns,
                revives: this.currentRevives,
                headshots: this.currentHeadshots,
                roundsSurvived: this.currentRoundsSurvived
            },
            lastGameDate: this.lastGameDate,
            updatedAt: this.updatedAt
        };
        
        if (includePeriods && this.periods && this.periods.length) {
            result.periods = this.periods;
        }
        
        return result;
    }
}

/**
 * Period Stats Model - For weekly/monthly/yearly statistics tracking
 */
class PeriodStats {
    /**
     * Create a new PeriodStats object
     * @param {Object} data - Period stats data
     */
    constructor(data = {}) {
        // Core identifiers
        this.id = data.id || null;
        this.playerId = data.playerId || data.player_id || null;
        
        // Period information
        this.periodType = data.periodType || data.period_type || 'weekly'; // weekly, monthly, yearly
        this.periodKey = data.periodKey || data.period_key || ''; // Format: 2025-W20, 2025-05, 2025
        
        // Stats
        this.kills = data.kills || 0;
        this.downs = data.downs || 0;
        this.revives = data.revives || 0;
        this.headshots = data.headshots || 0;
        this.roundsSurvived = data.roundsSurvived || data.rounds_survived || 0;
        this.highestRound = data.highestRound || data.highest_round || 0;
        this.highestScore = data.highestScore || data.highest_score || 0;
        
        // Current game stats (reset each match)
        this.currentKills = data.currentKills || data.current_kills || 0;
        this.currentDowns = data.currentDowns || data.current_downs || 0;
        this.currentRevives = data.currentRevives || data.current_revives || 0;
        this.currentHeadshots = data.currentHeadshots || data.current_headshots || 0;
        this.currentRoundsSurvived = data.currentRoundsSurvived || data.current_rounds_survived || 0;
        
        // Timestamps
        this.createdAt = data.createdAt || data.created_at || new Date();
        this.updatedAt = data.updatedAt || data.updated_at || new Date();
    }
    
    /**
     * Convert database row to PeriodStats model
     * @param {Object} row - Database row
     * @returns {PeriodStats} PeriodStats instance
     */
    static fromDatabaseRow(row) {
        if (!row) return null;
        
        return new PeriodStats({
            id: row.id,
            playerId: row.player_id,
            periodType: row.period_type,
            periodKey: row.period_key,
            kills: row.kills,
            downs: row.downs,
            revives: row.revives,
            headshots: row.headshots,
            roundsSurvived: row.rounds_survived,
            highestRound: row.highest_round,
            highestScore: row.highest_score,
            currentKills: row.current_kills,
            currentDowns: row.current_downs,
            currentRevives: row.current_revives,
            currentHeadshots: row.current_headshots,
            currentRoundsSurvived: row.current_rounds_survived,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    }
    
    /**
     * Convert to database format for storage
     * @returns {Object} Database format
     */
    toDatabase() {
        return {
            player_id: this.playerId,
            period_type: this.periodType,
            period_key: this.periodKey,
            kills: this.kills,
            downs: this.downs,
            revives: this.revives,
            headshots: this.headshots,
            rounds_survived: this.roundsSurvived,
            highest_round: this.highestRound,
            highest_score: this.highestScore,
            current_kills: this.currentKills,
            current_downs: this.currentDowns,
            current_revives: this.currentRevives,
            current_headshots: this.currentHeadshots,
            current_rounds_survived: this.currentRoundsSurvived
        };
    }
    
    /**
     * Generate current period key for a given type
     * @param {string} periodType - weekly, monthly, yearly
     * @returns {string} Period key
     */
    static getCurrentPeriodKey(periodType = 'weekly') {
        const now = new Date();
        const year = now.getFullYear();
        
        switch (periodType) {
            case 'weekly': {
                // Calculate week number
                const firstDayOfYear = new Date(year, 0, 1);
                const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
                const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
            }
            case 'monthly':
                return `${year}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
            case 'yearly':
            default:
                return year.toString();
        }
    }
    
    /**
     * Convert to API response format
     * @returns {Object} API format
     */
    toJSON() {
        return {
            id: this.id,
            playerId: this.playerId,
            periodType: this.periodType,
            periodKey: this.periodKey,
            kills: this.kills,
            downs: this.downs,
            revives: this.revives,
            headshots: this.headshots,
            roundsSurvived: this.roundsSurvived,
            highestRound: this.highestRound,
            highestScore: this.highestScore,
            current: {
                kills: this.currentKills,
                downs: this.currentDowns,
                revives: this.currentRevives,
                headshots: this.currentHeadshots,
                roundsSurvived: this.currentRoundsSurvived
            },
            updatedAt: this.updatedAt
        };
    }
}

module.exports = { Stats, PeriodStats };
