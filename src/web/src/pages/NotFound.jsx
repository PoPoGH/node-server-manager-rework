import { Box, Heading, Text, Button, VStack, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

function NotFound() {
  return (
    <Box 
      textAlign="center"
      py={10} 
      px={6}
    >
      <VStack spacing={6}>
        <Heading
          as="h1"
          size="4xl"
          bgGradient="linear(to-r, brand.500, accent.500)"
          bgClip="text"
        >
          404
        </Heading>
        
        <Heading as="h2" size="xl">
          Page non trouvée
        </Heading>
        
        <Text color={useColorModeValue('gray.600', 'gray.400')}>
          La page que vous recherchez n'existe pas ou a été déplacée.
        </Text>
        
        <Button 
          as={RouterLink} 
          to="/"
          colorScheme="blue" 
          size="lg"
        >
          Retour à l'accueil
        </Button>
      </VStack>
    </Box>
  );
}

export default NotFound;
