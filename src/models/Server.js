/**
 * Server Model - Represents a game server in the system
 */
class Server {
    /**
     * Create a new Server instance
     * @param {Object} data - Server data
     * @param {number} data.id - Server ID
     * @param {string} data.name - Server name
     * @param {string} data.game - Game type (e.g., 'T6', 'IW6')
     * @param {string} data.address - Server address
     * @param {number} data.port - Server port
     * @param {number} data.rconPort - RCON port
     * @param {string} data.rconPassword - RCON password
     * @param {Object} data.config - Server configuration
     * @param {number} data.maxPlayers - Maximum players allowed
     * @param {boolean} data.enabled - Whether the server is enabled
     * @param {string} data.logPath - Path to the server log file
     * @param {string} data.executablePath - Path to the server executable
     * @param {Date} data.createdAt - Creation timestamp
     * @param {Date} data.updatedAt - Last update timestamp
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.game = data.game || '';
        this.address = data.address || '';
        this.port = data.port || 0;
        this.rconPort = data.rconPort || 0;
        this.rconPassword = data.rconPassword || '';
        this.config = data.config || {};
        this.maxPlayers = data.maxPlayers || 0;
        this.logPath = data.logPath || '';
        this.executablePath = data.executablePath || '';
        this.enabled = data.enabled !== undefined ? data.enabled : true;
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
        
        // Runtime properties (not stored in DB)
        this._isRunning = false;
        this._status = null;
        this._playerCount = 0;
        this._instance = null;
    }
    
    /**
     * Convert database row to Server model
     * @param {Object} row - Database row
     * @returns {Server} Server instance
     */
    static fromDatabaseRow(row) {
        if (!row) return null;
        
        return new Server({
            id: row.id,
            name: row.name,
            game: row.game,
            address: row.address,
            port: row.port,
            rconPort: row.rcon_port,
            rconPassword: row.rcon_password,
            config: row.config ? JSON.parse(row.config) : {},
            maxPlayers: row.max_players,
            enabled: row.enabled === 1,
            logPath: row.log_path,
            executablePath: row.executable_path,
            createdAt: row.created_at ? new Date(row.created_at) : null,
            updatedAt: row.updated_at ? new Date(row.updated_at) : null
        });
    }
    
    /**
     * Set server instance reference
     * @param {Object} instance - Server instance object
     */
    setInstance(instance) {
        this._instance = instance;
    }
    
    /**
     * Check if server is running
     * @returns {boolean} True if running
     */
    isRunning() {
        return this._instance ? this._instance.isRunning() : this._isRunning;
    }
    
    /**
     * Update server status
     * @param {Object} status - Server status
     */
    updateStatus(status) {
        this._status = status;
        this._isRunning = !!status;
    }
    
    /**
     * Update player count
     * @param {number} count - Player count
     */
    updatePlayerCount(count) {
        this._playerCount = count;
    }
    
    /**
     * Convert to JSON representation
     * @param {boolean} includeCredentials - Whether to include sensitive data
     * @returns {Object} JSON representation
     */
    toJSON(includeCredentials = false) {
        return {
            id: this.id,
            name: this.name,
            game: this.game,
            address: this.address,
            port: this.port,
            rconPort: this.rconPort,
            rconPassword: includeCredentials ? this.rconPassword : undefined,
            config: this.config,
            maxPlayers: this.maxPlayers,
            enabled: this.enabled,
            logPath: this.logPath,
            executablePath: this.executablePath,
            isRunning: this._isRunning,
            status: this._status,
            playerCount: this._playerCount,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Server;
