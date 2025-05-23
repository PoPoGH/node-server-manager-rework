/**
 * Application Bootstrap - Entry point for Node Server Manager MVC application
 */
const fs = require('fs');
const path = require('path');
const AppController = require('./controllers/AppController');
const ServiceFactory = require('./services/ServiceFactory');

// Load configuration
const config = require('./config-loader');

// Initialize logger first for better startup logging
const LogService = require('./services/LogService');
const logService = new LogService(config.logging || {});

// Database initialization
const initDatabase = async () => {
    try {
        const DatabaseService = require('./services/DatabaseService');
        const dbService = new DatabaseService(config.db, logService);
        await dbService.initialize();
        return { dbService, connection: dbService.getConnection() };
    } catch (error) {
        logService.error('Failed to initialize database service:', error);
        throw new Error('Database initialization failed: ' + error.message);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logService.error('Uncaught Exception:', error);
    fs.appendFileSync(
        path.join(config.logging?.logDir || 'logs', 'uncaught-exceptions.log'),
        `${new Date().toISOString()} - Uncaught Exception: ${error.message}\n${error.stack}\n\n`
    );
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logService.error('Unhandled Rejection:', reason);
    fs.appendFileSync(
        path.join(config.logging?.logDir || 'logs', 'unhandled-rejections.log'),
        `${new Date().toISOString()} - Unhandled Rejection: ${reason}\n\n`
    );
});

/**
 * Main application entry point
 */
async function main() {
    try {
        console.log('[app.js] Starting Node Server Manager...'); // Direct console log
        logService.info(`Starting Node Server Manager (${new Date().toISOString()})`);
        
        // Initialize database
        console.log('[app.js] Initializing database...'); // Direct console log
        logService.info('Initializing database...');
        let dbService, connection;
        try {
            const DatabaseService = require('./services/DatabaseService');
            const tempDbService = new DatabaseService(config.db, logService);
            await tempDbService.initialize();
            dbService = tempDbService;
            connection = tempDbService.getConnection();
            console.log(`[app.js] Database initialization complete. dbService defined: ${!!dbService}, connection defined: ${!!connection}`); // Direct console log
        } catch (error) {
            logService.error('Failed to initialize database service in main:', error);
            console.error('[app.js] Database initialization failed in main:', error); // Direct console log
            // dbService and connection will remain undefined or null
        }
        
        // Create service factory and register core services - Use singleton instance
        const serviceFactory = ServiceFactory.getInstance();
        serviceFactory.register('logService', logService);
        serviceFactory.register('configService', { config }); // Simple config service
        
        if (dbService) {
            serviceFactory.register('dbService', dbService);
        }
        // Enregistre la connexion (peut être null ou undefined si l'initialisation a échoué)
        serviceFactory.register('dbConnection', connection); 
        
        console.log(`[app.js] Before UserService/AuthService registration: dbService defined: ${!!dbService}, connection defined: ${!!connection}`); // Direct console log

        // Créer des services essentiels
        if (dbService && connection) {
            const UserService = require('./services/UserService');
            const AuthService = require('./services/AuthService');
            
            console.log('[app.js] Database connection available. Registering UserService and AuthService.'); // Direct console log
            logService.info('Database connection available. Registering UserService and AuthService.');
            serviceFactory.register('userService', new UserService(connection, logService));
            serviceFactory.register('authService', new AuthService(
                serviceFactory.get('userService'),
                logService
            ));
            console.log('[app.js] UserService and AuthService registered.'); // Direct console log
        } else {
            console.warn('[app.js] Database connection NOT available or dbService is missing.'); // Direct console log
            logService.warn('Database connection not available (connection is falsy or dbService missing).');
            
            const apiEnabled = config.api?.enabled;
            console.log(`[app.js] In DB connection failed else block: config.api?.enabled = ${apiEnabled}`); // Direct console log
            logService.info(`[app.js] Config for API check: config.api = ${JSON.stringify(config.api)}, config.api.enabled = ${apiEnabled}`);

            if (apiEnabled !== false) {
                console.error('[app.js] API is enabled, but DB connection failed. Throwing error.'); // Direct console log
                logService.error('API is enabled, but critical database-dependent services (UserService, AuthService) cannot be registered. Application cannot continue safely.');
                throw new Error('Database connection is required for API functionality but is not available.');
            } else {
                console.info('[app.js] Database not available, but API is disabled. Proceeding without UserService and AuthService.'); // Direct console log
                logService.info('Database not available, but API is disabled or not critically dependent on these services. Proceeding without UserService and AuthService.');
            }
        }
        
        // Create and initialize app controller with service factory
        logService.info('Creating application controller...');
        const app = new AppController(config, serviceFactory);
        
        // Initialize application
        logService.info('Initializing application...');
        const initSuccess = await app.initialize();
        
        if (!initSuccess) {
            logService.error('Application initialization failed');
            process.exit(1);
        }
        
        // Start application
        logService.info('Starting application...');
        const startSuccess = await app.start();
        
        if (!startSuccess) {
            logService.error('Application start failed');
            process.exit(1);
        }
        
        logService.info('Node Server Manager started successfully');
        
        // Handle shutdown signals
        const gracefulShutdown = async (signal) => {
            logService.info(`\nReceived ${signal}, shutting down gracefully...`);
            try {
                await app.stop();
                logService.info('Application shutdown complete');
                process.exit(0);
            } catch (error) {
                logService.error('Error during shutdown:', error);
                process.exit(1);
            }
        };
        
        // Register shutdown handlers
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        
    } catch (error) {
        logService.error('Fatal error during application startup:', error);
        process.exit(1);
    }
}

// Run the application
main().catch(error => {
    logService.error('Fatal error in main function:', error);
    process.exit(1);
});