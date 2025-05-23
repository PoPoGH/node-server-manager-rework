/**
 * PlayerRankRepository - Data access for player ranks
 */
const PlayerRankModel = require('../models/PlayerRankModel');

class PlayerRankRepository {
    /**
     * Create a new PlayerRankRepository instance
     * @param {Object} db - Database connection
     */
    constructor(db) {
        this.db = db;
        this.tableName = 'plugin_player_ranks';
        
        // Initialize the database schema
        this._initSchema();
    }
    
    /**
     * Initialize the database schema
     * @private
     */
    async _initSchema() {
        try {
            // Create table if it doesn't exist
            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS ${this.tableName} (
                    player_id INTEGER PRIMARY KEY,
                    rank_id INTEGER DEFAULT 0,
                    kills INTEGER DEFAULT 0,
                    deaths INTEGER DEFAULT 0,
                    matches INTEGER DEFAULT 0,
                    last_updated TEXT,
                    rank_achieved TEXT
                )
            `;
            
            await this.db.run(createTableQuery);
            console.log(`[PlayerRankRepository] Initialized ${this.tableName} table`);
            
        } catch (error) {
            console.error(`[PlayerRankRepository] Error initializing schema: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get rank data for a player
     * @param {number} playerId - Player ID
     * @returns {Promise<PlayerRankModel|null>} Player's rank data or null
     */
    async getPlayerRank(playerId) {
        try {
            const query = `SELECT * FROM ${this.tableName} WHERE player_id = ?`;
            const row = await this.db.get(query, [playerId]);
            
            return PlayerRankModel.fromDatabase(row);
        } catch (error) {
            console.error(`[PlayerRankRepository] Error getting player rank: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get ranks for multiple players
     * @param {Array<number>} playerIds - Array of player IDs
     * @returns {Promise<Array<PlayerRankModel>>} Array of player rank models
     */
    async getPlayerRanks(playerIds) {
        try {
            if (!playerIds || playerIds.length === 0) {
                return [];
            }
            
            const placeholders = playerIds.map(() => '?').join(',');
            const query = `SELECT * FROM ${this.tableName} WHERE player_id IN (${placeholders})`;
            
            const rows = await this.db.all(query, playerIds);
            return rows.map(row => PlayerRankModel.fromDatabase(row));
        } catch (error) {
            console.error(`[PlayerRankRepository] Error getting multiple player ranks: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get all player ranks
     * @param {number} limit - Maximum results to return
     * @param {number} offset - Results to skip
     * @returns {Promise<Array<PlayerRankModel>>} Array of player rank models
     */
    async getAllPlayerRanks(limit = 1000, offset = 0) {
        try {
            const query = `SELECT * FROM ${this.tableName} ORDER BY kills DESC LIMIT ? OFFSET ?`;
            const rows = await this.db.all(query, [limit, offset]);
            
            return rows.map(row => PlayerRankModel.fromDatabase(row));
        } catch (error) {
            console.error(`[PlayerRankRepository] Error getting all player ranks: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Create or update a player's rank data
     * @param {PlayerRankModel} rankModel - Player rank model
     * @returns {Promise<PlayerRankModel>} Updated model
     */
    async savePlayerRank(rankModel) {
        try {
            if (!rankModel || !rankModel.playerId) {
                throw new Error('Invalid player rank model');
            }
            
            const exists = await this.playerExists(rankModel.playerId);
            
            if (exists) {
                // Update existing record
                const query = `
                    UPDATE ${this.tableName}
                    SET rank_id = ?, kills = ?, deaths = ?, matches = ?, last_updated = ?
                    WHERE player_id = ?
                `;
                
                await this.db.run(query, [
                    rankModel.rankId,
                    rankModel.kills,
                    rankModel.deaths,
                    rankModel.matches,
                    rankModel.lastUpdated.toISOString(),
                    rankModel.playerId
                ]);
            } else {
                // Insert new record
                const query = `
                    INSERT INTO ${this.tableName}
                    (player_id, rank_id, kills, deaths, matches, last_updated, rank_achieved)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                
                await this.db.run(query, [
                    rankModel.playerId,
                    rankModel.rankId,
                    rankModel.kills,
                    rankModel.deaths,
                    rankModel.matches,
                    rankModel.lastUpdated.toISOString(),
                    rankModel.rankAchieved.toISOString()
                ]);
            }
            
            // Return the updated model
            return rankModel;
        } catch (error) {
            console.error(`[PlayerRankRepository] Error saving player rank: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Update a player's rank ID
     * @param {number} playerId - Player ID
     * @param {number} rankId - New rank ID
     * @returns {Promise<boolean>} Success status
     */
    async updatePlayerRankId(playerId, rankId) {
        try {
            const query = `
                UPDATE ${this.tableName}
                SET rank_id = ?, rank_achieved = ?
                WHERE player_id = ?
            `;
            
            await this.db.run(query, [rankId, new Date().toISOString(), playerId]);
            return true;
        } catch (error) {
            console.error(`[PlayerRankRepository] Error updating player rank ID: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Increment a player's kills count
     * @param {number} playerId - Player ID
     * @param {number} amount - Amount to increment (default: 1)
     * @returns {Promise<PlayerRankModel>} Updated model
     */
    async incrementKills(playerId, amount = 1) {
        try {
            // First ensure the player exists in our table
            let model = await this.getPlayerRank(playerId);
            
            if (!model) {
                // Create new model if not exists
                model = new PlayerRankModel({
                    playerId: playerId,
                    kills: 0,
                    deaths: 0,
                    matches: 0,
                    lastUpdated: new Date(),
                    rankAchieved: new Date()
                });
            }
            
            // Update the model
            model.kills += amount;
            model.lastUpdated = new Date();
            
            // Save to database
            return await this.savePlayerRank(model);
        } catch (error) {
            console.error(`[PlayerRankRepository] Error incrementing kills: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Check if a player exists in the ranks table
     * @param {number} playerId - Player ID
     * @returns {Promise<boolean>} Whether player exists
     */
    async playerExists(playerId) {
        try {
            const query = `SELECT 1 FROM ${this.tableName} WHERE player_id = ?`;
            const result = await this.db.get(query, [playerId]);
            
            return !!result;
        } catch (error) {
            console.error(`[PlayerRankRepository] Error checking player existence: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Reset a player's rank data
     * @param {number} playerId - Player ID
     * @returns {Promise<boolean>} Success status
     */
    async resetPlayerRank(playerId) {
        try {
            const query = `DELETE FROM ${this.tableName} WHERE player_id = ?`;
            await this.db.run(query, [playerId]);
            return true;
        } catch (error) {
            console.error(`[PlayerRankRepository] Error resetting player rank: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Close the repository and release resources
     */
    async close() {
        // Nothing to do currently, but this method is required by the BasePlugin
    }
}

module.exports = PlayerRankRepository;
