import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, Typography, Link as MuiLink } from '@mui/material';

/**
 * Layout for authentication pages (login, register)
 */
const AuthLayout = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}
    >
      <Container component="main" maxWidth="xs" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Container>
      
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: 'background.paper',
          textAlign: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {'© '}
          {new Date().getFullYear()}
          {' Systemic Risk Dashboard. All rights reserved.'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <MuiLink href="#" color="inherit" underline="hover">
            Privacy Policy
          </MuiLink>
          {' | '}
          <MuiLink href="#" color="inherit" underline="hover">
            Terms of Service
          </MuiLink>
        </Typography>
      </Box>
    </Box>
  );
};

export default AuthLayout;