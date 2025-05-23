/**
 * Match routes for the API
 */
module.exports = function(serverManager) {
    const express = require('express');
    const router = express.Router();
    
    // Create a mock controller if needed
    const matchController = serverManager && 
        (serverManager.controllers?.matchController || serverManager.matchController) || {
        getRecentMatches: (req, res) => res.json({ success: false, message: 'Match controller not initialized', matches: [] }),
        getMatchById: (req, res) => res.json({ success: false, message: 'Match controller not initialized', match: null }),
        getMatchPlayers: (req, res) => res.json({ success: false, message: 'Match controller not initialized', players: [] }),
        getMatchStats: (req, res) => res.json({ success: false, message: 'Match controller not initialized', stats: {} })
    };
    
    // Get recent matches
    router.get('/', matchController.getRecentMatches);
    
    // Get match by ID
    router.get('/:id', matchController.getMatchById);
    
    // Get players for a specific match
    router.get('/:id/players', matchController.getMatchPlayers);
    
    // Get statistics for a specific match
    router.get('/:id/stats', matchController.getMatchStats);
    
    return router;
};
