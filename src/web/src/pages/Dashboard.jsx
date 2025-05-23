import { useEffect, useState } from 'react';
import { 
  Box, Grid, GridItem, Heading, Text, SimpleGrid, Button, Flex,
  Skeleton, Card, CardHeader, CardBody, Stat, StatLabel, StatNumber, 
  StatHelpText, Icon, Divider
} from '@chakra-ui/react';
import { FaServer, FaUsers, FaClock, FaSkull, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { statsService, serverService } from '../services/api';
import { useSocket } from '../contexts/SocketContext';

// Composant de carte de statistique
const StatCard = ({ title, value, icon, helpText, isLoading, iconColor = "teal.400" }) => {
  return (
    <Card 
      bg="gray.800" 
      borderRadius="xl" 
      className="zombie-card" 
      boxShadow="0 0 15px rgba(0, 255, 255, 0.1)"
      overflow="hidden"
    >
      <CardBody>
        <Flex alignItems="center" mb={3}>
          <Icon as={icon} boxSize={5} mr={2} color={iconColor} />
          <Text fontWeight="medium" color="gray.300">{title}</Text>
        </Flex>
        <Skeleton isLoaded={!isLoading} startColor="gray.700" endColor="gray.900">
          <Stat>
            <StatNumber fontSize="3xl" color="teal.300">{value}</StatNumber>
            {helpText && <StatHelpText color="gray.400">{helpText}</StatHelpText>}
          </Stat>
        </Skeleton>
      </CardBody>
    </Card>
  );
};

// Composant de carte de serveur résumée
const ServerSummaryCard = ({ server, isLoading }) => {
  return (
    <Card 
      bg="gray.800" 
      borderRadius="xl" 
      className="zombie-card" 
      boxShadow="0 0 15px rgba(0, 255, 255, 0.1)"
      overflow="hidden"
      transition="all 0.3s" 
      _hover={{ 
        transform: "translateY(-2px)", 
        boxShadow: "0 8px 20px rgba(0, 230, 230, 0.15)" 
      }}
    >
      <CardBody>
        <Skeleton isLoaded={!isLoading} startColor="gray.700" endColor="gray.900">
          <Flex justifyContent="space-between" alignItems="center" mb={2}>
            <Heading size="sm" color="teal.300">{server.name}</Heading>
            <Text 
              fontSize="sm" 
              bg={server.status === 'online' ? 'rgba(72, 187, 120, 0.2)' : 'rgba(160, 174, 192, 0.2)'} 
              color={server.status === 'online' ? '#68d391' : '#cbd5e0'} 
              px={2} 
              py={1} 
              borderRadius="md"
              border="1px solid"
              borderColor={server.status === 'online' ? 'rgba(72, 187, 120, 0.3)' : 'rgba(160, 174, 192, 0.3)'}
            >
              {server.status === 'online' ? 'En ligne' : 'Hors ligne'}
            </Text>
          </Flex>
          <Text fontSize="sm" color="gray.400" mb={2}>
            {server.game} • {server.map}
          </Text>
          <Text fontSize="sm" color="gray.300" mb={3}>
            {server.players?.length || 0} / {server.maxPlayers} joueurs
          </Text>
          <Divider mb={3} borderColor="teal.700" opacity={0.3} />
          <Flex justifyContent="flex-end">
            <Button 
              as={RouterLink} 
              to={`/servers/${server.id}`} 
              size="sm" 
              variant="ghost"
              color="teal.300"
              _hover={{ bg: "teal.900", color: "teal.200" }}
            >
              Détails
            </Button>
          </Flex>
        </Skeleton>
      </CardBody>
    </Card>
  );
};

// Composant de carte des joueurs récents
const RecentPlayersCard = ({ players, isLoading }) => {
  return (
    <Card 
      bg="gray.800" 
      borderRadius="xl" 
      className="zombie-card" 
      boxShadow="0 0 15px rgba(0, 255, 255, 0.1)"
      overflow="hidden"
    >
      <CardHeader pb={2} borderBottom="1px solid" borderColor="teal.700" bg="gray.900">
        <Heading size="md" color="teal.300">Joueurs récents</Heading>
      </CardHeader>
      <CardBody>
        <Skeleton isLoaded={!isLoading} startColor="gray.700" endColor="gray.900">
          {players && players.length > 0 ? (
            players.map(player => (
              <Flex 
                key={player.id} 
                justifyContent="space-between" 
                alignItems="center" 
                mb={2} 
                py={2} 
                px={1}
                borderRadius="md"
                _hover={{ bg: "rgba(0, 230, 230, 0.05)" }}
                transition="all 0.2s"
              >
                <Flex alignItems="center">
                  <Box 
                    w="8px" 
                    h="8px" 
                    borderRadius="full" 
                    bg={player.online ? "green.500" : "gray.500"} 
                    mr={2}
                    boxShadow={player.online ? "0 0 5px #68d391" : "none"}
                  />
                  <Text color="gray.300">{player.name}</Text>
                </Flex>
                <Button 
                  as={RouterLink} 
                  to={`/players/${player.id}`}
                  size="xs" 
                  variant="ghost"
                  color="teal.300"
                  _hover={{ bg: "teal.900", color: "teal.200" }}
                >
                  Profil
                </Button>
              </Flex>
            ))
          ) : (
            <Text color="gray.400">Aucun joueur récent</Text>
          )}
        </Skeleton>
      </CardBody>
    </Card>
  );
};

function Dashboard() {
  const { socket } = useSocket();
  const [serverEvents, setServerEvents] = useState([]);
  
  // Requête pour récupérer les statistiques générales
  const { 
    data: statsData,
    isLoading: isStatsLoading
  } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => statsService.getGeneralStats()
  });

  // Requête pour récupérer tous les serveurs
  const { 
    data: serversData,
    isLoading: isServersLoading
  } = useQuery({
    queryKey: ['dashboardServers'],
    queryFn: () => serverService.getAllServers()
  });
  
  // Écoute des événements WebSocket
  useEffect(() => {
    if (socket) {
      const handleServerEvent = (event) => {
        setServerEvents(prev => [event, ...prev].slice(0, 5));
      };
      
      socket.on('server_event', handleServerEvent);
      
      return () => {
        socket.off('server_event', handleServerEvent);
      };
    }
  }, [socket]);
  
  const stats = statsData?.stats || {};
  const servers = serversData?.servers || [];
  const recentPlayers = stats.recentPlayers || [];
  
  return (
    <Box className="fade-in" bg="gray.900" p={4} borderRadius="xl">
      <Heading as="h2" size="xl" mb={6} color="teal.300" display="flex" alignItems="center">
        <Icon as={FaServer} mr={3} color="teal.400" /> Tableau de bord
      </Heading>
      
      {/* Cartes de statistiques */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5} mb={8}>
        <StatCard 
          title="Serveurs en ligne" 
          value={stats.servers?.online || 0}
          icon={FaServer}
          helpText={`Sur ${stats.servers?.total || 0} serveurs`}
          isLoading={isStatsLoading}
        />
        <StatCard 
          title="Joueurs en ligne" 
          value={stats.players?.online || 0}
          icon={FaUsers}
          helpText={`Sur ${stats.players?.total || 0} joueurs uniques`}
          isLoading={isStatsLoading}
        />
        <StatCard 
          title="Sessions" 
          value={stats.sessions || 0}
          icon={FaClock}
          isLoading={isStatsLoading}
        />
        <StatCard 
          title="Zombies tués" 
          value={stats.zombieKills?.toLocaleString() || 0}
          icon={FaSkull}
          iconColor="red.400"
          isLoading={isStatsLoading}
        />
      </SimpleGrid>
      
      {/* Grille principale */}
      <Grid 
        templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}
        gap={6}
      >
        {/* Serveurs */}
        <GridItem colSpan={{ base: 1, lg: 2 }}>
          <Heading as="h3" size="md" mb={4} color="teal.300" display="flex" alignItems="center">
            <Icon as={FaServer} mr={2} color="teal.400" /> Aperçu des serveurs
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {isServersLoading ? (
              Array(4).fill(0).map((_, i) => (
                <ServerSummaryCard key={i} server={{}} isLoading={true} />
              ))
            ) : servers.length > 0 ? (
              servers.slice(0, 4).map(server => (
                <ServerSummaryCard key={server.id} server={server} />
              ))
            ) : (
              <Card 
                bg="gray.800" 
                borderRadius="xl" 
                className="zombie-card" 
                boxShadow="0 0 15px rgba(0, 255, 255, 0.1)"
              >
                <CardBody>
                  <Flex direction="column" align="center" justify="center" py={6}>
                    <Icon as={FaInfoCircle} boxSize={10} color="teal.400" mb={3} />
                    <Text color="gray.400">Aucun serveur configuré</Text>
                  </Flex>
                </CardBody>
              </Card>
            )}
          </SimpleGrid>
          
          {servers.length > 4 && (
            <Flex justify="center" mt={4}>
              <Button 
                as={RouterLink} 
                to="/servers"
                size="sm"
                className="btn-teal"
                borderRadius="full"
                _hover={{ bg: "rgba(0, 230, 230, 0.2)" }}
              >
                Voir tous les serveurs
              </Button>
            </Flex>
          )}
        </GridItem>
        
        {/* Sidebar droite */}
        <GridItem colSpan={1}>
          <Flex direction="column" gap={6}>
            {/* Joueurs récents */}
            <RecentPlayersCard 
              players={recentPlayers} 
              isLoading={isStatsLoading} 
            />
            
            {/* Événements récents */}
            <Card 
              bg="gray.800" 
              borderRadius="xl" 
              className="zombie-card" 
              boxShadow="0 0 15px rgba(0, 255, 255, 0.1)"
              overflow="hidden"
            >
              <CardHeader pb={2} borderBottom="1px solid" borderColor="teal.700" bg="gray.900">
                <Heading size="md" color="teal.300">Événements récents</Heading>
              </CardHeader>
              <CardBody>
                {serverEvents.length > 0 ? (
                  serverEvents.map((event, index) => (
                    <Flex 
                      key={index} 
                      mb={3} 
                      alignItems="start" 
                      p={2}
                      borderRadius="md"
                      _hover={{ bg: "rgba(0, 230, 230, 0.05)" }}
                      transition="all 0.2s"
                    >
                      <Icon as={FaExclamationCircle} mr={2} mt={1} color={
                        event.type === 'connect' ? 'green.400' :
                        event.type === 'disconnect' ? 'orange.400' :
                        event.type === 'error' ? 'red.400' :
                        'teal.400'
                      } />
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" color="gray.300">
                          {event.type}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </Text>
                      </Box>
                    </Flex>
                  ))
                ) : (
                  <Text color="gray.400">Aucun événement récent</Text>
                )}
              </CardBody>
            </Card>
          </Flex>
        </GridItem>
      </Grid>
    </Box>
  );
}

export default Dashboard;
