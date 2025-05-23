/**
 * Zombies Stats Component - React implementation
 * Displays zombie statistics and leaderboards with enhanced UI
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Box, Heading, Text, Grid, GridItem, Flex, Container,
  Button, SimpleGrid, Card, CardBody, CardHeader,
  Spinner, useToast, Stat, StatLabel, StatNumber, StatHelpText,
  Tabs, TabList, Tab, TabPanels, TabPanel, Table, Thead, Tbody,
  Tr, Th, Td, Input, InputGroup, InputLeftElement, InputRightElement, Icon,
  Stack, Badge, HStack, Tag, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Menu, MenuButton, MenuList, MenuItem, IconButton, Tooltip
} from '@chakra-ui/react';
import { 
  FaChevronDown, FaSearch, FaTimes, FaUser,
  FaRedo, FaChevronLeft, FaChevronRight, FaSkullCrossbones,
  FaChartBar, FaSort, FaInfoCircle, FaMountain, FaTrophy, 
  FaShieldAlt, FaCrosshairs, FaHandHoldingMedical, FaArrowDown, 
  FaSortNumericDown, FaSkull, FaFlagCheckered, FaUsers, FaListOl, 
  FaChartLine, FaExclamationTriangle
} from 'react-icons/fa';
import { zombiesStatsService } from '../services/api';
import Chart from 'chart.js/auto';
import ZombiesMatchHistoryComponent from './stats/ZombiesMatchHistoryComponent';

const ZombiesStatsComponent = () => {
    // State management
    const [currentPeriod, setCurrentPeriod] = useState('all');
    const [sortBy, setSortBy] = useState('kills');
    const [pageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(0);
    const [playerFilter, setPlayerFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [leaderboardData, setLeaderboardData] = useState(null);
    const [playerStats, setPlayerStats] = useState(null);
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const playerChartRef = useRef(null);
    const chartInstanceRef = useRef(null);
    const toast = useToast();
    
    // Gestion de la recherche de joueurs
    const handleSearchChange = (e) => {
        setPlayerFilter(e.target.value);
        if (currentPage !== 0) {
            setCurrentPage(0);
        }
    };
    
    // Handle period filter change
    const handlePeriodFilter = (index) => {
        const periods = ['all', 'yearly', 'monthly', 'weekly'];
        const period = periods[index];
        setCurrentPeriod(period);
        setCurrentPage(0);
    };
    
    // Fetch leaderboard data
    const loadLeaderboardData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await zombiesStatsService.getLeaderboard(
                sortBy,
                pageSize,
                currentPage,
                playerFilter,
                currentPeriod
            );
            setLeaderboardData(response);
        } catch (error) {
            setError(error.message || 'Une erreur est survenue lors du chargement du leaderboard');
            toast({
                title: 'Erreur lors du chargement des données',
                description: error.message || 'Échec du chargement des données du leaderboard',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    }, [sortBy, pageSize, currentPage, playerFilter, currentPeriod, toast]);
    
    // Load leaderboard data
    useEffect(() => {
        loadLeaderboardData();
    }, [loadLeaderboardData]);
    
    // Fetch player stats
    const loadPlayerStats = async (id, useGuid = true) => {
        try {
            setIsLoading(true);
            const response = useGuid 
                ? await zombiesStatsService.getPlayerStats(id)
                : await zombiesStatsService.getPlayerStatsById(id);
            setPlayerStats(response);
            setShowPlayerModal(true);
            
            setTimeout(() => {
                if (response && playerChartRef.current) {
                    createPlayerChart(response);
                }
            }, 100);
        } catch (error) {
            console.error('Failed to load player stats', error);
            toast({
                title: 'Error loading player stats',
                description: error.message || 'Failed to load player statistics',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(0);
            loadLeaderboardData();
        }, 500);
        
        return () => clearTimeout(timer);
    }, [playerFilter, loadLeaderboardData]);
    
    // Handle sort option change
    const handleSortOption = (option) => {
        setSortBy(option);
        setCurrentPage(0);
        loadLeaderboardData();
    };
    
    // Handle pagination
    const handlePagination = (page) => {
        setCurrentPage(page);
        loadLeaderboardData();
    };

    // Helper function to format sort by option
    const formatSortBy = (sortOption) => {
        const options = {
            'kills': 'Kills',
            'highest_round': 'Highest Round',
            'highest_score': 'Highest Score',
            'rounds_survived': 'Rounds Survived',
            'headshots': 'Headshots',
            'revives': 'Revives'
        };
        return options[sortOption] || sortOption;
    };
    
    // Get leaderboard title
    const getLeaderboardTitle = useMemo(() => {
        const periodText = {
            'all': 'All Time',
            'yearly': 'This Year',
            'monthly': 'This Month',
            'weekly': 'This Week'
        }[currentPeriod];
        return `${periodText} Leaderboard (Sorted by ${formatSortBy(sortBy)})`;
    }, [currentPeriod, sortBy]);
    
    // Create player performance chart
    const createPlayerChart = (playerData) => {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }
        
        if (typeof Chart === 'undefined' || !playerChartRef.current) {
            console.error('Chart.js is not loaded or canvas not available');
            toast({
                title: 'Erreur',
                description: 'Impossible de charger le graphique des performances',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return;
        }
        
        if (!playerData || !playerData.zombiesStats) {
            console.error('No player stats data available');
            toast({
                title: 'Erreur',
                description: 'Aucune donnée de statistiques disponible pour le graphique',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return;
        }
        
        let periods = [];
        if (playerData.zombiesStats.weekly && playerData.zombiesStats.weekly.length > 0) {
            periods = [...playerData.zombiesStats.weekly];
        } else if (playerData.zombiesStats.monthly && playerData.zombiesStats.monthly.length > 0) {
            periods = [...playerData.zombiesStats.monthly];
        } else if (playerData.zombiesStats.yearly && playerData.zombiesStats.yearly.length > 0) {
            periods = [...playerData.zombiesStats.yearly];
        }
        
        if (periods.length === 0) {
            console.warn('No period data available for chart');
            return;
        }
        
        periods.sort((a, b) => b.period_key.localeCompare(a.period_key));
        const recentPeriods = periods.slice(0, 10).reverse();
        
        const labels = recentPeriods.map(p => {
            if (p.period_type === 'weekly') {
                return `W${p.period_key.split('-W')[1]}`;
            } else if (p.period_type === 'monthly') {
                return p.period_key.split('-')[1];
            } else {
                return p.period_key;
            }
        });
        
        const killsData = recentPeriods.map(p => p.kills || 0);
        const roundsData = recentPeriods.map(p => p.highest_round || 0);
        
        chartInstanceRef.current = new Chart(playerChartRef.current, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Kills',
                        data: killsData,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Highest Round',
                        data: roundsData,
                        borderColor: 'rgba(255, 159, 64, 1)',
                        backgroundColor: 'rgba(255, 159, 64, 0.2)',
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Player Performance Trends',
                        color: '#fff',
                        font: { size: 16 }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    };

    // Clean up chart when component unmounts
    useEffect(() => {
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, []);    
    
    // Render player modal
    const renderPlayerModal = () => {
        if (!playerStats || !playerStats.player || !playerStats.zombiesStats) return null;
        
        const player = playerStats.player;
        const zombiesStats = playerStats.zombiesStats;
        
        const renderPeriodsTable = (periods) => {
            if (!Array.isArray(periods) || periods.length === 0) {
                return (
                    <Tr>
                        <Td colSpan={5} textAlign="center" color="gray.400">No period data available</Td>
                    </Tr>
                );
            }
            
            return periods.map(period => {
                let periodName = period.period_key;
                if (period.period_type === 'weekly') {
                    periodName = `Week ${period.period_key.split('-W')[1]}, ${period.period_key.split('-')[0]}`;
                } else if (period.period_type === 'monthly') {
                    const date = new Date(period.period_key + '-01');
                    periodName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                } else if (period.period_type === 'yearly') {
                    periodName = `Year ${period.period_key}`;
                }
                
                return (
                    <Tr key={period.period_key + period.period_type}>
                        <Td color="gray.200">{periodName}</Td>
                        <Td color="red.400">{(period.kills || 0).toLocaleString()}</Td>
                        <Td color="orange.400">{(period.headshots || 0).toLocaleString()}</Td>
                        <Td color="purple.400">{period.highest_round || 0}</Td>
                        <Td color="yellow.400">{(period.highest_score || 0).toLocaleString()}</Td>
                    </Tr>
                );
            });
        };
        
        return (
            <Modal
                isOpen={showPlayerModal}
                onClose={() => setShowPlayerModal(false)}
                size="xl"
                isCentered
                motionPreset="scale"
            >
                <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)" />
                <ModalContent 
                    bgGradient="linear(to-b, gray.800, gray.900)"
                    borderRadius="xl"
                    boxShadow="0 0 20px rgba(0, 255, 255, 0.2)"
                    maxHeight="85vh"
                    overflowY="auto"
                    border="1px solid"
                    borderColor="teal.500"
                >
                    <ModalHeader 
                        bg="blackAlpha.400" 
                        color="teal.300" 
                        borderTopRadius="xl"
                        py={4}
                        borderBottom="1px solid"
                        borderColor="teal.700"
                    >
                        <Flex align="center">
                            <Box 
                                width="36px" 
                                height="36px" 
                                borderRadius="full" 
                                bg="teal.600" 
                                mr={3} 
                                display="flex" 
                                alignItems="center" 
                                justifyContent="center"
                            >
                                <Icon as={FaUser} boxSize={4} color="black" />
                            </Box>
                            <Text fontSize="xl" fontWeight="bold">Player: {player.name}</Text>
                        </Flex>
                    </ModalHeader>
                    <ModalCloseButton color="teal.300" _hover={{ color: "teal.500" }} />
                    <ModalBody bg="transparent" p={4}>
                        <Tabs variant="soft-rounded" colorScheme="teal">
                            <TabList bg="gray.900" p={1} borderRadius="lg">
                                <Tab fontSize="sm" color="gray.300" _selected={{ bg: "teal.600", color: "white" }}>Overview</Tab>
                                <Tab fontSize="sm" color="gray.300" _selected={{ bg: "teal.600", color: "white" }}>History</Tab>
                                {playerStats.sessions && playerStats.sessions.length > 0 && (
                                    <Tab fontSize="sm" color="gray.300" _selected={{ bg: "teal.600", color: "white" }}>Sessions</Tab>
                                )}
                            </TabList>
                            <TabPanels>
                                <TabPanel>
                                    <Card bg="gray.800" borderRadius="lg" boxShadow="lg">
                                        <CardHeader>
                                            <Heading size="md" color="teal.300">Player Information</Heading>
                                        </CardHeader>
                                        <CardBody>
                                            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                                                <GridItem>
                                                    <Stack spacing={4}>
                                                        <Flex justify="space-between" align="center">
                                                            <Text color="gray.300">Name</Text>
                                                            <Badge colorScheme="teal" px={3} py={1} borderRadius="full">{player.name}</Badge>
                                                        </Flex>
                                                        <Flex justify="space-between" align="center">
                                                            <Text color="gray.300">GUID</Text>
                                                            <Badge colorScheme="teal" px={3} py={1} borderRadius="full">{player.guid}</Badge>
                                                        </Flex>
                                                        <Flex justify="space-between" align="center">
                                                            <Text color="gray.300">Total Kills</Text>
                                                            <Badge colorScheme="red" px={3} py={1} borderRadius="full">
                                                                {(zombiesStats.overall?.kills || 0).toLocaleString()}
                                                            </Badge>
                                                        </Flex>
                                                        <Flex justify="space-between" align="center">
                                                            <Text color="gray.300">Headshots</Text>
                                                            <Badge colorScheme="orange" px={3} py={1} borderRadius="full">
                                                                {(zombiesStats.overall?.headshots || 0).toLocaleString()}
                                                            </Badge>
                                                        </Flex>
                                                    </Stack>
                                                </GridItem>
                                                <GridItem>
                                                    <Stack spacing={4}>
                                                        <Flex justify="space-between" align="center">
                                                            <Text color="gray.300">Highest Round</Text>
                                                            <Badge colorScheme="purple" px={3} py={1} borderRadius="full">
                                                                {zombiesStats.overall?.highest_round || 0}
                                                            </Badge>
                                                        </Flex>
                                                        <Flex justify="space-between" align="center">
                                                            <Text color="gray.300">Highest Score</Text>
                                                            <Badge colorScheme="yellow" px={3} py={1} borderRadius="full">
                                                                {(zombiesStats.overall?.highest_score || 0).toLocaleString()}
                                                            </Badge>
                                                        </Flex>
                                                        <Flex justify="space-between" align="center">
                                                            <Text color="gray.300">Rounds Survived</Text>
                                                            <Badge colorScheme="blue" px={3} py={1} borderRadius="full">
                                                                {(zombiesStats.overall?.rounds_survived || 0).toLocaleString()}
                                                            </Badge>
                                                        </Flex>
                                                        <Flex justify="space-between" align="center">
                                                            <Text color="gray.300">Revives</Text>
                                                            <Badge colorScheme="green" px={3} py={1} borderRadius="full">
                                                                {(zombiesStats.overall?.revives || 0).toLocaleString()}
                                                            </Badge>
                                                        </Flex>
                                                    </Stack>
                                                </GridItem>
                                            </Grid>
                                        </CardBody>
                                    </Card>
                                    
                                    <Card bg="gray.800" mt={4} borderRadius="lg" boxShadow="lg">
                                        <CardHeader>
                                            <Heading size="md" color="teal.300">Performance Trends</Heading>
                                        </CardHeader>
                                        <CardBody>
                                            <Box height="300px" bg="gray.900" borderRadius="md" p={2}>
                                                <canvas ref={playerChartRef}></canvas>
                                            </Box>
                                        </CardBody>
                                    </Card>
                                </TabPanel>
                                
                                <TabPanel>
                                    <Card bg="gray.800" borderRadius="lg" boxShadow="lg">
                                        <CardHeader>
                                            <Heading size="md" color="teal.300">Period Performance</Heading>
                                        </CardHeader>
                                        <CardBody>
                                            <Tabs variant="soft-rounded" colorScheme="teal" size="sm">
                                                <TabList bg="gray.900" p={1} borderRadius="lg">
                                                    <Tab color="gray.300" _selected={{ bg: "teal.600", color: "white" }}>Weekly</Tab>
                                                    <Tab color="gray.300" _selected={{ bg: "teal.600", color: "white" }}>Monthly</Tab>
                                                    <Tab color="gray.300" _selected={{ bg: "teal.600", color: "white" }}>Yearly</Tab>
                                                </TabList>
                                                <TabPanels>
                                                    <TabPanel>
                                                        <Table variant="simple" size="sm" colorScheme="teal">
                                                            <Thead bg="gray.900">
                                                                <Tr>
                                                                    <Th color="teal.300">Period</Th>
                                                                    <Th color="teal.300">Kills</Th>
                                                                    <Th color="teal.300">Headshots</Th>
                                                                    <Th color="teal.300">Highest Round</Th>
                                                                    <Th color="teal.300">Highest Score</Th>
                                                                </Tr>
                                                            </Thead>
                                                            <Tbody>
                                                                {renderPeriodsTable(zombiesStats.weekly || [])}
                                                            </Tbody>
                                                        </Table>
                                                    </TabPanel>
                                                    <TabPanel>
                                                        <Table variant="simple" size="sm" colorScheme="teal">
                                                            <Thead bg="gray.900">
                                                                <Tr>
                                                                    <Th color="teal.300">Period</Th>
                                                                    <Th color="teal.300">Kills</Th>
                                                                    <Th color="teal.300">Headshots</Th>
                                                                    <Th color="teal.300">Highest Round</Th>
                                                                    <Th color="teal.300">Highest Score</Th>
                                                                </Tr>
                                                            </Thead>
                                                            <Tbody>
                                                                {renderPeriodsTable(zombiesStats.monthly || [])}
                                                            </Tbody>
                                                        </Table>
                                                    </TabPanel>
                                                    <TabPanel>
                                                        <Table variant="simple" size="sm" colorScheme="teal">
                                                            <Thead bg="gray.900">
                                                                <Tr>
                                                                    <Th color="teal.300">Period</Th>
                                                                    <Th color="teal.300">Kills</Th>
                                                                    <Th color="teal.300">Headshots</Th>
                                                                    <Th color="teal.300">Highest Round</Th>
                                                                    <Th color="teal.300">Highest Score</Th>
                                                                </Tr>
                                                            </Thead>
                                                            <Tbody>
                                                                {renderPeriodsTable(zombiesStats.yearly || [])}
                                                            </Tbody>
                                                        </Table>
                                                    </TabPanel>
                                                </TabPanels>
                                            </Tabs>
                                        </CardBody>
                                    </Card>
                                </TabPanel>
                                
                                {playerStats.sessions && playerStats.sessions.length > 0 && (
                                    <TabPanel>
                                        <Card bg="gray.800" borderRadius="lg" boxShadow="lg">
                                            <CardHeader>
                                                <Heading size="md" color="teal.300">Recent Sessions</Heading>
                                            </CardHeader>
                                            <CardBody>
                                                <Table variant="simple" size="sm" colorScheme="teal">
                                                    <Thead bg="gray.900">
                                                        <Tr>
                                                            <Th color="teal.300">Date</Th>
                                                            <Th color="teal.300">Server</Th>
                                                            <Th color="teal.300">Duration</Th>
                                                        </Tr>
                                                    </Thead>
                                                    <Tbody>
                                                        {playerStats.sessions.map((session, index) => {
                                                            let duration = "Unknown";
                                                            if (session.start_time && session.last_seen) {
                                                                const start = new Date(session.start_time);
                                                                const end = new Date(session.last_seen);
                                                                const diffMs = end - start;
                                                                const diffMins = Math.round(diffMs / 60000);
                                                                duration = diffMins + " min";
                                                            }
                                                            
                                                            return (
                                                                <Tr key={index}>
                                                                    <Td color="gray.200">{new Date(session.start_time).toLocaleString()}</Td>
                                                                    <Td color="gray.200">{session.server_name}</Td>
                                                                    <Td color="gray.200">{duration}</Td>
                                                                </Tr>
                                                            );
                                                        })}
                                                    </Tbody>
                                                </Table>
                                            </CardBody>
                                        </Card>
                                    </TabPanel>
                                )}
                            </TabPanels>
                        </Tabs>
                    </ModalBody>
                    <ModalFooter bg="gray.900" borderBottomRadius="xl" borderTop="1px solid" borderColor="teal.700">
                        <Button 
                            onClick={() => setShowPlayerModal(false)} 
                            colorScheme="teal"
                            size="md"
                            borderRadius="full"
                            leftIcon={<Icon as={FaTimes} />}
                            _hover={{
                                transform: "scale(1.05)",
                                bg: "teal.500",
                                boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)"
                            }}
                            transition="all 0.2s"
                        >
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        );
    };
    
    // Render pagination buttons
    const renderPaginationButtons = () => {
        if (!leaderboardData?.pagination) return null;
        
        const totalPages = leaderboardData.pagination.totalPages;
        const maxButtons = 5;
        let startPage = Math.max(0, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages - 1, startPage + maxButtons - 1);

        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(0, endPage - maxButtons + 1);
        }

        const buttons = [];

        buttons.push(
            <Button
                key={0}
                size="sm"
                borderRadius="full"
                variant={currentPage === 0 ? "solid" : "outline"}
                colorScheme="teal"
                onClick={() => handlePagination(0)}
                mx={1}
                _hover={{ bg: "teal.600", color: "white" }}
            >
                1
            </Button>
        );

        if (startPage > 1) {
            buttons.push(<Button key="start-ellipsis" size="sm" variant="ghost" isDisabled color="gray.400">...</Button>);
        }

        for (let i = startPage; i <= endPage; i++) {
            if (i !== 0 && i !== totalPages - 1) {
                buttons.push(
                    <Button
                        key={i}
                        size="sm"
                        borderRadius="full"
                        variant={i === currentPage ? "solid" : "outline"}
                        colorScheme="teal"
                        onClick={() => handlePagination(i)}
                        mx={1}
                        _hover={{ bg: "teal.600", color: "white" }}
                    >
                        {i + 1}
                    </Button>
                );
            }
        }

        if (endPage < totalPages - 2) {
            buttons.push(<Button key="end-ellipsis" size="sm" variant="ghost" isDisabled color="gray.400">...</Button>);
        }

        if (totalPages > 1) {
            buttons.push(
                <Button
                    key={totalPages - 1}
                    size="sm"
                    borderRadius="full"
                    variant={currentPage === totalPages - 1 ? "solid" : "outline"}
                    colorScheme="teal"
                    onClick={() => handlePagination(totalPages - 1)}
                    mx={1}
                    _hover={{ bg: "teal.600", color: "white" }}
                >
                    {totalPages}
                </Button>
            );
        }

        return buttons;
    };

    // Main component render
    if (isLoading && !leaderboardData) {
        return (
            <Container maxW="container.xl" py={8} bg="gray.900" minH="100vh">
                <Flex 
                    direction="column" 
                    align="center" 
                    justify="center" 
                    my={12}
                    py={10}
                    bg="gray.800"
                    borderRadius="xl"
                    boxShadow="0 0 20px rgba(0, 255, 255, 0.1)"
                >
                    <Box 
                        mb={6} 
                        position="relative"
                        width="80px"
                        height="80px"
                        animation="pulse 1.5s infinite"
                        sx={{
                            "@keyframes pulse": {
                                "0%": { transform: "scale(1)", opacity: 0.7 },
                                "50%": { transforma: "scale(1.2)", opacity: 1 },
                                "100%": { transform: "scale(1)", opacity: 0.7 }
                            }
                        }}
                    >
                        <Icon as={FaSkullCrossbones} boxSize="80px" color="teal.400" />
                    </Box>
                    <Heading size="lg" color="teal.300" mb={2}>Loading Zombie Statistics</Heading>
                    <Text color="gray.400" fontStyle="italic">Preparing the undead carnage data...</Text>
                </Flex>
            </Container>
        );
    }
    
    if (error) {
        return (
            <Container maxW="container.xl" py={8} bg="gray.900" minH="100vh">
                <Card 
                    bg="red.900" 
                    borderLeft="5px solid" 
                    borderColor="red.500" 
                    mb={6}
                    boxShadow="0 0 20px rgba(255, 0, 0, 0.2)"
                    borderRadius="xl"
                >
                    <CardBody p={6}>
                        <Flex align="center" mb={4}>
                            <Icon 
                                as={FaExclamationTriangle} 
                                color="red.400" 
                                boxSize={8} 
                                mr={4}
                                animation="pulse 2s infinite"
                                sx={{
                                    "@keyframes pulse": {
                                        "0%": { opacity: 0.6 },
                                        "50%": { opacity: 1 },
                                        "100%": { opacity: 0.6 }
                                    }
                                }}
                            />
                            <Box>
                                <Heading size="md" mb={2} color="red.300">Failed to load leaderboard</Heading>
                                <Text color="red.400">{error}</Text>
                            </Box>
                        </Flex>
                        <Button 
                            leftIcon={<Icon as={FaRedo} />} 
                            onClick={() => loadLeaderboardData()}
                            colorScheme="red"
                            size="lg"
                            width="full"
                            borderRadius="full"
                            _hover={{
                                transform: "scale(1.05)",
                                bg: "red.600",
                                boxShadow: "0 0 10px rgba(255, 0, 0, 0.3)"
                            }}
                            transition="all 0.2s"
                        >
                            Try Again
                        </Button>
                    </CardBody>
                </Card>
            </Container>
        );
    }
    
    return (
        <Container maxW="container.xl" py={8} bg="gray.900" minH="100vh" color="white">
            <Box mb={8} p={4} bg="gray.800" borderRadius="xl" borderLeft="4px solid" borderColor="teal.500" boxShadow="0 0 15px rgba(0, 255, 255, 0.1)">
                <Flex align="center">
                    <Icon as={FaInfoCircle} color="teal.400" boxSize={6} mr={3} />
                    <Text fontWeight="semibold" color="gray.200">
                        Zombie Stats are fully operational! Filter by period, search by player name, sort by stats, and navigate through results.
                    </Text>
                </Flex>
            </Box>
            
            <Tabs 
                variant="soft-rounded" 
                colorScheme="teal" 
                onChange={handlePeriodFilter}
                index={['all', 'yearly', 'monthly', 'weekly'].indexOf(currentPeriod)}
                isLazy={false}
            >
                <TabList mb={6} p={1} bg="gray.800" borderRadius="full" width="fit-content" boxShadow="sm">
                    <Tab fontSize="sm" _selected={{ color: "black", bg: "teal.400" }} fontWeight="bold" px={4}>All Time</Tab>
                    <Tab fontSize="sm" _selected={{ color: "black", bg: "teal.400" }} fontWeight="bold" px={4}>This Year</Tab>
                    <Tab fontSize="sm" _selected={{ color: "black", bg: "teal.400" }} fontWeight="bold" px={4}>This Month</Tab>
                    <Tab fontSize="sm" _selected={{ color: "black", bg: "teal.400" }} fontWeight="bold" px={4}>This Week</Tab>
                </TabList>
            </Tabs>
            
            <Flex 
                mb={6} 
                direction={{ base: "column", md: "row" }} 
                gap={4}
                bg="gray.800"
                p={4}
                borderRadius="xl"
                boxShadow="0 0 15px rgba(0, 255, 255, 0.1)"
                align="center"
            >
                <InputGroup size="md" flex="1">
                    <InputLeftElement pointerEvents="none">
                        <Icon as={FaSearch} color="gray.500" />
                    </InputLeftElement>
                    <Input
                        placeholder="Search by player name..."
                        value={playerFilter}
                        onChange={handleSearchChange}
                        bg="gray.900"
                        border="1px solid"
                        borderColor="teal.700"
                        color="gray.200"
                        _hover={{ borderColor: "teal.500" }}
                        _focus={{ borderColor: "teal.400", boxShadow: "0 0 0 2px rgba(0, 255, 255, 0.2)" }}
                        borderRadius="full"
                    />
                    {playerFilter && (
                        <InputRightElement width="4.5rem">
                            <Button 
                                h="1.75rem" 
                                size="sm" 
                                onClick={() => setPlayerFilter('')}
                                colorScheme="teal"
                                variant="ghost"
                                _hover={{ bg: "teal.700" }}
                            >
                                <Icon as={FaTimes} boxSize={3} color="teal.400" />
                            </Button>
                        </InputRightElement>
                    )}
                </InputGroup>
                
                <Box ml={{ base: 0, md: "auto" }}>
                    <Menu placement="bottom-end">
                        <MenuButton 
                            as={Button} 
                            rightIcon={<Icon as={FaChevronDown} />} 
                            variant="outline"
                            colorScheme="teal"
                            borderRadius="full"
                            _hover={{ bg: "teal.700", color: "white" }}
                            _active={{ bg: "teal.800" }}
                            width={{ base: "full", md: "auto" }}
                            px={6}
                        >
                            <Flex align="center">
                                <Icon as={FaSort} mr={2} color="teal.400" />
                                <Text color="gray.200">Sort By: {formatSortBy(sortBy)}</Text>
                            </Flex>
                        </MenuButton>
                        <MenuList bg="gray.800" border="1px solid" borderColor="teal.700" shadow="xl" minWidth="200px">
                            <MenuItem 
                                icon={<Icon as={FaSkullCrossbones} color="red.400" />} 
                                onClick={() => handleSortOption('kills')}
                                bg="gray.800"
                                color="gray.200"
                                _hover={{ bg: "teal.700", color: "white" }}
                            >
                                Kills
                            </MenuItem>
                            <MenuItem 
                                icon={<Icon as={FaMountain} color="purple.400" />} 
                                onClick={() => handleSortOption('highest_round')}
                                bg="gray.800"
                                color="gray.200"
                                _hover={{ bg: "teal.700", color: "white" }}
                            >
                                Highest Round
                            </MenuItem>
                            <MenuItem 
                                icon={<Icon as={FaTrophy} color="yellow.400" />} 
                                onClick={() => handleSortOption('highest_score')}
                                bg="gray.800"
                                color="gray.200"
                                _hover={{ bg: "teal.700", color: "white" }}
                            >
                                Highest Score
                            </MenuItem>
                            <MenuItem 
                                icon={<Icon as={FaShieldAlt} color="blue.400" />} 
                                onClick={() => handleSortOption('rounds_survived')}
                                bg="gray.800"
                                color="gray.200"
                                _hover={{ bg: "teal.700", color: "white" }}
                            >
                                Rounds Survived
                            </MenuItem>
                            <MenuItem 
                                icon={<Icon as={FaCrosshairs} color="orange.400" />} 
                                onClick={() => handleSortOption('headshots')}
                                bg="gray.800"
                                color="gray.200"
                                _hover={{ bg: "teal.700", color: "white" }}
                            >
                                Headshots
                            </MenuItem>
                            <MenuItem 
                                icon={<Icon as={FaHandHoldingMedical} color="green.400" />} 
                                onClick={() => handleSortOption('revives')}
                                bg="gray.800"
                                color="gray.200"
                                _hover={{ bg: "teal.700", color: "white" }}
                            >
                                Revives
                            </MenuItem>
                        </MenuList>
                    </Menu>
                </Box>
            </Flex>
            
            <Card mb={6} bg="gray.800" borderRadius="xl" boxShadow="0 0 20px rgba(0, 255, 255, 0.1)" overflow="hidden">
                <CardHeader bg="gray.900" py={4} borderBottom="1px solid" borderColor="teal.700">
                    <Flex align="center">
                        <Icon as={FaListOl} mr={3} boxSize={5} color="teal.400" />
                        <Heading size="lg" color="teal.300">{getLeaderboardTitle}</Heading>
                    </Flex>
                </CardHeader>
                <CardBody p={0}>
                    <Box 
                        p={4} 
                        mb={4} 
                        bg="gray.900" 
                        fontSize="sm" 
                        borderRadius="lg" 
                        borderLeft="3px solid" 
                        borderColor="teal.500"
                        mx={4}
                        mt={4}
                    >
                        <Flex flexWrap="wrap" gap={2}>
                            <Badge colorScheme="teal" px={3} py={1} borderRadius="full">Period: {currentPeriod}</Badge>
                            <Badge colorScheme="purple" px={3} py={1} borderRadius="full">Sort: {sortBy}</Badge>
                            <Badge colorScheme="green" px={3} py={1} borderRadius="full">Page: {currentPage + 1}</Badge>
                            {leaderboardData && (
                                <Badge colorScheme="red" px={3} py={1} borderRadius="full">
                                    Entries: {leaderboardData.leaderboard?.length || 0}
                                </Badge>
                            )}
                        </Flex>
                        {leaderboardData?.summary && (
                            <>
                                <SimpleGrid columns={{ base: 1, md: 3 }} mt={3} spacing={3}>
                                    <Flex align="center" p={3} bg="gray.800" borderRadius="lg" boxShadow="sm">
                                        <Icon as={FaSkull} color="red.400" mr={2} boxSize={5} />
                                        <Text color="gray.200" fontWeight="semibold">
                                            Kills: {(leaderboardData.summary.totalKills || 0).toLocaleString()}
                                        </Text>
                                    </Flex>
                                    <Flex align="center" p={3} bg="gray.800" borderRadius="lg" boxShadow="sm">
                                        <Icon as={FaFlagCheckered} color="purple.400" mr={2} boxSize={5} />
                                        <Text color="gray.200" fontWeight="semibold">
                                            Round: {leaderboardData.summary.highestRound || 0}
                                        </Text>
                                    </Flex>
                                    <Flex align="center" p={3} bg="gray.800" borderRadius="lg" boxShadow="sm">
                                        <Icon as={FaUsers} color="blue.400" mr={2} boxSize={5} />
                                        <Text color="gray.200" fontWeight="semibold">
                                            Players: {(leaderboardData.summary.uniquePlayers || 0).toLocaleString()}
                                        </Text>
                                    </Flex>
                                </SimpleGrid>
                            </>
                        )}
                    </Box>
                    
                    {!leaderboardData?.leaderboard || leaderboardData.leaderboard.length === 0 ? (
                        <Box 
                            p={8} 
                            textAlign="center" 
                            bg="gray.900" 
                            borderRadius="lg" 
                            m={4}
                        >
                            <Icon as={FaSearch} boxSize={12} mb={4} color="teal.400" />
                            <Heading size="md" mb={2} color="teal.300">No Results Found</Heading>
                            <Text color="gray.400">No data found for the selected period and filter.</Text>
                        </Box>
                    ) : (
                        <Box overflowX="auto">
                            <Table variant="simple" colorScheme="teal" bg="gray.800" size="md">
                                <Thead bg="gray.900">
                                    <Tr>
                                        <Th color="teal.300" borderBottom="1px solid" borderColor="teal.700" py={3}>
                                            <Flex align="center">
                                                <Icon as={FaSortNumericDown} boxSize={4} mr={1} color="teal.400" />
                                                Rank
                                            </Flex>
                                        </Th>
                                        <Th color="teal.300" borderBottom="1px solid" borderColor="teal.700" py={3}>
                                            <Flex align="center">
                                                <Icon as={FaUser} boxSize={4} mr={1} color="teal.400" />
                                                Player
                                            </Flex>
                                        </Th>
                                        <Th isNumeric color="teal.300" borderBottom="1px solid" borderColor="teal.700" py={3}>
                                            <Flex align="center" justify="flex-end">
                                                <Icon as={FaSkullCrossbones} boxSize={4} mr={1} color="red.400" />
                                                Kills
                                            </Flex>
                                        </Th>
                                        <Th isNumeric color="teal.300" borderBottom="1px solid" borderColor="teal.700" py={3}>
                                            <Flex align="center" justify="flex-end">
                                                <Icon as={FaCrosshairs} boxSize={4} mr={1} color="orange.400" />
                                                Headshots
                                            </Flex>
                                        </Th>
                                        <Th isNumeric color="teal.300" borderBottom="1px solid" borderColor="teal.700" py={3}>
                                            <Flex align="center" justify="flex-end">
                                                <Icon as={FaMountain} boxSize={4} mr={1} color="purple.400" />
                                                Highest Round
                                            </Flex>
                                        </Th>
                                        <Th isNumeric color="teal.300" borderBottom="1px solid" borderColor="teal.700" py={3}>
                                            <Flex align="center" justify="flex-end">
                                                <Icon as={FaTrophy} boxSize={4} mr={1} color="yellow.400" />
                                                Highest Score
                                            </Flex>
                                        </Th>
                                        <Th isNumeric color="teal.300" borderBottom="1px solid" borderColor="teal.700" py={3}>
                                            <Flex align="center" justify="flex-end">
                                                <Icon as={FaShieldAlt} boxSize={4} mr={1} color="blue.400" />
                                                Rounds Survived
                                            </Flex>
                                        </Th>
                                        <Th isNumeric color="teal.300" borderBottom="1px solid" borderColor="teal.700" py={3}>
                                            <Flex align="center" justify="flex-end">
                                                <Icon as={FaArrowDown} boxSize={4} mr={1} color="red.400" />
                                                Downs
                                            </Flex>
                                        </Th>
                                        <Th isNumeric color="teal.300" borderBottom="1px solid" borderColor="teal.700" py={3}>
                                            <Flex align="center" justify="flex-end">
                                                <Icon as={FaHandHoldingMedical} boxSize={4} mr={1} color="green.400" />
                                                Revives
                                            </Flex>
                                        </Th>
                                        <Th color="teal.300" borderBottom="1px solid" borderColor="teal.700" py={3}>
                                            Actions
                                        </Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {leaderboardData.leaderboard.map((player, index) => (
                                        <Tr 
                                            key={player.guid || player.player_id} 
                                            bg={index % 2 === 0 ? "gray.800" : "gray.850"}
                                            _hover={{ bg: "teal.900", transition: "all 0.2s" }}
                                            transition="all 0.2s"
                                        >
                                            <Td borderBottom="1px solid" borderColor="teal.700">
                                                <Badge
                                                    colorScheme={index < 3 ? ["yellow", "gray", "orange"][index] : "teal"}
                                                    fontSize="sm"
                                                    borderRadius="full"
                                                    px={3}
                                                    py={1}
                                                >
                                                    {index + 1 + (currentPage * pageSize)}
                                                </Badge>
                                            </Td>
                                            <Td borderBottom="1px solid" borderColor="teal.700">
                                                <Flex align="center">
                                                    <Box 
                                                        width="28px" 
                                                        height="28px" 
                                                        borderRadius="full" 
                                                        bg="teal.600" 
                                                        color="black" 
                                                        display="flex" 
                                                        alignItems="center" 
                                                        justifyContent="center"
                                                        mr={3}
                                                    >
                                                        <Icon as={FaUser} boxSize={4} />
                                                    </Box>
                                                    <Text fontWeight="semibold" color="gray.200" fontSize="md">{player.name}</Text>
                                                </Flex>
                                            </Td>
                                            <Td isNumeric borderBottom="1px solid" borderColor="teal.700">
                                                <Badge colorScheme="red" px={2} py={1} borderRadius="full">
                                                    {(player.kills || 0).toLocaleString()}
                                                </Badge>
                                            </Td>
                                            <Td isNumeric borderBottom="1px solid" borderColor="teal.700">
                                                <Badge colorScheme="orange" px={2} py={1} borderRadius="full">
                                                    {(player.headshots || 0).toLocaleString()}
                                                </Badge>
                                            </Td>
                                            <Td isNumeric borderBottom="1px solid" borderColor="teal.700">
                                                <Badge colorScheme="purple" px={2} py={1} borderRadius="full">
                                                    {(player.highest_round || 0).toLocaleString()}
                                                </Badge>
                                            </Td>
                                            <Td isNumeric borderBottom="1px solid" borderColor="teal.700">
                                                <Badge colorScheme="yellow" px={2} py={1} borderRadius="full">
                                                    {(player.highest_score || 0).toLocaleString()}
                                                </Badge>
                                            </Td>
                                            <Td isNumeric borderBottom="1px solid" borderColor="teal.700">
                                                <Badge colorScheme="blue" px={2} py={1} borderRadius="full">
                                                    {(player.rounds_survived || 0).toLocaleString()}
                                                </Badge>
                                            </Td>
                                            <Td isNumeric borderBottom="1px solid" borderColor="teal.700">
                                                <Badge colorScheme="red" px={2} py={1} borderRadius="full">
                                                    {(player.downs || 0).toLocaleString()}
                                                </Badge>
                                            </Td>
                                            <Td isNumeric borderBottom="1px solid" borderColor="teal.700">
                                                <Badge colorScheme="green" px={2} py={1} borderRadius="full">
                                                    {(player.revives || 0).toLocaleString()}
                                                </Badge>
                                            </Td>
                                            <Td borderBottom="1px solid" borderColor="teal.700">                                <Tooltip 
                                                    label={`View detailed stats for ${player.name}`} 
                                                    placement="left"
                                                    bg="#2D3748"
                                                    color="white"
                                                    hasArrow
                                                    borderRadius="md"
                                                    p={2}
                                                    boxShadow="0 0 10px rgba(0, 0, 0, 0.3)"
                                                    fontSize="md"
                                                >
                                                    <IconButton
                                                        aria-label={`View detailed stats for ${player.name}`}
                                                        icon={<Icon as={FaChartBar} />}
                                                        size="sm"
                                                        colorScheme="teal"
                                                        borderRadius="full"
                                                        onClick={() => loadPlayerStats(player.guid || player.player_id, !!player.guid)}
                                                        _hover={{
                                                            transform: "scale(1.1)",
                                                            bg: "teal.600",
                                                            boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)"
                                                        }}
                                                        transition="all 0.2s"
                                                    />
                                                </Tooltip>
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </Box>
                    )}
                </CardBody>
                
                {leaderboardData?.pagination && leaderboardData.pagination.totalPages > 1 && (
                    <Box 
                        borderTop="1px solid" 
                        borderColor="teal.700" 
                        bg="gray.900" 
                        py={4}
                        borderBottomRadius="xl"
                    >
                        <Flex justify="center" align="center">
                            <HStack spacing={2}>                                <Tooltip 
                                    label="Previous Page" 
                                    placement="top" 
                                    hasArrow
                                    bg="#2D3748"
                                    color="white"
                                    borderRadius="md"
                                    p={2}
                                    boxShadow="0 0 10px rgba(0, 0, 0, 0.3)"
                                    fontSize="md"
                                >
                                    <IconButton
                                        icon={<Icon as={FaChevronLeft} />}
                                        isDisabled={currentPage === 0}
                                        onClick={() => handlePagination(currentPage - 1)}
                                        colorScheme="teal"
                                        variant="ghost"
                                        size="md"
                                        aria-label="Previous page"
                                        _hover={{ bg: "teal.600", color: "white" }}
                                        borderRadius="full"
                                    />
                                </Tooltip>
                                {renderPaginationButtons()}                                <Tooltip 
                                    label="Next Page" 
                                    placement="top" 
                                    hasArrow
                                    bg="#2D3748"
                                    color="white"
                                    borderRadius="md"
                                    p={2}
                                    boxShadow="0 0 10px rgba(0, 0, 0, 0.3)"
                                    fontSize="md"
                                >
                                    <IconButton
                                        icon={<Icon as={FaChevronRight} />}
                                        isDisabled={currentPage === leaderboardData.pagination.totalPages - 1}
                                        onClick={() => handlePagination(currentPage + 1)}
                                        colorScheme="teal"
                                        variant="ghost"
                                        size="md"
                                        aria-label="Next page"
                                        _hover={{ bg: "teal.600", color: "white" }}
                                        borderRadius="full"
                                    />
                                </Tooltip>
                            </HStack>
                        </Flex>
                        <Text textAlign="center" mt={2} fontSize="sm" color="gray.400">
                            Page {currentPage + 1} of {leaderboardData.pagination.totalPages}
                        </Text>
                    </Box>
                )}
            </Card>
            
            {leaderboardData?.summary && (
                <Box mt={8} mb={6}>
                    <Heading size="lg" mb={6} display="flex" alignItems="center" color="teal.300">
                        <Icon as={FaChartLine} mr={2} color="teal.400" boxSize={6} />
                        Global Zombies Statistics
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                        <Card 
                            bg="gray.800" 
                            borderRadius="lg"
                            boxShadow="0 0 15px rgba(0, 255, 255, 0.1)"
                            position="relative"
                            _hover={{
                                transform: "scale(1.02)",
                                boxShadow: "0 0 20px rgba(0, 255, 255, 0.2)",
                                transition: "all 0.3s"
                            }}
                            transition="all 0.3s"
                        >
                            <Box 
                                position="absolute" 
                                top={3} 
                                right={3} 
                                p={2} 
                                borderRadius="full" 
                                bg="red.500" 
                                boxShadow="md"
                            >
                                <Icon as={FaSkullCrossbones} boxSize={4} color="black" />
                            </Box>
                            <CardBody p={6}>
                                <Stat textAlign="center">
                                    <StatLabel fontSize="lg" mb={2} color="gray.300">Total Zombie Kills</StatLabel>
                                    <StatNumber fontSize="3xl" fontWeight="bold" color="red.400">
                                        {(leaderboardData.summary.totalKills || 0).toLocaleString()}
                                    </StatNumber>
                                    <Box 
                                        mt={3} 
                                        height="4px" 
                                        bg="red.900" 
                                        borderRadius="full"
                                        overflow="hidden"
                                    >
                                        <Box 
                                            height="100%" 
                                            width="100%" 
                                            bg="red.500" 
                                            borderRadius="full"
                                            animation="pulse 2s infinite"
                                            sx={{
                                                "@keyframes pulse": {
                                                    "0%": { opacity: 0.7 },
                                                    "50%": { opacity: 1 },
                                                    "100%": { opacity: 0.7 }
                                                }
                                            }}
                                        />
                                    </Box>
                                </Stat>
                            </CardBody>
                        </Card>
                        <Card 
                            bg="gray.800" 
                            borderRadius="lg"
                            boxShadow="0 0 15px rgba(0, 255, 255, 0.1)"
                            position="relative"
                            _hover={{
                                transform: "scale(1.02)",
                                boxShadow: "0 0 20px rgba(0, 255, 255, 0.2)",
                                transition: "all 0.3s"
                            }}
                            transition="all 0.3s"
                        >
                            <Box 
                                position="absolute" 
                                top={3} 
                                right={3} 
                                p={2} 
                                borderRadius="full" 
                                bg="purple.500" 
                                boxShadow="md"
                            >
                                <Icon as={FaMountain} boxSize={4} color="black" />
                            </Box>
                            <CardBody p={6}>
                                <Stat textAlign="center">
                                    <StatLabel fontSize="lg" mb={2} color="gray.300">Highest Round Reached</StatLabel>
                                    <StatNumber fontSize="3xl" fontWeight="bold" color="purple.400">
                                        {(() => {
                                            const round = leaderboardData.summary.highestRound;
                                            return (typeof round === 'number' && !isNaN(round)) ? round : 0;
                                        })()}
                                    </StatNumber>
                                    <StatHelpText fontSize="md" color="gray.400">
                                        By: {leaderboardData.summary.highestRoundPlayer && leaderboardData.summary.highestRoundPlayer !== 'N/A' ? 
                                            <Badge colorScheme="purple" px={2} py={1} borderRadius="full">
                                                {leaderboardData.summary.highestRoundPlayer}
                                            </Badge> : 'Unknown'}
                                    </StatHelpText>
                                </Stat>
                            </CardBody>
                        </Card>
                        <Card 
                            bg="gray.800" 
                            borderRadius="lg"
                            boxShadow="0 0 15px rgba(0, 255, 255, 0.1)"
                            position="relative"
                            _hover={{
                                transform: "scale(1.02)",
                                boxShadow: "0 0 20px rgba(0, 255, 255, 0.2)",
                                transition: "all 0.3s"
                            }}
                            transition="all 0.3s"
                        >
                            <Box 
                                position="absolute" 
                                top={3} 
                                right={3} 
                                p={2} 
                                borderRadius="full" 
                                bg="blue.500" 
                                boxShadow="md"
                            >
                                <Icon as={FaUsers} boxSize={4} color="black" />
                            </Box>
                            <CardBody p={6}>
                                <Stat textAlign="center">
                                    <StatLabel fontSize="lg" mb={2} color="gray.300">Total Unique Players</StatLabel>
                                    <StatNumber fontSize="3xl" fontWeight="bold" color="blue.400">
                                        {(leaderboardData.summary.uniquePlayers || 0).toLocaleString()}
                                    </StatNumber>
                                    <Box 
                                        mt={3} 
                                        height="4px" 
                                        bg="blue.900" 
                                        borderRadius="full"
                                        overflow="hidden"
                                    >
                                        <Box 
                                            height="100%" 
                                            width="100%" 
                                            bg="blue.500" 
                                            borderRadius="full"
                                            animation="pulse 2s infinite"
                                            sx={{
                                                "@keyframes pulse": {
                                                    "0%": { opacity: 0.7 },
                                                    "50%": { opacity: 1 },
                                                    "100%": { opacity: 0.7 }
                                                }
                                            }}
                                        />
                                    </Box>
                                </Stat>
                            </CardBody>
                        </Card>
                    </SimpleGrid>
                </Box>
            )}
            
            {renderPlayerModal()}
            
            {isLoading && leaderboardData && (
                <Flex
                    position="fixed"
                    bottom={4}
                    right={4}
                    bg="gray.800"
                    boxShadow="0 0 10px rgba(0, 255, 255, 0.2)"
                    borderRadius="full"
                    p={3}
                    align="center"
                    zIndex={10}
                    animation="pulse 1.5s infinite"
                    sx={{
                        "@keyframes pulse": {
                            "0%": { boxShadow: "0 0 0 0 rgba(0, 255, 255, 0.4)" },
                            "70%": { boxShadow: "0 0 0 10px rgba(0, 255, 255, 0)" },
                            "100%": { boxShadow: "0 0 0 0 rgba(0, 255, 255, 0)" }
                        }
                    }}
                >
                    <Icon as={FaSkull} boxSize={4} color="teal.400" mr={2} />
                    <Text fontWeight="semibold" color="teal.300" fontSize="sm">Refreshing...</Text>
                </Flex>
            )}
            
            {/* Section historique des parties et stats par carte */}
            <Box mt={10} pt={5} borderTop="1px" borderColor="gray.700">
                <ZombiesMatchHistoryComponent />
            </Box>
        </Container>
    );
};

export default React.memo(ZombiesStatsComponent);