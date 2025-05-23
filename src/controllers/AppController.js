/**
 * Application Controller - Main entry point for the MVC application
 * Orchestrates initialization and interaction of all components
 */
const fs = require('fs');
const path = require('path');
const ServiceFactory = require('../services/ServiceFactory');
const ServerController = require('../controllers/ServerController');
const PlayerController = require('../controllers/PlayerController');
const MatchController = require('../controllers/MatchController');
const EventController = require('../controllers/EventController');
const StatsController = require('../controllers/StatsController');

class AppController {
    /**
     * Create a new AppController
     * @param {Object} config - Application configuration
     * @param {Object} serviceFactory - Service factory instance
     */
    constructor(config, serviceFactory) {
        this.config = config;
        this.serviceFactory = serviceFactory;
        this.services = serviceFactory ? serviceFactory.getServices ? serviceFactory.getServices() : serviceFactory.services : {};
        this.db = this.services.dbConnection || null;
        this.controllers = {};
        this.serverManager = null;
        
        // Initialize with a simple console log since logger isn't available yet
        console.log('AppController initializing...');
    }
    
    /**
     * Initialize the application
     * @returns {Promise<boolean>} Success status
     */    async initialize() {
        try {
            console.log('Starting application initialization...');
            
            // Initialize server manager first to ensure it's available for controllers
            await this.initializeServerManager();
            console.log('Server manager initialized');
            
            // Initialize controllers with services
            await this.initializeControllers();
            console.log('Controllers initialized');
            
            // Initialize API after controllers are ready
            if (this.config.api?.enabled !== false) {
                await this.initializeAPI();
            }
            
            // Initialize web interface
            if (this.config.web?.enabled !== false) {
                await this.initializeWebInterface();
            }
            
            console.log('Application initialization complete');
            
            return true;
        } catch (error) {
            console.error('Error initializing application:', error);
            return false;
        }
    }
    
    /**
     * Initialize all controllers
     * @private
     * @returns {Promise<void>}
     */
    async initializeControllers() {
        // Create controllers with references to services
        this.controllers.serverController = new ServerController(this.db, this.serverManager, this.services);
        this.controllers.playerController = new PlayerController(this.db, this.services);
        this.controllers.matchController = new MatchController(this.db, this.services);
        this.controllers.eventController = new EventController(this.db, this.services);
        this.controllers.statsController = new StatsController(this.db, this.services);
        
        // Store controllers in services so they can be used by other components
        this.services.controllers = this.controllers;
    }
      /**
     * Initialize server manager
     * @private
     * @returns {Promise<void>}
     */
    async initializeServerManager() {
        try {
            // Import the new server manager
            const ServerManager = require('../managers/ServerManager');
            
            // Create server manager with services
            this.serverManager = new ServerManager(this.config, this.services);
            await this.serverManager.init();
            
            // Make available to services
            this.services.serverManager = this.serverManager;
            
            // Update server service with server manager reference
            if (this.services.serverService) {
                this.services.serverService.setServerManager(this.serverManager);
            }
        } catch (error) {
            this.services.logService.error('Failed to initialize server manager', error);
            throw error;
        }
    }
    
    /**
     * Load plugins
     * @private
     * @returns {Promise<void>}
     */
    async loadPlugins() {
        try {
            const { logService } = this.services;
            
            // Check for plugins directory
            const pluginsDir = path.join(__dirname, '../plugins');
            if (!fs.existsSync(pluginsDir)) {
                logService.warn('Plugins directory not found');
                return;
            }
            
            const corePluginsDir = path.join(pluginsDir, 'core');
            const optionalPluginsDir = path.join(pluginsDir, 'optional');
            
            // Load core plugins (always loaded)
            if (fs.existsSync(corePluginsDir)) {
                await this.loadPluginsFromDirectory(corePluginsDir, true);
                logService.info('Core plugins loaded');
            }
            
            // Load optional plugins (based on config)
            if (fs.existsSync(optionalPluginsDir)) {
                await this.loadPluginsFromDirectory(optionalPluginsDir, false);
                logService.info('Optional plugins loaded');
            }
        } catch (error) {
            this.services.logService.error('Failed to load plugins', error);
            throw error;
        }
    }
    
