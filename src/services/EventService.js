/**
 * Event Service - Business logic for event operations
 * Combines event persistence with in-memory pub/sub system
 */
const EventEmitter = require('events');
const EventRepository = require('../repositories/EventRepository');

class EventService extends EventEmitter {
    /**
     * Create a new EventService
     * @param {Object} db - Database connection
     */
    constructor(db) {
        super();
        
        // Set higher limit for event listeners to avoid warnings
        this.setMaxListeners(100);
        
        this.eventRepository = new EventRepository(db);
        
        // Track event types for debugging
        this.registeredEventTypes = new Set();
        
        // Self registration of internal events
        this.on('newListener', (event) => {
            this.registeredEventTypes.add(event);
        });
    }
    
    /**
     * Get recent events with optional enrichment
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Paginated events
     */
    async getEvents(options = {}) {
        try {
            const {
                serverId,
                playerId,
                type,
                enriched = false,
                limit = 100,
                offset = 0
            } = options;
            
            let events;
            let total;
            
            // Filter events based on options
            if (serverId) {
                events = await this.eventRepository.getServerEvents(serverId, limit, offset);
                total = await this.eventRepository.db.get(
                    'SELECT COUNT(*) as count FROM events WHERE server_id = ?',
                    [serverId]
                );
            } else if (playerId) {
                events = await this.eventRepository.getPlayerEvents(playerId, limit, offset);
                total = await this.eventRepository.db.get(
                    'SELECT COUNT(*) as count FROM events WHERE player_id = ?',
                    [playerId]
                );
            } else if (type) {
                events = await this.eventRepository.getEventsByType(type, limit, offset);
                total = await this.eventRepository.db.get(
                    'SELECT COUNT(*) as count FROM events WHERE type = ?',
                    [type]
                );
            } else {
                if (enriched) {
                    events = await this.eventRepository.getEnrichedEvents(limit, offset);
                } else {
                    events = await this.eventRepository.getRecentEvents(limit, offset);
                }
                total = await this.eventRepository.count();
            }
            
            return {
                total: total?.count || events.length,
                limit,
                offset,
                events
            };
        } catch (error) {
            console.error('Error in EventService.getEvents:', error);
            throw error;
        }
    }
    
    /**
     * Emit an event and optionally store it in the database
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     * @param {boolean} persist - Whether to persist the event to database
     * @returns {Promise<Object|null>} Created event or null if not persisted
     */
    async emitAndStore(eventType, eventData = {}, persist = false) {
        // First emit the event for real-time listeners
        this.emit(eventType, eventData);
        
        // If persistence is requested, store the event
        if (persist) {
            try {
                let dbEvent;
                
                // Handle different event types
                if (eventType.startsWith('player.')) {
                    // Player events
                    const { serverId, playerId, data = {} } = eventData;
                    if (eventType === 'player.connected') {
                        dbEvent = await this.logPlayerConnection(serverId, playerId, data);
                    } else if (eventType === 'player.disconnected') {
                        dbEvent = await this.logPlayerDisconnection(serverId, playerId, data);
                    } else if (eventType.startsWith('player.penalty.')) {
                        const penaltyType = eventType.split('.')[2]; // player.penalty.kick -> kick
                        dbEvent = await this.logPlayerPenalty(serverId, playerId, penaltyType, data);
                    } else {
                        dbEvent = await this.eventRepository.createCustomEvent(serverId, eventType, eventData);
                    }
                } else if (eventType.startsWith('match.')) {
                    // Match events
                    const { serverId, data = {} } = eventData;
                    dbEvent = await this.logMatchEvent(serverId, eventType, data);
                } else if (eventType.startsWith('server.')) {
                    // Server events
                    const { serverId, data = {} } = eventData;
                    dbEvent = await this.eventRepository.createServerEvent(serverId, eventType, data);
                } else {
                    // Generic events
                    dbEvent = await this.eventRepository.createCustomEvent(
                        eventData.serverId || null, 
                        eventType, 
                        eventData
                    );
                }
                
                return dbEvent;
            } catch (error) {
                console.error(`Error persisting event ${eventType}:`, error);
                // Continue execution even if persistence fails
            }
        }
        
        return null;
    }
    
