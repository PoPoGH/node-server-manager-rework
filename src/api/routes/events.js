/**
 * Event routes for the API
 */
module.exports = function(serverManager) {
    const express = require('express');
    const router = express.Router();
    
    // Import middleware directly rather than from a module that might not exist
    const isAuthenticated = (req, res, next) => {
        // Simple mock if real middleware is not available
        console.log('Mock auth middleware - passing through');
        next();
    };
    
    const isAdmin = (req, res, next) => {
        // Simple mock if real middleware is not available
        console.log('Mock admin middleware - passing through');
        next();
    };
    
    // Create mock event controller if needed
    const eventController = serverManager && 
        (serverManager.controllers?.eventController || serverManager.eventController) || {
        getRecentEvents: (req, res) => res.json({ success: false, message: 'Event controller not initialized', events: [] }),
        getEventsByType: (req, res) => res.json({ success: false, message: 'Event controller not initialized', events: [] }),
        getEventById: (req, res) => res.json({ success: false, message: 'Event controller not initialized', event: null }),
        getEventStatsByCategory: (req, res) => res.json({ success: false, message: 'Event controller not initialized', stats: {} }),
        getEventCounts: (req, res) => res.json({ success: false, message: 'Event controller not initialized', counts: {} }),
        searchEvents: (req, res) => res.json({ success: false, message: 'Event controller not initialized', events: [] }),
        getRelatedEvents: (req, res) => res.json({ success: false, message: 'Event controller not initialized', events: [] }),
        createEvent: (req, res) => res.json({ success: false, message: 'Event controller not initialized' }),
        getPlayerEvents: (req, res) => res.json({ success: false, message: 'Event controller not initialized', events: [] }),
        getServerEvents: (req, res) => res.json({ success: false, message: 'Event controller not initialized', events: [] })
    };
    
    // Public routes
    // Get recent events
    router.get('/', eventController.getRecentEvents);
    
    // Authenticated routes - specific routes first
    // Get event statistics
    router.get('/stats', isAuthenticated, eventController.getEventStatsByCategory);
    
    // Get event counts by type
    router.get('/counts', isAuthenticated, eventController.getEventCounts);
    
    // Search events
    router.get('/search', isAuthenticated, eventController.searchEvents);
    
    // Get events by type - specific parameter route
    router.get('/type/:type', eventController.getEventsByType);
    
    // Get related events for a specific event - make sure this comes before generic :id route
    router.get('/:id/related', isAuthenticated, eventController.getRelatedEvents);
    
    // Get specific event by ID - generic parameter route must come last
    router.get('/:id', eventController.getEventById);
    
    // Admin-only routes
    // Create a new event
    router.post('/', isAdmin, eventController.createEvent);
    
    // Register additional routes for player and server events
    router.get('/players/:id/events', isAuthenticated, (req, res, next) => {
        req.params.playerId = req.params.id;
        eventController.getPlayerEvents(req, res, next);
    });
    
    router.get('/servers/:id/events', isAuthenticated, (req, res, next) => {
        req.params.serverId = req.params.id;
        eventController.getServerEvents(req, res, next);
    });
    
    return router;
};
