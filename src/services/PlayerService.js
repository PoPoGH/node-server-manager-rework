/**
 * Player Service - Business logic for player operations
 */
const Player = require('../models/Player');
const PlayerRepository = require('../repositories/PlayerRepository');

class PlayerService {
    /**
     * Create a new PlayerService
     * @param {Object} db - Database connection
     */
    constructor(db) {
        this.playerRepository = new PlayerRepository(db);
    }
    
    /**
     * Get player by ID
     * @param {number} id - Player ID
     * @returns {Promise<Player|null>} Player model or null
     */
    async getPlayerById(id) {
        try {
            const playerData = await this.playerRepository.getPlayerWithDetails(id);
            if (!playerData) return null;
            
            return new Player(playerData);
        } catch (error) {
            console.error('Error in PlayerService.getPlayerById:', error);
            throw error;
        }
    }
    
    /**
     * Get player by GUID
     * @param {string} guid - Player GUID
     * @returns {Promise<Player|null>} Player model or null
     */
    async getPlayerByGuid(guid) {
        try {
            const player = await this.playerRepository.getByGuid(guid);
            return player;
        } catch (error) {
            console.error('Error in PlayerService.getPlayerByGuid:', error);
            throw error;
        }
    }
    
    /**
     * Get all players with optional filtering and pagination
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Paginated list of players
     */
    async getPlayers(options = {}) {
        try {
            const {
                search = '',
                online = false,
                limit = 50,
                offset = 0
            } = options;
            
            let players = [];
            let total = 0;
            
            if (online) {
                // Get online players
                players = await this.playerRepository.getOnlinePlayers();
                
                // Apply search filter if needed
                if (search) {
                    players = players.filter(p => 
                        p.name?.toLowerCase().includes(search.toLowerCase()) || 
                        p.guid?.toLowerCase().includes(search.toLowerCase())
                    );
                }
                
                total = players.length;
                
                // Apply pagination
                players = players.slice(offset, offset + limit);
            } else {
                if (search) {
                    // Search all players
                    players = await this.playerRepository.searchByName(search, limit, offset);
                    // Get total count
                    const countResult = await this.playerRepository.db.get(
                        'SELECT COUNT(*) as count FROM players WHERE name LIKE ?',
                        [`%${search}%`]
                    );
                    total = countResult?.count || 0;
                } else {
                    // Get all players with pagination
                    players = await this.playerRepository.getAll(limit, offset);
                    // Get total count
                    total = await this.playerRepository.count();
                }
            }
            
            return {
                total,
                limit,
                offset,
                players: players.map(p => new Player(p))
            };
        } catch (error) {
            console.error('Error in PlayerService.getPlayers:', error);
            throw error;
        }
    }
    
    /**
     * Process player connection
     * @param {Player} player - Player model
     * @param {number} serverId - Server ID
     * @returns {Promise<Player>} Updated player model
     */
    async handlePlayerConnection(player, serverId) {
        try {
            // Create or update player
            const savedPlayer = await this.playerRepository.upsert(player);
            
            // Log connection
            await this.playerRepository.logConnection(savedPlayer, serverId);
            
            return savedPlayer;
        } catch (error) {
            console.error('Error in PlayerService.handlePlayerConnection:', error);
            throw error;
        }
    }
    
    /**
     * Process player disconnection
     * @param {number} playerId - Player ID
     * @param {number} serverId - Server ID
     * @returns {Promise<boolean>} Success
     */
    async handlePlayerDisconnection(playerId, serverId) {
        try {
            await this.playerRepository.logDisconnection(playerId, serverId);
            return true;
        } catch (error) {
            console.error('Error in PlayerService.handlePlayerDisconnection:', error);
            throw error;
        }
    }
    
    /**
     * Apply a penalty to a player
     * @param {Object} penalty - Penalty data
     * @returns {Promise<Object>} Penalty record
     */
    async applyPenalty(penalty) {
        try {
            return await this.playerRepository.addPenalty(penalty);
        } catch (error) {
            console.error('Error in PlayerService.applyPenalty:', error);
            throw error;
        }
    }
    
    /**
     * Get player metadata
     * @param {number} playerId - Player ID
     * @param {string} key - Metadata key
     * @returns {Promise<any>} Metadata value
     */
    async getPlayerMetadata(playerId, key) {
        try {
            return await this.playerRepository.getMetadata(playerId, key);
        } catch (error) {
            console.error('Error in PlayerService.getPlayerMetadata:', error);
            throw error;
        }
    }
    
    /**
     * Set player metadata
     * @param {number} playerId - Player ID
     * @param {string} key - Metadata key
     * @param {any} value - Metadata value
     * @returns {Promise<boolean>} Success
     */
    async setPlayerMetadata(playerId, key, value) {
        try {
            return await this.playerRepository.setMetadata(playerId, key, value);
        } catch (error) {
            console.error('Error in PlayerService.setPlayerMetadata:', error);
            throw error;
        }
    }
}

module.exports = PlayerService;
