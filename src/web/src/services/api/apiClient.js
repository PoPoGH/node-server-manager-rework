/**
 * API Client - Gère toutes les requêtes vers l'API NSMR
 */

// Configuration de base
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Fonction pour récupérer l'URL de base de l'API
const getBaseUrl = () => API_BASE_URL;

/**
 * Effectue une requête HTTP vers l'API
 * @param {string} endpoint - Chemin de l'API après /api (ex: /servers)
 * @param {Object} options - Options fetch (méthode, corps, en-têtes)
 * @returns {Promise<any>} Résultat de la requête
 */
async function request(endpoint, options = {}) {
  // Préparation des en-têtes par défaut
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  // Ajout du token d'authentification s'il existe (avec compatibilité pour les deux noms de storage)
  const token = localStorage.getItem('auth_token') || localStorage.getItem('nsm_token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    // Debugging token
    console.log(`Auth token used for request to ${endpoint}:`, token.substring(0, 20) + '...');
  } else {
    console.warn(`No auth token found for request to ${endpoint}`);
  }
  // Construction de l'URL complète
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Debug logging
  console.log(`API Request: ${options.method || 'GET'} ${url}`, { 
    headers, 
    hasToken: !!token 
  });
  
  // Ajouter un timeout à la requête fetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes de timeout
  
  try {
    // Exécution de la requête avec signal d'abandon
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
      mode: 'cors' // Explicitement activer CORS
    });
    
    // Annuler le timeout car la requête s'est terminée
    clearTimeout(timeoutId);
    
    // Pour les réponses non-JSON (par exemple, 204 No Content)
    if (response.status === 204) {
      return { success: true };
    }
      // Debug log for response
    console.log(`API Response: ${response.status} ${response.statusText} from ${endpoint}`);
    
    // Gestion des erreurs de parsing JSON
    let data;
    try {
      data = await response.json();
      console.log(`API Response Data:`, data);
    } catch (parseError) {
      console.warn(`Erreur de parsing JSON pour ${endpoint}:`, parseError);
      
      // Retourner un objet formaté pour les réponses non-JSON
      if (response.ok) {
        return { success: true, message: 'Opération réussie' };
      } else {
        const error = new Error(`Erreur ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.url = url;
        error.endpoint = endpoint;
        throw error;
      }
    }

    // Vérification de la réussite de la requête
    if (!response.ok) {
      // Si le statut est 401 (non authentifié), déclencher une action de déconnexion
      if (response.status === 401) {
        // Événement personnalisé pour la déconnexion
        const event = new CustomEvent('auth:logout', { detail: { expired: true } });
        window.dispatchEvent(event);
      }

      // Formater l'erreur à partir de la réponse API
      const error = new Error(data.error || data.message || 'Une erreur est survenue');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    // Annuler le timeout dans tous les cas
    clearTimeout(timeoutId);
    
    // Gestion spécifique de l'erreur d'abandon
    if (error.name === 'AbortError') {
      console.error(`Requête vers ${endpoint} abandonnée après timeout`);
      throw new Error(`La requête a pris trop de temps à s'exécuter`);
    }
    
    // Si l'erreur n'est pas déjà formatée, la formater
    if (!error.status) {
      console.error(`Erreur réseau pour ${endpoint}:`, error);
      throw new Error('Erreur de connexion au serveur');
    }
    throw error;
  }
}

// Méthodes HTTP exposées
const apiClient = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, data, options = {}) => request(endpoint, { 
    ...options, 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  put: (endpoint, data, options = {}) => request(endpoint, { 
    ...options, 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
  
  // Méthode utilitaire pour extraire directement les données (sans vérifier success: true)
  extractData: (response) => {
    if (!response || response.success === false) {
      throw new Error(response?.error || 'La réponse ne contient pas de données');
    }
    return response;
  },
  
  // Fonction pour récupérer l'URL de base de l'API
  getBaseUrl: () => API_BASE_URL
};

export { apiClient, getBaseUrl };
export default apiClient;
