/**
 * Base Command - Abstract class for all commands
 * Provides common functionality and structure for commands
 */
class BaseCommand {
    /**
     * Create a new command
     * @param {Object} options - Command options
     * @param {string} options.name - Command name
     * @param {Array<string>} options.aliases - Command aliases (optional)
     * @param {string} options.description - Command description
     * @param {string} options.usage - Command usage instructions
     * @param {string|null} options.permission - Required permission to use this command (null for no permission)
     */
    constructor(options) {
        // Validate required options
        if (!options.name) {
            throw new Error('Command name is required');
        }        // Set command properties
        this.name = options.name;
        this.aliases = options.aliases || [];
        this.description = options.description || 'No description provided';
        this.usage = options.usage || `.${options.name}`;
        this.permission = options.permission || null; // null = no permission required
    }

    /**
     * Execute the command (abstract method to be implemented by subclasses)
     * @param {Array<string>} args - Command arguments
     * @param {Object} context - Command execution context (player, server, etc)
     * @returns {Promise<Object>} Command execution result
     */
    async execute(args, context) {
        throw new Error('Command execution not implemented');
    }    /**
     * Check if a player has permission to use this command
     * @param {Object} player - Player to check permissions for
     * @returns {boolean} Whether the player has permission
     */
    checkPermission(player) {
        // If no permission is required, anyone can use the command
        if (this.permission === null) {
            return true;
        }

        // Handle admin permission special case
        if (this.permission === 'admin' || this.permission === 'administrator') {
            return this._checkAdminPermission(player);
        }

        // Check if player has the required permission
        if (player && player.hasPermission) {
            return player.hasPermission(this.permission);
        } else if (player && player.permissions) {
            return player.permissions.includes(this.permission);
        } else if (player && player.role) {
            // Check permission based on role
            return this._roleHasPermission(player.role, this.permission);
        }

        // If no permission system is available, default to false for safety
        return false;
    }
    
    /**
     * Check if a player has admin permission
     * @param {Object} player - Player to check permissions for
     * @returns {boolean} Whether the player is an admin
     * @private
     */
    _checkAdminPermission(player) {
        if (!player) return false;
        
        // Check various admin indicators
        return (
            (player.isAdmin === true) || 
            (player.role === 'admin' || player.role === 'administrator') ||
            (player.permissions && (
                player.permissions.includes('admin') || 
                player.permissions.includes('administrator')
            ))
        );
    }
    
    /**
     * Check if a role has a specific permission
     * @param {string} role - Role name
     * @param {string} permission - Permission to check
     * @returns {boolean} Whether the role has the permission
     * @private
     */
    _roleHasPermission(role, permission) {
        // Basic role hierarchy
        const roles = {
            'admin': ['*'],
            'moderator': ['moderate', 'mute', 'kick', 'ban', 'stats'],
            'vip': ['stats', 'map'],
            'player': []
        };
        
        // Check if role exists
        if (!roles[role]) return false;
        
        // Admins have all permissions
        if (role === 'admin' || roles[role].includes('*')) return true;
        
        // Check specific permission
        return roles[role].includes(permission);
    }

    /**
     * Get command description
     * @returns {string} Command description
     */
    getDescription() {
        return this.description;
    }

    /**
     * Get command usage
     * @returns {string} Command usage instructions
     */
    getUsage() {
        return this.usage;
    }

    /**
     * Check if the command matches the given name (including aliases)
     * @param {string} commandName - Command name to check
     * @returns {boolean} Whether the command matches
     */
    matches(commandName) {
        const name = commandName.toLowerCase();
        return this.name.toLowerCase() === name || this.aliases.some(alias => alias.toLowerCase() === name);
    }
}

module.exports = BaseCommand;
