/**
 * Event Repository - Data access for event records
 */
const BaseRepository = require('./BaseRepository');
const Event = require('../models/Event');

class EventRepository extends BaseRepository {
    /**
     * Create a new EventRepository
     * @param {Object} db - Database connection
     */
    constructor(db) {
        super(db, 'events');
    }
    
    /**
     * Get event by ID
     * @param {number} id - Event ID
     * @returns {Promise<Event|null>} Event model or null
     */
    async getById(id) {
        try {
            const row = await this.db.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
            return Event.fromDatabaseRow(row);
        } catch (error) {
            console.error('Error in EventRepository.getById:', error);
            throw error;
        }
    }
    
    /**
     * Get recent events
     * @param {number} limit - Maximum results
     * @param {number} offset - Results to skip
     * @returns {Promise<Array<Event>>} Array of Event models
     */
    async getRecentEvents(limit = 100, offset = 0) {
        try {
            const rows = await this.db.all(
                `SELECT * FROM ${this.tableName} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
                [limit, offset]
            );
            
            return rows.map(row => Event.fromDatabaseRow(row));
        } catch (error) {
            console.error('Error in EventRepository.getRecentEvents:', error);
            throw error;
        }
    }
    
    /**
     * Get events for a server
     * @param {number} serverId - Server ID
     * @param {number} limit - Maximum results
     * @param {number} offset - Results to skip
     * @returns {Promise<Array<Event>>} Array of Event models
     */
    async getServerEvents(serverId, limit = 100, offset = 0) {
        try {
            const rows = await this.db.all(
                `SELECT * FROM ${this.tableName} WHERE server_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
                [serverId, limit, offset]
            );
            
            return rows.map(row => Event.fromDatabaseRow(row));
        } catch (error) {
            console.error('Error in EventRepository.getServerEvents:', error);
            throw error;
        }
    }
    
    /**
     * Get events for a player
     * @param {number} playerId - Player ID
     * @param {number} limit - Maximum results
     * @param {number} offset - Results to skip
     * @returns {Promise<Array<Event>>} Array of Event models
     */
    async getPlayerEvents(playerId, limit = 100, offset = 0) {
        try {
            const rows = await this.db.all(
                `SELECT * FROM ${this.tableName} WHERE player_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
                [playerId, limit, offset]
            );
            
            return rows.map(row => Event.fromDatabaseRow(row));
        } catch (error) {
            console.error('Error in EventRepository.getPlayerEvents:', error);
            throw error;
        }
    }
    
    /**
     * Get events by type
     * @param {string} type - Event type
     * @param {number} limit - Maximum results
     * @param {number} offset - Results to skip
     * @returns {Promise<Array<Event>>} Array of Event models
     */
    async getEventsByType(type, limit = 100, offset = 0) {
        try {
            const rows = await this.db.all(
                `SELECT * FROM ${this.tableName} WHERE type = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
                [type, limit, offset]
            );
            
            return rows.map(row => Event.fromDatabaseRow(row));
        } catch (error) {
            console.error('Error in EventRepository.getEventsByType:', error);
            throw error;
        }
    }
    
    /**
     * Create a new event
     * @param {Event} event - Event model
     * @returns {Promise<Event>} Event model with ID
     */
    async createEvent(event) {
        try {
            const data = event.toDatabase();
            const result = await this.insert(data);
            
            return { ...event, id: result.id };
        } catch (error) {
            console.error('Error in EventRepository.createEvent:', error);
            throw error;
        }
    }
    
    /**
     * Create common event types
     */
    async createConnectionEvent(serverId, playerId, data = {}) {
        try {
            const event = Event.createPlayerEvent('connected', playerId, serverId, data);
            return await this.createEvent(event);
        } catch (error) {
            console.error('Error in EventRepository.createConnectionEvent:', error);
            throw error;
        }
    }
    
