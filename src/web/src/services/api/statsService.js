/**
 * Service de gestion des statistiques
 */
import apiClient from './apiClient';

const statsService = {  /**
   * Récupère les statistiques générales du système
   * @returns {Promise<Object>} Statistiques globales
   */
  getGeneralStats: async () => {
    try {
      const response = await apiClient.get('/stats/general');
      return response || { stats: {} };
    } catch (error) {
      console.error('Error fetching general stats:', error);
      return { stats: {} };
    }
  },

  /**
   * Récupère le classement des joueurs
   * @param {Object} options - Options de filtrage
   * @returns {Promise<Array>} Classement des joueurs
   */
  getLeaderboard: async (options = {}) => {
    const queryParams = new URLSearchParams();
    
    if (options.game) queryParams.append('game', options.game);
    if (options.mode) queryParams.append('mode', options.mode);
    if (options.stat) queryParams.append('stat', options.stat);
    if (options.limit) queryParams.append('limit', options.limit);
    if (options.period) queryParams.append('period', options.period);
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get(`/stats/leaderboard${query}`);
    
    return response.players || [];
  },

  /**
   * Récupère les statistiques des zombies
   * @param {Object} options - Options de filtrage
   * @returns {Promise<Object>} Statistiques des zombies
   */  getZombieStats: async (options = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.period) queryParams.append('period', options.period);
      if (options.serverId) queryParams.append('serverId', options.serverId);
      
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await apiClient.get(`/stats/zombies${query}`);
      
      return response || {};
    } catch (error) {
      console.error('Error fetching zombie stats:', error);
      return { stats: {} };
    }
  },

  /**
   * Récupère les statistiques de matchs multijoueurs
   * @param {Object} options - Options de filtrage
   * @returns {Promise<Object>} Statistiques multijoueurs
   */  getMultiplayerStats: async (options = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.period) queryParams.append('period', options.period);
      if (options.serverId) queryParams.append('serverId', options.serverId);
      if (options.gameType) queryParams.append('gameType', options.gameType);
      
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await apiClient.get(`/stats/multiplayer${query}`);
      
      return response || {};
    } catch (error) {
      console.error('Error fetching multiplayer stats:', error);
      return { stats: {} };
    }
    
    return response || {};
  },

  /**
   * Récupère des statistiques pour une période spécifique
   * @param {string} period - Période (day, week, month, all)
   * @returns {Promise<Object>} Statistiques pour la période
   */
  getPeriodSummary: async (period = 'day') => {
    const response = await apiClient.get(`/stats/summary?period=${period}`);
    return response || {};
  },
  /**
   * Récupère les statistiques des serveurs
   * @returns {Promise<Array>} Statistiques des serveurs
   */
  getServerStats: async () => {
    try {
      const response = await apiClient.get('/stats/servers');
      return response.servers || [];
    } catch (error) {
      console.error('Error fetching server stats:', error);
      return [];
    }
  },

  /**
   * Récupère les statistiques de temps de jeu
   * @returns {Promise<Object>} Statistiques de temps de jeu
   */
  getPlaytimeStats: async () => {
    try {
      const response = await apiClient.get('/stats/playtime');
      return response || { stats: {} };
    } catch (error) {
      console.error('Error fetching playtime stats:', error);
      return { stats: {} };
    }
  }
};

export default statsService;
