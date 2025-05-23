/**
 * Server Service - Business logic for server operations
 */
const ServerRepository = require('../repositories/ServerRepository');

class ServerService {
    /**
     * Create a new ServerService
     * @param {Object} db - Database connection
     * @param {Object} serverManager - Server manager instance
     */
    constructor(db, serverManager = null) {
        this.serverRepository = new ServerRepository(db);
        this.db = db;
        this.serverManager = serverManager;
    }
    
    /**
     * Set server manager instance
     * @param {Object} serverManager - Server manager instance
     */
    setServerManager(serverManager) {
        this.serverManager = serverManager;
    }
    
    /**
     * Get all servers
     * @returns {Promise<Array>} List of Server models
     */
    async getAllServers() {
        try {
            return await this.serverRepository.getAllServers();
        } catch (error) {
            console.error('Error in ServerService.getAllServers:', error);
            throw error;
        }
    }
    
    /**
     * Get server by ID
     * @param {number|string} id - Server ID
     * @returns {Promise<Object|null>} Server model or null
     */
    async getServerById(id) {
        try {
            return await this.serverRepository.getById(id);
        } catch (error) {
            console.error(`Error in ServerService.getServerById(${id}):`, error);
            throw error;
        }
    }
    
    /**
     * Save server (create or update)
     * @param {Object} serverData - Server data
     * @returns {Promise<Object>} Updated server model
     */
    async saveServer(serverData) {
        try {
            // If this is an update, get the existing server first
            let server = null;
            if (serverData.id) {
                server = await this.serverRepository.getById(serverData.id);
                if (!server) {
                    throw new Error(`Server with ID ${serverData.id} not found`);
                }
                
                // Update server properties
                Object.assign(server, serverData);
            } else {
                // Create a new Server model from the provided data
                const Server = require('../models/Server');
                server = new Server(serverData);
            }
            
            // Save to database
            return await this.serverRepository.save(server);
        } catch (error) {
            console.error('Error in ServerService.saveServer:', error);
            throw error;
        }
    }
    
    /**
     * Delete server by ID
     * @param {number|string} id - Server ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteServer(id) {
        try {
            // Stop the server if it's running
            if (this.serverManager) {
                const server = this.serverManager.getServerById(id);
                if (server && server.isRunning()) {
                    await server.stop();
                }
            }
            
            return await this.serverRepository.deleteById(id);
        } catch (error) {
            console.error(`Error in ServerService.deleteServer(${id}):`, error);
            throw error;
        }
    }
    
    /**
     * Get server status with live data
     * @param {number|string} id - Server ID
     * @returns {Promise<Object>} Server status
     */
    async getServerStatus(id) {
        try {
            // Get server from database
            const dbServer = await this.serverRepository.getById(id);
            if (!dbServer) {
                throw new Error(`Server with ID ${id} not found`);
            }
            
            // Get live server instance if available
            if (this.serverManager) {
                const liveServer = this.serverManager.getServerById(id);
                if (liveServer) {
                    // Update the database model with runtime properties
                    dbServer._isRunning = liveServer.isRunning();
                    
                    if (liveServer.isRunning()) {
                        try {
                            const status = await liveServer.getStatus();
                            dbServer.updateStatus(status);
                            
                            const playerCount = await liveServer.getPlayerCount();
                            dbServer.updatePlayerCount(playerCount);
                        } catch (error) {
                            console.error(`Error getting live server status: ${error.message}`);
                        }
                    }
                    
                    // Set the live server instance for potential future operations
                    dbServer.setInstance(liveServer);
                }
            }
            
            return dbServer;
        } catch (error) {
            console.error(`Error in ServerService.getServerStatus(${id}):`, error);
            throw error;
        }
    }
    
    /**
     * Get server players
     * @param {number|string} id - Server ID
     * @returns {Promise<Array>} List of players
     */
    async getServerPlayers(id) {
        try {
            if (!this.serverManager) {
                throw new Error('Server manager not available');
            }
            
            const server = this.serverManager.getServerById(id);
            if (!server) {
                throw new Error(`Server with ID ${id} not found`);
            }
            
            if (!server.isRunning()) {
                return [];
            }
            
            return await server.getPlayers();
        } catch (error) {
            console.error(`Error in ServerService.getServerPlayers(${id}):`, error);
            throw error;
        }
    }
    
