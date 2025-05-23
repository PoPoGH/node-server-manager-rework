/**
 * Service de gestion des événements
 */
import apiClient from './apiClient';

const eventService = {
  /**
   * Récupère les événements récents
   * @param {Object} options - Options de filtrage
   * @returns {Promise<Array>} Liste des événements
   */
  getRecentEvents: async (options = {}) => {
    const queryParams = new URLSearchParams();
    
    if (options.limit) queryParams.append('limit', options.limit);
    if (options.offset) queryParams.append('offset', options.offset);
    if (options.type) queryParams.append('type', options.type);
    if (options.serverId) queryParams.append('serverId', options.serverId);
    if (options.enriched) queryParams.append('enriched', 'true');
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get(`/events${query}`);
    
    return response.events || [];
  },

  /**
   * Récupère un événement par son ID
   * @param {string|number} id - ID de l'événement
   * @returns {Promise<Object>} Détails de l'événement
   */
  getEventById: async (id) => {
    const response = await apiClient.get(`/events/${id}`);
    return response.event;
  },

  /**
   * Récupère les événements par type
   * @param {string} type - Type d'événement
   * @param {Object} options - Options de filtrage
   * @returns {Promise<Array>} Liste des événements
   */
  getEventsByType: async (type, options = {}) => {
    const queryParams = new URLSearchParams();
    
    if (options.limit) queryParams.append('limit', options.limit);
    if (options.offset) queryParams.append('offset', options.offset);
    if (options.serverId) queryParams.append('serverId', options.serverId);
    if (options.enriched) queryParams.append('enriched', 'true');
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get(`/events/type/${type}${query}`);
    
    return response.events || [];
  },

  /**
   * Récupère les événements pour un serveur spécifique
   * @param {string|number} serverId - ID du serveur
   * @param {Object} options - Options de filtrage
   * @returns {Promise<Array>} Liste des événements
   */
  getServerEvents: async (serverId, options = {}) => {
    const queryParams = new URLSearchParams();
    
    if (options.limit) queryParams.append('limit', options.limit);
    if (options.offset) queryParams.append('offset', options.offset);
    if (options.type) queryParams.append('type', options.type);
    if (options.enriched) queryParams.append('enriched', 'true');
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get(`/events/server/${serverId}${query}`);
    
    return response.events || [];
  },

  /**
   * Recherche des événements
   * @param {Object} filters - Filtres de recherche
   * @returns {Promise<Array>} Résultats de la recherche
   */
  searchEvents: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    
    if (filters.query) queryParams.append('q', filters.query);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.types) {
      if (Array.isArray(filters.types)) {
        filters.types.forEach(type => queryParams.append('type', type));
      } else {
        queryParams.append('type', filters.types);
      }
    }
    if (filters.serverId) queryParams.append('serverId', filters.serverId);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.offset) queryParams.append('offset', filters.offset);
    if (filters.enriched) queryParams.append('enriched', 'true');
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get(`/events/search${query}`);
    
    return response.events || [];
  },

  /**
   * Récupère les statistiques d'événements par catégorie
   * @returns {Promise<Object>} Statistiques par catégorie
   */
  getEventStatsByCategory: async () => {
    const response = await apiClient.get('/events/stats');
    return response.stats || {};
  },

  /**
   * Récupère le nombre d'événements par type
   * @returns {Promise<Object>} Nombre d'événements par type
   */
  getEventCounts: async () => {
    const response = await apiClient.get('/events/counts');
    return response.counts || {};
  }
};

export default eventService;
