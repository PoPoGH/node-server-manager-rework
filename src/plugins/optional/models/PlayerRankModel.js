/**
 * PlayerRankModel - Represents a player's rank data
 */
class PlayerRankModel {
    /**
     * Create a new PlayerRankModel instance
     * @param {Object} data - Player rank data
     */
    constructor(data = {}) {
        // Core data
        this.playerId = data.playerId || data.player_id || null;
        this.rankId = data.rankId || data.rank_id || 0; // Default to lowest rank
        this.kills = data.kills || 0;
        this.deaths = data.deaths || 0;
        this.matches = data.matches || 0;
        
        // Timestamps
        this.lastUpdated = data.lastUpdated || data.last_updated || new Date();
        this.rankAchieved = data.rankAchieved || data.rank_achieved || new Date();
        
        // Associated data (not stored in DB)
        this.rankData = data.rankData || null;
    }
    
    /**
     * Calculate the kill-death ratio
     * @returns {number} KD ratio
     */
    getKdRatio() {
        return this.deaths > 0 ? Number((this.kills / this.deaths).toFixed(2)) : this.kills;
    }
    
    /**
     * Check if player meets the requirements for a specific rank
     * @param {Object} rank - Rank definition with minKills
     * @returns {boolean} Whether player qualifies for this rank
     */
    qualifiesForRank(rank) {
        return this.kills >= rank.minKills;
    }
    
    /**
     * Get the highest rank the player qualifies for
     * @param {Array<Object>} ranks - Array of rank definitions
     * @returns {Object} Highest qualifying rank
     */
    getHighestRank(ranks) {
        // Sort ranks by minKills in descending order
        const sortedRanks = [...ranks].sort((a, b) => b.minKills - a.minKills);
        
        // Find the highest rank player qualifies for
        for (const rank of sortedRanks) {
            if (this.qualifiesForRank(rank)) {
                return rank;
            }
        }
        
        // Default to the lowest rank
        return ranks[0];
    }
    
    /**
     * Convert model to database row format
     * @returns {Object} Database row representation
     */
    toDatabase() {
        return {
            player_id: this.playerId,
            rank_id: this.rankId,
            kills: this.kills,
            deaths: this.deaths,
            matches: this.matches,
            last_updated: this.lastUpdated.toISOString(),
            rank_achieved: this.rankAchieved.toISOString()
        };
    }
    
    /**
     * Create a PlayerRankModel from a database row
     * @param {Object} row - Database row
     * @returns {PlayerRankModel} New instance
     */
    static fromDatabase(row) {
        if (!row) return null;
        
        return new PlayerRankModel({
            playerId: row.player_id,
            rankId: row.rank_id,
            kills: row.kills,
            deaths: row.deaths,
            matches: row.matches,
            lastUpdated: new Date(row.last_updated),
            rankAchieved: new Date(row.rank_achieved)
        });
    }
    
    /**
     * Convert to API response format
     * @returns {Object} API representation
     */
    toJSON() {
        return {
            playerId: this.playerId,
            rankId: this.rankId,
            stats: {
                kills: this.kills,
                deaths: this.deaths,
                matches: this.matches,
                kdRatio: this.getKdRatio()
            },
            lastUpdated: this.lastUpdated,
            rankAchieved: this.rankAchieved,
            rank: this.rankData
        };
    }
}

module.exports = PlayerRankModel;
