/**
 * WelcomeMessage Plugin - Sends a welcome message to players when they join
 * Example of a plugin that follows MVC architecture
 */
class WelcomeMessagePlugin {
    /**
     * Create a new WelcomeMessagePlugin
     * @param {Object} services - Services container
     */
    constructor(services) {
        // Store service references
        this.services = services;
        this.logService = services.logService;
        this.serverManager = services.serverManager;
        
        // Plugin configuration with defaults
        this.config = {
            enabled: true,
            message: "^2Welcome to the server, ^5%PLAYER%^2! Type ^3.help^2 for available commands.",
            delay: 2000 // Delay before sending message (ms)
        };
        
        // Try to load config from file
        this.loadConfig();
        
        this.logService.info('WelcomeMessagePlugin constructed');
    }
    
    /**
     * Load plugin configuration
     */
    loadConfig() {
        try {
            // Try to load configuration from file
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(__dirname, '../../config/plugins/welcome-message.json');
            
            if (fs.existsSync(configPath)) {
                const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                this.config = { ...this.config, ...fileConfig };
                this.logService.debug('Loaded welcome message plugin config from file');
            }
        } catch (error) {
            this.logService.warn(`Error loading welcome message plugin config: ${error.message}`);
        }
    }
    
    /**
     * Initialize the plugin
     * @returns {Promise<void>}
     */
    async init() {
        // Skip if plugin is disabled
        if (!this.config.enabled) {
            this.logService.info('WelcomeMessagePlugin is disabled, not registering event handlers');
            return;
        }
        
        this.logService.info('Initializing WelcomeMessagePlugin');
        
        // Wait for server manager to be available
        if (!this.serverManager) {
            this.logService.warn('Server manager not available, waiting for it...');
            
            // Poll for server manager to be available
            let attempts = 0;
            while (!this.serverManager && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                this.serverManager = this.services.serverManager;
                attempts++;
            }
            
            if (!this.serverManager) {
                this.logService.error('Server manager still not available after waiting, plugin may not function correctly');
                return;
            }
        }
        
        // Register event handlers
        this.registerEventHandlers();
        
        this.logService.info('WelcomeMessagePlugin initialized successfully');
    }
    
    /**
     * Register event handlers
     */
    registerEventHandlers() {
        if (!this.serverManager) {
            this.logService.error('Cannot register event handlers: Server manager not available');
            return;
        }
        
        // Register for player connect events across all servers
        this.serverManager.on('player.connect', this.handlePlayerConnect.bind(this));
        
        this.logService.debug('WelcomeMessagePlugin event handlers registered');
    }
    
    /**
     * Handle player connect event
     * @param {Object} data - Player connect event data
     */
    handlePlayerConnect(data) {
        try {
            const { player, server } = data;
            
            if (!player || !server) {
                this.logService.warn('Player connect event missing player or server data');
                return;
            }
            
            // Send welcome message after delay
            setTimeout(() => {
                this.sendWelcomeMessage(player, server);
            }, this.config.delay);
        } catch (error) {
            this.logService.error(`Error handling player connect event: ${error.message}`);
        }
    }
    
    /**
     * Send welcome message to player
     * @param {Object} player - Player object
     * @param {Object} server - Server object
     */
    async sendWelcomeMessage(player, server) {
        try {
            if (!player.isOnline) {
                // Player already left
                return;
            }
            
            // Replace placeholders
            const message = this.config.message
                .replace(/%PLAYER%/g, player.name)
                .replace(/%SERVER%/g, server.name);
                
            // Send message to player
            await player.tell(message);
            
            this.logService.debug(`Sent welcome message to ${player.name} on ${server.name}`);
        } catch (error) {
            this.logService.error(`Error sending welcome message: ${error.message}`);
        }
    }
}

module.exports = WelcomeMessagePlugin;
