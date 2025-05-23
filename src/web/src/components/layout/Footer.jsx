import { Box, Text, Flex, Link, useColorModeValue } from '@chakra-ui/react';

function Footer() {
  const footerBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  
  return (
    <Box 
      as="footer"
      bg={footerBg}
      borderTop="1px"
      borderColor={borderColor}
      py={3}
      px={4}
    >
      <Flex 
        direction={{ base: 'column', md: 'row' }}
        alignItems="center"
        justifyContent="space-between"
      >
        <Text fontSize="sm" color={textColor}>
          &copy; {new Date().getFullYear()} Node Server Manager Unified
        </Text>
        
        <Flex gap={4}>
          <Link fontSize="sm" color={textColor} href="#" isExternal>
            Documentation
          </Link>
          <Link fontSize="sm" color={textColor} href="#" isExternal>
            Support
          </Link>
          <Link fontSize="sm" color={textColor} href="https://github.com" isExternal>
            GitHub
          </Link>
        </Flex>
      </Flex>
    </Box>
  );
}

export default Footer;
