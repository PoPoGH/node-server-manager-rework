/**
 * Player Repository - Data access for player records
 */
const BaseRepository = require('./BaseRepository');
const Player = require('../models/Player');

class PlayerRepository extends BaseRepository {
    /**
     * Create a new PlayerRepository
     * @param {Object} db - Database connection
     */
    constructor(db) {
        super(db, 'players');
    }
    
    /**
     * Get player by GUID
     * @param {string} guid - Player GUID
     * @returns {Promise<Player|null>} Player model or null
     */
    async getByGuid(guid) {
        try {
            const row = await this.db.get('SELECT * FROM players WHERE guid = ?', [guid]);
            return Player.fromDatabaseRow(row);
        } catch (error) {
            console.error('Error in PlayerRepository.getByGuid:', error);
            throw error;
        }
    }
    
    /**
     * Search players by name
     * @param {string} name - Search pattern (uses LIKE)
     * @param {number} limit - Maximum results
     * @param {number} offset - Results to skip
     * @returns {Promise<Array<Player>>} Array of Player models
     */
    async searchByName(name, limit = 100, offset = 0) {
        try {
            const rows = await this.db.all(
                'SELECT * FROM players WHERE name LIKE ? ORDER BY last_seen DESC LIMIT ? OFFSET ?',
                [`%${name}%`, limit, offset]
            );
            
            return rows.map(row => Player.fromDatabaseRow(row));
        } catch (error) {
            console.error('Error in PlayerRepository.searchByName:', error);
            throw error;
        }
    }
    
    /**
     * Get recently seen players
     * @param {number} limit - Maximum results
     * @returns {Promise<Array<Player>>} Array of Player models
     */
    async getRecentPlayers(limit = 20) {
        try {
            const rows = await this.db.all(
                'SELECT * FROM players ORDER BY last_seen DESC LIMIT ?',
                [limit]
            );
            
            return rows.map(row => Player.fromDatabaseRow(row));
        } catch (error) {
            console.error('Error in PlayerRepository.getRecentPlayers:', error);
            throw error;
        }
    }
    
    /**
     * Get online players
     * @returns {Promise<Array<Object>>} Array of player data with server info
     */
    async getOnlinePlayers() {
        try {
            const rows = await this.db.all(`
                SELECT p.*, s.id as server_id, s.name as server_name
                FROM players p
                JOIN sessions sess ON p.id = sess.player_id
                JOIN servers s ON sess.server_id = s.id
                WHERE sess.end_time IS NULL
                ORDER BY sess.start_time DESC
            `);
            
            return rows.map(row => ({
                ...Player.fromDatabaseRow(row),
                isOnline: true,
                server: {
                    id: row.server_id,
                    name: row.server_name
                }
            }));
        } catch (error) {
            console.error('Error in PlayerRepository.getOnlinePlayers:', error);
            throw error;
        }
    }
    
