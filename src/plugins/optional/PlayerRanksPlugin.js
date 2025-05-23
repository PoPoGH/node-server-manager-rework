/**
 * PlayerRanksPlugin - A plugin that manages player ranks based on stats
 * Demonstrates the full MVC architecture
 */
const BasePlugin = require('../../core/BasePlugin');

class PlayerRanksPlugin extends BasePlugin {
    constructor(serviceFactory) {
        super(serviceFactory);
        
        // Define plugin metadata
        this.name = 'PlayerRanksPlugin';
        this.version = '1.0.0';
        this.description = 'Manages player ranks based on performance statistics';
        this.author = 'Node Server Manager Team';
        
        // Define plugin features
        this.features = {
            rankAssignment: true,
            announcements: true,
            rankCommands: true,
            periodicUpdates: true,
            updateInterval: null
        };
    }
    
    /**
     * Load plugin configuration
     * @returns {Promise<void>}
     * @protected
     */
    async _loadConfig() {
        // Configuration was already loaded by BasePlugin, but we can customize it here
        this.config = {
            // Default configuration
            enabled: true,
            announceRankChanges: true,
            updateInterval: 3600000, // 1 hour
            ranks: [
                { name: "Recruit", minKills: 0, color: "^7" },
                { name: "Private", minKills: 50, color: "^2" },
                { name: "Specialist", minKills: 150, color: "^3" },
                { name: "Corporal", minKills: 300, color: "^3" },
                { name: "Sergeant", minKills: 500, color: "^4" },
                { name: "Lieutenant", minKills: 1000, color: "^5" },
                { name: "Captain", minKills: 2000, color: "^5" },
                { name: "Major", minKills: 3500, color: "^6" },
                { name: "Colonel", minKills: 5000, color: "^1" },
                { name: "General", minKills: 10000, color: "^1" }
            ],
            ...this.config
        };
        
        this.log('debug', 'Configuration loaded', this.config);
    }
    
    /**
     * Set up models used by this plugin
     * @returns {Promise<void>}
     * @protected
     */
    async _setupModels() {
        const PlayerRankModel = require('./models/PlayerRankModel');
        this.registerModel('PlayerRank', PlayerRankModel);
    }
    
    /**
     * Set up repositories used by this plugin
     * @returns {Promise<void>}
     * @protected
     */
    async _setupRepositories() {
        const db = this.getDatabaseConnection();
        if (!db) {
            throw new Error('Database connection is required for PlayerRanksPlugin');
        }
        
        const PlayerRankRepository = require('./repositories/PlayerRankRepository');
        this.registerRepository('playerRank', new PlayerRankRepository(db));
    }
    
    /**
     * Set up controllers used by this plugin
     * @returns {Promise<void>}
     * @protected
     */
    async _setupControllers() {
        const RankController = require('./controllers/RankController');
        this.registerController('rank', new RankController(
            this.repositories.playerRank,
            this.config.ranks,
            this.emitEvent.bind(this)
        ));
    }
    
    /**
     * Set up API routes
     * @returns {Promise<void>}
     * @protected
     */
    async _setupRoutes() {
        const apiService = this.getService('apiService');
        if (apiService) {
            apiService.registerRoutes('/ranks', this.controllers.rank.getRoutes());
            this.log('info', 'Registered rank API routes');
        }
    }
    
    /**
     * Set up event handlers
     * @returns {Promise<void>}
     * @protected
     */
    async _setupEventHandlers() {
        // Player events
        this.subscribe('player.connected', this._handlePlayerConnect);
        this.subscribe('player.kill', this._handlePlayerKill);
        this.subscribe('player.disconnected', this._handlePlayerDisconnect);
        
        // Command events
        const commandService = this.getService('commandService');
        if (commandService && this.features.rankCommands) {
            commandService.registerCommand('rank', {
                description: 'Show your current rank',
                usage: '!rank [player]',
                execute: async (server, player, args) => {
                    let targetId = player.id;
                    let targetName = player.name;
                    
                    if (args.length > 0) {
                        // Look up player by name
                        const playerService = this.getService('playerService');
                        if (playerService) {
                            const foundPlayer = await playerService.findPlayerByName(args[0]);
                            if (foundPlayer) {
                                targetId = foundPlayer.id;
                                targetName = foundPlayer.name;
                            } else {
                                return `Player ${args[0]} not found.`;
                            }
                        }
                    }
                    
                    const rankData = await this.controllers.rank.getPlayerRank(targetId);
                    if (!rankData) {
                        return `No rank data found for ${targetName}.`;
                    }
                    
                    return `${targetName} is ${rankData.rank.color}${rankData.rank.name}^7 with ${rankData.stats.kills} kills.`;
                }
            });
            
            this.log('info', 'Registered rank commands');
        }
        
        // Start periodic updates
        if (this.features.periodicUpdates) {
            this._startPeriodicUpdates();
        }
        
        this.log('info', 'Event handlers configured successfully');
    }
    
