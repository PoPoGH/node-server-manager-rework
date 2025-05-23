import { 
  Box, Flex, IconButton, Heading, Spacer, Button, Badge, Text, Image, HStack, Icon,
  useColorMode
} from '@chakra-ui/react';
import { Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { FaBars, FaUser, FaMoon, FaSun, FaSignOutAlt, FaCog, FaUserCog, FaGamepad, FaServer } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function Navbar({ toggleSidebar }) {
  const { colorMode, toggleColorMode } = useColorMode();
  const { currentUser, logout, needsInitialSetup } = useAuth();
  const navigate = useNavigate();
  
  const navBg = 'gray.900';
  const borderColor = 'teal.800';
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const goToSetup = () => {
    navigate('/setup');
  };
    return (
    <Box
      as="nav"
      position="sticky"
      top="0"
      zIndex="sticky"
      bg={navBg}
      p={3}
      boxShadow="0 0 20px rgba(0, 255, 255, 0.1)"
      borderBottom="1px"
      borderColor={borderColor}
    >
      <Flex alignItems="center">
        <IconButton
          icon={<FaBars />}
          variant="ghost"
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
          mr={3}
          color="teal.400"
          _hover={{ bg: 'gray.800' }}
        />
        
        <HStack spacing={2}>
          <Icon as={FaServer} color="teal.400" boxSize={6} />
          <Heading as="h1" size="md" fontWeight="bold" color="teal.300">
            Node Server Manager
          </Heading>
          <Badge colorScheme="teal" variant="solid" fontSize="xs">
            REWORK
          </Badge>
        </HStack>
        
        <Spacer />
        
        <IconButton
          mr={3}
          icon={colorMode === 'dark' ? <FaSun /> : <FaMoon />}
          onClick={toggleColorMode}
          aria-label="Toggle Color Mode"
          variant="ghost"
          color="teal.400"
          _hover={{ bg: 'gray.800' }}
        />
        
        <Menu>          
          <MenuButton
            as={Button}
            rightIcon={<FaUser />}
            variant="ghost"
            bg="gray.800"
            color="teal.300"
            _hover={{ bg: 'gray.700' }}
            _active={{ bg: 'gray.700' }}
            borderWidth="1px"
            borderColor="teal.800"
            px={4}
          >
            <Text>{currentUser?.username || 'Utilisateur'}</Text>
            {needsInitialSetup() && (
              <Badge ml={2} colorScheme="red" variant="solid">
                !
              </Badge>
            )}
          </MenuButton>          <MenuList borderColor="teal.700" boxShadow="0 0 20px rgba(0, 255, 255, 0.15)">
            <MenuItem 
              icon={<Icon as={FaUserCog} color="teal.400" />} 
              onClick={goToSetup}
            >
              Configuration du compte
              {needsInitialSetup() && (
                <Badge ml={2} colorScheme="red" size="sm">Nouveau</Badge>
              )}
            </MenuItem>
            {currentUser?.gameUsername && (
              <MenuItem 
                icon={<Icon as={FaGamepad} color="purple.400" />} 
                isDisabled
              >
                Pseudo en jeu: {currentUser.gameUsername}
              </MenuItem>
            )}
            <MenuItem icon={<Icon as={FaCog} color="blue.400" />}>
              Paramètres
            </MenuItem>
            <MenuItem 
              icon={<Icon as={FaSignOutAlt} color="red.400" />} 
              onClick={handleLogout}
            >
              Déconnexion
            </MenuItem>
            <MenuItem 
              as="a" 
              href="#/zombies-stats" 
              icon={<Icon as={FaGamepad} color="green.400" />}
            >
              Zombies Stats
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>
    </Box>
  );
}

export default Navbar;
