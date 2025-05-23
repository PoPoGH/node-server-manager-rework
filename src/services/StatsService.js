/**
 * Stats Service - Manages player and game statistics
 */
const StatsRepository = require('../repositories/StatsRepository');
const PlayerRepository = require('../repositories/PlayerRepository');

class StatsService {
    /**
     * Create a new StatsService
     * @param {Object} db - Database connection
     * @param {Object} logService - Logging service
     */
    constructor(db, logService) {
        this.db = db;
        this.logger = logService || {
            debug: console.log,
            info: console.log,
            warn: console.warn,
            error: console.error
        };
        this.playerService = null;
        this.statsRepository = new StatsRepository(db);
        this.playerRepository = new PlayerRepository(db);
    }

    /**
     * Set the PlayerService reference for cross-service functionality
     * @param {Object} playerService - PlayerService instance
     */
    setPlayerService(playerService) {
        this.playerService = playerService;
        // Vérifier si this.logger existe avant d'appeler debug()
        if (this.logger && typeof this.logger.debug === 'function') {
            this.logger.debug('PlayerService reference set in StatsService');
        } else {
            console.log('PlayerService reference set in StatsService (logger unavailable)');
        }
    }

    /**
     * Get player statistics
     * @param {number} playerId - Player ID
     * @param {boolean} includePeriods - Include period stats
     * @returns {Promise<Object>} Player stats
     */
    async getPlayerStats(playerId, includePeriods = false) {
        try {
            if (includePeriods) {
                return await this.statsRepository.getPlayerStatsWithPeriods(playerId);
            } else {
                return await this.statsRepository.getPlayerStats(playerId);
            }
        } catch (error) {
            console.error('Error in StatsService.getPlayerStats:', error);
            throw error;
        }
    }

    /**
     * Update player statistics
     * @param {string} playerGuid - Player GUID
     * @param {string} playerName - Player name
     * @param {Object} statsData - Statistics data
     * @returns {Promise<Object>} Updated stats
     */
    async updatePlayerStats(playerGuid, playerName, statsData) {
        try {
            // Ensure player exists in database
            if (this.playerService) {
                await this.playerService.getOrCreatePlayer(playerGuid, playerName);
            }

            // Update or create stats
            return await this.statsRepository.updatePlayerStats(playerGuid, statsData);
        } catch (error) {
            this.logger.error('Error updating player stats:', error);
            throw error;
        }
    }

    /**
     * Reset current match statistics
     * @param {string} guid - Player GUID
     * @returns {Promise<boolean>} Success
     */
    async resetCurrentStats(guid) {
        try {
            const player = await this.playerRepository.getByGuid(guid);
            if (!player) return false;

            await this.statsRepository.resetCurrentStats(player.id);
            await this.statsRepository.resetCurrentPeriodStats(player.id);

            return true;
        } catch (error) {
            console.error('Error in StatsService.resetCurrentStats:', error);
            throw error;
        }
    }

    /**
     * Reset match stats for players
     * @param {Array<string>} playerGuids - Array of player GUIDs
     * @returns {Promise<boolean>} Success
     */
    async resetMatchStats(playerGuids) {
        try {
            if (!Array.isArray(playerGuids) || playerGuids.length === 0) {
                return true; // Nothing to do
            }

            // Reset match-specific stats for all players
            for (const guid of playerGuids) {
                await this.statsRepository.resetMatchStats(guid);
            }

            return true;
        } catch (error) {
            this.logger.error('Error resetting match stats:', error);
            throw error;
        }
    }

