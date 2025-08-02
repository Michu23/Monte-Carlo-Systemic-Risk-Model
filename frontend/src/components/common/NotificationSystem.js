import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Slide,
  Stack,
  IconButton,
  Box
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { removeNotification } from '../../store/uiSlice';

const SlideTransition = (props) => {
  return <Slide {...props} direction="left" />;
};

const NotificationItem = ({ notification, onClose }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <SuccessIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'info':
      default:
        return <InfoIcon />;
    }
  };

  const getSeverity = (type) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  return (
    <Snackbar
      open={true}
      autoHideDuration={notification.duration || 6000}
      onClose={onClose}
      TransitionComponent={SlideTransition}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ position: 'relative' }}
    >
      <Alert
        severity={getSeverity(notification.type)}
        onClose={onClose}
        icon={getIcon(notification.type)}
        sx={{
          minWidth: 300,
          maxWidth: 500,
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
      >
        {notification.title && (
          <AlertTitle>{notification.title}</AlertTitle>
        )}
        {notification.message}
        
        {notification.actions && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            {notification.actions.map((action, index) => (
              <IconButton
                key={index}
                size="small"
                onClick={action.onClick}
                color="inherit"
              >
                {action.icon}
              </IconButton>
            ))}
          </Box>
        )}
      </Alert>
    </Snackbar>
  );
};

const NotificationSystem = () => {
  const dispatch = useDispatch();
  const notifications = useSelector(state => state.ui.notifications || []);

  const handleClose = (notificationId) => {
    dispatch(removeNotification(notificationId));
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    >
      <Stack spacing={1}>
        {notifications.map((notification, index) => (
          <Box
            key={notification.id}
            sx={{
              pointerEvents: 'auto',
              transform: `translateY(${index * 8}px)`,
              transition: 'transform 0.3s ease'
            }}
          >
            <NotificationItem
              notification={notification}
              onClose={() => handleClose(notification.id)}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default NotificationSystem;