    /**
     * Log player connection event
     * @param {number} serverId - Server ID
     * @param {number} playerId - Player ID
     * @param {Object} data - Additional event data
     * @returns {Promise<Object>} Created event
     */
    async logPlayerConnection(serverId, playerId, data = {}) {
        try {
            return await this.eventRepository.createConnectionEvent(serverId, playerId, data);
        } catch (error) {
            console.error('Error in EventService.logPlayerConnection:', error);
            throw error;
        }
    }
    
    /**
     * Log player disconnection event
     * @param {number} serverId - Server ID
     * @param {number} playerId - Player ID
     * @param {Object} data - Additional event data
     * @returns {Promise<Object>} Created event
     */
    async logPlayerDisconnection(serverId, playerId, data = {}) {
        try {
            return await this.eventRepository.createDisconnectionEvent(serverId, playerId, data);
        } catch (error) {
            console.error('Error in EventService.logPlayerDisconnection:', error);
            throw error;
        }
    }
    
    /**
     * Log player penalty event
     * @param {number} serverId - Server ID
     * @param {number} playerId - Player ID
     * @param {string} penaltyType - Penalty type (kick, ban, etc.)
     * @param {Object} data - Additional event data
     * @returns {Promise<Object>} Created event
     */
    async logPlayerPenalty(serverId, playerId, penaltyType, data = {}) {
        try {
            return await this.eventRepository.createPenaltyEvent(serverId, playerId, penaltyType, data);
        } catch (error) {
            console.error('Error in EventService.logPlayerPenalty:', error);
            throw error;
        }
    }
    
    /**
     * Log match event
     * @param {number} serverId - Server ID
     * @param {string} eventType - Match event type
     * @param {Object} data - Additional event data
     * @returns {Promise<Object>} Created event
     */
    async logMatchEvent(serverId, eventType, data = {}) {
        try {
            return await this.eventRepository.createMatchEvent(serverId, eventType, data);
        } catch (error) {
            console.error('Error in EventService.logMatchEvent:', error);
            throw error;
        }
    }
    
