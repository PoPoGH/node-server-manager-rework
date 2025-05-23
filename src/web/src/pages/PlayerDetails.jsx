import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Badge, Button, Flex, Spacer, Icon, Tabs, TabList,
  Tab, TabPanels, TabPanel, SimpleGrid, Card, CardBody, Avatar,
  Divider, List, ListItem, Stat, StatLabel, StatNumber, StatHelpText,
  Grid, GridItem, useToast, Spinner, HStack, Tag, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  useDisclosure, Input, Textarea, Select
} from '@chakra-ui/react';
import { 
  FaUser, FaArrowLeft, FaGamepad, FaHistory, FaServer,
  FaBan, FaUserCog, FaCommentAlt, FaClock, FaCalendarAlt, 
  FaExclamation, FaEnvelope
} from 'react-icons/fa';
import { useQuery, useMutation } from '@tanstack/react-query';
import { playerService } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { useState } from 'react';

const PlayerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { socket } = useSocket();
  const [messageContent, setMessageContent] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('permanent');
  const { 
    isOpen: isMessageModalOpen, 
    onOpen: onMessageModalOpen, 
    onClose: onMessageModalClose 
  } = useDisclosure();
  const { 
    isOpen: isBanModalOpen, 
    onOpen: onBanModalOpen, 
    onClose: onBanModalClose 
  } = useDisclosure();

  // Récupération des détails du joueur
  const { 
    data: player, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['player', id],
    queryFn: () => playerService.getPlayerById(id),
  });

  // Récupération de l'historique du joueur
  const {
    data: history = [],
    isLoading: isHistoryLoading,
  } = useQuery({
    queryKey: ['player-history', id],
    queryFn: () => playerService.getPlayerHistory(id),
  });

  // Mutation pour envoyer un message au joueur
  const sendMessageMutation = useMutation({
    mutationFn: (message) => playerService.sendMessageToPlayer(id, message),
    onSuccess: () => {
      toast({
        title: 'Message envoyé',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setMessageContent('');
      onMessageModalClose();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible d'envoyer le message: ${error.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  });

  // Mutation pour bannir le joueur
  const banPlayerMutation = useMutation({
    mutationFn: ({ reason, duration }) => playerService.banPlayer(id, reason, duration),
    onSuccess: () => {
      toast({
        title: 'Joueur banni',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setBanReason('');
      onBanModalClose();
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de bannir le joueur: ${error.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  });

  // Mutation pour débannir un joueur
  const unbanPlayerMutation = useMutation({
    mutationFn: () => playerService.unbanPlayer(id),
    onSuccess: () => {
      toast({
        title: 'Joueur débanni',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de débannir le joueur: ${error.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  });

  // Écouter les mises à jour en temps réel
  useEffect(() => {
    if (!socket) return;

    const handlePlayerUpdate = (updatedPlayer) => {
      if (updatedPlayer.id === id) {
        refetch();
      }
    };

    socket.on('player:update', handlePlayerUpdate);
    
    return () => {
      socket.off('player:update', handlePlayerUpdate);
    };
  }, [socket, id, refetch]);

  // Gérer l'envoi d'un message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageContent.trim()) return;
    
    sendMessageMutation.mutate(messageContent.trim());
  };

  // Gérer le bannissement d'un joueur
  const handleBanPlayer = (e) => {
    e.preventDefault();
    banPlayerMutation.mutate({ 
      reason: banReason.trim(), 
      duration: banDuration 
    });
  };

  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Chargement des détails du joueur...</Text>
      </Box>
    );
  }

  if (isError || !player) {
    return (
      <Box textAlign="center" py={10}>
        <Heading size="md" mb={4}>Erreur de chargement</Heading>
        <Text mb={4}>Impossible de charger les détails du joueur.</Text>
        <Button onClick={() => navigate('/players')} leftIcon={<FaArrowLeft />}>
          Retour à la liste des joueurs
        </Button>
      </Box>
    );
  }

  return (
    <Box p={5}>
      {/* En-tête avec informations du joueur */}      <Flex align="center" mb={6} className="fade-in">
        <Button 
          leftIcon={<FaArrowLeft />} 
          onClick={() => navigate('/players')}
          variant="outline" 
          mr={4}
          borderColor="teal.700"
          color="teal.300"
          className="btn-teal"
          _hover={{ bg: "rgba(0, 230, 230, 0.1)" }}
        >
          Retour
        </Button>
        
        <Avatar 
          size="lg" 
          name={player.name} 
          src={player.avatar} 
          mr={4}
          bg="teal.700"
          borderWidth="2px"
          borderColor="teal.500"
        />
        
        <Box>
          <Heading size="lg" color="gray.100" className="text-glow">{player.name}</Heading>
          <Text color="teal.300">ID: {player.id}</Text>
        </Box>
        
        <HStack ml={4} spacing={2}>
          {player.isOnline && (
            <Badge className="badge-online" fontSize="0.8em" px={2} py={1}>
              En ligne
            </Badge>
          )}
          {player.isAdmin && (
            <Badge bg="rgba(159, 122, 234, 0.2)" color="#d6bcfa" borderWidth="1px" borderColor="rgba(159, 122, 234, 0.3)" fontSize="0.8em" px={2} py={1}>
              Admin
            </Badge>
          )}
          {player.isBanned && (
            <Badge className="badge-banned" fontSize="0.8em" px={2} py={1}>
              Banni
            </Badge>
          )}
        </HStack>
          <Spacer />
        
        <HStack spacing={2}>
          <Button
            leftIcon={<FaEnvelope className="icon-teal" />}
            className="btn-teal"
            bg="rgba(0, 230, 230, 0.1)"
            color="teal.300"
            borderWidth="1px" 
            borderColor="rgba(0, 230, 230, 0.3)"
            _hover={{ bg: "rgba(0, 230, 230, 0.2)", boxShadow: "0 0 10px rgba(0, 230, 230, 0.3)" }}
            onClick={onMessageModalOpen}
            isDisabled={!player.isOnline}
          >
            Message
          </Button>
          
          {player.isBanned ? (
            <Button
              leftIcon={<FaBan />}
              bg="rgba(72, 187, 120, 0.2)"
              color="#68d391"
              borderWidth="1px" 
              borderColor="rgba(72, 187, 120, 0.3)"
              _hover={{ bg: "rgba(72, 187, 120, 0.3)" }}
              onClick={() => unbanPlayerMutation.mutate()}
            >
              Débannir
            </Button>
          ) : (
            <Button
              leftIcon={<FaBan />}
              bg="rgba(245, 101, 101, 0.2)"
              color="#fc8181"
              borderWidth="1px" 
              borderColor="rgba(245, 101, 101, 0.3)"
              _hover={{ bg: "rgba(245, 101, 101, 0.3)" }}
              onClick={onBanModalOpen}
            >
              Bannir
            </Button>
          )}
        </HStack>
      </Flex>      {/* Informations détaillées avec onglets */}
      <Tabs variant="line" colorScheme="teal">
        <TabList mb={4} borderBottomColor="teal.700">
          <Tab 
            color="gray.400" 
            _selected={{ color: "teal.300", borderColor: "teal.300" }}
            _hover={{ color: "teal.200" }}
          >
            <Icon as={FaUser} mr={2} className="icon-teal" /> Profil
          </Tab>
          <Tab 
            color="gray.400" 
            _selected={{ color: "teal.300", borderColor: "teal.300" }} 
            _hover={{ color: "teal.200" }}
          >
            <Icon as={FaHistory} mr={2} className="icon-teal" /> Historique
          </Tab>
          <Tab 
            color="gray.400" 
            _selected={{ color: "teal.300", borderColor: "teal.300" }} 
            _hover={{ color: "teal.200" }}
          >
            <Icon as={FaGamepad} mr={2} className="icon-teal" /> Sessions
          </Tab>
          <Tab 
            color="gray.400" 
            _selected={{ color: "teal.300", borderColor: "teal.300" }} 
            _hover={{ color: "teal.200" }}
          >
            <Icon as={FaServer} mr={2} className="icon-teal" /> Serveurs
          </Tab>
        </TabList>

        <TabPanels>
          {/* Onglet profil */}          <TabPanel>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Card 
                className="zombie-card card-glow" 
                bg="gray.800" 
                borderColor="teal.700"
              >
                <CardBody>
                  <Heading size="md" mb={4} color="teal.300">Informations</Heading>
                  <Grid templateColumns="1fr 2fr" gap={3} color="gray.300">
                    <GridItem fontWeight="bold">ID:</GridItem>
                    <GridItem>{player.id}</GridItem>
                    
                    <GridItem fontWeight="bold">IP:</GridItem>
                    <GridItem>{player.ip || 'Non disponible'}</GridItem>
                    
                    <GridItem fontWeight="bold">Localisation:</GridItem>
                    <GridItem>{player.location || 'Non disponible'}</GridItem>
                    
                    <GridItem fontWeight="bold">Première connexion:</GridItem>
                    <GridItem>
                      {player.firstSeen 
                        ? new Date(player.firstSeen).toLocaleString() 
                        : 'Non disponible'}
                    </GridItem>
                    
                    <GridItem fontWeight="bold">Dernière connexion:</GridItem>
                    <GridItem>
                      {player.lastSeen 
                        ? new Date(player.lastSeen).toLocaleString() 
                        : 'Non disponible'}
                    </GridItem>
                    
                    <GridItem fontWeight="bold">Compte:</GridItem>
                    <GridItem>
                      {player.accountType || 'Standard'}
                    </GridItem>
                  </Grid>
                </CardBody>
              </Card>              <Card 
                className="zombie-card card-glow" 
                bg="gray.800" 
                borderColor="teal.700"
              >
                <CardBody>
                  <Heading size="md" mb={4} color="teal.300">Statistiques</Heading>
                  <SimpleGrid columns={2} spacing={4} color="gray.300">                    <Stat className="stat-container">
                      <StatLabel className="stat-label">Temps de jeu</StatLabel>
                      <StatNumber className="stat-value">{player.playtime || '0'}h</StatNumber>
                      <StatHelpText color="gray.500">Total</StatHelpText>
                    </Stat>
                      <Stat className="stat-container">
                      <StatLabel className="stat-label">Sessions</StatLabel>
                      <StatNumber className="stat-value">{player.sessions || 0}</StatNumber>
                      <StatHelpText color="gray.500">Total</StatHelpText>
                    </Stat>
                      <Stat className="stat-container">
                      <StatLabel className="stat-label">Kills</StatLabel>
                      <StatNumber className="stat-value">{player.stats?.kills || 0}</StatNumber>
                      <StatHelpText color="gray.500">Total</StatHelpText>
                    </Stat>
                      <Stat className="stat-container">
                      <StatLabel className="stat-label">Morts</StatLabel>
                      <StatNumber className="stat-value">{player.stats?.deaths || 0}</StatNumber>
                      <StatHelpText color="gray.500">Total</StatHelpText>
                    </Stat>
                      <Stat className="stat-container">
                      <StatLabel className="stat-label">K/D Ratio</StatLabel>
                      <StatNumber className="stat-value">
                        {player.stats?.deaths > 0 
                          ? (player.stats?.kills / player.stats?.deaths).toFixed(2) 
                          : player.stats?.kills || '0'}
                      </StatNumber>
                      <StatHelpText color="gray.500">Moyenne</StatHelpText>
                    </Stat>
                      <Stat className="stat-container">
                      <StatLabel className="stat-label">Score</StatLabel>
                      <StatNumber className="stat-value">{player.stats?.score || 0}</StatNumber>
                      <StatHelpText color="gray.500">Total</StatHelpText>
                    </Stat>
                  </SimpleGrid>
                </CardBody>
              </Card>              <Card 
                className="zombie-card card-glow" 
                bg="gray.800" 
                borderColor="teal.700"
              >
                <CardBody>
                  <Heading size="md" mb={4} color="teal.300">Notes administratives</Heading>
                  {player.notes && player.notes.length > 0 ? (
                    <List spacing={3}>
                      {player.notes.map((note, index) => (
                        <ListItem 
                          key={index} 
                          p={3} 
                          borderWidth={1} 
                          borderRadius="md" 
                          borderColor="teal.700"
                          bg="gray.900"
                          color="gray.300"
                        >
                          <Text fontWeight="bold" color="teal.300">{note.author} - {new Date(note.date).toLocaleString()}</Text>
                          <Text mt={1}>{note.content}</Text>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Text color="gray.500">Aucune note disponible.</Text>
                  )}
                  <Button 
                    className="btn-teal"
                    bg="rgba(0, 230, 230, 0.1)"
                    color="teal.300"
                    borderWidth="1px" 
                    borderColor="rgba(0, 230, 230, 0.3)"
                    _hover={{ bg: "rgba(0, 230, 230, 0.2)", boxShadow: "0 0 10px rgba(0, 230, 230, 0.3)" }}
                    mt={4} 
                    size="sm" 
                    leftIcon={<FaCommentAlt />}
                  >
                    Ajouter une note
                  </Button>
                </CardBody>
              </Card>              <Card 
                className="zombie-card card-glow" 
                bg="gray.800" 
                borderColor="teal.700"
              >
                <CardBody>
                  <Heading size="md" mb={4} color="teal.300">Sanctions</Heading>
                  {player.sanctions && player.sanctions.length > 0 ? (
                    <List spacing={3}>
                      {player.sanctions.map((sanction, index) => (
                        <ListItem 
                          key={index} 
                          p={3} 
                          borderWidth={1} 
                          borderRadius="md" 
                          borderColor={sanction.active ? "red.600" : "teal.700"}
                          bg={sanction.active ? "rgba(245, 101, 101, 0.1)" : "gray.900"}
                          color="gray.300"
                        >
                          <Flex justify="space-between" align="center">
                            <Badge bg={
                              sanction.type === 'ban' ? 'rgba(245, 101, 101, 0.2)' : 
                              sanction.type === 'kick' ? 'rgba(237, 137, 54, 0.2)' : 
                              sanction.type === 'warn' ? 'rgba(236, 201, 75, 0.2)' : 
                              'rgba(160, 174, 192, 0.2)'
                            }
                            color={
                              sanction.type === 'ban' ? '#fc8181' : 
                              sanction.type === 'kick' ? '#f6ad55' : 
                              sanction.type === 'warn' ? '#faf089' : 
                              '#cbd5e0'
                            }
                            borderWidth="1px"
                            borderColor={
                              sanction.type === 'ban' ? 'rgba(245, 101, 101, 0.3)' : 
                              sanction.type === 'kick' ? 'rgba(237, 137, 54, 0.3)' : 
                              sanction.type === 'warn' ? 'rgba(236, 201, 75, 0.3)' : 
                              'rgba(160, 174, 192, 0.3)'
                            }>
                              {sanction.type.toUpperCase()}
                            </Badge>
                            <Text fontSize="sm" color="teal.300">{new Date(sanction.date).toLocaleString()}</Text>
                          </Flex>
                          <Text mt={2} fontWeight="medium">Raison: {sanction.reason}</Text>
                          {sanction.expiry && (
                            <Text fontSize="sm" mt={1}>
                              Expiration: {new Date(sanction.expiry).toLocaleString()}
                            </Text>
                          )}
                          <Text fontSize="sm" color="gray.500" mt={1}>
                            Par: {sanction.issuedBy}
                          </Text>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Text color="gray.500">Aucune sanction.</Text>
                  )}
                </CardBody>
              </Card>
            </SimpleGrid>
          </TabPanel>

          {/* Onglet historique */}
          <TabPanel>
            {isHistoryLoading ? (
              <Spinner />
            ) : history.length === 0 ? (
              <Box textAlign="center" py={6}>
                <Text>Aucun historique disponible.</Text>
              </Box>
            ) : (              <Card 
                className="zombie-card card-glow" 
                bg="gray.800" 
                borderColor="teal.700"
              >
                <CardBody>
                  <List spacing={4}>
                    {history.map((event, index) => (
                      <ListItem 
                        key={index} 
                        py={2} 
                        borderBottomWidth={index < history.length - 1 ? 1 : 0}
                        borderBottomColor="teal.700"
                      >
                        <Flex align="center">
                          <Box 
                            p={2} 
                            borderRadius="full" 
                            bg={
                              event.type === 'connect' ? 'rgba(72, 187, 120, 0.2)' : 
                              event.type === 'disconnect' ? 'rgba(245, 101, 101, 0.2)' :
                              event.type === 'kick' ? 'rgba(237, 137, 54, 0.2)' :
                              event.type === 'ban' ? 'rgba(245, 101, 101, 0.2)' :
                              event.type === 'chat' ? 'rgba(0, 206, 209, 0.2)' :
                              'rgba(160, 174, 192, 0.2)'
                            }
                            color={
                              event.type === 'connect' ? '#68d391' : 
                              event.type === 'disconnect' ? '#fc8181' :
                              event.type === 'kick' ? '#f6ad55' :
                              event.type === 'ban' ? '#fc8181' :
                              event.type === 'chat' ? '#4fd1c5' :
                              '#cbd5e0'
                            }
                            mr={4}
                            borderWidth="1px"
                            borderColor={
                              event.type === 'connect' ? 'rgba(72, 187, 120, 0.3)' : 
                              event.type === 'disconnect' ? 'rgba(245, 101, 101, 0.3)' :
                              event.type === 'kick' ? 'rgba(237, 137, 54, 0.3)' :
                              event.type === 'ban' ? 'rgba(245, 101, 101, 0.3)' :
                              event.type === 'chat' ? 'rgba(0, 206, 209, 0.3)' :
                              'rgba(160, 174, 192, 0.3)'
                            }
                          >
                            <Icon as={
                              event.type === 'connect' ? FaUser : 
                              event.type === 'disconnect' ? FaUser :
                              event.type === 'kick' ? FaExclamation :
                              event.type === 'ban' ? FaBan :
                              event.type === 'chat' ? FaCommentAlt :
                              FaHistory
                            } />
                          </Box>
                          <Box flex="1">
                            <Flex justify="space-between" align="center">                              <Text fontWeight="bold" color="teal.300">
                                {event.type === 'connect' ? 'Connexion' : 
                                 event.type === 'disconnect' ? 'Déconnexion' :
                                 event.type === 'kick' ? 'Expulsion' :
                                 event.type === 'ban' ? 'Bannissement' :
                                 event.type === 'chat' ? 'Message' :
                                 'Événement'}
                              </Text>
                              <HStack>
                                <Icon as={FaClock} color="teal.300" className="icon-teal" />
                                <Text fontSize="sm" color="gray.400">
                                  {new Date(event.timestamp).toLocaleTimeString()}
                                </Text>
                                <Icon as={FaCalendarAlt} color="teal.300" className="icon-teal" />
                                <Text fontSize="sm" color="gray.400">
                                  {new Date(event.timestamp).toLocaleDateString()}
                                </Text>
                              </HStack>
                            </Flex>                            <Text mt={1} color="gray.300">{event.details}</Text>
                            {event.server && (
                              <Flex mt={2} align="center">
                                <Icon as={FaServer} color="teal.300" mr={1} fontSize="xs" className="icon-teal" />
                                <Text fontSize="sm" color="gray.400">{event.server}</Text>
                              </Flex>
                            )}
                          </Box>
                        </Flex>
                      </ListItem>
                    ))}
                  </List>
                </CardBody>
              </Card>
            )}
          </TabPanel>

          {/* Onglet sessions */}
          <TabPanel>
            {player.sessions && player.sessions.length > 0 ? (
              <Card>
                <CardBody>
                  <List spacing={4}>
                    {player.sessions.map((session, index) => (
                      <ListItem key={index} py={3} borderBottomWidth={index < player.sessions.length - 1 ? 1 : 0}>
                        <Grid templateColumns="1fr 3fr" gap={4}>
                          <Box>
                            <HStack spacing={2} mb={2}>
                              <Icon as={FaCalendarAlt} color="gray.500" />
                              <Text fontSize="sm" color="gray.500">
                                {new Date(session.start).toLocaleDateString()}
                              </Text>
                            </HStack>
                            <Stat>
                              <StatLabel>Durée</StatLabel>
                              <StatNumber>{session.duration}</StatNumber>
                            </Stat>
                          </Box>
                          
                          <Box>
                            <Flex justify="space-between" align="center" mb={2}>
                              <Text fontWeight="bold">
                                {new Date(session.start).toLocaleTimeString()} - {session.end ? new Date(session.end).toLocaleTimeString() : "En cours"}
                              </Text>
                              <HStack spacing={1}>
                                <Icon as={FaServer} />
                                <Text>{session.server}</Text>
                              </HStack>
                            </Flex>
                            
                            <Divider my={2} />
                            
                            <SimpleGrid columns={4} spacing={3} mt={3}>
                              <Box>
                                <Text fontSize="sm" color="gray.500">Kills</Text>
                                <Text fontWeight="bold">{session.kills || 0}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.500">Morts</Text>
                                <Text fontWeight="bold">{session.deaths || 0}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.500">K/D</Text>
                                <Text fontWeight="bold">
                                  {session.deaths > 0 
                                    ? (session.kills / session.deaths).toFixed(2) 
                                    : session.kills || '0'}
                                </Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.500">Score</Text>
                                <Text fontWeight="bold">{session.score || 0}</Text>
                              </Box>
                            </SimpleGrid>
                          </Box>
                        </Grid>
                      </ListItem>
                    ))}
                  </List>
                </CardBody>
              </Card>
            ) : (
              <Box textAlign="center" py={6}>
                <Text>Aucune session enregistrée.</Text>
              </Box>
            )}
          </TabPanel>

          {/* Onglet serveurs */}
          <TabPanel>
            {player.playerServers && player.playerServers.length > 0 ? (              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {player.playerServers.map((serverData, index) => (
                  <Card 
                    key={index}
                    className="zombie-card card-glow" 
                    bg="gray.800" 
                    borderColor="teal.700"
                  >
                    <CardBody>
                      <Heading size="sm" mb={3} color="teal.300">{serverData.name}</Heading>
                      
                      <Grid templateColumns="1fr 1fr" gap={3} mb={4}>
                        <Stat className="stat-container">
                          <StatLabel className="stat-label">Temps de jeu</StatLabel>
                          <StatNumber className="stat-value">{serverData.playtime || '0h'}</StatNumber>
                        </Stat>
                        <Stat className="stat-container">
                          <StatLabel className="stat-label">Sessions</StatLabel>
                          <StatNumber className="stat-value">{serverData.sessions || 0}</StatNumber>
                        </Stat>
                      </Grid>
                        <Divider mb={4} borderColor="teal.700" />
                      
                      <Text fontWeight="bold" mb={2} color="teal.300">Dernière session</Text>
                      <Text fontSize="sm" color="gray.300">
                        {serverData.lastSession 
                          ? new Date(serverData.lastSession).toLocaleString()
                          : 'Inconnue'}
                      </Text>
                      
                      <HStack spacing={2} mt={4}>
                        {serverData.tags.map((tag, i) => (
                          <Tag 
                            key={i} 
                            size="sm"
                            bg="rgba(0, 206, 209, 0.1)"
                            color="#4fd1c5"
                            borderWidth="1px"
                            borderColor="rgba(0, 206, 209, 0.2)"
                          >{tag}</Tag>
                        ))}
                      </HStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            ) : (
              <Box textAlign="center" py={6}>
                <Text>Aucune donnée de serveur disponible.</Text>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>      {/* Modal pour envoyer un message */}
      <Modal isOpen={isMessageModalOpen} onClose={onMessageModalClose}>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" />
        <ModalContent 
          className="zombie-modal"
          bg="gray.800"
          borderColor="teal.700"
          boxShadow="0 0 15px rgba(0, 255, 255, 0.2)"
        >
          <ModalHeader 
            className="zombie-modal-header"
            bg="gray.900"
            color="teal.300"
            borderBottomColor="teal.700"
          >
            Envoyer un message à {player.name}
          </ModalHeader>
          <ModalCloseButton color="teal.300" />
          <form onSubmit={handleSendMessage}>
            <ModalBody color="gray.200" py={4}>
              <Textarea
                placeholder="Votre message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="zombie-input"
                bg="gray.900"
                borderColor="teal.700"
                color="gray.200"
                _hover={{ borderColor: "teal.600" }}
                _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px #00e6e6" }}
              />
            </ModalBody>
            <ModalFooter 
              className="zombie-modal-footer" 
              bg="gray.900"
              borderTopColor="teal.700"
            >
              <Button 
                mr={3} 
                onClick={onMessageModalClose}
                variant="outline"
                borderColor="teal.700"
                color="gray.300"
                _hover={{ bg: "rgba(0, 230, 230, 0.05)" }}
              >
                Annuler
              </Button>
              <Button 
                className="btn-teal"
                bg="rgba(0, 230, 230, 0.1)"
                color="teal.300"
                borderWidth="1px" 
                borderColor="rgba(0, 230, 230, 0.3)"
                _hover={{ bg: "rgba(0, 230, 230, 0.2)" }}
                type="submit" 
                isLoading={sendMessageMutation.isPending}
                isDisabled={!messageContent.trim()}
              >
                Envoyer
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>      {/* Modal pour bannir un joueur */}
      <Modal isOpen={isBanModalOpen} onClose={onBanModalClose}>
        <ModalOverlay bg="rgba(0, 0, 0, 0.7)" />
        <ModalContent 
          className="zombie-modal"
          bg="gray.800"
          borderColor="teal.700"
          boxShadow="0 0 15px rgba(0, 255, 255, 0.2)"
        >
          <ModalHeader 
            className="zombie-modal-header"
            bg="gray.900"
            color="#fc8181" 
            borderBottomColor="teal.700"
          >
            Bannir {player.name}
          </ModalHeader>
          <ModalCloseButton color="teal.300" />
          <form onSubmit={handleBanPlayer}>
            <ModalBody color="gray.200" py={4}>
              <Text mb={4}>Veuillez fournir une raison et une durée pour le bannissement.</Text>
              
              <Textarea
                placeholder="Raison du bannissement..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                mb={4}
                className="zombie-input"
                bg="gray.900"
                borderColor="teal.700"
                color="gray.200"
                _hover={{ borderColor: "teal.600" }}
                _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px #00e6e6" }}
              />
              
              <Select 
                value={banDuration} 
                onChange={(e) => setBanDuration(e.target.value)}
                className="zombie-input"
                bg="gray.900"
                borderColor="teal.700"
                color="gray.200"
                _hover={{ borderColor: "teal.600" }}
                _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px #00e6e6" }}
              >
                <option value="1h">1 heure</option>
                <option value="3h">3 heures</option>
                <option value="12h">12 heures</option>
                <option value="24h">24 heures</option>
                <option value="48h">48 heures</option>
                <option value="7d">7 jours</option>
                <option value="30d">30 jours</option>
                <option value="permanent">Permanent</option>
              </Select>
            </ModalBody>
            <ModalFooter 
              className="zombie-modal-footer" 
              bg="gray.900"
              borderTopColor="teal.700"
            >
              <Button 
                mr={3} 
                onClick={onBanModalClose}
                variant="outline"
                borderColor="teal.700"
                color="gray.300"
                _hover={{ bg: "rgba(0, 230, 230, 0.05)" }}
              >
                Annuler
              </Button>
              <Button 
                bg="rgba(245, 101, 101, 0.2)"
                color="#fc8181"
                borderWidth="1px" 
                borderColor="rgba(245, 101, 101, 0.3)"
                _hover={{ bg: "rgba(245, 101, 101, 0.3)" }}
                type="submit" 
                isLoading={banPlayerMutation.isPending}
                isDisabled={!banReason.trim()}
              >
                Bannir
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default PlayerDetails;
