import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  Chip,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const LogEventViewer = ({ baseUrl }) => {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [serverFilter, setServerFilter] = useState('all');
  const [servers, setServers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const socketRef = useRef(null);
  const listRef = useRef(null);
  const theme = useTheme();

  // Connect to the socket.io server
  useEffect(() => {
    const socketUrl = baseUrl || window.location.origin;
    
    try {
      setLoading(true);
      socketRef.current = io(`${socketUrl}/logs`, {
        path: '/socket.io',
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      // Handle connection events
      socketRef.current.on('connect', () => {
        setConnected(true);
        setError(null);
        
        // Request initial state
        socketRef.current.emit('request_state');
        
        // Set event filters
        socketRef.current.emit('filter', {
          excludedEvents: ['log'],
          includedEvents: ['event', 'notification'],
          serverFilter: serverFilter !== 'all' ? serverFilter : null
        });
        
        setLoading(false);
      });

      // Handle disconnect
      socketRef.current.on('disconnect', () => {
        setConnected(false);
      });

      // Handle connection error
      socketRef.current.on('connect_error', (err) => {
        setError(`Connection error: ${err.message}`);
        setLoading(false);
      });

      // Handle initial state
      socketRef.current.on('state', (state) => {
        if (state.servers) {
          setServers(state.servers);
        }
      });

      // Listen for events
      socketRef.current.on('event', (eventData) => {
        setEvents(prevEvents => {
          // Only keep last 100 events
          const newEvents = [...prevEvents, { ...eventData, id: Date.now() }];
          if (newEvents.length > 100) {
            return newEvents.slice(newEvents.length - 100);
          }
          return newEvents;
        });
        
        // Update unread count if not at bottom of list
        if (listRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = listRef.current;
          if (scrollTop < scrollHeight - clientHeight - 50) {
            setUnreadCount(prev => prev + 1);
          }
        }
      });

      // Listen for notifications
      socketRef.current.on('notification', (notificationData) => {
        setEvents(prevEvents => {
          // Only keep last 100 events
          const newEvents = [...prevEvents, { 
            ...notificationData, 
            id: Date.now(),
            isNotification: true 
          }];
          if (newEvents.length > 100) {
            return newEvents.slice(newEvents.length - 100);
          }
          return newEvents;
        });
        
        // Notifications always increment unread count
        setUnreadCount(prev => prev + 1);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    } catch (err) {
      setError(`Error initializing log viewer: ${err.message}`);
      setLoading(false);
    }
  }, [baseUrl]);

  // Update filters when they change
  useEffect(() => {
    if (socketRef.current && connected) {
      socketRef.current.emit('filter', {
        excludedEvents: ['log'],
        includedEvents: ['event', 'notification'],
        serverFilter: serverFilter !== 'all' ? serverFilter : null
      });
    }
  }, [serverFilter, connected]);

  // Scroll to bottom when new events arrive
  useEffect(() => {
    if (listRef.current && unreadCount === 0) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events, unreadCount]);

  // Handle scroll to mark messages as read
  const handleScroll = () => {
    if (listRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (scrollHeight - scrollTop - clientHeight < 50) {
        setUnreadCount(0);
      }
    }
  };

  // Function to scroll to bottom
  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
      setUnreadCount(0);
    }
  };

  // Filter events based on selected filters
  const filteredEvents = events.filter(event => {
    // Filter by event type
    if (eventTypeFilter !== 'all' && event.eventType !== eventTypeFilter) {
      return false;
    }
    
    // Filter by server
    if (serverFilter !== 'all' && event.serverId !== serverFilter) {
      return false;
    }
    
    return true;
  });

  // Get unique event types for filter dropdown
  const eventTypes = [...new Set(events.map(event => event.eventType))];

  // Render event item based on its type
  const renderEventItem = (event) => {
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    
    if (event.isNotification) {
      // Render notification differently
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          bgcolor: event.importance === 'high' 
            ? theme.palette.error.light 
            : theme.palette.info.light,
          padding: 1,
          borderRadius: 1
        }}>
          <Typography variant="caption" color="textSecondary">
            {timestamp} - {event.serverName || 'System'}
          </Typography>
          <Typography variant="body2">
            {event.message}
          </Typography>
        </Box>
      );
    }
    
    // Regular event
    return (
      <Box>
        <Typography variant="caption" color="textSecondary">
          {timestamp} - {event.serverName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={event.eventType} 
            size="small" 
            color="primary" 
            variant="outlined" 
          />
          <Typography variant="body2">
            {event.data?.message || JSON.stringify(event.data)}
          </Typography>
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">
          Live Log Events
          {!connected && (
            <Chip
              label="Disconnected"
              color="error"
              size="small"
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        
        <Box sx={{ display: 'flex', mt: 2, gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Event Type</InputLabel>
            <Select
              value={eventTypeFilter}
              label="Event Type"
              onChange={(e) => setEventTypeFilter(e.target.value)}
            >
              <MenuItem value="all">All Events</MenuItem>
              {eventTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Server</InputLabel>
            <Select
              value={serverFilter}
              label="Server"
              onChange={(e) => setServerFilter(e.target.value)}
            >
              <MenuItem value="all">All Servers</MenuItem>
              {servers.map(server => (
                <MenuItem key={server.id} value={server.id}>{server.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {unreadCount > 0 && (
            <Badge badgeContent={unreadCount} color="primary">
              <Box 
                component="button" 
                onClick={scrollToBottom}
                sx={{
                  border: 'none',
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark,
                  }
                }}
              >
                New Events
              </Box>
            </Badge>
          )}
        </Box>
      </Box>
      
      <List
        ref={listRef}
        sx={{
          overflowY: 'auto',
          flexGrow: 1,
          p: 0,
          '& .MuiListItem-root': {
            borderBottom: '1px solid',
            borderColor: 'divider'
          }
        }}
        onScroll={handleScroll}
      >
        {filteredEvents.length === 0 ? (
          <ListItem>
            <ListItemText primary="No events to display" />
          </ListItem>
        ) : (
          filteredEvents.map(event => (
            <ListItem key={event.id}>
              <ListItemText
                primary={renderEventItem(event)}
                disableTypography
              />
            </ListItem>
          ))
        )}
      </List>
      
      <Box sx={{ 
        p: 1, 
        borderTop: 1, 
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <Typography variant="caption" color="textSecondary">
          {connected ? 'Connected to log server' : 'Disconnected'}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Showing {filteredEvents.length} events
        </Typography>
      </Box>
    </Paper>
  );
};

export default LogEventViewer;
