/**
 * Active Player Entity - Represents a connected player on a game server
 * Handles real-time player interaction through RCON commands
 */
const EventEmitter = require('events');
const crypto = require('crypto');
const logger = require('../NSMR-Logger');
const PlayerModel = require('../../models/Player');

// System user for administrative actions
const SystemUser = { clientId: 0, name: 'System' };

class ActivePlayer extends EventEmitter {
    /**
     * Create a new player instance
     * @param {string} guid - Player GUID
     * @param {string} name - Player name
     * @param {number} clientSlot - Client slot on server
     * @param {string} ipAddress - Player IP address
     * @param {Object} server - Server instance
     */
    constructor(guid, name, clientSlot, ipAddress, server) {
        super();
        
        // Core player identifiers
        this.guid = guid;
        this.name = name;
        this.clientSlot = clientSlot;
        this.ipAddress = ipAddress;
        this.server = server;
        
        // State tracking
        this.isOnline = true;
        this.lastSeen = new Date();
        this.isGuidConfirmed = guid !== '0';
        this.clientId = 0; // Will be populated from database
        this.initialGuid = guid; // Store original GUID for reference
        this.permissionLevel = 0;
        
        // Model reference
        this.playerModel = null;
        
        logger.debug(`Player created: ${name} (${guid}), slot ${clientSlot}`);
    }

    /**
     * Update player GUID if a valid one is provided
     * @param {string} newGuid - New GUID for player
     * @returns {boolean} Whether GUID was updated
     */
    updateGuid(newGuid) {
        if (newGuid && newGuid !== '0' && newGuid !== this.guid) {
            logger.info(`Updating GUID for ${this.name}: ${this.guid} -> ${newGuid}`);
            this.guid = newGuid;
            this.isGuidConfirmed = true;
            
            // Update server's clients reference if needed
            if (this.server.clients[this.clientSlot] === this) {
                this.server.clients[this.clientSlot] = this;
            }
            return true;
        }
        return false;
    }
    
    /**
     * Build complete player object with database info
     * @returns {Promise<boolean>} Success status
     */
    async build() {
        try {
            // Ensure player name is not null
            if (!this.name) {
                this.name = `Unnamed_${this.clientSlot}`;
                logger.warn(`Missing player name for slot ${this.clientSlot}, assigned: ${this.name}`);
            }
            
            logger.debug(`Building player: ${this.name}`);
            
            // Validate GUID, attempt to retrieve via RCON if invalid
            await this.validateGuid();
            
            // Ensure GUID is valid before continuing
            if (!this.guid || this.guid === '0') {
                await this.generateTemporaryGuid();
            }
            
            // Create player data object for database
            const playerIp = this.ipAddress ? this.ipAddress.split(':')[0] : null;
            const playerData = {
                guid: this.guid,
                name: this.name,
                ip: playerIp,
                country: null
            };
            
            // Get geolocation data if IP is available
            if (playerIp) {
                await this.enrichWithGeoData(playerData, playerIp);
            }
            
            // Save to database and get persistent data
            try {
                await this.saveToDatabase(playerData);
                
                // Create model reference for MVC integration
                if (this.clientId > 0) {
                    this.playerModel = new PlayerModel({
                        id: this.clientId,
                        guid: this.guid,
                        name: this.name,
                        lastSeenName: this.name,
                        ip: playerIp
                    });
                }
            } catch (dbError) {
                logger.error(`Database interaction error for ${this.name}: ${dbError.message}`);
                // Continue player construction despite DB error
            }
            
            // Initialize match data and temporary data
            this.matchData = {};
            this.sessionData = {}; 
            
            // Create a simple session identifier
            const sessionId = this.ipAddress && this.ipAddress.split(':')[0] 
                ? this.ipAddress.split(':')[0]
                : crypto.randomBytes(8).toString('hex');
            
            // Create session object
            this.session = {
                id: sessionId,
                data: {
                    authorized: false // Not authorized by default
                },
                created: new Date(),
                lastSeen: new Date()
            };
            
            logger.debug(`Player built: ${this.name}`);
            return true;
        } catch (error) {
            const playerName = this.name || `Slot_${this.clientSlot}` || 'Unknown';
            logger.error(`Error building player ${playerName}: ${error.message}`, error);
            return false;
        }
    }
    
