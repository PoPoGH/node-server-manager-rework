/**
 * Authentication middleware for API routes
 */
const jwt = require('jsonwebtoken');
const config = require('../../config-loader');
const logger = require('../../core/NSMR-Logger');

/**
 * Middleware to check if user is authenticated
 */
function isAuthenticated(req, res, next) {
    try {
        // Extract token from header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'Authentication required'
            });
        }
        
        // Verify the token        // Use the API secret for verification to match AuthService
        const secretToUse = config.api?.secret || config.auth?.jwtSecret || 'change_this_secret_key';
        logger.debug(`Verifying token with secret: ${secretToUse.substring(0, 5)}...`);
        
        jwt.verify(token, secretToUse, (err, decoded) => {
            if (err) {
                logger.error(`Token verification error: ${err.message}`);
                return res.status(403).json({ 
                    success: false,
                    error: 'Invalid or expired token'
                });
            }
            
            // Set user info on req object for future middleware
            req.user = decoded;
            logger.debug(`User authenticated: ${JSON.stringify(decoded)}`);
            next();
        });
    } catch (error) {
        logger.error(`Auth middleware error: ${error.message}`);
        res.status(500).json({ 
            success: false,
            error: 'Authentication error'
        });
    }
}

/**
 * Middleware to check if user is an admin
 */
function isAdmin(req, res, next) {
    isAuthenticated(req, res, () => {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                error: 'Admin privileges required'
            });
        }
        next();
    });
}

module.exports = {
    isAuthenticated,
    isAdmin
};
