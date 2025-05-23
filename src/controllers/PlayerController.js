/**
 * Player Controller - Handles player-related API endpoints
 */
const PlayerService = require('../services/PlayerService');
const StatsService = require('../services/StatsService');

class PlayerController {
    /**
     * Create a new PlayerController
     * @param {Object} db - Database connection
     */
    constructor(db) {
        this.playerService = new PlayerService(db);
        this.statsService = new StatsService(db);
        this.db = db;
        this.serverManager = null;
        
        // Bind methods to ensure 'this' context
        this.getAllPlayers = this.getAllPlayers.bind(this);
        this.getPlayerById = this.getPlayerById.bind(this);
        this.getPlayerStats = this.getPlayerStats.bind(this);
        this.getOnlinePlayers = this.getOnlinePlayers.bind(this);
        this.searchPlayers = this.searchPlayers.bind(this);
        this.setServerManager = this.setServerManager.bind(this);
    }
    
    /**
     * Set the server manager instance
     * @param {Object} serverManager - Server manager instance
     */
    setServerManager(serverManager) {
        this.serverManager = serverManager;
    }
    
    /**
     * Get all players with pagination
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getAllPlayers(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const search = req.query.search || '';
            
            const result = await this.playerService.getPlayers({
                search,
                limit,
                offset
            });
            
            res.json({
                success: true,
                total: result.total,
                limit: result.limit,
                offset: result.offset,
                players: result.players.map(p => p.toJSON())
            });
        } catch (error) {
            console.error('Error in PlayerController.getAllPlayers:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving players: ' + error.message
            });
        }
    }
    
    /**
     * Get player by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getPlayerById(req, res) {
        try {
            const playerId = parseInt(req.params.id);
            const player = await this.playerService.getPlayerById(playerId);
            
            if (!player) {
                return res.status(404).json({
                    success: false,
                    error: 'Player not found'
                });
            }
            
            res.json({
                success: true,
                player: player.toJSON()
            });
        } catch (error) {
            console.error('Error in PlayerController.getPlayerById:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving player: ' + error.message
            });
        }
    }
    
    /**
     * Get player statistics
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getPlayerStats(req, res) {
        try {
            const playerId = parseInt(req.params.id);
            
            // Check if player exists
            const player = await this.playerService.getPlayerById(playerId);
            if (!player) {
                return res.status(404).json({
                    success: false,
                    error: 'Player not found'
                });
            }
            
            // Get player statistics with periods
            const stats = await this.statsService.getPlayerStats(playerId, true);
            
            // Group period stats by type
            const periodStats = {
                weekly: [],
                monthly: [],
                yearly: []
            };
            
            if (stats && stats.periods) {
                stats.periods.forEach(period => {
                    if (periodStats[period.periodType]) {
                        periodStats[period.periodType].push(period);
                    }
                });
                
                // Sort periods
                Object.keys(periodStats).forEach(key => {
                    periodStats[key].sort((a, b) => b.periodKey.localeCompare(a.periodKey));
                });
            }
            
            res.json({
                success: true,
                player: player.toJSON(),
                stats: stats ? stats.toJSON(false) : null,
                periods: periodStats
            });
        } catch (error) {
            console.error('Error in PlayerController.getPlayerStats:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving player statistics: ' + error.message
            });
        }
    }
      /**
     * Get online players
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getOnlinePlayers(req, res) {
        try {
            if (!this.serverManager) {
                return res.status(500).json({
                    success: false,
                    error: 'Server manager not initialized'
                });
            }
            
            const onlinePlayers = [];
            const servers = this.serverManager.getServers();
            
            // Ensure servers is an array
            if (!Array.isArray(servers)) {
                console.warn(`getServers() did not return an array but: ${typeof servers}`);
                return res.json({ success: true, players: [] });
            }
            
            for (const server of servers) {
                try {
                    if (!server || typeof server.getPlayers !== 'function') {
                        console.warn(`Invalid server object or missing getPlayers method`);
                        continue;
                    }
                    
                    const players = await server.getPlayers();
                    
                    if (Array.isArray(players)) {
                        for (const player of players) {
                            if (player) {
                                // Look up player in our database to get more info
                                let dbPlayer = null;
                                
                                try {
                                    if (player.guid) {
                                        dbPlayer = await this.playerService.getPlayerByGUID(player.guid);
                                    } else if (player.name) {
                                        dbPlayer = await this.playerService.getPlayerByName(player.name);
                                    }
                                } catch (dbError) {
                                    console.error(`Error looking up player in database: ${dbError.message}`);
                                }
                                
                                onlinePlayers.push({
                                    ...player,
                                    dbInfo: dbPlayer ? dbPlayer.toJSON() : null,
                                    server: {
                                        id: server.id,
                                        name: server.name
                                    }
                                });
                            }
                        }
                    } else {
                        console.warn(`Server ${server.name}: getPlayers() did not return an array but: ${typeof players}`);
                    }
                } catch (serverError) {
                    console.error(`Error processing server ${server?.name || 'unknown'}: ${serverError.message}`);
                }
            }
            
            res.json({
                success: true,
                count: onlinePlayers.length,
                players: onlinePlayers
            });
        } catch (error) {
            console.error('Error in PlayerController.getOnlinePlayers:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving online players: ' + error.message
            });
        }
    }
    
    /**
     * Search players by name
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async searchPlayers(req, res) {
        try {
            const search = req.query.q || '';
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;
            
            if (!search || search.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'Search query must be at least 2 characters'
                });
            }
            
            const result = await this.playerService.getPlayers({
                search,
                limit,
                offset
            });
            
            res.json({
                success: true,
                query: search,
                total: result.total,
                limit: result.limit,
                offset: result.offset,
                players: result.players.map(p => p.toJSON())
            });
        } catch (error) {
            console.error('Error in PlayerController.searchPlayers:', error);
            res.status(500).json({
                success: false,
                error: 'Error searching players: ' + error.message
            });
        }
    }
    
    // Define routes for Express router
    registerRoutes(router) {
        router.get('/players', this.getAllPlayers);
        router.get('/players/online', this.getOnlinePlayers);
        router.get('/players/search', this.searchPlayers);
        router.get('/players/:id', this.getPlayerById);
        router.get('/players/:id/stats', this.getPlayerStats);
        
        return router;
    }
}

module.exports = PlayerController;
