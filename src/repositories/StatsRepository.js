/**
 * Stats Repository - Data access for player stats
 */
const BaseRepository = require('./BaseRepository');
const { Stats, PeriodStats } = require('../models/Stats');

class StatsRepository extends BaseRepository {
    /**
     * Create a new StatsRepository
     * @param {Object} db - Database connection
     */
    constructor(db) {
        super(db, 'zombies_stats');
    }
    
    /**
     * Get player stats
     * @param {number} playerId - Player ID
     * @returns {Promise<Stats|null>} Stats model or null
     */
    async getPlayerStats(playerId) {
        try {
            const row = await this.db.get(
                'SELECT * FROM zombies_stats WHERE player_id = ?',
                [playerId]
            );
            
            return Stats.fromDatabaseRow(row);
        } catch (error) {
            console.error('Error in StatsRepository.getPlayerStats:', error);
            throw error;
        }
    }
    
    /**
     * Get player stats with periods
     * @param {number} playerId - Player ID
     * @returns {Promise<Stats|null>} Stats model with periods or null
     */
    async getPlayerStatsWithPeriods(playerId) {
        try {
            // Get base stats
            const stats = await this.getPlayerStats(playerId);
            if (!stats) return null;
            
            // Get period stats
            const periodRows = await this.db.all(
                'SELECT * FROM zombies_stats_periods WHERE player_id = ? ORDER BY period_type, period_key DESC',
                [playerId]
            );
            
            const periods = periodRows.map(row => PeriodStats.fromDatabaseRow(row));
            stats.periods = periods;
            
            return stats;
        } catch (error) {
            console.error('Error in StatsRepository.getPlayerStatsWithPeriods:', error);
            throw error;
        }
    }
    
    /**
     * Initialize stats for a new player
     * @param {number} playerId - Player ID
     * @returns {Promise<Stats>} New Stats model
     */
    async initializePlayerStats(playerId) {
        try {
            // Check if stats already exist
            const existingStats = await this.getPlayerStats(playerId);
            if (existingStats) return existingStats;
            
            // Create new stats
            const defaultStats = new Stats({ playerId });
            const data = defaultStats.toDatabase();
            
            const result = await this.insert(data);
            return { ...defaultStats, id: result.id };
        } catch (error) {
            console.error('Error in StatsRepository.initializePlayerStats:', error);
            throw error;
        }
    }
    
    /**
     * Update player stats
     * @param {number} playerId - Player ID
     * @param {Object} data - Stats data
     * @returns {Promise<Stats>} Updated Stats model
     */
    async updatePlayerStats(playerId, data) {
        try {
            // Get or create stats
            let stats = await this.getPlayerStats(playerId);
            
            if (!stats) {
                stats = await this.initializePlayerStats(playerId);
            }
            
            // Update stats with new data
            stats.updateWithGameData(data);
            
            // Save to database
            await this.update(stats.id, stats.toDatabase());
            
            // Update period stats
            await this.updatePeriodStats(playerId, data);
            
            return stats;
        } catch (error) {
            console.error('Error in StatsRepository.updatePlayerStats:', error);
            throw error;
        }
    }
    
    /**
     * Reset current stats after a match ends
     * @param {number} playerId - Player ID
     * @returns {Promise<boolean>} Success
     */
    async resetCurrentStats(playerId) {
        try {
            const stats = await this.getPlayerStats(playerId);
            if (!stats) return false;
            
            stats.resetCurrentStats();
            await this.update(stats.id, stats.toDatabase());
            
            return true;
        } catch (error) {
            console.error('Error in StatsRepository.resetCurrentStats:', error);
            throw error;
        }
    }
    
    /**
     * Get period stats
     * @param {number} playerId - Player ID
     * @param {string} periodType - Period type (weekly, monthly, yearly)
     * @param {string} periodKey - Period key
     * @returns {Promise<PeriodStats|null>} PeriodStats model or null
     */
    async getPeriodStats(playerId, periodType, periodKey) {
        try {
            const row = await this.db.get(
                'SELECT * FROM zombies_stats_periods WHERE player_id = ? AND period_type = ? AND period_key = ?',
                [playerId, periodType, periodKey]
            );
            
            return PeriodStats.fromDatabaseRow(row);
        } catch (error) {
            console.error('Error in StatsRepository.getPeriodStats:', error);
            throw error;
        }
    }
    
