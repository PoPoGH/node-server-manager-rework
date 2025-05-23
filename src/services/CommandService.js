/**
 * Command Manager - Handles command registration and execution in the MVC architecture
 */
const path = require('path');
const fs = require('fs');
const logger = require('../core/NSMR-Logger');

class CommandManager {
    /**
     * Create a new CommandManager
     * @param {Object} services - Service container with references to other services
     */
    constructor(services = {}) {
        this.commands = new Map();
        this.services = services;
        this.commandsPath = path.join(__dirname, '../commands');
        
        // Auto-register commands if directory exists
        if (fs.existsSync(this.commandsPath)) {
            this.registerCommandsFromDirectory();
        }
    }
    
    /**
     * Register a new command
     * @param {string} name - Command name
     * @param {Object} commandClass - Command class
     * @returns {boolean} Success status
     */
    registerCommand(name, commandClass) {
        try {
            if (this.commands.has(name)) {
                logger.warn(`Command '${name}' already registered. Overwriting.`);
            }
            
            // Create command instance with services
            const command = new commandClass(this.services);
            this.commands.set(name.toLowerCase(), command);
            logger.debug(`Command '${name}' registered`);
            return true;
        } catch (error) {
            logger.error(`Error registering command '${name}': ${error.message}`);
            return false;
        }
    }
    
    /**
     * Register all commands from the commands directory
     * @private
     */
    registerCommandsFromDirectory() {
        try {
            // Get all .js files in the commands directory
            const files = fs.readdirSync(this.commandsPath).filter(f => f.endsWith('.js'));
            
            // Load each command file
            for (const file of files) {
                try {
                    const filePath = path.join(this.commandsPath, file);
                    const commandClass = require(filePath);
                    
                    // Skip abstract base classes
                    if (file === 'BaseCommand.js') {
                        continue;
                    }
                    
                    // Get command name from filename (remove 'Command.js')
                    const name = file.replace('Command.js', '').toLowerCase();
                    
                    // Register command
                    this.registerCommand(name, commandClass);
                } catch (error) {
                    logger.error(`Failed to load command from file ${file}: ${error.message}`);
                }
            }
            
            logger.info(`Loaded ${this.commands.size} commands from directory`);
        } catch (error) {
            logger.error(`Error loading commands from directory: ${error.message}`);
        }
    }
    
    /**
     * Execute a command
     * @param {string} commandName - Command name
     * @param {Array} args - Command arguments
     * @param {Object} context - Command execution context (player, server, etc)
     * @returns {Promise<Object>} Command execution result
     */
    async executeCommand(commandName, args = [], context = {}) {
        try {
            const name = commandName.toLowerCase();
            
            // Check if command exists
            if (!this.commands.has(name)) {
                return {
                    success: false,
                    message: `Unknown command: ${commandName}`
                };
            }
            
            // Get command instance
            const command = this.commands.get(name);
            
            // Check permissions if context includes a player
            if (context.player && !command.checkPermission(context.player)) {
                return {
                    success: false,
                    message: `You don't have permission to use this command`
                };
            }
            
            // Execute command
            logger.debug(`Executing command: ${name} ${args.join(' ')}`);
            const result = await command.execute(args, context);
            
            // Log command execution to the event service if available
            if (this.services.eventService && context.player) {
                await this.services.eventService.createEvent({
                    type: 'command.executed',
                    playerId: context.player.clientId,
                    serverId: context.server ? context.server.id : null,
                    data: {
                        command: name,
                        args: args,
                        success: result.success,
                        result: result.message
                    }
                });
            }
            
            return result;
        } catch (error) {
            logger.error(`Error executing command '${commandName}': ${error.message}`);
            return {
                success: false,
                message: `Error executing command: ${error.message}`
            };
        }
    }
    
    /**
     * Get list of available commands
     * @param {Object} player - Player to check permissions for (optional)
     * @returns {Array} List of available commands
     */
    getAvailableCommands(player = null) {
        const available = [];
        
        for (const [name, command] of this.commands.entries()) {
            // Skip commands the player doesn't have permission for
            if (player && !command.checkPermission(player)) {
                continue;
            }
            
            available.push({
                name,
                description: command.getDescription(),
                usage: command.getUsage()
            });
        }
        
        return available;
    }
}

module.exports = CommandManager;
