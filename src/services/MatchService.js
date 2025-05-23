/**
 * Match Service - Manages match data and match-related operations
 */
const Match = require('../models/Match');
const MatchRepository = require('../repositories/MatchRepository');
const StatsService = require('./StatsService');

class MatchService {
    /**
     * Create a new MatchService
     * @param {Object} db - Database connection
     * @param {Object} logService - Logging service
     */
    constructor(db, logService) {
        this.db = db;
        this.logger = logService;
        this.playerService = null;
        this.matchRepository = new MatchRepository(db);
        this.statsService = new StatsService(db);
    }

    /**
     * Set the PlayerService reference for cross-service functionality
     * @param {Object} playerService - PlayerService instance
     */
    setPlayerService(playerService) {
        this.playerService = playerService;
        // Vérifier si this.logger existe avant d'appeler debug()
        if (this.logger && typeof this.logger.debug === 'function') {
            this.logger.debug('PlayerService reference set in MatchService');
        } else {
            console.log('PlayerService reference set in MatchService (logger unavailable)');
        }
    }

    /**
     * Get match by ID
     * @param {number} id - Match ID
     * @returns {Promise<Match|null>} Match model or null
     */
    async getMatchById(id) {
        try {
            return await this.matchRepository.getById(id);
        } catch (error) {
            console.error('Error in MatchService.getMatchById:', error);
            throw error;
        }
    }
    
    /**
     * Get recent matches
     * @param {number} limit - Maximum results
     * @param {number} offset - Results to skip
     * @returns {Promise<Object>} Paginated matches
     */
    async getRecentMatches(limit = 20, offset = 0) {
        try {
            const matches = await this.matchRepository.getRecentMatches(limit, offset);
            const total = await this.matchRepository.count();
            
            return {
                total,
                limit,
                offset,
                matches
            };
        } catch (error) {
            console.error('Error in MatchService.getRecentMatches:', error);
            throw error;
        }
    }
    
    /**
     * Get matches for a specific server
     * @param {number} serverId - Server ID
     * @param {number} limit - Maximum results
     * @param {number} offset - Results to skip
     * @returns {Promise<Object>} Paginated matches
     */
    async getServerMatches(serverId, limit = 20, offset = 0) {
        try {
            const matches = await this.matchRepository.getServerMatches(serverId, limit, offset);
            
            // Count total matches for this server
            const countResult = await this.matchRepository.db.get(
                `SELECT COUNT(*) as count FROM ${this.matchRepository.tableName} WHERE server_id = ?`,
                [serverId]
            );
            
            const total = countResult?.count || 0;
            
            return {
                total,
                limit,
                offset,
                matches
            };
        } catch (error) {
            console.error('Error in MatchService.getServerMatches:', error);
            throw error;
        }
    }
    
    /**
     * Get matches for a specific player
     * @param {string} playerGuid - Player GUID
     * @param {number} limit - Maximum results
     * @param {number} offset - Results to skip
     * @returns {Promise<Object>} Paginated matches
     */
    async getPlayerMatches(playerGuid, limit = 20, offset = 0) {
        try {
            const matches = await this.matchRepository.getPlayerMatches(playerGuid, limit, offset);
            
            // Count total matches for this player
            const countResult = await this.matchRepository.db.get(
                `SELECT COUNT(*) as count FROM ${this.matchRepository.tableName} WHERE players LIKE ?`,
                [`%${playerGuid}%`]
            );
            
            const total = countResult?.count || 0;
            
            return {
                total,
                limit,
                offset,
                matches
            };
        } catch (error) {
            console.error('Error in MatchService.getPlayerMatches:', error);
            throw error;
        }
    }
    
    /**
     * Create a new match
     * @param {Object} matchData - Match data 
     * @returns {Promise<Object>} Created match
     */
    async createMatch(matchData) {
        try {
            // Implementation details
            return { id: "match-id", ...matchData };
        } catch (error) {
            this.logger.error('Error creating match:', error);
            throw error;
        }
    }

    /**
     * Start a new match
     * @param {Object} matchData - Match data
     * @returns {Promise<Match>} Created match
     */
    async startMatch(matchData) {
        try {
            // Create match model
            const match = new Match({
                serverId: matchData.serverId,
                mapName: matchData.mapName,
                gamemode: matchData.gamemode || 'zombies',
                startTime: new Date(),
                players: matchData.players || []
            });
            
            // Save to database
            return await this.matchRepository.createMatch(match);
        } catch (error) {
            console.error('Error in MatchService.startMatch:', error);
            throw error;
        }
    }
    
    /**
     * End a match
     * @param {number} matchId - Match ID
     * @param {Object} finalStats - Final match statistics
     * @returns {Promise<Match>} Updated match
     */
    async endMatch(matchId, finalStats = {}) {
        try {
            // Get the match
            const match = await this.matchRepository.getById(matchId);
            if (!match) {
                throw new Error(`Match with ID ${matchId} not found`);
            }
            
            // End the match
            await this.matchRepository.endMatch(matchId, finalStats);
            
            // Reset stats for all players in the match
            await this.statsService.resetMatchStats(match.players);
            
            // Return updated match
            return await this.matchRepository.getById(matchId);
        } catch (error) {
            console.error('Error in MatchService.endMatch:', error);
            throw error;
        }
    }
    
