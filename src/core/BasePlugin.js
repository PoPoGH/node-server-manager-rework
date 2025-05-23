/**
 * Base Plugin Class for MVC architecture
 * Provides common functionality and structure for MVC-compliant plugins
 */
class BasePlugin {
    /**
     * Create a new BasePlugin instance
     * @param {ServiceFactory} serviceFactory - Services factory instance
     */
    constructor(serviceFactory) {
        if (!serviceFactory) {
            throw new Error('ServiceFactory is required for MVC plugins');
        }

        this.serviceFactory = serviceFactory;
        this.services = serviceFactory.getServices();
        
        // Store core services for convenience
        this.logService = this.services.logService || null;
        this.eventService = this.services.eventService || null;
        this.playerService = this.services.playerService || null;
        this.serverService = this.services.serverService || null;
        this.configService = this.services.configService || null;
        
        // Plugin metadata
        this.name = this.constructor.name;
        this.version = '1.0.0';
        this.description = 'MVC Plugin';
        this.author = 'Unknown';
        
        // Track event subscriptions for clean shutdown
        this.subscriptions = [];
        
        // Track plugin features/components
        this.features = {};
        this.controllers = {};
        this.models = {};
        this.repositories = {};
        
        // Plugin configuration
        this.config = this.configService ? 
            this.configService.getPluginConfig(this.name.toLowerCase()) || {} : {};
        
        // Plugin state
        this.enabled = false;
        this.initialized = false;
        
        // Create a child logger for more structured logging if available
        if (this.logService && typeof this.logService.createChildLogger === 'function') {
            this.logger = this.logService.createChildLogger(this.name);
        }
        
        // Bind methods to ensure proper 'this' context
        this._bindEventHandlers();
    }
    
    /**
     * Bind all event handler methods to this instance
     * @private
     */
    _bindEventHandlers() {
        // Get all methods from the prototype
        const prototype = Object.getPrototypeOf(this);
        const methodNames = Object.getOwnPropertyNames(prototype)
            .filter(name => typeof this[name] === 'function' && name !== 'constructor');
            
        // Bind methods that start with 'handle' or '_handle'
        methodNames.forEach(name => {
            if (name.startsWith('handle') || name.startsWith('_handle')) {
                this[name] = this[name].bind(this);
            }
        });
    }
      /**
     * Initialize the plugin
     * @returns {Promise<boolean>} Success status
     */
    async init() {
        try {
            if (this.initialized) {
                this.log('warn', `Plugin ${this.name} is already initialized.`);
                return true;
            }
            
            this.log('info', `Initializing plugin: ${this.name} v${this.version}`);
            
            // Load configuration if method exists
            if (typeof this._loadConfig === 'function') {
                await this._loadConfig();
            }
            
            // Initialize models if method exists
            if (typeof this._setupModels === 'function') {
                await this._setupModels();
            }
            
            // Initialize repositories if method exists
            if (typeof this._setupRepositories === 'function') {
                await this._setupRepositories();
            }
            
            // Initialize controllers if method exists
            if (typeof this._setupControllers === 'function') {
                await this._setupControllers();
            }
            
            // Initialize event handlers
            await this._setupEventHandlers();
            
            // Initialize views/API routes if method exists
            if (typeof this._setupRoutes === 'function') {
                await this._setupRoutes();
            }
            
            // Mark as initialized
            this.initialized = true;
            this.enabled = true;
            
            // Log successful initialization
            this.log('info', `Plugin ${this.name} initialized successfully.`);
            
            // Emit plugin.initialized event
            this.emitEvent('plugin.initialized', {
                pluginName: this.name,
                version: this.version,
                description: this.description,
                author: this.author
            });
            
            return true;
        } catch (error) {
            this.log('error', `Error initializing plugin ${this.name}:`, error);
            return false;
        }
    }
    
    /**
     * Set up event handlers
     * Override this method in derived plugins
     * @returns {Promise<void>}
     * @protected
     */
    async _setupEventHandlers() {
        // To be overridden by derived classes
    }
      /**
     * Subscribe to an event
     * @param {string} eventType - Event type to subscribe to
     * @param {Function} callback - Callback function
     * @returns {Object} Subscription object
     */
    subscribe(eventType, callback) {
        if (!this.eventService) {
            this.log('warn', `Cannot subscribe to ${eventType}: EventService not available.`);
            return { unsubscribe: () => {} };
        }
        
        // The callback should already be bound in _bindEventHandlers
        // but we'll ensure it here as well
        const boundCallback = typeof callback === 'function' && 
            callback.name && 
            callback.name.includes('.bind') ? 
            callback : callback.bind(this);
            
        this.eventService.on(eventType, boundCallback);
        
        // Create subscription object for tracking
        const subscription = {
            eventType,
            callback: boundCallback,
            unsubscribe: () => {
                this.eventService.off(eventType, boundCallback);
            }
        };
        
        // Track subscription for cleanup
        this.subscriptions.push(subscription);
        
        return subscription;
    }
      /**
     * Unsubscribe from all events
     */
    unsubscribeAll() {
        if (this.subscriptions.length > 0) {
            this.log('debug', `Unsubscribing from ${this.subscriptions.length} events.`);
            this.subscriptions.forEach(sub => sub.unsubscribe());
            this.subscriptions = [];
        }
    }
    
