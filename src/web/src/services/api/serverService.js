/**
 * Service de gestion des serveurs de jeu
 */
import apiClient from './apiClient';

const serverService = {
  /**
   * Récupère tous les serveurs
   * @returns {Promise<Array>} Liste des serveurs
   */
  getAllServers: async () => {
    const response = await apiClient.get('/servers');
    return response.servers || [];
  },

  /**
   * Récupère un serveur par son ID
   * @param {string|number} id - ID du serveur
   * @returns {Promise<Object>} Détails du serveur
   */
  getServerById: async (id) => {
    const response = await apiClient.get(`/servers/${id}`);
    return response.server;
  },

  /**
   * Récupère le statut d'un serveur
   * @param {string|number} id - ID du serveur
   * @returns {Promise<Object>} Statut du serveur
   */
  getServerStatus: async (id) => {
    const response = await apiClient.get(`/servers/${id}/status`);
    return response;
  },

  /**
   * Récupère les joueurs connectés à un serveur
   * @param {string|number} id - ID du serveur
   * @returns {Promise<Array>} Liste des joueurs
   */
  getServerPlayers: async (id) => {
    const response = await apiClient.get(`/servers/${id}/players`);
    return response.players || [];
  },

  /**
   * Récupère les statistiques d'un serveur
   * @param {string|number} id - ID du serveur
   * @returns {Promise<Object>} Statistiques du serveur
   */
  getServerStats: async (id) => {
    const response = await apiClient.get(`/servers/${id}/stats`);
    return response;
  },

  /**
   * Récupère les logs d'un serveur
   * @param {string|number} id - ID du serveur
   * @param {string} logFile - Nom du fichier de log (default: server.log)
   * @param {number} limit - Nombre maximum de lignes à récupérer
   * @returns {Promise<string>} Contenu des logs
   */
  getServerLogs: async (id, logFile = 'server.log', limit = 100) => {
    const response = await apiClient.get(`/servers/${id}/logs?file=${logFile}&limit=${limit}`);
    return response.logs;
  },

  /**
   * Démarre un serveur
   * @param {string|number} id - ID du serveur
   * @returns {Promise<Object>} Résultat de l'opération
   */
  startServer: async (id) => {
    return await apiClient.post(`/servers/${id}/start`);
  },

  /**
   * Arrête un serveur
   * @param {string|number} id - ID du serveur
   * @returns {Promise<Object>} Résultat de l'opération
   */
  stopServer: async (id) => {
    return await apiClient.post(`/servers/${id}/stop`);
  },

  /**
   * Redémarre un serveur
   * @param {string|number} id - ID du serveur
   * @returns {Promise<Object>} Résultat de l'opération
   */
  restartServer: async (id) => {
    return await apiClient.post(`/servers/${id}/restart`);
  },

  /**
   * Crée ou modifie un serveur
   * @param {Object} serverData - Données du serveur
   * @returns {Promise<Object>} Serveur créé ou modifié
   */
  saveServer: async (serverData) => {
    if (serverData.id) {
      return await apiClient.put(`/servers/${serverData.id}`, serverData);
    } else {
      return await apiClient.post('/servers', serverData);
    }
  },

  /**
   * Supprime un serveur
   * @param {string|number} id - ID du serveur
   * @returns {Promise<Object>} Résultat de l'opération
   */
  deleteServer: async (id) => {
    return await apiClient.delete(`/servers/${id}`);
  },

  /**
   * Envoie une commande à un serveur
   * @param {string|number} id - ID du serveur
   * @param {string} command - Commande à exécuter
   * @returns {Promise<Object>} Résultat de l'exécution de la commande
   */
  sendCommand: async (id, command) => {
    return await apiClient.post(`/servers/${id}/command`, { command });
  }
};

export default serverService;