    /**
     * Validate and attempt to retrieve GUID via RCON
     * @returns {Promise<void>}
     */
    async validateGuid() {
        if (!this.guid || this.guid === '0') {
            logger.warn(`Invalid GUID for ${this.name}: "${this.guid}". Attempting retrieval via RCON...`);
            
            try {
                // First attempt: use slot client for this specific player
                if (this.clientSlot !== undefined) {
                    await this.retrieveGuidViaSlot();
                }
                
                // If GUID is still invalid, try via general getStatus
                if (!this.guid || this.guid === '0') {
                    await this.retrieveGuidViaStatus();
                }
                
                // Update clients array with confirmed GUID
                if (this.isGuidConfirmed && this.server.clients) {
                    this.server.clients[this.clientSlot] = this;
                }
            } catch (rconError) {
                logger.warn(`Failed to retrieve GUID via RCON: ${rconError.message}`);
            }
        }
    }
    
    /**
     * Attempt to retrieve GUID via client slot
     * @returns {Promise<void>}
     */
    async retrieveGuidViaSlot() {
        logger.debug(`Attempting to retrieve GUID via client slot ${this.clientSlot}`);
        try {
            // Get server status
            const status = await this.server.rcon.getStatus();
            
            if (status && status.success && status.data && status.data.clients) {
                const clientFromStatus = status.data.clients.find(c => 
                    parseInt(c.num) === parseInt(this.clientSlot) || c.name === this.name
                );
                
                if (clientFromStatus && clientFromStatus.guid && clientFromStatus.guid !== '0') {
                    this.updateGuid(clientFromStatus.guid);
                    logger.info(`GUID retrieved for ${this.name} via slot ${this.clientSlot}: ${this.guid}`);
                    
                    // Also retrieve IP if available
                    if (clientFromStatus.address && !this.ipAddress) {
                        this.ipAddress = clientFromStatus.address;
                        logger.debug(`IP retrieved for ${this.name}: ${this.ipAddress}`);
                    }
                }
            }
        } catch (slotError) {
            logger.warn(`Failed to retrieve GUID via client slot: ${slotError.message}`);
        }
    }
    
    /**
     * Attempt to retrieve GUID via server status
     * @returns {Promise<void>}
     */
    async retrieveGuidViaStatus() {
        try {
            const status = await this.server.rcon.getStatus();
            
            if (status && status.success && status.data && status.data.clients) {
                const clientFromStatus = status.data.clients.find(c => 
                    c.name === this.name || parseInt(c.num) === parseInt(this.clientSlot)
                );
                
                if (clientFromStatus && clientFromStatus.guid && clientFromStatus.guid !== '0') {
                    this.updateGuid(clientFromStatus.guid);
                    logger.info(`GUID retrieved for ${this.name} via getStatus: ${this.guid}`);
                    
                    // Also retrieve IP if available
                    if (clientFromStatus.address && !this.ipAddress) {
                        this.ipAddress = clientFromStatus.address;
                        logger.debug(`IP retrieved for ${this.name}: ${this.ipAddress}`);
                    }
                }
            }
        } catch (statusError) {
            logger.warn(`Failed to retrieve GUID via status: ${statusError.message}`);
        }
    }
    
    /**
     * Generate a temporary GUID when none is available
     * @returns {Promise<void>}
     */
    async generateTemporaryGuid() {
        // Generate a temporary GUID based on name, IP, and slot
        const tempIdentifier = `${this.name}_${this.ipAddress || 'unknown'}_${this.clientSlot || 0}`;
        const tempGuid = crypto.createHash('md5').update(tempIdentifier).digest('hex');
        
        this.guid = `temp_${tempGuid}`;
        logger.warn(`Invalid GUID for ${this.name} after retrieval attempts. Generated temporary GUID: ${this.guid}`);
        this.isGuidConfirmed = false;
    }
    
