/**
 * Server Manager - MVC-compliant manager for game server instances
 * Coordinates multiple server instances and handles their lifecycle
 * 
 * Refactored from original NSMR-Server-Manager.js to use ServerInstanceService
 */
const EventEmitter = require('events');
const logger = require('../core/Logger');

class ServerManager extends EventEmitter {
    /**
     * Create a new ServerManager
     * @param {Object} config - Application configuration
     * @param {Object} services - Services container
     */
    constructor(config, services = {}) {
        super();
        this.config = config;
        this.services = services;
        this.serverInstances = new Map(); // Map of server ID to ServerInstanceService
        this.intervals = [];
        
        // Increase the limit of event listeners
        this.setMaxListeners(50);
        
        // Service references for easier access
        this.logService = services.logService || logger;
        this.serverService = services.serverService;
        this.eventService = services.eventService;
        
        this.logService.debug('ServerManager initialized');
    }
    
    /**
     * Initialize all configured servers
     * @returns {Promise<boolean>} Success status
     */
    async init() {
        this.logService.info('Initializing Server Manager...');
        
        try {
            // Ensure we have the server service
            if (!this.serverService) {
                this.logService.error('Server service not available');
                return false;
            }
            
            // Get all servers from database
            const servers = await this.serverService.getAllServers();
            
            if (!servers || servers.length === 0) {
                this.logService.info('No servers found in database. System will operate in web-only mode.');
                return true;
            }
            
            // Initialize server instances
            this.logService.info(`Found ${servers.length} servers, initializing...`);
            const results = await Promise.allSettled(
                servers.map(server => this._initializeServerInstance(server))
            );
            
            // Count successful initializations
            const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
            this.logService.info(`Successfully initialized ${successful}/${servers.length} servers`);
            
            // Set up status checking
            this._setupStatusChecking();
            
            // Emit initialization complete event
            this.emit('initialized', { 
                successful, 
                total: servers.length,
                servers: Array.from(this.serverInstances.values()).map(instance => instance.toJSON())
            });
            
            return true;
        } catch (error) {
            this.logService.error(`Error initializing ServerManager: ${error.message}`);
            this.logService.debug(error.stack);
            return false;
        }
    }
    
    /**
     * Initialize a single server instance
     * @param {Object} serverModel - Server model from database
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _initializeServerInstance(serverModel) {
        try {
            this.logService.debug(`Initializing server: ${serverModel.name} (${serverModel.id})`);
            
            // Get RCON password from secure storage if not provided
            if (!serverModel.rconPassword) {
                serverModel.rconPassword = await this.serverService.getRconPassword(serverModel.id);
            }
            
            // Create server instance using ServiceFactory
            const serverInstance = this.services.serviceFactory.createServerInstance(serverModel);
            if (!serverInstance) {
                this.logService.error(`Failed to create server instance for ${serverModel.name}`);
                return false;
            }
            
            // Set up event handling
            this._setupInstanceEventHandlers(serverInstance);
            
            // Start server instance monitoring
            const success = await serverInstance.start();
            
            if (success) {
                // Store server instance
                this.serverInstances.set(serverModel.id, serverInstance);
                this.logService.info(`Server ${serverModel.name} initialized successfully`);
                
                // Emit server added event
                this.emit('server.added', { server: serverInstance });
                
                return true;
            } else {
                this.logService.error(`Failed to start server instance ${serverModel.name}`);
                return false;
            }
        } catch (error) {
            this.logService.error(`Error initializing server ${serverModel.name}: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Set up event handlers for a server instance
     * @param {ServerInstanceService} instance - Server instance
     * @private
     */
    _setupInstanceEventHandlers(instance) {
        // Proxy status change events
        instance.on('status.change', (data) => {
            this.emit('server.status.change', { 
                serverId: instance.id,
                serverName: instance.name,
                status: data.status,
                previousStatus: data.previousStatus
            });
            
            // Log status change to event service
            if (this.eventService) {
                this.eventService.createEvent({
                    type: 'server.status.change',
                    serverId: instance.id,
                    data: {
                        status: data.status,
                        previousStatus: data.previousStatus
                    }
                }).catch(err => this.logService.error(`Error logging status change: ${err.message}`));
            }
        });
        
        // Proxy player connect/disconnect events
        instance.on('player.connect', (data) => {
            this.emit('player.connect', { 
                serverId: instance.id,
                serverName: instance.name,
                player: data.player
            });
        });
        
        instance.on('player.disconnect', (data) => {
            this.emit('player.disconnect', { 
                serverId: instance.id,
                serverName: instance.name,
                player: data.player
            });
        });
        
        // Proxy chat messages
        instance.on('chat.message', (data) => {
            this.emit('chat.message', { 
                serverId: instance.id,
                serverName: instance.name,
                player: data.player,
                message: data.message
            });
        });
        
        // Proxy chat commands
        instance.on('chat.command', (data) => {
            this.emit('chat.command', { 
                serverId: instance.id,
                serverName: instance.name,
                player: data.player,
                command: data.command,
                args: data.args
            });
        });
    }
    
    /**
     * Set up periodic status checking for all server instances
     * @private
     */
    _setupStatusChecking() {
        // Clear any existing interval
        this.intervals.forEach(clearInterval);
        this.intervals = [];
        
        // Create new interval (5 minute health check)
        const interval = setInterval(() => {
            this.logService.debug('Running periodic server health check');
            this.checkAllServers();
        }, 5 * 60 * 1000); // Every 5 minutes
        
        this.intervals.push(interval);
        this.logService.debug('Server health check interval set up');
    }
    
