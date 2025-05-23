import axios from 'axios';

// Create a configured Axios instance
export const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',  // No trailing slash with our routing
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Add timeout and proxy validation
  timeout: 10000,
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Allow handling 4xx status codes in the response
  }
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(config => {
  console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, config);
  return config;
});

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  response => {
    console.log(`API Response Success: ${response.config.method.toUpperCase()} ${response.config.url}`, response);
    return response;
  },
  error => {
    console.error(`API Response Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error);
    return Promise.reject(error);
  }
);

// Récupérer le token d'authentification s'il existe
const token = localStorage.getItem('nsm_token');
if (token) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Export default axios with no baseURL for custom usage
axios.defaults.baseURL = '';  // Empty base URL to avoid duplication with proxy

if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Services pour les serveurs de jeu
export const serverService = {
  // Récupérer tous les serveurs
  getAllServers: async () => {
    try {
      const response = await apiClient.get('/servers');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des serveurs:', error);
      throw error;
    }
  },
  // Récupérer un serveur par ID
  getServerById: async (id) => {
    try {
      const response = await apiClient.get(`/servers/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du serveur ${id}:`, error);
      throw error;
    }
  },  // Démarrer un serveur
  startServer: async (id) => {
    try {
      const response = await apiClient.post(`/servers/${id}/start`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors du démarrage du serveur ${id}:`, error);
      throw error;
    }
  },
  // Arrêter un serveur
  stopServer: async (id) => {
    try {
      const response = await apiClient.post(`/servers/${id}/stop`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de l'arrêt du serveur ${id}:`, error);
      throw error;
    }
  },
  // Redémarrer un serveur
  restartServer: async (id) => {
    try {
      const response = await apiClient.post(`/servers/${id}/restart`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors du redémarrage du serveur ${id}:`, error);
      throw error;
    }
  },  // Exécuter une commande RCON sur un serveur
  executeCommand: async (id, command) => {
    try {
      const response = await apiClient.post(`/servers/${id}/command`, { command });
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la commande sur le serveur ${id}:`, error);
      throw error;
    }
  },
  // Récupérer les joueurs d'un serveur
  getServerPlayers: async (id) => {
    try {
      const response = await apiClient.get(`/servers/${id}/players`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération des joueurs du serveur ${id}:`, error);
      throw error;
    }
  }
};

// Services pour les joueurs
export const playerService = {  // Get all players (combines online and recent)
  getAllPlayers: async () => {
    try {
      // Create a function to safely fetch data with proper error handling
      const safeGet = async (endpoint) => {
        try {
          const response = await apiClient.get(endpoint);
          return response.data;
        } catch (error) {
          console.error(`Error fetching from ${endpoint}:`, error);
          return { success: false, players: [], error: error.message };
        }
      };
      
      // Get recent and online players with independent error handling
      const [recentData, onlineData] = await Promise.all([
        safeGet('/players/recent?limit=100'),
        safeGet('/players/online')
      ]);
      
      // Ensure we have valid arrays for both responses
      const recentPlayers = Array.isArray(recentData?.players) 
        ? recentData.players 
        : [];
      
      const onlinePlayers = Array.isArray(onlineData?.players)
        ? onlineData.players
        : [];
      
      console.log('Recent players data:', recentPlayers.length);
      console.log('Online players data:', onlinePlayers.length);
      
      // Create a map to combine players
      const playersMap = new Map();
      
      // Add recent players to the map
      recentPlayers.forEach(player => {
        if (player && player.id) {
          playersMap.set(player.id, {
            ...player,
            isOnline: false
          });
        }
      });
      
      // Add/update online players
      onlinePlayers.forEach(player => {
        if (player && player.id) {
          const existing = playersMap.get(player.id);
          if (existing) {
            playersMap.set(player.id, {
              ...existing,
              ...player,
              isOnline: true,
              server: player.server ? player.server.name : null
            });
          } else {
            playersMap.set(player.id, {
              ...player,
              isOnline: true,
              server: player.server ? player.server.name : null
            });
          }
        }
      });
        // Convert map back to array
      const playerArray = Array.from(playersMap.values());
      console.log(`Combined player data: ${playerArray.length} players total`);
      
      return { 
        success: true, 
        players: playerArray 
      };
    } catch (error) {
      console.error('Error retrieving players:', error);
      // Return an empty players array instead of throwing to prevent UI crashing
      return {
        success: false,
        players: [],
        error: error.message || 'Error retrieving players'
      };
    }
  },
  
  // Récupérer tous les joueurs en ligne
  getOnlinePlayers: async () => {
    try {
      const response = await apiClient.get('/players/online');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des joueurs en ligne:', error);
      throw error;
    }
  },
  // Récupérer les joueurs récents
  getRecentPlayers: async (limit = 20) => {
    try {
      const response = await apiClient.get(`/players/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des joueurs récents:', error);
      throw error;
    }
  },
  // Récupérer un joueur par ID
  getPlayerById: async (id) => {
    try {
      const response = await apiClient.get(`/players/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du joueur ${id}:`, error);
      throw error;
    }
  },  // Récupérer l'historique d'un joueur
  getPlayerHistory: async (id) => {
    try {
      const response = await apiClient.get(`/players/${id}/history`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'historique du joueur ${id}:`, error);
      throw error;
    }
  },  // Punish a player (ban, kick, etc.)
  punishPlayer: async (id, serverId, action, reason, duration = null) => {
    try {
      let endpoint;
      
      // Determine the correct endpoint based on the action
      switch (action) {
        case 'ban':
          endpoint = `/players/${id}/ban`;
          break;
        case 'unban':
          endpoint = `/players/${id}/unban`;
          break;
        case 'kick':
          endpoint = `/players/${id}/kick`;
          break;
        default:
          // Fall back to the generic punish endpoint if action is not recognized
          endpoint = `/players/${id}/punish`;
      }
      
      const response = await apiClient.post(endpoint, { 
        serverId, 
        reason, 
        duration,
        adminId: 0 // Use system ID by default
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error punishing player ${id}:`, error);
      throw error;
    }
  },
  
  // Send message to a player
  sendMessageToPlayer: async (id, message, serverId = null) => {
    try {
      const response = await apiClient.post(`/players/${id}/message`, {
        message,
        serverId
      });
      return response.data;
    } catch (error) {
      console.error(`Error sending message to player ${id}:`, error);
      throw error;
    }
  },
};

// Services pour les statistiques
export const statsService = {
  // Récupérer les statistiques générales
  getGeneralStats: async () => {
    try {
      const response = await apiClient.get('/stats/general');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques générales:', error);
      throw error;
    }
  },
  // Récupérer les statistiques zombies
  getZombieStats: async () => {
    try {
      const response = await apiClient.get('/stats/zombies');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques zombies:', error);
      throw error;
    }
  },
  // Récupérer les statistiques de temps de jeu
  getPlaytimeStats: async () => {
    try {
      const response = await apiClient.get('/stats/playtime');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques de temps de jeu:', error);
      throw error;
    }
  }
};

// Services pour l'authentification
export const authService = {
  // Connexion
  login: async (username, password) => {
    try {
      const response = await apiClient.post('/auth/login', { username, password });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      throw error;
    }
  },
  // Vérifier l'authentification
  validateAuth: async () => {
    try {
      const response = await apiClient.get('/auth/validate');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la validation de l\'authentification:', error);
      throw error;
    }
  }
};

// Services pour les statistiques zombies
export const zombiesStatsService = {
  // Récupérer le classement zombies avec options avancées
  getLeaderboard: async (sortBy = 'kills', limit = 10, page = 0, search = '', period = 'all', periodKey = null) => {
    try {
      const params = new URLSearchParams({
        sort: sortBy,
        limit,
        page,
        period
      });
      
      if (search) params.append('search', search);
      if (periodKey) params.append('periodKey', periodKey);
      const response = await apiClient.get(`/players/zombies/leaderboard?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du classement zombies:', error);
      throw error;
    }
  },
  
  // Récupérer les statistiques d'un joueur par GUID
  getPlayerStats: async (guid) => {
    try {
      const response = await apiClient.get(`/players/zombies/stats/${guid}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération des stats zombies du joueur ${guid}:`, error);
      throw error;
    }
  },
    // Récupérer les statistiques d'un joueur par ID
  getPlayerStatsById: async (playerId) => {
    try {
      const response = await apiClient.get(`/players/${playerId}/zombies`);
      
      // Ensure the response has the expected format
      const result = {
        success: response.data.success !== false,
        player: response.data.player || {},
        zombiesStats: response.data.zombiesStats || { overall: {} }
      };
      
      return result;
    } catch (error) {
      console.error(`Erreur lors de la récupération des stats zombies du joueur ID ${playerId}:`, error);
      return {
        success: false,
        player: {},
        zombiesStats: { overall: {} },
        error: error.message || "Failed to retrieve player stats"
      };
    }
  },
    // Récupérer l'historique des parties d'un joueur via les sessions
  getPlayerSessions: async (playerId, limit = 10) => {
    try {
      const response = await apiClient.get(`/players/${playerId}/sessions?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération des sessions du joueur ${playerId}:`, error);
      throw error;
    }
  },
  
  // Récupérer les meilleurs joueurs par catégorie
  getTopByCategory: async (category, limit = 5) => {
    try {
      const response = await apiClient.get(`/players/zombies/stats/top/${category}?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération des meilleurs joueurs pour ${category}:`, error);
      throw error;
    }
  },
    // Envoyer manuellement des statistiques
  submitStats: async (data) => {
    try {
      const response = await apiClient.post('/zombies/stats', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'envoi des statistiques zombies:', error);
      throw error;
    }
  },
  
  // Récupérer l'historique des parties pour tous les joueurs
  getMatchHistory: async (limit = 10, page = 0, mapFilter = null) => {
    try {
      const params = new URLSearchParams({
        limit,
        page
      });
      
      if (mapFilter) params.append('map', mapFilter);
      const response = await apiClient.get(`/players/zombies/matches?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique des parties:', error);
      throw error;
    }
  },
  
  // Récupérer les statistiques par carte
  getMapStats: async () => {
    try {
      const response = await apiClient.get('/players/zombies/mapstats');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques par carte:', error);
      throw error;
    }
  }
};
