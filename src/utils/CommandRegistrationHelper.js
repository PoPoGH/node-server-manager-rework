/**
 * Helper utility for registering commands from plugins
 * Simplifies the process of migrating from the old command system
 */

const logger = require('../core/NSMR-Logger');

class CommandRegistrationHelper {
    /**
     * Register a command from a plugin
     * @param {Object} serverManager - Server manager instance
     * @param {Object} commandConfig - Command configuration object
     * @returns {boolean} - True if command was registered successfully
     */
    static registerCommand(serverManager, commandConfig) {
        try {
            if (!serverManager || !serverManager.commandManager) {
                logger.error('Cannot register command: CommandManager not available');
                return false;
            }
            
            return serverManager.commandManager.registerCommand(commandConfig);
        } catch (error) {
            logger.error(`Error registering command: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Register multiple commands from a plugin
     * @param {Object} serverManager - Server manager instance
     * @param {Array<Object>} commands - Array of command configs
     * @returns {Object} - Object with counts of successes and failures
     */
    static registerCommands(serverManager, commands) {
        const result = {
            success: 0,
            failed: 0
        };
        
        if (!Array.isArray(commands)) {
            logger.error('Cannot register commands: input is not an array');
            return result;
        }
        
        for (const command of commands) {
            const success = this.registerCommand(serverManager, command);
            if (success) {
                result.success++;
            } else {
                result.failed++;
            }
        }
        
        return result;
    }
    
    /**
     * Create a command configuration object
     * @param {string} name - Command name
     * @param {Function} handler - Command handler function
     * @param {Object} options - Additional command options
     * @param {string|string[]} [options.aliases] - Command aliases
     * @param {string} [options.description] - Command description
     * @param {string} [options.usage] - Usage example
     * @param {string} [options.permission] - Required permission
     * @returns {Object} - Command configuration object
     */
    static createCommandConfig(name, handler, options = {}) {
        return {
            name,
            handler,
            aliases: options.aliases || [],
            description: options.description || `${name} command`,
            usage: options.usage || `!${name}`,
            permission: options.permission || null
        };
    }
      /**
     * Wrapper to migrate an existing command handler to the new system format
     * @param {Function} handler - Original command handler that used { command, args, player, server }
     * @returns {Function} - New format handler function (player, args, server)
     */
    static migrateHandler(handler) {
        return async (player, args, server) => {
            return await handler({ 
                player, 
                args, 
                server, 
                command: '' // Command name not needed as it's determined by registration
            });
        };
    }
    
    /**
     * Update a command's handler function
     * @param {Object} serverManager - Server manager instance
     * @param {string} commandName - Name of the command to update
     * @param {Function} newHandler - New handler function for the command
     * @returns {boolean} - True if the handler was updated successfully
     */
    static updateCommandHandler(serverManager, commandName, newHandler) {
        try {
            if (!serverManager || !serverManager.commandManager) {
                logger.error('Cannot update command handler: CommandManager not available');
                return false;
            }
            
            const command = serverManager.commandManager.getCommand(commandName);
            if (!command) {
                logger.error(`Command '${commandName}' not found for handler update`);
                return false;
            }
            
            // Update the handler
            command.handler = newHandler;
            logger.debug(`Handler updated for command '${commandName}'`);
            return true;
        } catch (error) {
            logger.error(`Error updating command handler: ${error.message}`);
            return false;
        }
    }
}

module.exports = CommandRegistrationHelper;
