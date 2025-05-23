/**
 * ZombieMatchModel - Represents a zombies match with stats
 */
class ZombieMatchModel {
    /**
     * Create a new ZombieMatchModel instance
     * @param {Object} data - Match data
     */
    constructor(data = {}) {
        // Core data
        this.id = data.id || data.match_id || null;
        this.serverId = data.serverId || data.server_id || '';
        this.mapName = data.mapName || data.map_name || '';
        this.round = data.round || 0;
        this.maxRound = data.maxRound || data.max_round || 0;
        
        // Times
        this.startTime = data.startTime || data.start_time || new Date();
        this.endTime = data.endTime || data.end_time || null;
        
        // Players
        this.playerGuids = data.playerGuids || data.player_guids || [];
        
        // Match stats
        this.stats = data.stats || {};
    }

    /**
     * Check if the match is active
     * @returns {boolean} Whether match is active
     */
    isActive() {
        return !this.endTime;
    }

    /**
     * Calculate the match duration in seconds
     * @returns {number} Duration in seconds
     */
    getDuration() {
        if (!this.endTime) return 0;
        
        const start = new Date(this.startTime);
        const end = new Date(this.endTime);
        return Math.floor((end - start) / 1000);
    }
    
    /**
     * Convert model to database row format
     * @returns {Object} Database row representation
     */
    toDatabase() {
        return {
            match_id: this.id,
            server_id: this.serverId,
            map_name: this.mapName,
            round: this.round,
            max_round: this.maxRound,
            start_time: this.startTime instanceof Date ? this.startTime.toISOString() : this.startTime,
            end_time: this.endTime instanceof Date ? this.endTime?.toISOString() : this.endTime,
            player_guids: Array.isArray(this.playerGuids) ? JSON.stringify(this.playerGuids) : '[]',
            stats: typeof this.stats === 'object' ? JSON.stringify(this.stats) : '{}'
        };
    }
    
    /**
     * Create a ZombieMatchModel from a database row
     * @param {Object} row - Database row
     * @returns {ZombieMatchModel} New instance
     */
    static fromDatabase(row) {
        if (!row) return null;
        
        // Parse JSON fields
        let playerGuids = [];
        let stats = {};
        
        try {
            playerGuids = row.player_guids ? JSON.parse(row.player_guids) : [];
            stats = row.stats ? JSON.parse(row.stats) : {};
        } catch (error) {
            console.error('Error parsing JSON from database:', error);
        }
        
        return new ZombieMatchModel({
            id: row.match_id,
            serverId: row.server_id,
            mapName: row.map_name,
            round: row.round,
            maxRound: row.max_round,
            startTime: row.start_time ? new Date(row.start_time) : null,
            endTime: row.end_time ? new Date(row.end_time) : null,
            playerGuids,
            stats
        });
    }
    
    /**
     * Convert to API response format
     * @returns {Object} API representation
     */
    toJSON() {
        return {
            id: this.id,
            serverId: this.serverId,
            mapName: this.mapName,
            round: this.round,
            maxRound: this.maxRound,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.getDuration(),
            playerGuids: this.playerGuids,
            stats: this.stats,
            playerCount: this.playerGuids.length,
            active: this.isActive()
        };
    }
}

module.exports = ZombieMatchModel;