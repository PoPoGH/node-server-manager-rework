/**
 * Web Server - Serves the React frontend for the MVC architecture
 * Handles static file serving and route forwarding to React Router
 */
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { existsSync } from 'fs';
import { createProxyMiddleware } from 'http-proxy-middleware';
import fetch from 'node-fetch';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class WebServer {
    /**
     * Create a new WebServer
     * @param {Object} config - Web server configuration
     * @param {Object} services - Service container with references to other services
     * @param {Object} controllers - Controller container with references to controllers
     */
    constructor(config, services, controllers) {
        this.config = config || {};
        this.services = services || {};
        this.controllers = controllers || {};
        this.port = this.config.port || 3000;
        this.app = null;
        this.server = null;
        this.io = null;
        this.logService = this.services.logService || console;
    }
    
    /**
     * Initialize the web server
     * @private
     * @returns {Promise<void>}
     */
    async initialize() {
        // Create express app
        this.app = express();
        
        // Set up static file serving from the dist directory
        const staticPath = join(__dirname, 'dist');
          // Check if dist directory exists
        const distDirExists = existsSync(staticPath);
        
        if (distDirExists) {
            this.app.use(express.static(staticPath));
            this.logService.info('Serving static files from: ' + staticPath);
        } else {
            this.logService.warn('Static directory not found: ' + staticPath);
            this.logService.warn('Frontend assets will not be served. Please build the frontend first.');
        }
        
        // Setup API proxy to forward requests from /api to the API server
        const apiPort = this.config.apiPort || 3001; // API server port
        const apiHost = this.config.apiHost || 'localhost'; // API server host
        
        // Log API proxy configuration
        this.logService.info(`Setting up API proxy to http://${apiHost}:${apiPort}/`);        // Create API proxy middleware
        const apiProxy = createProxyMiddleware({
            target: `http://${apiHost}:${apiPort}`,
            changeOrigin: true,
            // Rewrite the path to remove the /api prefix since the API server already has routes mounted under /api
            pathRewrite: { '^/api': '' },
            logLevel: 'debug',
            onProxyReq: (proxyReq, req, res) => {
                this.logService.debug(`Proxying ${req.method} ${req.url} to API server`);
                // Log headers for debugging
                this.logService.debug(`Request headers: ${JSON.stringify(req.headers)}`);
            },
            onProxyRes: (proxyRes, req, res) => {
                this.logService.debug(`Received response from API server: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
            },
            onError: (err, req, res) => {
                this.logService.error(`API Proxy Error: ${err.message}`);
                res.status(500).json({ 
                    success: false, 
                    error: 'API server communication error',
                    message: err.message
                });
            }
        });
        
        // Apply API proxy middleware to /api routes
        this.app.use('/api', apiProxy);
        this.logService.info('API proxy middleware configured');
        
        // Set up HTTP server
        this.server = createServer(this.app);
        
        // Set up socket.io if it's enabled
        if (this.config.enableSocketIO !== false) {            try {
                // Create Socket.IO server with enhanced configuration
                this.io = new Server(this.server, {
                    cors: {
                        origin: this.config.corsOrigin || '*',
                        methods: ['GET', 'POST', 'OPTIONS'],
                        credentials: true,
                        allowedHeaders: ['Content-Type', 'Authorization']
                    },
                    path: '/socket.io',
                    transports: ['websocket', 'polling'],
                    connectTimeout: 15000, // Increase connection timeout
                    pingTimeout: 60000,    // Longer ping timeout for stability
                    pingInterval: 25000    // More frequent pings
                });
                
                // Add authentication middleware if auth service is available
                if (this.services.authService) {
                    this.io.use((socket, next) => {
                        const token = socket.handshake.auth?.token;
                        
                        if (token) {
                            try {
                                // In a real implementation, verify the token
                                // For now, just accept any token
                                socket.user = { authenticated: true };
                                next();
                            } catch (error) {
                                next(new Error('Authentication error'));
                            }
                        } else {
                            // Allow unauthenticated connections but mark them
                            socket.user = { authenticated: false };
                            next();
                        }
                    });
                }
                
                this.setupSocketHandlers();
                this.logService.info('Socket.IO initialized successfully');
            } catch (error) {
                this.logService.error('Failed to initialize Socket.IO:', error);
                // Continue without socket.io
            }
        }
        
        // Check if index.html exists
        const indexHtmlPath = join(staticPath, 'index.html');
        const indexExists = existsSync(indexHtmlPath);
          // For all other routes, send the index.html file if it exists
        // This allows React Router to handle all routes
        this.app.get('/', (req, res) => {
            if (indexExists) {
                res.sendFile(indexHtmlPath);
            } else {
                res.status(200).send('<h1>Node Server Manager</h1><p>Web interface is running, but frontend assets are not built yet.</p>');
            }
        });
        
        // Exclude API routes from catchall handling
        // Handle all non-API paths with React Router
        this.app.use((req, res, next) => {
            // Skip this middleware for API routes
            if (req.url.startsWith('/api/')) {
                return next();
            }
            
            if (indexExists) {
                res.sendFile(indexHtmlPath);
            } else {
                res.status(404).send('<h1>Node Server Manager</h1><p>Page not found</p><p>Note: The frontend assets may not be built yet.</p>');
            }
        });
        
        this.logService.info('Web server initialized');
    }
    
    /**
     * Set up socket.io event handlers
     * @private
     */    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            this.logService.debug('A client connected to socket.io');
            
            // Set up event handlers
            socket.on('disconnect', () => {
                this.logService.debug('Client disconnected from socket.io');
            });
            
            // Handle requests for state
            socket.on('request_state', () => {
                socket.emit('state', { connected: true });
            });
            
            // Handle filter settings
            socket.on('filter', (filters) => {
                // Store filters for this socket session
                socket.filters = filters;
            });
        });
        
        // Create a logs namespace for real-time log streaming
        const logsNamespace = this.io.of('/logs');
        logsNamespace.on('connection', (socket) => {
            this.logService.debug('Client connected to logs namespace');
            
            socket.on('request_state', () => {
                socket.emit('state', { connected: true });
            });
            
            socket.on('filter', (filters) => {
                // Store filters for this socket session
                socket.filters = filters;
            });
            
            socket.on('disconnect', () => {
                this.logService.debug('Client disconnected from logs namespace');
            });
        });
        
        // Set up server events forwarding if we have a server manager
        if (this.services.serverManager) {
            this.services.serverManager.on('server:update', (serverData) => {
                this.io.emit('server:update', serverData);
            });
            
            this.services.serverManager.on('server:started', (serverData) => {
                this.io.emit('server:started', serverData);
            });
            
            this.services.serverManager.on('server:stopped', (serverData) => {
                this.io.emit('server:stopped', serverData);
            });
            
            this.services.serverManager.on('server_event', (eventData) => {
                this.io.emit('server_event', eventData);
                
                // Also emit to the logs namespace with filtering
                const logsSpace = this.io.of('/logs');
                logsSpace.sockets.forEach(socket => {
                    // Apply filtering based on socket.filters if they exist
                    if (socket.filters) {
                        const { excludedEvents, includedEvents, serverFilter } = socket.filters;
                        
                        // Skip if event type is excluded
                        if (excludedEvents && excludedEvents.includes(eventData.type)) {
                            return;
                        }
                        
                        // Skip if we're filtering to specific event types and this isn't one
                        if (includedEvents && includedEvents.length && !includedEvents.includes(eventData.type)) {
                            return;
                        }
                        
                        // Skip if we're filtering to a specific server and this isn't it
                        if (serverFilter && eventData.serverId !== serverFilter) {
                            return;
                        }
                    }
                    
                    // Send the event to this socket
                    socket.emit('event', eventData);
                });
            });
        }
        
        this.logService.info('Socket.io handlers initialized');
    }
      /**
     * Start the web server
     * @returns {Promise<void>}
     */
    async start() {
        try {
            await this.initialize();
            
            return new Promise((resolve, reject) => {
                try {
                    // Check if port is already in use
                    this.server.on('error', (error) => {
                        if (error.code === 'EADDRINUSE') {
                            const msg = `Port ${this.port} is already in use. Please configure a different port.`;
                            this.logService.error(msg);
                            reject(new Error(msg));
                        } else {
                            this.logService.error('Server error:', error);
                            reject(error);
                        }
                    });
                    
                    this.server.listen(this.port, () => {
                        this.logService.info(`Web server is running on port ${this.port}`);
                        resolve();
                    });
                } catch (listenError) {
                    this.logService.error('Error while starting server:', listenError);
                    reject(listenError);
                }
            });
        } catch (error) {
            this.logService.error('Failed to start web server:', error);
            throw error;
        }
    }
      /**
     * Stop the web server
     * @returns {Promise<void>}
     */
    async stop() {
        return new Promise((resolve, reject) => {
            if (!this.server) {
                this.logService.warn('Web server was not running');
                return resolve();
            }
            
            this.server.close((error) => {
                if (error) {
                    this.logService.error('Error while stopping web server:', error);
                    return reject(error);
                }
                
                this.logService.info('Web server stopped');
                resolve();
            });
        });
    }
}

export default WebServer;