    /**
     * Load plugins from a directory
     * @param {string} directory - Directory to load plugins from
     * @param {boolean} isCore - Whether these are core plugins (always loaded)
     * @private
     * @returns {Promise<void>}
     */
    async loadPluginsFromDirectory(directory, isCore) {
        const { logService, eventService } = this.services;
        
        try {
            const files = fs.readdirSync(directory).filter(f => f.endsWith('.js'));
            
            for (const file of files) {
                try {
                    const pluginPath = path.join(directory, file);
                    const pluginName = path.basename(file, '.js');
                    
                    // Skip if plugin is disabled in config
                    if (!isCore && this.config.plugins.disabled && 
                        this.config.plugins.disabled.includes(pluginName)) {
                        logService.info(`Plugin ${pluginName} is disabled, skipping`);
                        continue;
                    }
                    
                    // Import plugin
                    const PluginClass = require(pluginPath);
                    
                    try {
                        // Check if plugin expects legacy serverManager or serviceFactory
                        const isLegacyPlugin = PluginClass.toString().includes('constructor(serverManager)');
                        
                        // Create plugin instance with appropriate dependencies
                        let plugin;
                        if (isLegacyPlugin) {
                            logService.debug(`Loading legacy plugin ${pluginName} with server manager adapter`);
                            // Legacy constructor expects serverManager
                            plugin = new PluginClass(this.serverManager);
                        } else {
                            logService.debug(`Loading MVC plugin ${pluginName} with service factory`);
                            // Modern constructor expects serviceFactory
                            plugin = new PluginClass(this.serviceFactory);
                        }
                        
                        // Initialize plugin if it has an init method
                        if (typeof plugin.init === 'function') {
                            await plugin.init();
                        }
                        
                        // Store metadata about plugin
                        const pluginInfo = { 
                            name: pluginName, 
                            instance: plugin,
                            isLegacy: isLegacyPlugin,
                            isCore: isCore,
                            path: pluginPath,
                            loadTime: new Date()
                        };
                        
                        // Track loaded plugins
                        if (!this.loadedPlugins) {
                            this.loadedPlugins = [];
                        }
                        this.loadedPlugins.push(pluginInfo);
                        
                        // Emit plugin load event
                        if (eventService) {
                            eventService.emit('plugin.loaded', pluginInfo);
                            
                            // Persist core plugin loads as system events
                            if (isCore) {
                                await this._logSystemEvent('plugin.load', {
                                    pluginName,
                                    isLegacy: isLegacyPlugin
                                });
                            }
                        }
                        
                        logService.info(`Plugin ${pluginName} loaded and initialized`);
                    } catch (pluginInstantiationError) {
                        logService.error(`Failed to instantiate plugin ${pluginName}:`, pluginInstantiationError);
                        
                        // Emit plugin error event
                        if (eventService) {
                            eventService.emit('plugin.error', {
                                pluginName,
                                error: pluginInstantiationError.message,
                                stack: pluginInstantiationError.stack
                            });
                        }
                    }
                } catch (pluginError) {
                    logService.error(`Failed to load plugin ${file}:`, pluginError);
                }
            }
        } catch (error) {
            logService.error('Error loading plugins from directory:', error);
        }
    }
    