    /**
     * Update match statistics
     * @param {number} matchId - Match ID
     * @param {Object} stats - Updated statistics
     * @returns {Promise<Match>} Updated match
     */
    async updateMatchStats(matchId, stats) {
        try {
            await this.matchRepository.updateMatchStats(matchId, stats);
            return await this.matchRepository.getById(matchId);
        } catch (error) {
            console.error('Error in MatchService.updateMatchStats:', error);
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
            return await this.matchRepository.addPlayerToMatch(matchId, playerGuid);
        } catch (error) {
            console.error('Error in MatchService.addPlayerToMatch:', error);
            throw error;
        }
    }
    
    /**
     * Get active match for a server
     * @param {number} serverId - Server ID
     * @returns {Promise<Match|null>} Active match or null
     */
    async getActiveMatch(serverId) {
        try {
            return await this.matchRepository.getActiveMatch(serverId);
        } catch (error) {
            console.error('Error in MatchService.getActiveMatch:', error);
            throw error;
        }
    }
    
    /**
     * Get or create active match for a server
     * @param {number} serverId - Server ID
     * @param {string} mapName - Map name
     * @returns {Promise<Match>} Active match
     */
    async getOrCreateActiveMatch(serverId, mapName) {
        try {
            // Check for active match
            let match = await this.matchRepository.getActiveMatch(serverId);
            
            // If no active match, create one
            if (!match) {
                match = await this.startMatch({
                    serverId,
                    mapName,
                    gamemode: 'zombies',
                    players: []
                });
            }
            
            return match;
        } catch (error) {
            console.error('Error in MatchService.getOrCreateActiveMatch:', error);
            throw error;
        }
    }
    
    /**
     * Process player stats update in a match
     * @param {string} playerGuid - Player GUID
     * @param {string} playerName - Player name
     * @param {number} serverId - Server ID
     * @param {string} mapName - Map name
     * @param {Object} statsData - Statistics data
     * @returns {Promise<Object>} Updated stats
     */
    async processPlayerStats(playerGuid, playerName, serverId, mapName, statsData) {
        try {
            // Get or create active match
            const match = await this.getOrCreateActiveMatch(serverId, mapName);
            
            // Add player to match if not already added
            await this.addPlayerToMatch(match.id, playerGuid);
            
            // Update player stats
            const updatedStats = await this.statsService.updatePlayerStats(
                playerGuid,
                playerName,
                statsData
            );
            
            // Update match stats
            const currentPlayerStats = {};
            currentPlayerStats[playerGuid] = statsData;
            
            await this.updateMatchStats(match.id, {
                currentRound: statsData.round || 0,
                playerStats: currentPlayerStats
            });
            
            return updatedStats;
        } catch (error) {
            console.error('Error in MatchService.processPlayerStats:', error);
            throw error;
        }
    }

    /**
     * Get a player's matches
     * @param {string} playerId - Player ID
     * @param {Object} options - Query options (limit, offset, etc.)
     * @returns {Promise<Array>} List of matches
     */
    async getPlayerMatches(playerId, options = {}) {
        try {
            const { limit = 20, offset = 0 } = options;
            
            const query = `
                SELECT m.* FROM matches m
                JOIN player_matches pm ON pm.match_id = m.id
                WHERE pm.player_id = ?
                ORDER BY m.start_time DESC
                LIMIT ? OFFSET ?
            `;
            
            return await this.db.all(query, [playerId, limit, offset]);
        } catch (error) {
            this.logger.error(`Error getting matches for player ${playerId}:`, error);
            throw error;
        }
    }

    /**
     * Get detailed matches for a player
     */
    async getDetailedPlayerMatches(playerId, options = {}) {
        try {
            const matches = await this.getPlayerMatches(playerId, options);
            
            // Enrich with additional data if needed
            const enrichedMatches = await Promise.all(matches.map(async match => {
                // Example: add player stats for this match
                const playerStats = await this.getPlayerMatchStats(playerId, match.id);
                return {
                    ...match,
                    playerStats
                };
            }));
            
            return enrichedMatches;
        } catch (error) {
            this.logger.error(`Error getting detailed matches for player ${playerId}:`, error);
            throw error;
        }
    }

    /**
     * Get player stats for a specific match
     */
    async getPlayerMatchStats(playerId, matchId) {
        try {
            const query = `
                SELECT * FROM player_matches
                WHERE player_id = ? AND match_id = ?
            `;
            
            return await this.db.get(query, [playerId, matchId]);
        } catch (error) {
            this.logger.error(`Error getting player stats for match:`, error);
            return null;
        }
    }
}

module.exports = MatchService;
