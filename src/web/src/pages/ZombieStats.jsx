import { Box, Heading, Container, Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import ZombiesStatsComponent from '../components/ZombiesStatsComponent';

/**
 * ZombieStats page component
 * Renders the ZombiesStatsComponent with a page layout
 */
const ZombieStats = () => {
  return (
    <Box p={4}>
      <Container maxW="container.xl">
        <Breadcrumb mb={4}>
          <BreadcrumbItem>
            <BreadcrumbLink as={RouterLink} to="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink as={RouterLink} to="/stats">Statistics</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>Zombies</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        
        <Heading size="lg" mb={6}>Zombie Statistics</Heading>
        
        <ZombiesStatsComponent />
      </Container>
    </Box>
  );
};

export default ZombieStats;
