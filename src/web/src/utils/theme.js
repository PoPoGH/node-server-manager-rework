import { extendTheme } from '@chakra-ui/react';

const config = {
  initialColorMode: 'dark', // Utilisation du mode sombre par défaut comme dans ZombiesStatsComponent
  useSystemColorMode: false,
};

// Enhanced color palette to match ZombiesStatsComponent
const colors = {
  brand: {
    50: '#E0FFFF',
    100: '#B3FFFF',
    200: '#80FFFF',
    300: '#4DFFFF',
    400: '#1AFFFF',
    500: '#00E6E6', // Couleur principale - teal
    600: '#00B3B3',
    700: '#008080',
    800: '#004D4D',
    900: '#001A1A',
  },
  accent: {
    50: '#e6fff5',
    100: '#ccffeb',
    200: '#99ffe0',
    300: '#66ffd6',
    400: '#33ffcc',
    500: '#00ffc2', // Couleur d'accent - turquoise
    600: '#00cc9b',
    700: '#009973',
    800: '#00664c',
    900: '#003326',
  },
  teal: {
    50: '#e0ffff',
    100: '#b3ffff',
    200: '#80ffff',
    300: '#4dffff', // Text color for headings
    400: '#1affff', // Icons and highlights
    500: '#00e6e6', // Primary action color
    600: '#00b3b3',
    700: '#009999', // Borders and dividers
    800: '#006666',
    900: '#003333',
  },
  gray: {
    50: '#f7fafc',
    100: '#edf2f7',
    200: '#e2e8f0',
    300: '#cbd5e0',
    400: '#a0aec0',
    500: '#718096',
    600: '#4a5568',
    700: '#2d3748',
    800: '#1a202c', // Main background
    850: '#171d28', // Alternating row backgrounds
    900: '#0f1623', // Card headers and darker elements
  }
};

const theme = extendTheme({
  config,
  colors,
  fonts: {
    heading: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'md',
        fontWeight: '500',
        _focus: {
          boxShadow: '0 0 0 3px rgba(0, 230, 230, 0.6)',
        }
      },
      variants: {
        primary: {
          bg: 'teal.500',
          color: 'white',
          _hover: { bg: 'teal.400' },
          _active: { bg: 'teal.600' },
        },
        secondary: {
          bg: 'gray.700',
          color: 'white',
          _hover: { bg: 'gray.600' },
          _active: { bg: 'gray.800' },
        },
        outline: {
          borderColor: 'teal.500',
          color: 'teal.400',
          _hover: { bg: 'rgba(0, 230, 230, 0.1)' },
        },
        ghost: {
          color: 'teal.400',
          _hover: { bg: 'rgba(0, 230, 230, 0.1)' },
        },
        solid: {
          bg: 'teal.500',
          color: 'black',
          _hover: { bg: 'teal.400' },
          _active: { bg: 'teal.600' },
        }
      },
      defaultProps: {
        colorScheme: 'teal',
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: 'xl',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.1)',
          bg: 'gray.800',
          borderColor: 'teal.700',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          _hover: {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 20px rgba(0, 230, 230, 0.15)',
          }
        },
        header: {
          bg: 'gray.900',
          py: 4,
          borderBottom: '1px solid',
          borderColor: 'teal.700',
        },
        body: {
          py: 5,
        },
        footer: {
          bg: 'gray.900',
          borderTop: '1px solid',
          borderColor: 'teal.700',
        }
      }
    },
    Table: {
      baseStyle: {
        th: {
          bg: 'gray.900',
          color: 'teal.300',
          borderBottom: '1px solid',
          borderColor: 'teal.700',
          textTransform: 'uppercase',
          fontSize: '0.85rem',
        }
      },
      variants: {
        simple: {
          th: {
            bg: 'gray.900',
            color: 'teal.300',
            borderBottom: '1px solid',
            borderColor: 'teal.700',
            py: 3,
          },
          tr: {
            _hover: { bg: 'rgba(0, 230, 230, 0.05)' },
            transition: 'all 0.2s ease',
          },
          td: {
            borderColor: 'rgba(0, 230, 230, 0.1)',
            py: 3,
          }
        }
      }
    },
    Menu: {
      baseStyle: {
        list: {
          bg: 'gray.800',
          borderColor: 'teal.700',
          boxShadow: '0 4px 15px rgba(0, 255, 255, 0.15)',
          borderRadius: 'md',
          border: '1px solid',
          overflow: 'hidden',
        },
        item: {
          bg: 'gray.800',
          color: 'gray.200',
          _hover: {
            bg: 'teal.700',
            color: 'white'
          },
          _focus: {
            bg: 'teal.900',
          }
        }
      }
    },
    Badge: {
      baseStyle: {
        textTransform: 'normal',
        fontWeight: 'medium',
        borderRadius: 'full',
      },
      variants: {
        solid: {
          bg: 'teal.500',
          color: 'black',
        },
        subtle: {
          bg: 'rgba(0, 230, 230, 0.1)',
          color: 'teal.300',
          border: '1px solid',
          borderColor: 'rgba(0, 230, 230, 0.3)',
        },
      },
    },
    Tabs: {
      variants: {
        'soft-rounded': {
          tab: {
            color: 'gray.400',
            _selected: { 
              color: 'black', 
              bg: 'teal.400',
            },
            _hover: { bg: 'teal.700', color: 'white' },
          },
        },
      }
    },
  },
  styles: {
    global: props => ({
      body: {
        bg: 'gray.900',
        color: 'gray.50',
      },
      '::-webkit-scrollbar': {
        width: '10px',
        height: '10px',
        background: '#1a202c',
      },
      '::-webkit-scrollbar-thumb': {
        background: 'rgba(0, 230, 230, 0.3)',
        borderRadius: '5px',
        '&:hover': {
          background: 'rgba(0, 230, 230, 0.5)',
        }
      },
      '.card-text': {
        color: 'gray.100',
      },
      '.chakra-stat': {
        color: 'white',
      },
      '.chakra-stat__number': {
        color: 'teal.300',
        fontWeight: 'bold',
      },
      '.chakra-stat__label': {
        color: 'gray.300',
      },
      '.chakra-stat__help-text': {
        color: 'gray.400',
      },
      'table': {
        color: 'gray.100',
      },
      'th, td': {
        color: 'inherit',
      },
      '.chakra-modal__content': {
        bg: 'gray.800',
        color: 'gray.100',
        borderColor: 'teal.700',
        borderRadius: 'xl',
        boxShadow: '0 0 20px rgba(0, 255, 255, 0.2)',
        border: '1px solid',
      },
      '.chakra-modal__header': {
        color: 'teal.300',
        bg: 'gray.900',
        borderBottom: '1px solid',
        borderColor: 'teal.700',
      },
      '.chakra-modal__footer': {
        bg: 'gray.900',
        borderTop: '1px solid',
        borderColor: 'teal.700',
      },
      '.chakra-badge': {
        color: 'white',
      },
      'p, h1, h2, h3, h4, h5, h6, span, div': {
        color: props.colorMode === 'dark' ? 'white' : 'gray.800',
      },
      '.glow-border': {
        borderWidth: '1px',
        borderColor: 'rgba(0, 230, 230, 0.3)',
        boxShadow: '0 0 10px rgba(0, 230, 230, 0.2)',
      }
    })
  }
});

export default theme;