    async createDisconnectionEvent(serverId, playerId, data = {}) {
        try {
            const event = Event.createPlayerEvent('disconnected', playerId, serverId, data);
            return await this.createEvent(event);
        } catch (error) {
            console.error('Error in EventRepository.createDisconnectionEvent:', error);
            throw error;
        }
    }
    
    async createPenaltyEvent(serverId, playerId, penaltyType, data = {}) {
        try {
            const event = Event.createPlayerEvent(`penalty.${penaltyType}`, playerId, serverId, data);
            return await this.createEvent(event);
        } catch (error) {
            console.error('Error in EventRepository.createPenaltyEvent:', error);
            throw error;
        }
    }
    
    async createMatchEvent(serverId, matchEventType, data = {}) {
        try {
            // Extract the specific event type from the full type (match.start -> start)
            const eventType = matchEventType.includes('.') ? matchEventType.split('.')[1] : matchEventType;
            const event = Event.createMatchEvent(eventType, serverId, data);
            return await this.createEvent(event);
        } catch (error) {
            console.error('Error in EventRepository.createMatchEvent:', error);
            throw error;
        }
    }
    
    /**
     * Create a server event
     * @param {number} serverId - Server ID
     * @param {string} eventType - Server event type
     * @param {Object} data - Additional event data
     * @returns {Promise<Event>} Created event
     */
    async createServerEvent(serverId, eventType, data = {}) {
        try {
            // Extract the specific event type from the full type (server.start -> start)
            const specificType = eventType.includes('.') ? eventType.split('.')[1] : eventType;
            const event = Event.createServerEvent(specificType, serverId, data);
            return await this.createEvent(event);
        } catch (error) {
            console.error('Error in EventRepository.createServerEvent:', error);
            throw error;
        }
    }
    
    /**
     * Create a custom event type
     * @param {number|null} serverId - Optional server ID
     * @param {string} eventType - Custom event type
     * @param {Object} data - Event data
     * @returns {Promise<Event>} Created event
     */
    async createCustomEvent(serverId, eventType, data = {}) {
        try {
            const event = new Event({
                serverId,
                playerId: data.playerId || null,
                type: eventType,
                data
            });
            
            return await this.createEvent(event);
        } catch (error) {
            console.error('Error in EventRepository.createCustomEvent:', error);
            throw error;
        }
    }
    
    /**
     * Get events with enriched data (player and server details)
     * @param {number} limit - Maximum results
     * @param {number} offset - Results to skip
     * @returns {Promise<Array<Object>>} Enriched events
     */
    async getEnrichedEvents(limit = 100, offset = 0) {
        try {
            const rows = await this.db.all(`
                SELECT e.*, 
                    p.name as player_name, p.guid as player_guid,
                    s.name as server_name
                FROM events e
                LEFT JOIN players p ON e.player_id = p.id
                LEFT JOIN servers s ON e.server_id = s.id
                ORDER BY e.timestamp DESC
                LIMIT ? OFFSET ?
            `, [limit, offset]);
            
            return rows.map(row => {
                const event = Event.fromDatabaseRow(row);
                
                // Add enriched data
                if (row.player_id) {
                    event.player = {
                        id: row.player_id,
                        name: row.player_name,
                        guid: row.player_guid
                    };
                }
                
                if (row.server_id) {
                    event.server = {
                        id: row.server_id,
                        name: row.server_name
                    };
                }
                
                return event;
            });
        } catch (error) {
            console.error('Error in EventRepository.getEnrichedEvents:', error);
            throw error;
        }
    }
    
