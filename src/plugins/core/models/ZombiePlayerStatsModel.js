/**
 * ZombiePlayerStatsModel - Represents player statistics in zombies mode
 */
class ZombiePlayerStatsModel {
    /**
     * Create a new ZombiePlayerStatsModel instance
     * @param {Object} data - Player stats data
     */
    constructor(data = {}) {
        // Player identification
        this.guid = data.guid || data.player_guid || '';
        this.name = data.name || data.player_name || '';
        
        // Core stats
        this.kills = data.kills || 0;
        this.deaths = data.deaths || 0;
        this.downs = data.downs || 0;
        this.revives = data.revives || 0;
        this.headshotKills = data.headshotKills || data.headshot_kills || 0;
        this.score = data.score || 0;
        
        // Match stats
        this.matchesPlayed = data.matchesPlayed || data.matches_played || 0;
        this.highestRound = data.highestRound || data.highest_round || 0;
        this.totalRounds = data.totalRounds || data.total_rounds || 0;
        
        // Item usage
        this.perks = data.perks || 0;
        this.powerUps = data.powerUps || data.power_ups || 0;
        
        // Timestamps
        this.firstSeen = data.firstSeen || data.first_seen || new Date();
        this.lastSeen = data.lastSeen || data.last_seen || new Date();
    }
    
    /**
     * Calculate the kill-death ratio
     * @returns {number} KD ratio
     */
    getKdRatio() {
        return this.deaths > 0 ? Number((this.kills / this.deaths).toFixed(2)) : this.kills;
    }
    
    /**
     * Calculate average kills per match
     * @returns {number} Average kills
     */
    getAvgKillsPerMatch() {
        return this.matchesPlayed > 0 ? Number((this.kills / this.matchesPlayed).toFixed(2)) : 0;
    }
    
    /**
     * Calculate headshot percentage
     * @returns {number} Headshot percentage
     */
    getHeadshotPercentage() {
        return this.kills > 0 ? Number(((this.headshotKills / this.kills) * 100).toFixed(2)) : 0;
    }
    
    /**
     * Update stats from a match update
     * @param {Object} update - Stats update data
     * @returns {ZombiePlayerStatsModel} Updated model
     */
    update(update) {
        if (!update) return this;
        
        // Add numeric stats
        this.kills += update.kills || 0;
        this.deaths += update.deaths || 0;
        this.downs += update.downs || 0;
        this.revives += update.revives || 0;
        this.headshotKills += update.headshotKills || update.headshot_kills || 0;
        this.score += update.score || 0;
        this.perks += update.perks || 0;
        this.powerUps += update.powerUps || update.power_ups || 0;
        
        // Update max round if higher
        const round = update.round || 0;
        if (round > this.highestRound) {
            this.highestRound = round;
        }
        
        // Count rounds
        this.totalRounds += 1;
        
        // Update timestamps
        this.lastSeen = new Date();
        
        return this;
    }
    
    /**
     * Record a match completion
     * @param {number} round - Final round reached
     */
    recordMatchCompletion(round) {
        this.matchesPlayed += 1;
        
        if (round > this.highestRound) {
            this.highestRound = round;
        }
        
        this.lastSeen = new Date();
    }
    
    /**
     * Convert model to database row format
     * @returns {Object} Database row representation
     */
    toDatabase() {
        return {
            player_guid: this.guid,
            player_name: this.name,
            kills: this.kills,
            deaths: this.deaths,
            downs: this.downs,
            revives: this.revives,
            headshot_kills: this.headshotKills,
            score: this.score,
            matches_played: this.matchesPlayed,
            highest_round: this.highestRound,
            total_rounds: this.totalRounds,
            perks: this.perks,
            power_ups: this.powerUps,
            first_seen: this.firstSeen instanceof Date ? this.firstSeen.toISOString() : this.firstSeen,
            last_seen: this.lastSeen instanceof Date ? this.lastSeen.toISOString() : this.lastSeen
        };
    }
    
    /**
     * Create a ZombiePlayerStatsModel from a database row
     * @param {Object} row - Database row
     * @returns {ZombiePlayerStatsModel} New instance
     */
    static fromDatabase(row) {
        if (!row) return null;
        
        return new ZombiePlayerStatsModel({
            guid: row.player_guid,
            name: row.player_name,
            kills: row.kills,
            deaths: row.deaths,
            downs: row.downs,
            revives: row.revives,
            headshotKills: row.headshot_kills,
            score: row.score,
            matchesPlayed: row.matches_played,
            highestRound: row.highest_round,
            totalRounds: row.total_rounds,
            perks: row.perks,
            powerUps: row.power_ups,
            firstSeen: row.first_seen ? new Date(row.first_seen) : null,
            lastSeen: row.last_seen ? new Date(row.last_seen) : null
        });
    }
    
    /**
     * Convert to API response format
     * @returns {Object} API representation
     */
    toJSON() {
        return {
            guid: this.guid,
            name: this.name,
            stats: {
                kills: this.kills,
                deaths: this.deaths,
                downs: this.downs,
                revives: this.revives,
                headshotKills: this.headshotKills,
                score: this.score,
                kdRatio: this.getKdRatio(),
                headshotPercentage: this.getHeadshotPercentage(),
                avgKillsPerMatch: this.getAvgKillsPerMatch()
            },
            matches: {
                played: this.matchesPlayed,
                highestRound: this.highestRound,
                totalRounds: this.totalRounds
            },
            items: {
                perks: this.perks,
                powerUps: this.powerUps
            },
            firstSeen: this.firstSeen,
            lastSeen: this.lastSeen
        };
    }
}

module.exports = ZombiePlayerStatsModel;