    /**
     * Update period stats
     * @param {number} playerId - Player ID
     * @param {Object} data - Stats data
     * @returns {Promise<boolean>} Success
     */
    async updatePeriodStats(playerId, data) {
        try {
            // Update for each period type
            const periodTypes = ['weekly', 'monthly', 'yearly'];
            
            for (const periodType of periodTypes) {
                const periodKey = PeriodStats.getCurrentPeriodKey(periodType);
                
                // Get or create period stats
                let periodStats = await this.getPeriodStats(playerId, periodType, periodKey);
                
                if (!periodStats) {
                    // Create new period stats
                    periodStats = new PeriodStats({
                        playerId,
                        periodType,
                        periodKey
                    });
                    
                    const result = await this.db._run(
                        `INSERT INTO zombies_stats_periods (
                            player_id, period_type, period_key, kills, downs, revives, headshots, 
                            rounds_survived, highest_round, highest_score, current_kills, 
                            current_downs, current_revives, current_headshots, current_rounds_survived
                        ) VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
                        [playerId, periodType, periodKey]
                    );
                    
                    periodStats.id = result.lastID;
                }
                
                // Update period stats
                if (data.kills !== undefined) periodStats.currentKills = data.kills;
                if (data.downs !== undefined) periodStats.currentDowns = data.downs;
                if (data.revives !== undefined) periodStats.currentRevives = data.revives;
                if (data.headshots !== undefined) periodStats.currentHeadshots = data.headshots;
                if (data.roundsSurvived !== undefined) periodStats.currentRoundsSurvived = data.roundsSurvived;
                
                // Update cumulative stats
                periodStats.kills += (data.kills || 0) - (periodStats.currentKills || 0);
                periodStats.downs += (data.downs || 0) - (periodStats.currentDowns || 0);
                periodStats.revives += (data.revives || 0) - (periodStats.currentRevives || 0);
                periodStats.headshots += (data.headshots || 0) - (periodStats.currentHeadshots || 0);
                periodStats.roundsSurvived += (data.roundsSurvived || 0) - (periodStats.currentRoundsSurvived || 0);
                
                // Update records
                if ((data.round || 0) > periodStats.highestRound) {
                    periodStats.highestRound = data.round;
                }
                
                if ((data.score || 0) > periodStats.highestScore) {
                    periodStats.highestScore = data.score;
                }
                
                // Save to database
                await this.db._run(
                    `UPDATE zombies_stats_periods SET
                        kills = ?, downs = ?, revives = ?, headshots = ?, rounds_survived = ?,
                        highest_round = ?, highest_score = ?,
                        current_kills = ?, current_downs = ?, current_revives = ?,
                        current_headshots = ?, current_rounds_survived = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?`,
                    [
                        periodStats.kills, periodStats.downs, periodStats.revives, periodStats.headshots, periodStats.roundsSurvived,
                        periodStats.highestRound, periodStats.highestScore,
                        periodStats.currentKills, periodStats.currentDowns, periodStats.currentRevives,
                        periodStats.currentHeadshots, periodStats.currentRoundsSurvived,
                        periodStats.id
                    ]
                );
            }
            
            return true;
        } catch (error) {
            console.error('Error in StatsRepository.updatePeriodStats:', error);
            throw error;
        }
    }
    
    /**
     * Reset current period stats
     * @param {number} playerId - Player ID
     * @returns {Promise<boolean>} Success
     */
    async resetCurrentPeriodStats(playerId) {
        try {
            await this.db._run(
                `UPDATE zombies_stats_periods SET
                    current_kills = 0, current_downs = 0, current_revives = 0,
                    current_headshots = 0, current_rounds_survived = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE player_id = ?`,
                [playerId]
            );
            
            return true;
        } catch (error) {
            console.error('Error in StatsRepository.resetCurrentPeriodStats:', error);
            throw error;
        }
    }
    
    /**
     * Get leaderboard for a specific period
     * @param {string} periodType - Period type (weekly, monthly, yearly, all)
     * @param {string} periodKey - Period key (required for weekly/monthly/yearly)
     * @param {string} orderBy - Field to sort by
     * @param {number} limit - Maximum results
     * @param {number} offset - Results to skip
     * @returns {Promise<Object>} Leaderboard data
     */
    async getLeaderboard(periodType = 'all', periodKey = null, orderBy = 'kills', limit = 20, offset = 0) {
        try {
            let rows, total, query, countQuery, params, countParams;
            
            // Validate orderBy to prevent SQL injection
            const validFields = ['kills', 'downs', 'revives', 'headshots', 'rounds_survived', 'highest_round', 'highest_score'];
            if (!validFields.includes(orderBy)) {
                orderBy = 'kills';
            }
            
            if (periodType === 'all') {
                // Get from overall stats
                query = `
                    SELECT zs.*, p.guid, p.name 
                    FROM zombies_stats zs
                    JOIN players p ON zs.player_id = p.id
                    ORDER BY zs.${orderBy} DESC LIMIT ? OFFSET ?
                `;
                params = [limit, offset];
                
                countQuery = `SELECT COUNT(*) as total FROM zombies_stats`;
                countParams = [];
            } else {
                // Get from period stats
                if (!periodKey) {
                    periodKey = PeriodStats.getCurrentPeriodKey(periodType);
                }
                
                query = `
                    SELECT z.*, p.guid, p.name 
                    FROM zombies_stats_periods z
                    JOIN players p ON z.player_id = p.id
                    WHERE z.period_type = ? AND z.period_key = ?
                    ORDER BY z.${orderBy} DESC LIMIT ? OFFSET ?
                `;
                params = [periodType, periodKey, limit, offset];
                
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM zombies_stats_periods
                    WHERE period_type = ? AND period_key = ?
                `;
                countParams = [periodType, periodKey];
            }
            
            // Get data
            rows = await this.db.all(query, params);
            
            // Get total count
            const countResult = await this.db.get(countQuery, countParams);
            total = countResult?.total || 0;
            
            // Map data to models
            const items = rows.map(row => {
                const stats = periodType === 'all' 
                    ? Stats.fromDatabaseRow(row)
                    : PeriodStats.fromDatabaseRow(row);
                    
                return {
                    player: {
                        id: row.player_id,
                        guid: row.guid,
                        name: row.name
                    },
                    stats: stats
                };
            });
            
            // Return paged result
            return {
                total,
                limit,
                offset,
                items
            };
        } catch (error) {
            console.error('Error in StatsRepository.getLeaderboard:', error);
            throw error;
        }
    }
}

module.exports = StatsRepository;