    /**
     * Create or update a player
     * @param {Player} player - Player model
     * @returns {Promise<Player>} Updated Player model with ID
     */
    async upsert(player) {
        try {
            const existingPlayer = await this.getByGuid(player.guid);
            
            if (existingPlayer) {
                // Update existing player
                const data = {
                    name: player.name,
                    ip: player.ipAddress,
                    country: player.country,
                    last_seen: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                await this.update(existingPlayer.id, data);
                return { ...existingPlayer, ...player, id: existingPlayer.id };
            } else {
                // Insert new player
                const data = {
                    guid: player.guid,
                    name: player.name,
                    ip: player.ipAddress,
                    country: player.country
                };
                
                const result = await this.insert(data);
                return { ...player, id: result.id };
            }
        } catch (error) {
            console.error('Error in PlayerRepository.upsert:', error);
            throw error;
        }
    }
    
    /**
     * Log player connection and start session
     * @param {Player} player - Player model
     * @param {number} serverId - Server ID
     * @returns {Promise<number>} Session ID
     */
    async logConnection(player, serverId) {
        try {
            // Ensure player exists
            const playerObj = await this.upsert(player);
            
            // Create new session
            const result = await this.db._run(
                'INSERT INTO sessions (player_id, server_id) VALUES (?, ?)',
                [playerObj.id, serverId]
            );
            
            return result.lastID;
        } catch (error) {
            console.error('Error in PlayerRepository.logConnection:', error);
            throw error;
        }
    }
    
    /**
     * End player session
     * @param {number} playerId - Player ID
     * @param {number|null} serverId - Optional server ID to filter by
     * @returns {Promise<boolean>} Success
     */
    async logDisconnection(playerId, serverId = null) {
        try {
            const now = new Date().toISOString();
            let query, params;
            
            if (serverId) {
                query = `
                    UPDATE sessions 
                    SET end_time = ?, 
                        duration = ROUND((JULIANDAY(?) - JULIANDAY(start_time)) * 86400) 
                    WHERE player_id = ? AND server_id = ? AND end_time IS NULL
                `;
                params = [now, now, playerId, serverId];
            } else {
                query = `
                    UPDATE sessions 
                    SET end_time = ?, 
                        duration = ROUND((JULIANDAY(?) - JULIANDAY(start_time)) * 86400) 
                    WHERE player_id = ? AND end_time IS NULL
                `;
                params = [now, now, playerId];
            }
            
            const result = await this.db._run(query, params);
            return result.changes > 0;
        } catch (error) {
            console.error('Error in PlayerRepository.logDisconnection:', error);
            throw error;
        }
    }
    
    /**
     * Get player metadata
     * @param {number} playerId - Player ID
     * @param {string} name - Metadata key
     * @returns {Promise<any>} Metadata value
     */
    async getMetadata(playerId, name) {
        try {
            // Ensure metadata table exists
            await this.db._run(`
                CREATE TABLE IF NOT EXISTS player_meta (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    player_id INTEGER NOT NULL,
                    meta_key TEXT NOT NULL,
                    meta_value TEXT,
                    meta_type TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
                )
            `);
            
            const row = await this.db.get(
                'SELECT meta_value, meta_type FROM player_meta WHERE player_id = ? AND meta_key = ?',
                [playerId, name]
            );
            
            if (!row) return null;
            
            // Convert value based on type
            switch (row.meta_type) {
                case 'number': return Number(row.meta_value);
                case 'boolean': return row.meta_value === 'true';
                case 'object':
                case 'array':
                    try {
                        return JSON.parse(row.meta_value);
                    } catch (e) {
                        console.warn(`Failed to parse JSON metadata for player ${playerId}, key=${name}`);
                        return null;
                    }
                default: return row.meta_value;
            }
        } catch (error) {
            console.error('Error in PlayerRepository.getMetadata:', error);
            throw error;
        }
    }
    
    /**
     * Set player metadata
     * @param {number} playerId - Player ID
     * @param {string} name - Metadata key
     * @param {any} value - Metadata value
     * @returns {Promise<boolean>} Success
     */
    async setMetadata(playerId, name, value) {
        try {
            // Ensure metadata table exists
            await this.db._run(`
                CREATE TABLE IF NOT EXISTS player_meta (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    player_id INTEGER NOT NULL,
                    meta_key TEXT NOT NULL,
                    meta_value TEXT,
                    meta_type TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
                )
            `);
            
            // Determine value type and formatting
            let type = typeof value;
            let valueToStore = value;
            
            if (type === 'object') {
                if (value === null) {
                    type = 'null';
                    valueToStore = 'null';
                } else if (Array.isArray(value)) {
                    type = 'array';
                    valueToStore = JSON.stringify(value);
                } else {
                    valueToStore = JSON.stringify(value);
                }
            }
            
            // Check if metadata exists
            const existing = await this.db.get(
                'SELECT id FROM player_meta WHERE player_id = ? AND meta_key = ?', 
                [playerId, name]
            );
            
            if (existing) {
                // Update existing
                await this.db._run(`
                    UPDATE player_meta 
                    SET meta_value = ?, meta_type = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [String(valueToStore), type, existing.id]);
            } else {
                // Insert new
                await this.db._run(`
                    INSERT INTO player_meta (player_id, meta_key, meta_value, meta_type)
                    VALUES (?, ?, ?, ?)
                `, [playerId, name, String(valueToStore), type]);
            }
            
            return true;
        } catch (error) {
            console.error('Error in PlayerRepository.setMetadata:', error);
            throw error;
        }
    }
    
    /**
     * Get player by ID with enhanced data
     * @param {number} id - Player ID
     * @returns {Promise<Object>} Enhanced player data
     */
    async getPlayerWithDetails(id) {
        try {
            // Get basic player data
            const player = await this.getById(id);
            if (!player) return null;
            
            // Get recent sessions
            const sessions = await this.db.all(`
                SELECT s.*, srv.name as server_name 
                FROM sessions s 
                JOIN servers srv ON s.server_id = srv.id 
                WHERE s.player_id = ? 
                ORDER BY s.start_time DESC LIMIT 10
            `, [id]);
            
            // Get active session if any
            const activeSession = await this.db.get(`
                SELECT s.*, srv.name as server_name, srv.id as server_id
                FROM sessions s
                JOIN servers srv ON s.server_id = srv.id
                WHERE s.player_id = ? AND s.end_time IS NULL
                LIMIT 1
            `, [id]);
            
            const isOnline = !!activeSession;
            
            // Return enhanced player data
            return {
                ...player,
                isOnline,
                server: isOnline ? {
                    id: activeSession.server_id,
                    name: activeSession.server_name
                } : null,
                sessions
            };
        } catch (error) {
            console.error('Error in PlayerRepository.getPlayerWithDetails:', error);
            throw error;
        }
    }
    
    /**
     * Add a penalty (ban, temp ban, kick) for a player
     * @param {Object} penalty - Penalty data
     * @returns {Promise<Object>} Penalty with ID
     */
    async addPenalty(penalty) {
        try {
            // Create punishment record
            const result = await this.db._run(`
                INSERT INTO penalties (
                    player_id, admin_id, type, reason, duration, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                penalty.TargetId,
                penalty.OriginId,
                penalty.PenaltyType,
                penalty.Reason,
                penalty.Duration,
                penalty.Duration > 0 ? new Date(Date.now() + penalty.Duration * 1000).toISOString() : null
            ]);
            
            return { id: result.lastID, ...penalty };
        } catch (error) {
            console.error('Error in PlayerRepository.addPenalty:', error);
            throw error;
        }
    }
}

module.exports = PlayerRepository;
