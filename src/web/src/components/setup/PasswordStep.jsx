import { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Button,
  InputGroup,
  InputRightElement,
  IconButton,
  FormErrorMessage,
  Alert,
  AlertIcon,
  Text,
  VStack,
  FormHelperText
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

function PasswordStep({ data, onChange, onSubmit, isLoading }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!data.newPassword) {
      newErrors.newPassword = 'Le nouveau mot de passe est requis';
    } else if (data.newPassword.length < 8) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    if (!data.confirmPassword) {
      newErrors.confirmPassword = 'Veuillez confirmer votre mot de passe';
    } else if (data.newPassword !== data.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
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
  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack spacing={6} align="stretch">
        <Alert status="info" borderRadius="md" bg="blue.800" color="white">
          <AlertIcon />
          <Text>
            Pour des raisons de sécurité, veuillez changer le mot de passe administrateur par défaut.
            <br />Le mot de passe par défaut est <strong>admin</strong>.
          </Text>
        </Alert>

        <FormControl id="currentPassword" isRequired>
          <FormLabel color="gray.200">Mot de passe actuel</FormLabel>
          <Input
            name="currentPassword"
            type="password"
            value={data.currentPassword}
            onChange={handleChange}
            isReadOnly
            bg="gray.600"
            color="gray.300"
            borderColor="gray.500"
          />
          <FormHelperText color="gray.400">Mot de passe par défaut (non modifiable)</FormHelperText>
        </FormControl>

        <FormControl id="newPassword" isRequired isInvalid={!!errors.newPassword}>
          <FormLabel color="gray.200">Nouveau mot de passe</FormLabel>          <InputGroup>
            <Input
              name="newPassword"
              type={showPassword ? 'text' : 'password'}
              value={data.newPassword}
              onChange={handleChange}
              placeholder="Entrez un nouveau mot de passe sécurisé"
              autoComplete="new-password"
              bg="gray.600"
              color="white"
              borderColor="gray.500"
              _hover={{ borderColor: "blue.400" }}
              _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
            />
            <InputRightElement>
              <IconButton
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                icon={showPassword ? <FaEyeSlash /> : <FaEye />}
                onClick={() => setShowPassword(!showPassword)}
                variant="ghost"
                size="sm"
                color="gray.300"
              />
            </InputRightElement>
          </InputGroup>
          <FormErrorMessage>{errors.newPassword}</FormErrorMessage>
          <FormHelperText color="gray.400">Minimum 8 caractères</FormHelperText>
        </FormControl>        <FormControl id="confirmPassword" isRequired isInvalid={!!errors.confirmPassword}>
          <FormLabel color="gray.200">Confirmer le mot de passe</FormLabel>          <InputGroup>
            <Input
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={data.confirmPassword}
              onChange={handleChange}
              placeholder="Confirmez votre nouveau mot de passe"
              autoComplete="new-password"
              bg="gray.600"
              color="white"
              borderColor="gray.500"
              _hover={{ borderColor: "blue.400" }}
              _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
            />
            <InputRightElement>
              <IconButton
                aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                icon={showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                variant="ghost"
                size="sm"
                color="gray.300"
              />
            </InputRightElement>
          </InputGroup>
          <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
        </FormControl>

        <Box textAlign="right" mt={4}>
          <Button 
            type="submit" 
            colorScheme="blue"
            isLoading={isLoading}
          >
            Mettre à jour le mot de passe
          </Button>
        </Box>
      </VStack>
    </Box>
  );
}

export default PasswordStep;
