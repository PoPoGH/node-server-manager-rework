/**
 * Service de gestion des joueurs
 */
import apiClient from './apiClient';

const playerService = {
  /**
   * Récupère tous les joueurs
   * @param {Object} options - Options de filtrage
   * @returns {Promise<Array>} Liste des joueurs
   */
  getAllPlayers: async (options = {}) => {
    const queryParams = new URLSearchParams();
    
    // Ajout des options de filtrage
    if (options.search) queryParams.append('search', options.search);
    if (options.limit) queryParams.append('limit', options.limit);
    if (options.offset) queryParams.append('offset', options.offset);
    if (options.sortBy) queryParams.append('sortBy', options.sortBy);
    if (options.sortDir) queryParams.append('sortDir', options.sortDir);
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get(`/players${query}`);
    
    return response.players || [];
  },

  /**
   * Récupère un joueur par son ID
   * @param {string|number} id - ID du joueur
   * @returns {Promise<Object>} Détails du joueur
   */
  getPlayerById: async (id) => {
    const response = await apiClient.get(`/players/${id}`);
    return response.player;
  },

  /**
   * Récupère l'historique des parties d'un joueur
   * @param {string|number} id - ID du joueur
   * @param {Object} options - Options de filtrage
   * @returns {Promise<Array>} Historique des parties
   */
  getPlayerMatchHistory: async (id, options = {}) => {
    const queryParams = new URLSearchParams();
    
    if (options.limit) queryParams.append('limit', options.limit);
    if (options.offset) queryParams.append('offset', options.offset);
    if (options.game) queryParams.append('game', options.game);
    if (options.server) queryParams.append('server', options.server);
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get(`/players/${id}/matches${query}`);
    
    return response.matches || [];
  },

  /**
   * Récupère les statistiques d'un joueur
   * @param {string|number} id - ID du joueur
   * @param {string} game - Type de jeu (zombies, mp, etc.)
   * @returns {Promise<Object>} Statistiques du joueur
   */
  getPlayerStats: async (id, game = null) => {
    const query = game ? `?game=${game}` : '';
    const response = await apiClient.get(`/players/${id}/stats${query}`);
    
    return response.stats || {};
  },

  /**
   * Met à jour ou crée un joueur
   * @param {Object} playerData - Données du joueur
   * @returns {Promise<Object>} Joueur mis à jour
   */
  savePlayer: async (playerData) => {
    if (playerData.id) {
      return await apiClient.put(`/players/${playerData.id}`, playerData);
    } else {
      return await apiClient.post('/players', playerData);
    }
  },

  /**
   * Supprime un joueur
   * @param {string|number} id - ID du joueur
   * @returns {Promise<Object>} Résultat de l'opération
   */
  deletePlayer: async (id) => {
    return await apiClient.delete(`/players/${id}`);
  },

  /**
   * Recherche des joueurs par nom
   * @param {string} query - Terme de recherche
   * @param {number} limit - Nombre maximum de résultats
   * @returns {Promise<Array>} Joueurs correspondants
   */
  searchPlayers: async (query, limit = 10) => {
    const response = await apiClient.get(`/players/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.players || [];
  },

  /**
   * Expulse un joueur d'un serveur
   * @param {string|number} serverId - ID du serveur
   * @param {string} playerIdentifier - Identifiant du joueur (guid, steam id, etc.)
   * @param {string} reason - Raison de l'expulsion
   * @returns {Promise<Object>} Résultat de l'opération
   */
  kickPlayer: async (serverId, playerIdentifier, reason = '') => {
    return await apiClient.post(`/servers/${serverId}/players/${playerIdentifier}/kick`, { reason });
  },

  /**
   * Bannit un joueur d'un serveur
   * @param {string|number} serverId - ID du serveur
   * @param {string} playerIdentifier - Identifiant du joueur
   * @param {string} reason - Raison du bannissement
   * @param {number} duration - Durée en minutes (0 = permanent)
   * @returns {Promise<Object>} Résultat de l'opération
   */
  banPlayer: async (serverId, playerIdentifier, reason = '', duration = 0) => {
    return await apiClient.post(`/servers/${serverId}/players/${playerIdentifier}/ban`, { reason, duration });
  },

  /**
   * Lève le bannissement d'un joueur
   * @param {string|number} serverId - ID du serveur
   * @param {string} playerIdentifier - Identifiant du joueur
   * @returns {Promise<Object>} Résultat de l'opération
   */
  unbanPlayer: async (serverId, playerIdentifier) => {
    return await apiClient.post(`/servers/${serverId}/players/${playerIdentifier}/unban`);
  }
};

export default playerService;
