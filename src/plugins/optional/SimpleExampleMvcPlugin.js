/**
 * ExampleMvcPlugin - A demonstration of an MVC-compliant plugin
 */
const BasePlugin = require('../../core/BasePlugin');

class ExampleMvcPlugin extends BasePlugin {
    constructor(serviceFactory) {
        super(serviceFactory);
        
        // Define plugin metadata
        this.name = 'ExampleMvcPlugin';
        this.version = '1.0.0';
        this.description = 'Example plugin demonstrating MVC architecture';
        this.author = 'Node Server Manager Team';
        
        // Get configuration if available
        const configService = this.getService('configService');
        this.config = configService ? configService.getPluginConfig('examplePlugin') || {} : {};
        
        // Define features
        this.features = {
            playerWelcome: true,
            serverStatus: true,
            statistics: true
        };
    }
    
    /**
     * Set up event handlers
     * @returns {Promise<void>}
     * @protected
     */
    async _setupEventHandlers() {
        // Player events
        this.subscribe('player.connected', this._handlePlayerConnect);
        this.subscribe('player.disconnected', this._handlePlayerDisconnect);
        
        // Server events
        this.subscribe('server.status.change', this._handleServerStatusChange);
        
        // Log events we're interested in
        this.log('info', 'ExampleMvcPlugin has registered event handlers');
    }
    
    /**
     * Handle player connection event
     * @param {Object} data - Event data
     * @private
     */
    async _handlePlayerConnect(data) {
        const { serverId, player } = data;
        
        this.log('info', `Player ${player.name} connected to server ${serverId}`);
        
        if (this.features.playerWelcome && this.config.welcomeMessage) {
            try {
                // Get the server instance to send a welcome message
                const serverService = this.getService('serverService');
                if (serverService) {
                    const welcomeMessage = this.config.welcomeMessage
                        .replace('{player}', player.name)
                        .replace('{server}', serverId);
                        
                    await serverService.sendCommand(serverId, `say ${welcomeMessage}`);
                    
                    this.log('debug', `Sent welcome message to ${player.name}`);
                }
            } catch (error) {
                this.log('error', 'Failed to send welcome message:', error);
            }
        }
    }
    
    /**
     * Handle player disconnection event
     * @param {Object} data - Event data
     * @private
     */
    async _handlePlayerDisconnect(data) {
        const { serverId, player } = data;
        
        this.log('info', `Player ${player.name} disconnected from server ${serverId}`);
        
        // Update player statistics if enabled
        if (this.features.statistics) {
            try {
                await this.emitEvent('examplePlugin.playerStats.updated', {
                    playerId: player.id,
                    serverId: serverId,
                    sessionDuration: data.sessionDuration || 0
                });
            } catch (error) {
                this.log('error', 'Failed to update player statistics:', error);
            }
        }
    }
    
    /**
     * Handle server status change event
     * @param {Object} data - Event data
     * @private
     */
    async _handleServerStatusChange(data) {
        const { serverId, status, previousStatus } = data;
        
        this.log('info', `Server ${serverId} status changed from ${previousStatus} to ${status}`);
        
        if (this.features.serverStatus) {
            try {
                // Store server status change
                await this.emitEvent('examplePlugin.serverStatus.tracked', {
                    serverId,
                    status,
                    previousStatus,
                    timestamp: new Date()
                }, true);
            } catch (error) {
                this.log('error', 'Failed to track server status:', error);
            }
        }
    }
    
    /**
     * Clean up resources before shutdown
     * @returns {Promise<boolean>} Success status
     */
    async shutdown() {
        this.log('info', 'ExampleMvcPlugin shutting down');
        
        // Call parent shutdown
        return await super.shutdown();
    }
}

module.exports = ExampleMvcPlugin;
