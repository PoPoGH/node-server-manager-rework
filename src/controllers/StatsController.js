/**
 * Stats Controller - Handles statistics-related API endpoints
 */
const StatsService = require('../services/StatsService');

class StatsController {
    /**
     * Create a new StatsController
     * @param {Object} db - Database connection
     */
    constructor(db) {
        this.statsService = new StatsService(db);
        
        // Bind methods to ensure 'this' context
        this.getLeaderboard = this.getLeaderboard.bind(this);
        this.getPeriodSummary = this.getPeriodSummary.bind(this);
        this.updatePlayerStats = this.updatePlayerStats.bind(this);
        this.resetPlayerStats = this.resetPlayerStats.bind(this);
    }
    
    /**
     * Get statistics leaderboard
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getLeaderboard(req, res) {
        try {
            const periodType = req.query.periodType || 'all';
            const periodKey = req.query.periodKey || null;
            const orderBy = req.query.orderBy || 'kills';
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;
            const search = req.query.search || '';
            
            // Validate periodType
            const validPeriodTypes = ['all', 'weekly', 'monthly', 'yearly'];
            if (!validPeriodTypes.includes(periodType)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid period type. Must be one of: all, weekly, monthly, yearly'
                });
            }
            
            // Validate orderBy
            const validOrderFields = ['kills', 'downs', 'revives', 'headshots', 'rounds_survived', 'highest_round', 'highest_score'];
            if (!validOrderFields.includes(orderBy)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid order field. Must be one of: ${validOrderFields.join(', ')}`
                });
            }
            
            const leaderboard = await this.statsService.getLeaderboard({
                periodType,
                periodKey,
                orderBy,
                limit,
                offset,
                search
            });
            
            // Get period summary if applicable
            let summary = null;
            if (periodType !== 'all') {
                summary = await this.statsService.getPeriodSummary(periodType, periodKey);
            }
            
            res.json({
                success: true,
                periodType,
                periodKey,
                orderBy,
                total: leaderboard.total,
                limit: leaderboard.limit,
                offset: leaderboard.offset,
                items: leaderboard.items,
                summary
            });
        } catch (error) {
            console.error('Error in StatsController.getLeaderboard:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving leaderboard: ' + error.message
            });
        }
    }
    
    /**
     * Get period summary statistics
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getPeriodSummary(req, res) {
        try {
            const periodType = req.query.periodType || 'weekly';
            const periodKey = req.query.periodKey || null;
            
            // Validate periodType
            const validPeriodTypes = ['weekly', 'monthly', 'yearly'];
            if (!validPeriodTypes.includes(periodType)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid period type. Must be one of: weekly, monthly, yearly'
                });
            }
            
            const summary = await this.statsService.getPeriodSummary(periodType, periodKey);
            
            res.json({
                success: true,
                summary
            });
        } catch (error) {
            console.error('Error in StatsController.getPeriodSummary:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving period summary: ' + error.message
            });
        }
    }
    
    /**
     * Update player statistics
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async updatePlayerStats(req, res) {
        try {
            const { guid, name, stats } = req.body;
            
            // Validate required fields
            if (!guid || !name || !stats) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: guid, name, stats'
                });
            }
            
            // Update player stats
            const updatedStats = await this.statsService.updatePlayerStats(guid, name, stats);
            
            res.json({
                success: true,
                stats: updatedStats
            });
        } catch (error) {
            console.error('Error in StatsController.updatePlayerStats:', error);
            res.status(500).json({
                success: false,
                error: 'Error updating player statistics: ' + error.message
            });
        }
    }
    
    /**
     * Reset a player's current stats
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async resetPlayerStats(req, res) {
        try {
            const { guid } = req.body;
            
            // Validate required fields
            if (!guid) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required field: guid'
                });
            }
            
            // Reset player stats
            const success = await this.statsService.resetCurrentStats(guid);
            
            if (!success) {
                return res.status(404).json({
                    success: false,
                    error: 'Player not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Player stats have been reset'
            });
        } catch (error) {
            console.error('Error in StatsController.resetPlayerStats:', error);
            res.status(500).json({
                success: false,
                error: 'Error resetting player statistics: ' + error.message
            });
        }
    }
    
    // Define routes for Express router
    registerRoutes(router) {
        router.get('/stats/leaderboard', this.getLeaderboard);
        router.get('/stats/summary', this.getPeriodSummary);
        router.post('/stats/update', this.updatePlayerStats);
        router.post('/stats/reset', this.resetPlayerStats);
        
        return router;
    }
}

module.exports = StatsController;
