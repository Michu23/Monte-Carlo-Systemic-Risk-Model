import React from 'react';
import { Box, Typography, Card, CardContent, Grid } from '@mui/material';

const SimpleDashboard = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🏦 Systemic Risk Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">📊 Simulations</Typography>
              <Typography variant="body2" color="text.secondary">
                View and manage your Monte Carlo simulations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">🏦 Banks</Typography>
              <Typography variant="body2" color="text.secondary">
                Manage bank data and portfolios
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">📈 Analytics</Typography>
              <Typography variant="body2" color="text.secondary">
                View simulation results and analytics
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="body1">
          ✅ Frontend and Backend are connected successfully!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You can now navigate to different sections using the sidebar.
        </Typography>
      </Box>
    </Box>
  );
};

export default SimpleDashboard;
