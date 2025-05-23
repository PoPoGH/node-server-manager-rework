/**
 * Player Model - Defines the schema and methods for Player objects
 */
class Player {
    /**
     * Create a new Player object
     * @param {Object} data - Player data
     */
    constructor(data = {}) {
        // Core identifiers
        this.id = data.id || null;
        this.guid = data.guid || '0';
        this.name = data.name || 'Unnamed Player';
        
        // Connection info
        this.ipAddress = data.ipAddress || data.ip || null;
        this.country = data.country || null;
        this.clientSlot = data.clientSlot || data.Clientslot || null;
        
        // Status
        this.isOnline = !!data.isOnline;
        this.permissionLevel = data.permissionLevel || data.permission_level || 0;
        
        // Timestamps
        this.firstSeen = data.firstSeen || data.first_seen || new Date();
        this.lastSeen = data.lastSeen || data.last_seen || new Date();
        
        // Stats & metadata
        this.playtime = data.playtime || 0;
        this.metadata = data.metadata || {};
        
        // Server relationship
        this.serverId = data.serverId || data.server_id || null;
        this.server = data.server || null;
    }
    
    /**
     * Convert database row to Player model
     * @param {Object} row - Database row
     * @returns {Player} Player instance
     */
    static fromDatabaseRow(row) {
        if (!row) return null;
        
        return new Player({
            id: row.id,
            guid: row.guid,
            name: row.name,
            ip: row.ip,
            country: row.country,
            firstSeen: row.first_seen,
            lastSeen: row.last_seen,
            playtime: row.playtime,
            permissionLevel: row.permission_level
        });
    }
    
    /**
     * Convert to database format for storage
     * @returns {Object} Database format
     */
    toDatabase() {
        return {
            guid: this.guid,
            name: this.name,
            ip: this.ipAddress,
            country: this.country,
            permission_level: this.permissionLevel,
            playtime: this.playtime
        };
    }
    
    /**
     * Convert to API response format
     * @returns {Object} API format
     */
    toJSON() {
        return {
            id: this.id,
            guid: this.guid,
            name: this.name,
            ipAddress: this.ipAddress,
            country: this.country,
            isOnline: this.isOnline,
            permissionLevel: this.permissionLevel,
            firstSeen: this.firstSeen,
            lastSeen: this.lastSeen,
            playtime: this.playtime,
            server: this.server ? {
                id: this.server.id,
                name: this.server.name
            } : null
        };
    }
}

module.exports = Player;
