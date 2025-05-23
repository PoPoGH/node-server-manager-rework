import { Box, VStack, Link, Text, Flex, Badge, Tooltip, Divider, Icon } from '@chakra-ui/react';
import { NavLink, useLocation } from 'react-router-dom';
import { FaHome, FaServer, FaUsers, FaChartBar, FaBrain, FaExclamation, FaCog, FaGamepad, FaList } from 'react-icons/fa';
import { MdSecurity } from 'react-icons/md';

function Sidebar({ isOpen }) {
  const location = useLocation();
  
  const bgColor = 'gray.800';
  const borderColor = 'teal.800';
  const activeBgColor = 'teal.900';
  const hoverBgColor = 'gray.700';
  
  // Structure des liens de navigation
  const navigationLinks = [
    { name: 'Tableau de bord', path: '/', icon: FaHome },
    { name: 'Serveurs', path: '/servers', icon: FaServer },
    { name: 'Joueurs', path: '/players', icon: FaUsers },
    { 
      name: 'Statistiques', 
      path: '/stats', 
      icon: FaChartBar,
      subItems: [
        { name: 'Vue générale', path: '/stats' },
        { name: 'Zombies', path: '/stats/zombies' }
      ]
    },
    { name: 'Logs & Événements', path: '/logs', icon: FaExclamation },
    { name: 'Paramètres', path: '/settings', icon: FaCog }
  ];
  
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  const isSubActive = (item) => {
    if (item.subItems) {
      return item.subItems.some(subItem => location.pathname === subItem.path);
    }
    return false;
  };
    return (
    <Box
      as="aside"
      position="fixed"
      left={isOpen ? 0 : "-250px"}
      width="250px"
      height="calc(100vh - 72px)" // Hauteur totale moins la navbar
      bg={bgColor}
      borderRight="1px"
      borderColor={borderColor}
      transition="left 0.3s ease"
      overflowY="auto"
      zIndex="docked"
      boxShadow={isOpen ? "5px 0 15px rgba(0, 255, 255, 0.05)" : "none"}
    >
      <VStack spacing={0} align="stretch">
        {navigationLinks.map((item) => (
          <Box key={item.path}>
            <Tooltip label={item.name} placement="right" hasArrow isDisabled={isOpen}>
              <Link
                as={NavLink}
                to={item.path}
                display="flex"
                alignItems="center"
                px={4}
                py={3}
                bg={(isActive(item.path) || isSubActive(item)) ? activeBgColor : 'transparent'}
                borderLeft={(isActive(item.path) || isSubActive(item)) ? '3px solid' : '3px solid transparent'}
                borderColor="teal.400"
                _hover={{ 
                  bg: hoverBgColor, 
                  textDecoration: 'none',
                  borderLeft: '3px solid',
                  borderColor: 'teal.400',
                  color: 'teal.300' 
                }}
                fontWeight={(isActive(item.path) || isSubActive(item)) ? 'medium' : 'normal'}
                color={(isActive(item.path) || isSubActive(item)) ? 'teal.300' : 'gray.300'}
              >
                <Icon 
                  as={item.icon} 
                  mr={3} 
                  boxSize={5} 
                  color={(isActive(item.path) || isSubActive(item)) ? 'teal.400' : 'gray.400'} 
                />
                <Text>{item.name}</Text>
              </Link>
            </Tooltip>
            
            {item.subItems && (              <VStack spacing={0} align="stretch" pl={6} mt={1} mb={1}>
                {item.subItems.map((subItem) => (
                  <Link
                    key={subItem.path}
                    as={NavLink}
                    to={subItem.path}
                    display="flex"
                    alignItems="center"
                    px={4}
                    py={2}
                    bg={isActive(subItem.path) ? 'rgba(0, 230, 230, 0.1)' : 'transparent'}
                    borderLeft={isActive(subItem.path) ? '2px solid' : '2px solid transparent'}
                    borderColor="teal.400"
                    _hover={{ 
                      bg: 'rgba(0, 230, 230, 0.08)', 
                      textDecoration: 'none',
                      borderLeft: '2px solid',
                      borderColor: 'teal.600',
                      color: 'teal.300' 
                    }}
                    fontWeight={isActive(subItem.path) ? 'medium' : 'normal'}
                    fontSize="sm"
                    color={isActive(subItem.path) ? 'teal.300' : 'gray.400'}
                  >
                    <Text>{subItem.name}</Text>
                    {subItem.name === 'Zombies' && (
                      <Badge ml={2} colorScheme="teal" variant="solid" size="xs">Hot</Badge>
                    )}
                  </Link>
                ))}
              </VStack>
            )}
          </Box>
        ))}
          <Divider my={2} borderColor="teal.900" />
        
        <Text px={4} py={2} fontSize="xs" color="teal.600">
          Plugins
        </Text>
        
        {/* Exemples de plugins - À dynamiser avec les plugins réellement chargés */}
        <Link
          display="flex"
          alignItems="center"
          px={4}
          py={3}
          _hover={{ bg: hoverBgColor, textDecoration: 'none' }}
        >
          <Icon as={MdSecurity} mr={3} boxSize={5} />
          <Text>Anti-VPN</Text>
        </Link>
        
        <Link
          display="flex"
          alignItems="center"
          px={4}
          py={3}
          _hover={{ bg: hoverBgColor, textDecoration: 'none' }}
        >
          <Icon as={FaBrain} mr={3} boxSize={5} />
          <Text>Zombies Stats</Text>
        </Link>
      </VStack>
    </Box>
  );
}

export default Sidebar;
