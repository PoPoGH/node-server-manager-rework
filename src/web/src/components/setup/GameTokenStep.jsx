import { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Alert,
  AlertIcon,
  Text,
  HStack,
  Code,
  Divider,
  useToast,
  FormErrorMessage,
  Card,
  CardBody,
  OrderedList,
  ListItem,
  Badge,
  Progress,
  Flex
} from '@chakra-ui/react';
import { FaGamepad, FaSync, FaCheck } from 'react-icons/fa';
import { setupService } from '../../services/setupService';

function GameTokenStep({ data, onChange, onSubmit, isLoading }) {
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const [tokenUsed, setTokenUsed] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();
  // Vérifier périodiquement si le token a été utilisé
  useEffect(() => {
    let intervalId = null;
    
    const checkTokenStatus = async () => {
      if (!data.generatedToken || tokenUsed) return;
      
      try {
        setIsCheckingToken(true);
        console.log(`Vérification du statut du token: ${data.generatedToken}`);
        const result = await setupService.checkTokenStatus(data.generatedToken);
        console.log('Résultat de la vérification:', result);
        
        if (result.success && result.tokenUsed) {
          // Le token a été utilisé avec succès
          setTokenUsed(true);
          
          // Automatiquement soumettre le token pour finaliser la configuration mais seulement si compte est bien lié
          if (result.gameId && result.gameUsername) {
            console.log(`Token utilisé avec succès par ${result.gameUsername} (ID: ${result.gameId})`);
            
            onChange({ 
              ...data, 
              enteredToken: data.generatedToken,
              gameId: result.gameId,
              gameUsername: result.gameUsername,
              hasCompletedSetup: result.hasCompletedSetup
            });
            
            toast({
              title: 'Compte lié avec succès !',
              description: `Votre compte a été lié au compte jeu "${result.gameUsername}". Vous pouvez maintenant terminer la configuration.`,
              status: 'success',
              duration: 5000,
              isClosable: true,
            });
            
            // Arrêter la vérification
            clearInterval(intervalId);
            // Soumettre automatiquement après un court délai pour montrer le message de succès
            setTimeout(() => {
              console.log('Soumission automatique du formulaire après liaison réussie');
              onSubmit();
            }, 2000);
          } else {
            // Le token a été utilisé mais sans liaison complète
            console.warn('Token utilisé mais sans liaison complète');
            toast({
              title: 'Token utilisé',
              description: 'Le token a été utilisé mais la liaison du compte n\'est pas complète.',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du statut du token:', error);
      } finally {
        setIsCheckingToken(false);
      }
    };
    
    // Démarrer la vérification périodique si un token est généré et pas encore utilisé
    if (data.generatedToken && !tokenUsed) {
      // Vérifier immédiatement puis toutes les 5 secondes
      checkTokenStatus();
      intervalId = setInterval(checkTokenStatus, 5000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [data.generatedToken, tokenUsed, onChange, onSubmit, toast]);

  const validateForm = () => {
    // Si le token a été utilisé, on peut toujours soumettre
    if (tokenUsed) return true;
    
    const newErrors = {};
    
    // Vérification uniquement si on utilise la saisie manuelle (cas rare)
    if (!data.generatedToken && !data.enteredToken) {
      newErrors.enteredToken = 'Veuillez générer ou entrer un token';
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
  };  const handleGenerateToken = async () => {
    try {
      setIsGeneratingToken(true);
      const result = await setupService.generateGameToken();
      
      if (result.success && result.gameToken) {
        onChange({ 
          ...data, 
          generatedToken: result.gameToken,
          isAdminSetup: result.isAdminSetup
        });
        
        const tokenType = result.isAdminSetup ? "d'administration" : 'de jeu';
        
        toast({
          title: 'Token généré',
          description: `Un nouveau token ${tokenType} a été généré avec succès`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Erreur',
          description: 'Impossible de générer un token',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la génération du token:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la génération du token',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsGeneratingToken(false);
    }
  };
  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack spacing={6} align="stretch">        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Text>
            Liez votre compte administrateur web à votre compte en jeu en utilisant la commande <Code>.st</Code>.
            <br />Cette étape est nécessaire pour vous identifier comme administrateur dans le jeu et ne peut être réalisée qu'une seule fois.
          </Text>
        </Alert><Card variant="outline">
          <CardBody>
            <Text fontWeight="bold" mb={3}>Comment lier votre compte administrateur:</Text>
            <OrderedList spacing={3}>
              <ListItem>Cliquez sur "Générer un token" ci-dessous</ListItem>
              <ListItem>Ouvrez le jeu et connectez-vous au serveur</ListItem>
              <ListItem>Dans la console du jeu, copiez et collez la commande <Code>.st</Code> qui s'affichera ici</ListItem>
              <ListItem>Le site détectera automatiquement quand votre compte est lié et passera à l'étape suivante</ListItem>
            </OrderedList>
            <Text mt={3} fontSize="sm" color="gray.500">
              Cette commande spéciale <Code>.st</Code> est réservée à la configuration initiale de l'administrateur.
              Les utilisateurs normaux utiliseront la commande <Code>.ts</Code> par la suite.
            </Text>
          </CardBody>
        </Card>

        <Box>
          <Button
            leftIcon={<FaGamepad />}
            onClick={handleGenerateToken}
            colorScheme="green"
            isLoading={isGeneratingToken}
            loadingText="Génération..."
            mb={4}
            isDisabled={tokenUsed}
          >
            Générer un token
          </Button>
            {data.generatedToken && !tokenUsed && (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <VStack align="start" width="100%">
                <Text>Copiez et collez cette commande dans la console du jeu :</Text>          <Code fontSize="xl" padding={2} width="100%" textAlign="center">
                  {`.st ${data.generatedToken}`}
                </Code>
                <Flex align="center" width="100%" mt={2}>
                  <Text fontSize="sm" flex="1">
                    {isCheckingToken ? 'Vérification en cours...' : 'En attente de la liaison du compte...'}
                  </Text>
                  <Progress size="xs" isIndeterminate colorScheme="blue" flex="2" mr={2} />
                </Flex>
              </VStack>
            </Alert>
          )}
          
          {tokenUsed && (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <VStack align="start" width="100%">
                <Flex alignItems="center" width="100%">
                  <Badge colorScheme="green" fontSize="md" mr={2}>
                    <Flex alignItems="center">
                      <FaCheck style={{ marginRight: '5px' }} />
                      Compte lié avec succès
                    </Flex>
                  </Badge>
                </Flex>
                <Text>Votre compte a été lié avec succès ! Cliquez sur "Terminer" pour finaliser la configuration.</Text>
              </VStack>
            </Alert>
          )}
        </Box>        {tokenUsed ? (
          <HStack spacing={4} justify="flex-end">
            <Button 
              type="submit" 
              colorScheme="blue"
              isLoading={isLoading}
              rightIcon={<FaCheck />}
            >
              Terminer
            </Button>
          </HStack>
        ) : (
          <HStack spacing={4} justify="flex-end">
            {data.generatedToken && (
              <Button
                leftIcon={<FaSync />}
                onClick={handleGenerateToken}
                isLoading={isGeneratingToken}
                variant="outline"
              >
                Regénérer un token
              </Button>
            )}
            {/* Bouton de validation manuelle supprimé car redondant - 
                le système attend automatiquement la validation du token */}
          </HStack>
        )}
      </VStack>
    </Box>
  );
}

export default GameTokenStep;