    /**
     * Get event counts by category
     * @param {string} timeframe - Time period (today, week, month, all)
     * @returns {Promise<Object>} Event counts by category
     */
    async getEventCountsByCategory(timeframe = 'all') {
        try {
            let timeCondition;
            
            switch (timeframe) {
                case 'today':
                    timeCondition = "timestamp >= date('now', 'start of day')";
                    break;
                case 'week':
                    timeCondition = "timestamp >= date('now', '-7 days')";
                    break;
                case 'month':
                    timeCondition = "timestamp >= date('now', '-30 days')";
                    break;
                default:
                    timeCondition = "1=1"; // All events
            }
            
            // Use substr to extract categories (e.g., player.connected -> player)
            const query = `
                SELECT substr(type, 1, instr(type, '.') - 1) as category, COUNT(*) as count
                FROM ${this.tableName}
                WHERE ${timeCondition}
                GROUP BY category
                ORDER BY count DESC
            `;
            
            return await this.db.all(query);
        } catch (error) {
            console.error('Error in EventRepository.getEventCountsByCategory:', error);
            throw error;
        }
    }
    
    /**
     * Get related events (events from same server, player or match)
     * @param {number} eventId - Event ID to find related events for
     * @param {number} limit - Maximum number of related events
     * @returns {Promise<Array<Event>>} Related events
     */
    async getRelatedEvents(eventId, limit = 20) {
        try {
            // First get the original event
            const originalEvent = await this.getById(eventId);
            if (!originalEvent) {
                throw new Error(`Event with ID ${eventId} not found`);
            }
            
            let query = '';
            const params = [];
            
            // Find related events based on serverId, playerId, or matchId
            if (originalEvent.serverId) {
                query += 'server_id = ? AND id != ?';
                params.push(originalEvent.serverId, eventId);
            }
            
            if (originalEvent.playerId) {
                if (query) query += ' OR ';
                query += 'player_id = ? AND id != ?';
                params.push(originalEvent.playerId, eventId);
            }
            
            // Check for match ID in data
            if (originalEvent.data?.matchId) {
                if (query) query += ' OR ';
                // This requires a more complex query to check inside JSON data
                query += `json_extract(data, '$.matchId') = ? AND id != ?`;
                params.push(originalEvent.data.matchId, eventId);
            }
            
            // If no relations found, return empty array
            if (!query) {
                return [];
            }
            
            // Get related events
            const rows = await this.db.all(
                `SELECT * FROM ${this.tableName} WHERE (${query}) ORDER BY timestamp DESC LIMIT ?`,
                [...params, limit]
            );
            
            return rows.map(row => Event.fromDatabaseRow(row));
        } catch (error) {
            console.error('Error in EventRepository.getRelatedEvents:', error);
            throw error;
        }
    }
    
    /**
     * Search events by text in any field
     * @param {string} searchText - Text to search for
     * @param {number} limit - Maximum results
     * @param {number} offset - Results to skip
     * @returns {Promise<Array<Event>>} Matching events
     */
    async searchEvents(searchText, limit = 100, offset = 0) {
        try {
            const searchPattern = `%${searchText}%`;
            
            // Search in event type and data
            const rows = await this.db.all(
                `SELECT e.*, 
                     p.name as player_name, 
                     s.name as server_name
                 FROM ${this.tableName} e
                 LEFT JOIN players p ON e.player_id = p.id
                 LEFT JOIN servers s ON e.server_id = s.id
                 WHERE e.type LIKE ? 
                     OR e.data LIKE ?
                     OR p.name LIKE ?
                     OR s.name LIKE ?
                 ORDER BY e.timestamp DESC
                 LIMIT ? OFFSET ?`,
                [searchPattern, searchPattern, searchPattern, searchPattern, limit, offset]
            );
            
            return rows.map(row => {
                const event = Event.fromDatabaseRow(row);
                
                // Add enriched data
                if (row.player_id && row.player_name) {
                    event.player = {
                        id: row.player_id,
                        name: row.player_name
                    };
                }
                
                if (row.server_id && row.server_name) {
                    event.server = {
                        id: row.server_id,
                        name: row.server_name
                    };
                }
                
                return event;
            });
        } catch (error) {
            console.error('Error in EventRepository.searchEvents:', error);
            throw error;
        }
    }
}

module.exports = EventRepository;
