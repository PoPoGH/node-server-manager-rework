/**
 * Match Model - Defines the schema and methods for Match objects
 */
class Match {
    /**
     * Create a new Match object
     * @param {Object} data - Match data
     */
    constructor(data = {}) {
        // Core identifiers
        this.id = data.id || null;
        this.serverId = data.serverId || data.server_id || null;
        
        // Match details
        this.mapName = data.mapName || data.map_name || '';
        this.gamemode = data.gamemode || '';
        
        // Timestamps
        this.startTime = data.startTime || data.start_time || new Date();
        this.endTime = data.endTime || data.end_time || null;
        this.durationSeconds = data.durationSeconds || data.duration_seconds || 0;
        
        // Players and stats
        this.players = data.players || []; // Array of player GUIDs or Player objects
        this.stats = data.stats || {};     // Object containing match statistics
        
        // Raw data (for debugging or extension)
        this.rawData = data.rawData || null;
    }
    
    /**
     * Convert database row to Match model
     * @param {Object} row - Database row
     * @returns {Match} Match instance
     */
    static fromDatabaseRow(row) {
        if (!row) return null;
        
        let players = [];
        let stats = {};
        
        try {
            if (row.players) {
                players = JSON.parse(row.players);
            }
            
            if (row.stats) {
                stats = JSON.parse(row.stats);
            }
        } catch (e) {
            console.error('Error parsing match JSON data:', e);
        }
        
        return new Match({
            id: row.id,
            serverId: row.server_id,
            mapName: row.map_name,
            startTime: row.start_time,
            endTime: row.end_time,
            durationSeconds: row.duration_seconds,
            players: players,
            stats: stats
        });
    }
    
    /**
     * Convert to database format for storage
     * @returns {Object} Database format
     */
    toDatabase() {
        return {
            server_id: this.serverId,
            map_name: this.mapName,
            gamemode: this.gamemode,
            start_time: this.startTime,
            end_time: this.endTime,
            duration_seconds: this.durationSeconds,
            players: JSON.stringify(this.players),
            stats: JSON.stringify(this.stats)
        };
    }
    
    /**
     * Calculate and update the duration of the match
     */
    calculateDuration() {
        if (this.startTime && this.endTime) {
            const start = new Date(this.startTime);
            const end = new Date(this.endTime);
            this.durationSeconds = Math.floor((end - start) / 1000);
        }
        return this.durationSeconds;
    }
    
    /**
     * End the match
     * @param {Object} finalStats Final match statistics
     */
    endMatch(finalStats = {}) {
        this.endTime = new Date();
        this.calculateDuration();
        this.stats = {...this.stats, ...finalStats, final: true};
    }
    
    /**
     * Convert to API response format
     * @returns {Object} API format
     */
    toJSON() {
        return {
            id: this.id,
            serverId: this.serverId,
            mapName: this.mapName,
            gamemode: this.gamemode,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.durationSeconds,
            players: this.players,
            stats: this.stats
        };
    }
}

module.exports = Match;
