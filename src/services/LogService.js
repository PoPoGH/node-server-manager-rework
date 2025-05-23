/**
 * LogService - Centralizes logging functionality for the MVC architecture
 * Handles logging to console, file and other destinations
 */
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const winston = require('winston');

class LogService extends EventEmitter {
    /**
     * Create a new LogService
     * @param {Object} config - Log configuration
     * @param {EventService} eventService - Optional event service for cross-service events
     */
    constructor(config = {}, eventService = null) {
        super();
        
        // Configuration with defaults
        this.config = {
            level: config.level || 'info',
            logDir: config.logDir || 'logs',
            filename: config.filename || 'server.log',
            maxSize: config.maxSize || '10m',
            maxFiles: config.maxFiles || 10,
            ...config
        };
        
        // Reference to EventService for cross-service events
        this.eventService = eventService;
        
        // Create log directory if it doesn't exist
        if (!fs.existsSync(this.config.logDir)) {
            fs.mkdirSync(this.config.logDir, { recursive: true });
        }
        
        // Initialize Winston logger
        this._initLogger();
        
        // Track active notifications
        this.activeNotifications = new Map();
        this.notificationId = 0;
        
        console.log(`LogService initialized at ${new Date().toISOString()}`);
    }
    
    /**
     * Set EventService reference after construction
     * This is needed when there's a circular dependency between services
     * @param {EventService} eventService - Event service for cross-service events
     */
    setEventService(eventService) {
        this.eventService = eventService;
    }
    
    /**
     * Initialize Winston logger
     * @private
     */
    _initLogger() {
        const { combine, timestamp, printf, colorize } = winston.format;
        
        // Define log format
        const logFormat = printf(({ level, message, timestamp, ...meta }) => {
            const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
            return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
        });
        
        // Create Winston logger
        this.logger = winston.createLogger({
            level: this.config.level,
            format: combine(
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                logFormat
            ),
            transports: [
                // Console transport
                new winston.transports.Console({
                    format: combine(
                        colorize(),
                        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                        logFormat
                    )
                }),
                
                // File transport
                new winston.transports.File({
                    filename: path.join(this.config.logDir, this.config.filename),
                    maxsize: this.config.maxSize,
                    maxFiles: this.config.maxFiles,
                    tailable: true
                })
            ]
        });
        
        // Add additional transports based on config
        if (this.config.additionalTransports) {
            for (const transport of this.config.additionalTransports) {
                this.logger.add(transport);
            }
        }
    }
    
    /**
     * Add an additional transport to the logger
     * @param {Object} transport - Winston transport
     */
    addTransport(transport) {
        this.logger.add(transport);
    }
    
    /**
     * Log a debug message
     * @param {string} message - Message to log
     * @param {Object} meta - Additional metadata
     */
    debug(message, meta = {}) {
        this._log('debug', message, meta);
    }
    
    /**
     * Log an info message
     * @param {string} message - Message to log
     * @param {Object} meta - Additional metadata
     */
    info(message, meta = {}) {
        this._log('info', message, meta);
    }
    
    /**
     * Log a warning message
     * @param {string} message - Message to log
     * @param {Object} meta - Additional metadata
     */
    warn(message, meta = {}) {
        this._log('warn', message, meta);
    }
    
    /**
     * Log an error message
     * @param {string} message - Message to log
     * @param {Error|Object} errorOrMeta - Error object or additional metadata
     */
    error(message, errorOrMeta = {}) {
        let meta = {};
        
        if (errorOrMeta instanceof Error) {
            meta.error = {
                message: errorOrMeta.message,
                stack: errorOrMeta.stack
            };
        } else {
            meta = errorOrMeta;
        }
        
        this._log('error', message, meta);
    }
    
    /**
     * Internal log method
     * @param {string} level - Log level
     * @param {string} message - Message to log
     * @param {Object} meta - Additional metadata
     * @private
     */
    _log(level, message, meta = {}) {
        // Add timestamp
        meta.timestamp = meta.timestamp || new Date();
        
        // Log to Winston
        this.logger.log({
            level,
            message,
            ...meta
        });
        
        // Emit events
        this.emit('log', { level, message, meta });
        this.emit(`log.${level}`, { message, meta });
        
        // Forward to EventService if available
        if (this.eventService) {
            try {
                // Don't await to avoid blocking
                this.eventService.emit(`log.${level}`, { message, meta });
                
                // Persist critical events
                if (level === 'error' || level === 'warn' || meta.persist === true) {
                    this.eventService.emitAndStore(`log.${level}`, { message, meta }, true).catch(err => {
                        console.error(`Error persisting log event: ${err.message}`);
                    });
                }
            } catch (error) {
                console.error(`Error forwarding log to EventService: ${error.message}`);
            }
        }
    }
    
