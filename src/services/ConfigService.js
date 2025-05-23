/**
 * Configuration Service - Centralized configuration management
 */
const path = require('path');

class ConfigService {
    /**
     * Create a new ConfigService
     * @param {Object} globalConfig - Global configuration object
     */
    constructor(globalConfig = null) {
        this.config = globalConfig || require('../config-loader');
    }

    /**
     * Get configuration value
     * @param {string} key - Dot notation path to config value
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Configuration value
     */
    get(key, defaultValue = null) {
        try {
            // Handle dot notation (e.g., "api.port")
            const parts = key.split('.');
            let value = this.config;
            
            for (const part of parts) {
                value = value[part];
                if (value === undefined) return defaultValue;
            }
            
            return value;
        } catch (error) {
            return defaultValue;
        }
    }

    /**
     * Check if configuration has a specific key
     * @param {string} key - Configuration key in dot notation
     * @returns {boolean} True if exists
     */
    has(key) {
        try {
            const parts = key.split('.');
            let value = this.config;
            
            for (const part of parts) {
                value = value[part];
                if (value === undefined) return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get entire configuration object
     * @returns {Object} Configuration object
     */
    getAll() {
        return this.config;
    }
}

module.exports = ConfigService;