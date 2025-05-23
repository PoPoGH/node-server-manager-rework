import React from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button
} from '@chakra-ui/react';

/**
 * Composant de dialogue de confirmation réutilisable
 * @param {Object} props - Les propriétés du composant
 * @param {boolean} props.isOpen - État d'ouverture du dialogue
 * @param {Function} props.onClose - Fonction à exécuter lors de la fermeture
 * @param {Function} props.onConfirm - Fonction à exécuter lors de la confirmation
 * @param {string} props.title - Titre du dialogue
 * @param {string} props.message - Message de confirmation
 * @param {string} props.confirmLabel - Texte du bouton de confirmation
 * @param {string} props.cancelLabel - Texte du bouton d'annulation
 * @param {string} props.confirmColorScheme - Couleur du bouton de confirmation
 * @param {boolean} props.isLoading - État de chargement du bouton de confirmation
 */
const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmation',
  message = 'Êtes-vous sûr de vouloir effectuer cette action ?',
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  confirmColorScheme = 'red',
  isLoading = false
}) => {
  const cancelRef = React.useRef();

  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onClose();
    }
  };

  return (    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent 
          className="zombie-modal"
          bg="gray.800"
          borderColor="teal.700"
          boxShadow="0 0 15px rgba(0, 255, 255, 0.2)"
        >
          <AlertDialogHeader 
            fontSize="lg" 
            fontWeight="bold"
            className="zombie-modal-header"
            bg="gray.900"
            color="teal.300"
          >
            {title}
          </AlertDialogHeader>

          <AlertDialogBody color="gray.200">
            {message}
          </AlertDialogBody>

          <AlertDialogFooter className="zombie-modal-footer" bg="gray.900">
            <Button 
              ref={cancelRef} 
              onClick={onClose} 
              isDisabled={isLoading}
              variant="outline"
              borderColor="teal.700"
              color="gray.300"
              _hover={{ bg: "rgba(0, 230, 230, 0.05)" }}
            >
              {cancelLabel}
            </Button>
            <Button 
              colorScheme={confirmColorScheme} 
              onClick={handleConfirm} 
              ml={3}
              isLoading={isLoading}
              className="btn-teal"
              _hover={{ bg: "rgba(0, 230, 230, 0.2)" }}
            >
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default ConfirmationDialog;
