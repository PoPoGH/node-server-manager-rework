import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Badge, Button, Flex, Spacer, Icon, Tabs, TabList,
  Tab, TabPanels, TabPanel, SimpleGrid, Card, CardBody, CardHeader,
  Divider, List, ListItem, Code, Stat, StatLabel, StatNumber, StatHelpText,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  useToast, Spinner, Grid, GridItem, HStack, Select, Textarea
} from '@chakra-ui/react';
import { 
  FaServer, FaArrowLeft, FaUsers, FaUserCog, FaTerminal,
  FaCog, FaPlay, FaStop, FaRedo, FaHistory, FaFileCode
} from 'react-icons/fa';
import { useQuery, useMutation } from '@tanstack/react-query';
import { serverService } from '../services/api';
import { useSocket } from '../contexts/SocketContext';

const ServerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { socket } = useSocket();
  const [selectedLogFile, setSelectedLogFile] = useState('server.log');
  const [consoleCommand, setConsoleCommand] = useState('');

  // Récupération des détails du serveur
  const { 
    data: server, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['server', id],
    queryFn: () => serverService.getServerById(id),
  });

  // Récupération des logs du serveur
  const {
    data: logs = '',
    isLoading: isLogsLoading,
    refetch: refetchLogs
  } = useQuery({
    queryKey: ['server-logs', id, selectedLogFile],
    queryFn: () => serverService.getServerLogs(id, selectedLogFile),
  });

  // Mutation pour démarrer le serveur
  const startServerMutation = useMutation({
    mutationFn: () => serverService.startServer(id),
    onSuccess: () => {
      toast({
        title: 'Serveur démarré',
        description: 'Le serveur a été démarré avec succès.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      refetch();
    },
    onError: (err) => {
      toast({
        title: 'Erreur',
        description: `Impossible de démarrer le serveur: ${err.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  });

  // Mutation pour arrêter le serveur
  const stopServerMutation = useMutation({
    mutationFn: () => serverService.stopServer(id),
    onSuccess: () => {
      toast({
        title: 'Serveur arrêté',
        description: 'Le serveur a été arrêté avec succès.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      refetch();
    },
    onError: (err) => {
      toast({
        title: 'Erreur',
        description: `Impossible d'arrêter le serveur: ${err.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  });

  // Mutation pour redémarrer le serveur
  const restartServerMutation = useMutation({
    mutationFn: () => serverService.restartServer(id),
    onSuccess: () => {
      toast({
        title: 'Serveur redémarré',
        description: 'Le serveur a été redémarré avec succès.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      refetch();
    },
    onError: (err) => {
      toast({
        title: 'Erreur',
        description: `Impossible de redémarrer le serveur: ${err.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  });

  // Mutation pour envoyer une commande à la console du serveur
  const sendCommandMutation = useMutation({
    mutationFn: (command) => serverService.sendServerCommand(id, command),
    onSuccess: () => {
      toast({
        title: 'Commande envoyée',
        status: 'success',
        duration: 2000,
      });
      setConsoleCommand('');
      // Refetch logs after a short delay to see the command result
      setTimeout(() => refetchLogs(), 500);
    },
    onError: (err) => {
      toast({
        title: 'Erreur',
        description: `Impossible d'envoyer la commande: ${err.message}`,
        status: 'error',
        duration: 5000,
      });
    }
  });

  // Écouter les mises à jour en temps réel
  useEffect(() => {
    if (!socket) return;

    const handleServerUpdate = (updatedServer) => {
      if (updatedServer.id === id) {
        refetch();
        refetchLogs();
      }
    };

    socket.on('server:update', handleServerUpdate);
    socket.on('server:log', () => refetchLogs());
    
    return () => {
      socket.off('server:update', handleServerUpdate);
      socket.off('server:log');
    };
  }, [socket, id, refetch, refetchLogs]);

  // Gérer l'envoi d'une commande
  const handleSendCommand = (e) => {
    e.preventDefault();
    if (!consoleCommand.trim()) return;
    
    sendCommandMutation.mutate(consoleCommand.trim());
  };

  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Chargement des détails du serveur...</Text>
      </Box>
    );
  }

  if (isError || !server) {
    return (
      <Box textAlign="center" py={10}>
        <Heading size="md" mb={4}>Erreur de chargement</Heading>
        <Text mb={4}>Impossible de charger les détails du serveur.</Text>
        <Button onClick={() => navigate('/servers')} leftIcon={<FaArrowLeft />}>
          Retour à la liste des serveurs
        </Button>
      </Box>
    );
  }

  return (
    <Box p={5}>
      {/* En-tête avec informations du serveur */}
      <Flex align="center" mb={6}>
        <Button 
          leftIcon={<FaArrowLeft />} 
          onClick={() => navigate('/servers')}
          variant="outline" 
          mr={4}
        >
          Retour
        </Button>
        
        <Heading size="lg">
          <Flex align="center">
            <Icon as={FaServer} mr={2} />
            {server.name}
          </Flex>
        </Heading>
        
        <Badge 
          ml={3}
          colorScheme={server.status === 'online' ? 'green' : 'gray'}
          fontSize="md"
          px={2}
          py={1}
        >
          {server.status === 'online' ? 'En ligne' : 'Hors ligne'}
        </Badge>
        
        <Spacer />
        
        <HStack spacing={2}>
          {server.status === 'online' ? (
            <>
              <Button
                leftIcon={<FaStop />}
                colorScheme="red"
                isLoading={stopServerMutation.isPending}
                onClick={() => stopServerMutation.mutate()}
              >
                Arrêter
              </Button>
              <Button
                leftIcon={<FaRedo />}
                colorScheme="yellow"
                isLoading={restartServerMutation.isPending}
                onClick={() => restartServerMutation.mutate()}
              >
                Redémarrer
              </Button>
            </>
          ) : (
            <Button
              leftIcon={<FaPlay />}
              colorScheme="green"
              isLoading={startServerMutation.isPending}
              onClick={() => startServerMutation.mutate()}
            >
              Démarrer
            </Button>
          )}
          <Button
            leftIcon={<FaCog />}
            colorScheme="blue"
            onClick={() => navigate(`/servers/${id}/edit`)}
          >
            Configurer
          </Button>
        </HStack>
      </Flex>

      {/* Informations détaillées avec onglets */}
      <Tabs variant="line" colorScheme="blue">
        <TabList mb={4}>
          <Tab><Icon as={FaUsers} mr={2} /> Joueurs</Tab>
          <Tab><Icon as={FaTerminal} mr={2} /> Console</Tab>
          <Tab><Icon as={FaHistory} mr={2} /> Logs</Tab>
          <Tab><Icon as={FaFileCode} mr={2} /> Configuration</Tab>
          <Tab><Icon as={FaCog} mr={2} /> Détails</Tab>
        </TabList>

        <TabPanels>
          {/* Onglet des joueurs */}
          <TabPanel>
            {server.status === 'offline' ? (
              <Box textAlign="center" py={6}>
                <Text fontSize="lg">Le serveur est hors ligne.</Text>
                <Text color="gray.500">Démarrez le serveur pour voir les joueurs connectés.</Text>
              </Box>
            ) : server.players && server.players.length > 0 ? (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                {server.players.map(player => (
                  <Card key={player.id}>
                    <CardBody>
                      <Flex justify="space-between" align="center">
                        <Text fontWeight="bold">{player.name}</Text>
                        <Badge colorScheme={player.admin ? 'purple' : 'gray'}>
                          {player.admin ? 'Admin' : 'Joueur'}
                        </Badge>
                      </Flex>
                      <Divider my={2} />
                      <Grid templateColumns="auto 1fr" gap={2}>
                        <Text>ID:</Text>
                        <Text color="gray.600">{player.id}</Text>
                        <Text>IP:</Text>
                        <Text color="gray.600">{player.ip}</Text>
                        <Text>Temps de jeu:</Text>
                        <Text color="gray.600">{player.playTime || '0h00m'}</Text>
                      </Grid>
                      <HStack mt={3} spacing={2}>
                        <Button size="sm" colorScheme="red" width="100%">Kick</Button>
                        <Button size="sm" colorScheme="orange" width="100%">Ban</Button>
                        <Button size="sm" colorScheme="blue" width="100%">Message</Button>
                      </HStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            ) : (
              <Box textAlign="center" py={6}>
                <Text fontSize="lg">Aucun joueur connecté.</Text>
              </Box>
            )}
          </TabPanel>

          {/* Onglet console */}
          <TabPanel>
            <Box mb={4}>
              <form onSubmit={handleSendCommand}>
                <Flex>
                  <Textarea
                    value={consoleCommand}
                    onChange={(e) => setConsoleCommand(e.target.value)}
                    placeholder="Entrez une commande..."
                    size="sm"
                    mr={2}
                  />
                  <Button 
                    type="submit" 
                    colorScheme="blue"
                    isLoading={sendCommandMutation.isPending}
                    isDisabled={server.status !== 'online'}
                  >
                    Envoyer
                  </Button>
                </Flex>
              </form>
            </Box>
            
            <Box 
              borderWidth={1} 
              borderRadius="md" 
              p={3} 
              bg="black" 
              color="green.400" 
              fontFamily="monospace"
              height="400px"
              overflowY="auto"
            >
              {isLogsLoading ? (
                <Spinner size="sm" />
              ) : logs ? (
                <Box whiteSpace="pre-wrap">{logs}</Box>
              ) : (
                <Text>Aucune sortie console disponible</Text>
              )}
            </Box>
          </TabPanel>

          {/* Onglet logs */}
          <TabPanel>
            <Flex mb={4}>
              <Select 
                value={selectedLogFile} 
                onChange={(e) => setSelectedLogFile(e.target.value)}
                maxWidth="300px"
              >
                <option value="server.log">server.log</option>
                <option value="error.log">error.log</option>
                <option value="admin.log">admin.log</option>
              </Select>
              <Button ml={2} onClick={refetchLogs} isLoading={isLogsLoading}>
                Rafraîchir
              </Button>
            </Flex>
            
            <Box 
              borderWidth={1} 
              borderRadius="md" 
              p={3} 
              bg="gray.900" 
              color="gray.100" 
              fontFamily="monospace"
              height="400px"
              overflowY="auto"
            >
              {isLogsLoading ? (
                <Spinner size="sm" />
              ) : logs ? (
                <Box whiteSpace="pre-wrap">{logs}</Box>
              ) : (
                <Text color="gray.400">Aucun log disponible</Text>
              )}
            </Box>
          </TabPanel>

          {/* Onglet configuration */}
          <TabPanel>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Card>
                <CardHeader>
                  <Heading size="md">Configuration du serveur</Heading>
                </CardHeader>
                <CardBody>
                  <Accordion allowToggle>
                    <AccordionItem>
                      <h2>
                        <AccordionButton>
                          <Box flex="1" textAlign="left">
                            Paramètres généraux
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                      </h2>
                      <AccordionPanel pb={4}>
                        <Grid templateColumns="1fr 2fr" gap={2}>
                          <Text fontWeight="bold">Nom:</Text>
                          <Text>{server.name}</Text>
                          <Text fontWeight="bold">Jeu:</Text>
                          <Text>{server.game}</Text>
                          <Text fontWeight="bold">Port:</Text>
                          <Text>{server.port}</Text>
                          <Text fontWeight="bold">Max. joueurs:</Text>
                          <Text>{server.maxPlayers}</Text>
                        </Grid>
                      </AccordionPanel>
                    </AccordionItem>

                    <AccordionItem>
                      <h2>
                        <AccordionButton>
                          <Box flex="1" textAlign="left">
                            Variables d'environnement
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                      </h2>
                      <AccordionPanel pb={4}>
                        <Code p={3} display="block" whiteSpace="pre">
                          {JSON.stringify(server.environment || {}, null, 2)}
                        </Code>
                      </AccordionPanel>
                    </AccordionItem>

                    <AccordionItem>
                      <h2>
                        <AccordionButton>
                          <Box flex="1" textAlign="left">
                            Fichiers de configuration
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                      </h2>
                      <AccordionPanel pb={4}>
                        <List spacing={2}>
                          {server.configFiles?.map((file, index) => (
                            <ListItem key={index}>
                              <Button variant="link" colorScheme="blue">
                                {file}
                              </Button>
                            </ListItem>
                          )) || <Text>Aucun fichier de configuration.</Text>}
                        </List>
                      </AccordionPanel>
                    </AccordionItem>
                  </Accordion>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <Heading size="md">Plugins actifs</Heading>
                </CardHeader>
                <CardBody>
                  {server.plugins && server.plugins.length > 0 ? (
                    <List spacing={2}>
                      {server.plugins.map((plugin, index) => (
                        <ListItem key={index} py={2} borderBottomWidth={index < server.plugins.length - 1 ? 1 : 0}>
                          <Flex align="center" justify="space-between">
                            <Box>
                              <Text fontWeight="bold">{plugin.name}</Text>
                              <Text fontSize="sm" color="gray.500">{plugin.description}</Text>
                            </Box>
                            <Badge colorScheme={plugin.active ? 'green' : 'gray'}>
                              {plugin.active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </Flex>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Text color="gray.500">Aucun plugin installé.</Text>
                  )}
                </CardBody>
              </Card>
            </SimpleGrid>
          </TabPanel>

          {/* Onglet détails */}
          <TabPanel>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              <Card>
                <CardBody>
                  <Heading size="sm" mb={4}>Informations</Heading>
                  <List spacing={3}>
                    <ListItem>
                      <Flex justify="space-between">
                        <Text fontWeight="semibold">ID:</Text>
                        <Text>{server.id}</Text>
                      </Flex>
                    </ListItem>
                    <ListItem>
                      <Flex justify="space-between">
                        <Text fontWeight="semibold">Type:</Text>
                        <Text>{server.type || 'Standard'}</Text>
                      </Flex>
                    </ListItem>
                    <ListItem>
                      <Flex justify="space-between">
                        <Text fontWeight="semibold">Version:</Text>
                        <Text>{server.version || 'N/A'}</Text>
                      </Flex>
                    </ListItem>
                    <ListItem>
                      <Flex justify="space-between">
                        <Text fontWeight="semibold">Uptime:</Text>
                        <Text>{server.uptime || '0h00m'}</Text>
                      </Flex>
                    </ListItem>
                    <ListItem>
                      <Flex justify="space-between">
                        <Text fontWeight="semibold">IP:</Text>
                        <Text>{server.ip || 'localhost'}</Text>
                      </Flex>
                    </ListItem>
                  </List>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <Heading size="sm" mb={4}>Performance</Heading>
                  <Stat mb={4}>
                    <StatLabel>CPU</StatLabel>
                    <StatNumber>{server.performance?.cpu || '0%'}</StatNumber>
                    <StatHelpText>Utilisation moyenne</StatHelpText>
                  </Stat>
                  <Stat mb={4}>
                    <StatLabel>RAM</StatLabel>
                    <StatNumber>{server.performance?.memory || '0 MB'}</StatNumber>
                    <StatHelpText>Utilisation mémoire</StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Disque</StatLabel>
                    <StatNumber>{server.performance?.disk || '0 MB'}</StatNumber>
                    <StatHelpText>Espace utilisé</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <Heading size="sm" mb={4}>Actions avancées</Heading>
                  <List spacing={3}>
                    <ListItem>
                      <Button colorScheme="blue" width="100%">
                        Sauvegarder le serveur
                      </Button>
                    </ListItem>
                    <ListItem>
                      <Button colorScheme="purple" width="100%">
                        Mise à jour du serveur
                      </Button>
                    </ListItem>
                    <ListItem>
                      <Button colorScheme="orange" width="100%">
                        Réparer le serveur
                      </Button>
                    </ListItem>
                    <ListItem>
                      <Button colorScheme="red" width="100%">
                        Supprimer le serveur
                      </Button>
                    </ListItem>
                  </List>
                </CardBody>
              </Card>
            </SimpleGrid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default ServerDetails;
