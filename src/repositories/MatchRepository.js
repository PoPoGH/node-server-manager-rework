/**
 * Match Repository - Data access for match records
 */
const BaseRepository = require('./BaseRepository');
const Match = require('../models/Match');

class MatchRepository extends BaseRepository {
    /**
     * Create a new MatchRepository
     * @param {Object} db - Database connection
     */
    constructor(db) {
        super(db, 'zombies_match_history');
    }
    
    /**
     * Get match by ID
     * @param {number} id - Match ID
     * @returns {Promise<Match|null>} Match model or null
     */
    async getById(id) {
        try {
            const row = await this.db.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
            return Match.fromDatabaseRow(row);
        } catch (error) {
            console.error('Error in MatchRepository.getById:', error);
            throw error;
        }
    }
    
    /**
     * Get recent matches
     * @param {number} limit - Maximum results
     * @param {number} offset - Results to skip
     * @returns {Promise<Array<Match>>} Array of Match models
     */
    async getRecentMatches(limit = 20, offset = 0) {
        try {
            const rows = await this.db.all(
                `SELECT * FROM ${this.tableName} ORDER BY start_time DESC LIMIT ? OFFSET ?`,
                [limit, offset]
            );
            
            return rows.map(row => Match.fromDatabaseRow(row));
        } catch (error) {
            console.error('Error in MatchRepository.getRecentMatches:', error);
            throw error;
        }
    }
    
    /**
     * Get matches for a specific server
     * @param {number} serverId - Server ID
     * @param {number} limit - Maximum results
     * @param {number} offset - Results to skip
     * @returns {Promise<Array<Match>>} Array of Match models
     */
    async getServerMatches(serverId, limit = 20, offset = 0) {
        try {
            const rows = await this.db.all(
                `SELECT * FROM ${this.tableName} WHERE server_id = ? ORDER BY start_time DESC LIMIT ? OFFSET ?`,
                [serverId, limit, offset]
            );
            
            return rows.map(row => Match.fromDatabaseRow(row));
        } catch (error) {
            console.error('Error in MatchRepository.getServerMatches:', error);
            throw error;
        }
    }
    
    /**
     * Get matches for a specific player
     * @param {string} playerGuid - Player GUID
     * @param {number} limit - Maximum results
     * @param {number} offset - Results to skip
     * @returns {Promise<Array<Match>>} Array of Match models
     */
    async getPlayerMatches(playerGuid, limit = 20, offset = 0) {
        try {
            const rows = await this.db.all(
                `SELECT * FROM ${this.tableName} WHERE players LIKE ? ORDER BY start_time DESC LIMIT ? OFFSET ?`,
                [`%${playerGuid}%`, limit, offset]
            );
            
            return rows.map(row => Match.fromDatabaseRow(row));
        } catch (error) {
            console.error('Error in MatchRepository.getPlayerMatches:', error);
            throw error;
        }
    }
    
    /**
     * Get active (in-progress) match for a server
     * @param {number} serverId - Server ID
     * @returns {Promise<Match|null>} Match model or null
     */
    async getActiveMatch(serverId) {
        try {
            const row = await this.db.get(
                `SELECT * FROM ${this.tableName} WHERE server_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1`,
                [serverId]
            );
            
            return row ? Match.fromDatabaseRow(row) : null;
        } catch (error) {
            console.error('Error in MatchRepository.getActiveMatch:', error);
            throw error;
        }
    }
    
    /**
     * Start a new match
     * @param {Match} match - Match model
     * @returns {Promise<Match>} Match model with ID
     */
    async createMatch(match) {
        try {
            const data = match.toDatabase();
            const result = await this.insert(data);
            return { ...match, id: result.id };
        } catch (error) {
            console.error('Error in MatchRepository.createMatch:', error);
            throw error;
        }
    }
    
    /**
     * End a match
     * @param {number} matchId - Match ID
     * @param {Object} finalStats - Final match statistics
     * @returns {Promise<boolean>} Success
     */
    async endMatch(matchId, finalStats = {}) {
        try {
            const match = await this.getById(matchId);
            if (!match) return false;
            
            match.endMatch(finalStats);
            
            return await this.update(matchId, {
                end_time: match.endTime,
                duration_seconds: match.durationSeconds,
                stats: JSON.stringify(match.stats)
            });
        } catch (error) {
            console.error('Error in MatchRepository.endMatch:', error);
            throw error;
        }
    }
    
    /**
     * Update match stats
     * @param {number} matchId - Match ID
     * @param {Object} stats - Updated statistics
     * @returns {Promise<boolean>} Success
     */
    async updateMatchStats(matchId, stats) {
        try {
            const match = await this.getById(matchId);
            if (!match) return false;
            
            // Merge new stats with existing stats
            const updatedStats = {...match.stats, ...stats};
            
            return await this.update(matchId, {
                stats: JSON.stringify(updatedStats)
            });
        } catch (error) {
            console.error('Error in MatchRepository.updateMatchStats:', error);
            throw error;
        }
    }
    
    /**
     * Add player to match
     * @param {number} matchId - Match ID
     * @param {string} playerGuid - Player GUID
     * @returns {Promise<boolean>} Success
     */
    async addPlayerToMatch(matchId, playerGuid) {
        try {
            const match = await this.getById(matchId);
            if (!match) return false;
            
            // Check if player is already in the match
            if (match.players.includes(playerGuid)) {
                return true;
            }
            
            // Add player to the list
            const updatedPlayers = [...match.players, playerGuid];
            
            return await this.update(matchId, {
                players: JSON.stringify(updatedPlayers)
            });
        } catch (error) {
            console.error('Error in MatchRepository.addPlayerToMatch:', error);
            throw error;
        }
    }
}

module.exports = MatchRepository;
