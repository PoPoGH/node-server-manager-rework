/**
 * DatabaseService - Manages database connections and operations
 */
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class DatabaseService {
    /**
     * Create a new DatabaseService
     * @param {Object} config - Database configuration
     * @param {Object} logService - Logging service
     */
    constructor(config, logService) {
        this.config = config || { path: 'data/database.sqlite' };
        this.logger = logService;
        this.db = null;
        this.isInitialized = false;
    }
    
    /**
     * Initialize the database, create connection and tables
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        try {
            this.logger.info(`Initializing database at ${this.config.path}`);
            
            // Ensure the database directory exists
            const dbDir = path.dirname(this.config.path);
            if (!fs.existsSync(dbDir)) {
                this.logger.info(`Creating database directory: ${dbDir}`);
                fs.mkdirSync(dbDir, { recursive: true });
            }
            
            // Open the database connection
            return new Promise((resolve, reject) => {
                this.db = new sqlite3.Database(this.config.path, async (err) => {
                    if (err) {
                        this.logger.error('Failed to open database connection:', err);
                        reject(err);
                        return;
                    }
                    
                    try {
                        // Enable foreign keys
                        await this.exec('PRAGMA foreign_keys = ON;');
                        
                        // Create tables if they don't exist
                        await this.initializeTables();
                        
                        // Initialize default admin user
                        await this.initializeDefaultAdmin();
                        
                        this.isInitialized = true;
                        this.logger.info('Database initialized successfully');
                        resolve(true);
                    } catch (error) {
                        this.logger.error('Error during database initialization:', error);
                        reject(error);
                    }
                });
            });
        } catch (error) {
            this.logger.error('Database initialization failed:', error);
            return false;
        }
    }
    
    /**
     * Execute a SQL query with no return values
     * @param {string} sql - SQL statement to execute
     * @returns {Promise<void>}
     */
    async exec(sql) {
        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
    
    /**
     * Get the database connection instance
     * @returns {Object} Database connection
     */
    getConnection() {
        if (!this.isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }
    
    /**
     * Create necessary database tables
     * @private
     */
    async initializeTables() {
        try {
            this.logger.info('Creating database tables if needed...');
            
            // Create servers table
            await this.exec(`
                CREATE TABLE IF NOT EXISTS servers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    host TEXT NOT NULL,
                    port INTEGER NOT NULL,
                    game TEXT NOT NULL,
                    game_path TEXT,
                    rcon_port INTEGER,
                    rcon_password TEXT,
                    enabled INTEGER DEFAULT 1,
                    auto_restart INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
            
            // Create players table
            await this.exec(`
                CREATE TABLE IF NOT EXISTS players (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    guid TEXT,
                    ip TEXT,
                    country TEXT,
                    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                    total_connections INTEGER DEFAULT 0,
                    playtime_seconds INTEGER DEFAULT 0,
                    banned INTEGER DEFAULT 0,
                    ban_reason TEXT,
                    ban_admin_id TEXT,
                    ban_expiry DATETIME
                );
            `);
            
            // Create users table for admin panel
            await this.exec(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    email TEXT,
                    role TEXT NOT NULL DEFAULT 'user',
                    game_id TEXT,
                    game_username TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME,
                    has_completed_setup INTEGER DEFAULT 0,
                    setup_step INTEGER DEFAULT 0
                );
            `);
            
            // Create sessions table
            await this.exec(`
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    token TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            `);
            
            // Create player_stats table
            await this.exec(`
                CREATE TABLE IF NOT EXISTS player_stats (
                    id TEXT PRIMARY KEY,
                    player_id TEXT NOT NULL,
                    game TEXT NOT NULL,
                    mode TEXT NOT NULL,
                    kills INTEGER DEFAULT 0,
                    deaths INTEGER DEFAULT 0,
                    assists INTEGER DEFAULT 0,
                    score INTEGER DEFAULT 0,
                    headshots INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
                );
            `);
            
            // Create matches table
            await this.exec(`
                CREATE TABLE IF NOT EXISTS matches (
                    id TEXT PRIMARY KEY,
                    server_id TEXT NOT NULL,
                    map TEXT NOT NULL,
                    mode TEXT NOT NULL,
                    start_time DATETIME NOT NULL,
                    end_time DATETIME,
                    duration_seconds INTEGER,
                    status TEXT DEFAULT 'in_progress',
                    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
                );
            `);
            
            // Create player_matches table (junction)
            await this.exec(`
                CREATE TABLE IF NOT EXISTS player_matches (
                    id TEXT PRIMARY KEY,
                    player_id TEXT NOT NULL,
                    match_id TEXT NOT NULL,
                    team TEXT,
                    kills INTEGER DEFAULT 0,
                    deaths INTEGER DEFAULT 0,
                    assists INTEGER DEFAULT 0,
                    score INTEGER DEFAULT 0,
                    join_time DATETIME NOT NULL,
                    leave_time DATETIME,
                    playtime_seconds INTEGER DEFAULT 0,
                    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
                    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
                );
            `);
            
            // Create user_tokens table for game token linking
            await this.exec(`
                CREATE TABLE IF NOT EXISTS user_tokens (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    token TEXT UNIQUE NOT NULL,
                    type TEXT NOT NULL DEFAULT 'game',
                    is_used INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            `);
            
            // Create player_notes table
            await this.exec(`
                CREATE TABLE IF NOT EXISTS player_notes (
                    id TEXT PRIMARY KEY,
                    player_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    note TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            `);
            
            // Create server triggers for updated_at
            await this.exec(`
                CREATE TRIGGER IF NOT EXISTS servers_update_timestamp 
                AFTER UPDATE ON servers
                BEGIN
                    UPDATE servers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;
            `);
            
            // Create player_stats triggers for updated_at
            await this.exec(`
                CREATE TRIGGER IF NOT EXISTS player_stats_update_timestamp 
                AFTER UPDATE ON player_stats
                BEGIN
                    UPDATE player_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;
            `);
            
            this.logger.info('Database tables created successfully');
        } catch (error) {
            this.logger.error('Error creating database tables:', error);
            throw error;
        }
    }
    
    /**
     * Initialize default admin user if it doesn't exist
     * @private
     * @returns {Promise<void>}
     */
    async initializeDefaultAdmin() {
        try {
            // Check if admin user already exists
            const existingAdmin = await this.get('SELECT * FROM users WHERE username = ?', ['admin']);
            
            if (!existingAdmin) {
                this.logger.info('Creating default admin user...');
                
                // Generate UUID and hash default password
                const { v4: uuidv4 } = require('uuid');
                const bcrypt = require('bcrypt');
                
                const adminId = uuidv4();
                const defaultPassword = 'admin';
                const hashedPassword = await bcrypt.hash(defaultPassword, 10);
                
                // Insert default admin user
                const query = `
                    INSERT INTO users (id, username, password, role, created_at, has_completed_setup, setup_step)
                    VALUES (?, ?, ?, ?, datetime('now'), 0, 1)
                `;
                
                await this.run(query, [adminId, 'admin', hashedPassword, 'admin']);
                
                this.logger.info('Default admin user created successfully (username: admin, password: admin)');
                this.logger.warn('SECURITY WARNING: Please change the default admin password during initial setup!');
            } else {
                this.logger.debug('Admin user already exists, skipping default user creation');
            }
        } catch (error) {
            this.logger.error('Error creating default admin user:', error);
            throw error;
        }
    }
    
    /**
     * Close the database connection
     */
    async close() {
        if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) {
                        this.logger.error('Error closing database connection:', err);
                        reject(err);
                    } else {
                        this.logger.info('Database connection closed');
                        this.isInitialized = false;
                        resolve();
                    }
                });
            });
        }
    }
    
    /**
     * Execute a query and return all results
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} - Results array
     */
    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    /**
     * Execute a query and return the first result
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} - First result or undefined
     */
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    /**
     * Execute a query that modifies data
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} - Result object with lastID and changes
     */
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        lastID: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }
}

module.exports = DatabaseService;