    /**
     * Get leaderboard for a specific period or overall
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Leaderboard data
     */
    async getLeaderboard(options = {}) {
        try {
            const {
                periodType = 'all',
                periodKey = null,
                orderBy = 'kills',
                limit = 20,
                offset = 0,
                search = ''
            } = options;

            // Get leaderboard data
            const leaderboard = await this.statsRepository.getLeaderboard(
                periodType,
                periodKey,
                orderBy,
                limit,
                offset
            );

            // Apply search filter if needed
            if (search) {
                leaderboard.items = leaderboard.items.filter(item =>
                    item.player.name.toLowerCase().includes(search.toLowerCase())
                );
                leaderboard.total = leaderboard.items.length;
            }

            return leaderboard;
        } catch (error) {
            console.error('Error in StatsService.getLeaderboard:', error);
            throw error;
        }
    }

    /**
     * Get summary statistics for a period
     * @param {string} periodType - Period type (weekly, monthly, yearly)
     * @param {string} periodKey - Period key
     * @returns {Promise<Object>} Period summary
     */
    async getPeriodSummary(periodType = 'weekly', periodKey = null) {
        try {
            // If no period key provided, get current
            if (!periodKey) {
                const { PeriodStats } = require('../models/Stats');
                periodKey = PeriodStats.getCurrentPeriodKey(periodType);
            }

            // Get summary statistics
            const uniquePlayersResult = await this.statsRepository.db.get(
                'SELECT COUNT(DISTINCT player_id) as count FROM zombies_stats_periods WHERE period_type = ? AND period_key = ?',
                [periodType, periodKey]
            );

            const totalKillsResult = await this.statsRepository.db.get(
                'SELECT SUM(kills) as total FROM zombies_stats_periods WHERE period_type = ? AND period_key = ?',
                [periodType, periodKey]
            );

            const highestRoundResult = await this.statsRepository.db.get(
                `SELECT z.highest_round, p.name 
                 FROM zombies_stats_periods z
                 JOIN players p ON z.player_id = p.id
                 WHERE z.period_type = ? AND z.period_key = ?
                 ORDER BY z.highest_round DESC LIMIT 1`,
                [periodType, periodKey]
            );

            const highestScoreResult = await this.statsRepository.db.get(
                `SELECT z.highest_score, p.name 
                 FROM zombies_stats_periods z
                 JOIN players p ON z.player_id = p.id
                 WHERE z.period_type = ? AND z.period_key = ?
                 ORDER BY z.highest_score DESC LIMIT 1`,
                [periodType, periodKey]
            );

            return {
                periodType,
                periodKey,
                uniquePlayers: uniquePlayersResult?.count || 0,
                totalKills: totalKillsResult?.total || 0,
                highestRound: {
                    round: highestRoundResult?.highest_round || 0,
                    player: highestRoundResult?.name || null
                },
                highestScore: {
                    score: highestScoreResult?.highest_score || 0,
                    player: highestScoreResult?.name || null
                }
            };
        } catch (error) {
            console.error('Error in StatsService.getPeriodSummary:', error);
            throw error;
        }
    }

    /**
     * Initialize zombies stats tables
     * @returns {Promise<void>}
     */
    async initializeZombiesStatsTables() {
        try {
            // Check if zombies_stats table exists
            const tableExists = await this.statsRepository.db.get(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='zombies_stats'"
            );

            if (!tableExists || !tableExists.name) {
                await this._createZombiesStatsTables();
            } else {
                // Ensure required columns exist
                await this._migrateZombiesStatsTables();
            }

            console.info('Zombies stats tables initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize zombies stats tables:', error);
            throw error;
        }
    }

