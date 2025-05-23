/**
 * Service de gestion de l'authentification
 */
import apiClient from './apiClient';

const authService = {
  /**
   * Authentifie un utilisateur
   * @param {string} username - Nom d'utilisateur
   * @param {string} password - Mot de passe
   * @returns {Promise<Object>} Informations d'authentification
   */  login: async (username, password) => {
    try {
      const response = await apiClient.post('/auth/login', { username, password });
      
      if (response.success && response.token) {
        // Stockage du token (avec deux noms pour la compatibilité)
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('nsm_token', response.token);
        
        // Mise à jour des en-têtes d'autorisation pour les futures requêtes
        apiClient.defaults.headers = apiClient.defaults.headers || {};
        apiClient.defaults.headers.common = apiClient.defaults.headers.common || {};
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
        
        // Stockage des informations utilisateur
        if (response.user) {
          localStorage.setItem('auth_user', JSON.stringify(response.user));
        }
        
        return {
          success: true,
          user: response.user,
          token: response.token
        };
      }
      
      return response;
    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      return {
        success: false,
        error: error.message || 'Erreur d\'authentification'
      };
    }
  },
  /**
   * Déconnecte l'utilisateur actuel
   * @returns {Promise<boolean>} Succès de la déconnexion
   */
  logout: async () => {
    try {
      // Si une API de logout est disponible
      try {
        await apiClient.post('/auth/logout');
      } catch (error) {
        // Si l'API n'existe pas ou échoue, on continue quand même
        console.warn('API logout non disponible:', error);
      }
      
      // Suppression des données stockées (avec les deux noms pour la compatibilité)
      localStorage.removeItem('auth_token');
      localStorage.removeItem('nsm_token');
      localStorage.removeItem('auth_user');
      
      // Suppression des en-têtes d'autorisation
      delete apiClient.defaults.headers.common['Authorization'];
      
      return true;
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      return false;
    }
  },
  /**
   * Vérifie si l'utilisateur est authentifié
   * @returns {boolean} Statut d'authentification
   */
  isAuthenticated: () => {
    // Vérifier les deux noms de token pour la compatibilité
    return !!localStorage.getItem('auth_token') || !!localStorage.getItem('nsm_token');
  },

  /**
   * Récupère l'utilisateur actuel
   * @returns {Object|null} Informations utilisateur ou null
   */
  getCurrentUser: () => {
    const userJson = localStorage.getItem('auth_user');
    return userJson ? JSON.parse(userJson) : null;
  },

  /**
   * Vérifie si l'utilisateur actuel est administrateur
   * @returns {boolean} Statut administrateur
   */
  isAdmin: () => {
    const user = authService.getCurrentUser();
    return user && user.role === 'admin';
  },
  /**
   * Vérifie si le token d'authentification est valide
   * @returns {Promise<boolean>} Validité du token
   */
  validateToken: async () => {
    try {
      console.log('Validating auth token with API...');
      
      // Make sure we have headers configured for the request
      const token = localStorage.getItem('auth_token') || localStorage.getItem('nsm_token');
      if (token) {
        apiClient.defaults.headers = apiClient.defaults.headers || {};
        apiClient.defaults.headers.common = apiClient.defaults.headers.common || {};
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Call the API validation endpoint
      const response = await apiClient.get('/auth/validate');
      
      console.log('Token validation response:', response);
      
      return response && response.success === true;
    } catch (error) {
      console.warn('Token validation failed:', error);
      
      // Log more detailed error information for debugging
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.warn('Response error data:', error.response.data);
        console.warn('Response status:', error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        console.warn('No response received:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.warn('Request setup error:', error.message);
      }
      
      return false;
    }
  },
  /**
   * Rafraîchit le token d'authentification
   * @returns {Promise<boolean>} Succès du rafraîchissement
   */
  refreshToken: async () => {
    try {
      const response = await apiClient.post('/auth/refresh');
      
      if (response.success && response.token) {
        // Stockage du token (avec deux noms pour la compatibilité)
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('nsm_token', response.token);
        
        // Mise à jour des en-têtes d'autorisation pour les futures requêtes
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erreur de rafraîchissement du token:', error);
      return false;
    }
  }
};

export default authService;
