import React from 'react';
import {
  Box,
  Heading,
  Text,
  Divider,
  Code,
  UnorderedList,
  ListItem,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useColorModeValue
} from '@chakra-ui/react';

/**
 * Component that explains the token system to users
 */
const TokenGuide = () => {
  const tableBgColor = useColorModeValue('gray.100', 'gray.700');
  const headingColor = useColorModeValue('blue.600', 'blue.300');

  return (
    <Box p={5}>
      <Heading as="h1" size="xl" mb={4} color={headingColor}>
        Guide du système de tokens
      </Heading>
      
      <Text mb={4}>
        Le Node Server Manager utilise un système de tokens pour lier les comptes web aux comptes de jeu.
        Il existe deux types de tokens différents ayant des objectifs distincts:
      </Text>
      
      <TableContainer mb={6}>
        <Table variant="simple">
          <Thead bgColor={tableBgColor}>
            <Tr>
              <Th>Type de Token</Th>
              <Th>Commande</Th>
              <Th>Utilisation</Th>
              <Th>Qui</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td>Token Administrateur</Td>
              <Td><Code>.st &lt;token&gt;</Code></Td>
              <Td>Unique (setup initial)</Td>
              <Td>Admin uniquement</Td>
            </Tr>
            <Tr>
              <Td>Token Utilisateur</Td>
              <Td><Code>.token &lt;token&gt;</Code></Td>
              <Td>À chaque nouveau compte</Td>
              <Td>Tous les joueurs</Td>
            </Tr>
          </Tbody>
        </Table>
      </TableContainer>
      
      <Divider my={6} />
      
      <Heading as="h2" size="lg" mb={4} color={headingColor}>
        Token administrateur (.st)
      </Heading>
      
      <Alert status="info" mb={4}>
        <AlertIcon />
        Ce token ne peut être utilisé qu'une seule fois lors de la configuration initiale du serveur.
      </Alert>
      
      <Text mb={3}>
        Le token administrateur permet au compte administrateur web de s'identifier dans le jeu. 
        Cette étape est obligatoire lors de la configuration initiale.
      </Text>
      
      <Heading as="h3" size="md" mt={4} mb={2}>
        Processus:
      </Heading>
      
      <UnorderedList spacing={2} mb={4}>
        <ListItem>Le token est généré automatiquement lors de la création du premier compte administrateur</ListItem>
        <ListItem>L'administrateur utilise la commande <Code>.st &lt;token&gt;</Code> dans la console du jeu</ListItem>
        <ListItem>Cette commande lie définitivement son compte de jeu à son compte web administrateur</ListItem>
        <ListItem>Le token devient invalide après utilisation</ListItem>
      </UnorderedList>
      
      <Divider my={6} />
      
      <Heading as="h2" size="lg" mb={4} color={headingColor}>
        Token utilisateur (.token)
      </Heading>
      
      <Text mb={3}>
        Les tokens utilisateurs permettent aux joueurs de lier leur compte web avec leur compte de jeu.
        Cette commande est utilisée pour tous les utilisateurs réguliers après la configuration initiale.
      </Text>
      
      <Heading as="h3" size="md" mt={4} mb={2}>
        Processus:
      </Heading>
      
      <UnorderedList spacing={2}>
        <ListItem>L'utilisateur crée un compte sur le site web</ListItem>
        <ListItem>Il génère un token dans son profil</ListItem>
        <ListItem>Il utilise la commande <Code>.token &lt;token&gt;</Code> dans la console du jeu</ListItem>
        <ListItem>Son compte de jeu est lié à son compte web</ListItem>
      </UnorderedList>
      
      <Divider my={6} />
      
      <Heading as="h3" size="md" mb={4}>
        FAQ
      </Heading>
      
      <Text fontWeight="bold">Que faire si je perds mon token?</Text>
      <Text mb={3}>
        Vous pouvez générer un nouveau token dans votre profil utilisateur.
      </Text>
      
      <Text fontWeight="bold">Puis-je lier plusieurs comptes de jeu à un même compte web?</Text>
      <Text mb={3}>
        Non, un compte web ne peut être lié qu'à un seul compte de jeu.
      </Text>
      
      <Text fontWeight="bold">Que faire si l'administrateur a déjà utilisé son token mais doit à nouveau lier son compte?</Text>
      <Text>
        Dans ce cas, l'administrateur doit utiliser le script <Code>setup-admin-token.bat</Code> dans le dossier
        <Code>scripts/diagnostic</Code> pour générer un nouveau token administrateur.
      </Text>
    </Box>
  );
};

export default TokenGuide;
