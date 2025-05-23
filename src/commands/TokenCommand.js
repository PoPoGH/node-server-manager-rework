/**
 * Token Command for Node Server Manager
 * Handles token generation and registration for regular players (non-admin)
 * For linking game accounts with web accounts
 * 
 * Note: This is different from SetupTokenCommand which is used only for admin setup
 */

const BaseCommand = require('./BaseCommand');

class TokenCommand extends BaseCommand {
    /**
     * Create a new TokenCommand instance
     * @param {Object} services - Services container
     */
    constructor(services) {
        super({
            name: 'token',
            aliases: ['tk'],
            description: 'Génère un token pour lier votre compte en jeu à un nouveau compte web, ou utilisez un token existant',
            usage: '.token [your-token]',
            permission: null // No permission required (all players can use it)
        });
        
        // Store services
        this.services = services;
        this.db = services.db;
        this.userService = services.userService;
        this.logService = services.logService;
        
        if (!this.userService) {
            throw new Error('UserService is required for TokenCommand');
        }
        
        this.logService ? 
            this.logService.debug('TokenCommand initialized') : 
            console.debug('TokenCommand initialized');
    }    /**
     * Execute the token command
     * @param {Array<string>} args - Command arguments
     * @param {Object} context - Command execution context
     * @returns {Promise<Object>} - Command execution result
     */
    async execute(args, context) {
        try {
            const { player, server } = context;
            const log = this.logService || console;
            
            log.debug(`Token command executed by ${player?.name || player?.Name || 'unknown player'}`);
            
            // Safety check
            if (!player) {
                log.warn('Token command executed with invalid player');
                return { success: false, message: 'Invalid player' };
            }
            
            const playerId = player.id || player.Guid || player.guid;
            const playerName = player.Name || player.name || 'Unknown Player';
              // Check if it's a token submission or generation request
            if (args.length > 0) {
                // Token submission mode
                const providedToken = args[0].trim().toUpperCase();
                
                if (!providedToken || providedToken.length < 4) {
                    return { 
                        success: false, 
                        message: 'Token invalide. Format: !token VOTRE_TOKEN' 
                    };
                }
                
                // Attempt to use the provided token
                const result = await this._handleTokenSubmission(playerId, playerName, providedToken, server);
                return { success: true, message: result };
            } else {
                // Token generation mode
                const result = await this._handleTokenGeneration(playerId, playerName, server);
                return { success: true, message: result };
            }
        } catch (error) {
            const log = this.logService || console;
            log.error(`Error in token command: ${error.message}`);
            return { 
                success: false, 
                message: `^1Une erreur est survenue lors du traitement de la commande: ${error.message}`
            };
        }
    }
    
    /**
     * Handle token generation request
     * @param {string} playerId - Player ID
     * @param {string} playerName - Player name
     * @param {Object} server - Server instance
     * @returns {Promise<string>} - Response message
     * @private
     */    async _handleTokenGeneration(playerId, playerName, server) {
        try {
            // Use UserService to generate token
            const result = await this.userService.generateToken(playerId, playerName);
            
            if (!result.success) {
                return `^1Error: ${result.error}`;
            }
            
            // Return colorful response with instructions
            return `Your linking token is: ${result.formattedToken}
^7Use this token on the website to link your account.`;
        } catch (error) {
            const log = this.logService || console;
            log.error(`Error generating token: ${error.message}`);
            return "^1An error occurred while creating the token.";
        }
    }    /**
     * Handle token submission
     * @param {string} playerId - Player ID
     * @param {string} playerName - Player name
     * @param {string} providedToken - Token provided by player
     * @param {Object} server - Server instance
     * @returns {Promise<string>} - Response message
     * @private
     */
    async _handleTokenSubmission(playerId, playerName, providedToken, server) {
        try {
            const log = this.logService || console;
            log.debug(`Player ${playerName} (${playerId}) attempting to use token ${providedToken}`);
            
            // Look for a user with this token in the database
            const user = await this.userService.verifyToken(providedToken, playerId, playerName);
            
            if (user) {
                log.info(`Account successfully linked for ${playerName} (${playerId}) with web user ${user.username}`);
                return "^2Account successfully linked! You can now use the website.";            } else {
                // Token not found
                const log = this.logService || console;
                log.warn(`Invalid token attempt: ${providedToken} by ${playerName} (${playerId})`);
                return "^1Invalid or expired token. Please generate a new one on the website.";
            }
        } catch (error) {
            const log = this.logService || console;
            log.error(`Error processing token submission: ${error.message}`);
            return "^1An error occurred while processing the token.";
        }
    }      /**
     * Save token to database - DEPRECATED: This method is now handled by UserService
     * @param {string} playerId - Player ID
     * @param {string} playerName - Player name
     * @param {string} token - Generated token
     * @returns {Promise<void>}
     * @private
     * @deprecated Use UserService.generateToken instead
     */
    async _saveTokenToDatabase(playerId, playerName, token) {
        const log = this.logService || console;
        log.warn('_saveTokenToDatabase method is deprecated, use UserService.generateToken instead');
        
        try {
            // This is now handled by UserService
            await this.userService.saveToken(playerId, playerName, token);
            log.debug(`Token saved for user ${playerName}`);
        } catch (error) {
            log.error(`Error saving token to database: ${error.message}`);
            throw error;
        }
    }
}

module.exports = TokenCommand;
