/**
 * ZombieStatsRepository - Data access for zombie mode statistics
 */
const ZombieMatchModel = require('../models/ZombieMatchModel');
const ZombiePlayerStatsModel = require('../models/ZombiePlayerStatsModel');

class ZombieStatsRepository {
    /**
     * Create a new ZombieStatsRepository instance
     * @param {Object} db - Database connection
     */
    constructor(db) {
        this.db = db;
        this.matchesTable = 'zombies_matches';
        this.statsTable = 'zombies_player_stats';
        
        // Initialize the database schema
        this._initSchema();
    }
    
    /**
     * Initialize the database schema
     * @private
     */
    async _initSchema() {
        try {
            // Create matches table if it doesn't exist
            const createMatchesTableQuery = `
                CREATE TABLE IF NOT EXISTS ${this.matchesTable} (
                    match_id TEXT PRIMARY KEY,
                    server_id TEXT NOT NULL,
                    map_name TEXT NOT NULL,
                    round INTEGER DEFAULT 0,
                    max_round INTEGER DEFAULT 0,
                    start_time TEXT NOT NULL,
                    end_time TEXT,
                    player_guids TEXT,
                    stats TEXT
                )
            `;
            
            // Create player stats table if it doesn't exist
            const createStatsTableQuery = `
                CREATE TABLE IF NOT EXISTS ${this.statsTable} (
                    player_guid TEXT PRIMARY KEY,
                    player_name TEXT NOT NULL,
                    kills INTEGER DEFAULT 0,
                    deaths INTEGER DEFAULT 0,
                    downs INTEGER DEFAULT 0,
                    revives INTEGER DEFAULT 0,
                    headshot_kills INTEGER DEFAULT 0,
                    score INTEGER DEFAULT 0,
                    matches_played INTEGER DEFAULT 0,
                    highest_round INTEGER DEFAULT 0,
                    total_rounds INTEGER DEFAULT 0,
                    perks INTEGER DEFAULT 0,
                    power_ups INTEGER DEFAULT 0,
                    first_seen TEXT NOT NULL,
                    last_seen TEXT NOT NULL
                )
            `;
            
            // Create indexes for faster queries
            const createIndexesQuery = `
                CREATE INDEX IF NOT EXISTS idx_zombies_player_matches_server 
                ON ${this.matchesTable} (server_id);
                
                CREATE INDEX IF NOT EXISTS idx_zombies_player_matches_map 
                ON ${this.matchesTable} (map_name);
                
                CREATE INDEX IF NOT EXISTS idx_zombies_player_stats_name 
                ON ${this.statsTable} (player_name);
            `;
            
            await this.db.run(createMatchesTableQuery);
            await this.db.run(createStatsTableQuery);
            await this.db.run(createIndexesQuery);
            
            console.log(`[ZombieStatsRepository] Initialized zombies stats tables`);
        } catch (error) {
            console.error(`[ZombieStatsRepository] Error initializing schema: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Create a new match record
     * @param {ZombieMatchModel} matchModel - Match data
     * @returns {Promise<ZombieMatchModel>} Created match
     */
    async createMatch(matchModel) {
        try {
            if (!matchModel.id) {
                matchModel.id = `zm_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            }
            
            const query = `
                INSERT INTO ${this.matchesTable}
                (match_id, server_id, map_name, round, start_time, player_guids)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const data = matchModel.toDatabase();
            
            await this.db.run(query, [
                data.match_id,
                data.server_id,
                data.map_name,
                data.round,
                data.start_time,
                data.player_guids
            ]);
            
            return matchModel;
        } catch (error) {
            console.error(`[ZombieStatsRepository] Error creating match: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get a match by ID
     * @param {string} matchId - Match ID
     * @returns {Promise<ZombieMatchModel|null>} Match or null
     */
    async getMatch(matchId) {
        try {
            const query = `SELECT * FROM ${this.matchesTable} WHERE match_id = ?`;
            const row = await this.db.get(query, [matchId]);
            
            return ZombieMatchModel.fromDatabase(row);
        } catch (error) {
            console.error(`[ZombieStatsRepository] Error getting match: ${error.message}`);
            throw error;
        }
    }
      /**
     * Get active matches for a server
     * @param {string} serverId - Server ID
     * @returns {Promise<ZombieMatchModel[]>} Active matches
     */
    async getActiveMatches(serverId) {
        try {
            const query = `
                SELECT * FROM ${this.matchesTable} 
                WHERE server_id = ? AND end_time IS NULL
                ORDER BY start_time DESC
            `;
            
            const rows = await this.db.all(query, [serverId]);
            return rows.map(row => ZombieMatchModel.fromDatabase(row));
        } catch (error) {
            console.error(`[ZombieStatsRepository] Error getting active matches: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Update a match with final stats
     * @param {string} matchId - Match ID
     * @param {Object} updateData - Match update data
     * @returns {Promise<ZombieMatchModel>} Updated match
     */
    async updateMatch(matchId, updateData) {
        try {
            const match = await this.getMatch(matchId);
            if (!match) {
                throw new Error(`Match not found: ${matchId}`);
            }
            
            // Update match object
            Object.assign(match, updateData);
            
            // Create update query based on fields present in updateData
            const updateFields = [];
            const params = [];
            
            if ('round' in updateData) {
                updateFields.push('round = ?');
                params.push(updateData.round);
            }
            
            if ('maxRound' in updateData) {
                updateFields.push('max_round = ?');
                params.push(updateData.maxRound);
            }
            
            if ('endTime' in updateData) {
                updateFields.push('end_time = ?');
                params.push(updateData.endTime instanceof Date ? 
                    updateData.endTime.toISOString() : updateData.endTime);
            }
            
            if ('stats' in updateData) {
                updateFields.push('stats = ?');
                params.push(typeof updateData.stats === 'object' ? 
                    JSON.stringify(updateData.stats) : updateData.stats);
            }
            
            if (updateFields.length === 0) {
                return match; // Nothing to update
            }
            
            // Add match ID to params
            params.push(matchId);
            
            // Run the update query
            const query = `
                UPDATE ${this.matchesTable}
                SET ${updateFields.join(', ')}
                WHERE match_id = ?
            `;
            
            await this.db.run(query, params);
            
            return match;
        } catch (error) {
            console.error(`[ZombieStatsRepository] Error updating match: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get player stats
     * @param {string} playerGuid - Player GUID
     * @returns {Promise<ZombiePlayerStatsModel|null>} Player stats
     */
    async getPlayerStats(playerGuid) {
        try {
            const query = `SELECT * FROM ${this.statsTable} WHERE player_guid = ?`;
            const row = await this.db.get(query, [playerGuid]);
            
            return ZombiePlayerStatsModel.fromDatabase(row);
        } catch (error) {
            console.error(`[ZombieStatsRepository] Error getting player stats: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Save player stats
     * @param {ZombiePlayerStatsModel} statsModel - Player stats model
     * @returns {Promise<ZombiePlayerStatsModel>} Updated stats
     */
    async savePlayerStats(statsModel) {
        try {
            const exists = await this.playerExists(statsModel.guid);
            const data = statsModel.toDatabase();
            
            if (exists) {
                // Update existing record
                const query = `
                    UPDATE ${this.statsTable}
                    SET player_name = ?, 
                        kills = ?, deaths = ?, downs = ?, revives = ?,
                        headshot_kills = ?, score = ?,
                        matches_played = ?, highest_round = ?, total_rounds = ?,
                        perks = ?, power_ups = ?,
                        last_seen = ?
                    WHERE player_guid = ?
                `;
                
                await this.db.run(query, [
                    data.player_name,
                    data.kills, data.deaths, data.downs, data.revives,
                    data.headshot_kills, data.score,
                    data.matches_played, data.highest_round, data.total_rounds,
                    data.perks, data.power_ups,
                    data.last_seen,
                    data.player_guid
                ]);
            } else {
                // Insert new record
                const query = `
                    INSERT INTO ${this.statsTable}
                    (player_guid, player_name, 
                     kills, deaths, downs, revives, headshot_kills, score,
                     matches_played, highest_round, total_rounds,
                     perks, power_ups,
                     first_seen, last_seen)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                await this.db.run(query, [
                    data.player_guid, data.player_name,
                    data.kills, data.deaths, data.downs, data.revives, 
                    data.headshot_kills, data.score,
                    data.matches_played, data.highest_round, data.total_rounds,
                    data.perks, data.power_ups,
                    data.first_seen, data.last_seen
                ]);
            }
            
            return statsModel;
        } catch (error) {
            console.error(`[ZombieStatsRepository] Error saving player stats: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Check if player exists in the stats table
     * @param {string} playerGuid - Player GUID
     * @returns {Promise<boolean>} Whether player exists
     */
    async playerExists(playerGuid) {
        try {
            const query = `SELECT 1 FROM ${this.statsTable} WHERE player_guid = ?`;
            const result = await this.db.get(query, [playerGuid]);
            
            return !!result;
        } catch (error) {
            console.error(`[ZombieStatsRepository] Error checking player existence: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get top players
     * @param {number} limit - Maximum results
     * @param {string} orderBy - Field to order by (kills, score)
     * @returns {Promise<ZombiePlayerStatsModel[]>} Top players
     */
    async getTopPlayers(limit = 10, orderBy = 'kills') {
        try {
            // Validate order by to prevent SQL injection
            const validOrderFields = ['kills', 'score', 'matches_played', 'highest_round'];
            const field = validOrderFields.includes(orderBy) ? orderBy : 'kills';
            
            const query = `
                SELECT * FROM ${this.statsTable}
                ORDER BY ${field} DESC
                LIMIT ?
            `;
            
            const rows = await this.db.all(query, [limit]);
            return rows.map(row => ZombiePlayerStatsModel.fromDatabase(row));
        } catch (error) {
            console.error(`[ZombieStatsRepository] Error getting top players: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get recent matches
     * @param {number} limit - Maximum results
     * @returns {Promise<ZombieMatchModel[]>} Recent matches
     */
    async getRecentMatches(limit = 10) {
        try {
            const query = `
                SELECT * FROM ${this.matchesTable}
                ORDER BY start_time DESC
                LIMIT ?
            `;
            
            const rows = await this.db.all(query, [limit]);
            return rows.map(row => ZombieMatchModel.fromDatabase(row));
        } catch (error) {
            console.error(`[ZombieStatsRepository] Error getting recent matches: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Close the repository
     */
    async close() {
        // Nothing to do for now, but required by BasePlugin
    }
}