    /**
     * Enrich player data with geolocation information
     * @param {Object} playerData - Player data object to enrich
     * @param {string} playerIp - Player IP address
     * @returns {Promise<void>}
     */
    async enrichWithGeoData(playerData, playerIp) {
        try {
            const IpInfo = require('../../utils/IpInfo');
            logger.debug(`Attempting to retrieve geolocation data for ${this.name} with IP: ${this.ipAddress}`);
            
            const geoInfo = await IpInfo.getInfo(this.ipAddress);
            
            if (geoInfo && geoInfo.country) {
                playerData.country = geoInfo.country;
                logger.info(`Country detected for ${this.name}: ${geoInfo.country}`);
            } else {
                logger.warn(`Could not retrieve country for ${this.name}, geo API unavailable or missing data`);
            }
        } catch (geoError) {
            logger.warn(`Failed to retrieve geolocation data for ${this.name}: ${geoError.message}`);
        }
    }
    
    /**
     * Save player data to database
     * @param {Object} playerData - Player data to save
     * @returns {Promise<void>}
     */
    async saveToDatabase(playerData) {
        // Use the EventService if available, otherwise fall back to direct DB
        try {
            // Try to use the service via the server's service container
            if (this.server.services && this.server.services.playerService) {
                const playerService = this.server.services.playerService;
                const result = await playerService.createOrUpdatePlayer(playerData);
                
                this.clientId = result.id;
                this.permissionLevel = result.admin ? 1 : 0;
                
                // Log the connection event via EventService
                if (this.server.services.eventService) {
                    await this.server.services.eventService.createEvent({
                        type: 'player.connect',
                        playerId: this.clientId,
                        serverId: this.server.id,
                        data: {
                            name: this.name,
                            guid: this.guid,
                            ip: this.ipAddress,
                            clientSlot: this.clientSlot
                        }
                    });
                }
            } else {
                // Fall back to direct DB access (legacy method)
                const dbPlayer = await this.server.db.upsertPlayer(playerData);
                this.clientId = dbPlayer.id;
                logger.debug(`Client ID: ${this.clientId} - Name: ${this.name}`);
                
                // Initialize stats
                await this.server.db.initializeStats(this.clientId);
                
                // Get permission level
                this.permissionLevel = await this.server.db.getClientLevel(this.clientId);
                logger.debug(`Permission level: ${this.permissionLevel}`);
                
                // Log the connection
                const connectionData = {
                    ...this,
                    clientId: this.clientId,
                    ipAddress: this.ipAddress
                };
                await this.server.db.logConnection(connectionData);
            }
        } catch (dbError) {
            logger.error(`Error saving player to database: ${dbError.message}`);
            throw dbError;
        }
    }
    
    /**
     * Get persistent metadata for player
     * @param {string} name - Metadata name
     * @param {string} type - Metadata type
     * @returns {Promise<any>} Metadata value
     */
    async getPersistentMeta(name, type = '') {
        try {
            // Use service if available
            if (this.server.services && this.server.services.playerService) {
                return await this.server.services.playerService.getPlayerMetadata(this.clientId, name, type);
            }
            
            // Fall back to legacy meta service
            if (!this.server.db.metaService) {
                logger.warn(`metaService not available for player ${this.name}`);
                return null;
            }
            
            return await this.server.db.metaService.getPersistentMeta(
                name, 
                this.clientId, 
                type
            );
        } catch (error) {
            logger.error(`Error retrieving metadata for ${this.name}: ${error.message}`, error);
            return null;
        }
    }
    
