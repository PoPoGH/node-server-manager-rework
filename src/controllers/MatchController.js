/**
 * Match Controller - Handles match-related API endpoints
 */
const MatchService = require('../services/MatchService');
const PlayerService = require('../services/PlayerService');

class MatchController {
    /**
     * Create a new MatchController
     * @param {Object} db - Database connection
     */
    constructor(db) {
        this.matchService = new MatchService(db);
        this.playerService = new PlayerService(db);
        this.db = db;
        
        // Bind methods to ensure 'this' context
        this.getRecentMatches = this.getRecentMatches.bind(this);
        this.getMatchById = this.getMatchById.bind(this);
        this.getMatchPlayers = this.getMatchPlayers.bind(this);
        this.getMatchStats = this.getMatchStats.bind(this);
        this.getPlayerMatches = this.getPlayerMatches.bind(this);
    }
    
    /**
     * Get recent matches with pagination
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getRecentMatches(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;
            
            const result = await this.matchService.getRecentMatches(limit, offset);
            
            res.json({
                success: true,
                total: result.total,
                limit: result.limit,
                offset: result.offset,
                matches: result.matches.map(m => m.toJSON())
            });
        } catch (error) {
            console.error('Error in MatchController.getRecentMatches:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving matches: ' + error.message
            });
        }
    }
    
    /**
     * Get match by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getMatchById(req, res) {
        try {
            const matchId = parseInt(req.params.id);
            const match = await this.matchService.getMatchById(matchId);
            
            if (!match) {
                return res.status(404).json({
                    success: false,
                    error: 'Match not found'
                });
            }
            
            res.json({
                success: true,
                match: match.toJSON()
            });
        } catch (error) {
            console.error('Error in MatchController.getMatchById:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving match: ' + error.message
            });
        }
    }
    
    /**
     * Get players who participated in a match
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getMatchPlayers(req, res) {
        try {
            const matchId = parseInt(req.params.id);
            const match = await this.matchService.getMatchById(matchId);
            
            if (!match) {
                return res.status(404).json({
                    success: false,
                    error: 'Match not found'
                });
            }
            
            const players = await this.matchService.getMatchPlayers(matchId);
            
            res.json({
                success: true,
                match: match.toJSON(),
                players: players.map(p => p.toJSON())
            });
        } catch (error) {
            console.error('Error in MatchController.getMatchPlayers:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving match players: ' + error.message
            });
        }
    }
    
    /**
     * Get statistics for a match
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getMatchStats(req, res) {
        try {
            const matchId = parseInt(req.params.id);
            const match = await this.matchService.getMatchById(matchId);
            
            if (!match) {
                return res.status(404).json({
                    success: false,
                    error: 'Match not found'
                });
            }
            
            const stats = await this.matchService.getMatchStats(matchId);
            
            res.json({
                success: true,
                match: match.toJSON(),
                stats
            });
        } catch (error) {
            console.error('Error in MatchController.getMatchStats:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving match stats: ' + error.message
            });
        }
    }
    
    /**
     * Get matches that a player has participated in
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getPlayerMatches(req, res) {
        try {
            const playerId = parseInt(req.params.id);
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;
            
            // Check if player exists
            const player = await this.playerService.getPlayerById(playerId);
            if (!player) {
                return res.status(404).json({
                    success: false,
                    error: 'Player not found'
                });
            }
            
            const result = await this.matchService.getPlayerMatches(playerId, limit, offset);
            
            res.json({
                success: true,
                player: player.toJSON(),
                total: result.total,
                limit: result.limit,
                offset: result.offset,
                matches: result.matches.map(m => m.toJSON())
            });
        } catch (error) {
            console.error('Error in MatchController.getPlayerMatches:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving player matches: ' + error.message
            });
        }
    }
}

module.exports = MatchController;
