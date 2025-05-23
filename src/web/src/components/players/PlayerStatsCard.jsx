import { useState } from 'react';
import {
  Box, Text, Stat, StatLabel, StatNumber, StatHelpText,
  SimpleGrid, Flex, Icon, Badge, Skeleton, Tooltip,
} from '@chakra-ui/react';
import { 
  FaUser, FaCalendarAlt, FaClock, FaServer, 
  FaSkull, FaMedal, FaGamepad, FaTrophy 
} from 'react-icons/fa';

/**
 * PlayerStatsCard component
 * Displays a card with player statistics
 * 
 * @param {Object} player - The player data
 * @param {boolean} isLoading - Whether the data is loading
 * @param {string} variant - Display variant ('compact' or 'full')
 */
const PlayerStatsCard = ({ player, isLoading = false, variant = 'full' }) => {
  const isCompact = variant === 'compact';
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  if (isLoading) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="gray.800" shadow="md" className="zombie-card">
        <SimpleGrid columns={isCompact ? 2 : 3} spacing={4}>
          {Array(isCompact ? 4 : 6).fill(0).map((_, i) => (
            <Skeleton key={i} height="60px" startColor="gray.700" endColor="gray.900" />
          ))}
        </SimpleGrid>
      </Box>
    );
  }
  
  if (!player) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="gray.800" shadow="md" className="zombie-card">
        <Text color="gray.400">No player data available</Text>
      </Box>
    );
  }

  const stats = player.zombieStats || {};
  
  return (
    <Box 
      p={4} 
      borderRadius="lg" 
      bg="gray.800" 
      shadow="md" 
      className="zombie-card"
      transition="all 0.3s"
    >
      <SimpleGrid columns={isCompact ? 2 : 3} spacing={4}>
        {/* Basic player statistics */}
        <Stat className="stat-container">
          <Flex align="center" mb={1}>
            <Icon as={FaUser} color="teal.400" mr={2} />
            <StatLabel color="gray.300">Status</StatLabel>
          </Flex>
          <Flex align="center">
            <Badge 
              colorScheme={player.isOnline ? 'green' : 'gray'} 
              className={player.isOnline ? 'badge-online' : 'badge-offline'}
              px={2} py={1}
            >
              {player.isOnline ? 'Online' : 'Offline'}
            </Badge>
            {player.isAdmin && (
              <Badge colorScheme="purple" ml={2} px={2} py={1}>Admin</Badge>
            )}
            {player.isBanned && (
              <Badge colorScheme="red" ml={2} px={2} py={1} className="badge-banned">Banned</Badge>
            )}
          </Flex>
          <StatHelpText color="gray.400">ID: {player.id}</StatHelpText>
        </Stat>
        
        {/* First seen date */}
        <Stat className="stat-container">
          <Flex align="center" mb={1}>
            <Icon as={FaCalendarAlt} color="teal.400" mr={2} />
            <StatLabel color="gray.300">First seen</StatLabel>
          </Flex>
          <StatNumber fontSize="md" color="teal.300">{formatDate(player.firstSeen)}</StatNumber>
          {!isCompact && (
            <StatHelpText color="gray.400">
              {player.firstSeen && new Date(player.firstSeen).toLocaleDateString() !== new Date().toLocaleDateString()
                ? `${Math.floor((new Date() - new Date(player.firstSeen)) / (1000 * 60 * 60 * 24))} days ago`
                : 'Today'
              }
            </StatHelpText>
          )}
        </Stat>
        
        {/* Play time */}
        <Stat className="stat-container">
          <Flex align="center" mb={1}>
            <Icon as={FaClock} color="teal.400" mr={2} />
            <StatLabel color="gray.300">Playtime</StatLabel>
          </Flex>
          <StatNumber fontSize="md" color="teal.300">{player.playtime || '0'}h</StatNumber>
          <StatHelpText color="gray.400">
            {player.sessions ? `${player.sessions.length} sessions` : '0 sessions'}
          </StatHelpText>
        </Stat>
        
        {/* Only show these stats in full variant or if we have zombie stats */}
        {(!isCompact || (stats && Object.keys(stats).length > 0)) && (
          <>
            {/* Server info */}
            <Stat className="stat-container">
              <Flex align="center" mb={1}>
                <Icon as={FaServer} color="teal.400" mr={2} />
                <StatLabel color="gray.300">Current server</StatLabel>
              </Flex>
              <StatNumber fontSize="md" color="teal.300">
                {player.server || 'Not connected'}
              </StatNumber>
              <StatHelpText color="gray.400">
                Last seen: {formatDate(player.lastSeen)}
              </StatHelpText>
            </Stat>
            
            {/* Zombies stats if available */}
            {stats && stats.kills > 0 && (
              <>
                <Stat className="stat-container">
                  <Flex align="center" mb={1}>
                    <Icon as={FaSkull} color="red.400" mr={2} />
                    <StatLabel color="gray.300">Zombies killed</StatLabel>
                  </Flex>
                  <StatNumber fontSize="md" color="red.400">{stats.kills || 0}</StatNumber>
                  <StatHelpText color="gray.400">
                    {stats.headshots ? `${stats.headshots} headshots` : ''}
                  </StatHelpText>
                </Stat>
                
                <Stat className="stat-container">
                  <Flex align="center" mb={1}>
                    <Icon as={FaTrophy} color="purple.400" mr={2} />
                    <StatLabel color="gray.300">Highest round</StatLabel>
                  </Flex>
                  <StatNumber fontSize="md" color="purple.400">{stats.highest_round || 0}</StatNumber>
                  <StatHelpText color="gray.400">
                    {stats.downs ? `${stats.downs} downs` : ''}
                  </StatHelpText>
                </Stat>
              </>
            )}
          </>
        )}
      </SimpleGrid>
    </Box>
  );
};

export default PlayerStatsCard;
