import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Text,
  Button,
  Heading,
  Flex,
  Stack,
  Step,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepStatus,
  StepTitle,
  Stepper,
  useSteps,
  useToast,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Progress
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { setupService } from '../services/setupService';

// Step components
import PasswordStep from '../components/setup/PasswordStep';
import ServerConfigStep from '../components/setup/ServerConfigStep';
import GameTokenStep from '../components/setup/GameTokenStep';

// Steps configuration
const steps = [
  { title: 'Sécurité', description: 'Changez le mot de passe administrateur' },
  { title: 'Serveur', description: 'Configurez votre premier serveur Plutonium' },
  { title: 'Liaison', description: 'Liez votre compte web à votre compte en jeu' }
];

function InitialSetup() {
  // Nous utiliserons un état local pour l'étape active, puis nous l'initialiserons avec les données utilisateur
  const [internalActiveStep, setInternalActiveStep] = useState(0);
  
  const { activeStep, setActiveStep } = useSteps({
    index: internalActiveStep,
    count: steps.length,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [stepData, setStepData] = useState({
    password: { currentPassword: 'admin', newPassword: '', confirmPassword: '' },
    server: { ip: '', port: '', rconPassword: '', game: 't6', logFile: '' },
    token: { generatedToken: '', enteredToken: '' }
  });
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser, updateUserProfile } = useAuth();
  
  // Références pour suivre l'état et éviter les initialisations/mises à jour multiples
  const hasInitializedRef = React.useRef(false);
  const lastSavedStepRef = React.useRef(currentUser?.setupStep || 1);
  
  // Effet pour initialiser l'étape active en fonction du profil utilisateur
  useEffect(() => {
    const initSetupStep = async () => {
      // Éviter l'initialisation multiple pour un même utilisateur
      if (hasInitializedRef.current) {
        console.log('Initialisation déjà effectuée, ignorée');
        setIsInitializing(false);
        return;
      }

      try {
        // Debug du profil utilisateur
        console.log('Initialisation étape de configuration avec profil utilisateur:', currentUser);
        
        // Si l'utilisateur a déjà une étape de configuration enregistrée, l'utiliser
        if (currentUser && currentUser.setupStep) {
          console.log('Étape de configuration trouvée dans le profil utilisateur:', currentUser.setupStep);
          
          // Les étapes dans l'API commencent à 1, mais notre index commence à 0
          const stepIndex = Math.min(currentUser.setupStep - 1, steps.length - 1);
          console.log('Réglage de l\'étape active à:', stepIndex);
          
          // Marquer comme initialisé une fois que nous avons les données de l'utilisateur
          hasInitializedRef.current = true;
          
          setInternalActiveStep(stepIndex);
          setActiveStep(stepIndex);
          
          // Sauvegarder l'étape actuelle dans sessionStorage pour la récupérer en cas de redémarrage
          sessionStorage.setItem('currentSetupStep', stepIndex.toString());
          
          // Si l'utilisateur a terminé la configuration, rediriger vers la page d'accueil
          if (currentUser.hasCompletedSetup) {
            console.log('Configuration terminée, redirection vers la page d\'accueil');
            navigate('/');
            return;
          }
          
          // Stockage local pour persister l'étape même en cas de problèmes de connexion
          sessionStorage.setItem('currentSetupStep', stepIndex.toString());
        } else {
          console.log('Aucune étape de configuration trouvée dans le profil utilisateur');
          
          // Essayer de récupérer depuis le stockage local de session
          const savedStep = sessionStorage.getItem('currentSetupStep');
          if (savedStep) {
            const stepIndex = parseInt(savedStep);
            console.log('Étape récupérée du stockage local:', stepIndex);
            setInternalActiveStep(stepIndex);
            setActiveStep(stepIndex);
          } else {
            console.log('Utilisation de l\'étape 1 par défaut');
          }
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'étape de configuration:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    // N'initialiser que si currentUser est défini
    if (currentUser) {
      initSetupStep();
    }  }, [currentUser, navigate, setActiveStep, steps.length]);
  
  // Effet pour mettre à jour l'étape de configuration dans le backend
  useEffect(() => {
    // Ne pas mettre à jour lors de l'initialisation
    if (isInitializing) return;
    
    // Ne mettre à jour que si l'étape a changé et est différente de celle déjà en base
    const newStepValue = activeStep + 1;
    if (newStepValue === lastSavedStepRef.current) {
      console.log(`L'étape ${newStepValue} est déjà sauvegardée, aucune mise à jour nécessaire`);
      return;
    }
    
    // Enregistrer la nouvelle valeur dans la référence pour éviter les appels en double
    lastSavedStepRef.current = newStepValue;
    
    const updateBackendStep = async () => {
      try {
        // L'API attend un numéro d'étape commençant à 1
        console.log(`Mise à jour de l'étape de configuration dans le backend: ${newStepValue}`);
        
        const result = await setupService.updateSetupStep(newStepValue);
        
        // Mettre à jour le profil utilisateur avec le nouveau token si disponible
        if (result && result.success && result.token && result.user) {
          console.log('Mise à jour du profil utilisateur avec les nouvelles informations');
          await updateUserProfile(result.user);
          console.log('Profil utilisateur mis à jour avec succès');
        }
      } catch (error) {
        // En cas d'erreur 429 (Too Many Requests), ne pas réessayer
        if (error.response && error.response.status === 429) {
          console.warn('Trop de requêtes, limitation d\'API active. L\'étape sera mise à jour ultérieurement.');
        } else {
          console.error('Erreur lors de la mise à jour de l\'étape de configuration:', error);
        }
      }
    };
    
    // Utiliser un timeout pour éviter les appels trop rapprochés
    const timeoutId = setTimeout(() => {
      updateBackendStep();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [activeStep, isInitializing, updateUserProfile, currentUser]);
  const handleNext = () => {
    const nextStep = activeStep + 1;
    setActiveStep(nextStep);
    
    // Sauvegarder l'étape dans le stockage de session pour la récupérer même en cas de problèmes réseau
    sessionStorage.setItem('currentSetupStep', nextStep.toString());
  };

  const handleBack = () => {
    const prevStep = activeStep - 1;
    setActiveStep(prevStep);
    
    // Sauvegarder l'étape dans le stockage de session pour la récupérer même en cas de problèmes réseau
    sessionStorage.setItem('currentSetupStep', prevStep.toString());
  };

  const handleStepDataChange = (step, data) => {
    setStepData(prevData => ({
      ...prevData,
      [step]: { ...prevData[step], ...data }
    }));
  };

  const handleStepSubmit = async (stepId) => {
    setIsLoading(true);
    
    try {
      switch(stepId) {
        case 'password':
          // Handle password change
          const { currentPassword, newPassword } = stepData.password;
          const passwordResult = await setupService.updateProfile({ 
            currentPassword, 
            newPassword
          });
          
          if (passwordResult.success) {
            // Update user profile in context
            await updateUserProfile(passwordResult.user);
            toast({
              title: 'Mot de passe mis à jour',
              description: 'Votre mot de passe administrateur a été modifié avec succès',
              status: 'success',
              duration: 5000,
              isClosable: true,
            });
            handleNext();
          }
          break;
          
        case 'server':
          // Handle server configuration
          const serverConfig = stepData.server;
          const serverResult = await setupService.saveServerConfig(serverConfig);
            if (serverResult.success) {
            toast({
              title: 'Serveur configuré',
              description: 'Le serveur a été configuré avec succès',
              status: 'success',
              duration: 5000,
              isClosable: true,
            });
            handleNext();
          }
          break;
            case 'token':          // Handle token linking
          if (stepData.token.enteredToken) {            console.log('Application du jeton de jeu:', stepData.token.enteredToken);
            
            // Si le token a déjà été validé via .st, on peut sauter l'appel API et terminer
            if (stepData.token.gameId && stepData.token.gameUsername) {
              console.log('Token déjà utilisé et validé, compte déjà lié avec:', stepData.token.gameUsername);
              
              // Marquer la configuration comme terminée (dernière étape)
              console.log('Mise à jour de l\'étape de configuration finale:', steps.length);
              const updateStepResult = await setupService.updateSetupStep(steps.length);
              console.log('Résultat de la mise à jour de l\'étape:', updateStepResult);
              
              // Mettre à jour le profil et terminer
              console.log('Mise à jour du profil utilisateur avec état de configuration terminée');
              await updateUserProfile({
                ...updateStepResult.user,
                hasCompletedSetup: true,
                setupStep: steps.length
              });
              
            } else {
              try {
                // Appliquer le token uniquement si nécessaire
                const tokenResult = await setupService.applyGameToken(stepData.token.enteredToken);
                
                if (tokenResult.success) {
                  console.log('Jeton de jeu appliqué avec succès:', tokenResult);
                  
                  // Marquer la configuration comme terminée (dernière étape)
                  console.log('Mise à jour de l\'étape de configuration finale:', steps.length);
                  const updateStepResult = await setupService.updateSetupStep(steps.length);
                  console.log('Résultat de la mise à jour de l\'étape:', updateStepResult);
                  
                  // Mettre à jour le profil avec les résultats
                  console.log('Mise à jour du profil utilisateur avec état de configuration terminée');
                  await updateUserProfile({
                    ...tokenResult.user,
                    hasCompletedSetup: true,
                    setupStep: steps.length
                  });
                }
              } catch (error) {
                console.error('Erreur lors de l\'application du token:', error);
                // Si erreur 404, c'est probablement un problème de chemin d'API - continuer quand même
                if (error.response && error.response.status === 404) {
                  console.warn('Erreur 404 détectée sur l\'endpoint apply-game-token, tentative de continuer...');
                  
                  // Essayer de mettre à jour directement l'étape
                  const updateStepResult = await setupService.updateSetupStep(steps.length);
                  console.log('Mise à jour de l\'étape malgré l\'erreur:', updateStepResult);
                  
                  if (updateStepResult.success) {
                    await updateUserProfile({
                      ...updateStepResult.user,
                      hasCompletedSetup: true,
                      setupStep: steps.length
                    });
                  } else {
                    throw new Error('Impossible de terminer la configuration');
                  }
                } else {
                  throw error; // Relancer pour le catch global
                }
              }
            }
            
            toast({
              title: 'Configuration terminée',
              description: 'Votre compte web a été lié à votre compte en jeu. La configuration initiale est maintenant terminée.',
              status: 'success',
              duration: 5000,
              isClosable: true,
            });
            
            console.log('Redirection vers le tableau de bord dans 2 secondes...');
            // Setup complete - redirect to dashboard after a short delay
            setTimeout(() => {
              navigate('/');
            }, 2000);
          } else {
            toast({
              title: 'Token requis',
              description: 'Veuillez entrer un token valide',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          }
          break;
          
        default:
          console.error('Unknown step ID:', stepId);
      }
    } catch (error) {
      console.error(`Error in step ${stepId}:`, error);
      toast({
        title: 'Erreur',
        description: error.message || `Une erreur est survenue lors de l'étape ${stepId}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <PasswordStep 
            data={stepData.password}
            onChange={(data) => handleStepDataChange('password', data)}
            onSubmit={() => handleStepSubmit('password')}
            isLoading={isLoading}
          />
        );
      case 1:
        return (
          <ServerConfigStep
            data={stepData.server}
            onChange={(data) => handleStepDataChange('server', data)}
            onSubmit={() => handleStepSubmit('server')}
            isLoading={isLoading}
          />
        );
      case 2:
        return (
          <GameTokenStep
            data={stepData.token}
            onChange={(data) => handleStepDataChange('token', data)}
            onSubmit={() => handleStepSubmit('token')}
            isLoading={isLoading}
          />
        );
      default:
        return <Box>Étape inconnue</Box>;
    }
  };
  return (
    <Flex 
      minHeight="100vh" 
      width="full" 
      align="center" 
      justifyContent="center" 
      p={4}
      bg="gray.800" 
      direction="column"
      className="setup-container"
    >
      <Box width="100%" maxWidth="900px" mb={8}>
        <Heading textAlign="center" mb={2} color="white">Configuration initiale</Heading>
        <Text textAlign="center" fontSize="lg" color="gray.300" mb={6}>
          Bienvenue sur Node Server Manager Rework. 
          Suivez ces étapes pour configurer votre installation.
        </Text>

        {/* Stepper component */}
        <Stepper index={activeStep} mb={8} size="lg" colorScheme="blue">
          {steps.map((step, index) => (
            <Step key={index}>
              <StepIndicator>
                <StepStatus
                  complete={<StepIcon />}
                  incomplete={<StepNumber />}
                  active={<StepNumber />}
                />
              </StepIndicator>
              <Box flexShrink="0">
                <StepTitle color="white">{step.title}</StepTitle>
              </Box>
            </Step>
          ))}
        </Stepper>

        {/* Step description */}
        <Card mb={6} variant="outline" bg="gray.700" color="white">
          <CardHeader pb={2}>
            <Heading size="md">{steps[activeStep].title}</Heading>
          </CardHeader>
          <CardBody pt={0}>
            <Text>{steps[activeStep].description}</Text>
          </CardBody>
        </Card>        {/* Current step content */}
        <Card variant="outline" bg="gray.700" color="white" borderColor="gray.600">
          <CardBody>
            {renderStepContent()}
          </CardBody>
          <CardFooter>
            <Flex width="100%" justify="space-between">
              <Button 
                onClick={handleBack} 
                isDisabled={activeStep === 0 || isLoading}
                colorScheme="blue"
                variant="outline"
              >
                Précédent
              </Button>
              <Progress 
                value={(activeStep + 1) / steps.length * 100} 
                size="sm" 
                width="50%" 
                alignSelf="center"
                borderRadius="md"
                colorScheme="blue"
              />
              {activeStep < steps.length - 1 ? (
                <Button 
                  colorScheme="blue" 
                  onClick={() => handleStepSubmit(Object.keys(stepData)[activeStep])}
                  isLoading={isLoading}
                >
                  Suivant
                </Button>
              ) : (
                <Button 
                  colorScheme="green" 
                  onClick={() => handleStepSubmit('token')}
                  isLoading={isLoading}
                >
                  Terminer
                </Button>
              )}
            </Flex>
          </CardFooter>
        </Card>
      </Box>
    </Flex>
  );
}

export default InitialSetup;