    /**
     * Create a notification that can be displayed in UI
     * @param {string} message - Notification message
     * @param {string} type - Notification type (info, warning, error)
     * @param {Object} options - Notification options
     * @returns {number} - Notification ID
     */
    createNotification(message, type = 'info', options = {}) {
        const id = ++this.notificationId;
        
        const notification = {
            id,
            message,
            type,
            timestamp: new Date().toISOString(),
            read: false,
            ...options
        };
        
        this.activeNotifications.set(id, notification);
        
        // Log the notification
        this._log(type, `Notification [${id}]: ${message}`, options);
        
        // Emit notification event
        this.emit('notification', notification);
        
        // Emit notification event to EventService if available
        if (this.eventService) {
            this.eventService.emit('notification', notification);
        }
        
        return id;
    }
    
    /**
     * Mark a notification as read
     * @param {number} id - Notification ID
     * @returns {boolean} - Success
     */
    markNotificationAsRead(id) {
        if (this.activeNotifications.has(id)) {
            const notification = this.activeNotifications.get(id);
            notification.read = true;
            this.emit('notification.read', notification);
            
            // Emit notification.read event to EventService if available
            if (this.eventService) {
                this.eventService.emit('notification.read', notification);
            }
            
            return true;
        }
        return false;
    }
    
    /**
     * Get all active notifications
     * @param {boolean} includeRead - Whether to include read notifications
     * @returns {Array} - Active notifications
     */
    getNotifications(includeRead = false) {
        const notifications = Array.from(this.activeNotifications.values());
        return includeRead ? notifications : notifications.filter(n => !n.read);
    }
    
