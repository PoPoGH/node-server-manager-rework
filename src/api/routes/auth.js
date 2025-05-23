/**
 * Authentication routes for the API
 * MVC Version - Uses appropriate controllers and services
 */

module.exports = function(serverManager) {
    const express = require('express');
    const router = express.Router();
    const jwt = require('jsonwebtoken');

    // MVC dependencies
    const ServiceFactory = require('../../services/ServiceFactory');

    // Configuration
    const config = require('../../config-loader');

    // Service initialization - Use lazy loading to avoid startup errors
    const serviceFactory = ServiceFactory.getInstance();
    
    // Helper function to get services safely
    const getService = (serviceName) => {
        try {
            return serviceFactory.get(serviceName);
        } catch (error) {
            console.warn(`Service '${serviceName}' not available: ${error.message}`);
            return null;
        }
    };
    
    // Helper function to get required services with error handling
    const getRequiredServices = () => {
        const userService = getService('userService');
        const logService = getService('logService') || console;
        const authService = getService('authService');
        
        if (!userService || !authService) {
            const errorMsg = 'Authentication services (userService, authService) are not available. Database connection may have failed.';
            logService.error(errorMsg);
            return { error: errorMsg, logService };
        }
        
        return { userService, logService, authService };
    };    /**
     * Authentication middleware to verify the JWT token
     */
    const authenticateToken = async (req, res, next) => {
        try {
            const services = getRequiredServices();
            if (services.error) {
                return res.status(503).json({ success: false, error: services.error });
            }
            
            const { userService, logService, authService } = services;
            
            const authHeader = req.headers['authorization'];
            logService.debug(`Auth headers: ${JSON.stringify(req.headers)}`);
            logService.debug(`Auth header: ${authHeader}`);
            
            const token = authHeader && authHeader.split(' ')[1];
            
            if (!token) {
                logService.warn('No token provided in authentication request');
                return res.status(401).json({ success: false, error: 'Authentication token required' });
            }
            
            logService.debug(`Token to verify: ${token.substring(0, 20)}...`);
            
            try {
                const user = await authService.verifyToken(token);
                if (!user) {
                    logService.warn(`Invalid token verification result: ${user}`);
                    return res.status(403).json({ success: false, error: 'Invalid or expired authentication token' });
                }
                
                // Store user in req for subsequent middlewares
                req.user = user;
                logService.debug(`User authenticated: ${JSON.stringify(user)}`);
                next();
            } catch (verifyError) {
                logService.error(`Token verification error: ${verifyError.message}`);
                return res.status(403).json({ success: false, error: 'Token verification error' });
            }
        } catch (error) {
            const logService = getService('logService') || console;
            logService.error(`Authentication error: ${error.message}`);
            return res.status(403).json({ success: false, error: 'Authentication error' });
        }
    };

    /**
     * @route POST /api/auth/login
     * @desc Authenticate a user and generate a token
     */
    router.post('/login', async (req, res) => {
        try {
            const services = getRequiredServices();
            if (services.error) {
                return res.status(503).json({ success: false, error: services.error });
            }
            
            const { userService, logService, authService } = services;
            
            const { username, password } = req.body;
            logService.info(`Login attempt received for user: ${username || 'not specified'}`);
            
            if (!username || !password) {
                logService.warn('Login attempt with incomplete credentials');
                return res.status(400).json({ success: false, error: 'Username and password required' });
            }
            
            // Authenticate user via AuthService
            const authResult = await authService.authenticate(username, password);
            
            if (!authResult.success) {
                logService.warn(`Authentication failed for user: ${username}`);
                return res.status(401).json({ success: false, error: authResult.error });
            }
            
            logService.info(`Authentication successful for user: ${username}`);
            
            // Update last login timestamp
            await userService.updateLastLogin(authResult.user.id);
            
            res.json({
                success: true,
                token: authResult.token,
                user: authResult.user
            });
        } catch (error) {
            const logService = getService('logService') || console;
            logService.error(`Login error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route GET /api/auth/verify
     * @desc Verify token and return user data
     */
    router.get('/verify', authenticateToken, async (req, res) => {
        try {
            const services = getRequiredServices();
            if (services.error) {
                return res.status(503).json({ success: false, error: services.error });
            }
            
            const { userService, logService } = services;
            
            // Get complete user information from the database
            const user = await userService.getUserById(req.user.id);
            
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            
            // Return complete user information
            res.json({ 
                success: true, 
                user: userService.sanitizeUser(user)
            });
        } catch (error) {
            const logService = getService('logService') || console;
            logService.error(`Token verification error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route GET /api/auth/validate
     * @desc Alias for verify - for frontend compatibility
     */
    router.get('/validate', authenticateToken, async (req, res) => {
        try {
            const services = getRequiredServices();
            if (services.error) {
                return res.status(503).json({ success: false, error: services.error });
            }
            
            const { userService, logService, authService } = services;
            
            // Get complete user information from database
            const user = await userService.getUserById(req.user.id);
            
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            
            // Check if it's an admin in setup phase
            const isAdminSetup = user.role === 'admin' && !user.hasCompletedSetup;
            
            // If admin in setup with a game_id (linked account) but setup not completed,
            // mark setup as completed
            if (isAdminSetup && user.gameId && !user.hasCompletedSetup) {
                await userService.completeSetup(user.id);
                logService.info(`Setup marked as completed for admin ${user.id} during token validation`);
                user.hasCompletedSetup = true;
            }
            
            // Generate new token with updated information
            const newToken = await authService.generateToken(user);
            
            // Return complete user information
            res.json({ 
                success: true,
                token: newToken,
                user: {
                    ...userService.sanitizeUser(user),
                    isAdminSetup
                }
            });
        } catch (error) {
            const logService = getService('logService') || console;
            logService.error(`Token validation error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route POST /api/auth/change-password
     * @desc Change user password
     */
    router.post('/change-password', authenticateToken, async (req, res) => {
        try {
            const services = getRequiredServices();
            if (services.error) {
                return res.status(503).json({ success: false, error: services.error });
            }
            
            const { userService, logService } = services;
            
            const { currentPassword, newPassword } = req.body;
            
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ success: false, error: 'Current password and new password required' });
            }
            
            const result = await userService.changePassword(req.user.id, currentPassword, newPassword);
            
            if (!result.success) {
                return res.status(401).json({ success: false, error: result.error });
            }
            
            res.json({ success: true, message: 'Password changed successfully' });
        } catch (error) {
            const logService = getService('logService') || console;
            logService.error(`Password change error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route POST /api/auth/update-profile
     * @desc Update user profile
     */
    router.post('/update-profile', authenticateToken, async (req, res) => {
        try {
            const services = getRequiredServices();
            if (services.error) {
                return res.status(503).json({ success: false, error: services.error });
            }
            
            const { userService, logService, authService } = services;
            
            const { currentPassword, newPassword, email, gameUsername, gameToken, hasCompletedSetup } = req.body;
            
            if (!currentPassword) {
                return res.status(400).json({ success: false, error: 'Current password required' });
            }
            
            // Update profile in UserService
            const updateResult = await userService.updateProfile(
                req.user.id, 
                currentPassword, 
                { newPassword, email, gameUsername, gameToken, hasCompletedSetup }
            );
            
            if (!updateResult.success) {
                return res.status(updateResult.code || 401).json({ 
                    success: false, 
                    error: updateResult.error 
                });
            }
            
            // Generate new token with updated information
            const newToken = await authService.generateToken(updateResult.user);
            
            res.json({
                success: true,
                message: 'Profile updated successfully',
                token: newToken,
                user: userService.sanitizeUser(updateResult.user)
            });
        } catch (error) {
            const logService = getService('logService') || console;
            logService.error(`Profile update error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route POST /api/auth/apply-game-token
     * @desc Apply a game token
     */
    router.post('/apply-game-token', authenticateToken, async (req, res) => {
        try {
            const services = getRequiredServices();
            if (services.error) {
                return res.status(503).json({ success: false, error: services.error });
            }
            
            const { userService, logService, authService } = services;
            
            logService.debug(`API: Game token application request received - URL: ${req.originalUrl}`);
            const { gameToken } = req.body;
            
            if (!gameToken) {
                logService.warn(`API: Token missing in request`);
                return res.status(400).json({ success: false, error: 'Game token required' });
            }
            
            // Apply token in UserService
            const result = await userService.applyGameToken(req.user.id, gameToken);
            
            if (!result.success) {
                return res.status(result.code || 401).json({ 
                    success: false, 
                    error: result.error,
                    isAdminSetup: result.isAdminSetup
                });
            }
            
            // Generate new token with updated information
            const newToken = await authService.generateToken(result.user);
            
            res.json({
                success: true,
                message: 'Game token applied successfully',
                token: newToken,
                user: userService.sanitizeUser(result.user)
            });
        } catch (error) {
            const logService = getService('logService') || console;
            logService.error(`Game token application error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route POST /api/auth/generate-game-token
     * @desc Generate a game token for the current user
     */
    router.post('/generate-game-token', authenticateToken, async (req, res) => {
        try {
            const services = getRequiredServices();
            if (services.error) {
                return res.status(503).json({ success: false, error: services.error });
            }
            
            const { userService, logService } = services;
            
            const result = await userService.generateGameToken(req.user.id);
            
            res.json({
                success: true,
                gameToken: result.gameToken,
                isAdminSetup: result.isAdminSetup,
                message: result.isAdminSetup ? 
                    'Admin token generated successfully' : 
                    'Game token generated successfully'
            });
        } catch (error) {
            const logService = getService('logService') || console;
            logService.error(`Game token generation error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route POST /api/auth/update-setup-step
     * @desc Update user's current setup step
     */
    router.post('/update-setup-step', authenticateToken, async (req, res) => {
        try {
            const services = getRequiredServices();
            if (services.error) {
                return res.status(503).json({ success: false, error: services.error });
            }
            
            const { userService, logService, authService } = services;
            
            const { setupStep } = req.body;
            
            if (setupStep === undefined) {
                return res.status(400).json({ success: false, error: 'Setup step required' });
            }
            
            logService.info(`Updating setup step for user ${req.user.id}: ${setupStep}`);
            
            // Update setup step in UserService
            const result = await userService.updateSetupStep(req.user.id, setupStep);
            
            if (!result.success) {
                return res.status(result.code || 400).json({ 
                    success: false, 
                    error: result.error 
                });
            }
            
            // Generate new token with updated information
            const newToken = await authService.generateToken(result.user);
            
            res.json({
                success: true,
                message: 'Setup step updated successfully',
                token: newToken,
                user: userService.sanitizeUser(result.user)
            });
        } catch (error) {
            const logService = getService('logService') || console;
            logService.error(`Setup step update error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    });    /**
     * @route POST /api/auth/check-token-status
     * @desc Check if a game token has been used
     */
    router.post('/check-token-status', authenticateToken, async (req, res) => {
        try {
            const services = getRequiredServices();
            if (services.error) {
                return res.status(503).json({ success: false, error: services.error });
            }
            
            const { userService, logService } = services;
            
            const { gameToken } = req.body;
            logService.debug(`Checking token status: ${gameToken}`);
            
            if (!gameToken) {
                logService.warn('Verification attempt without providing a token');
                return res.status(400).json({ success: false, error: 'Game token required' });
            }

            // Check token status in UserService
            const result = await userService.checkGameTokenStatus(req.user.id, gameToken);
            
            res.json({
                success: true,
                tokenUsed: result.tokenUsed,
                gameUsername: result.gameUsername,
                gameId: result.gameId,
                isAdminSetup: result.isAdminSetup,
                hasCompletedSetup: result.hasCompletedSetup,
                message: result.message
            });
        } catch (error) {
            const logService = getService('logService') || console;
            logService.error(`Token status check error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Export authentication middleware
    router.authenticateToken = authenticateToken;

    return router;
};