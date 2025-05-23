/**
 * Stats Command - Display player statistics
 */
const BaseCommand = require('../../commands/BaseCommand');

class StatsCommand extends BaseCommand {
    /**
     * Create a new StatsCommand instance
     * @param {Object} services - Services container
     */
    constructor(services) {
        super({
            name: 'stats',
            aliases: ['mystats', 'stat'],
            description: 'Display your game statistics',
            usage: '.stats [player]',
            permission: null // No permission required
        });
        
        // Store services
        this.services = services;
        this.statsService = services.statsService;
        this.playerService = services.playerService;
        this.logService = services.logService;
        
        if (!this.statsService) {
            throw new Error('StatsService is required for StatsCommand');
        }
        
        const log = this.logService || console;
        log.debug('StatsCommand initialized');
    }
    
    /**
     * Execute the stats command
     * @param {Array<string>} args - Command arguments
     * @param {Object} context - Command execution context (player, server)
     * @returns {Promise<Object>} Command execution result
     */
    async execute(args, context) {
        try {
            const { player, server } = context;
            const log = this.logService || console;
            
            // Safety check
            if (!player) {
                log.warn('Stats command executed with invalid player');
                return { success: false, message: 'Invalid player' };
            }
            
            // Get target player (self or specified player)
            let targetPlayer = player;
            let targetId = player.id || player.Guid || player.guid;
            let isOtherPlayer = false;
            
            // Check if a player name was provided
            if (args.length > 0) {
                const targetName = args.join(' ');
                
                // Only admins and moderators can check other players' stats
                if (!this.checkPermission({ ...player, role: 'moderator' })) {
                    return { 
                        success: false, 
                        message: "^1You don't have permission to view other players' stats." 
                    };
                }
                
                // Find player by name
                const foundPlayer = await this._findPlayerByName(targetName, server);
                
                if (foundPlayer) {
                    targetPlayer = foundPlayer;
                    targetId = foundPlayer.id || foundPlayer.Guid || foundPlayer.guid;
                    isOtherPlayer = true;
                } else {
                    return { 
                        success: false, 
                        message: `^1Player '${targetName}' not found.` 
                    };
                }
            }
            
            // Get player stats
            const stats = await this.statsService.getPlayerStats(targetId);
            
            if (!stats) {
                return { 
                    success: true, 
                    message: isOtherPlayer 
                        ? `^3No stats found for player ${targetPlayer.name || targetName}.` 
                        : "^3No stats found for your account yet. Play some games to generate stats!" 
                };
            }
            
            // Format stats message
            const message = this._formatStatsMessage(stats, targetPlayer, isOtherPlayer);
            
            return { success: true, message };
        } catch (error) {
            const log = this.logService || console;
            log.error(`Error in stats command: ${error.message}`);
            
            return { 
                success: false, 
                message: `^1An error occurred while retrieving stats: ${error.message}` 
            };
        }
    }
    
    /**
     * Format stats message
     * @param {Object} stats - Player stats
     * @param {Object} player - Player object
     * @param {boolean} isOtherPlayer - Whether stats are for another player
     * @returns {string} Formatted stats message
     * @private
     */
    _formatStatsMessage(stats, player, isOtherPlayer = false) {
        // Calculate K/D ratio
        const kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(2);
        
        // Format time played
        const hours = Math.floor(stats.timePlayed / 3600);
        const minutes = Math.floor((stats.timePlayed % 3600) / 60);
        const formattedTime = `${hours}h ${minutes}m`;
        
        const playerName = player.name || player.Name || 'Unknown';
        
        // Format full stats message
        let header = isOtherPlayer
            ? `^5--- ${playerName}'s Stats ---`
            : "^5--- Your Stats ---";
            
        return `${header}
^7K/D: ^3${kd}
^7Kills: ^2${stats.kills}
^7Deaths: ^1${stats.deaths}
^7Score: ^5${stats.score}
^7Time played: ^6${formattedTime}
^5----------------`;
    }
    
    /**
     * Find a player by name
     * @param {string} name - Player name to search for
     * @param {Object} server - Server instance
     * @returns {Promise<Object|null>} Found player or null
     * @private
     */
    async _findPlayerByName(name, server) {
        try {
            // Try to find player in active players on server
            if (server && server.getPlayerByName) {
                const player = await server.getPlayerByName(name);
                if (player) return player;
            }
            
            // Try player service if available
            if (this.playerService) {
                const player = await this.playerService.findPlayerByName(name);
                if (player) return player;
            }
            
            return null;
        } catch (error) {
            const log = this.logService || console;
            log.error(`Error finding player by name: ${error.message}`);
            return null;
        }
    }
}

module.exports = StatsCommand;
