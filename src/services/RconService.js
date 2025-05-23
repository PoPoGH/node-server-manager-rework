/**
 * RCON Service - Business logic for remote console operations
 * Handles communication with game servers using the RCON protocol
 */
const dgram = require('dgram');
const path = require('path');
const Mutex = require('../utils/Mutex');
const logger = require('../core/Logger');

// Configure debug with a filter to reduce excessive logging
const debugModule = require('debug');
const debug = debugModule('nsm:rcon');
const verboseDebug = debugModule('nsm:rcon:verbose');

/**
 * RCON (Remote Console) Service for game server communication
 */
class RconService {
    /**
     * Creates a new RCON service instance
     * @param {string} ip - Server IP address
     * @param {number|string} port - Server port
     * @param {string} password - RCON password
     * @param {string} game - Game type (CoD engine version: T4, T5, T6, IW4, IW5, etc.)
     * @param {Object} commandPrefixes - Command prefixes for the game type
     */
    constructor(ip, port, password, game = 't6', commandPrefixes = null) {
        this.ip = ip;
        this.port = parseInt(port);
        this.password = password;
        this.game = game.toLowerCase();

        // Set up command prefixes based on game type
        this.commandPrefixes = commandPrefixes || this.getCommandPrefixesByGame(this.game);
        
        // Set up socket and request tracking
        this.socket = null;
        this.requests = {};
        this.requestCounter = 0;
        this.mutex = new Mutex();
        
        // Initialize with disconnected state
        this.connected = false;
        this.initSocketConnection();
        
        logger.debug(`RCON service initialized for ${ip}:${port} (${game})`);
    }
    
    /**
     * Get command prefixes for a specific game type
     * @param {string} gameType - Game type
     * @returns {Object} Command prefixes for the game
     */
    getCommandPrefixesByGame(gameType) {
        try {
            const gameTypeMap = {
                't4': 'IW3', // World at War
                't5': 'IW3', // Black Ops
                't6': 'IW3', // Black Ops 2
                'iw3': 'IW3', // CoD4
                'iw4': 'IW4', // MW2
                'iw5': 'IW5', // MW3
                'iw6': 'IW6'  // Ghosts
            };
            
            const prefixType = gameTypeMap[gameType.toLowerCase()] || 'Default';
            return require(`../core/RconCommandPrefixes/${prefixType}`);
        } catch (error) {
            logger.error(`Failed to load command prefixes for ${gameType}, using Default`, error);
            return require('../core/RconCommandPrefixes/Default');
        }
    }
    
    /**
     * Initialize socket connection
     * @private
     */
    initSocketConnection() {
        try {
            // Close existing socket if it exists
            if (this.socket) {
                this.socket.close();
            }
            
            // Create new UDP socket
            this.socket = dgram.createSocket('udp4');
            
            // Set up error handler
            this.socket.on('error', (err) => {
                logger.error(`RCON socket error for ${this.ip}:${this.port}: ${err.message}`);
                this.connected = false;
            });
            
            // Handle incoming messages
            this.socket.on('message', (message, info) => {
                this.handleSocketMessage(message, info);
            });
            
            // Set connected state when socket is ready
            this.socket.on('listening', () => {
                const address = this.socket.address();
                logger.info(`RCON socket listening on ${address.address}:${address.port}`);
                this.connected = true;
            });
            
            // Bind socket
            this.socket.bind();
        } catch (error) {
            logger.error(`Failed to initialize RCON socket: ${error.message}`);
            this.connected = false;
        }
    }
    
    /**
     * Handle incoming socket messages
     * @private
     * @param {Buffer} message - Message buffer
     * @param {Object} info - Message info
     */
    handleSocketMessage(message, info) {
        try {
            verboseDebug(`RCON received from ${info.address}:${info.port}: ${message.toString('utf8')}`);
            
            // Extract request ID and resolve promise
            const requestId = message.toString('utf8').substring(0, 4);
            
            if (this.requests[requestId]) {
                const { resolve, command } = this.requests[requestId];
                const response = message.toString('utf8').substring(4);
                
                debug(`RCON response for command [${command}]: ${response.length} bytes`);
                resolve(response);
                
                // Clean up request
                delete this.requests[requestId];
            }
        } catch (error) {
            logger.error(`Error handling RCON response: ${error.message}`);
        }
    }
    
    /**
     * Send a command to the game server
     * @async
     * @param {string} command - Command to send
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<string>} Command response
     */
    async executeCommandAsync(command, timeout = 5000) {
        const release = await this.mutex.acquire();
        
        try {
            // Generate request ID
            const requestId = (++this.requestCounter % 9999).toString().padStart(4, '0');
            
            // Create the full command with password
            const fullCommand = this.commandPrefixes.rcon.prefix
                .replace('%PASSWORD%', this.password)
                .replace('%COMMAND%', command);
            
            debug(`Executing RCON command [${requestId}]: ${command}`);
            
            // Create promise for response
            const responsePromise = new Promise((resolve, reject) => {
                // Store request with timeout
                this.requests[requestId] = {
                    resolve,
                    reject,
                    command,
                    timestamp: Date.now()
                };
                
                // Set timeout
                setTimeout(() => {
                    if (this.requests[requestId]) {
                        logger.warn(`RCON command timed out after ${timeout}ms: ${command}`);
                        reject(new Error(`Command timed out: ${command}`));
                        delete this.requests[requestId];
                    }
                }, timeout);
            });
            
            // Send the command
            const buffer = Buffer.from(requestId + fullCommand);
            this.socket.send(buffer, 0, buffer.length, this.port, this.ip);
            
            // Wait for response
            return await responsePromise;
        } catch (error) {
            logger.error(`RCON command execution failed: ${error.message}`);
            throw error;
        } finally {
            release();
        }
    }
    