    /**
     * Parse and structure log line
     * @param {string} line - Log line
     * @returns {Object|null} - Parsed log or null if not parseable
     */
    parseLine(line) {
        try {
            // Simple log format parser: TIMESTAMP [LEVEL]: MESSAGE
            const regex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[([A-Z]+)\]: (.+)$/;
            const match = line.match(regex);
            
            if (match) {
                return {
                    timestamp: match[1],
                    level: match[2].toLowerCase(),
                    message: match[3]
                };
            }
            
            return null;
        } catch (error) {
            console.error(`Error parsing log line: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Create a child logger with specific context
     * @param {string} module - Module name
     * @param {Object} context - Additional context
     * @returns {Object} - Child logger
     */
    createChildLogger(module, context = {}) {
        const childLogger = {};
        
        // Create logging methods for each level
        ['debug', 'info', 'warn', 'error'].forEach(level => {
            childLogger[level] = (message, meta = {}) => {
                this[level](`[${module}] ${message}`, { ...context, ...meta });
            };
        });
        
        return childLogger;
    }
    
    /**
     * Stream log data to a websocket
     * @param {Object} ws - WebSocket connection
     */
    streamLogsToWebSocket(ws) {
        // Add event listener for log events
        const logHandler = (logData) => {
            try {
                ws.send(JSON.stringify({
                    type: 'log',
                    data: logData
                }));
            } catch (error) {
                console.error(`Error sending log to WebSocket: ${error.message}`);
            }
        };
        
        // Add event listener for notification events
        const notificationHandler = (notification) => {
            try {
                ws.send(JSON.stringify({
                    type: 'notification',
                    data: notification
                }));
            } catch (error) {
                console.error(`Error sending notification to WebSocket: ${error.message}`);
            }
        };
        
        // Add event listeners
        this.on('log', logHandler);
        this.on('notification', notificationHandler);
        
        // Remove event listeners when WebSocket closes
        ws.on('close', () => {
            this.removeListener('log', logHandler);
            this.removeListener('notification', notificationHandler);
        });
    }

    /**
     * Process raw log lines to extract structured events
     * @param {string} rawLog - Raw log line
     * @param {string} serverId - Server ID
     * @param {string} serverName - Server name
     * @private
     */
    _processRawLog(rawLog, serverId, serverName) {
        if (!rawLog) return;
        
        try {
            // Check for JSON patterns in log line
            if (rawLog.includes('{') && rawLog.includes('}')) {
                const jsonMatches = rawLog.match(/{.*}/g);
                if (jsonMatches) {
                    for (const match of jsonMatches) {
                        try {
                            const data = JSON.parse(match);
                            
                            // If it has an event property, emit that event
                            if (data.event) {
                                const eventData = {
                                    serverId,
                                    serverName,
                                    timestamp: new Date(),
                                    data
                                };
                                
                                // Emit locally
                                this.emit(data.event, eventData);
                                
                                // Emit via EventService if available
                                if (this.eventService) {
                                    this.eventService.emit(data.event, eventData);
                                }
                            }
                        } catch (jsonError) {
                            // Silently ignore JSON parse errors
                        }
                    }
                }
            }
            
            // Here you can add parsing for common game server log patterns
            // For example:
            
            // Player connection pattern
            const connectMatch = rawLog.match(/Player '(.+?)' \(id: (\d+), guid: ([a-fA-F0-9]+)\) connected/);
            if (connectMatch) {
                const [, name, id, guid] = connectMatch;
                const connectEvent = {
                    serverId,
                    serverName,
                    timestamp: new Date(),
                    data: { player: { name, id, guid } }
                };
                
                // Emit locally
                this.emit('player.connected', connectEvent);
                
                // Emit via EventService if available
                if (this.eventService) {
                    this.eventService.emit('player.connected', connectEvent);
                }
            }
            
            // Player disconnection pattern
            const disconnectMatch = rawLog.match(/Player '(.+?)' \(id: (\d+), guid: ([a-fA-F0-9]+)\) disconnected/);
            if (disconnectMatch) {
                const [, name, id, guid] = disconnectMatch;
                const disconnectEvent = {
                    serverId,
                    serverName,
                    timestamp: new Date(),
                    data: { player: { name, id, guid } }
                };
                
                // Emit locally
                this.emit('player.disconnected', disconnectEvent);
                
                // Emit via EventService if available
                if (this.eventService) {
                    this.eventService.emit('player.disconnected', disconnectEvent);
                }
            }
            
        } catch (error) {
            console.error('Error processing raw log:', error);
        }
    }

    /**
     * Process a raw log string to extract and emit relevant events
     * @param {string} rawLog - Raw log message
     * @param {Object} metadata - Associated metadata
     * @returns {Promise<boolean>} Whether events were extracted
     */
    async processRawLog(rawLog, metadata = {}) {
        if (!rawLog) return false;
        
        // Emit raw log event
        this.emit('log.raw', { rawLog, metadata });
        
        // If EventService is available, use it to extract events
        if (this.eventService) {
            try {
                const event = await this.eventService.extractEventsFromLog(rawLog, metadata);
                return !!event;
            } catch (error) {
                this.error('Error extracting events from log', error);
                return false;
            }
        }
        
        return false;
    }
    
    /**
     * Log a server log message with special processing for game server logs
     * @param {number} serverId - Server ID
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     */
    async serverLog(serverId, message, metadata = {}) {
        // Create combined metadata
        const combinedMeta = {
            ...metadata,
            serverId,
            source: 'server'
        };
        
        // Log to the standard log
        this._log('info', message, combinedMeta);
        
        // Process as raw log to extract events
        await this.processRawLog(message, combinedMeta);
    }
    
    /**
     * Log an event from a plugin
     * @param {string} pluginName - Name of the plugin
     * @param {string} eventType - Type of event
     * @param {Object} data - Event data
     * @param {boolean} persist - Whether to persist to database
     * @returns {Promise<Object|null>} Created event or null
     */
    async logPluginEvent(pluginName, eventType, data = {}, persist = false) {
        // Log as regular info message
        this.info(`Plugin event: ${pluginName}.${eventType}`, data);
        
        // Emit through EventService if available
        if (this.eventService) {
            try {
                return await this.eventService.emitAndStore(`plugin.${pluginName}.${eventType}`, data, persist);
            } catch (error) {
                this.error(`Error emitting plugin event: ${pluginName}.${eventType}`, error);
                return null;
            }
        }
        
        return null;
    }
}

module.exports = LogService;
