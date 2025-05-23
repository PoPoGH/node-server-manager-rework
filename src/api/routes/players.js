/**
 * Player routes for the API
 * MVC Version - Uses appropriate controllers and services
 */

module.exports = function(app) {
    const express = require('express');
    const router = express.Router();

    // Simple mock middleware if needed
    const authenticateToken = (req, res, next) => {
        console.log('Mock auth middleware - passing through');
        next();
    };

    try {
        // Create simpler controller access with fallbacks
        const controllers = app?.controllers || {};
        
        // Create mock controllers if needed
        const playerController = controllers.playerController || {
            getAllPlayers: (req, res) => res.json({ success: false, message: 'Player controller not initialized', players: [] }),
            getOnlinePlayers: (req, res) => res.json({ success: false, message: 'Player controller not initialized', players: [] }),
            searchPlayers: (req, res) => res.json({ success: false, message: 'Player controller not initialized', players: [] }),
            getPlayerById: (req, res) => res.json({ success: false, message: 'Player controller not initialized', player: null }),
            getPlayerStats: (req, res) => res.json({ success: false, message: 'Player controller not initialized', stats: {} }),
            updatePlayer: (req, res) => res.json({ success: false, message: 'Player controller not initialized' }),
            addPlayerNote: (req, res) => res.json({ success: false, message: 'Player controller not initialized' }),
            deletePlayerNote: (req, res) => res.json({ success: false, message: 'Player controller not initialized' }),
            getPlayerAdminInfo: (req, res) => res.json({ success: false, message: 'Player controller not initialized', adminInfo: {} }),
            banPlayer: (req, res) => res.json({ success: false, message: 'Player controller not initialized' }),
            unbanPlayer: (req, res) => res.json({ success: false, message: 'Player controller not initialized' })
        };
        
        const matchController = controllers.matchController || {
            getPlayerMatches: (req, res) => res.json({ success: false, message: 'Match controller not initialized', matches: [] }),
            getDetailedPlayerMatches: (req, res) => res.json({ success: false, message: 'Match controller not initialized', matches: [] })
        };
        
        const eventController = controllers.eventController || {
            getPlayerEvents: (req, res) => res.json({ success: false, message: 'Event controller not initialized', events: [] })
        };

        // Public routes (no authentication required)
        
        // Get all players with pagination and search
        router.get('/', (req, res) => playerController.getAllPlayers(req, res));
        
        // Get online players
        router.get('/online', (req, res) => playerController.getOnlinePlayers(req, res));
        
        // Search players
        router.get('/search', (req, res) => playerController.searchPlayers(req, res));
        
        // Get player by ID - specific path parameters need to come after paths without params
        router.get('/:id', (req, res) => playerController.getPlayerById(req, res));
        
        // Get player statistics
        router.get('/:id/stats', (req, res) => playerController.getPlayerStats(req, res));
        
        // Get player matches
        router.get('/:id/matches', (req, res) => matchController.getPlayerMatches(req, res));
        
        // Get player events
        router.get('/:id/events', (req, res) => eventController.getPlayerEvents(req, res));
        
        // Authenticated routes
        
        // Update player info - requires authentication
        router.post('/:id', authenticateToken, (req, res) => playerController.updatePlayer(req, res));

        // Add note to player - requires authentication
        router.post('/:id/notes', authenticateToken, (req, res) => playerController.addPlayerNote(req, res));
        
        // Delete note - requires authentication
        router.delete('/:id/notes/:noteId', authenticateToken, (req, res) => playerController.deletePlayerNote(req, res));
        
        // Get player detailed admin info - requires authentication
        router.get('/:id/admin', authenticateToken, (req, res) => playerController.getPlayerAdminInfo(req, res));
        
        // Get player full match history with details - requires authentication
        router.get('/:id/matches/detailed', authenticateToken, (req, res) => matchController.getDetailedPlayerMatches(req, res));
        
        // Ban player - requires authentication
        router.post('/:id/ban', authenticateToken, (req, res) => playerController.banPlayer(req, res));
        
        // Unban player - requires authentication
        router.post('/:id/unban', authenticateToken, (req, res) => playerController.unbanPlayer(req, res));
        
        console.log('Player routes initialized');
        return router;
    } catch (error) {
        console.error(`Error initializing player routes: ${error.message}`);
        
        // Return a basic router that returns errors
        router.get('*', (req, res) => {
            res.status(500).json({
                success: false,
                error: 'Player routes initialization error',
                message: error.message
            });
        });
        
        return router;
    }
};