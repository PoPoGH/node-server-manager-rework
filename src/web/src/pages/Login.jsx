import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Flex, 
  Heading, 
  FormControl, 
  FormLabel, 
  Input, 
  Button, 
  Text, 
  Alert, 
  AlertIcon,
  InputGroup,
  InputRightElement,
  IconButton,
  useColorModeValue
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
    const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    
    try {
      setError('');
      setIsLoading(true);
      
      console.log('Envoi de la demande de connexion...');
      const result = await login(username, password);
      console.log('Résultat de la demande de connexion:', result);
      
      if (result.success) {
        console.log('Connexion réussie, redirection vers la page d\'accueil');
        navigate('/');
      } else {
        console.error('Échec de la connexion:', result.error);
        setError(result.error || 'Échec de la connexion');
      }
    } catch (error) {
      console.error('Exception lors de la connexion:', error);
      setError(`Erreur lors de la tentative de connexion: ${error.message}`);
    } finally {
      console.log('Fin du processus de connexion');
      setIsLoading(false);
    }
  };
  
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <Flex 
      minH="100vh" 
      align="center" 
      justify="center" 
      bg={useColorModeValue('gray.50', 'gray.900')}
    >
      <Box
        w="full"
        maxW="md"
        p={8}
        borderWidth="1px"
        borderRadius="lg"
        boxShadow="lg"
        bg={bgColor}
        borderColor={borderColor}
      >
        <Box textAlign="center" mb={8}>
          <Heading size="xl">Node Server Manager</Heading>
          <Text mt={2} color={useColorModeValue('gray.600', 'gray.400')}>
            Connectez-vous pour gérer vos serveurs
          </Text>
        </Box>
        
        {error && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <FormControl id="username" mb={4} isRequired>
            <FormLabel>Nom d'utilisateur</FormLabel>
            <Input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez votre nom d'utilisateur"
            />
          </FormControl>
          
          <FormControl id="password" mb={6} isRequired>
            <FormLabel>Mot de passe</FormLabel>
            <InputGroup>
              <Input 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
              />
              <InputRightElement>
                <IconButton
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  icon={showPassword ? <FaEyeSlash /> : <FaEye />}
                  onClick={toggleShowPassword}
                  variant="ghost"
                  size="sm"
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>
          
          <Button
            type="submit"
            colorScheme="blue"
            size="lg"
            width="full"
            isLoading={isLoading}
            loadingText="Connexion en cours..."
          >
            Se connecter
          </Button>
        </form>
      </Box>
    </Flex>
  );
}

export default Login;
