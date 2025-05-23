/**
 * ZombieMatchController - Controls zombie match operations
 */
const ZombieMatchModel = require('../models/ZombieMatchModel');
const ZombiePlayerStatsModel = require('../models/ZombiePlayerStatsModel');

class ZombieMatchController {
    /**
     * Create a new ZombieMatchController instance
     * @param {Object} zombieStatsRepository - Repository for zombie stats
     * @param {Function} emitEvent - Function to emit events
     */
    constructor(zombieStatsRepository, emitEvent) {
        this.zombieStatsRepository = zombieStatsRepository;
        this.emitEvent = emitEvent;
    }
    
    /**
     * Create a new match
     * @param {Object} matchData - Match data
     * @returns {Promise<Object>} Created match
     */
    async createMatch(matchData) {
        try {
            // Create a new match model
            const matchModel = new ZombieMatchModel({
                serverId: matchData.serverId,
                mapName: matchData.mapName,
                round: 1, // Start at round 1
                startTime: matchData.startTime || new Date(),
                playerGuids: matchData.playerGuids || []
            });
            
            // Save to repository
            const savedMatch = await this.zombieStatsRepository.createMatch(matchModel);
            
            // Emit match created event
            await this.emitEvent('zombies.match.created', {
                matchId: savedMatch.id,
                serverId: savedMatch.serverId,
                mapName: savedMatch.mapName,
                playerCount: savedMatch.playerGuids.length,
                timestamp: new Date()
            }, true);
            
            return savedMatch;
        } catch (error) {
            console.error(`[ZombieMatchController] Error creating match: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get active match for a server
     * @param {string} serverId - Server ID
     * @returns {Promise<Object|null>} Active match or null
     */
    async getActiveMatch(serverId) {
        try {
            const matches = await this.zombieStatsRepository.getActiveMatches(serverId);
            return matches.length > 0 ? matches[0] : null;
        } catch (error) {
            console.error(`[ZombieMatchController] Error getting active match: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Finalize a match with stats
     * @param {Object} matchData - Match end data
     * @returns {Promise<Object>} Updated match
     */
    async finalizeMatch(matchData) {
        try {
            // Get active match for server
            const activeMatch = await this.getActiveMatch(matchData.serverId);
            
            if (!activeMatch) {
                throw new Error(`No active match found for server ${matchData.serverId}`);
            }
            
            // Update match with end data
            const updatedMatch = await this.zombieStatsRepository.updateMatch(activeMatch.id, {
                endTime: matchData.endTime || new Date(),
                round: matchData.round || activeMatch.round,
                maxRound: Math.max(matchData.round || 0, activeMatch.maxRound),
                stats: matchData.stats || {}
            });
            
            // Update player stats
            await this._updatePlayerStats(activeMatch.playerGuids, matchData);
            
            // Emit match ended event
            await this.emitEvent('zombies.match.ended', {
                matchId: updatedMatch.id,
                serverId: updatedMatch.serverId,
                mapName: updatedMatch.mapName,
                round: updatedMatch.round,
                duration: updatedMatch.getDuration(),
                playerCount: updatedMatch.playerGuids.length,
                timestamp: new Date()
            }, true);
            
            return updatedMatch;
        } catch (error) {
            console.error(`[ZombieMatchController] Error finalizing match: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Update player stats after a match
     * @param {Array<string>} playerGuids - Player GUIDs
     * @param {Object} matchData - Match data
     * @private
     */
    async _updatePlayerStats(playerGuids, matchData) {
        try {
            const round = matchData.round || 1;
            const playerStats = matchData.stats?.players || {};
            
            for (const guid of playerGuids) {
                // Get player stats from db
                let statsModel = await this.zombieStatsRepository.getPlayerStats(guid);
                
                if (!statsModel) {
                    // Create new player stats if not exists
                    const playerData = playerStats[guid] || {};
                    statsModel = new ZombiePlayerStatsModel({
                        guid,
                        name: playerData.name || 'Unknown Player',
                        firstSeen: new Date(),
                        lastSeen: new Date()
                    });
                }
                
                // Record match completion
                statsModel.recordMatchCompletion(round);
                
                // Update stats from match data if available
                const playerMatchStats = playerStats[guid];
                if (playerMatchStats) {
                    if (playerMatchStats.name) {
                        statsModel.name = playerMatchStats.name;
                    }
                    
                    // Update cumulative stats
                    statsModel.update({
                        kills: playerMatchStats.kills || 0,
                        deaths: playerMatchStats.deaths || 0,
                        downs: playerMatchStats.downs || 0,
                        revives: playerMatchStats.revives || 0,
                        headshotKills: playerMatchStats.headshots || 0,
                        score: playerMatchStats.score || 0,
                        perks: playerMatchStats.perks || 0,
                        powerUps: playerMatchStats.powerups || 0,
                        round
                    });
                }
                
                // Save updated stats
                await this.zombieStatsRepository.savePlayerStats(statsModel);
            }
        } catch (error) {
            console.error(`[ZombieMatchController] Error updating player stats: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get player stats by GUID
     * @param {string} playerGuid - Player GUID
     * @returns {Promise<Object|null>} Player stats or null
     */
    async getPlayerStats(playerGuid) {
        try {
            return await this.zombieStatsRepository.getPlayerStats(playerGuid);
        } catch (error) {
            console.error(`[ZombieMatchController] Error getting player stats: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get top players
     * @param {number} limit - Maximum results
     * @param {string} orderBy - Field to order by
     * @returns {Promise<Array<Object>>} Top players
     */
    async getTopPlayers(limit = 10, orderBy = 'kills') {
        try {
            return await this.zombieStatsRepository.getTopPlayers(limit, orderBy);
        } catch (error) {
            console.error(`[ZombieMatchController] Error getting top players: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get recent matches
     * @param {number} limit - Maximum results
     * @returns {Promise<Array<Object>>} Recent matches
     */
    async getRecentMatches(limit = 10) {
        try {
            return await this.zombieStatsRepository.getRecentMatches(limit);
        } catch (error) {
            console.error(`[ZombieMatchController] Error getting recent matches: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get API routes for this controller
     * @returns {Array<Object>} API routes
     */
    getRoutes() {
        return [
            // Match related routes
            {
                method: 'GET',
                path: '/matches/recent',
                handler: async (req, res) => {
                    try {
                        const limit = parseInt(req.query.limit) || 10;
                        const matches = await this.getRecentMatches(limit);
                        
                        res.json({
                            success: true,
                            data: matches.map(match => match.toJSON())
                        });
                    } catch (error) {
                        res.status(500).json({
                            success: false,
                            error: error.message
                        });
                    }
                }
            },
            {
                method: 'GET',
                path: '/matches/:id',
                handler: async (req, res) => {
                    try {
                        const matchId = req.params.id;
                        const match = await this.zombieStatsRepository.getMatch(matchId);
                        
                        if (!match) {
                            return res.status(404).json({
                                success: false,
                                error: 'Match not found'
                            });
                        }
                        
                        res.json({
                            success: true,
                            data: match.toJSON()
                        });
                    } catch (error) {
                        res.status(500).json({
                            success: false,
                            error: error.message
                        });
                    }
                }
            },
            
            // Player stats routes
            {
                method: 'GET',
                path: '/players/top',
                handler: async (req, res) => {
                    try {
                        const limit = parseInt(req.query.limit) || 10;
                        const orderBy = req.query.orderBy || 'kills';
                        const players = await this.getTopPlayers(limit, orderBy);
                        
                        res.json({
                            success: true,
                            data: players.map(player => player.toJSON())
                        });
                    } catch (error) {
                        res.status(500).json({
                            success: false,
                            error: error.message
                        });
                    }
                }
            },
            {
                method: 'GET',
                path: '/players/:guid',
                handler: async (req, res) => {
                    try {
                        const playerGuid = req.params.guid;
                        const stats = await this.getPlayerStats(playerGuid);
                        
                        if (!stats) {
                            return res.status(404).json({
                                success: false,
                                error: 'Player stats not found'
                            });
                        }
                        
                        res.json({
                            success: true,
                            data: stats.toJSON()
                        });
                    } catch (error) {
                        res.status(500).json({
                            success: false,
                            error: error.message
                        });
                    }
                }
            }
        ];
    }
}

module.exports = ZombieMatchController;