/**
 * Server Instance Service - Handles active game server instances
 * Bridge between server model and RCON connection
 */
const EventEmitter = require('events');
const RconService = require('./RconService');
const logger = require('../core/NSMR-Logger');
const ActivePlayer = require('../core/Entity/ActivePlayer');
const ServerModel = require('../models/Server');

class ServerInstanceService extends EventEmitter {
    /**
     * Create a new ServerInstanceService
     * @param {ServerModel} serverModel - Server model
     * @param {Object} services - Service container with references to other services
     */
    constructor(serverModel, services = {}) {
        super();
        
        // Initialize from server model
        this.id = serverModel.id;
        this.name = serverModel.name;
        this.address = serverModel.address;
        this.port = serverModel.port;
        this.rconPort = serverModel.rconPort || serverModel.port;
        this.rconPassword = serverModel.rconPassword;
        this.game = serverModel.game;
        this.maxPlayers = serverModel.maxPlayers;
        this.logPath = serverModel.logPath;
        
        // Runtime properties
        this.status = 'offline';
        this.clients = []; // Active player slots
        this.players = []; // Active player references
        
        // Statistics
        this.stats = {
            connectionsTotal: 0,
            uniquePlayers: 0,
            peakPlayers: 0,
            uptime: 0,
            startTime: null
        };
        
        // Services
        this.services = services;
        this.playerService = services.playerService;
        this.eventService = services.eventService;
        this.statsService = services.statsService;
        
        // Setup RCON connection
        this.rcon = new RconService(
            this.address,
            this.rconPort,
            this.rconPassword,
            this.game
        );
        
        // Setup status checking
        this.statusCheckInterval = null;
        this.updateInterval = 30000; // 30 seconds
        
        logger.info(`Server instance created: ${this.name} (${this.id}) at ${this.address}:${this.port}`);
    }
    
    /**
     * Start server monitoring
     * @returns {Promise<boolean>} Success status
     */
    async start() {
        try {
            logger.info(`Starting server monitoring: ${this.name}`);
            
            // Test RCON connection
            const connectionTest = await this.rcon.testConnection();
            if (!connectionTest) {
                logger.error(`Failed to connect to server: ${this.name}`);
                this.status = 'error';
                return false;
            }
            
            // Get server info
            const serverInfo = await this.getInfo();
            if (!serverInfo.success) {
                logger.error(`Failed to get server info: ${this.name}`);
                this.status = 'error';
                return false;
            }
            
            // Initialize stats
            this.stats.startTime = new Date();
            this.status = 'online';
            
            // Start status check interval
            this.startStatusChecking();
            
            // Log server start event
            if (this.eventService) {
                await this.eventService.createEvent({
                    type: 'server.start',
                    serverId: this.id,
                    data: {
                        name: this.name,
                        address: `${this.address}:${this.port}`,
                        game: this.game
                    }
                });
            }
            
            logger.info(`Server monitoring started: ${this.name}`);
            this.emit('server.start', { server: this });
            return true;
            
        } catch (error) {
            logger.error(`Error starting server monitoring: ${error.message}`);
            this.status = 'error';
            return false;
        }
    }
    
