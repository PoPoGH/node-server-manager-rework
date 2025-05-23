// Import the apiClient that has getBaseUrl function
import apiClient, { getBaseUrl } from './api/apiClient';

export const setupService = {  updateProfile: async (updateData) => {
    try {
      // Vérifier que le token est bien défini avant d'envoyer la requête
      const token = localStorage.getItem('auth_token') || localStorage.getItem('nsm_token');
      if (!token) {
        console.error('Pas de token d\'authentification disponible pour la mise à jour du profil');
        throw new Error('Authentication token not available');
      }
      
      console.log('updateProfile: Envoi des données avec token', updateData);      // Utiliser directement fetch en spécifiant l'URL complète pour éviter les problèmes
      // Inclure le préfixe /api dans l'URL comme configuré dans AppController
      const apiUrl = `http://localhost:3001/api/auth/update-profile`;
      console.log(`Attempting direct API call to: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      console.log('updateProfile: Réponse reçue', data);
      
      if (data && data.token) {
        console.log('Nouveau token reçu, mise à jour du stockage local');
        localStorage.setItem('nsm_token', data.token);
        localStorage.setItem('auth_token', data.token);
        
        // Mettre à jour aussi les en-têtes d'apiClient si disponible
        if (apiClient && apiClient.defaults && apiClient.defaults.headers) {
          apiClient.defaults.headers.common = apiClient.defaults.headers.common || {};
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        }
        
        // Importer axios uniquement si nécessaire pour éviter l'erreur undefined
        try {
          const axios = (await import('axios')).default;
          if (axios && axios.defaults && axios.defaults.headers) {
            axios.defaults.headers.common = axios.defaults.headers.common || {};
            axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          }
        } catch (axiosError) {
          console.warn('Erreur lors de la mise à jour des en-têtes axios:', axiosError);
        }
      }
      
      return data;    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil', error);
        // Essayer avec une URL alternative si la première échoue
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        console.log('Tentative avec une URL alternative pour contourner l\'erreur réseau');
        try {
          const token = localStorage.getItem('auth_token') || localStorage.getItem('nsm_token');
          // Tentative via le proxy web server qui sera redirigé correctement
          const response = await fetch(`/api/auth/update-profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
          });
          
          if (response.ok) {
            const data = await response.json();
            return data;
          }
        } catch (fetchError) {
          console.error('Erreur lors de la tentative avec URL alternative', fetchError);
        }
      }
      
      throw error;
    }
  },updateSetupStep: async (setupStep) => {
    try {
      // Vérifier si une mise à jour récente a échoué avec 429
      const lastRateLimitTime = sessionStorage.getItem('lastRateLimitTime');
      const now = Date.now();
      
      if (lastRateLimitTime && (now - parseInt(lastRateLimitTime)) < 5000) {
        console.warn('Rate limit récent détecté, attente avant nouvelle tentative');
        return { success: false, error: 'Rate limit actif, nouvelle tentative différée' };
      }
        // Récupérer le token d'authentification
      const token = localStorage.getItem('auth_token') || localStorage.getItem('nsm_token');
      if (!token) {
        console.error('Pas de token d\'authentification disponible pour la mise à jour de l\'étape');
        throw new Error('Authentication token not available');
      }
      
      console.log(`Envoi de la nouvelle étape de configuration à l'API: ${setupStep}`);
        // Utiliser directement fetch pour éviter les problèmes avec axios et apiClient
      const apiUrl = `http://localhost:3001/api/auth/update-setup-step`;
      console.log(`Attempting direct API call to: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ setupStep })
      });
      
      const data = await response.json();
      console.log('Réponse de l\'API update-setup-step:', data);
      
      // Si la réponse contient un nouveau token, mettre à jour le stockage local
      if (data && data.success && data.token) {
        console.log('Nouveau token reçu, mise à jour du stockage local');
        localStorage.setItem('nsm_token', data.token);
        localStorage.setItem('auth_token', data.token);
        
        // Mettre à jour les en-têtes d'apiClient si disponible
        if (apiClient && apiClient.defaults && apiClient.defaults.headers) {
          apiClient.defaults.headers.common = apiClient.defaults.headers.common || {};
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        }
        
        // Mettre à jour les en-têtes d'axios si disponible
        try {
          const axios = (await import('axios')).default;
          if (axios && axios.defaults && axios.defaults.headers) {
            axios.defaults.headers.common = axios.defaults.headers.common || {};
            axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          }
        } catch (axiosError) {
          console.warn('Erreur lors de la mise à jour des en-têtes axios:', axiosError);
        }
      }
      
      return data;    } catch (error) {
      // Gérer spécifiquement les erreurs de rate limiting
      if (error.status === 429 || (error.response && error.response.status === 429)) {
        console.warn('Rate limit détecté (429), enregistrement de l\'horodatage');
        sessionStorage.setItem('lastRateLimitTime', Date.now().toString());
        return { 
          success: false, 
          error: 'Trop de requêtes. Veuillez patienter quelques instants.',
          rateLimit: true 
        };
      }      // Essayer avec une URL alternative si la première échoue
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        console.log('Tentative avec une URL alternative pour contourner l\'erreur réseau');
        try {
          const token = localStorage.getItem('auth_token') || localStorage.getItem('nsm_token');
          // Utiliser l'URL relative qui passera par le proxy du web server
          const response = await fetch(`/api/auth/update-setup-step`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ setupStep })
          });
          
          if (response.ok) {
            const data = await response.json();
            return data;
          }
        } catch (fetchError) {
          console.error('Erreur lors de la tentative avec URL alternative', fetchError);
        }
      }
      
      console.error('Erreur lors de la sauvegarde de l\'étape de configuration:', error);
      throw error;
    }
  },  generateGameToken: async () => {
    try {
      const response = await apiClient.post('/auth/generate-game-token');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la génération du token', error);
      throw error;
    }
  },  applyGameToken: async (gameToken) => {
    try {
      // Vérifier l'état du token avant de l'appliquer pour un meilleur diagnostic
      console.debug(`Tentative d'application du token: ${gameToken}`);
      
      // Récupérer le token d'authentification
      const token = localStorage.getItem('auth_token') || localStorage.getItem('nsm_token');
      if (!token) {
        console.error('Pas de token d\'authentification disponible pour appliquer le token de jeu');
        throw new Error('Authentication token not available');
      }
      
      // Tenter l'appel direct à l'API
      try {
        // Utiliser directement fetch pour éviter les problèmes avec axios et apiClient
        const apiUrl = `http://localhost:3001/auth/apply-game-token`;
        console.log(`Attempting direct API call to: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ gameToken })
        });
        
        const data = await response.json();
        console.debug('Réponse de apply-game-token (appel direct)', data);
        return data;
      } catch (firstError) {
        // Si première erreur, essayer via le proxy web server
        console.warn('Erreur sur appel direct, essai via proxy web server', firstError);
        try {
          const fallbackResponse = await fetch(`/api/auth/apply-game-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ gameToken })
          });
          
          const data = await fallbackResponse.json();
          console.debug('Réponse de apply-game-token (via proxy)', data);
          return data;
        } catch (secondError) {
          // Si les deux échouent, lancer une erreur
          console.error('Échec des deux méthodes d\'appel API', secondError);
          throw secondError;
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'application du token', error);
      console.error('Détails de l\'erreur:', JSON.stringify(error.response || error.message));
      
      // En cas d'erreur 404, on peut retourner une réponse alternative pour ne pas bloquer le processus
      if (error.response && error.response.status === 404) {
        console.warn('API 404: Retour d\'une réponse alternative pour ne pas bloquer le processus');
        return { 
          success: true, 
          message: 'Erreur 404 sur l\'API, mais le processus peut continuer',
          fallback: true
        };
      }
      
      throw error;
    }
  },  checkTokenStatus: async (gameToken) => {
    try {
      // Récupérer le token d'authentification
      const token = localStorage.getItem('auth_token') || localStorage.getItem('nsm_token');
      if (!token) {
        console.error('Pas de token d\'authentification disponible pour vérifier le statut');
        throw new Error('Authentication token not available');
      }
      
      // Utiliser directement fetch pour éviter les problèmes avec axios et apiClient
      const apiUrl = `http://localhost:3001/auth/check-token-status`;
      console.log(`Attempting direct API call to: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ gameToken })
      });
      
      const data = await response.json();
      console.debug('Réponse de check-token-status (appel direct)', data);
      return data;
    } catch (error) {
      console.error('Erreur lors de la vérification du statut du token', error);
      
      // Essayer avec une URL alternative si la première échoue
      try {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('nsm_token');
        const response = await fetch(`/api/auth/check-token-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ gameToken })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.debug('Réponse de check-token-status (via proxy)', data);
          return data;
        }
      } catch (fetchError) {
        console.error('Erreur lors de la tentative avec URL alternative', fetchError);
      }
      
      throw error;
    }
  },  testServerConnection: async (serverConfig) => {
    try {
      const response = await apiClient.post('/servers/test-connection', serverConfig);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du test de connexion', error);
      
      // Enrichir l'erreur avec des informations supplémentaires
      if (error.code === 'ECONNABORTED') {
        error.message = 'Le serveur ne répond pas (timeout). Vérifiez que votre serveur est bien démarré et accessible.';
      }
      
      throw error;
    }
  },
  saveServerConfig: async (serverConfig) => {
    try {
      const response = await apiClient.post('/servers/add', serverConfig);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la configuration', error);
      throw error;
    }
  }
};
