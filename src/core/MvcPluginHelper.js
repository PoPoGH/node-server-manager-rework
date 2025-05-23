/**
 * Plugin Helper - Utilities to help plugin developers transition to MVC architecture
 */
const EventEmitter = require('events');

class MvcPluginHelper extends EventEmitter {
    /**
     * Create a new MvcPluginHelper
     * @param {Object} serviceFactory - Service Factory instance
     * @param {Object} options - Plugin options
     */
    constructor(serviceFactory, options = {}) {
        super();
        
        this.serviceFactory = serviceFactory;
        this.options = {
            pluginName: options.pluginName || 'unknown',
            debug: options.debug || false,
            ...options
        };
        
        // Get essential services
        this.logService = serviceFactory.get('LogService');
        this.eventService = serviceFactory.get('EventService');
        this.serverService = serviceFactory.get('ServerService');
        
        if (!this.logService || !this.eventService) {
            throw new Error('Essential services not available in service factory');
        }
        
        // Configure event forwarding
        this._setupEventForwarding();
        
        this.logService.debug(`MVC Plugin Helper initialized for ${this.options.pluginName}`);
    }
    
    /**
     * Set up event forwarding between EventEmitter and EventService
     * @private
     */
    _setupEventForwarding() {
        if (!this.eventService) return;
        
        // Forward EventEmitter events to EventService
        const originalEmit = this.emit.bind(this);
        this.emit = (eventName, ...args) => {
            // Keep original EventEmitter behavior
            originalEmit(eventName, ...args);
            
            // Also forward to EventService
            const eventData = args[0] || {};
            const eventType = `plugin.${this.options.pluginName}.${eventName}`;
            
            try {
                this.eventService.emit(eventType, eventData);
            } catch (error) {
                if (this.options.debug) {
                    console.error(`Error forwarding event to EventService: ${error.message}`);
                }
            }
            
            return this;
        };
        
        // Allow listening to EventService events
        this.onAppEvent = (eventType, listener) => {
            if (!this.eventService) return this;
            
            this.eventService.on(eventType, listener);
            return this;
        };
    }
    
    /**
     * Log a message through LogService
     * @param {string} level - Log level (info, warn, error, debug)
     * @param {string} message - Message to log
     * @param {Object} data - Additional data
     */
    log(level, message, data = {}) {
        if (!this.logService) return;
        
        data.pluginName = this.options.pluginName;
        
        if (!['info', 'warn', 'error', 'debug'].includes(level)) {
            level = 'info';
        }
        
        this.logService[level](message, data);
    }
    
    /**
     * Create a plugin event and store it in the database
     * @param {string} eventType - Event type
     * @param {Object} data - Event data
     * @returns {Promise<Object|null>} Created event or null
     */
    async createEvent(eventType, data = {}) {
        if (!this.eventService) return null;
        
        try {
            const eventData = {
                ...data,
                pluginName: this.options.pluginName
            };
            
            return await this.eventService.emitAndStore(
                `plugin.${this.options.pluginName}.${eventType}`, 
                eventData, 
                true
            );
        } catch (error) {
            this.log('error', `Error creating plugin event`, {
                eventType,
                error: error.message
            });
            return null;
        }
    }
    
    /**
     * Get a service from the ServiceFactory
     * @param {string} serviceName - Name of the service
     * @returns {Object|null} Service instance or null
     */
    getService(serviceName) {
        if (!this.serviceFactory) return null;
        
        try {
            return this.serviceFactory.get(serviceName);
        } catch (error) {
            this.log('warn', `Failed to get service: ${serviceName}`, { error: error.message });
            return null;
        }
    }
    
    /**
     * Get all active servers
     * @returns {Promise<Array>} Array of server instances
     */
    async getServers() {
        const serverService = this.getService('ServerService');
        if (!serverService) return [];
        
        try {
            return await serverService.getActiveServers();
        } catch (error) {
            this.log('error', 'Error getting servers', { error: error.message });
            return [];
        }
    }
    
    /**
     * Get a server by ID
     * @param {number|string} serverId - Server ID
     * @returns {Promise<Object|null>} Server or null
     */
    async getServer(serverId) {
        const serverService = this.getService('ServerService');
        if (!serverService) return null;
        
        try {
            return await serverService.getServerById(serverId);
        } catch (error) {
            this.log('error', `Error getting server ${serverId}`, { error: error.message });
            return null;
        }
    }
}

module.exports = MvcPluginHelper;
