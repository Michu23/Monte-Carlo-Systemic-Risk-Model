import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import websocketService from '../services/websocketService';

/**
 * Custom hook for WebSocket functionality
 * @param {Object} options - Hook options
 * @param {boolean} options.autoConnect - Auto connect on mount
 * @returns {Object} - WebSocket utilities
 */
export const useWebSocket = (options = {}) => {
  const { autoConnect = true } = options;
  const { token, isAuthenticated } = useSelector(state => state.auth);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (token && isAuthenticated) {
      websocketService.connect(token);
    }
  }, [token, isAuthenticated]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  // Send message
  const sendMessage = useCallback((type, payload) => {
    websocketService.send(type, payload);
  }, []);

  // Subscribe to events
  const subscribe = useCallback((event, callback) => {
    websocketService.on(event, callback);
    
    // Return unsubscribe function
    return () => {
      websocketService.off(event, callback);
    };
  }, []);

  useEffect(() => {
    // Handle connection status changes
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleError = (data) => {
      setConnectionError(data.error);
    };

    // Subscribe to connection events
    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('error', handleError);

    // Auto connect if enabled and authenticated
    if (autoConnect && token && isAuthenticated) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('error', handleError);
      
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect, token, isAuthenticated]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    sendMessage,
    subscribe
  };
};

/**
 * Hook for simulation-specific WebSocket functionality
 * @param {string} simulationId - Simulation ID
 * @returns {Object} - Simulation WebSocket utilities
 */
export const useSimulationWebSocket = (simulationId) => {
  const { isConnected, subscribe, sendMessage } = useWebSocket();
  const [simulationStatus, setSimulationStatus] = useState(null);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);

  // Subscribe to simulation updates
  useEffect(() => {
    if (!isConnected || !simulationId) return;

    // Subscribe to simulation
    sendMessage('subscribe_simulation', { simulation_id: simulationId });

    // Handle simulation updates
    const unsubscribeStatus = subscribe('simulation_status', (data) => {
      if (data.simulation_id === simulationId) {
        setSimulationStatus(data.status);
      }
    });

    const unsubscribeProgress = subscribe('simulation_progress', (data) => {
      if (data.simulation_id === simulationId) {
        setProgress(data);
      }
    });

    const unsubscribeResults = subscribe('simulation_results', (data) => {
      if (data.simulation_id === simulationId) {
        setResults(data.results);
      }
    });

    // Cleanup
    return () => {
      sendMessage('unsubscribe_simulation', { simulation_id: simulationId });
      unsubscribeStatus();
      unsubscribeProgress();
      unsubscribeResults();
    };
  }, [isConnected, simulationId, subscribe, sendMessage]);

  return {
    isConnected,
    simulationStatus,
    progress,
    results
  };
};

/**
 * Hook for notification WebSocket functionality
 * @returns {Object} - Notification WebSocket utilities
 */
export const useNotificationWebSocket = () => {
  const { isConnected, subscribe, sendMessage } = useWebSocket();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to notifications
    sendMessage('subscribe_notifications');

    // Handle notifications
    const unsubscribe = subscribe('notification', (data) => {
      setNotifications(prev => [data, ...prev.slice(0, 49)]); // Keep last 50
    });

    // Cleanup
    return () => {
      sendMessage('unsubscribe_notifications');
      unsubscribe();
    };
  }, [isConnected, subscribe, sendMessage]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    isConnected,
    notifications,
    clearNotifications,
    removeNotification
  };
};

export default useWebSocket;