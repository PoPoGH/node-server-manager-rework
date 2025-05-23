/**
 * Event Controller - Handles event-related API endpoints
 */
const EventService = require('../services/EventService');
const PlayerService = require('../services/PlayerService');

class EventController {
    /**
     * Create a new EventController
     * @param {Object} db - Database connection
     */
    constructor(db) {
        this.eventService = new EventService(db);
        this.playerService = new PlayerService(db);
        this.db = db;
        
        // Bind methods to ensure 'this' context
        this.getRecentEvents = this.getRecentEvents.bind(this);
        this.getEventById = this.getEventById.bind(this);
        this.getPlayerEvents = this.getPlayerEvents.bind(this);
        this.getServerEvents = this.getServerEvents.bind(this);
        this.getEventsByType = this.getEventsByType.bind(this);
        this.getEventCounts = this.getEventCounts.bind(this);
        this.searchEvents = this.searchEvents.bind(this);
        this.getRelatedEvents = this.getRelatedEvents.bind(this);
        this.getEventStatsByCategory = this.getEventStatsByCategory.bind(this);
        this.createEvent = this.createEvent.bind(this);
    }
    
    /**
     * Get recent events with pagination
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getRecentEvents(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const offset = parseInt(req.query.offset) || 0;
            const enriched = req.query.enriched === 'true';
            
            const result = await this.eventService.getEvents({
                limit,
                offset,
                enriched
            });
            
            res.json({
                success: true,
                total: result.total,
                limit: result.limit,
                offset: result.offset,
                events: result.events.map(e => e.toJSON())
            });
        } catch (error) {
            console.error('Error in EventController.getRecentEvents:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving events: ' + error.message
            });
        }
    }
    
    /**
     * Get event by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getEventById(req, res) {
        try {
            const eventId = parseInt(req.params.id);
            const event = await this.eventService.getEventById(eventId);
            
            if (!event) {
                return res.status(404).json({
                    success: false,
                    error: 'Event not found'
                });
            }
            
            const enriched = req.query.enriched === 'true';
            let enrichedEvent = event;
            
            if (enriched) {
                enrichedEvent = await this.eventService.enrichEvent(event);
            }
            
            res.json({
                success: true,
                event: enrichedEvent.toJSON()
            });
        } catch (error) {
            console.error('Error in EventController.getEventById:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving event: ' + error.message
            });
        }
    }
    
    /**
     * Get events for a specific player
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getPlayerEvents(req, res) {
        try {
            const playerId = parseInt(req.params.id);
            const limit = parseInt(req.query.limit) || 100;
            const offset = parseInt(req.query.offset) || 0;
            const enriched = req.query.enriched === 'true';
            
            // Check if player exists
            const player = await this.playerService.getPlayerById(playerId);
            if (!player) {
                return res.status(404).json({
                    success: false,
                    error: 'Player not found'
                });
            }
            
            const result = await this.eventService.getEvents({
                playerId,
                enriched,
                limit,
                offset
            });
            
            res.json({
                success: true,
                player: player.toJSON(),
                total: result.total,
                limit: result.limit,
                offset: result.offset,
                events: result.events.map(e => e.toJSON())
            });
        } catch (error) {
            console.error('Error in EventController.getPlayerEvents:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving player events: ' + error.message
            });
        }
    }
    
    /**
     * Get events for a specific server
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getServerEvents(req, res) {
        try {
            const serverId = parseInt(req.params.id);
            const limit = parseInt(req.query.limit) || 100;
            const offset = parseInt(req.query.offset) || 0;
            const enriched = req.query.enriched === 'true';
            
            // Check if server exists
            const serverExists = await this.db.get('SELECT id FROM servers WHERE id = ?', [serverId]);
            if (!serverExists) {
                return res.status(404).json({
                    success: false,
                    error: 'Server not found'
                });
            }
            
            const result = await this.eventService.getEvents({
                serverId,
                enriched,
                limit,
                offset
            });
            
            res.json({
                success: true,
                serverId,
                total: result.total,
                limit: result.limit,
                offset: result.offset,
                events: result.events.map(e => e.toJSON())
            });
        } catch (error) {
            console.error('Error in EventController.getServerEvents:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving server events: ' + error.message
            });
        }
    }
    
    /**
     * Get events by type
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getEventsByType(req, res) {
        try {
            const type = req.params.type;
            const limit = parseInt(req.query.limit) || 100;
            const offset = parseInt(req.query.offset) || 0;
            const enriched = req.query.enriched === 'true';
            
            const result = await this.eventService.getEvents({
                type,
                enriched,
                limit,
                offset
            });
            
            res.json({
                success: true,
                type,
                total: result.total,
                limit: result.limit,
                offset: result.offset,
                events: result.events.map(e => e.toJSON())
            });
        } catch (error) {
            console.error('Error in EventController.getEventsByType:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving events: ' + error.message
            });
        }
    }
    
    /**
     * Get event counts by type for a time period
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object 
     */
    async getEventCounts(req, res) {
        try {
            const timeframe = req.query.timeframe || 'today';
            const result = await this.eventService.getEventCounts(timeframe);
            
            res.json({
                success: true,
                timeframe: result.timeframe,
                counts: result.counts,
                total: result.total
            });
        } catch (error) {
            console.error('Error in EventController.getEventCounts:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving event counts: ' + error.message
            });
        }
    }
    
    /**
     * Search for events matching a text query
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async searchEvents(req, res) {
        try {
            const query = req.query.q || '';
            const limit = parseInt(req.query.limit) || 100;
            const offset = parseInt(req.query.offset) || 0;
            
            if (!query.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Search query is required'
                });
            }
            
            const result = await this.eventService.searchEvents(query, { limit, offset });
            
            res.json({
                success: true,
                query: result.query,
                total: result.total,
                limit: result.limit,
                offset: result.offset,
                events: result.events.map(e => e.toJSON())
            });
        } catch (error) {
            console.error('Error in EventController.searchEvents:', error);
            res.status(500).json({
                success: false,
                error: 'Error searching events: ' + error.message
            });
        }
    }
    
    /**
     * Get related events for a specific event
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getRelatedEvents(req, res) {
        try {
            const eventId = parseInt(req.params.id);
            const limit = parseInt(req.query.limit) || 20;
            
            const event = await this.eventService.eventRepository.getById(eventId);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    error: 'Event not found'
                });
            }
            
            const relatedEvents = await this.eventService.getRelatedEvents(eventId, limit);
            
            res.json({
                success: true,
                eventId,
                total: relatedEvents.length,
                events: relatedEvents.map(e => e.toJSON())
            });
        } catch (error) {
            console.error('Error in EventController.getRelatedEvents:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving related events: ' + error.message
            });
        }
    }
    
    /**
     * Get event statistics by category
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getEventStatsByCategory(req, res) {
        try {
            const timeframe = req.query.timeframe || 'all';
            const stats = await this.eventService.getEventStatsByCategory(timeframe);
            
            res.json({
                success: true,
                timeframe: stats.timeframe,
                categories: stats.categories,
                total: stats.total
            });
        } catch (error) {
            console.error('Error in EventController.getEventStatsByCategory:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving event statistics: ' + error.message
            });
        }
    }
    
    /**
     * Create a new custom event
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async createEvent(req, res) {
        try {
            const { type, serverId, playerId, data, persist = true } = req.body;
            
            if (!type) {
                return res.status(400).json({
                    success: false,
                    error: 'Event type is required'
                });
            }
            
            // Create and emit the event
            const event = await this.eventService.emitAndStore(type, {
                serverId: serverId || null,
                playerId: playerId || null,
                data: data || {}
            }, persist);
            
            res.status(201).json({
                success: true,
                message: 'Event created successfully',
                event: event ? event.toJSON() : null,
                persisted: !!event
            });
        } catch (error) {
            console.error('Error in EventController.createEvent:', error);
            res.status(500).json({
                success: false,
                error: 'Error creating event: ' + error.message
            });
        }
    }
}

module.exports = EventController;