    /**
     * Unload a specific plugin
     * @param {string} pluginName - Name of the plugin to unload
     * @returns {Promise<boolean>} Success status
     */
    async unloadPlugin(pluginName) {
        const { logService, eventService } = this.services;
        
        if (!this.loadedPlugins || !this.loadedPlugins.length) {
            logService.warn(`No plugins loaded, can't unload ${pluginName}`);
            return false;
        }
        
        const pluginIndex = this.loadedPlugins.findIndex(p => p.name === pluginName);
        if (pluginIndex === -1) {
            logService.warn(`Plugin ${pluginName} not found`);
            return false;
        }
        
        const plugin = this.loadedPlugins[pluginIndex];
        
        try {
            // Call plugin's shutdown method if it exists
            if (plugin.instance && typeof plugin.instance.shutdown === 'function') {
                await plugin.instance.shutdown();
                logService.info(`Plugin ${pluginName} shutdown complete`);
            }
            
            // Try to clear the module from cache to allow reloading
            try {
                delete require.cache[require.resolve(plugin.path)];
            } catch (cacheError) {
                logService.warn(`Couldn't clear ${pluginName} from require cache: ${cacheError.message}`);
            }
            
            // Remove from loaded plugins list
            this.loadedPlugins.splice(pluginIndex, 1);
            
            // Emit plugin unload event
            if (eventService) {
                eventService.emit('plugin.unloaded', { 
                    name: pluginName,
                    unloadTime: new Date()
                });
            }
            
            logService.info(`Plugin ${pluginName} unloaded successfully`);
            return true;
        } catch (error) {
            logService.error(`Error unloading plugin ${pluginName}:`, error);
            
            // Emit plugin error event
            if (eventService) {
                eventService.emit('plugin.error', {
                    pluginName,
                    action: 'unload',
                    error: error.message,
                    stack: error.stack
                });
            }
            
            return false;
        }
    }
    
    /**
     * Unload all plugins
     * @returns {Promise<void>}
     */
    async unloadAllPlugins() {
        const { logService } = this.services;
        
        if (!this.loadedPlugins || !this.loadedPlugins.length) {
            logService.info('No plugins to unload');
            return;
        }
        
        logService.info(`Unloading ${this.loadedPlugins.length} plugins...`);
        
        // First unload non-core plugins
        const nonCorePlugins = this.loadedPlugins.filter(p => !p.isCore);
        for (const plugin of nonCorePlugins) {
            await this.unloadPlugin(plugin.name);
        }
        
        // Then unload core plugins in reverse order
        const corePlugins = this.loadedPlugins.filter(p => p.isCore).reverse();
        for (const plugin of corePlugins) {
            await this.unloadPlugin(plugin.name);
        }
        
        logService.info('All plugins unloaded');
    }
    
    /**
     * Start the application
     * @returns {Promise<boolean>} Success status
     */
    async start() {
        try {
            const { logService } = this.services;
            
            logService.info('Starting application...');
            
            // Start server manager if it exists
            if (this.serverManager) {
                await this.serverManager.start();
                logService.info('Server manager started');
            }
            
            // Start API server if configured
            if (this.config.api && this.config.api.enabled) {
                // Dynamic import for API server
                const ApiServer = require('../api/NSMR-Api-Server');
                this.apiServer = new ApiServer(this.config.api, this.services, this.controllers);
                await this.apiServer.start();
                logService.info(`API server started on port ${this.config.api.port}`);
            }
              // Start web server if configured
            if (this.config.web && this.config.web.enabled) {
                // Dynamic import for web server (ESM module)
                const WebServerModule = await import('../web/NSMR-Web-Server.js');
                const WebServer = WebServerModule.default;
                this.webServer = new WebServer(this.config.web, this.services, this.controllers);
                await this.webServer.start();
                logService.info(`Web server started on port ${this.config.web.port}`);
            }
            
            logService.info('Application started successfully');
            return true;
        } catch (error) {
            console.error('Error starting application:', error);
            return false;
        }
    }
    
    /**
     * Stop the application
     * @returns {Promise<boolean>} Success status
     */
    async stop() {
        try {
            const { logService } = this.services;
            
            logService.info('Stopping application...');
            
            // Stop API server if it exists
            if (this.apiServer) {
                await this.apiServer.stop();
                logService.info('API server stopped');
            }
            
            // Stop web server if it exists
            if (this.webServer) {
                await this.webServer.stop();
                logService.info('Web server stopped');
            }
            
            // Stop server manager if it exists
            if (this.serverManager) {
                await this.serverManager.stop();
                logService.info('Server manager stopped');
            }
            
            // Unload plugins
            await this.unloadPlugins();
            
            logService.info('Application stopped successfully');
            return true;
        } catch (error) {
            console.error('Error stopping application:', error);
            return false;
        }
    }
    
