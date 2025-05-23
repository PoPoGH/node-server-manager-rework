/**
 * Server Repository - Database operations for servers
 */
const BaseRepository = require('./BaseRepository');
const Server = require('../models/Server');

class ServerRepository extends BaseRepository {
    /**
     * Create a new ServerRepository
     * @param {Object} db - Database connection
     */
    constructor(db) {
        super(db);
        this.tableName = 'servers';
        this.modelClass = Server;
    }
    
    /**
     * Get all servers
     * @returns {Promise<Array<Server>>} List of Server models
     */
    async getAllServers() {
        try {
            const query = `
                SELECT * FROM ${this.tableName}
                ORDER BY name ASC
            `;
            
            const rows = await this.db.all(query);
            return rows.map(row => Server.fromDatabaseRow(row));
        } catch (error) {
            console.error('Error in ServerRepository.getAllServers:', error);
            throw error;
        }
    }
    
    /**
     * Get enabled servers
     * @returns {Promise<Array<Server>>} List of enabled Server models
     */
    async getEnabledServers() {
        try {
            const query = `
                SELECT * FROM ${this.tableName}
                WHERE enabled = 1
                ORDER BY name ASC
            `;
            
            const rows = await this.db.all(query);
            return rows.map(row => Server.fromDatabaseRow(row));
        } catch (error) {
            console.error('Error in ServerRepository.getEnabledServers:', error);
            throw error;
        }
    }
    
    /**
     * Get server by ID
     * @param {number|string} id - Server ID
     * @returns {Promise<Server|null>} Server model or null
     */
    async getById(id) {
        try {
            const query = `
                SELECT * FROM ${this.tableName}
                WHERE id = ?
            `;
            
            const row = await this.db.get(query, [id]);
            return Server.fromDatabaseRow(row);
        } catch (error) {
            console.error(`Error in ServerRepository.getById(${id}):`, error);
            throw error;
        }
    }
    
    /**
     * Save server to database (create or update)
     * @param {Server} server - Server model to save
     * @returns {Promise<Server>} Updated Server model
     */
    async save(server) {
        try {
            if (!server) {
                throw new Error('Server object is required');
            }
            
            // Convert config object to JSON string
            const configJson = JSON.stringify(server.config || {});
            
            if (server.id) {                // Update existing server
                const query = `
                    UPDATE ${this.tableName} SET
                        name = ?,
                        game = ?,
                        address = ?,
                        port = ?,
                        rcon_port = ?,
                        rcon_password = ?,
                        config = ?,
                        max_players = ?,
                        log_path = ?,
                        executable_path = ?,
                        enabled = ?,
                        updated_at = datetime('now')
                    WHERE id = ?
                `;
                
                await this.db.run(query, [
                    server.name,
                    server.game,
                    server.address,
                    server.port,
                    server.rconPort,
                    server.rconPassword,
                    configJson,
                    server.maxPlayers,
                    server.logPath,
                    server.executablePath,
                    server.enabled ? 1 : 0,
                    server.id
                ]);
                
                // Fetch the updated server
                return await this.getById(server.id);
            } else {                // Create new server
                const query = `
                    INSERT INTO ${this.tableName} (
                        name, game, address, port, rcon_port, rcon_password,
                        config, max_players, log_path, executable_path, enabled, 
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `;
                
                const result = await this.db.run(query, [
                    server.name,
                    server.game,
                    server.address,
                    server.port,
                    server.rconPort,
                    server.rconPassword,
                    configJson,
                    server.maxPlayers,
                    server.logPath,
                    server.executablePath,
                    server.enabled ? 1 : 0
                ]);
                
                // Update the server ID and return
                server.id = result.lastID;
                return await this.getById(server.id);
            }
        } catch (error) {
            console.error('Error in ServerRepository.save:', error);
            throw error;
        }
    }
    
    /**
     * Delete server by ID
     * @param {number|string} id - Server ID to delete
     * @returns {Promise<boolean>} Success status
     */
    async deleteById(id) {
        try {
            const query = `
                DELETE FROM ${this.tableName}
                WHERE id = ?
            `;
            
            const result = await this.db.run(query, [id]);
            return result.changes > 0;
        } catch (error) {
            console.error(`Error in ServerRepository.deleteById(${id}):`, error);
            throw error;
        }
    }
    
    /**
     * Get server logs
     * @param {number|string} serverId - Server ID
     * @param {number} limit - Maximum number of logs
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Array>} Server logs
     */
    async getServerLogs(serverId, limit = 100, offset = 0) {
        try {
            const query = `
                SELECT * FROM server_logs
                WHERE server_id = ?
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
            `;
            
            return await this.db.all(query, [serverId, limit, offset]);
        } catch (error) {
            console.error(`Error in ServerRepository.getServerLogs(${serverId}):`, error);
            throw error;
        }
    }
    
    /**
     * Log server event
     * @param {number|string} serverId - Server ID
     * @param {string} level - Log level (info, warn, error)
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Created log entry
     */
    async logServerEvent(serverId, level, message, metadata = {}) {
        try {
            const query = `
                INSERT INTO server_logs (
                    server_id, timestamp, level, message, metadata
                ) VALUES (?, unixepoch(), ?, ?, ?)
            `;
            
            const metadataJson = JSON.stringify(metadata);
            const result = await this.db.run(query, [serverId, level, message, metadataJson]);
            
            return {
                id: result.lastID,
                server_id: serverId,
                timestamp: Math.floor(Date.now() / 1000),
                level,
                message,
                metadata
            };
        } catch (error) {
            console.error(`Error in ServerRepository.logServerEvent:`, error);
            throw error;
        }
    }
    
    /**
     * Record player count
     * @param {number|string} serverId - Server ID
     * @param {number} playerCount - Current player count
     * @returns {Promise<void>}
     */
    async recordPlayerCount(serverId, playerCount) {
        try {
            const query = `
                INSERT INTO server_player_count_history (
                    server_id, timestamp, player_count
                ) VALUES (?, unixepoch(), ?)
            `;
            
            await this.db.run(query, [serverId, playerCount]);
        } catch (error) {
            console.error(`Error in ServerRepository.recordPlayerCount:`, error);
            throw error;
        }
    }
    
    /**
     * Get player count history
     * @param {number|string} serverId - Server ID
     * @param {number} limit - Maximum records to return
     * @returns {Promise<Array>} Player count history
     */
    async getPlayerCountHistory(serverId, limit = 100) {
        try {
            const query = `
                SELECT 
                    timestamp,
                    player_count
                FROM server_player_count_history
                WHERE server_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            `;
            
            return await this.db.all(query, [serverId, limit]);
        } catch (error) {
            console.error(`Error in ServerRepository.getPlayerCountHistory:`, error);
            throw error;
        }
    }
}

module.exports = ServerRepository;
