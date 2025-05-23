/**
 * RankController - Controls player rank operations
 */
class RankController {
    /**
     * Create a new RankController instance
     * @param {Object} playerRankRepository - Player rank repository
     * @param {Array<Object>} rankDefinitions - Rank definitions
     * @param {Function} emitEvent - Function to emit events
     */
    constructor(playerRankRepository, rankDefinitions, emitEvent) {
        this.playerRankRepository = playerRankRepository;
        this.rankDefinitions = rankDefinitions;
        this.emitEvent = emitEvent;
    }
    
    /**
     * Get a player's rank information
     * @param {number} playerId - Player ID
     * @returns {Promise<Object|null>} Player rank data with rank info
     */
    async getPlayerRank(playerId) {
        try {
            // Get player rank data from repository
            let rankModel = await this.playerRankRepository.getPlayerRank(playerId);
            
            // If no rank data exists, create a default entry
            if (!rankModel) {
                rankModel = await this.createDefaultRank(playerId);
            }
            
            // Determine the player's current rank based on stats
            const rankInfo = this._determinePlayerRank(rankModel);
            
            // Check if rank needs updating
            if (rankInfo.rankId !== rankModel.rankId) {
                await this.updatePlayerRank(playerId, rankInfo.rankId);
            }
            
            // Return the complete rank info
            return {
                ...rankModel.toJSON(),
                rank: rankInfo
            };
        } catch (error) {
            console.error(`[RankController] Error getting player rank: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Create a default rank entry for a player
     * @param {number} playerId - Player ID
     * @returns {Promise<Object>} Default rank model
     */
    async createDefaultRank(playerId) {
        // Create a new rank model with default values
        const defaultRank = this.rankDefinitions[0];
        const rankModel = new (require('../models/PlayerRankModel'))({
            playerId: playerId,
            rankId: 0, // Default rank
            kills: 0,
            deaths: 0,
            matches: 0,
            lastUpdated: new Date(),
            rankAchieved: new Date()
        });
        
        // Save to database
        return await this.playerRankRepository.savePlayerRank(rankModel);
    }
    
    /**
     * Update a player's rank ID
     * @param {number} playerId - Player ID
     * @param {number} rankId - New rank ID
     * @returns {Promise<boolean>} Success status
     */
    async updatePlayerRank(playerId, rankId) {
        try {
            // Update in repository
            await this.playerRankRepository.updatePlayerRankId(playerId, rankId);
            
            // Emit rank updated event
            await this.emitEvent('rankUpdated', {
                playerId,
                rankId,
                timestamp: new Date()
            }, true);
            
            return true;
        } catch (error) {
            console.error(`[RankController] Error updating player rank: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Increment a player's kill count and check for rank changes
     * @param {number} playerId - Player ID
     * @param {number} amount - Amount to increment (default: 1)
     * @returns {Promise<boolean>} Whether rank changed
     */
    async incrementKills(playerId, amount = 1) {
        try {
            // Get current player rank
            const currentRankInfo = await this.getPlayerRank(playerId);
            const currentRankId = currentRankInfo?.rank?.rankId || 0;
            
            // Increment kills
            const updatedModel = await this.playerRankRepository.incrementKills(playerId, amount);
            
            // Determine new rank
            const newRankInfo = this._determinePlayerRank(updatedModel);
            
            // Check if rank changed
            const rankChanged = newRankInfo.rankId !== currentRankId;
            
            // Update rank if changed
            if (rankChanged) {
                await this.updatePlayerRank(playerId, newRankInfo.rankId);
            }
            
            return rankChanged;
        } catch (error) {
            console.error(`[RankController] Error incrementing kills: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Update ranks for all players
     * @returns {Promise<number>} Number of players updated
     */
    async updateAllRanks() {
        try {
            // Get all player ranks
            const allRanks = await this.playerRankRepository.getAllPlayerRanks();
            let updatedCount = 0;
            
            // Update each player's rank if needed
            for (const rankModel of allRanks) {
                const currentRankId = rankModel.rankId;
                const rankInfo = this._determinePlayerRank(rankModel);
                
                if (rankInfo.rankId !== currentRankId) {
                    await this.updatePlayerRank(rankModel.playerId, rankInfo.rankId);
                    updatedCount++;
                }
            }
            
            return updatedCount;
        } catch (error) {
            console.error(`[RankController] Error updating all ranks: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get top players by rank
     * @param {number} limit - Maximum results
     * @returns {Promise<Array<Object>>} Top players with rank info
     */
    async getTopPlayers(limit = 10) {
        try {
            const allRanks = await this.playerRankRepository.getAllPlayerRanks(limit, 0);
            
            // Add rank info to each player
            return allRanks.map(model => {
                const rankInfo = this._determinePlayerRank(model);
                return {
                    ...model.toJSON(),
                    rank: rankInfo
                };
            });
        } catch (error) {
            console.error(`[RankController] Error getting top players: ${error.message}`);
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
            await this.playerRankRepository.resetPlayerRank(playerId);
            
            // Emit rank reset event
            await this.emitEvent('rankReset', {
                playerId,
                timestamp: new Date()
            }, true);
            
            return true;
        } catch (error) {
            console.error(`[RankController] Error resetting player rank: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Determine a player's rank based on their stats
     * @param {Object} rankModel - Player rank model
     * @returns {Object} Rank information
     * @private
     */
    _determinePlayerRank(rankModel) {
        // Get the highest rank player qualifies for
        const highestRank = rankModel.getHighestRank(this.rankDefinitions);
        
        // Find rank ID
        const rankId = this.rankDefinitions.findIndex(rank => 
            rank.name === highestRank.name);
            
        return {
            ...highestRank,
            rankId: rankId >= 0 ? rankId : 0
        };
    }
    
    /**
     * Get API routes for this controller
     * @returns {Array<Object>} API routes
     */
    getRoutes() {
        return [
            {
                method: 'GET',
                path: '/player/:id',
                handler: async (req, res) => {
                    try {
                        const playerId = parseInt(req.params.id);
                        const rankInfo = await this.getPlayerRank(playerId);
                        
                        if (rankInfo) {
                            res.json({
                                success: true,
                                data: rankInfo
                            });
                        } else {
                            res.status(404).json({
                                success: false,
                                error: 'Player rank not found'
                            });
                        }
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
                path: '/top',
                handler: async (req, res) => {
                    try {
                        const limit = parseInt(req.query.limit) || 10;
                        const topPlayers = await this.getTopPlayers(limit);
                        
                        res.json({
                            success: true,
                            data: topPlayers
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
                method: 'POST',
                path: '/reset/:id',
                handler: async (req, res) => {
                    try {
                        const playerId = parseInt(req.params.id);
                        await this.resetPlayerRank(playerId);
                        
                        res.json({
                            success: true,
                            message: `Rank reset for player ${playerId}`
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

module.exports = RankController;