    /**
     * Emit an event through the event service
     * @param {string} eventType - Event type
     * @param {Object} data - Event data
     * @param {boolean} persist - Whether to persist the event
     * @returns {Promise<Object|null>} Created event or null
     */
    async emitEvent(eventType, data = {}, persist = false) {
        if (!this.eventService) {
            this.log('warn', `Cannot emit ${eventType}: EventService not available.`);
            return null;
        }
        
        // Add plugin name to event data for traceability
        const eventData = {
            ...data,
            _pluginName: this.name,
            _pluginVersion: this.version
        };
        
        try {
            // Format event type with plugin namespace if not already prefixed
            const formattedEventType = eventType.includes('.') ? 
                eventType : 
                `plugin.${this.name.toLowerCase()}.${eventType}`;
            
            return await this.eventService.emitAndStore(formattedEventType, eventData, persist);
        } catch (error) {
            this.log('error', `Failed to emit event ${eventType}:`, error);
            return null;
        }
    }
    
    /**
     * Log a message with plugin context
     * @param {string} level - Log level (info, warn, error, debug)
     * @param {string} message - Message to log
     * @param {Object} metadata - Additional metadata
     */
    log(level, message, metadata = {}) {
        // Use logger if available (preferred)
        if (this.logger && typeof this.logger[level] === 'function') {
            this.logger[level](message, metadata);
        } 
        // Fall back to logService
        else if (this.logService && typeof this.logService[level] === 'function') {
            this.logService[level](message, {
                ...metadata,
                pluginName: this.name,
                pluginVersion: this.version
            });
        } 
        // Last resort: console
        else {
            console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
                `[${this.name}] ${message}`, metadata
            );
        }
    }
      /**
     * Get a service from the service factory
     * @param {string} serviceName - Name of the service
     * @returns {Object|null} Service instance or null if not found
     */
    getService(serviceName) {
        if (!this.services[serviceName]) {
            this.log('debug', `Service not found: ${serviceName}`);
        }
        return this.services[serviceName] || null;
    }
    
    /**
     * Register a model with the plugin
     * @param {string} name - Model name
     * @param {Object} modelClass - Model class
     */
    registerModel(name, modelClass) {
        this.models[name] = modelClass;
        return modelClass;
    }
    
    /**
     * Register a repository with the plugin
     * @param {string} name - Repository name
     * @param {Object} repositoryInstance - Repository instance
     */
    registerRepository(name, repositoryInstance) {
        this.repositories[name] = repositoryInstance;
        return repositoryInstance;
    }
    
    /**
     * Register a controller with the plugin
     * @param {string} name - Controller name
     * @param {Object} controllerInstance - Controller instance
     */
    registerController(name, controllerInstance) {
        this.controllers[name] = controllerInstance;
        return controllerInstance;
    }
    
    /**
     * Get access to the plugin's database connection (if available)
     * @returns {Object|null} Database connection or null
     */
    getDatabaseConnection() {
        // Try to get a database connection from services
        const databaseService = this.getService('databaseService');
        if (databaseService && typeof databaseService.getConnection === 'function') {
            return databaseService.getConnection();
        }
        
        // Fall back to direct database access if available
        if (this.services.db) {
            return this.services.db;
        }
        
        this.log('warn', 'No database connection available');
        return null;
    }
    
    /**
     * Enable the plugin
     * @returns {Promise<boolean>} Success status
     */
    async enable() {
        if (!this.initialized) {
            await this.init();
            return this.enabled;
        }
        
        if (this.enabled) {
            this.log('warn', `Plugin ${this.name} is already enabled.`);
            return true;
        }
        
        try {
            // Re-register event handlers
            await this._setupEventHandlers();
            
            // Enable plugin features
            this.enabled = true;
            this.log('info', `Plugin ${this.name} enabled.`);
            
            // Emit plugin.enabled event
            this.emitEvent('plugin.enabled', { pluginName: this.name });
            
            return true;
        } catch (error) {
            this.log('error', `Error enabling plugin ${this.name}:`, error);
            return false;
        }
    }
      /**
     * Disable the plugin
     * @returns {Promise<boolean>} Success status
     */
    async disable() {
        if (!this.enabled) {
            this.log('warn', `Plugin ${this.name} is already disabled.`);
            return true;
        }
        
        try {
            // Unsubscribe from all events
            this.unsubscribeAll();
            
            // Clean up any timers or intervals
            await this._cleanupResources();
            
            // Disable plugin features
            this.enabled = false;
            this.log('info', `Plugin ${this.name} disabled.`);
            
            // Emit plugin.disabled event
            this.emitEvent('plugin.disabled', { pluginName: this.name });
            
            return true;
        } catch (error) {
            this.log('error', `Error disabling plugin ${this.name}:`, error);
            return false;
        }
    }
    
    /**
     * Clean up resources (intervals, timeouts, etc.)
     * Override this in derived classes to clean up specific resources
     * @returns {Promise<void>}
     * @protected
     */
    async _cleanupResources() {
        // To be overridden by derived classes
    }
    
    /**
     * Shutdown the plugin completely
     * @returns {Promise<boolean>} Success status
     */
    async shutdown() {
        try {
            this.log('info', `Shutting down plugin ${this.name}...`);
            
            // First disable the plugin
            if (this.enabled) {
                await this.disable();
            }
            
            // Close any database connections specific to this plugin
            for (const repoName in this.repositories) {
                if (this.repositories[repoName] && 
                    typeof this.repositories[repoName].close === 'function') {
                    await this.repositories[repoName].close();
                }
            }
            
            // Clear models, controllers and repositories
            this.models = {};
            this.controllers = {};
            this.repositories = {};
            
            // Mark as uninitialized
            this.initialized = false;
            
            this.log('info', `Plugin ${this.name} shut down.`);
            
            // Emit plugin.shutdown event
            if (this.eventService) {
                this.eventService.emit('plugin.shutdown', { pluginName: this.name });
            }
            
            return true;
        } catch (error) {
            this.log('error', `Error shutting down plugin ${this.name}:`, error);
            return false;
        }
    }
}

module.exports = BasePlugin;
