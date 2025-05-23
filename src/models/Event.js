/**
 * Event Model - Defines the schema and methods for Event objects
 */
class Event {
    /**
     * Create a new Event object
     * @param {Object} data - Event data
     */
    constructor(data = {}) {
        // Core identifiers
        this.id = data.id || null;
        this.serverId = data.serverId || data.server_id || null;
        this.playerId = data.playerId || data.player_id || null;
        
        // Event details
        this.type = data.type || '';
        this.data = data.data || {};
        
        // Timestamps
        this.timestamp = data.timestamp || new Date();
        
        // Relations
        this.server = data.server || null;
        this.player = data.player || null;
    }
    
    /**
     * Convert database row to Event model
     * @param {Object} row - Database row
     * @returns {Event} Event instance
     */
    static fromDatabaseRow(row) {
        if (!row) return null;
        
        let eventData = {};
        
        try {
            if (row.data) {
                eventData = JSON.parse(row.data);
            }
        } catch (e) {
            console.error('Error parsing event data JSON:', e);
        }
        
        return new Event({
            id: row.id,
            serverId: row.server_id,
            playerId: row.player_id,
            type: row.type,
            data: eventData,
            timestamp: row.timestamp
        });
    }
    
    /**
     * Convert Event object to database row
     * @returns {Object} Database row
     */
    toDatabaseRow() {
        return {
            id: this.id,
            server_id: this.serverId,
            player_id: this.playerId,
            type: this.type,
            data: JSON.stringify(this.data),
            timestamp: this.timestamp instanceof Date ? this.timestamp.toISOString() : this.timestamp
        };
    }
    
    /**
     * Convert Event object to database format
     * @returns {Object} Database format object
     */
    toDatabase() {
        return this.toDatabaseRow();
    }
    
    /**
     * Convert Event object to JSON representation
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            id: this.id,
            serverId: this.serverId,
            playerId: this.playerId,
            type: this.type,
            category: this.getCategory(),
            data: this.data,
            timestamp: this.timestamp,
            summary: this.getSummary(),
            server: this.server,
            player: this.player
        };
    }
    
    /**
     * Get the category of the event based on type prefix
     * @returns {string} Event category (player, server, match, etc.)
     */
    getCategory() {
        const parts = this.type.split('.');
        return parts.length > 0 ? parts[0] : 'unknown';
    }
    
    /**
     * Get a readable summary of the event
     * @returns {string} Event summary
     */
    getSummary() {
        const category = this.getCategory();
        
        switch(category) {
            case 'player':
                const playerName = this.data?.player?.name || this.player?.name || 'Unknown player';
                
                if (this.type === 'player.connected') {
                    return `${playerName} connected`;
                } else if (this.type === 'player.disconnected') {
                    return `${playerName} disconnected`;
                } else if (this.type.startsWith('player.penalty')) {
                    const penaltyType = this.type.split('.')[2] || 'penalized';
                    return `${playerName} was ${penaltyType}`;
                }
                return `Player event: ${this.type}`;
                
            case 'server':
                const serverName = this.server?.name || this.data?.serverName || this.serverId || 'Unknown server';
                
                if (this.type === 'server.start') {
                    return `Server ${serverName} started`;
                } else if (this.type === 'server.stop') {
                    return `Server ${serverName} stopped`;
                }
                return `Server event: ${this.type} on ${serverName}`;
                
            case 'match':
                const map = this.data?.map || this.data?.mapName || 'unknown map';
                
                if (this.type === 'match.start') {
                    return `Match started on ${map}`;
                } else if (this.type === 'match.end') {
                    return `Match ended on ${map}`;
                }
                return `Match event: ${this.type}`;
                
            default:
                return `${this.type} event`;
        }
    }
    
    /**
     * Check if this event is related to another event
     * @param {Event} otherEvent - Another event to compare with
     * @returns {boolean} Whether events are related
     */
    isRelatedTo(otherEvent) {
        if (!otherEvent) return false;
        
        // Same player events
        if (this.playerId && this.playerId === otherEvent.playerId) {
            return true;
        }
        
        // Same server events
        if (this.serverId && this.serverId === otherEvent.serverId) {
            return true;
        }
        
        // Same match events (by match ID in data)
        if (this.data?.matchId && this.data.matchId === otherEvent.data?.matchId) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Create a player event
     * @param {string} eventType - Specific event type (connected, disconnected, etc.)
     * @param {number} playerId - Player ID
     * @param {number} serverId - Server ID
     * @param {Object} data - Additional event data
     * @returns {Event} New Event instance
     */
    static createPlayerEvent(eventType, playerId, serverId, data = {}) {
        return new Event({
            playerId,
            serverId,
            type: `player.${eventType}`,
            data: { ...data, timestamp: new Date() }
        });
    }
    
    /**
     * Create a server event
     * @param {string} eventType - Specific event type (start, stop, etc.)
     * @param {number} serverId - Server ID
     * @param {Object} data - Additional event data
     * @returns {Event} New Event instance
     */
    static createServerEvent(eventType, serverId, data = {}) {
        return new Event({
            serverId,
            type: `server.${eventType}`,
            data: { ...data, timestamp: new Date() }
        });
    }
    
    /**
     * Create a match event
     * @param {string} eventType - Specific event type (start, end, round, etc.)
     * @param {number} serverId - Server ID
     * @param {Object} data - Additional event data
     * @returns {Event} New Event instance
     */
    static createMatchEvent(eventType, serverId, data = {}) {
        return new Event({
            serverId,
            type: `match.${eventType}`,
            data: { ...data, timestamp: new Date() }
        });
    }
    
    /**
     * Create a system event
     * @param {string} eventType - Specific event type (startup, shutdown, error, etc.)
     * @param {Object} data - Additional event data
     * @returns {Event} New Event instance
     */
    static createSystemEvent(eventType, data = {}) {
        return new Event({
            type: `system.${eventType}`,
            data: { ...data, timestamp: new Date() }
        });
    }
    
    /**
     * Create a plugin event
     * @param {string} pluginName - Name of the plugin
     * @param {string} eventType - Specific event type
     * @param {Object} data - Additional event data
     * @returns {Event} New Event instance
     */
    static createPluginEvent(pluginName, eventType, data = {}) {
        return new Event({
            type: `plugin.${pluginName}.${eventType}`,
            data: { ...data, timestamp: new Date(), pluginName }
        });
    }
}

module.exports = Event;
