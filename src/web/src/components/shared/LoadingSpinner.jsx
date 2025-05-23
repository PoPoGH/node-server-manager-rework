import { Box, Spinner, Text } from '@chakra-ui/react';

/**
 * Composant de chargement réutilisable
 * @param {Object} props - Les propriétés du composant
 * @param {string} props.text - Texte à afficher sous le spinner
 * @param {string} props.size - Taille du spinner (xs, sm, md, lg, xl)
 * @param {string} props.py - Padding vertical
 */
const LoadingSpinner = ({ text = 'Chargement en cours...', size = 'xl', py = 10 }) => {
  return (
    <Box textAlign="center" py={py}>
      <Spinner size={size} thickness="4px" speed="0.65s" color="blue.500" />
      {text && <Text mt={4}>{text}</Text>}
    </Box>
  );
};

export default LoadingSpinner;
