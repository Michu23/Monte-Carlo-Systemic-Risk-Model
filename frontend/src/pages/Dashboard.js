import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  History as HistoryIcon,
  AccountBalance as BankIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import { fetchSimulations } from '../store/simulationsSlice';
import { fetchBanks } from '../store/banksSlice';
import { setActiveTab } from '../store/uiSlice';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { simulations, loading: simulationsLoading } = useSelector(state => state.simulations);
  const { banks, loading: banksLoading } = useSelector(state => state.banks);
  const { activeTab } = useSelector(state => state.ui);
  
  const [recentSimulations, setRecentSimulations] = useState([]);
  
  useEffect(() => {
    // Fetch recent simulations
    dispatch(fetchSimulations({ per_page: 5, sort_by: 'created_at', sort_dir: 'desc' }));
    
    // Fetch banks
    dispatch(fetchBanks());
  }, [dispatch]);
  
  useEffect(() => {
    if (simulations.length > 0) {
      setRecentSimulations(simulations.slice(0, 5));
    }
  }, [simulations]);
  
  const handleTabChange = (event, newValue) => {
    dispatch(setActiveTab(newValue));
  };
  
  const handleNewSimulation = () => {
    navigate('/simulations/new');
  };
  
  const handleViewSimulation = (id) => {
    navigate(`/simulations/${id}`);
  };
  
  const handleViewAllSimulations = () => {
    navigate('/simulations');
  };
  
  const handleViewAllBanks = () => {
    navigate('/banks');
  };
  
  const handleRefresh = () => {
    dispatch(fetchSimulations({ per_page: 5, sort_by: 'created_at', sort_dir: 'desc' }));
    dispatch(fetchBanks());
  };
  
  // Calculate summary statistics
  const completedSimulations = simulations.filter(sim => sim.status === 'completed');
  const pendingSimulations = simulations.filter(sim => sim.status === 'pending' || sim.status === 'running');
  const failedSimulations = simulations.filter(sim => sim.status === 'failed');
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewSimulation}
            sx={{ mr: 1 }}
          >
            New Simulation
          </Button>
          
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Total Simulations
            </Typography>
            <Typography variant="h3" component="div">
              {simulationsLoading ? <CircularProgress size={24} /> : simulations.length}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Completed
            </Typography>
            <Typography variant="h3" component="div" color="success.main">
              {simulationsLoading ? <CircularProgress size={24} /> : completedSimulations.length}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              In Progress
            </Typography>
            <Typography variant="h3" component="div" color="info.main">
              {simulationsLoading ? <CircularProgress size={24} /> : pendingSimulations.length}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Banks
            </Typography>
            <Typography variant="h3" component="div">
              {banksLoading ? <CircularProgress size={24} /> : banks.length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="dashboard tabs">
                <Tab label="Recent Simulations" />
                <Tab label="Statistics" />
              </Tabs>
            </Box>
            
            {activeTab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Recent Simulations</Typography>
                  <Button 
                    variant="text" 
                    endIcon={<ViewIcon />}
                    onClick={handleViewAllSimulations}
                  >
                    View All
                  </Button>
                </Box>
                
                {simulationsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : recentSimulations.length > 0 ? (
                  <List>
                    {recentSimulations.map((simulation) => (
                      <React.Fragment key={simulation.id}>
                        <ListItem
                          secondaryAction={
                            <Tooltip title="View Details">
                              <IconButton edge="end" onClick={() => handleViewSimulation(simulation.id)}>
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          }
                        >
                          <ListItemIcon>
                            {simulation.status === 'completed' ? (
                              <TrendingUpIcon color="success" />
                            ) : simulation.status === 'failed' ? (
                              <TrendingDownIcon color="error" />
                            ) : (
                              <HistoryIcon color="info" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={simulation.name}
                            secondary={`Status: ${simulation.status} | Created: ${new Date(simulation.created_at).toLocaleString()}`}
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body1" sx={{ p: 2 }}>
                    No simulations found. Create a new simulation to get started.
                  </Typography>
                )}
              </Box>
            )}
            
            {activeTab === 1 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Simulation Statistics
                </Typography>
                
                {simulationsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            Simulation Status
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body1">Completed:</Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {completedSimulations.length}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body1">In Progress:</Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {pendingSimulations.length}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body1">Failed:</Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {failedSimulations.length}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            Success Rate
                          </Typography>
                          <Typography variant="h3" component="div" color="success.main">
                            {simulations.length > 0 
                              ? `${Math.round((completedSimulations.length / simulations.length) * 100)}%` 
                              : 'N/A'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Right Column */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <BankIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Banks
                </Typography>
                <Button 
                  variant="text" 
                  endIcon={<ViewIcon />}
                  onClick={handleViewAllBanks}
                  size="small"
                >
                  View All
                </Button>
              </Box>
              
              {banksLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : banks.length > 0 ? (
                <List dense>
                  {banks.slice(0, 5).map((bank) => (
                    <ListItem key={bank.id}>
                      <ListItemText
                        primary={bank.name}
                        secondary={`CET1 Ratio: ${bank.cet1_ratio}% | Assets: €${bank.total_assets}B`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body1" sx={{ p: 2 }}>
                  No banks found. Add banks to run simulations.
                </Typography>
              )}
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                startIcon={<PlayIcon />}
                onClick={handleNewSimulation}
                fullWidth
              >
                Run New Simulation
              </Button>
            </CardActions>
          </Card>
          
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                fullWidth
                sx={{ mb: 1 }}
                onClick={handleNewSimulation}
              >
                New Simulation
              </Button>
              <Button
                variant="outlined"
                startIcon={<HistoryIcon />}
                fullWidth
                sx={{ mb: 1 }}
                onClick={handleViewAllSimulations}
              >
                View Simulation History
              </Button>
              <Button
                variant="outlined"
                startIcon={<BankIcon />}
                fullWidth
                onClick={handleViewAllBanks}
              >
                Manage Banks
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;