    /**
     * Handle player connection event
     * @param {Object} data - Event data
     * @private
     */
    async _handlePlayerConnect(data) {
        const { playerId, player } = data;
        if (!playerId || !this.features.rankAssignment) return;
        
        try {
            // Get player's rank
            const rankData = await this.controllers.rank.getPlayerRank(playerId);
            
            if (rankData && this.features.announcements) {
                const serverService = this.getService('serverService');
                const serverId = data.serverId;
                
                if (serverService && serverId) {
                    // Welcome the player with their rank
                    const welcomeMsg = `Welcome ${rankData.rank.color}${player.name}^7! Your rank: ${rankData.rank.color}${rankData.rank.name}`;
                    serverService.sendCommand(serverId, `say ${welcomeMsg}`);
                    
                    this.log('debug', `Announced rank for player ${player.name}: ${rankData.rank.name}`);
                }
            }
        } catch (error) {
            this.log('error', `Error handling player connection for ranks: ${error.message}`, error);
        }
    }
    
    /**
     * Handle player kill event
     * @param {Object} data - Event data
     * @private
     */
    async _handlePlayerKill(data) {
        const { playerId, player, victimId } = data;
        if (!playerId || !this.features.rankAssignment) return;
        
        try {
            // Update player's stats and check for rank change
            const rankChanged = await this.controllers.rank.incrementKills(playerId);
            
            if (rankChanged && this.features.announcements && this.config.announceRankChanges) {
                const serverService = this.getService('serverService');
                const serverId = data.serverId;
                
                if (serverService && serverId) {
                    // Get the new rank info
                    const rankData = await this.controllers.rank.getPlayerRank(playerId);
                    
                    if (rankData) {
                        // Announce rank change
                        const announceMsg = `${player.name} has been promoted to ${rankData.rank.color}${rankData.rank.name}^7!`;
                        serverService.sendCommand(serverId, `say ${announceMsg}`);
                    }
                }
            }
        } catch (error) {
            this.log('error', `Error handling player kill for ranks: ${error.message}`, error);
        }
    }
    
    /**
     * Handle player disconnection event
     * @param {Object} data - Event data
     * @private
     */
    async _handlePlayerDisconnect(data) {
        // Just log the event for debugging
        this.log('debug', `Player ${data.player.name} disconnected`);
    }
    
    /**
     * Start periodic rank updates
     * @private
     */
    _startPeriodicUpdates() {
        // Clear any existing interval
        if (this.features.updateInterval) {
            clearInterval(this.features.updateInterval);
        }
        
        // Set up a new interval for updating ranks
        const interval = this.config.updateInterval || 3600000; // 1 hour default
        
        this.features.updateInterval = setInterval(async () => {
            this.log('info', 'Running periodic rank updates');
            
            try {
                const updatedCount = await this.controllers.rank.updateAllRanks();
                this.log('info', `Updated ${updatedCount} player ranks`);
                
                // Emit event with results
                await this.emitEvent('ranksUpdated', {
                    count: updatedCount,
                    timestamp: new Date()
                });
            } catch (error) {
                this.log('error', `Error during periodic rank update: ${error.message}`, error);
            }
        }, interval);
        
        this.log('info', `Started periodic rank updates every ${interval/60000} minutes`);
    }
    
    /**
     * Clean up plugin resources
     * @returns {Promise<void>}
     * @protected
     */
    async _cleanupResources() {
        // Clear update interval
        if (this.features.updateInterval) {
            clearInterval(this.features.updateInterval);
            this.features.updateInterval = null;
            this.log('debug', 'Cleared periodic update interval');
        }
        
        // Unregister commands
        const commandService = this.getService('commandService');
        if (commandService && this.features.rankCommands) {
            commandService.unregisterCommand('rank');
            this.log('debug', 'Unregistered rank commands');
        }
    }
}

module.exports = PlayerRanksPlugin;
