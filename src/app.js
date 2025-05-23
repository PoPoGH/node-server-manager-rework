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
        logService.info(`Starting Node Server Manager (${new Date().toISOString()})`);
        
        // Initialize database
        logService.info('Initializing database...');
        const { dbService, connection } = await initDatabase();
        
        // Create service factory and register core services
        const serviceFactory = new ServiceFactory();
        serviceFactory.register('logService', logService);
        serviceFactory.register('configService', { config }); // Simple config service
        serviceFactory.register('dbService', dbService);
        
        if (connection) {
            serviceFactory.register('dbConnection', connection);
        }
        
        // Créer des services essentiels
        if (dbService && connection) {
            const UserService = require('./services/UserService');
            const AuthService = require('./services/AuthService');
            
            serviceFactory.register('userService', new UserService(connection, logService));
            serviceFactory.register('authService', new AuthService(
                serviceFactory.get('userService'),
                logService
            ));
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