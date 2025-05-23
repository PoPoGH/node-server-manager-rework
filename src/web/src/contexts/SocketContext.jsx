import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

// Création du contexte de socket
const SocketContext = createContext();

// Hook personnalisé pour utiliser le contexte socket
export const useSocket = () => {
  return useContext(SocketContext);
};

// Fournisseur du contexte socket
export const SocketProvider = ({ socket, children }) => {
  // Si un socket est fourni directement, l'utiliser (compatibilité)
  const [socketInstance, setSocketInstance] = useState(socket);
  const [connected, setConnected] = useState(socket ? socket.connected : false);
  const [error, setError] = useState(null);
  // Créer un nouveau socket uniquement si aucun n'est fourni
  useEffect(() => {
    if (!socket) {
      console.log('Aucun socket fourni, création d\'une nouvelle connexion');
      
      // Get auth token for socket authentication
      const token = localStorage.getItem('nsm_token') || localStorage.getItem('auth_token');
      
      // Use the API URL from environment or default to current origin
      const socketUrl = import.meta.env.VITE_API_URL || '';
      
      // Socket.IO connection options
      const socketOptions = {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: token ? { token } : undefined // Add token authentication if available
      };
      
      console.log('Connecting to Socket.IO with options:', socketOptions);
      const newSocket = io(socketUrl, socketOptions);
      
      newSocket.on('connect', () => {
        console.log('Socket.IO connecté automatiquement');
        setConnected(true);
        setError(null);
      });
  
      newSocket.on('disconnect', (reason) => {
        console.log('Socket.IO déconnecté:', reason);
        setConnected(false);
      });
  
      newSocket.on('error', (err) => {
        console.error('Erreur Socket.IO:', err);
        setError(err);
      });
  
      newSocket.on('connect_error', (err) => {
        console.error('Erreur de connexion Socket.IO:', err);
        setError(err);
      });

      setSocketInstance(newSocket);

      // Nettoyage lors du démontage
      return () => {
        newSocket.disconnect();
      };
    } else {
      // Ajouter des écouteurs d'événements au socket fourni
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('error', (err) => setError(err));
      socket.on('connect_error', (err) => setError(err));
      
      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('error');
        socket.off('connect_error');
      };
    }
  }, [socket]);
  // Create logs namespace on demand
  const [logsNamespace, setLogsNamespace] = useState(null);
  
  // Function to create logs namespace
  const createLogsNamespace = () => {
    if (!socketInstance) return null;
    
    try {
      // Get base URL from the main socket
      const baseUrl = socketInstance.io ? socketInstance.io.uri : '';
      
      // Get auth token for socket authentication
      const token = localStorage.getItem('nsm_token') || localStorage.getItem('auth_token');
      
      // Create namespace
      console.log('Creating logs namespace connection...');
      const namespace = io(`${baseUrl}/logs`, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: token ? { token } : undefined
      });
      
      // Set up basic event handlers
      namespace.on('connect', () => console.log('Logs namespace connected'));
      namespace.on('disconnect', () => console.log('Logs namespace disconnected'));
      namespace.on('connect_error', (err) => console.error('Logs namespace connection error:', err));
      
      setLogsNamespace(namespace);
      return namespace;
    } catch (error) {
      console.error('Error creating logs namespace:', error);
      return null;
    }
  };
  
  // Valeur du contexte avec statut
  const socketContext = {
    socket: socketInstance,
    connected,
    error,
    // Fonction utilitaire pour obtenir ou créer un namespace logs
    getLogsNamespace: () => {
      // Return existing namespace if available
      if (logsNamespace) return logsNamespace;
      
      // Create new namespace if needed
      return createLogsNamespace();
    }
  };

  return (
    <SocketContext.Provider value={socketContext}>
      {children}
    </SocketContext.Provider>
  );
};