    /**
     * Check status for all server instances
     * @returns {Promise<void>}
     */
    async checkAllServers() {
        this.logService.debug(`Checking status of ${this.serverInstances.size} servers`);
        
        const checkPromises = [];
        
        for (const [id, instance] of this.serverInstances.entries()) {
            checkPromises.push(
                instance.checkServerStatus()
                    .catch(error => this.logService.error(`Error checking server ${instance.name}: ${error.message}`))
            );
        }
        
        await Promise.allSettled(checkPromises);
        this.logService.debug('Server status check complete');
    }
    
    /**
     * Add a new server
     * @param {Object} serverModel - Server model
     * @returns {Promise<boolean>} Success status
     */
    async addServer(serverModel) {
        try {
            // Check if server already exists
            if (this.serverInstances.has(serverModel.id)) {
                this.logService.warn(`Server with ID ${serverModel.id} already exists, updating instead`);
                return await this.updateServer(serverModel);
            }
            
            // Initialize new server instance
            const success = await this._initializeServerInstance(serverModel);
            
            if (success) {
                this.logService.info(`Server ${serverModel.name} added successfully`);
                return true;
            } else {
                this.logService.error(`Failed to add server ${serverModel.name}`);
                return false;
            }
        } catch (error) {
            this.logService.error(`Error adding server: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Update an existing server
     * @param {Object} serverModel - Updated server model
     * @returns {Promise<boolean>} Success status
     */
    async updateServer(serverModel) {
        try {
            this.logService.info(`Updating server ${serverModel.name} (${serverModel.id})`);
            
            // Remove old instance if it exists
            if (this.serverInstances.has(serverModel.id)) {
                const oldInstance = this.serverInstances.get(serverModel.id);
                await oldInstance.stop();
                this.serverInstances.delete(serverModel.id);
                this.logService.debug(`Stopped old instance of server ${serverModel.name}`);
            }
            
            // Add as new
            return await this.addServer(serverModel);
        } catch (error) {
            this.logService.error(`Error updating server: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Remove a server
     * @param {string|number} serverId - Server ID
     * @returns {Promise<boolean>} Success status
     */
    async removeServer(serverId) {
        try {
            this.logService.info(`Removing server ${serverId}`);
            
            // Check if server exists
            if (!this.serverInstances.has(serverId)) {
                this.logService.warn(`Server with ID ${serverId} not found`);
                return false;
            }
            
            // Stop server instance
            const instance = this.serverInstances.get(serverId);
            await instance.stop();
            
            // Remove from map
            this.serverInstances.delete(serverId);
            
            // Emit server removed event
            this.emit('server.removed', { serverId, serverName: instance.name });
            
            this.logService.info(`Server ${instance.name} removed successfully`);
            return true;
        } catch (error) {
            this.logService.error(`Error removing server: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Get server by ID
     * @param {string|number} serverId - Server ID
     * @returns {Object|null} Server instance or null if not found
     */
    getServerById(serverId) {
        return this.serverInstances.get(serverId) || null;
    }
    
    /**
     * Get server by IP and port
     * @param {string} ip - Server IP
     * @param {number|string} port - Server port
     * @returns {Object|null} Server instance or null if not found
     */
    getServerByAddress(ip, port) {
        // Convert port to number for comparison
        const portNum = parseInt(port);
        
        // Find server by IP and port
        for (const [id, instance] of this.serverInstances.entries()) {
            if (instance.address === ip && instance.port === portNum) {
                return instance;
            }
        }
        
        return null;
    }
    
    /**
     * Get all server instances
     * @returns {Array} Array of server instances
     */
    getServers() {
        return Array.from(this.serverInstances.values());
    }
    
    /**
     * Start the server manager
     * @returns {Promise<boolean>} Success status
     */
    async start() {
        this.logService.info('Starting server manager...');
        
        try {
            // Already initialized in init() method
            return true;
        } catch (error) {
            this.logService.error(`Error starting server manager: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Stop the server manager and all server instances
     * @returns {Promise<boolean>} Success status
     */
    async stop() {
        this.logService.info('Stopping server manager...');
        
        try {
            // Clear all intervals
            this.intervals.forEach(clearInterval);
            this.intervals = [];
            
            // Stop all server instances
            const promises = [];
            
            for (const [id, instance] of this.serverInstances.entries()) {
                promises.push(
                    instance.stop()
                        .catch(error => this.logService.error(`Error stopping server ${instance.name}: ${error.message}`))
                );
            }
            
            await Promise.allSettled(promises);
            
            // Clear server instances
            this.serverInstances.clear();
            
            this.logService.info('Server manager stopped successfully');
            return true;
        } catch (error) {
            this.logService.error(`Error stopping server manager: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Send a message to all servers
     * @param {string} message - Message to send
     * @returns {Promise<Object>} Results for each server
     */
    async broadcastMessage(message) {
        this.logService.info(`Broadcasting message to all servers: ${message}`);
        
        const results = {};
        const promises = [];
        
        for (const [id, instance] of this.serverInstances.entries()) {
            promises.push(
                instance.say(message)
                    .then(success => {
                        results[instance.name] = { success };
                        return { serverId: id, success };
                    })
                    .catch(error => {
                        results[instance.name] = { success: false, error: error.message };
                        return { serverId: id, success: false, error: error.message };
                    })
            );
        }
        
        await Promise.allSettled(promises);
        return results;
    }
}

module.exports = ServerManager;
