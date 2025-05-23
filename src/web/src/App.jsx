import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useToast, Box } from '@chakra-ui/react';
import io from 'socket.io-client';
import './App.css';
// Import zombie theme
import './styles/zombieTheme.css';

// Layout Components
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';

// Pages
import Dashboard from './pages/Dashboard';
import ServerList from './pages/ServerList';
import ServerDetails from './pages/ServerDetails';
import PlayerList from './pages/PlayerList';
import PlayerDetails from './pages/PlayerDetails';
import StatsOverview from './pages/StatsOverview';
import ZombieStats from './pages/ZombieStats';
import Login from './pages/Login';
import InitialSetup from './pages/InitialSetup';
import NotFound from './pages/NotFound';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

// Composant de layout principal avec navigation et sidebar
function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="app-container">
      <Navbar toggleSidebar={toggleSidebar} />
      
      <div className="app-content-wrapper">
        <Sidebar isOpen={isSidebarOpen} />
        
        <main className={isSidebarOpen ? 'main-content with-sidebar' : 'main-content without-sidebar'}>
          <Box className="fade-in" p={3}>
            <Outlet />
          </Box>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}

// Route protégée qui vérifie l'authentification
function ProtectedRoute({ children }) {
  const { isAuthenticated, needsInitialSetup, currentUser } = useAuth();
  
  console.log('ProtectedRoute: vérification de l\'authentification', { 
    isAuthenticated, 
    path: window.location.pathname,
    currentUser,
    needsSetup: needsInitialSetup()
  });
  
  if (!isAuthenticated) {
    console.log('Non authentifié, redirection vers login');
    return <Navigate to="/login" replace />;
  }
  
  // Redirection vers la page de configuration initiale si nécessaire
  if (needsInitialSetup() && window.location.pathname !== '/setup') {
    console.log('Setup nécessaire, redirection vers /setup');
    return <Navigate to="/setup" replace />;
  }
  
  return children;
}

// Composant principal de l'application
function App() {
  const toast = useToast();
  
  // La gestion des sockets est maintenant entièrement assurée par le SocketProvider
    return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/setup" 
              element={
                <ProtectedRoute>
                  <InitialSetup />
                </ProtectedRoute>
              } 
            />
            
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="servers" element={<ServerList />} />
              <Route path="servers/:id" element={<ServerDetails />} />
              <Route path="players" element={<PlayerList />} />
              <Route path="players/:id" element={<PlayerDetails />} />
              <Route path="stats" element={<StatsOverview />} />
              <Route path="stats/zombies" element={<ZombieStats />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