    /**
     * Create zombies stats tables
     * @returns {Promise<void>}
     * @private
     */
    async _createZombiesStatsTables() {
        try {
            // Create zombies_stats table for tracking player statistics
            await this.statsRepository.db._run(`
                CREATE TABLE IF NOT EXISTS zombies_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    player_id INTEGER NOT NULL,
                    kills INTEGER DEFAULT 0,
                    downs INTEGER DEFAULT 0,
                    revives INTEGER DEFAULT 0,
                    headshots INTEGER DEFAULT 0,
                    rounds_survived INTEGER DEFAULT 0,
                    highest_round INTEGER DEFAULT 0,
                    highest_score INTEGER DEFAULT 0,
                    highest_kills INTEGER DEFAULT 0,
                    highest_headshots INTEGER DEFAULT 0,
                    highest_revives INTEGER DEFAULT 0,
                    highest_downs INTEGER DEFAULT 0,
                    last_game_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    current_kills INTEGER DEFAULT 0,
                    current_downs INTEGER DEFAULT 0,
                    current_revives INTEGER DEFAULT 0,
                    current_headshots INTEGER DEFAULT 0,
                    current_rounds_survived INTEGER DEFAULT 0,
                    CONSTRAINT unique_player UNIQUE (player_id),
                    FOREIGN KEY (player_id) REFERENCES players(id)
                )
            `);

            // Create table for period-based statistics (weekly, monthly, yearly)
            await this.statsRepository.db._run(`
                CREATE TABLE IF NOT EXISTS zombies_stats_periods (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    player_id INTEGER NOT NULL,
                    period_type TEXT NOT NULL,  -- 'weekly', 'monthly', 'yearly'
                    period_key TEXT NOT NULL,   -- Format: '2025-W20' (week), '2025-05' (month), '2025' (year)
                    kills INTEGER DEFAULT 0,
                    downs INTEGER DEFAULT 0,
                    revives INTEGER DEFAULT 0,
                    headshots INTEGER DEFAULT 0,
                    rounds_survived INTEGER DEFAULT 0,
                    highest_round INTEGER DEFAULT 0,
                    highest_score INTEGER DEFAULT 0,
                    current_kills INTEGER DEFAULT 0,
                    current_downs INTEGER DEFAULT 0,
                    current_revives INTEGER DEFAULT 0,
                    current_headshots INTEGER DEFAULT 0,
                    current_rounds_survived INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT unique_player_period UNIQUE (player_id, period_type, period_key)
                )
            `);

            // Create zombies_match_history table for tracking match details
            await this.statsRepository.db._run(`
                CREATE TABLE IF NOT EXISTS zombies_match_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    server_id TEXT NOT NULL,
                    map_name TEXT NOT NULL,
                    start_time TIMESTAMP NOT NULL,
                    end_time TIMESTAMP,
                    duration_seconds INTEGER,
                    players TEXT NOT NULL, -- JSON array of player GUIDs
                    stats TEXT NOT NULL,  -- JSON object of match stats
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            console.info('Zombies stats tables created successfully');
        } catch (error) {
            console.error('Failed to create zombies stats tables:', error);
            throw error;
        }
    }

    /**
     * Migrate zombies stats tables structure
     * @returns {Promise<void>}
     * @private
     */
    async _migrateZombiesStatsTables() {
        try {
            const db = this.statsRepository.db;

            // Add rounds_survived if missing
            await db.get('SELECT rounds_survived FROM zombies_stats LIMIT 1').catch(async error => {
                if (error.message.includes('no such column')) {
                    await db.run('ALTER TABLE zombies_stats ADD COLUMN rounds_survived INTEGER DEFAULT 0');
                    console.info('Added rounds_survived column to zombies_stats');
                }
            });

            // Add current_rounds_survived if missing
            await db.get('SELECT current_rounds_survived FROM zombies_stats LIMIT 1').catch(async error => {
                if (error.message.includes('no such column')) {
                    await db.run('ALTER TABLE zombies_stats ADD COLUMN current_rounds_survived INTEGER DEFAULT 0');
                    console.info('Added current_rounds_survived column to zombies_stats');
                }
            });

            // Add current_rounds_survived to zombies_stats_periods if missing
            await db.get('SELECT current_rounds_survived FROM zombies_stats_periods LIMIT 1').catch(async error => {
                if (error.message.includes('no such column')) {
                    await db.run('ALTER TABLE zombies_stats_periods ADD COLUMN current_rounds_survived INTEGER DEFAULT 0');
                    console.info('Added current_rounds_survived column to zombies_stats_periods');
                }
            });

            // Add other current_* columns if missing
            const columns = ['current_kills', 'current_downs', 'current_revives', 'current_headshots'];
            for (const column of columns) {
                await db.get(`SELECT ${column} FROM zombies_stats LIMIT 1`).catch(async error => {
                    if (error.message.includes('no such column')) {
                        await db.run(`ALTER TABLE zombies_stats ADD COLUMN ${column} INTEGER DEFAULT 0`);
                        console.info(`Added ${column} column to zombies_stats`);
                    }
                });
                await db.get(`SELECT ${column} FROM zombies_stats_periods LIMIT 1`).catch(async error => {
                    if (error.message.includes('no such column')) {
                        await db.run(`ALTER TABLE zombies_stats_periods ADD COLUMN ${column} INTEGER DEFAULT 0`);
                        console.info(`Added ${column} column to zombies_stats_periods`);
                    }
                });
            }

            // Check for zombies_match_history table and create if missing
            const matchTableExists = await db.get(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='zombies_match_history'"
            );
            if (!matchTableExists || !matchTableExists.name) {
                await this._createZombiesStatsTables();
                console.info('Created zombies_match_history table during migration');
            }
        } catch (error) {
            console.error('Failed to migrate zombies stats tables:', error);
            throw error;
        }
    }

    /**
     * Create a new zombies match
     * @param {Object} matchData - Match data object
     * @returns {Promise<Object>} Created match
     */
    async createZombiesMatch(matchData) {
        try {
            const { serverId, mapName, playerGuids, startTime } = matchData;

            const result = await this.statsRepository.db._run(
                `INSERT INTO zombies_match_history 
                 (server_id, map_name, start_time, players, stats, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [
                    serverId,
                    mapName,
                    startTime.toISOString(),
                    JSON.stringify(playerGuids),
                    JSON.stringify({}) // Initial empty stats
                ]
            );

            return {
                id: result.lastID,
                serverId,
                mapName,
                startTime,
                players: playerGuids,
                stats: {}
            };
        } catch (error) {
            console.error('Failed to create zombies match:', error);
            throw error;
        }
    }

    /**
     * Update zombies match with end time and stats
     * @param {string} serverId - Server ID
     * @param {Object} matchData - Match data with stats
     * @returns {Promise<Object>} Updated match
     */
    async updateZombiesMatch(serverId, matchData) {
        try {
            const { stats } = matchData;
            const endTime = new Date();

            // Get the latest match for this server
            const latestMatch = await this.statsRepository.db.get(
                `SELECT * FROM zombies_match_history 
                 WHERE server_id = ? AND end_time IS NULL
                 ORDER BY start_time DESC LIMIT 1`,
                [serverId]
            );

            if (!latestMatch) {
                throw new Error(`No active match found for server ${serverId}`);
            }

            // Calculate duration
            const startTime = new Date(latestMatch.start_time);
            const durationSeconds = Math.floor((endTime - startTime) / 1000);

            // Update match record
            await this.statsRepository.db.run(
                `UPDATE zombies_match_history
                 SET end_time = ?, duration_seconds = ?, stats = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [
                    endTime.toISOString(),
                    durationSeconds,
                    JSON.stringify(stats),
                    latestMatch.id
                ]
            );

            return {
                id: latestMatch.id,
                serverId,
                mapName: latestMatch.map_name,
                startTime,
                endTime,
                durationSeconds,
                players: JSON.parse(latestMatch.players),
                stats
            };
        } catch (error) {
            console.error('Failed to update zombies match:', error);
            throw error;
        }
    }

    /**
     * Get player's zombies stats
     * @param {number|string} playerIdOrGuid - Player ID or GUID
     * @returns {Promise<Object>} Player zombies stats
     */
    async getZombiesStats(playerIdOrGuid) {
        try {
            let playerId = playerIdOrGuid;

            // If GUID provided, get player ID
            if (typeof playerIdOrGuid === 'string' && !(/^\d+$/.test(playerIdOrGuid))) {
                const player = await this.playerRepository.getByGuid(playerIdOrGuid);
                if (!player) {
                    throw new Error(`Player not found with GUID: ${playerIdOrGuid}`);
                }
                playerId = player.id;
            }

            // Get player stats
            const stats = await this.statsRepository.db.get(
                `SELECT * FROM zombies_stats WHERE player_id = ?`,
                [playerId]
            );

            if (!stats) {
                return {
                    playerId,
                    kills: 0,
                    downs: 0,
                    revives: 0,
                    headshots: 0,
                    rounds_survived: 0,
                    highest_round: 0,
                    highest_score: 0,
                    current_game: {
                        kills: 0,
                        downs: 0,
                        revives: 0,
                        headshots: 0,
                        rounds_survived: 0
                    }
                };
            }

            return {
                ...stats,
                current_game: {
                    kills: stats.current_kills || 0,
                    downs: stats.current_downs || 0,
                    revives: stats.current_revives || 0,
                    headshots: stats.current_headshots || 0,
                    rounds_survived: stats.current_rounds_survived || 0
                }
            };
        } catch (error) {
            console.error('Failed to get zombies stats:', error);
            throw error;
        }
    }

    /**
     * Update player zombies stats
     * @param {string} playerGuid - Player GUID
     * @param {Object} statsUpdate - Stats to update
     * @returns {Promise<Object>} Updated stats
     */
    async updateZombiesStats(playerGuid, statsUpdate) {
        try {
            // Get player ID
            const player = await this.playerRepository.getByGuid(playerGuid);
            if (!player) {
                throw new Error(`Player not found with GUID: ${playerGuid}`);
            }

            // Get current stats
            let stats = await this.statsRepository.db.get(
                `SELECT * FROM zombies_stats WHERE player_id = ?`,
                [player.id]
            );

            // If no stats record exists, create one
            if (!stats) {
                await this.statsRepository.db._run(
                    `INSERT INTO zombies_stats (player_id) VALUES (?)`,
                    [player.id]
                );

                stats = {
                    player_id: player.id,
                    kills: 0,
                    downs: 0,
                    revives: 0,
                    headshots: 0,
                    rounds_survived: 0,
                    highest_round: 0,
                    highest_score: 0,
                    highest_kills: 0,
                    highest_headshots: 0,
                    highest_revives: 0,
                    highest_downs: 0,
                    current_kills: 0,
                    current_downs: 0,
                    current_revives: 0,
                    current_headshots: 0,
                    current_rounds_survived: 0
                };
            }

            // Update stats
            const updates = [];
            const values = [];

            for (const [key, value] of Object.entries(statsUpdate)) {
                if (key in stats) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (updates.length > 0) {
                updates.push(`updated_at = CURRENT_TIMESTAMP`);
                values.push(player.id);

                await this.statsRepository.db.run(
                    `UPDATE zombies_stats SET ${updates.join(', ')} WHERE player_id = ?`,
                    values
                );

                // Get updated stats
                const updatedStats = await this.statsRepository.db.get(
                    `SELECT * FROM zombies_stats WHERE player_id = ?`,
                    [player.id]
                );

                return {
                    ...updatedStats,
                    current_game: {
                        kills: updatedStats.current_kills || 0,
                        downs: updatedStats.current_downs || 0,
                        revives: updatedStats.current_revives || 0,
                        headshots: updatedStats.current_headshots || 0,
                        rounds_survived: updatedStats.current_rounds_survived || 0
                    }
                };
            }

            return {
                ...stats,
                current_game: {
                    kills: stats.current_kills || 0,
                    downs: stats.current_downs || 0,
                    revives: stats.current_revives || 0,
                    headshots: stats.current_headshots || 0,
                    rounds_survived: stats.current_rounds_survived || 0
                }
            };
        } catch (error) {
            console.error('Failed to update zombies stats:', error);
            throw error;
        }
    }
}

module.exports = StatsService;
