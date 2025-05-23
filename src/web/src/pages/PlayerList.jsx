import { useState, useEffect } from 'react';
import { 
  Box, Heading, Text, Table, Thead, Tbody, Tr, Th, Td, 
  Badge, Flex, Spacer, Icon, Input, InputGroup, InputLeftElement,
  Select, Button, HStack, useToast, Skeleton, Avatar, Tooltip,
  IconButton, Tag, TagLeftIcon,
  Tabs, TabList, Tab, TabPanels, TabPanel, AlertDialog, AlertDialogBody,
  AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay,
  useDisclosure, SimpleGrid, Card, CardHeader, CardBody, Spinner, 
  Menu, MenuButton, MenuList, MenuItem
} from '@chakra-ui/react';
import { 
  FaUsers, FaSearch, FaSortAmountDown, FaExclamationTriangle, FaUserShield,
  FaEye, FaBan, FaCommentAlt, FaEllipsisV, FaServer, FaCircle,
  FaGlobe, FaCalendarAlt, FaFilter, FaSort, FaMedal, FaClock, FaListUl,
  FaChartBar // Ajouté pour l'icône des statistiques
} from 'react-icons/fa';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playerService } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import PlayerListCompact from '../components/players/PlayerListCompact';

// Player List Content component for table view
const PlayerListContent = ({ 
  players, 
  isLoading, 
  searchQuery, 
  setSearchQuery, 
  sortBy, 
  setSortBy, 
  filterStatus, 
  setFilterStatus,
  handleViewPlayerStats,
  unbanPlayerMutation,
  setSelectedPlayer,
  onAlertOpen
}) => {
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <>
      {/* Filters and search */}
      <HStack mb={6} spacing={4} wrap="wrap">
        <InputGroup maxW={{ base: "100%", md: "sm" }} mb={{ base: 2, md: 0 }}>          <InputLeftElement pointerEvents="none">
            <Icon as={FaSearch} color="teal.400" />
          </InputLeftElement>
          <Input 
            placeholder="Search by name, ID or GUID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="zombie-input"
            bg="gray.800"
            borderColor="teal.700"
            color="gray.200"
            _hover={{ borderColor: "teal.600" }}
            _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px #00e6e6" }}
          />
        </InputGroup>        <Select 
          maxW={{ base: "100%", md: "xs" }}
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          icon={<FaSort color="teal.400" />}
          mb={{ base: 2, md: 0 }}
          className="zombie-input"
          bg="gray.800"
          borderColor="teal.700"
          color="gray.200"
          _hover={{ borderColor: "teal.600" }}
          _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px #00e6e6" }}
        >
          <option value="lastSeen">Sort by last activity</option>
          <option value="name">Sort by name</option>
          <option value="playtime">Sort by playtime</option>
        </Select>        <Select 
          maxW={{ base: "100%", md: "xs" }}
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          mb={{ base: 2, md: 0 }}
          className="zombie-input"
          bg="gray.800"
          borderColor="teal.700"
          color="gray.200"
          _hover={{ borderColor: "teal.600" }}
          _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px #00e6e6" }}
        >
          <option value="all">All players</option>
          <option value="online">Online</option>
          <option value="banned">Banned</option>
          <option value="admin">Admins</option>
        </Select>
      </HStack>

      {/* Player table */}
      {isLoading ? (
        <Skeleton height="400px" />
      ) : players.length === 0 ? (        <Box textAlign="center" py={10} bg="gray.800" borderRadius="md" borderColor="teal.700" borderWidth="1px">
          <Icon as={FaUsers} boxSize={10} color="teal.400" mb={4} />
          <Heading size="md" mb={2} color="teal.300">No players found</Heading>
          <Text color="gray.300">No players match your search criteria.</Text>
        </Box>
      ) : (        <Box overflowX="auto" borderRadius="xl" className="table-container card-glow">
          <Table variant="simple" size={{ base: "sm", md: "md" }} className="zombie-table">
            <Thead>
              <Tr>
                <Th>Player</Th>
                <Th>ID/GUID</Th>
                <Th>Server</Th>
                <Th>Last Activity</Th>
                <Th>Playtime</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {players.map(player => (                <Tr 
                  key={player.id} 
                  _hover={{ bg: "rgba(0, 230, 230, 0.05)" }}
                  cursor="pointer"
                  onClick={() => handleViewPlayerStats(player)}
                >
                  <Td>
                    <Flex align="center">
                      <Box position="relative">
                        <Avatar 
                          size="sm" 
                          name={player.name} 
                          src={player.avatar} 
                          mr={3}
                          bg={player.isOnline ? "green.500" : "gray.500"}
                        />
                        {player.isOnline && (                          <Box 
                            position="absolute"
                            bottom="0"
                            right="0"
                            width="10px"
                            height="10px"
                            bg="green.500"
                            borderRadius="full"
                            border="2px solid"
                            borderColor="gray.800"
                            boxShadow="0 0 3px rgba(72, 187, 120, 0.6)"
                          />
                        )}
                      </Box>
                      <Box>
                        <Text fontWeight={player.isOnline ? "bold" : "normal"}>
                          {player.name}
                        </Text>
                        {player.country && (
                          <Tag size="sm" variant="subtle" colorScheme="blue">
                            <TagLeftIcon as={FaGlobe} />
                            {player.country}
                          </Tag>
                        )}
                      </Box>
                    </Flex>
                  </Td>
                  <Td>
                    <Tooltip label={player.guid || "GUID not available"} placement="top">
                      <Text fontSize="sm" color="gray.600">
                        {player.id}
                      </Text>
                    </Tooltip>
                  </Td>
                  <Td>
                    {player.server ? (
                      <Flex align="center">
                        <Icon as={FaServer} mr={2} color="teal.500" />
                        <Text>{player.server}</Text>
                      </Flex>
                    ) : (
                      <Text color="gray.400">-</Text>
                    )}
                  </Td>
                  <Td>
                    <Flex align="center">
                      <Icon as={FaCalendarAlt} mr={2} color="gray.500" />
                      <Text>{formatDate(player.lastSeen)}</Text>
                    </Flex>
                  </Td>
                  <Td>
                    <Flex align="center">
                      <Icon as={FaClock} mr={2} color="orange.500" />
                      <Text>{player.playtime ? `${player.playtime}h` : '0h'}</Text>
                    </Flex>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      {player.isOnline && (
                        <Badge colorScheme="green">Online</Badge>
                      )}
                      {player.isAdmin && (
                        <Badge colorScheme="purple">Admin</Badge>
                      )}
                      {player.isBanned && (
                        <Badge colorScheme="red">Banned</Badge>
                      )}
                      {!player.isOnline && !player.isAdmin && !player.isBanned && (
                        <Badge colorScheme="gray">Offline</Badge>
                      )}
                    </HStack>
                  </Td>
                  <Td>
                    <Flex>
                      <Tooltip label="View profile" placement="top">                        <IconButton
                          as={RouterLink}
                          to={`/players/${player.id}`}
                          icon={<FaEye className="icon-teal" />}
                          aria-label="View player details"
                          size="sm"
                          mr={2}
                          className="btn-teal"
                          bg="rgba(0, 230, 230, 0.1)"
                          color="teal.300"
                          borderWidth="1px" 
                          borderColor="rgba(0, 230, 230, 0.3)"
                          _hover={{ bg: "rgba(0, 230, 230, 0.2)", boxShadow: "0 0 10px rgba(0, 230, 230, 0.3)" }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Tooltip>
                      <Menu>                        <MenuButton
                          as={IconButton}
                          icon={<FaEllipsisV color="teal.300" />}
                          variant="ghost"
                          size="sm"
                          color="teal.300"
                          _hover={{ bg: "rgba(0, 230, 230, 0.1)" }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <MenuList 
                          onClick={(e) => e.stopPropagation()} 
                          bg="gray.800" 
                          borderColor="teal.700"
                          boxShadow="0 0 10px rgba(0, 255, 255, 0.15)"
                        >                          <MenuItem 
                            icon={<FaCommentAlt color="teal.300" />}
                            isDisabled={!player.isOnline}
                            as={RouterLink}
                            to={`/players/${player.id}`}
                            _hover={{ bg: "rgba(0, 230, 230, 0.1)" }}
                            color="gray.200"
                          >
                            Send message
                          </MenuItem>
                          {player.isBanned ? (                            <MenuItem 
                              icon={<FaUserShield color="#68d391" />}
                              color="#68d391"
                              onClick={() => unbanPlayerMutation.mutate(player.id)}
                              isDisabled={unbanPlayerMutation.isPending}
                              _hover={{ bg: "rgba(72, 187, 120, 0.1)" }}
                            >
                              Unban player
                            </MenuItem>
                          ) : (                            <MenuItem 
                              icon={<FaBan color="#fc8181" />}
                              color="#fc8181"
                              onClick={() => {
                                setSelectedPlayer(player);
                                onAlertOpen();
                              }}
                              isDisabled={player.isBanned}
                              _hover={{ bg: "rgba(245, 101, 101, 0.1)" }}
                            >
                              Ban player
                            </MenuItem>
                          )}
                        </MenuList>
                      </Menu>
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </>
  );
};

const PlayerList = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('lastSeen');
  const [filterStatus, setFilterStatus] = useState('all');  const [activeTab, setActiveTab] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { socket } = useSocket();
  // Get the list of players
  const { data: playersData = { players: [] }, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['players'],
    queryFn: playerService.getAllPlayers,
    retry: 1, // Only retry once if there's an error
    onError: (err) => {
      console.error('Error fetching players:', err);
      toast({
        title: "Error loading player list",
        description: err.message || "Could not retrieve players from server",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  });

  // Listen for player updates
  useEffect(() => {
    if (!socket) return;
    
    const handlePlayerUpdate = () => {
      // Refetch player data when a player update is received
      queryClient.invalidateQueries('players');
    };
    
    socket.on('player:connect', handlePlayerUpdate);
    socket.on('player:disconnect', handlePlayerUpdate);
    socket.on('player:ban', handlePlayerUpdate);
    socket.on('player:unban', handlePlayerUpdate);
    
    return () => {
      socket.off('player:connect', handlePlayerUpdate);
      socket.off('player:disconnect', handlePlayerUpdate);
      socket.off('player:ban', handlePlayerUpdate);
      socket.off('player:unban', handlePlayerUpdate);
    };
  }, [socket, queryClient]);
  // Filter and sort players
  const players = Array.isArray(playersData?.players) ? playersData.players : [];
  
  // Log for debugging
  if (!Array.isArray(playersData?.players)) {
    console.warn('Players data is not an array:', playersData);
  }
  
  const filteredPlayers = players
    .filter(player => {
      // Safety check for player object
      if (!player) return false;
      
      // Filter by search
      const matchesSearch = 
        (player.name && player.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (player.id && String(player.id).includes(searchQuery.toLowerCase())) ||
        (player.guid && player.guid.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter by status
      const matchesStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'online' && player.isOnline) ||
        (filterStatus === 'banned' && player.isBanned) ||
        (filterStatus === 'admin' && player.isAdmin);
      
      // Filter by tab (All players, Online players, or Compact view)
      // For tabs 0 and 2 (All players and Compact view) - apply regular filters
      // For tab 1 (Online players) - only show online players
      if (activeTab === 1) return player.isOnline && matchesSearch && matchesStatus;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Sort by selected criterion
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'playtime':
          return (b.playtime || 0) - (a.playtime || 0);
        case 'lastSeen':
          return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
        default:
          return 0;
      }
    });
    
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Ban player mutation
  const banPlayerMutation = useMutation({
    mutationFn: ({ id, reason }) => playerService.punishPlayer(id, null, 'ban', reason),
    onSuccess: () => {
      toast({
        title: 'Player banned successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      queryClient.invalidateQueries('players');
      onAlertClose();
    },
    onError: (error) => {
      toast({
        title: 'Error banning player',
        description: error.message || 'Failed to ban player',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  });
  
  // Unban player mutation
  const unbanPlayerMutation = useMutation({
    mutationFn: (id) => playerService.punishPlayer(id, null, 'unban'),
    onSuccess: () => {
      toast({
        title: 'Player unbanned successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      queryClient.invalidateQueries('players');
    },
    onError: (error) => {
      toast({
        title: 'Error unbanning player',
        description: error.message || 'Failed to unban player',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  });
  
  const handleBanPlayer = () => {
    if (!selectedPlayer) return;
    banPlayerMutation.mutate({ 
      id: selectedPlayer.id, 
      reason: 'Banned from player list'
    });
  };
  // Handle player banning and navigation to details page// Handle showing player stats or navigating to player details
  const handleViewPlayerStats = (player) => {
    if (!player || !player.id) {
      console.error('Invalid player data:', player);
      toast({
        title: "Error",
        description: "Invalid player data",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
      // Navigate to player details page
    navigate(`/players/${player.id}`);
  };
  // Display error message if needed
  if (isError) {
    return (      <Box p={5} textAlign="center" bg="gray.800" borderRadius="xl" borderColor="red.600" borderWidth="1px">
        <Icon as={FaExclamationTriangle} boxSize={10} color="#fc8181" mb={4} />
        <Heading size="md" mb={2} color="gray.100">Loading Error</Heading>
        <Text mb={2} color="gray.300">Unable to load the player list.</Text>
        {error && (
          <Text color="#fc8181" fontSize="sm" mb={4}>
            Error details: {error.message || "Unknown error"}
          </Text>
        )}
        <Button 
          onClick={() => refetch()} 
          className="btn-teal"
          bg="rgba(0, 230, 230, 0.1)"
          color="teal.300"
          borderWidth="1px" 
          borderColor="rgba(0, 230, 230, 0.3)"
          _hover={{ bg: "rgba(0, 230, 230, 0.2)", boxShadow: "0 0 10px rgba(0, 230, 230, 0.3)" }}
        >
          Try Again
        </Button>
      </Box>
    );
  }
  return (
    <Box p={5} className="fade-in">
      {/* Page header */}
      <Flex align="center" mb={6}>
        <Heading size="lg" color="teal.300">
          <Flex align="center">
            <Icon as={FaUsers} mr={2} color="teal.400" />
            Players
          </Flex>
        </Heading>
        <Spacer />        <Button 
          leftIcon={<FaFilter />} 
          variant="outline"
          onClick={() => refetch()}
          className="btn-teal"
          borderRadius="full"
          px={6}
          _hover={{ bg: "rgba(0, 230, 230, 0.2)" }}
        >
          Refresh
        </Button>
      </Flex>        {/* Player Stats Card has been removed in favor of direct navigation to player details page */}
      
      {/* Tabs for quick filtering */}
      <Tabs 
        mb={6} 
        onChange={(index) => setActiveTab(index)} 
        colorScheme="teal"
      >
        <TabList>
          <Tab>All Players</Tab>
          <Tab>Online Players</Tab>
          <Tab>Compact View</Tab>
        </TabList>
        <TabPanels>          <TabPanel px={0}>
            {/* All players view */}
            <PlayerListContent 
              players={filteredPlayers}
              isLoading={isLoading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              handleViewPlayerStats={handleViewPlayerStats}
              unbanPlayerMutation={unbanPlayerMutation}
              setSelectedPlayer={setSelectedPlayer}
              onAlertOpen={onAlertOpen}
            />
          </TabPanel>          <TabPanel px={0}>
            {/* Online players view */}
            <PlayerListContent 
              players={filteredPlayers}
              isLoading={isLoading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              handleViewPlayerStats={handleViewPlayerStats}
              unbanPlayerMutation={unbanPlayerMutation}
              setSelectedPlayer={setSelectedPlayer}
              onAlertOpen={onAlertOpen}
            />
          </TabPanel>          <TabPanel px={0}>
            <Box maxW="100%" p={4} borderWidth="1px" borderRadius="lg" bg="gray.800" boxShadow="0 0 15px rgba(0, 255, 255, 0.1)" className="zombie-card">
              <PlayerListCompact 
                players={filteredPlayers} 
                isLoading={isLoading} 
                showServerInfo={true}
                onPlayerClick={handleViewPlayerStats}
              />
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
        {/* Ban player confirmation dialog */}
      <AlertDialog
        isOpen={isAlertOpen}
        onClose={onAlertClose}
        leastDestructiveRef={undefined}
      >
        <AlertDialogOverlay bg="rgba(0, 0, 0, 0.7)">
          <AlertDialogContent 
            className="zombie-modal"
            bg="gray.800"
            borderColor="teal.700"
            boxShadow="0 0 15px rgba(0, 255, 255, 0.2)"
          >
            <AlertDialogHeader 
              className="zombie-modal-header"
              bg="gray.900"
              color="#fc8181" 
              borderBottomColor="teal.700"
            >
              Ban Player
            </AlertDialogHeader>
            <AlertDialogBody color="gray.200">
              Are you sure you want to ban {selectedPlayer?.name}? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter 
              className="zombie-modal-footer" 
              bg="gray.900"
              borderTopColor="teal.700"
            >
              <Button 
                ref={undefined} 
                onClick={onAlertClose}
                variant="outline"
                borderColor="teal.700"
                color="gray.300"
                _hover={{ bg: "rgba(0, 230, 230, 0.05)" }}
              >
                Cancel
              </Button>
              <Button 
                bg="rgba(245, 101, 101, 0.2)"
                color="#fc8181"
                borderWidth="1px" 
                borderColor="rgba(245, 101, 101, 0.3)"
                _hover={{ bg: "rgba(245, 101, 101, 0.3)" }}
                ml={3} 
                onClick={handleBanPlayer}
                isLoading={banPlayerMutation.isPending}
              >
                Ban
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default PlayerList;