    /**
     * Get server status
     * @async
     * @returns {Promise<Object>} Server status object
     */
    async getStatus() {
        try {
            const response = await this.executeCommandAsync(this.commandPrefixes.rcon.status);
            
            // Parse the status response
            const result = {
                success: true,
                raw: response,
                data: this.parseStatusResponse(response)
            };
            
            return result;
        } catch (error) {
            logger.error(`Failed to get server status: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Parse status response from server
     * @private
     * @param {string} response - Status command response
     * @returns {Object} Parsed status data
     */
    parseStatusResponse(response) {
        try {
            const clients = [];
            const statusRegex = this.commandPrefixes.rcon.statusRegex;
            
            // Reset regex lastIndex to ensure reliable matching
            statusRegex.lastIndex = 0;
            
            let match;
            while ((match = statusRegex.exec(response)) !== null) {
                if (match.index === statusRegex.lastIndex) {
                    statusRegex.lastIndex++;
                }
                
                // Parse client data using the configured parser
                const clientData = this.commandPrefixes.rcon.parseStatus(match);
                clients.push(clientData);
            }
            
            // Reset regex lastIndex after use
            statusRegex.lastIndex = 0;
            
            return {
                clients
            };
        } catch (error) {
            logger.error(`Failed to parse status response: ${error.message}`);
            return { clients: [] };
        }
    }
    
    /**
     * Get a server DVar (console variable)
     * @async
     * @param {string} dvarName - Name of the DVar to get
     * @returns {Promise<Object>} DVar value
     */
    async getDvar(dvarName) {
        try {
            const command = this.commandPrefixes.rcon.getDvar.replace('%DVAR%', dvarName);
            const response = await this.executeCommandAsync(command);
            
            // Parse DVar response
            const dvarRegex = this.commandPrefixes.rcon.dvarRegex;
            dvarRegex.lastIndex = 0;
            
            const match = dvarRegex.exec(response);
            if (match) {
                return {
                    success: true,
                    name: match[1],
                    value: match[3]
                };
            }
            
            return {
                success: false,
                error: `Could not parse DVar value from response: ${response}`
            };
        } catch (error) {
            logger.error(`Failed to get DVar ${dvarName}: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Set a server DVar (console variable)
     * @async
     * @param {string} dvarName - Name of the DVar to set
     * @param {string} value - Value to set
     * @returns {Promise<Object>} Result of the operation
     */
    async setDvar(dvarName, value) {
        try {
            const command = this.commandPrefixes.rcon.setDvar
                .replace('%DVAR%', dvarName)
                .replace('%VALUE%', value);
                
            await this.executeCommandAsync(command);
            
            return {
                success: true,
                dvar: dvarName,
                value: value
            };
        } catch (error) {
            logger.error(`Failed to set DVar ${dvarName}: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Send a message to all players on the server
     * @async
     * @param {string} message - Message to send
     * @returns {Promise<Object>} Result of the operation
     */
    async say(message) {
        try {
            const command = this.commandPrefixes.rcon.Say.replace('%MESSAGE%', message);
            await this.executeCommandAsync(command);
            
            return {
                success: true,
                message: message
            };
        } catch (error) {
            logger.error(`Failed to send server message: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Send a message to a specific player
     * @async
     * @param {string|number} client - Client ID or name
     * @param {string} message - Message to send
     * @returns {Promise<Object>} Result of the operation
     */
    async tell(client, message) {
        try {
            const command = this.commandPrefixes.rcon.Tell
                .replace('%CLIENT%', client)
                .replace('%MESSAGE%', message);
                
            await this.executeCommandAsync(command);
            
            return {
                success: true,
                client: client,
                message: message
            };
        } catch (error) {
            logger.error(`Failed to send message to client ${client}: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Kick a player from the server
     * @async
     * @param {string|number} client - Client ID or name
     * @param {string} reason - Kick reason
     * @returns {Promise<Object>} Result of the operation
     */
    async kick(client, reason = '') {
        try {
            const command = this.commandPrefixes.rcon.clientKick
                .replace('%CLIENT%', client)
                .replace('%REASON%', reason);
                
            await this.executeCommandAsync(command);
            
            return {
                success: true,
                client: client,
                reason: reason
            };
        } catch (error) {
            logger.error(`Failed to kick client ${client}: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get the maximum number of clients allowed on the server
     * @async
     * @returns {Promise<number>} Max clients
     */
    async getMaxClients() {
        try {
            const result = await this.getDvar(this.commandPrefixes.dvars.maxclients);
            return result.success ? parseInt(result.value) : 0;
        } catch (error) {
            logger.error(`Failed to get max clients: ${error.message}`);
            return 0;
        }
    }
    
    /**
     * Get the current map name
     * @async
     * @returns {Promise<string>} Map name
     */
    async getMapName() {
        try {
            const result = await this.getDvar(this.commandPrefixes.dvars.mapname);
            return result.success ? result.value : '';
        } catch (error) {
            logger.error(`Failed to get map name: ${error.message}`);
            return '';
        }
    }
    
    /**
     * Get the server hostname
     * @async
     * @returns {Promise<string>} Hostname
     */
    async getHostname() {
        try {
            const result = await this.getDvar(this.commandPrefixes.dvars.hostname);
            return result.success ? result.value : '';
        } catch (error) {
            logger.error(`Failed to get hostname: ${error.message}`);
            return '';
        }
    }
    
    /**
     * Test the RCON connection
     * @async
     * @returns {Promise<boolean>} Whether the connection is working
     */
    async testConnection() {
        try {
            // Try to get status to test connection
            const status = await this.getStatus();
            return status.success;
        } catch (error) {
            logger.error(`RCON connection test failed: ${error.message}`);
            return false;
        }
    }
}

module.exports = RconService;
