/**
 * ZombiesMatchHistory Component
 * Displays zombies match history and map statistics
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Heading, Tabs, TabList, Tab, TabPanels, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Spinner,
  Flex, Text, Card, CardBody, CardHeader, Grid, GridItem,
  Input, InputGroup, InputLeftElement, Select, Button,
  useToast, Icon, HStack, Tag, Stat, StatLabel, StatNumber,
  StatHelpText, Tooltip, Divider, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Tfoot
} from '@chakra-ui/react';
import {
  FaSearch, FaChevronLeft, FaChevronRight, FaClock,
  FaUsers, FaTrophy, FaMedal, FaMapMarked, FaCalendar,
  FaInfo, FaListOl, FaSortAlphaDown, FaSortAlphaUp
} from 'react-icons/fa';
import { zombiesStatsService } from '../../services/api';
import { formatDistanceToNow, format, formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Component for displaying zombies match history and statistics by map
 */
const ZombiesMatchHistoryComponent = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [mapStats, setMapStats] = useState([]);
  const [mapFilter, setMapFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 0,
    limit: 10,
    totalPages: 0,
  });
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const toast = useToast();
  // Load match history
  const fetchMatchHistory = async (page = 0, map = mapFilter) => {
    try {
      setIsLoading(true);
      const response = await zombiesStatsService.getMatchHistory(10, page, map || null);
      
      // Debug les données reçues
      console.log("Matches récupérés:", response.matches);
      
      // Vérifier les noms de joueurs
      if (response.matches && response.matches.length > 0) {
        response.matches.forEach(match => {
          console.log(`Match ${match.id}, joueurs: ${match.player_names || 'Aucun'}, players array:`, match.players);
        });
      }
      
      setMatches(response.matches || []);
      setPagination(response.pagination || { total: 0, page: 0, limit: 10, totalPages: 0 });
      setCurrentPage(page);
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible de récupérer l'historique des parties: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true
      });
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load map statistics
  const fetchMapStats = async () => {
    try {
      setIsLoading(true);
      const response = await zombiesStatsService.getMapStats();
      setMapStats(response.mapStats || []);
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible de récupérer les statistiques par carte: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true
      });
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data loading
  useEffect(() => {
    const loadData = async () => {
      try {
        if (activeTab === 0) {
          await fetchMatchHistory();
        } else {
          await fetchMapStats();
        }
      } catch (error) {
        setError(error.message);
      }
    };
    
    loadData();
  }, [activeTab]);

  // Handle tab change
  const handleTabChange = (index) => {
    setActiveTab(index);
  };

  // Handle filter change
  const handleMapFilterChange = (e) => {
    setMapFilter(e.target.value);
  };
  
  // Apply filters
  const applyFilters = () => {
    fetchMatchHistory(0, mapFilter);
  };
  
  // Reset filters
  const resetFilters = () => {
    setMapFilter('');
    fetchMatchHistory(0, null);
  };
  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < pagination.totalPages) {
      fetchMatchHistory(newPage);
    }
  };
  
  // Show match details
  const showMatchDetails = (match) => {
    setSelectedMatch(match);
    setShowMatchModal(true);
  };
  
  // Close modal
  const closeMatchModal = () => {
    setShowMatchModal(false);
  };

  // Format time duration
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return 'Date invalide';
    }
  };

  // Get readable map name
  const getReadableMapName = (mapName) => {
    const mapNames = {
      'zm_tomb': 'Origins',
      'zm_buried': 'Buried',
      'zm_prison': 'Mob of the Dead',
      'zm_nuked': 'Nuketown',
      'zm_highrise': 'Die Rise',
      'zm_transit': 'TranZit',
      'zm_town': 'Town',
      'zm_farm': 'Farm',
      'zm_bus_depot': 'Bus Depot',
      // Ajoutez d'autres correspondances de noms de cartes ici
    };
    return mapNames[mapName] || mapName;
  };

  // Render match history tab
  const renderMatchHistory = () => {
    if (isLoading && matches.length === 0) {
      return <Flex justify="center" mt={10}><Spinner size="xl" /></Flex>;
    }

    if (error) {
      return <Box mt={5} p={4} bg="red.50" color="red.800" borderRadius="md">{error}</Box>;
    }

    if (matches.length === 0) {
      return <Box mt={5} p={4} bg="blue.50" color="blue.800" borderRadius="md">Aucune partie trouvée</Box>;
    }

    return (
      <>
        {/* Filtres */}
        <Flex mb={4} gap={4} direction={{ base: 'column', md: 'row' }}>
          <Box flex="1">
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <FaMapMarked color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Filtrer par carte"
                value={mapFilter}
                onChange={handleMapFilterChange}
              />
            </InputGroup>
          </Box>
          <HStack spacing={2}>
            <Button colorScheme="blue" onClick={applyFilters}>Appliquer</Button>
            <Button onClick={resetFilters}>Réinitialiser</Button>
          </HStack>
        </Flex>        {/* Tableau des parties */}
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Carte</Th>
                <Th>Joueurs</Th>
                <Th>Round</Th>
                <Th>Durée</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {matches.map((match) => (
                <Tr key={match.id} _hover={{ bg: "gray.100" }} cursor="pointer">                  <Td>
                    <Tooltip 
                      label={formatDate(match.start_time)} 
                      bg="#2D3748" 
                      color="white" 
                      hasArrow 
                      fontSize="md"
                      borderRadius="md"
                      p={2}
                      boxShadow="0 0 10px rgba(0, 0, 0, 0.3)"
                      placement="top"
                    >
                      <Text>{formatDistanceToNow(new Date(match.start_time), { addSuffix: true, locale: fr })}</Text>
                    </Tooltip>
                  </Td>
                  <Td>
                    <Badge colorScheme="purple">{getReadableMapName(match.map_name)}</Badge>
                  </Td>                  <Td>
                    <Tooltip 
                      label={match.player_names || "Aucun joueur"} 
                      bg="#2D3748" 
                      color="white" 
                      hasArrow 
                      placement="top"
                      fontSize="md"
                      borderRadius="md"
                      p={2}
                      boxShadow="0 0 10px rgba(0, 0, 0, 0.3)"
                    >
                      <HStack spacing={1} flexWrap="wrap">
                        {match.player_names ? 
                          match.player_names.split(', ').slice(0, 2).map((player, idx) => (
                            <Badge key={idx} colorScheme="teal" mr={1} mb={1}>{player}</Badge>
                          ))
                        : <Badge colorScheme="red">Aucun joueur</Badge>}
                        {match.player_names && match.player_names.split(', ').length > 2 && (
                          <Badge colorScheme="purple">+{match.player_names.split(', ').length - 2}</Badge>
                        )}
                      </HStack>
                    </Tooltip>
                  </Td>
                  <Td>
                    {match.stats && match.stats.highest_round ? match.stats.highest_round : 'N/A'}
                  </Td>
                  <Td>{formatDuration(match.duration_seconds)}</Td>
                  <Td>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={() => showMatchDetails(match)}
                    >
                      Détails
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {/* Pagination */}
        <Flex justify="center" align="center" mt={6}>
          <Button
            leftIcon={<FaChevronLeft />}
            onClick={() => handlePageChange(currentPage - 1)}
            isDisabled={!pagination.hasPrevPage}
            mr={2}
          >
            Précédent
          </Button>
          <Text mx={4}>
            Page {currentPage + 1} sur {pagination.totalPages || 1}
          </Text>
          <Button
            rightIcon={<FaChevronRight />}
            onClick={() => handlePageChange(currentPage + 1)}
            isDisabled={!pagination.hasNextPage}
            ml={2}
          >
            Suivant
          </Button>
        </Flex>
      </>
    );
  };

  // Render map statistics tab
  const renderMapStatistics = () => {
    if (isLoading && mapStats.length === 0) {
      return <Flex justify="center" mt={10}><Spinner size="xl" /></Flex>;
    }

    if (error) {
      return <Box mt={5} p={4} bg="red.50" color="red.800" borderRadius="md">{error}</Box>;
    }

    if (mapStats.length === 0) {
      return <Box mt={5} p={4} bg="blue.50" color="blue.800" borderRadius="md">Aucune statistique disponible</Box>;
    }

    return (
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={6}>
        {mapStats.map((map) => (
          <GridItem key={map.map_name}>
            <Card>
              <CardHeader bg="blue.500" color="white" p={4} borderTopRadius="md">
                <Heading size="md">{getReadableMapName(map.map_name)}</Heading>
              </CardHeader>
              <CardBody>
                <Stat mb={4}>
                  <StatLabel>Parties jouées</StatLabel>
                  <StatNumber>{map.total_matches}</StatNumber>
                </Stat>
                <Divider my={3} />
                <Stat mb={4}>
                  <StatLabel>Round le plus élevé</StatLabel>
                  <StatNumber>{map.highest_round || 'N/A'}</StatNumber>
                  <StatHelpText>
                    {map.highest_round_player ? `Par ${map.highest_round_player}` : ''}
                  </StatHelpText>
                </Stat>
                <Divider my={3} />
                <Stat>
                  <StatLabel>Durée moyenne</StatLabel>
                  <StatNumber>{formatDuration(Math.round(map.avg_duration || 0))}</StatNumber>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
        ))}
      </Grid>
    );
  };
  // Render match details modal
  const renderMatchDetailsModal = () => {
    if (!selectedMatch) return null;
    
    return (
      <Modal isOpen={showMatchModal} onClose={closeMatchModal} size="xl">
        <ModalOverlay />
        <ModalContent bg="white">
          <ModalHeader>
            <Flex align="center">
              <Icon as={FaMapMarked} color="teal.500" mr={2} />
              <Text>Détails de la partie - {getReadableMapName(selectedMatch.map_name)}</Text>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody pb={6}>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={4}>
              <GridItem>
                <Card variant="outline" p={3} h="100%">
                  <Stat>
                    <StatLabel>Date</StatLabel>
                    <StatNumber fontSize="lg">{formatDate(selectedMatch.start_time)}</StatNumber>
                  </Stat>
                </Card>
              </GridItem>
              <GridItem>
                <Card variant="outline" p={3} h="100%">
                  <Stat>
                    <StatLabel>Durée</StatLabel>
                    <StatNumber fontSize="lg">{formatDuration(selectedMatch.duration_seconds)}</StatNumber>
                  </Stat>
                </Card>
              </GridItem>
              <GridItem>
                <Card variant="outline" p={3} h="100%">
                  <Stat>
                    <StatLabel>Round atteint</StatLabel>
                    <StatNumber fontSize="lg">
                      {selectedMatch.stats && selectedMatch.stats.highest_round ? selectedMatch.stats.highest_round : 'N/A'}
                    </StatNumber>
                  </Stat>
                </Card>
              </GridItem>
              <GridItem>
                <Card variant="outline" p={3} h="100%">
                  <Stat>
                    <StatLabel>Joueurs</StatLabel>
                    <StatNumber fontSize="lg">
                      {selectedMatch.stats && selectedMatch.stats.player_stats ? selectedMatch.stats.player_stats.length : 'N/A'}
                    </StatNumber>
                  </Stat>
                </Card>
              </GridItem>
            </Grid>
            
            <Divider my={4} />
            
            <Heading size="md" mb={3}>Statistiques des joueurs</Heading>
              {selectedMatch.stats && selectedMatch.stats.player_stats && Array.isArray(selectedMatch.stats.player_stats) ? (
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Joueur</Th>
                    <Th>Kills</Th>
                    <Th>Headshots</Th>
                    <Th>Downs</Th>
                    <Th>Revives</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {selectedMatch.stats.player_stats.map((playerStat, index) => (
                    <Tr key={index}>                      <Td fontWeight="medium">
                        <Tooltip 
                          label={`GUID: ${playerStat.guid || 'Non disponible'}`}
                          bg="#2D3748" 
                          color="white"
                          hasArrow
                          borderRadius="md"
                          p={2}
                          boxShadow="0 0 10px rgba(0, 0, 0, 0.3)"
                          placement="top"
                          fontSize="md"
                        >
                          <Text>{playerStat.player || 'Inconnu'}</Text>
                        </Tooltip>
                      </Td>
                      <Td>{playerStat.stats?.Kills || 0}</Td>
                      <Td>{playerStat.stats?.Headshots || 0}</Td>
                      <Td>{playerStat.stats?.Downs || 0}</Td>
                      <Td>{playerStat.stats?.Revives || 0}</Td>
                    </Tr>
                  ))}
                </Tbody>
                <Tfoot>
                  <Tr fontWeight="bold">
                    <Td>Total</Td>
                    <Td>
                      {selectedMatch.stats.player_stats.reduce((sum, p) => sum + parseInt(p.stats?.Kills || 0), 0)}
                    </Td>
                    <Td>
                      {selectedMatch.stats.player_stats.reduce((sum, p) => sum + parseInt(p.stats?.Headshots || 0), 0)}
                    </Td>
                    <Td>
                      {selectedMatch.stats.player_stats.reduce((sum, p) => sum + parseInt(p.stats?.Downs || 0), 0)}
                    </Td>
                    <Td>
                      {selectedMatch.stats.player_stats.reduce((sum, p) => sum + parseInt(p.stats?.Revives || 0), 0)}
                    </Td>
                  </Tr>
                </Tfoot>
              </Table>
            ) : (
              <Box p={4} bg="gray.100" borderRadius="md">
                <Text>Aucune statistique détaillée disponible pour cette partie</Text>
              </Box>
            )}
          </ModalBody>
          
          <ModalFooter>
            <Button colorScheme="blue" onClick={closeMatchModal}>Fermer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  };

  return (
    <Box>
      <Heading size="lg" mb={6}>Statistiques des Parties de Zombies</Heading>

      <Tabs isFitted variant="enclosed" onChange={handleTabChange} index={activeTab}>
        <TabList mb={4}>
          <Tab _selected={{ color: 'white', bg: 'blue.500' }}>
            <HStack spacing={2}>
              <Icon as={FaListOl} />
              <Text>Historique des parties</Text>
            </HStack>
          </Tab>
          <Tab _selected={{ color: 'white', bg: 'blue.500' }}>
            <HStack spacing={2}>
              <Icon as={FaMapMarked} />
              <Text>Statistiques par carte</Text>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel>{renderMatchHistory()}</TabPanel>
          <TabPanel>{renderMapStatistics()}</TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* Modal avec les détails de la partie */}
      {renderMatchDetailsModal()}
    </Box>
  );
};

export default ZombiesMatchHistoryComponent;
