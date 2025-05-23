/**
 * User Service - Manages user accounts and authentication data
 */
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class UserService {
    /**
     * Create a new UserService
     * @param {Object} db - Database connection
     * @param {Object} logService - Logging service
     */
    constructor(db, logService) {
        this.db = db;
        this.logger = logService || console;
    }

    /**
     * Generate a secure hash of a password
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * Compare a plain text password with a hash
     * @param {string} password - Plain text password
     * @param {string} hash - Stored hash
     * @returns {Promise<boolean>} True if match
     */
    async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Create a new user
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Created user
     */
    async createUser(userData) {
        try {
            const { username, password, email, role = 'user' } = userData;

            // Check if username already exists
            const existingUser = await this.getUserByUsername(username);
            if (existingUser) {
                return { success: false, error: 'Username already exists' };
            }

            // Hash password
            const hashedPassword = await this.hashPassword(password);

            // Generate UUID
            const id = uuidv4();

            // Insert user into database
            const query = `
                INSERT INTO users (id, username, password, email, role, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `;

            const params = [id, username, hashedPassword, email, role];

            await this.db.run(query, params);

            // Return created user (without password)
            const user = await this.getUserById(id);
            return { success: true, user: this.sanitizeUser(user) };
        } catch (error) {
            this.logger.error('Error creating user:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user by ID
     * @param {string} id - User ID
     * @returns {Promise<Object|null>} User data or null if not found
     */
    async getUserById(id) {
        try {
            const query = 'SELECT * FROM users WHERE id = ?';
            const user = await this.db.get(query, [id]);
            return user || null;
        } catch (error) {
            this.logger.error('Error getting user by ID:', error);
            return null;
        }
    }

    /**
     * Get user by username
     * @param {string} username - Username
     * @returns {Promise<Object|null>} User data or null if not found
     */
    async getUserByUsername(username) {
        try {
            const query = 'SELECT * FROM users WHERE username = ?';
            const user = await this.db.get(query, [username]);
            return user || null;
        } catch (error) {
            this.logger.error('Error getting user by username:', error);
            return null;
        }
    }

    /**
     * Update user last login time
     * @param {string} id - User ID
     * @returns {Promise<boolean>} Success status
     */
    async updateLastLogin(id) {
        try {
            const query = `UPDATE users SET last_login = datetime('now') WHERE id = ?`;
            await this.db.run(query, [id]);
            return true;
        } catch (error) {
            this.logger.error('Error updating last login:', error);
            return false;
        }
    }

    /**
     * Remove sensitive data from user object
     * @param {Object} user - User object
     * @returns {Object} Sanitized user object
     */
    sanitizeUser(user) {
        if (!user) return null;
        
        const { password, ...sanitized } = user;
        return sanitized;
    }

    /**
     * Change user password
     * @param {string} id - User ID
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Result object
     */
    async changePassword(id, currentPassword, newPassword) {
        try {
            // Get user
            const user = await this.getUserById(id);
            if (!user) {
                return { success: false, error: 'User not found' };
            }

            // Verify current password
            const isMatch = await this.comparePassword(currentPassword, user.password);
            if (!isMatch) {
                return { success: false, error: 'Current password is incorrect' };
            }

            // Hash new password
            const hashedPassword = await this.hashPassword(newPassword);

            // Update password
            const query = `UPDATE users SET password = ? WHERE id = ?`;
            await this.db.run(query, [hashedPassword, id]);

            return { success: true };
        } catch (error) {
            this.logger.error('Error changing password:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update user profile
     * @param {string} id - User ID
     * @param {string} currentPassword - Current password
     * @param {Object} updates - Profile updates
     * @returns {Promise<Object>} Result object
     */
    async updateProfile(id, currentPassword, updates) {
        try {
            // Get user
            const user = await this.getUserById(id);
            if (!user) {
                return { success: false, error: 'User not found', code: 404 };
            }

            // Verify current password
            const isMatch = await this.comparePassword(currentPassword, user.password);
            if (!isMatch) {
                return { success: false, error: 'Current password is incorrect', code: 401 };
            }

            // Build update query
            let updateFields = [];
            let params = [];
            
            if (updates.email) {
                updateFields.push('email = ?');
                params.push(updates.email);
            }
            
            if (updates.gameUsername) {
                updateFields.push('game_username = ?');
                params.push(updates.gameUsername);
            }
            
            if (updates.newPassword) {
                const hashedPassword = await this.hashPassword(updates.newPassword);
                updateFields.push('password = ?');
                params.push(hashedPassword);
            }
            
            if (updates.hasCompletedSetup !== undefined) {
                updateFields.push('has_completed_setup = ?');
                params.push(updates.hasCompletedSetup ? 1 : 0);
            }
            
            // If nothing to update
            if (updateFields.length === 0) {
                return { success: false, error: 'Nothing to update', code: 400 };
            }
            
            // Add ID at the end of params
            params.push(id);
            
            // Run update query
            const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
            await this.db.run(query, params);
            
            // Get updated user
            const updatedUser = await this.getUserById(id);
            
            return { 
                success: true, 
                user: updatedUser
            };
        } catch (error) {
            this.logger.error('Error updating profile:', error);
            return { success: false, error: error.message, code: 500 };
        }
    }

    /**
     * Generate a game token for a user
     * @param {string} userId - User ID 
     * @returns {Promise<Object>} Game token and status
     */
    async generateGameToken(userId) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                return { success: false, error: 'User not found' };
            }

            // Check if user is admin in setup phase
            const isAdminSetup = user.role === 'admin' && !user.has_completed_setup;

            // Generate token (16 random characters)
            const gameToken = crypto.randomBytes(8).toString('hex');
            
            // Store token in database
            const id = uuidv4();
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 7); // Token valid for 7 days
            
            const query = `
                INSERT INTO user_tokens (id, user_id, token, type, created_at, expires_at)
                VALUES (?, ?, ?, ?, datetime('now'), ?)
            `;
            
            await this.db.run(query, [
                id, 
                userId, 
                gameToken, 
                'game', 
                expiryDate.toISOString()
            ]);
            
            return { 
                success: true, 
                gameToken,
                isAdminSetup
            };
        } catch (error) {
            this.logger.error('Error generating game token:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Apply a game token to link a user account
     * @param {string} userId - User ID
     * @param {string} gameToken - Game token to apply
     * @returns {Promise<Object>} Result object
     */
    async applyGameToken(userId, gameToken) {
        try {
            // Find the token in database
            const tokenQuery = `
                SELECT ut.*, u.id as token_user_id, u.username as game_username
                FROM user_tokens ut
                JOIN users u ON ut.user_id = u.id
                WHERE ut.token = ? AND ut.type = 'game'
                  AND ut.is_used = 0
                  AND ut.expires_at > datetime('now')
            `;
            
            const token = await this.db.get(tokenQuery, [gameToken]);
            
            if (!token) {
                return { 
                    success: false, 
                    error: 'Invalid or expired token',
                    code: 400
                };
            }
            
            // Check if token belongs to the user (self-linking not allowed)
            if (token.user_id === userId) {
                return { 
                    success: false, 
                    error: 'Cannot link your own token',
                    code: 400
                };
            }
            
            // Get the current user
            const user = await this.getUserById(userId);
            if (!user) {
                return { success: false, error: 'User not found', code: 404 };
            }
            
            // Check if user is admin in setup phase
            const isAdminSetup = user.role === 'admin' && !user.has_completed_setup;
            
            // Update the user with game ID
            const updateQuery = `
                UPDATE users
                SET game_id = ?,
                    game_username = ?
                WHERE id = ?
            `;
            
            await this.db.run(updateQuery, [
                token.token_user_id,
                token.game_username,
                userId
            ]);
            
            // Mark token as used
            const tokenUpdateQuery = `
                UPDATE user_tokens
                SET is_used = 1
                WHERE id = ?
            `;
            
            await this.db.run(tokenUpdateQuery, [token.id]);
            
            // Get updated user
            const updatedUser = await this.getUserById(userId);
            
            return { 
                success: true, 
                user: updatedUser,
                isAdminSetup 
            };
        } catch (error) {
            this.logger.error('Error applying game token:', error);
            return { success: false, error: error.message, code: 500 };
        }
    }

    /**
     * Update user's setup step
     * @param {string} userId - User ID
     * @param {number} setupStep - Setup step number
     * @returns {Promise<Object>} Result object
     */
    async updateSetupStep(userId, setupStep) {
        try {
            // Get current user
            const user = await this.getUserById(userId);
            if (!user) {
                return { success: false, error: 'User not found', code: 404 };
            }
            
            // Update setup step
            const query = `
                UPDATE users
                SET setup_step = ?
                WHERE id = ?
            `;
            
            await this.db.run(query, [setupStep, userId]);
            
            // Get updated user
            const updatedUser = await this.getUserById(userId);
            
            return {
                success: true,
                user: updatedUser
            };
        } catch (error) {
            this.logger.error('Error updating setup step:', error);
            return { success: false, error: error.message, code: 500 };
        }
    }

    /**
     * Mark user setup as completed
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} Success status
     */
    async completeSetup(userId) {
        try {
            const query = `
                UPDATE users
                SET has_completed_setup = 1
                WHERE id = ?
            `;
            
            await this.db.run(query, [userId]);
            return true;
        } catch (error) {
            this.logger.error('Error completing setup:', error);
            return false;
        }
    }
}

module.exports = UserService;
