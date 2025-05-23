/**
 * Logging system for Node Server Manager
 * 
 * @deprecated This module now serves as an adapter for the LogService in the MVC architecture
 * New code should use LogService directly from the services container instead
 */

const path = require('path');
const fs = require('fs');
const config = require('../config-loader');

// Attempt to load LogService if available
let logService = null;
try {
    const LogService = require('../services/LogService');
    logService = new LogService(config.logging || {});
} catch (err) {
    console.warn('LogService not found, falling back to legacy logger');
}

// Ensure log directory exists (for legacy mode)
const logDir = path.dirname(config.logging.file || './logs/server.log');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Function to safely stringify objects with circular references
function safeStringify(obj, replacer, spaces) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular Reference]';
            }
            seen.add(value);
        }
        return replacer ? replacer(key, value) : value;
    }, spaces);
}

// Console colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};

// Log levels - kept for backward compatibility
const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
};

// Configured level - priority to LOG_LEVEL environment variable if defined
const configuredLevel = process.env.LOG_LEVEL || config.logging.level || 'info';

// Skip categories - don't log messages containing these terms for info level
// Only used in legacy mode when LogService is not available
const skipCategories = [
    'database', 'db', 'Database', 'DB', 'tables', 'Tables', 'initialized',
    'Colonne', 'column', 'Column', 'session', 'Session', 'ajoutée', 'added',
    'data', 'Data', 'sql', 'SQL', 'query', 'Query'
];

// Function to format date
function formatDate() {
    const now = new Date();
    return now.toISOString();
}

// Function to write to log file
function writeToFile(level, message) {
    if (!config.logging.file) return;
    
    // Skip certain info logs based on content
    if (level === 'info' && typeof message === 'string') {
        for (const category of skipCategories) {
            if (message.includes(category)) {
                return; // Skip this log
            }
        }
    }
    
    let formattedMessage = message;
    
    // Handle object logging safely
    if (typeof message === 'object' && message !== null) {
        try {
            formattedMessage = safeStringify(message, null, 2);
        } catch (err) {
            formattedMessage = '[Object that cannot be stringified]';
        }
    }
    
    const logEntry = `[${formatDate()}] [${level.toUpperCase()}] ${formattedMessage}\n`;
    fs.appendFileSync(config.logging.file, logEntry);
}

// Function to display in the console
function writeToConsole(level, message, color) {
    if (config.logging.console === false) return;
    
    // Skip certain info logs based on content
    if (level === 'info' && typeof message === 'string') {
        for (const category of skipCategories) {
            if (message.includes(category)) {
                return; // Skip this log
            }
        }
    }
    
    let formattedMessage = message;
    
    // Handle object logging safely
    if (typeof message === 'object' && message !== null) {
        try {
            formattedMessage = safeStringify(message, null, 2);
        } catch (err) {
            formattedMessage = '[Object that cannot be stringified]';
        }
    }
    
    const logEntry = `${color}[${formatDate()}] [${level.toUpperCase()}]${colors.reset} ${formattedMessage}`;
    console.log(logEntry);
}

// Create logger adapter that uses LogService when available, falls back to legacy implementation otherwise
const logger = {
    debug: function(message) {
        if (logService) {
            // Use LogService implementation
            logService.debug(message);
        } else if (levels[configuredLevel] <= levels.debug) {
            // Legacy implementation
            writeToFile('debug', message);
            writeToConsole('debug', message, colors.dim);
        }
    },
    
    info: function(message) {
        if (logService) {
            // Use LogService implementation
            logService.info(message);
        } else if (levels[configuredLevel] <= levels.info) {
            // Legacy implementation
            writeToFile('info', message);
            writeToConsole('info', message, colors.green);
        }
    },
    
    warn: function(message) {
        if (logService) {
            // Use LogService implementation
            logService.warn(message);
        } else if (levels[configuredLevel] <= levels.warn) {
            // Legacy implementation
            writeToFile('warn', message);
            writeToConsole('warn', message, colors.yellow);
        }
    },
    
    error: function(message, err) {
        if (logService) {
            // Use LogService implementation
            logService.error(message, err);
        } else if (levels[configuredLevel] <= levels.error) {
            let logMessage = message;
            
            // Convert object messages to safe string
            if (typeof message === 'object' && message !== null) {
                try {
                    logMessage = safeStringify(message, null, 2);
                } catch (e) {
                    logMessage = '[Object that cannot be stringified]';
                }
            }
            
            // If an error is provided, add error details
            if (err) {
                if (typeof err === 'object' && err.stack) {
                    logMessage += `\n${err.message}\n${err.stack}`;
                } else if (typeof err === 'object') {
                    try {
                        logMessage += `\n${safeStringify(err, null, 2)}`;
                    } catch (e) {
                        logMessage += `\n[Error object that cannot be stringified]`;
                    }
                } else {
                    logMessage += `\n${err}`;
                }
            }
              writeToFile('error', logMessage);
            writeToConsole('error', message, colors.red);
            // Display stack trace in console but more discreetly
            if (err && err.stack) {
                console.error(colors.dim, err.stack, colors.reset);
            }
        }
    },
    
    fatal: function(message) {
        if (logService) {
            // LogService doesn't have fatal, use error instead
            logService.error(`FATAL: ${message}`);
        } else if (levels[configuredLevel] <= levels.fatal) {
            // Legacy implementation
            writeToFile('fatal', message);
            writeToConsole('fatal', message, `${colors.bright}${colors.red}`);
        }
    },
    
    // Fonction pour coloriser le texte dans la console
    colorize: function(text, color) {
        return `${colors[color]}${text}${colors.reset}`;
    }
};

module.exports = logger;
