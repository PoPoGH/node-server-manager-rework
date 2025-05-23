/**
 * StatisticsPlugin - Un exemple de plugin MVC qui collecte et affiche des statistiques
 */
const BasePlugin = require('../../core/BasePlugin');

class StatisticsPlugin extends BasePlugin {
    /**
     * Crée une nouvelle instance de StatisticsPlugin
     * @param {ServiceFactory} serviceFactory - Instance de ServiceFactory
     */
    constructor(serviceFactory) {
        super(serviceFactory);
        
        // Métadonnées du plugin
        this.name = 'StatisticsPlugin';
        this.version = '1.0.0';
        this.description = 'Collecte et affiche des statistiques sur les joueurs et serveurs';
        this.author = 'Node Server Manager Team';
        
        // Statistiques internes
        this.stats = {
            connections: 0,
            disconnections: 0,
            messages: 0,
            kills: 0,
            matches: 0,
            serverStarts: 0,
            serverStops: 0
        };
        
        // Intervalles
        this.intervals = {
            reportStats: null
        };
    }
    
    /**
     * Configure les gestionnaires d'événements du plugin
     * @returns {Promise<void>}
     * @protected
     */
    async _setupEventHandlers() {
        // Événements joueurs
        this.subscribe('player.connected', this.handlePlayerConnect);
        this.subscribe('player.disconnected', this.handlePlayerDisconnect);
        this.subscribe('player.message', this.handlePlayerMessage);
        this.subscribe('player.kill', this.handlePlayerKill);
        
        // Événements match
        this.subscribe('match.start', this.handleMatchStart);
        this.subscribe('match.end', this.handleMatchEnd);
        
        // Événements serveur
        this.subscribe('server.start', this.handleServerStart);
        this.subscribe('server.stop', this.handleServerStop);
        
        // Configurer l'intervalle de rapport
        this.intervals.reportStats = setInterval(() => this.reportStatistics(), 60000);
        
        this.log('info', 'Gestionnaires d\'événements StatisticsPlugin configurés');
    }
    
    /**
     * Traiter une connexion de joueur
     * @param {Object} data - Données d'événement
     */
    handlePlayerConnect(data) {
        this.stats.connections++;
        this.log('debug', `Joueur connecté: ${data.player?.name || 'Unknown'} (Total: ${this.stats.connections})`);
    }
    
    /**
     * Traiter une déconnexion de joueur
     * @param {Object} data - Données d'événement
     */
    handlePlayerDisconnect(data) {
        this.stats.disconnections++;
        this.log('debug', `Joueur déconnecté: ${data.player?.name || 'Unknown'} (Total: ${this.stats.disconnections})`);
    }
    
    /**
     * Traiter un message de joueur
     * @param {Object} data - Données d'événement
     */
    handlePlayerMessage(data) {
        this.stats.messages++;
    }
    
    /**
     * Traiter un kill de joueur
     * @param {Object} data - Données d'événement
     */
    handlePlayerKill(data) {
        this.stats.kills++;
    }
    
    /**
     * Traiter un démarrage de match
     * @param {Object} data - Données d'événement
     */
    handleMatchStart(data) {
        this.stats.matches++;
        this.log('info', `Match démarré sur la carte ${data.mapName || 'inconnue'}`);
    }
    
    /**
     * Traiter une fin de match
     * @param {Object} data - Données d'événement
     */
    handleMatchEnd(data) {
        this.log('info', `Match terminé sur la carte ${data.mapName || 'inconnue'}`);
    }
    
    /**
     * Traiter un démarrage de serveur
     * @param {Object} data - Données d'événement
     */
    handleServerStart(data) {
        this.stats.serverStarts++;
        this.log('info', `Serveur démarré: ${data.serverName || data.serverId}`);
    }
    
    /**
     * Traiter un arrêt de serveur
     * @param {Object} data - Données d'événement
     */
    handleServerStop(data) {
        this.stats.serverStops++;
        this.log('info', `Serveur arrêté: ${data.serverName || data.serverId}`);
    }
    
    /**
     * Génère un rapport de statistiques
     */
    async reportStatistics() {
        if (!this.enabled) return;
        
        try {
            // Obtenir des données supplémentaires des services
            const activeServers = await this.getActiveServerCount();
            const onlinePlayers = await this.getOnlinePlayerCount();
            
            // Créer le rapport
            const report = {
                timestamp: new Date(),
                onlinePlayers,
                activeServers,
                ...this.stats
            };
            
            // Émettre l'événement de rapport
            await this.emitEvent('plugin.statistics.report', report, true);
            
            // Log le rapport
            this.log('info', 'Rapport de statistiques périodique', report);
        } catch (error) {
            this.log('error', 'Erreur lors de la génération du rapport de statistiques', error);
        }
    }
    
    /**
     * Obtenir le nombre de serveurs actifs
     * @returns {Promise<number>} Nombre de serveurs actifs
     */
    async getActiveServerCount() {
        try {
            const serverService = this.getService('serverService');
            if (!serverService) return 0;
            
            const servers = await serverService.getActiveServers();
            return servers.length;
        } catch (error) {
            this.log('error', 'Erreur lors de l\'obtention du nombre de serveurs actifs', error);
            return 0;
        }
    }
    
    /**
     * Obtenir le nombre de joueurs en ligne
     * @returns {Promise<number>} Nombre de joueurs en ligne
     */
    async getOnlinePlayerCount() {
        try {
            const playerService = this.getService('playerService');
            if (!playerService) return 0;
            
            const players = await playerService.getOnlinePlayers();
            return players.length;
        } catch (error) {
            this.log('error', 'Erreur lors de l\'obtention du nombre de joueurs en ligne', error);
            return 0;
        }
    }
    
    /**
     * Exporter les données de statistiques
     * @returns {Object} Données de statistiques
     */
    getStatistics() {
        return { ...this.stats };
    }
    
    /**
     * Réinitialiser les statistiques
     */
    resetStatistics() {
        Object.keys(this.stats).forEach(key => {
            this.stats[key] = 0;
        });
        
        this.log('info', 'Statistiques réinitialisées');
        this.emitEvent('plugin.statistics.reset', { timestamp: new Date() }, true);
    }
    
    /**
     * Désactiver le plugin
     * @returns {Promise<boolean>} Statut de succès
     */
    async disable() {
        // Nettoyer les intervalles
        if (this.intervals.reportStats) {
            clearInterval(this.intervals.reportStats);
            this.intervals.reportStats = null;
        }
        
        // Rapport de statistiques final avant la désactivation
        await this.reportStatistics();
        
        // Appeler la méthode disable du parent
        return super.disable();
    }
}

module.exports = StatisticsPlugin;
