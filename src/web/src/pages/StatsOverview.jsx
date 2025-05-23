import { useEffect } from 'react';
import { Box, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Card, CardHeader, CardBody, Table, Thead, Tbody, Tr, Th, Td, Text, Divider } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { statsService } from '../services/api';

function StatsOverview() {
  // Requête pour récupérer les statistiques générales
  const { 
    data: generalData,
    isLoading: isGeneralLoading,
    refetch: refetchGeneral
  } = useQuery({
    queryKey: ['generalStats'],
    queryFn: () => statsService.getGeneralStats()
  });

  // Requête pour récupérer les statistiques de temps de jeu
  const { 
    data: playtimeData,
    isLoading: isPlaytimeLoading,
    refetch: refetchPlaytime
  } = useQuery({
    queryKey: ['playtimeStats'],
    queryFn: () => statsService.getPlaytimeStats()
  });
  
  // Rafraîchir automatiquement toutes les 60 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      refetchGeneral();
      refetchPlaytime();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [refetchGeneral, refetchPlaytime]);
  
  const generalStats = generalData?.stats || {};
  const playtimeStats = playtimeData?.stats || {};
  
  return (
    <Box>
      <Heading as="h2" size="xl" mb={6}>
        Statistiques Générales
      </Heading>
      
      <Tabs variant="enclosed" colorScheme="blue" isLazy>
        <TabList>
          <Tab>Vue d'ensemble</Tab>
          <Tab>Temps de jeu</Tab>
          <Tab>Serveurs</Tab>
        </TabList>
        
        <TabPanels>
          {/* Vue d'ensemble */}
          <TabPanel>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5} mb={8}>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>Joueurs Totaux</StatLabel>
                    <StatNumber>{generalStats.players?.total || 0}</StatNumber>
                    <StatHelpText>
                      {generalStats.players?.online || 0} en ligne actuellement
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
              
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>Serveurs</StatLabel>
                    <StatNumber>{generalStats.servers?.total || 0}</StatNumber>
                    <StatHelpText>
                      {generalStats.servers?.online || 0} en ligne actuellement
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
              
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>Sessions Totales</StatLabel>
                    <StatNumber>{generalStats.sessions || 0}</StatNumber>
                  </Stat>
                </CardBody>
              </Card>
              
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>Zombies Tués</StatLabel>
                    <StatNumber>{generalStats.zombieKills?.toLocaleString() || 0}</StatNumber>
                    <StatHelpText>
                      <RouterLink to="/stats/zombies">Voir les détails</RouterLink>
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            </SimpleGrid>
            
            <Card mb={8}>
              <CardHeader>
                <Heading size="md">Joueurs Récents</Heading>
              </CardHeader>
              <CardBody>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Nom</Th>
                      <Th>GUID</Th>
                      <Th>Dernière connexion</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {generalStats.recentPlayers && generalStats.recentPlayers.map(player => (
                      <Tr key={player.id}>
                        <Td>
                          <RouterLink to={`/players/${player.id}`}>
                            {player.name}
                          </RouterLink>
                        </Td>
                        <Td>{player.guid}</Td>
                        <Td>{new Date(player.last_seen).toLocaleString()}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </CardBody>
            </Card>
          </TabPanel>
          
          {/* Temps de jeu */}
          <TabPanel>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
              <Card>
                <CardHeader>
                  <Heading size="md">Joueurs avec le plus de temps de jeu</Heading>
                </CardHeader>
                <CardBody>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>Joueur</Th>
                        <Th>Temps de jeu</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {playtimeStats.topPlaytime ? (
                        playtimeStats.topPlaytime.map(player => (
                          <Tr key={player.id}>
                            <Td>
                              <RouterLink to={`/players/${player.id}`}>
                                {player.name}
                              </RouterLink>
                            </Td>
                            <Td>{player.formatted_time}</Td>
                          </Tr>
                        ))
                      ) : (
                        <Tr>
                          <Td colSpan={2} textAlign="center">
                            <Text>Aucune donnée disponible</Text>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
              
              <Card>
                <CardHeader>
                  <Heading size="md">Temps de jeu par serveur</Heading>
                </CardHeader>
                <CardBody>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>Serveur</Th>
                        <Th>Joueurs uniques</Th>
                        <Th>Temps total</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {playtimeStats.serverPlaytime ? (
                        playtimeStats.serverPlaytime.map(server => (
                          <Tr key={server.id}>
                            <Td>
                              <RouterLink to={`/servers/${server.id}`}>
                                {server.name}
                              </RouterLink>
                            </Td>
                            <Td>{server.unique_players}</Td>
                            <Td>{server.formatted_time}</Td>
                          </Tr>
                        ))
                      ) : (
                        <Tr>
                          <Td colSpan={3} textAlign="center">
                            <Text>Aucune donnée disponible</Text>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </SimpleGrid>
          </TabPanel>
          
          {/* Serveurs */}
          <TabPanel>
            <Card>
              <CardHeader>
                <Heading size="md">Statistiques des serveurs</Heading>
              </CardHeader>
              <CardBody>
                <Text mb={4}>
                  Statistiques détaillées par serveur
                </Text>
                
                {generalStats.servers?.total > 0 ? (
                  <>
                    <Divider mb={4} />
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                      <Stat>
                        <StatLabel>Serveurs Totaux</StatLabel>
                        <StatNumber>{generalStats.servers?.total || 0}</StatNumber>
                      </Stat>
                      
                      <Stat>
                        <StatLabel>Serveurs en ligne</StatLabel>
                        <StatNumber>{generalStats.servers?.online || 0}</StatNumber>
                        <StatHelpText>
                          {Math.round((generalStats.servers?.online / generalStats.servers?.total) * 100) || 0}% de disponibilité
                        </StatHelpText>
                      </Stat>
                      
                      <Stat>
                        <StatLabel>Joueurs en ligne</StatLabel>
                        <StatNumber>{generalStats.players?.online || 0}</StatNumber>
                      </Stat>
                    </SimpleGrid>
                  </>
                ) : (
                  <Text>Aucun serveur configuré</Text>
                )}
              </CardBody>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}

export default StatsOverview;
