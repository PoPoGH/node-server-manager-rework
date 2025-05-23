import { useState } from 'react';
import {
  Box, Text, List, ListItem, Flex, Avatar, Badge, Icon,
  Input, InputGroup, InputLeftElement, Skeleton, Link,
  Button
} from '@chakra-ui/react';
import { FaSearch, FaEye, FaServer, FaCircle } from 'react-icons/fa';
import { Link as RouterLink } from 'react-router-dom';

/**
 * PlayerListCompact component
 * Displays a compact list of players with search functionality
 * 
 * @param {Array} players - The list of players to display
 * @param {boolean} isLoading - Whether the data is loading
 * @param {boolean} showServerInfo - Whether to show server information
 * @param {Function} onPlayerClick - Optional callback when a player is clicked
 */
const PlayerListCompact = ({ 
  players = [], 
  isLoading = false, 
  showServerInfo = true,
  onPlayerClick = null
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  // Utiliser des valeurs fixes adaptées au thème zombie au lieu de useColorModeValue
  const borderColor = "teal.700";
  const bgHover = "rgba(0, 230, 230, 0.05)";
  
  // Filter players based on search query
  const filteredPlayers = players.filter(player => 
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (player.guid && player.guid.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (player.id && String(player.id).includes(searchQuery))
  );
  
  const handlePlayerClick = (player) => {
    if (onPlayerClick) {
      onPlayerClick(player);
    }
  };
  
  if (isLoading) {
    return (
      <Box>
        <InputGroup mb={3}>
          <InputLeftElement pointerEvents="none">
            <Icon as={FaSearch} color="teal.400" />
          </InputLeftElement>
          <Input 
            placeholder="Search players..." 
            isDisabled 
            bg="gray.800"
            borderColor="teal.700"
          />
        </InputGroup>
        <List spacing={2}>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} height="50px" mb={2} startColor="gray.700" endColor="gray.900" />
          ))}
        </List>
      </Box>
    );
  }
  
  if (!players || players.length === 0) {
    return (
      <Box textAlign="center" py={4} color="gray.300">
        <Text>No players available</Text>
      </Box>
    );
  }
  
  return (
    <Box>
      <InputGroup mb={3}>
        <InputLeftElement pointerEvents="none">
          <Icon as={FaSearch} color="teal.400" />
        </InputLeftElement>
        <Input 
          placeholder="Search players..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          bg="gray.800"
          borderColor="teal.700"
          color="gray.200"
          _hover={{ borderColor: "teal.600" }}
          _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px #00e6e6" }}
        />
      </InputGroup>
      
      {filteredPlayers.length === 0 ? (
        <Box textAlign="center" py={4} color="gray.300">
          <Text>No players match your search</Text>
        </Box>
      ) : (
        <List spacing={1}>
          {filteredPlayers.map(player => (
            <ListItem 
              key={player.id}
              p={2}
              borderWidth="1px"
              borderRadius="md"
              borderColor={borderColor}
              bg="gray.800"
              _hover={{ bg: bgHover }}
              onClick={() => handlePlayerClick(player)}
              cursor={onPlayerClick ? 'pointer' : 'default'}
              color="gray.300"
              className="player-row"
            >
              <Flex align="center" justify="space-between">
                <Flex align="center">
                  <Box position="relative">
                    <Avatar
                      size="sm" 
                      name={player.name} 
                      mr={2}
                      bg={player.isOnline ? 'green.500' : 'gray.500'}
                    />
                    {player.isOnline && (
                      <Box 
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
                    <Text fontWeight="medium" color="gray.200">{player.name}</Text>
                    {player.isAdmin && <Badge colorScheme="purple" size="sm" mr={1}>Admin</Badge>}
                    {player.isBanned && <Badge colorScheme="red" size="sm">Banned</Badge>}
                    {showServerInfo && player.server && (
                      <Flex align="center" fontSize="xs" color="gray.500">
                        <Icon as={FaServer} mr={1} color="teal.400" />
                        <Text>{player.server}</Text>
                      </Flex>
                    )}
                  </Box>
                </Flex>
                
                <Button 
                  as={RouterLink}
                  to={`/players/${player.id}`}
                  onClick={(e) => e.stopPropagation()}
                  size="sm" 
                  leftIcon={<FaEye />} 
                  className="btn-teal"
                  _hover={{ bg: "rgba(0, 230, 230, 0.2)" }}
                >
                  View
                </Button>
              </Flex>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default PlayerListCompact;
