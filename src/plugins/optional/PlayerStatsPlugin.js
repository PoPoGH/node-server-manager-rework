/**
 * Player Stats Plugin - Displays player statistics on join and on demand
 * Example of a plugin that follows MVC architecture
 */
class PlayerStatsPlugin {
    /**
     * Create a new PlayerStatsPlugin
     * @param {Object} services - Services container
     */
    constructor(services) {
        // Store service references
        this.services = services;
        this.logService = services.logService;
        this.serverManager = services.serverManager;
        this.statsService = services.statsService;
        this.playerService = services.playerService;
        this.commandService = services.commandService;
        
        // Plugin configuration with defaults
        this.config = {
            enabled: true,
            displayOnJoin: true,
            statsCommand: 'stats',
            statsDelay: 5000, // Delay before showing stats on join (ms)
            message: {
                header: "^5--- Your Stats ---",
                kd: "^7K/D: ^3%KD%",
                kills: "^7Kills: ^2%KILLS%",
                deaths: "^7Deaths: ^1%DEATHS%",
                score: "^7Score: ^5%SCORE%",
                timePlayed: "^7Time played: ^6%TIME_PLAYED%",
                footer: "^5----------------"
            }
        };
        
        // Try to load config from file
        this.loadConfig();
        
        this.logService.info('PlayerStatsPlugin constructed');
    }
    
    /**
     * Load plugin configuration
     */
    loadConfig() {
        try {
            // Try to load configuration from file
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(__dirname, '../../config/plugins/player-stats.json');
            
            if (fs.existsSync(configPath)) {
                const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                this.config = { ...this.config, ...fileConfig };
                this.logService.debug('Loaded player stats plugin config from file');
            }
        } catch (error) {
            this.logService.warn(`Error loading player stats plugin config: ${error.message}`);
        }
    }
    
    /**
     * Initialize the plugin
     * @returns {Promise<void>}
     */
    async init() {
        // Skip if plugin is disabled
        if (!this.config.enabled) {
            this.logService.info('PlayerStatsPlugin is disabled, not registering event handlers');
            return;
        }
        
        this.logService.info('Initializing PlayerStatsPlugin');
        
        // Wait for required services to be available
        if (!this.serverManager || !this.statsService || !this.playerService) {
            this.logService.warn('Required services not available, waiting for them...');
            
            // Poll for services to be available
            let attempts = 0;
            while ((!this.serverManager || !this.statsService || !this.playerService) && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                this.serverManager = this.services.serverManager;
                this.statsService = this.services.statsService;
                this.playerService = this.services.playerService;
                attempts++;
            }
            
            if (!this.serverManager || !this.statsService || !this.playerService) {
                this.logService.error('Required services still not available after waiting, plugin may not function correctly');
                return;
            }
        }
        
        // Register event handlers
        this.registerEventHandlers();
        
        // Register command
        this.registerCommands();
        
        this.logService.info('PlayerStatsPlugin initialized successfully');
    }
    
    /**
     * Register event handlers
     */
    registerEventHandlers() {
        if (!this.serverManager) {
            this.logService.error('Cannot register event handlers: Server manager not available');
            return;
        }
        
        // Register for player connect events across all servers if stats on join is enabled
        if (this.config.displayOnJoin) {
            this.serverManager.on('player.connect', this.handlePlayerConnect.bind(this));
        }
        
        this.logService.debug('PlayerStatsPlugin event handlers registered');
    }
    
    /**
     * Register commands
     */
    registerCommands() {
        if (!this.commandService) {
            this.logService.error('Cannot register commands: Command service not available');
            return;
        }
        
        // Create stats command
        const StatsCommand = require('./commands/StatsCommand');
        
        // Register with command service
        this.commandService.registerCommand(this.config.statsCommand, StatsCommand);
        
        this.logService.debug(`Registered '${this.config.statsCommand}' command`);
    }
    
    /**
     * Handle player connect event
     * @param {Object} data - Player connect event data
     */
    handlePlayerConnect(data) {
        try {
            const { player, serverId, serverName } = data;
            
            if (!player) {
                this.logService.warn('Player connect event missing player data');
                return;
            }
            
            // Get server instance
            const server = this.serverManager.getServerById(serverId);
            if (!server) {
                this.logService.warn(`Server with ID ${serverId} not found`);
                return;
            }
            
            // Show stats after delay
            setTimeout(() => {
                this.showPlayerStats(player, server);
            }, this.config.statsDelay);
        } catch (error) {
            this.logService.error(`Error handling player connect event: ${error.message}`);
        }
    }
    
    /**
     * Show player stats
     * @param {Object} player - Player object
     * @param {Object} server - Server object
     */
    async showPlayerStats(player, server) {
        try {
            if (!player.isOnline) {
                // Player already left
                return;
            }
            
            // Get player stats from service
            const stats = await this.statsService.getPlayerStats(player.id);
            
            if (!stats) {
                await player.tell("^3No stats found for your account yet. Play some games to generate stats!");
                return;
            }
            
            // Format time played
            const hours = Math.floor(stats.timePlayed / 3600);
            const minutes = Math.floor((stats.timePlayed % 3600) / 60);
            const formattedTime = `${hours}h ${minutes}m`;
            
            // Calculate K/D ratio
            const kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(2);
            
            // Send stats messages
            await player.tell(this.config.message.header);
            await player.tell(this.config.message.kd.replace('%KD%', kd));
            await player.tell(this.config.message.kills.replace('%KILLS%', stats.kills));
            await player.tell(this.config.message.deaths.replace('%DEATHS%', stats.deaths));
            await player.tell(this.config.message.score.replace('%SCORE%', stats.score));
            await player.tell(this.config.message.timePlayed.replace('%TIME_PLAYED%', formattedTime));
            await player.tell(this.config.message.footer);
            
            this.logService.debug(`Showed stats to ${player.name} on ${server.name}`);
        } catch (error) {
            this.logService.error(`Error showing player stats: ${error.message}`);
        }
    }
}

module.exports = PlayerStatsPlugin;