    /**
     * Get event counts by type for a time period
     * @param {string} timeframe - Time period to filter (today, week, month)
     * @returns {Promise<Object>} Event counts by type
     */
    async getEventCounts(timeframe = 'today') {
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
            
            const query = `
                SELECT type, COUNT(*) as count
                FROM events
                WHERE ${timeCondition}
                GROUP BY type
                ORDER BY count DESC
            `;
            
            const rows = await this.eventRepository.db.all(query);
            
            // Convert to object
            const counts = {};
            rows.forEach(row => {
                counts[row.type] = row.count;
            });
            
            return {
                timeframe,
                counts,
                total: rows.reduce((sum, row) => sum + row.count, 0)
            };
        } catch (error) {
            console.error('Error in EventService.getEventCounts:', error);
            throw error;
        }
    }
    
    /**
     * Get a list of registered event types
     * @returns {Array<string>} List of event types
     */
    getEventTypes() {
        return Array.from(this.registeredEventTypes);
    }
    
    /**
     * Search for events matching a text query
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Search results
     */
    async searchEvents(query, options = {}) {
        try {
            const { limit = 100, offset = 0 } = options;
            const events = await this.eventRepository.searchEvents(query, limit, offset);
            
            // Get total count for pagination
            const countQuery = `
                SELECT COUNT(*) as count FROM events e
                LEFT JOIN players p ON e.player_id = p.id
                LEFT JOIN servers s ON e.server_id = s.id
                WHERE e.type LIKE ? 
                    OR e.data LIKE ?
                    OR p.name LIKE ?
                    OR s.name LIKE ?
            `;
            
            const searchPattern = `%${query}%`;
            const total = await this.eventRepository.db.get(
                countQuery, 
                [searchPattern, searchPattern, searchPattern, searchPattern]
            );
            
            return {
                query,
                total: total?.count || events.length,
                limit,
                offset,
                events
            };
        } catch (error) {
            console.error('Error in EventService.searchEvents:', error);
            throw error;
        }
    }
    
    /**
     * Get related events for a specific event
     * @param {number} eventId - Event ID
     * @param {number} limit - Maximum number of related events to return
     * @returns {Promise<Array<Event>>} Related events
     */
    async getRelatedEvents(eventId, limit = 20) {
        try {
            return await this.eventRepository.getRelatedEvents(eventId, limit);
        } catch (error) {
            console.error('Error in EventService.getRelatedEvents:', error);
            throw error;
        }
    }
    
    /**
     * Get event statistics by category
     * @param {string} timeframe - Time period (today, week, month, all)
     * @returns {Promise<Object>} Event statistics by category
     */
    async getEventStatsByCategory(timeframe = 'all') {
        try {
            const categories = await this.eventRepository.getEventCountsByCategory(timeframe);
            
            // Calculate total
            const total = categories.reduce((sum, cat) => sum + cat.count, 0);
            
            // Add percentages
            const categoriesWithPercent = categories.map(cat => ({
                ...cat,
                percentage: Math.round((cat.count / total) * 100)
            }));
            
            return {
                timeframe,
                categories: categoriesWithPercent,
                total
            };
        } catch (error) {
            console.error('Error in EventService.getEventStatsByCategory:', error);
            throw error;
        }
    }
    
    /**
     * Extract and emit structured events from raw log data
     * This method helps LogService process raw logs into meaningful events
     * @param {string} rawLog - Raw log message
     * @param {Object} metadata - Additional metadata about the log
     * @returns {Promise<Event|null>} Extracted event or null if no event was extracted
     */
    async extractEventsFromLog(rawLog, metadata = {}) {
        try {
            if (!rawLog) return null;
            
            const { serverId, serverName } = metadata;
            let extractedEvent = null;
            
            // Extract player connection events
            const playerConnectMatch = rawLog.match(/Player "(.*?)" \(guid:(.*?)\) connected/i);
            if (playerConnectMatch && serverId) {
                const [_, playerName, guid] = playerConnectMatch;
                
                // Emit the event
                this.emit('player.connected', { 
                    serverId, 
                    serverName,
                    player: { name: playerName, guid },
                    rawLog
                });
                
                // Optionally store the event
                return await this.emitAndStore('player.connected', {
                    serverId,
                    playerId: await this._resolveOrCreatePlayerId(guid, playerName),
                    data: { 
                        player: { name: playerName, guid },
                        serverName,
                        rawLog 
                    }
                }, true);
            }
            
            // Extract player disconnection events
            const playerDisconnectMatch = rawLog.match(/Player "(.*?)" \(guid:(.*?)\) disconnected/i);
            if (playerDisconnectMatch && serverId) {
                const [_, playerName, guid] = playerDisconnectMatch;
                
                // Emit the event
                this.emit('player.disconnected', { 
                    serverId, 
                    serverName,
                    player: { name: playerName, guid },
                    rawLog
                });
                
                // Optionally store the event
                return await this.emitAndStore('player.disconnected', {
                    serverId,
                    playerId: await this._resolveOrCreatePlayerId(guid, playerName),
                    data: { 
                        player: { name: playerName, guid },
                        serverName,
                        rawLog 
                    }
                }, true);
            }
            
            // Extract match start events
            const matchStartMatch = rawLog.match(/Match started on map "(.*?)"/i);
            if (matchStartMatch && serverId) {
                const [_, mapName] = matchStartMatch;
                
                // Emit the event
                this.emit('match.start', { 
                    serverId, 
                    serverName,
                    mapName,
                    rawLog
                });
                
                // Optionally store the event
                return await this.emitAndStore('match.start', {
                    serverId,
                    data: { 
                        mapName,
                        serverName,
                        rawLog 
                    }
                }, true);
            }
            
            // Extract match end events
            const matchEndMatch = rawLog.match(/Match ended on map "(.*?)"/i);
            if (matchEndMatch && serverId) {
                const [_, mapName] = matchEndMatch;
                
                // Emit the event
                this.emit('match.end', { 
                    serverId, 
                    serverName,
                    mapName,
                    rawLog
                });
                
                // Optionally store the event
                return await this.emitAndStore('match.end', {
                    serverId,
                    data: { 
                        mapName,
                        serverName,
                        rawLog 
                    }
                }, true);
            }
            
            return extractedEvent;
        } catch (error) {
            console.error('Error extracting events from log:', error);
            return null;
        }
    }
    
    /**
     * Helper method to resolve a player ID from a GUID,
     * creating a new player record if needed
     * @param {string} guid - Player GUID
     * @param {string} name - Player name
     * @returns {Promise<number>} Player ID
     * @private
     */
    async _resolveOrCreatePlayerId(guid, name) {
        try {
            // Check if we have PlayerRepository available
            let playerRepository;
            try {
                // Try to get playerRepository from ServiceFactory
                const ServiceFactory = require('../services/ServiceFactory');
                const serviceFactory = global.serviceFactory || ServiceFactory.getInstance();
                const playerService = serviceFactory.get('PlayerService');
                
                if (playerService) {
                    // Use existing player service to resolve player
                    const player = await playerService.findOrCreatePlayer({ guid, name });
                    return player.id;
                }
                
                // Fallback to direct repository access
                const PlayerRepository = require('../repositories/PlayerRepository');
                playerRepository = new PlayerRepository(this.eventRepository.db);
            } catch (e) {
                // If ServiceFactory is not available, create repository directly
                const PlayerRepository = require('../repositories/PlayerRepository');
                playerRepository = new PlayerRepository(this.eventRepository.db);
            }
            
            if (playerRepository) {
                // Check if player exists
                const Player = require('../models/Player');
                const existingPlayer = await playerRepository.getByGuid(guid);
                
                if (existingPlayer) {
                    return existingPlayer.id;
                }
                
                // Create new player if not found
                const newPlayer = new Player({
                    guid,
                    name,
                    lastSeen: new Date()
                });
                
                const createdPlayer = await playerRepository.upsert(newPlayer);
                return createdPlayer.id;
            }
            
            return null;
        } catch (error) {
            console.error('Error resolving player ID:', error);
            return null;
        }
    }
    
    /**
     * Get an event by ID with optional enrichment
     * @param {number} id - Event ID
     * @returns {Promise<Event|null>} Event object or null if not found
     */
    async getEventById(id) {
        try {
            return await this.eventRepository.getById(id);
        } catch (error) {
            console.error('Error in EventService.getEventById:', error);
            throw error;
        }
    }
    
    /**
     * Enrich an event with additional data like player and server details
     * @param {Event} event - Event to enrich
     * @returns {Promise<Event>} Enriched event
     */
    async enrichEvent(event) {
        if (!event) return null;
        
        try {
            // If event already has player and server data, return as is
            if (event.player && event.server) {
                return event;
            }
            
            // Get player data if needed
            if (event.playerId && !event.player) {
                try {
                    const PlayerService = require('./PlayerService');
                    const playerService = new PlayerService(this.eventRepository.db);
                    const player = await playerService.getPlayerById(event.playerId);
                    
                    if (player) {
                        event.player = player;
                    }
                } catch (error) {
                    console.error('Error enriching event with player data:', error);
                }
            }
            
            // Get server data if needed
            if (event.serverId && !event.server) {
                try {
                    const ServerService = require('./ServerService');
                    const serverService = new ServerService(this.eventRepository.db);
                    const server = await serverService.getServerById(event.serverId);
                    
                    if (server) {
                        event.server = server;
                    }
                } catch (error) {
                    console.error('Error enriching event with server data:', error);
                }
            }
            
            return event;
        } catch (error) {
            console.error('Error in EventService.enrichEvent:', error);
            return event; // Return original event on error
        }
    }
    
    /**
     * Create a custom connection event for a player
     * @param {number} playerId - Player ID
     * @param {number} serverId - Server ID
     * @param {Object} additionalData - Additional event data
     * @returns {Promise<Event>} Created event
     */
    async createConnectionEvent(playerId, serverId, additionalData = {}) {
        try {
            // Create event through repository
            const event = await this.eventRepository.createConnectionEvent(
                serverId, playerId, additionalData
            );
            
            // Also emit it for real-time listeners
            this.emit('player.connected', {
                playerId,
                serverId,
                ...additionalData
            });
            
            return event;
        } catch (error) {
            console.error('Error in EventService.createConnectionEvent:', error);
            throw error;
        }
    }
}

module.exports = EventService;
