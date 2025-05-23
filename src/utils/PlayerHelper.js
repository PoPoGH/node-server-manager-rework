/**
 * Player Helper Module for NSMR
 * Provides utility functions for working with player objects safely
 */

const logger = require('../core/logger');

class PlayerHelper {
    /**
     * Safely get a player by name
     * @param {Object} serverManager - Server manager instance
     * @param {string} playerName - Player name to find
     * @returns {Promise<Object|null>} Found player or null
     */
    static async getPlayerByName(serverManager, playerName) {
        if (!serverManager) {
            logger.warn('ServerManager not provided to getPlayerByName');
            return null;
        }

        try {
            // First try the official method if it exists
            if (typeof serverManager.getPlayerByName === 'function') {
                const player = await serverManager.getPlayerByName(playerName);
                if (player) {
                    return player;
                }
            }            // Fallback implementation: check all servers for matching player
            if (serverManager.servers && Array.isArray(serverManager.servers)) {
                for (const server of serverManager.servers) {
                    // Check if the server has players/clients
                    const players = server.players || server.Clients || [];
                    
                    // Find player by name
                    const player = players.find(p => 
                        (p.name && p.name.toLowerCase() === playerName.toLowerCase()) || 
                        (p.Name && p.Name.toLowerCase() === playerName.toLowerCase()) || 
                        (p.Origin && p.Origin.name && p.Origin.name.toLowerCase() === playerName.toLowerCase()) || 
                        (p.Origin && p.Origin.Name && p.Origin.Name.toLowerCase() === playerName.toLowerCase())
                    );
                    
                    if (player) {
                        return player;
                    }
                }
            } 
            
            // If servers array not available, try alternative methods
            if (serverManager.Clients && Array.isArray(serverManager.Clients)) {
                const player = serverManager.Clients.find(p => 
                    (p.name && p.name.toLowerCase() === playerName.toLowerCase()) || 
                    (p.Name && p.Name.toLowerCase() === playerName.toLowerCase())
                );
                
                if (player) return player;
            }
            
            return null;
        } catch (error) {
            logger.error(`Error in getPlayerByName: ${error.message}`);
            return null;
        }
    }

    /**
     * Safely get a player by ID
     * @param {Object} serverManager - Server manager instance
     * @param {string|number} playerId - Player ID to find
     * @returns {Promise<Object|null>} Found player or null
     */
    static async getPlayerById(serverManager, playerId) {
        if (!serverManager) {
            logger.warn('ServerManager not provided to getPlayerById');
            return null;
        }

        try {
            // First try the official method if it exists
            if (typeof serverManager.getPlayerById === 'function') {
                const player = await serverManager.getPlayerById(playerId);
                if (player) {
                    return player;
                }
            }            // Fallback implementation: check all servers for matching player
            if (serverManager.servers && Array.isArray(serverManager.servers)) {
                for (const server of serverManager.servers) {
                    // Check if the server has players/clients
                    const players = server.players || server.Clients || [];
                    
                    // Find player by various possible ID properties
                    const player = players.find(p => 
                        p.id === playerId || 
                        p.ClientId === playerId || 
                        p.Clientslot === playerId ||
                        String(p.id) === String(playerId) ||
                        String(p.ClientId) === String(playerId) ||
                        String(p.Clientslot) === String(playerId) ||
                        (p.Origin && (
                            p.Origin.id === playerId ||
                            p.Origin.ClientId === playerId ||
                            p.Origin.Clientslot === playerId ||
                            String(p.Origin.id) === String(playerId) ||
                            String(p.Origin.ClientId) === String(playerId) ||
                            String(p.Origin.Clientslot) === String(playerId)
                        ))
                    );
                    
                    if (player) {
                        return player;
                    }
                }
            }
            
            // If servers array not available, try alternative methods
            if (serverManager.Clients && Array.isArray(serverManager.Clients)) {
                const player = serverManager.Clients.find(p => 
                    p.id === playerId || 
                    p.ClientId === playerId || 
                    p.Clientslot === playerId ||
                    String(p.id) === String(playerId) ||
                    String(p.ClientId) === String(playerId) ||
                    String(p.Clientslot) === String(playerId)
                );
                
                if (player) return player;
            }
            
            return null;
        } catch (error) {
            logger.error(`Error in getPlayerById: ${error.message}`);
            return null;
        }
    }

    /**
     * Get player ID from player object in a resilient manner
     * @param {Object} player - Player object
     * @returns {string|number|null} Player ID or null if not found
     */
    static getPlayerId(player) {
        if (!player) return null;
        
        // Try various possible ID properties
        return player.id || 
               player.ClientId || 
               player.Clientslot || 
               (player.Origin ? (
                   player.Origin.id || 
                   player.Origin.ClientId || 
                   player.Origin.Clientslot
               ) : null);
    }

    /**
     * Get player name from player object in a resilient manner
     * @param {Object} player - Player object
     * @returns {string} Player name or "Unknown" if not found
     */
    static getPlayerName(player) {
        if (!player) return "Unknown";
        
        return player.name || 
               player.Name || 
               (player.Origin ? (
                   player.Origin.name || 
                   player.Origin.Name
               ) : "Unknown");
    }

    /**
     * Check if player has admin permissions
     * @param {Object} player - Player object
     * @returns {boolean} True if player has admin permissions
     */
    static isPlayerAdmin(player) {
        if (!player) return false;
        
        return player.isAdmin === true || 
               (player.Origin && player.Origin.isAdmin === true);
    }
}

module.exports = PlayerHelper;
