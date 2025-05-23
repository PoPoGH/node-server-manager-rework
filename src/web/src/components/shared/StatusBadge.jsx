import { Badge } from '@chakra-ui/react';

/**
 * Composant Badge de statut réutilisable
 * @param {Object} props - Les propriétés du composant
 * @param {string} props.status - Le statut à afficher (online, offline, banned, admin, etc.)
 * @param {Object} props.statusConfig - Configuration des statuts et leurs couleurs
 * @param {string} props.size - Taille du badge (sm, md, lg)
 * @param {boolean} props.hasPadding - Ajouter du padding au badge
 */
const StatusBadge = ({ 
  status,
  statusConfig = {
    online: { label: 'En ligne', color: 'green' },
    offline: { label: 'Hors ligne', color: 'gray' },
    banned: { label: 'Banni', color: 'red' },
    admin: { label: 'Admin', color: 'purple' },
    warning: { label: 'Avertissement', color: 'orange' },
    pending: { label: 'En attente', color: 'yellow' },
    active: { label: 'Actif', color: 'blue' },
    inactive: { label: 'Inactif', color: 'gray' },
  },
  size = 'md',
  hasPadding = true
}) => {
  // Définir les valeurs par défaut si le statut n'est pas dans la config
  const config = statusConfig[status] || { label: status, color: 'gray' };
  
  return (
    <Badge
      colorScheme={config.color}
      fontSize={size === 'sm' ? '0.7em' : size === 'lg' ? '0.9em' : '0.8em'}
      px={hasPadding ? 2 : undefined}
      py={hasPadding ? 1 : undefined}
      borderRadius="md"
    >
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