    /**
     * Report player for violation
     * @param {string} reason - Report reason
     * @param {Object} origin - Origin player or system
     * @returns {boolean} Success status
     */
    report(reason, origin = SystemUser) {
        try {
            // Use EventService if available
            if (this.server.services && this.server.services.eventService) {
                this.server.services.eventService.createEvent({
                    type: 'player.report',
                    playerId: this.clientId,
                    serverId: this.server.id,
                    originId: origin.clientId,
                    data: { 
                        reason,
                        playerName: this.name,
                        originName: origin.name
                    }
                });
            } else {
                // Fall back to legacy reporting
                this.server.db.addReport(origin.clientId, this.clientId, reason);
            }
            
            this.server.emit('report', origin, this, reason);
            
            if (this.server.tellStaffGlobal && typeof this.server.tellStaffGlobal === 'function') {
                const message = `${origin.name} reported ${this.name} on ${this.server.hostname || this.server.name}: ${reason}`;
                this.server.tellStaffGlobal(message);
            }
            
            return true;
        } catch (error) {
            logger.error(`Error reporting ${this.name}: ${error.message}`, error);
            return false;
        }
    }
    
    /**
     * Permanently ban player
     * @param {string} reason - Ban reason
     * @param {Object} origin - Origin player or system
     * @returns {boolean} Success status
     */
    ban(reason, origin = SystemUser) {
        try {
            // Use EventService if available
            if (this.server.services && this.server.services.eventService) {
                this.server.services.eventService.createPenaltyEvent({
                    type: 'PENALTY_PERMA_BAN',
                    playerId: this.clientId,
                    serverId: this.server.id,
                    originId: origin.clientId,
                    reason,
                    duration: 0
                });
            } else {
                // Fall back to legacy penalty system
                this.server.db.addPenalty({
                    targetId: this.clientId,
                    originId: origin.clientId,
                    penaltyType: 'PENALTY_PERMA_BAN',
                    duration: 0,
                    reason: reason
                });
            }
            
            this.server.emit('penalty', 'PENALTY_PERMA_BAN', this, reason, origin);
            this.kick(`You have been permanently banned for: ^5${reason}`, origin, false, '');
            return true;
        } catch (error) {
            logger.error(`Error banning ${this.name}: ${error.message}`, error);
            return false;
        }
    }
    
    /**
     * Temporarily ban player
     * @param {string} reason - Ban reason
     * @param {Object} origin - Origin player or system
     * @param {number} duration - Ban duration in seconds
     * @returns {boolean} Success status
     */
    tempBan(reason, origin, duration) {
        try {
            // Use EventService if available
            if (this.server.services && this.server.services.eventService) {
                this.server.services.eventService.createPenaltyEvent({
                    type: 'PENALTY_TEMP_BAN',
                    playerId: this.clientId,
                    serverId: this.server.id,
                    originId: origin.clientId,
                    reason,
                    duration
                });
            } else {
                // Fall back to legacy penalty system
                this.server.db.addPenalty({
                    targetId: this.clientId,
                    originId: origin.clientId,
                    penaltyType: 'PENALTY_TEMP_BAN',
                    duration: duration,
                    reason: reason
                });
            }
            
            this.server.emit('penalty', 'PENALTY_TEMP_BAN', this, reason, origin, duration);
            
            const durationText = this.server.utils && this.server.utils.secondsToDhms 
                ? this.server.utils.secondsToDhms(duration) 
                : `${duration}s`;
            
            this.kick(`You have been banned for: ^5${reason} ${durationText}^7 left`, origin, false, '');
            return true;
        } catch (error) {
            logger.error(`Error temp-banning ${this.name}: ${error.message}`, error);
            return false;
        }
    }
    
    /**
     * Send message to player
     * @param {string} text - Message text
     * @returns {Promise<boolean>} Success status
     */
    async tell(text) {
        try {
            if (!text) return false;
            
            if (!this.server.rcon || !this.server.rcon.commandPrefixes) {
                logger.warn(`Cannot send message to ${this.name}: RCON not configured`);
                return false;
            }
            
            const prefixes = this.server.rcon.commandPrefixes;
            const maxLength = prefixes.dvars && prefixes.dvars.maxSayLength 
                ? prefixes.dvars.maxSayLength 
                : 100;
            
            // Function to split text into chunks
            const breakString = (text, maxLength, separator = ' ') => {
                const chunks = [];
                let currentChunk = '';
                
                text.split(separator).forEach(word => {
                    if ((currentChunk + separator + word).length <= maxLength) {
                        currentChunk = currentChunk 
                            ? currentChunk + separator + word 
                            : word;
                    } else {
                        if (currentChunk) chunks.push(currentChunk);
                        currentChunk = word;
                    }
                });
                
                if (currentChunk) chunks.push(currentChunk);
                return chunks;
            };
            
            const chunks = breakString(text, maxLength);
            
            for (let i = 0; i < chunks.length; i++) {
                // Use player name rather than client slot for tell command
                const playerIdentifier = this.name || this.clientSlot;
                
                await this.server.rcon.executeCommandAsync(
                    prefixes.rcon.tell
                        .replace('%CLIENT%', playerIdentifier)
                        .replace('%MESSAGE%', chunks[i])
                );
            }
            
            return true;
        } catch (error) {
            logger.error(`Error sending message to ${this.name}: ${error.message}`, error);
            return false;
        }
    }
    
