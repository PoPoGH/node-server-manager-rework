import { useState, useEffect } from 'react';
import { 
  Box, Heading, Text, SimpleGrid, Card, CardBody, Button, 
  Badge, Flex, Spacer, Icon, Input, InputGroup, InputLeftElement,
  Select, HStack, useToast, Skeleton, CardHeader
} from '@chakra-ui/react';
import { FaServer, FaSearch, FaSortAmountDown, FaExclamationTriangle, FaPlus, FaUsers, FaGamepad, FaMap } from 'react-icons/fa';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { serverService } from '../services/api';
import { useSocket } from '../contexts/SocketContext';

const ServerList = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterStatus, setFilterStatus] = useState('all');
  const toast = useToast();
  const { socket } = useSocket();

  // Récupération de la liste des serveurs
  const { data: servers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['servers'],
    queryFn: serverService.getAllServers,
  });

  // Écouter les mises à jour en temps réel
  useEffect(() => {
    if (!socket) return;

    const handleServerUpdate = (updatedServer) => {
      refetch();  // Refetch all servers on update
      
      toast({
        title: 'Serveur mis à jour',
        description: `Le statut du serveur ${updatedServer.name} a changé.`,
        status: 'info',
        duration: 3000,
        isClosable: true,
        className: 'toast-info'
      });
    };

    socket.on('server:update', handleServerUpdate);
    
    return () => {
      socket.off('server:update', handleServerUpdate);
    };
  }, [socket, refetch, toast]);

  // Filtrer et trier les serveurs
  const filteredServers = servers
    .filter(server => {
      // Filtrer par recherche
      const matchesSearch = server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          server.game.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          server.map.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filtrer par statut
      const matchesStatus = filterStatus === 'all' || server.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Trier selon le critère choisi
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'players':
          return (b.currentPlayers || 0) - (a.currentPlayers || 0);
        case 'status':
          return a.status === 'online' ? -1 : 1;
        default:
          return 0;
      }
    });

  const handleStartServer = async (serverId) => {
    try {
      await serverService.startServer(serverId);
      toast({
        title: 'Serveur démarré',
        description: 'Le serveur a été démarré avec succès.',
        status: 'success',
        duration: 3000,
        isClosable: true,
        className: 'toast-success'
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de démarrer le serveur.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        className: 'toast-error'
      });
    }
  };

  const handleStopServer = async (serverId) => {
    try {
      await serverService.stopServer(serverId);
      toast({
        title: 'Serveur arrêté',
        description: 'Le serveur a été arrêté avec succès.',
        status: 'success',
        duration: 3000,
        isClosable: true,
        className: 'toast-success'
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'arrêter le serveur.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        className: 'toast-error'
      });
    }
  };

  // Afficher un message d'erreur si nécessaire
  if (isError) {
    return (
      <Box p={5} textAlign="center" className="fade-in" bg="gray.800" borderRadius="xl" borderLeft="4px solid" borderColor="red.500">
        <Icon as={FaExclamationTriangle} boxSize={10} color="red.500" mb={4} />
        <Heading size="md" mb={2} color="red.300">Erreur de chargement</Heading>
        <Text mb={4} color="gray.300">Impossible de charger la liste des serveurs.</Text>
        <Button onClick={refetch} bg="rgba(245, 101, 101, 0.2)" color="red.300" border="1px solid" borderColor="red.500" _hover={{ bg: "rgba(245, 101, 101, 0.3)" }}>
          Réessayer
        </Button>
      </Box>
    );
  }

  return (
    <Box p={5} className="fade-in" bg="gray.900" borderRadius="xl">
      <Flex align="center" mb={6} bg="gray.800" p={4} borderRadius="xl" borderLeft="4px solid" borderColor="teal.500">
        <Heading size="lg" color="teal.300">
          <Flex align="center">
            <Icon as={FaServer} mr={2} color="teal.400" />
            Liste des serveurs
          </Flex>
        </Heading>
        <Spacer />
        <Button 
          as={RouterLink} 
          to="/servers/new" 
          className="btn-teal"
          leftIcon={<FaPlus />}
          borderRadius="full"
          _hover={{ bg: "rgba(0, 230, 230, 0.2)" }}
        >
          Ajouter un serveur
        </Button>
      </Flex>

      {/* Filtres et recherche */}
      <HStack mb={6} spacing={4} bg="gray.800" p={4} borderRadius="xl" boxShadow="0 0 15px rgba(0, 255, 255, 0.1)">
        <InputGroup maxW="sm">
          <InputLeftElement pointerEvents="none">
            <Icon as={FaSearch} color="teal.400" />
          </InputLeftElement>
          <Input 
            placeholder="Rechercher par nom, jeu ou carte..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            bg="gray.900"
            border="1px solid"
            borderColor="teal.700"
            color="gray.200"
            _hover={{ borderColor: "teal.500" }}
            _focus={{ borderColor: "teal.400", boxShadow: "0 0 0 2px rgba(0, 255, 255, 0.2)" }}
          />
        </InputGroup>

        <Select 
          maxW="xs" 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          icon={<FaSortAmountDown />}
          bg="gray.900"
          border="1px solid"
          borderColor="teal.700"
          color="gray.200"
          _hover={{ borderColor: "teal.500" }}
          _focus={{ borderColor: "teal.400", boxShadow: "0 0 0 2px rgba(0, 255, 255, 0.2)" }}
        >
          <option value="name">Trier par nom</option>
          <option value="players">Trier par joueurs</option>
          <option value="status">Trier par état</option>
        </Select>

        <Select 
          maxW="xs" 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          bg="gray.900"
          border="1px solid"
          borderColor="teal.700"
          color="gray.200"
          _hover={{ borderColor: "teal.500" }}
          _focus={{ borderColor: "teal.400", boxShadow: "0 0 0 2px rgba(0, 255, 255, 0.2)" }}
        >
          <option value="all">Tous les statuts</option>
          <option value="online">En ligne</option>
          <option value="offline">Hors ligne</option>
        </Select>
      </HStack>

      {/* Liste des serveurs */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {isLoading ? (
          // Skeletons pour le chargement
          Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} height="200px" borderRadius="md" startColor="gray.700" endColor="gray.900" />
          ))
        ) : filteredServers.length === 0 ? (
          // Message si aucun résultat
          <Box gridColumn="span 3" textAlign="center" py={10} bg="gray.800" borderRadius="xl">
            <Icon as={FaSearch} boxSize={10} color="teal.400" mb={3} />
            <Text fontSize="lg" color="gray.300">Aucun serveur ne correspond à votre recherche.</Text>
          </Box>
        ) : (
          // Liste des serveurs
          filteredServers.map(server => (
            <Card 
              key={server.id} 
              className="zombie-card" 
              bg="gray.800"
              borderRadius="xl"
              boxShadow="0 0 15px rgba(0, 255, 255, 0.1)"
              overflow="hidden"
              transition="all 0.3s"
              _hover={{ 
                transform: "translateY(-2px)", 
                boxShadow: "0 8px 20px rgba(0, 230, 230, 0.15)" 
              }}
            >
              <CardHeader bg="gray.900" py={3} px={4} borderBottom="1px solid" borderColor="teal.700">
                <Flex justify="space-between" align="center">
                  <Heading size="md" isTruncated color="teal.300">{server.name}</Heading>
                  <Badge 
                    className={server.status === 'online' ? 'badge-online' : 'badge-offline'}
                    px={2} py={1} borderRadius="md"
                  >
                    {server.status === 'online' ? 'En ligne' : 'Hors ligne'}
                  </Badge>
                </Flex>
              </CardHeader>
              <CardBody>
                <Flex align="center" mb={3}>
                  <Icon as={FaGamepad} color="teal.400" mr={2} />
                  <Text color="gray.300">
                    {server.game}
                  </Text>
                </Flex>
                
                <Flex align="center" mb={3}>
                  <Icon as={FaMap} color="teal.400" mr={2} />
                  <Text color="gray.300">
                    {server.map}
                  </Text>
                </Flex>
                
                <Flex align="center" mb={4}>
                  <Icon as={FaUsers} color="teal.400" mr={2} />
                  <Text color="gray.300">
                    <strong>Joueurs:</strong> {server.currentPlayers || 0}/{server.maxPlayers || 0}
                  </Text>
                </Flex>
                
                <Flex justify="space-between" mt={4}>
                  <Button 
                    as={RouterLink} 
                    to={`/servers/${server.id}`} 
                    className="btn-teal"
                    size="sm"
                    flex="1"
                    mr={2}
                    _hover={{ bg: "rgba(0, 230, 230, 0.2)" }}
                  >
                    Détails
                  </Button>
                  
                  {server.status === 'online' ? (
                    <Button 
                      bg="rgba(245, 101, 101, 0.1)"
                      color="#fc8181"
                      border="1px solid"
                      borderColor="rgba(245, 101, 101, 0.3)"
                      size="sm" 
                      flex="1"
                      ml={2}
                      _hover={{ bg: "rgba(245, 101, 101, 0.2)" }}
                      onClick={() => handleStopServer(server.id)}
                    >
                      Arrêter
                    </Button>
                  ) : (
                    <Button 
                      bg="rgba(72, 187, 120, 0.1)"
                      color="#68d391"
                      border="1px solid"
                      borderColor="rgba(72, 187, 120, 0.3)"
                      size="sm" 
                      flex="1"
                      ml={2}
                      _hover={{ bg: "rgba(72, 187, 120, 0.2)" }}
                      onClick={() => handleStartServer(server.id)}
                    >
                      Démarrer
                    </Button>
                  )}
                </Flex>
              </CardBody>
            </Card>
          ))
        )}
      </SimpleGrid>
    </Box>
  );
};

export default ServerList;