    /**
     * Unload plugins when application stops
     * @private
     * @returns {Promise<void>}
     */
    async unloadPlugins() {
        if (!this.loadedPlugins || this.loadedPlugins.length === 0) {
            return; // No plugins to unload
        }
        
        const { logService } = this.services;
        logService.info(`Unloading ${this.loadedPlugins.length} plugins...`);
        
        for (const plugin of this.loadedPlugins) {
            try {
                // If plugin has disable or unload method, call it
                if (typeof plugin.instance.disable === 'function') {
                    await plugin.instance.disable();
                    logService.debug(`Disabled plugin: ${plugin.name}`);
                } else if (typeof plugin.instance.unload === 'function') {
                    await plugin.instance.unload();
                    logService.debug(`Unloaded plugin: ${plugin.name}`);
                }
            } catch (error) {
                logService.error(`Error unloading plugin ${plugin.name}:`, error);
            }
        }
        
        logService.info('All plugins unloaded');
    }
    
    /**
     * Get service by name
     * @param {string} serviceName - Service name
     * @returns {Object|null} Service instance or null if not found
     */
    getService(serviceName) {
        return this.services[serviceName] || null;
    }
    
    /**
     * Get controller by name
     * @param {string} controllerName - Controller name
     * @returns {Object|null} Controller instance or null if not found
     */
    getController(controllerName) {
        return this.controllers[controllerName] || null;
    }
    
