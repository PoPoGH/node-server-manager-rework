/**
 * Authentication Service - Handles user authentication and token management
 */
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class AuthService {
    /**
     * Create a new AuthService
     * @param {Object} userService - User service
     * @param {Object} logService - Logging service
     * @param {Object} config - Configuration object
     */
    constructor(userService, logService, config = {}) {
        this.userService = userService;
        this.logger = logService || console;
        this.config = config;
        this.secret = config.secret || 'change_this_secret_key';
        this.tokenExpiry = config.tokenExpiry || '24h';
    }

    /**
     * Authenticate a user
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise<Object>} Authentication result
     */
    async authenticate(username, password) {
        try {
            // Get user by username
            const user = await this.userService.getUserByUsername(username);
            
            if (!user) {
                return { success: false, error: 'User not found' };
            }

            // Compare password
            const isMatch = await this.userService.comparePassword(password, user.password);
            
            if (!isMatch) {
                return { success: false, error: 'Invalid password' };
            }

            // Generate token
            const token = await this.generateToken(user);

            return { 
                success: true, 
                token,
                user: this.userService.sanitizeUser(user)
            };
        } catch (error) {
            this.logger.error('Authentication error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate JWT token for a user
     * @param {Object} user - User object
     * @returns {Promise<string>} JWT token
     */
    async generateToken(user) {
        try {
            // Create payload with essential user data
            const payload = {
                id: user.id,
                username: user.username,
                role: user.role,
                email: user.email,
                gameId: user.game_id,
                gameUsername: user.game_username,
                hasCompletedSetup: !!user.has_completed_setup,
                setupStep: user.setup_step || 0
            };

            // Sign token
            return jwt.sign(payload, this.secret, { expiresIn: this.tokenExpiry });
        } catch (error) {
            this.logger.error('Error generating token:', error);
            throw error;
        }
    }    /**
     * Verify a JWT token
     * @param {string} token - JWT token
     * @returns {Promise<Object|null>} Decoded token payload or null if invalid
     */
    async verifyToken(token) {
        try {
            // Debug log the token and secret
            this.logger.debug(`Verifying token: ${token.substring(0, 20)}... with secret: ${this.secret.substring(0, 5)}...`);
            
            // Force a known secret for development/debugging
            const secretToUse = this.secret || 'change_this_secret_key';
            
            // Verify token with more detailed error handling
            let decoded;
            try {
                decoded = jwt.verify(token, secretToUse);
                this.logger.debug('Token verified successfully');
            } catch (verifyError) {
                this.logger.error(`Token verification JWT error: ${verifyError.message}`);
                return null;
            }
            
            // Check if user still exists
            try {
                const user = await this.userService.getUserById(decoded.id);
                if (!user) {
                    this.logger.warn(`User ${decoded.id} from token not found in database`);
                    return null;
                }
                this.logger.debug(`User ${decoded.id} found in database`);
            } catch (userError) {
                this.logger.error(`Error retrieving user: ${userError.message}`);
                // During development/setup, continue even if user check fails
                this.logger.warn('Continuing with token despite user check failure (development mode)');
            }

            return decoded;
        } catch (error) {
            this.logger.error('Token verification error:', error);
            return null;
        }
    }

    /**
     * Track login session in database
     * @param {string} userId - User ID
     * @param {string} token - JWT token
     * @returns {Promise<boolean>} Success status
     */
    async trackSession(userId, token) {
        try {
            // Save session in database
            const id = uuidv4();
            
            // Get token expiry
            const decoded = jwt.decode(token);
            const expiresAt = new Date(decoded.exp * 1000); // Convert from Unix timestamp
            
            // Insert into sessions table
            const query = `
                INSERT INTO sessions (id, user_id, token, created_at, expires_at)
                VALUES (?, ?, ?, datetime('now'), ?)
            `;
            
            await this.db.run(query, [
                id,
                userId,
                token,
                expiresAt.toISOString()
            ]);
            
            return true;
        } catch (error) {
            this.logger.error('Error tracking session:', error);
            return false;
        }
    }
}

module.exports = AuthService;
