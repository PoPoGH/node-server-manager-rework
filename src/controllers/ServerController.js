/**
 * Server Controller - Handles server-related API endpoints
 */
const ServerService = require('../services/ServerService');
const ServerInstanceService = require('../services/ServerInstanceService');

class ServerController {
    /**
     * Create a new ServerController
     * @param {Object} db - Database connection
     * @param {Object} serverManager - Server manager instance
     * @param {Object} services - Service container with references to other services
     */
    constructor(db, serverManager, services = {}) {
        this.serverService = services.serverService || new ServerService(db, serverManager);
        this.logService = services.logService;
        
        // Bind methods to ensure 'this' context
        this.getAllServers = this.getAllServers.bind(this);
        this.getServerById = this.getServerById.bind(this);
        this.getServerStatus = this.getServerStatus.bind(this);
        this.getServerPlayers = this.getServerPlayers.bind(this);
        this.getServerStats = this.getServerStats.bind(this);
        this.getServerLogs = this.getServerLogs.bind(this);
        this.startServer = this.startServer.bind(this);
        this.stopServer = this.stopServer.bind(this);
        this.restartServer = this.restartServer.bind(this);
    }
      /**
     * Get all servers
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getAllServers(req, res) {
        try {
            // Get all servers from the database
            const dbServers = await this.serverService.getAllServers();
            const serversInfo = [];
            
            // Get additional runtime info from server manager
            if (this.serverService.serverManager) {
                const liveServers = this.serverService.serverManager.getServers();
                
                // Process each database server
                for (const dbServer of dbServers) {
                    try {
                        // Find matching live server
                        const liveServer = liveServers.find(s => s.id === dbServer.id);
                        
                        if (liveServer) {
                            // Server is managed by server manager
                            const status = liveServer.isRunning() ? await liveServer.getStatus() : null;
                            const playerCount = liveServer.isRunning() ? await liveServer.getPlayerCount() : 0;
                            
                            // Update db server with runtime info
                            dbServer._isRunning = liveServer.isRunning();
                            dbServer.updateStatus(status);
                            dbServer.updatePlayerCount(playerCount);
                        } else {
                            // Server exists in DB but not managed by server manager
                            dbServer._isRunning = false;
                        }
                        
                        serversInfo.push(dbServer.toJSON());
                    } catch (error) {
                        this.logService.error(`Error getting server status for ${dbServer.name}:`, error);
                        serversInfo.push({
                            ...dbServer.toJSON(),
                            status: 'error',
                            online: false,
                            error: error.message
                        });
                    }
                }
                
                // Add any live servers that don't exist in the database
                for (const liveServer of liveServers) {
                    if (!dbServers.some(s => s.id === liveServer.id)) {
                        try {
                            const status = liveServer.isRunning() ? await liveServer.getStatus() : null;
                            serversInfo.push({
                                id: liveServer.id,
                                name: liveServer.name,
                                game: liveServer.game,
                                address: liveServer.address,
                                port: liveServer.port,
                                status: status,
                                online: liveServer.isRunning(),
                                players: liveServer.isRunning() ? await liveServer.getPlayerCount() : 0,
                                maxPlayers: liveServer.maxPlayers || 0,
                                inDatabaseOnly: false
                            });
                        } catch (error) {
                            this.logService.error(`Error getting server status for ${liveServer.name}:`, error);
                            serversInfo.push({
                                id: liveServer.id,
                                name: liveServer.name,
                                game: liveServer.game,
                                address: liveServer.address,
                                port: liveServer.port,
                                status: 'error',
                                online: false,
                                error: error.message,
                                inDatabaseOnly: false
                            });
                        }
                    }
                }
            } else {
                // No server manager, just return database servers
                serversInfo.push(...dbServers.map(s => s.toJSON()));
            }
            
            res.json({
                success: true,
                servers: serversInfo
            });
        } catch (error) {
            this.logService.error('Error in ServerController.getAllServers:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving servers: ' + error.message
            });
        }
    }
    
    /**
     * Get server by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getServerById(req, res) {
        try {
            if (!this.serverManager) {
                return res.status(500).json({
                    success: false,
                    error: 'Server manager not initialized'
                });
            }
            
            const serverId = parseInt(req.params.id) || req.params.id;
            const server = this.serverManager.getServerById(serverId);
            
            if (!server) {
                return res.status(404).json({
                    success: false,
                    error: 'Server not found'
                });
            }
            
            try {
                const status = await server.getStatus();
                const playerCount = server.isRunning() ? await server.getPlayerCount() : 0;
                
                res.json({
                    success: true,
                    server: {
                        id: server.id,
                        name: server.name,
                        game: server.game,
                        address: server.address,
                        port: server.port,
                        rconPort: server.rconPort,
                        status: status,
                        online: server.isRunning(),
                        players: playerCount,
                        maxPlayers: server.maxPlayers || 0,
                        map: status?.map || null,
                        gameType: status?.gametype || null,
                        config: server.config || {}
                    }
                });
            } catch (error) {
                this.logService.error(`Error getting server status for ${server.name}:`, error);
                res.json({
                    success: true,
                    server: {
                        id: server.id,
                        name: server.name,
                        game: server.game,
                        address: server.address,
                        port: server.port,
                        rconPort: server.rconPort,
                        status: 'error',
                        online: false,
                        error: error.message,
                        config: server.config || {}
                    }
                });
            }
        } catch (error) {
            this.logService.error('Error in ServerController.getServerById:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving server: ' + error.message
            });
        }
    }
    
    /**
     * Get server status
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getServerStatus(req, res) {
        try {
            if (!this.serverManager) {
                return res.status(500).json({
                    success: false,
                    error: 'Server manager not initialized'
                });
            }
            
            const serverId = parseInt(req.params.id) || req.params.id;
            const server = this.serverManager.getServerById(serverId);
            
            if (!server) {
                return res.status(404).json({
                    success: false,
                    error: 'Server not found'
                });
            }
            
            try {
                const status = await server.getStatus();
                
                res.json({
                    success: true,
                    server: {
                        id: server.id,
                        name: server.name,
                    },
                    status: status,
                    online: server.isRunning()
                });
            } catch (error) {
                this.logService.error(`Error getting server status for ${server.name}:`, error);
                res.json({
                    success: true,
                    server: {
                        id: server.id,
                        name: server.name
                    },
                    status: 'error',
                    online: false,
                    error: error.message
                });
            }
        } catch (error) {
            this.logService.error('Error in ServerController.getServerStatus:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving server status: ' + error.message
            });
        }
    }
    
    /**
     * Get players on a server
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getServerPlayers(req, res) {
        try {
            if (!this.serverManager) {
                return res.status(500).json({
                    success: false,
                    error: 'Server manager not initialized'
                });
            }
            
            const serverId = parseInt(req.params.id) || req.params.id;
            const server = this.serverManager.getServerById(serverId);
            
            if (!server) {
                return res.status(404).json({
                    success: false,
                    error: 'Server not found'
                });
            }
            
            if (!server.isRunning()) {
                return res.json({
                    success: true,
                    server: {
                        id: server.id,
                        name: server.name
                    },
                    players: [],
                    online: false
                });
            }
            
            try {
                const players = await server.getPlayers();
                
                res.json({
                    success: true,
                    server: {
                        id: server.id,
                        name: server.name
                    },
                    players: players,
                    count: players.length
                });
            } catch (error) {
                this.logService.error(`Error getting players for ${server.name}:`, error);
                res.status(500).json({
                    success: false,
                    error: 'Error retrieving server players: ' + error.message
                });
            }
        } catch (error) {
            this.logService.error('Error in ServerController.getServerPlayers:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving server players: ' + error.message
            });
        }
    }
    
    /**
     * Get server statistics
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getServerStats(req, res) {
        try {
            if (!this.serverManager) {
                return res.status(500).json({
                    success: false,
                    error: 'Server manager not initialized'
                });
            }
            
            const serverId = parseInt(req.params.id) || req.params.id;
            const server = this.serverManager.getServerById(serverId);
            
            if (!server) {
                return res.status(404).json({
                    success: false,
                    error: 'Server not found'
                });
            }
            
            // Get server statistics from the database
            const stats = await this.db.all(`
                SELECT 
                    COUNT(*) as total_matches,
                    SUM(duration_seconds) as total_duration,
                    COUNT(DISTINCT player_id) as unique_players
                FROM zombies_match_history
                WHERE server_id = ?
            `, [server.id]);
            
            // Get player count history
            const playerCountHistory = await this.db.all(`
                SELECT 
                    datetime(timestamp, 'unixepoch') as timestamp,
                    player_count
                FROM server_player_count_history
                WHERE server_id = ?
                ORDER BY timestamp DESC
                LIMIT 100
            `, [server.id]);
            
            res.json({
                success: true,
                server: {
                    id: server.id,
                    name: server.name
                },
                stats: stats[0] || {
                    total_matches: 0,
                    total_duration: 0,
                    unique_players: 0
                },
                playerCountHistory: playerCountHistory
            });
        } catch (error) {
            this.logService.error('Error in ServerController.getServerStats:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving server statistics: ' + error.message
            });
        }
    }
    
    /**
     * Get server logs
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getServerLogs(req, res) {
        try {
            if (!this.serverManager) {
                return res.status(500).json({
                    success: false,
                    error: 'Server manager not initialized'
                });
            }
            
            const serverId = parseInt(req.params.id) || req.params.id;
            const server = this.serverManager.getServerById(serverId);
            
            if (!server) {
                return res.status(404).json({
                    success: false,
                    error: 'Server not found'
                });
            }
            
            const limit = parseInt(req.query.limit) || 100;
            
            // Get logs from the database
            const logs = await this.db.all(`
                SELECT 
                    id,
                    server_id,
                    timestamp,
                    level,
                    message,
                    metadata
                FROM server_logs
                WHERE server_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            `, [server.id, limit]);
            
            res.json({
                success: true,
                server: {
                    id: server.id,
                    name: server.name
                },
                logs: logs
            });
        } catch (error) {
            this.logService.error('Error in ServerController.getServerLogs:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving server logs: ' + error.message
            });
        }
    }
    
    /**
     * Start a server
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async startServer(req, res) {
        try {
            if (!this.serverManager) {
                return res.status(500).json({
                    success: false,
                    error: 'Server manager not initialized'
                });
            }
            
            const serverId = parseInt(req.params.id) || req.params.id;
            const server = this.serverManager.getServerById(serverId);
            
            if (!server) {
                return res.status(404).json({
                    success: false,
                    error: 'Server not found'
                });
            }
            
            if (server.isRunning()) {
                return res.json({
                    success: true,
                    message: 'Server is already running',
                    server: {
                        id: server.id,
                        name: server.name
                    }
                });
            }
            
            await server.start();
            
            res.json({
                success: true,
                message: 'Server started successfully',
                server: {
                    id: server.id,
                    name: server.name
                }
            });
        } catch (error) {
            this.logService.error('Error in ServerController.startServer:', error);
            res.status(500).json({
                success: false,
                error: 'Error starting server: ' + error.message
            });
        }
    }
    
    /**
     * Stop a server
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async stopServer(req, res) {
        try {
            if (!this.serverManager) {
                return res.status(500).json({
                    success: false,
                    error: 'Server manager not initialized'
                });
            }
            
            const serverId = parseInt(req.params.id) || req.params.id;
            const server = this.serverManager.getServerById(serverId);
            
            if (!server) {
                return res.status(404).json({
                    success: false,
                    error: 'Server not found'
                });
            }
            
            if (!server.isRunning()) {
                return res.json({
                    success: true,
                    message: 'Server is already stopped',
                    server: {
                        id: server.id,
                        name: server.name
                    }
                });
            }
            
            await server.stop();
            
            res.json({
                success: true,
                message: 'Server stopped successfully',
                server: {
                    id: server.id,
                    name: server.name
                }
            });
        } catch (error) {
            this.logService.error('Error in ServerController.stopServer:', error);
            res.status(500).json({
                success: false,
                error: 'Error stopping server: ' + error.message
            });
        }
    }
    
    /**
     * Restart a server
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async restartServer(req, res) {
        try {
            if (!this.serverManager) {
                return res.status(500).json({
                    success: false,
                    error: 'Server manager not initialized'
                });
            }
            
            const serverId = parseInt(req.params.id) || req.params.id;
            const server = this.serverManager.getServerById(serverId);
            
            if (!server) {
                return res.status(404).json({
                    success: false,
                    error: 'Server not found'
                });
            }
            
            await server.restart();
            
            res.json({
                success: true,
                message: 'Server restarted successfully',
                server: {
                    id: server.id,
                    name: server.name
                }
            });
        } catch (error) {
            this.logService.error('Error in ServerController.restartServer:', error);
            res.status(500).json({
                success: false,
                error: 'Error restarting server: ' + error.message
            });
        }
    }
}

module.exports = ServerController;
