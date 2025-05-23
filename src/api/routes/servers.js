/**
 * Server routes for the API
 */
module.exports = function(serverManager) {
    const express = require('express');
    const router = express.Router();
    
    // Create a simple mock controller if real one is not available
    // This helps avoid errors during initialization
    const serverController = serverManager && 
        (serverManager.controllers?.serverController || serverManager.serverController) || {
        getAllServers: (req, res) => res.json({ success: false, message: 'Server controller not initialized', servers: [] }),
        getServerById: (req, res) => res.json({ success: false, message: 'Server controller not initialized', server: null }),
        getServerStatus: (req, res) => res.json({ success: false, message: 'Server controller not initialized', status: 'unknown' }),
        getServerPlayers: (req, res) => res.json({ success: false, message: 'Server controller not initialized', players: [] }),
        getServerStats: (req, res) => res.json({ success: false, message: 'Server controller not initialized', stats: {} }),
        getServerLogs: (req, res) => res.json({ success: false, message: 'Server controller not initialized', logs: [] }),
        startServer: (req, res) => res.json({ success: false, message: 'Server controller not initialized' }),
        stopServer: (req, res) => res.json({ success: false, message: 'Server controller not initialized' }),
        restartServer: (req, res) => res.json({ success: false, message: 'Server controller not initialized' })
    };
    
    // Get all servers
    router.get('/', serverController.getAllServers);
    
    // Get server by ID
    router.get('/:id', serverController.getServerById);
    
    // Get server status
    router.get('/:id/status', serverController.getServerStatus);
    
    // Get players on a server
    router.get('/:id/players', serverController.getServerPlayers);
    
    // Get server statistics
    router.get('/:id/stats', serverController.getServerStats);
    
    // Get server logs
    router.get('/:id/logs', serverController.getServerLogs);
    
    // Start a server
    router.post('/:id/start', serverController.startServer);
    
    // Stop a server
    router.post('/:id/stop', serverController.stopServer);
    
    // Restart a server
    router.post('/:id/restart', serverController.restartServer);
    
    return router;
};
