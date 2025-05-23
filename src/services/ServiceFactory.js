/**
 * Service Factory - Central registry for application services
 */
const LogService = require('./LogService');

// Import services
const PlayerService = require('./PlayerService');
const ServerService = require('./ServerService');
const EventService = require('./EventService');
const StatsService = require('./StatsService');
const MatchService = require('./MatchService');
const RconService = require('./RconService');
const CommandService = require('./CommandService');
const ServerInstanceService = require('./ServerInstanceService');
const UserService = require('./UserService');
const AuthService = require('./AuthService');
const ConfigService = require('./ConfigService');

class ServiceFactory {
    /**
     * Create a new ServiceFactory
     * @param {Object} options - Factory options
     */
    constructor(options = {}) {
        this.services = {};
        this.options = options;
        
        // Initialize a default logger if none provided
        this.logService = null;
        
        // Initialize base services unless specifically disabled
        if (!options.skipAutoInit) {
            this.initializeBaseServices();
        }
    }
    
    /**
     * Get the singleton instance
     * @returns {ServiceFactory} Singleton instance
     */
    static getInstance() {
        if (!ServiceFactory.instance) {
            ServiceFactory.instance = new ServiceFactory();
        }
        return ServiceFactory.instance;
    }
    
    /**
     * Initialize base services
     */
    initializeBaseServices() {
        try {
            // Use logService if already registered
            this.logService = this.services.logService || {
                debug: console.debug,
                info: console.info,
                warn: console.warn,
                error: console.error
            };
            
            // Register default services here
            this.registerDefaultServices();
            
            // Set up cross-service references
            this.injectServiceReferences();
            
            this.logService.info('Base services initialized');
        } catch (error) {
            console.error('Error initializing base services:', error);
            throw error;
        }
    }
    
    /**
     * Register a service
     * @param {string} name - Service name
     * @param {Object} service - Service instance
     */
    register(name, service) {
        this.services[name] = service;
        
        // Update logService reference if it's being registered
        if (name === 'logService') {
            this.logService = service;
        }
        
        return this;
    }
    
    /**
     * Get a service
     * @param {string} name - Service name
     * @returns {Object} Service instance
     */
    get(name) {
        if (!this.services[name]) {
            const errorMsg = `Service '${name}' not found in ServiceFactory`;
            if (this.logService) {
                this.logService.error(errorMsg);
            } else {
                console.error(errorMsg);
            }
            throw new Error(errorMsg);
        }
        return this.services[name];
    }
    
    /**
     * Get all registered services
     * @returns {Object} Services map
     */
    getServices() {
        return this.services;
    }
    
    /**
     * Register default services
     * @private
     */
    registerDefaultServices() {
        try {
            // First, make sure logService is available
            if (!this.services.logService) {
                const LogService = require('./LogService');
                this.register('logService', new LogService());
            }

            // UserService and AuthService will be registered in app.js
            // after dbConnection is confirmed to be available.
            // Removing their auto-registration here prevents them from
            // being initialized with an undefined dbConnection.

            // Register config service if it doesn't exist
            if (!this.services.configService) {
                const ConfigService = require('./ConfigService');
                this.register('configService', new ConfigService());
            }
        } catch (error) {
            const errorMsg = `Error registering default services: ${error.message}`;
            if (this.logService) {
                this.logService.error(errorMsg, error);
            } else {
                console.error(errorMsg, error);
            }
            throw error;
        }
    }
    
    /**
     * Inject cross-service references
     * @private
     */
    injectServiceReferences() {
        try {
            // Inject playerService into matchService if both exist
            if (this.services.matchService && this.services.playerService) {
                if (typeof this.services.matchService.setPlayerService === 'function') {
                    this.services.matchService.setPlayerService(this.services.playerService);
                } else {
                    if (this.logService) {
                        this.logService.warn('matchService.setPlayerService method not available - skipping injection');
                    } else {
                        console.warn('matchService.setPlayerService method not available - skipping injection');
                    }
                }
            }
            
            // Inject playerService into statsService if both exist
            if (this.services.statsService && this.services.playerService) {
                if (typeof this.services.statsService.setPlayerService === 'function') {
                    this.services.statsService.setPlayerService(this.services.playerService);
                } else {
                    if (this.logService) {
                        this.logService.warn('statsService.setPlayerService method not available - skipping injection');
                    } else {
                        console.warn('statsService.setPlayerService method not available - skipping injection');
                    }
                }
            }
            
            // Add other service injections as needed
        } catch (error) {
            const errorMsg = `Error injecting service references: ${error.message}`;
            if (this.logService) {
                this.logService.error(errorMsg, error);
            } else {
                console.error(errorMsg, error);
            }
            throw error;
        }
    }
    
    /**
     * Create a service if it doesn't exist and register it
     * @param {string} name - Service name
     * @param {Function} ServiceClass - Service constructor
     * @param {Array} args - Constructor arguments
     * @returns {Object} Service instance
     */
    createIfNotExists(name, ServiceClass, ...args) {
        if (!this.services[name]) {
            const service = new ServiceClass(...args);
            this.register(name, service);
        }
        return this.services[name];
    }
    
    /**
     * Create a ServerInstanceService for a server model
     * @param {Object} serverModel - Server model
     * @returns {ServerInstanceService} Server instance service
     */
    createServerInstance(serverModel) {
        const instance = new ServerInstanceService(serverModel, this.services);
        return instance;
    }
    
    /**
     * Create a RconService for a server
     * @param {string} ip - Server IP
     * @param {number|string} port - Server port
     * @param {string} password - RCON password
     * @param {string} game - Game type
     * @returns {RconService} RCON service instance
     */
    createRconService(ip, port, password, game) {
        return new RconService(ip, port, password, game);
    }
}

module.exports = ServiceFactory;
