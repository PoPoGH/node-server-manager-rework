/**
 * Base Repository - Common database operations
 */
class BaseRepository {
    /**
     * Create a new BaseRepository
     * @param {Object} db - Database connection
     * @param {string} tableName - Main table name
     */
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
    }
    
    /**
     * Get one record by ID
     * @param {number} id - Record ID
     * @returns {Promise<Object>} Database record
     */
    async getById(id) {
        try {
            return await this.db.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
        } catch (error) {
            console.error(`Error in ${this.tableName}.getById:`, error);
            throw error;
        }
    }
    
    /**
     * Get all records with optional limit and offset
     * @param {number} limit - Maximum number of records
     * @param {number} offset - Number of records to skip
     * @returns {Promise<Array>} Database records
     */
    async getAll(limit = 1000, offset = 0) {
        try {
            return await this.db.all(
                `SELECT * FROM ${this.tableName} ORDER BY id DESC LIMIT ? OFFSET ?`,
                [limit, offset]
            );
        } catch (error) {
            console.error(`Error in ${this.tableName}.getAll:`, error);
            throw error;
        }
    }
    
    /**
     * Count total records
     * @returns {Promise<number>} Total count
     */
    async count() {
        try {
            const result = await this.db.get(`SELECT COUNT(*) as count FROM ${this.tableName}`);
            return result?.count || 0;
        } catch (error) {
            console.error(`Error in ${this.tableName}.count:`, error);
            throw error;
        }
    }
    
    /**
     * Insert a new record
     * @param {Object} data - Data to insert
     * @returns {Promise<Object>} Inserted record with ID
     */
    async insert(data) {
        try {
            const columns = Object.keys(data);
            const placeholders = columns.map(() => '?').join(', ');
            const values = Object.values(data);
            
            const query = `
                INSERT INTO ${this.tableName} (${columns.join(', ')})
                VALUES (${placeholders})
            `;
            
            const result = await this.db._run(query, values);
            return { id: result.lastID, ...data };
        } catch (error) {
            console.error(`Error in ${this.tableName}.insert:`, error);
            throw error;
        }
    }
    
    /**
     * Update an existing record
     * @param {number} id - Record ID
     * @param {Object} data - Data to update
     * @returns {Promise<boolean>} Success
     */
    async update(id, data) {
        try {
            const columns = Object.keys(data);
            const setClause = columns.map(col => `${col} = ?`).join(', ');
            const values = [...Object.values(data), id];
            
            const query = `
                UPDATE ${this.tableName}
                SET ${setClause}
                WHERE id = ?
            `;
            
            const result = await this.db._run(query, values);
            return result.changes > 0;
        } catch (error) {
            console.error(`Error in ${this.tableName}.update:`, error);
            throw error;
        }
    }
    
    /**
     * Delete a record
     * @param {number} id - Record ID
     * @returns {Promise<boolean>} Success
     */
    async delete(id) {
        try {
            const result = await this.db._run(
                `DELETE FROM ${this.tableName} WHERE id = ?`,
                [id]
            );
            return result.changes > 0;
        } catch (error) {
            console.error(`Error in ${this.tableName}.delete:`, error);
            throw error;
        }
    }
    
    /**
     * Execute a custom query
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} Query results
     */
    async query(query, params = []) {
        try {
            return await this.db.all(query, params);
        } catch (error) {
            console.error(`Error in ${this.tableName}.query:`, error);
            throw error;
        }
    }
    
    /**
     * Get a single record from a custom query
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Query result
     */
    async queryOne(query, params = []) {
        try {
            return await this.db.get(query, params);
        } catch (error) {
            console.error(`Error in ${this.tableName}.queryOne:`, error);
            throw error;
        }
    }
}

module.exports = BaseRepository;