    /**
     * Log a system event
     * @param {string} eventType - Type of system event
     * @param {Object} data - Event data
     * @param {boolean} persist - Whether to persist to database
     * @returns {Promise<Object|null>} Created event or null
     * @private
     */
    async _logSystemEvent(eventType, data = {}, persist = true) {
        try {
            const { eventService, logService } = this.services;
            
            if (!eventService) {
                if (logService) {
                    logService.warn(`Cannot log system event: EventService not available`);
                } else {
                    console.warn(`Cannot log system event: EventService not available`);
                }
                return null;
            }
            
            // Log with logService for console/file output
            if (logService) {
                logService.info(`System event: ${eventType}`, data);
            }
            
            // Emit and store with eventService
            return await eventService.emitAndStore(`system.${eventType}`, data, persist);
        } catch (error) {
            console.error(`Error logging system event: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Gracefully shutdown the application
     * @returns {Promise<void>}
     */
    async shutdown() {
        const { logService } = this.services;
        
        try {
            logService.info('Application shutdown initiated');
            
            // Log shutdown event
            await this._logSystemEvent('shutdown', {
                reason: 'controlled',
                shutdownTime: new Date()
            });
            
            // Unload plugins
            await this.unloadAllPlugins();
            
            // Any other cleanup tasks
            logService.info('Application shutdown complete');
        } catch (error) {
            if (logService) {
                logService.error('Error during application shutdown', error);
            } else {
                console.error('Error during application shutdown:', error);
            }
        }
    }

    /**
     * Initialize the API server
     * @private
     * @returns {Promise<void>}
     */
    async initializeAPI() {
        try {
            // Import API modules
            const express = require('express');
            const cors = require('cors');
            const helmet = require('helmet');
            const morgan = require('morgan');
            const rateLimit = require('express-rate-limit');
            
            // Create Express app
            const apiApp = express();
              // Basic middleware
            apiApp.use(express.json());
            apiApp.use(express.urlencoded({ extended: true }));
              // Configure CORS for API to allow credentials
            const allowedOrigins = [
                // Default web interface origin
                this.config.web?.hostname ? `http://${this.config.web.hostname}:${this.config.web.port}` : 'http://localhost:8080',
                // Allow development server
                'http://localhost:3000',
                // Allow Vite dev server
                'http://localhost:5173',
                // Allow alternative web interface origins
                ...(this.config.api?.allowedOrigins || [])
            ];

            console.log('API CORS allowed origins:', allowedOrigins);
            
            // Configure CORS
            apiApp.use(cors({
                origin: (origin, callback) => {
                    // Allow requests with no origin (like mobile apps or curl requests)
                    if (!origin) return callback(null, true);
                    
                    // Allow all origins in development
                    if (this.config.env === 'development') {
                        return callback(null, true);
                    }
                    
                    // Check if the origin is allowed
                    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
                        callback(null, true);
                    } else {
                        console.warn(`CORS blocked request from origin: ${origin}`);
                        callback(new Error('Not allowed by CORS'));
                    }
                },
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
                allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
            }));            // Handle preflight OPTIONS requests for all routes
            // Use a middleware instead of the wildcard path pattern to avoid path-to-regexp issues
            apiApp.use((req, res, next) => {
                if (req.method === 'OPTIONS') {
                    cors({
                        origin: true,
                        credentials: true,
                        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
                        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
                    })(req, res, next);
                } else {
                    next();
                }
            });
            
            apiApp.use(helmet({
                contentSecurityPolicy: false // May need to be false depending on your frontend
            }));
            
            // Logging middleware
            if (this.config.api?.logging !== false) {
                const logger = this.services.logService || console;
                apiApp.use(morgan('combined', {
                    stream: {
                        write: (message) => logger.debug(message.trim())
                    }
                }));
            }
            
            // Rate limiting
            if (this.config.api?.rateLimit) {
                const limiter = rateLimit({
                    windowMs: this.config.api.rateLimit.windowMs || 900000, // 15 minutes default
                    max: this.config.api.rateLimit.max || 300, // limit each IP
                    standardHeaders: true,
                    legacyHeaders: false
                });
                apiApp.use(limiter);
            }
            
            // Load API routes
            await this.initializeAPIRoutes(apiApp);
            
            // Error handling middleware
            apiApp.use((err, req, res, next) => {
                const logger = this.services.logService || console;
                logger.error('API Error:', err);
                res.status(500).json({ 
                    success: false, 
                    error: 'Internal server error' 
                });
            });
            
            // Start API server
            const port = this.config.api?.port || 3001;
            this.apiServer = apiApp.listen(port, () => {
                const logger = this.services.logService || console;
                logger.info(`API server listening on port ${port}`);
            });
        } catch (error) {
            const logger = this.services.logService || console;
            logger.error('Failed to initialize API:', error);
            throw error;
        }
    }

    /**
     * Initialize API routes - Safe version with no dynamic loading
     * @private
     * @param {Object} apiApp - Express app instance
     * @returns {Promise<void>}
     */
    async initializeAPIRoutes(apiApp) {
        try {
            // Import express
            const express = require('express');
            
            // Create API router
            const apiRouter = express.Router();
            
            // API root route
            apiRouter.get('/', (req, res) => {
                res.json({ 
                    success: true,
                    message: 'Node Server Manager API is running',
                    version: '2.0.0'
                });
            });
            
            // Static routes instead of dynamic loading
            apiRouter.get('/status', (req, res) => {
                res.json({
                    success: true,
                    status: 'operational',
                    timestamp: new Date().toISOString()
                });
            });
            
            // Setup basic routes for essential functionality
            this.setupBasicRoutes(apiRouter);            // Mount API router under /api
            apiApp.use('/api', apiRouter);
            
            // Middleware de gestion des 404 pour les routes API - sans utiliser d'astérisque
            apiApp.use('/api', (req, res, next) => {
                // Ce middleware ne sera exécuté que si aucune des routes précédentes n'a répondu
                if (!res.headersSent) {
                    res.status(404).json({
                        success: false,
                        error: 'API endpoint not found',
                        path: req.originalUrl
                    });
                } else {
                    next();
                }
            });
            
            console.log('API routes initialized successfully (safe mode)');
        } catch (error) {
            console.error('Failed to initialize API routes:', error);
            throw error;
        }
    }

    /**
     * Setup basic routes without using external files
     * @private
     * @param {Object} apiRouter - Express router
     */    setupBasicRoutes(apiRouter) {
        const express = require('express');
        
        // Authentication middleware for protected routes - Moved to the top to avoid initialization error
        const authMiddleware = (req, res, next) => {
            const authHeader = req.headers.authorization;
            
            console.log('Auth middleware - Headers:', req.headers);
            console.log('Auth middleware - Authorization header:', authHeader);
            
            // Check if Authorization header exists and has Bearer token
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                console.log('Auth middleware - Token found:', token.substring(0, 20) + '...');
                
                // For demo purposes, any non-empty token is considered valid
                if (token) {
                    // Add user info to request for controllers to use
                    req.user = {
                        id: 'admin',
                        username: 'admin',
                        role: 'admin',
                        // Important: Make this false to show the setup page
                        hasCompletedSetup: false,
                        setupStep: 1
                    };
                    
                    console.log('Auth middleware - User authenticated:', req.user);
                    return next();
                }
            }
            
            console.warn('Auth middleware - Authentication failed: Invalid or missing token');
            
            // If no token or invalid token
            res.status(401).json({
                success: false,
                error: 'Unauthorized: Valid authentication token required'
            });
        };
        
        // Servers routes (MVC)
        const setupServersRoutes = require('../api/routes/servers');
        apiRouter.use('/servers', setupServersRoutes(this.serverManager));
        console.log('Added servers routes');
        
        // Players routes (MVC)
        const setupPlayersRoutes = require('../api/routes/players');
        apiRouter.use('/players', setupPlayersRoutes({ controllers: this.controllers }));
        console.log('Added players routes');
        
        // Matches routes (MVC)
        const setupMatchesRoutes = require('../api/routes/matches');
        apiRouter.use('/matches', setupMatchesRoutes(this.serverManager));
        console.log('Added matches routes');
        
        // Auth routes
        const setupAuthRoutes = require('../api/routes/auth');
        apiRouter.use('/auth', setupAuthRoutes(this.serverManager));
        console.log('Added auth routes');
        
        // Events routes (use real implementation)
        const setupEventRoutes = require('../api/routes/events');
        apiRouter.use('/events', setupEventRoutes(this.serverManager));
        
        // Stats routes
        const statsRouter = express.Router();
        statsRouter.get('/general', (req, res) => {
            res.json({
                success: true,
                message: 'Stats API is working',
                stats: {
                    totalServers: 0,
                    activePlayers: 0,
                    totalMatches: 0,
                    totalEvents: 0,
                    recentPlayers: []
                }
            });
        });
        statsRouter.get('/players', (req, res) => {
            res.json({
                success: true,
                message: 'Player stats API is working',
                playerStats: []
            });
        });
        statsRouter.get('/servers', (req, res) => {
            res.json({
                success: true,
                message: 'Server stats API is working',
                serverStats: []
            });
        });
        statsRouter.get('/playtime', (req, res) => {
            res.json({
                success: true,
                message: 'Playtime stats API is working',
                stats: {
                    totalPlaytime: 0,
                    averageSession: 0,
                    topGames: []
                }
            });
        });
        statsRouter.get('/zombies', (req, res) => {
            res.json({
                success: true,
                message: 'Zombie stats API is working',
                stats: {
                    totalKills: 0,
                    highestRound: 0,
                    totalRevives: 0,
                    totalGames: 0
                }
            });
        });
        
        statsRouter.get('/leaderboard', (req, res) => {
            res.json({
                success: true,
                message: 'Leaderboard API is working',
                players: []
            });
        });
        
        statsRouter.get('/multiplayer', (req, res) => {
            res.json({
                success: true,
                message: 'Multiplayer stats API is working',
                stats: {
                    totalKills: 0, 
                    totalDeaths: 0,
                    totalMatches: 0,
                    popularModes: []
                }
            });
        });
        
        apiRouter.use('/stats', statsRouter);
        console.log('Added stats routes');
    }/**
     * Initialize the web interface
     * @private
     * @returns {Promise<void>}
     */    async initializeWebInterface() {
        try {
            const { logService } = this.services;
            
            logService.info('Initializing web interface...');
            
            // Check if the web directory exists
            const fs = require('fs');
            const path = require('path');
            const webDir = path.join(__dirname, '../web');
            
            if (!fs.existsSync(webDir)) {
                logService.error('Web directory not found at:', webDir);
                throw new Error('Web directory not found');
            }
            
            if (!fs.existsSync(path.join(webDir, 'NSMR-Web-Server.js'))) {
                logService.error('NSMR-Web-Server.js not found in web directory');
                throw new Error('Web server module not found');
            }
            
            // Web server will be started in the start() method with dynamic import
            logService.info('Web interface initialization prepared');
        } catch (error) {
            logService.error('Failed to initialize web interface:', error);
            throw error;
        }
    }
}

module.exports = AppController;