    /**
     * Stop server monitoring
     * @returns {Promise<boolean>} Success status
     */
    async stop() {
        try {
            logger.info(`Stopping server monitoring: ${this.name}`);
            
            // Stop status check interval
            this.stopStatusChecking();
            
            // Update status
            this.status = 'offline';
            
            // Log server stop event
            if (this.eventService) {
                await this.eventService.createEvent({
                    type: 'server.stop',
                    serverId: this.id,
                    data: {
                        name: this.name,
                        address: `${this.address}:${this.port}`,
                        game: this.game
                    }
                });
            }
            
            // Notify all players as disconnected
            for (const player of this.players) {
                if (player && player.isOnline) {
                    await player.disconnect();
                }
            }
            
            // Clear player arrays
            this.clients = [];
            this.players = [];
            
            logger.info(`Server monitoring stopped: ${this.name}`);
            this.emit('server.stop', { server: this });
            return true;
            
        } catch (error) {
            logger.error(`Error stopping server monitoring: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Start periodic status checking
     * @private
     */
    startStatusChecking() {
        // Clear existing interval if it exists
        this.stopStatusChecking();
        
        // Set up new interval
        this.statusCheckInterval = setInterval(async () => {
            try {
                await this.checkServerStatus();
            } catch (error) {
                logger.error(`Error checking server status: ${error.message}`);
            }
        }, this.updateInterval);
        
        logger.debug(`Status checking started for server: ${this.name}`);
    }
    
    /**
     * Stop periodic status checking
     * @private
     */
    stopStatusChecking() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
            logger.debug(`Status checking stopped for server: ${this.name}`);
        }
    }
    
    /**
     * Check server status and update player list
     * @private
     * @returns {Promise<void>}
     */
    async checkServerStatus() {
        try {
            // Get server status
            const status = await this.rcon.getStatus();
            
            if (!status.success) {
                logger.warn(`Server ${this.name} appears to be offline`);
                this.status = 'offline';
                return;
            }
            
            // Update server status
            this.status = 'online';
            
            // Update uptime
            if (this.stats.startTime) {
                const now = new Date();
                this.stats.uptime = Math.floor((now - this.stats.startTime) / 1000);
            }
            
            // Process player list
            await this.processPlayerList(status.data.clients);
            
            // Update peak players
            if (this.players.length > this.stats.peakPlayers) {
                this.stats.peakPlayers = this.players.length;
            }
            
        } catch (error) {
            logger.error(`Error checking server status: ${error.message}`);
            // Don't change status on error, retry next interval
        }
    }
    
    /**
     * Process player list from status update
     * @private
     * @param {Array} clientList - List of clients from status
     * @returns {Promise<void>}
     */
    async processPlayerList(clientList) {
        try {
            // Convert status client data to map for easier lookup
            const clientMap = new Map();
            for (const client of clientList) {
                clientMap.set(parseInt(client.num), client);
            }
            
            // Check for players to remove
            for (let i = 0; i < this.clients.length; i++) {
                const player = this.clients[i];
                if (!player) continue;
                
                // Check if player is still on the server
                const clientData = clientMap.get(player.clientSlot);
                
                if (!clientData || clientData.name !== player.name) {
                    // Player disconnected
                    logger.info(`Player disconnected: ${player.name} (${player.guid})`);
                    
                    // Handle disconnect
                    await player.disconnect();
                    
                    // Remove from arrays
                    this.clients[i] = null;
                    this.players = this.players.filter(p => p !== player);
                }
            }
            
            // Add new players
            for (const [slot, client] of clientMap.entries()) {
                // Skip if slot is already occupied by the same player
                if (this.clients[slot] && 
                    this.clients[slot].name === client.name &&
                    this.clients[slot].guid === client.guid) {
                    continue;
                }
                
                // Create new player
                const newPlayer = new ActivePlayer(
                    client.guid,
                    client.name,
                    slot,
                    client.address,
                    this
                );
                
                // Build player data
                const success = await newPlayer.build();
                
                if (success) {
                    // Add to arrays
                    this.clients[slot] = newPlayer;
                    this.players.push(newPlayer);
                    
                    // Update stats
                    this.stats.connectionsTotal++;
                    
                    logger.info(`Player connected: ${newPlayer.name} (${newPlayer.guid})`);
                    
                    // Emit connect event
                    this.emit('player.connect', {
                        player: newPlayer,
                        server: this
                    });
                }
            }
            
        } catch (error) {
            logger.error(`Error processing player list: ${error.message}`);
        }
    }
    
    /**
     * Get server information
     * @returns {Promise<Object>} Server information
     */
    async getInfo() {
        try {
            // Get hostname
            const hostname = await this.rcon.getHostname();
            
            // Get map name
            const mapName = await this.rcon.getMapName();
            
            // Get max clients
            const maxClients = await this.rcon.getMaxClients();
            
            // Get player count
            const playerCount = this.players.length;
            
            return {
                success: true,
                hostname,
                mapName,
                maxClients,
                playerCount,
                status: this.status,
                uptime: this.stats.uptime
            };
        } catch (error) {
            logger.error(`Error getting server info: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get current player count
     * @returns {Promise<number>} Player count
     */
    async getPlayerCount() {
        return this.players.length;
    }
    
    /**
     * Get all players currently on the server
     * @returns {Promise<Array>} Array of player objects
     */
    async getPlayers() {
        return this.players.filter(p => p && p.isOnline);
    }
    
    /**
     * Send a message to all players
     * @param {string} message - Message to send
     * @returns {Promise<boolean>} Success status
     */
    async say(message) {
        try {
            const result = await this.rcon.say(message);
            return result.success;
        } catch (error) {
            logger.error(`Error sending server message: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Find a player by name or client ID
     * @param {string|number} identifer - Player name or client ID
     * @returns {ActivePlayer|null} Player object or null if not found
     */
    findPlayer(identifier) {
        // Try to find by client slot if identifier is a number
        if (!isNaN(identifier)) {
            const slot = parseInt(identifier);
            if (this.clients[slot]) {
                return this.clients[slot];
            }
        }
        
        // Try to find by name (case insensitive)
        return this.players.find(p => 
            p && p.name.toLowerCase() === identifier.toString().toLowerCase()
        );
    }
    
    /**
     * Kick a player from the server
     * @param {string|number} identifier - Player name or client ID
     * @param {string} reason - Kick reason
     * @param {Object} origin - Origin player or system user
     * @returns {Promise<boolean>} Success status
     */
    async kickPlayer(identifier, reason, origin) {
        try {
            const player = this.findPlayer(identifier);
            
            if (!player) {
                logger.warn(`Player not found for kick: ${identifier}`);
                return false;
            }
            
            return await player.kick(reason, origin);
        } catch (error) {
            logger.error(`Error kicking player ${identifier}: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Ban a player from the server
     * @param {string|number} identifier - Player name or client ID
     * @param {string} reason - Ban reason
     * @param {Object} origin - Origin player or system user
     * @returns {Promise<boolean>} Success status
     */
    async banPlayer(identifier, reason, origin) {
        try {
            const player = this.findPlayer(identifier);
            
            if (!player) {
                logger.warn(`Player not found for ban: ${identifier}`);
                return false;
            }
            
            return await player.ban(reason, origin);
        } catch (error) {
            logger.error(`Error banning player ${identifier}: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Check if the server is running
     * @returns {boolean} Whether the server is running
     */
    isRunning() {
        return this.status === 'online';
    }
    
    /**
     * Convert to server model
     * @returns {ServerModel} Server model
     */
    toModel() {
        const model = new ServerModel({
            id: this.id,
            name: this.name,
            game: this.game,
            address: this.address,
            port: this.port,
            rconPort: this.rconPort,
            rconPassword: this.rconPassword,
            maxPlayers: this.maxPlayers,
            logPath: this.logPath
        });
        
        // Add runtime info
        model.updateStatus(this.status);
        model.updatePlayerCount(this.players.length);
        
        return model;
    }
    
    /**
     * Convert to JSON representation
     * @param {boolean} includeDetails - Whether to include detailed information
     * @returns {Object} JSON representation
     */
    toJSON(includeDetails = false) {
        const json = {
            id: this.id,
            name: this.name,
            address: this.address,
            port: this.port,
            game: this.game,
            status: this.status,
            playerCount: this.players.length,
            maxPlayers: this.maxPlayers,
            uptime: this.stats.uptime
        };
        
        if (includeDetails) {
            json.players = this.players.map(p => p.toJSON());
            json.stats = this.stats;
        }
        
        return json;
    }
}

module.exports = ServerInstanceService;
