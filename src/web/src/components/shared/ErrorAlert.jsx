import { Box, Heading, Text, Button, Icon } from '@chakra-ui/react';
import { FaExclamationTriangle } from 'react-icons/fa';

/**
 * Composant d'affichage d'erreur réutilisable
 * @param {Object} props - Les propriétés du composant
 * @param {string} props.title - Titre de l'erreur
 * @param {string} props.message - Message d'erreur détaillé
 * @param {Function} props.onRetry - Fonction à exécuter lors du clic sur le bouton "Réessayer"
 * @param {React.ReactNode} props.action - Bouton d'action alternatif
 */
const ErrorAlert = ({ 
  title = 'Erreur', 
  message = 'Une erreur est survenue.', 
  onRetry, 
  action 
}) => {
  return (
    <Box p={5} textAlign="center">
      <Icon as={FaExclamationTriangle} boxSize={10} color="red.500" mb={4} />
      <Heading size="md" mb={2}>{title}</Heading>
      <Text mb={4}>{message}</Text>
      {onRetry && (
        <Button onClick={onRetry} colorScheme="blue" mr={action ? 2 : 0}>
          Réessayer
        </Button>
      )}
      {action}
    </Box>
  );
};

export default ErrorAlert;
