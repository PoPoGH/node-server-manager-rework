import { useState } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Button,
  FormErrorMessage,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  Text,
  Select,
  InputGroup,
  InputLeftAddon,
  Tooltip,
  IconButton,
  useToast
} from '@chakra-ui/react';
import { FaQuestionCircle, FaCogs, FaPlay } from 'react-icons/fa';
import { setupService } from '../../services/setupService';

function ServerConfigStep({ data, onChange, onSubmit, isLoading }) {
  const [errors, setErrors] = useState({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const toast = useToast();
  const validateForm = () => {
    const newErrors = {};

    if (!data.ip) {
      newErrors.ip = 'L\'adresse IP est requise';
    }

    if (!data.port) {
      newErrors.port = 'Le port est requis';
    } else if (isNaN(Number(data.port)) || Number(data.port) <= 0 || Number(data.port) > 65535) {
      newErrors.port = 'Le port doit être un nombre valide entre 1 et 65535';
    }

    if (!data.rconPassword) {
      newErrors.rconPassword = 'Le mot de passe RCON est requis';
    }

    if (!data.logFile) {
      newErrors.logFile = 'Le chemin du fichier de log est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
    
    // Clear error when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: undefined });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit();
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTestingConnection(true);
      
      if (!data.ip || !data.port || !data.rconPassword) {
        toast({
          title: 'Information manquante',
          description: 'Veuillez remplir l\'adresse IP, le port et le mot de passe RCON pour tester la connexion',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      // Format the server config for the test
      const testConfig = {
        serverIP: data.ip,
        serverPort: data.port,
        serverPassword: data.rconPassword,
        game: data.game
      };
      
      const result = await setupService.testServerConnection(testConfig);
      
      if (result.success) {
        toast({
          title: 'Connexion réussie',
          description: 'La connexion au serveur a été établie avec succès',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Échec de la connexion',
          description: result.message || 'Impossible de se connecter au serveur. Vérifiez vos paramètres.',
          status: 'error',
          duration: 7000,
          isClosable: true,
        });
      }    } catch (error) {
      console.error('Erreur lors du test de connexion:', error);
      
      // Message spécifique pour les timeouts (serveur hors ligne ou inaccessible)
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast({
          title: 'Serveur inaccessible',
          description: 'Le serveur ne répond pas. Vérifiez que votre serveur est bien démarré, que l\'adresse IP et le port sont corrects, et qu\'aucun pare-feu ne bloque la connexion.',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Erreur',
          description: error.message || 'Une erreur est survenue lors du test de connexion',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>      <VStack spacing={6} align="stretch">        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Text>
            Configurez votre premier serveur Plutonium pour commencer à l'administrer.
            <br />Le nom du serveur sera automatiquement récupéré via RCON.
            <br />Vous pourrez ajouter d'autres serveurs plus tard.
            <br /><strong>Important:</strong> Assurez-vous que votre serveur est en ligne et accessible avant de tester la connexion.
          </Text>
        </Alert>

        <HStack spacing={4} align="flex-start">
          <FormControl id="ip" isRequired isInvalid={!!errors.ip}>
            <FormLabel>Adresse IP</FormLabel>
            <Input
              name="ip"
              value={data.ip}
              onChange={handleChange}
              placeholder="Ex: 127.0.0.1"
            />
            <FormErrorMessage>{errors.ip}</FormErrorMessage>
          </FormControl>

          <FormControl id="port" isRequired isInvalid={!!errors.port}>
            <FormLabel>Port</FormLabel>
            <Input
              name="port"
              value={data.port}
              onChange={handleChange}
              placeholder="Ex: 4976"
            />
            <FormErrorMessage>{errors.port}</FormErrorMessage>
          </FormControl>
        </HStack>

        <FormControl id="rconPassword" isRequired isInvalid={!!errors.rconPassword}>
          <FormLabel>
            Mot de passe RCON
            <Tooltip label="Le mot de passe configuré dans votre serveur pour les commandes à distance">
              <IconButton
                icon={<FaQuestionCircle />}
                size="xs"
                variant="ghost"
                aria-label="Information sur le mot de passe RCON"
                ml={1}
              />
            </Tooltip>
          </FormLabel>
          <Input
            name="rconPassword"
            type="password"
            value={data.rconPassword}
            onChange={handleChange}
            placeholder="Mot de passe RCON"
          />
          <FormErrorMessage>{errors.rconPassword}</FormErrorMessage>
        </FormControl>

        <FormControl id="game" isRequired>
          <FormLabel>Type de jeu</FormLabel>
          <Select 
            name="game"
            value={data.game}
            onChange={handleChange}
          >
            <option value="t6">Black Ops II (T6)</option>
            <option value="iw5">Modern Warfare 3 (IW5)</option>
            <option value="iw4">Modern Warfare 2 (IW4)</option>
            <option value="t4">World at War (T4)</option>
          </Select>
        </FormControl>

        <FormControl id="logFile" isRequired isInvalid={!!errors.logFile}>
          <FormLabel>
            Fichier de log
            <Tooltip label="Chemin complet vers le fichier de log de votre serveur">
              <IconButton
                icon={<FaQuestionCircle />}
                size="xs"
                variant="ghost"
                aria-label="Information sur le fichier de log"
                ml={1}
              />
            </Tooltip>
          </FormLabel>
          <InputGroup>
            <InputLeftAddon>
              <FaPlay size="0.8em" />
            </InputLeftAddon>
            <Input
              name="logFile"
              value={data.logFile}
              onChange={handleChange}
              placeholder="Ex: D:\Plutonium\storage\t6\mp_server.log"
            />
          </InputGroup>
          <FormErrorMessage>{errors.logFile}</FormErrorMessage>
        </FormControl>

        <HStack spacing={4} justify="flex-end">
          <Button
            leftIcon={<FaCogs />}
            onClick={handleTestConnection}
            isLoading={isTestingConnection}
            loadingText="Test en cours..."
          >
            Tester la connexion
          </Button>
          <Button 
            type="submit" 
            colorScheme="blue"
            isLoading={isLoading}
          >
            Sauvegarder le serveur
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}

export default ServerConfigStep;