    /**
     * Kick player from server
     * @param {string} message - Kick message
     * @param {Object} origin - Origin player or system
     * @param {boolean} log - Whether to log the kick
     * @param {string} baseMsg - Base message prefix
     * @returns {boolean} Success status
     */
    kick(message, origin = SystemUser, log = true, baseMsg = 'You have been kicked: ^5') {
        try {
            // Use EventService if available
            if (this.server.services && this.server.services.eventService) {
                this.server.services.eventService.createPenaltyEvent({
                    type: 'PENALTY_KICK',
                    playerId: this.clientId,
                    serverId: this.server.id,
                    originId: origin.clientId,
                    reason: message,
                    duration: 0
                });
            } else {
                // Fall back to legacy penalty system
                this.server.db.addPenalty({
                    targetId: this.clientId,
                    originId: origin.clientId,
                    penaltyType: 'PENALTY_KICK',
                    duration: 0,
                    reason: message
                });
            }
            
            if (log) {
                this.server.emit('penalty', 'PENALTY_KICK', this, message, origin);
            }
            
            if (this.server.rcon && this.server.rcon.commandPrefixes) {
                this.server.rcon.executeCommandAsync(
                    this.server.rcon.commandPrefixes.rcon.clientKick
                        .replace('%CLIENT%', this.clientSlot)
                        .replace('%REASON%', `${baseMsg}${message}`)
                );
            } else {
                logger.warn(`Cannot kick ${this.name}: RCON not configured`);
            }
            
            // Remove player from list
            if (this.server.clients) {
                this.server.clients[this.clientSlot] = null;
            }
            
            return true;
        } catch (error) {
            logger.error(`Error kicking ${this.name}: ${error.message}`, error);
            return false;
        }
    }
    
    /**
     * Handle player disconnect
     * @returns {Promise<boolean>} Success status
     */
    async disconnect() {
        try {
            this.isOnline = false;
            this.lastSeen = new Date();
            
            // Log disconnect event
            if (this.server.services && this.server.services.eventService) {
                await this.server.services.eventService.createEvent({
                    type: 'player.disconnect',
                    playerId: this.clientId,
                    serverId: this.server.id,
                    data: {
                        name: this.name,
                        guid: this.guid,
                        clientSlot: this.clientSlot
                    }
                });
            }
            
            // Emit disconnect event for plugins
            this.server.emit('player.disconnect', {
                player: this,
                clientId: this.clientId,
                name: this.name,
                guid: this.guid
            });
            
            // Remove player from clients list
            if (this.server.clients) {
                this.server.clients[this.clientSlot] = null;
            }
            
            return true;
        } catch (error) {
            logger.error(`Error handling disconnect for ${this.name}: ${error.message}`, error);
            return false;
        }
    }
    
    /**
     * Convert to plain object for serialization
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            clientId: this.clientId,
            guid: this.guid,
            name: this.name,
            clientSlot: this.clientSlot,
            ipAddress: this.ipAddress?.split(':')[0], // Only include IP, not port
            isOnline: this.isOnline,
            lastSeen: this.lastSeen,
            server: {
                id: this.server.id,
                name: this.server.name
            },
            permissionLevel: this.permissionLevel
        };
    }
}

module.exports = ActivePlayer;