    /**
     * Get server statistics
     * @param {number|string} id - Server ID
     * @returns {Promise<Object>} Server statistics
     */
    async getServerStatistics(id) {
        try {
            // Check if server exists
            const server = await this.serverRepository.getById(id);
            if (!server) {
                throw new Error(`Server with ID ${id} not found`);
            }
            
            // Get server statistics from the database
            const stats = await this.db.get(`
                SELECT 
                    COUNT(*) as total_matches,
                    SUM(duration_seconds) as total_duration,
                    COUNT(DISTINCT player_id) as unique_players
                FROM zombies_match_history
                WHERE server_id = ?
            `, [id]);
            
            // Get player count history
            const playerCountHistory = await this.serverRepository.getPlayerCountHistory(id);
            
            return {
                server: server.toJSON(),
                stats: stats || {
                    total_matches: 0,
                    total_duration: 0,
                    unique_players: 0
                },
                playerCountHistory
            };
        } catch (error) {
            console.error(`Error in ServerService.getServerStatistics(${id}):`, error);
            throw error;
        }
    }
    
    /**
     * Get server logs
     * @param {number|string} id - Server ID
     * @param {number} limit - Maximum number of logs
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Array>} Server logs
     */
    async getServerLogs(id, limit = 100, offset = 0) {
        try {
            // Check if server exists
            const server = await this.serverRepository.getById(id);
            if (!server) {
                throw new Error(`Server with ID ${id} not found`);
            }
            
            return {
                server: server.toJSON(),
                logs: await this.serverRepository.getServerLogs(id, limit, offset)
            };
        } catch (error) {
            console.error(`Error in ServerService.getServerLogs(${id}):`, error);
            throw error;
        }
    }
    
    /**
     * Start a server
     * @param {number|string} id - Server ID
     * @returns {Promise<Object>} Server status
     */
    async startServer(id) {
        try {
            if (!this.serverManager) {
                throw new Error('Server manager not available');
            }
            
            const server = this.serverManager.getServerById(id);
            if (!server) {
                throw new Error(`Server with ID ${id} not found`);
            }
            
            if (server.isRunning()) {
                return { 
                    success: true, 
                    message: 'Server is already running',
                    server: await this.getServerStatus(id)
                };
            }
            
            await server.start();
            
            // Log the event
            await this.serverRepository.logServerEvent(
                id, 
                'info', 
                'Server started', 
                { action: 'start' }
            );
            
            return { 
                success: true, 
                message: 'Server started successfully',
                server: await this.getServerStatus(id)
            };
        } catch (error) {
            console.error(`Error in ServerService.startServer(${id}):`, error);
            
            // Log the error
            await this.serverRepository.logServerEvent(
                id, 
                'error', 
                `Failed to start server: ${error.message}`, 
                { action: 'start', error: error.message }
            );
            
            throw error;
        }
    }
    
    /**
     * Stop a server
     * @param {number|string} id - Server ID
     * @returns {Promise<Object>} Server status
     */
    async stopServer(id) {
        try {
            if (!this.serverManager) {
                throw new Error('Server manager not available');
            }
            
            const server = this.serverManager.getServerById(id);
            if (!server) {
                throw new Error(`Server with ID ${id} not found`);
            }
            
            if (!server.isRunning()) {
                return { 
                    success: true, 
                    message: 'Server is already stopped',
                    server: await this.getServerStatus(id)
                };
            }
            
            await server.stop();
            
            // Log the event
            await this.serverRepository.logServerEvent(
                id, 
                'info', 
                'Server stopped', 
                { action: 'stop' }
            );
            
            return { 
                success: true, 
                message: 'Server stopped successfully',
                server: await this.getServerStatus(id)
            };
        } catch (error) {
            console.error(`Error in ServerService.stopServer(${id}):`, error);
            
            // Log the error
            await this.serverRepository.logServerEvent(
                id, 
                'error', 
                `Failed to stop server: ${error.message}`, 
                { action: 'stop', error: error.message }
            );
            
            throw error;
        }
    }
    
    /**
     * Restart a server
     * @param {number|string} id - Server ID
     * @returns {Promise<Object>} Server status
     */
    async restartServer(id) {
        try {
            if (!this.serverManager) {
                throw new Error('Server manager not available');
            }
            
            const server = this.serverManager.getServerById(id);
            if (!server) {
                throw new Error(`Server with ID ${id} not found`);
            }
            
            await server.restart();
            
            // Log the event
            await this.serverRepository.logServerEvent(
                id, 
                'info', 
                'Server restarted', 
                { action: 'restart' }
            );
            
            return { 
                success: true, 
                message: 'Server restarted successfully',
                server: await this.getServerStatus(id)
            };
        } catch (error) {
            console.error(`Error in ServerService.restartServer(${id}):`, error);
            
            // Log the error
            await this.serverRepository.logServerEvent(
                id, 
                'error', 
                `Failed to restart server: ${error.message}`, 
                { action: 'restart', error: error.message }
            );
            
            throw error;
        }
    }
}

module.exports = ServerService;
