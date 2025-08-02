import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  PlayArrow as RerunIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Compare as CompareIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import {
  fetchSimulation,
  fetchSimulationResults,
  fetchSimulationStatus,
  clearCurrentSimulation
} from '../store/simulationsSlice';
import MetricsSummary from '../components/dashboard/MetricsSummary';
import FailureDistributionChart from '../components/charts/FailureDistributionChart';
import CumulativeProbabilityChart from '../components/charts/CumulativeProbabilityChart';
import BoxPlotChart from '../components/charts/BoxPlotChart';
import CorrelationHeatmap from '../components/charts/CorrelationHeatmap';
import simulationService from '../services/simulationService';
import { useSimulationWebSocket } from '../hooks/useWebSocket';

/**
 * Detailed view of a simulation with results and visualizations
 */
const SimulationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentSimulation, currentResults, loading, error } = useSelector(state => state.simulations);
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Use WebSocket for real-time updates
  const { simulationStatus, progress, results } = useSimulationWebSocket(id);

  useEffect(() => {
    if (id) {
      dispatch(fetchSimulation(id));
      dispatch(fetchSimulationResults({ simulationId: id, includeRawData: true }));
    }

    return () => {
      dispatch(clearCurrentSimulation());
    };
  }, [id, dispatch]);

  // Handle WebSocket status updates
  useEffect(() => {
    if (simulationStatus && currentSimulation && simulationStatus !== currentSimulation.status) {
      // Update simulation status in store when WebSocket provides updates
      dispatch(fetchSimulation(id));
    }
  }, [simulationStatus, currentSimulation, id, dispatch]);

  // Fetch results when simulation completes (either from store or WebSocket)
  useEffect(() => {
    const status = simulationStatus || currentSimulation?.status;
    if (status === 'completed' && !currentResults) {
      dispatch(fetchSimulationResults({ simulationId: id, includeRawData: true }));
    }
  }, [simulationStatus, currentSimulation?.status, currentResults, id, dispatch]);

  const handleBack = () => {
    navigate('/simulations');
  };

  const handleRefresh = () => {
    dispatch(fetchSimulation(id));
    if (currentSimulation?.status === 'completed') {
      dispatch(fetchSimulationResults({ simulationId: id, includeRawData: true }));
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleExport = async (format) => {
    try {
      const data = await simulationService.exportSimulationResults(id, format);
      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `simulation_${id}_results.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
    handleMenuClose();
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/simulations/share/${id}`;
    navigator.clipboard.writeText(shareUrl);
    // You could show a toast notification here
    handleMenuClose();
  };

  const handleRerun = () => {
    navigate('/simulations/new', { 
      state: { 
        parameters: currentSimulation?.parameters,
        basedOn: currentSimulation?.name 
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'info';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'canceled':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading && !currentSimulation) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error}
        </Alert>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          Back to Simulations
        </Button>
      </Box>
    );
  }

  if (!currentSimulation) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Simulation not found
        </Alert>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          Back to Simulations
        </Button>
      </Box>
    );
  }

  const isCompleted = currentSimulation.status === 'completed';
  const isRunning = currentSimulation.status === 'running' || currentSimulation.status === 'pending';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1">
              {currentSimulation.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Created: {formatDate(currentSimulation.created_at)}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={currentSimulation.status} 
            color={getStatusColor(currentSimulation.status)}
            size="medium"
          />
          
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
          
          {isCompleted && (
            <>
              <Button
                variant="outlined"
                startIcon={<RerunIcon />}
                onClick={handleRerun}
              >
                Rerun
              </Button>
              
              <IconButton onClick={handleMenuOpen}>
                <MoreVertIcon />
              </IconButton>
            </>
          )}
        </Box>
      </Box>

      {/* Description */}
      {currentSimulation.description && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="body1">
            {currentSimulation.description}
          </Typography>
        </Paper>
      )}

      {/* Progress for running simulations */}
      {isRunning && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Simulation Progress
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={(progress?.percentage || currentSimulation.progress || 0) * 100} 
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">
                {`${Math.round((progress?.percentage || currentSimulation.progress || 0) * 100)}%`}
              </Typography>
            </Box>
          </Box>
          {(progress?.message || currentSimulation.status_message) && (
            <Typography variant="body2" color="text.secondary">
              {progress?.message || currentSimulation.status_message}
            </Typography>
          )}
          {progress?.current_step && progress?.total_steps && (
            <Typography variant="body2" color="text.secondary">
              Step {progress.current_step} of {progress.total_steps}
            </Typography>
          )}
        </Paper>
      )}

      {/* Error message for failed simulations */}
      {currentSimulation.status === 'failed' && currentSimulation.error_message && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Simulation Failed:</strong> {currentSimulation.error_message}
          </Typography>
        </Alert>
      )}

      {/* Parameters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Simulation Parameters
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(currentSimulation.parameters || {}).map(([key, value]) => (
            <Grid item xs={6} sm={4} md={3} key={key}>
              <Typography variant="body2" color="text.secondary">
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {typeof value === 'number' ? 
                  (key.includes('prob') || key.includes('lgd') || key.includes('reduction') ? 
                    `${(value * 100).toFixed(1)}%` : 
                    value.toLocaleString()) : 
                  value}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Results */}
      {isCompleted && currentResults && (
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Summary" />
              <Tab label="Distribution" />
              <Tab label="Probability" />
              <Tab label="Comparison" />
              <Tab label="Correlations" />
            </Tabs>
          </Box>

          {/* Summary Tab */}
          {activeTab === 0 && (
            <MetricsSummary
              traditionalResults={currentResults.traditional_summary}
              blockchainResults={currentResults.blockchain_summary}
              improvements={currentResults.improvements}
              statisticalAnalysis={currentResults.statistical_analysis}
            />
          )}

          {/* Distribution Tab */}
          {activeTab === 1 && currentResults.raw_data && (
            <FailureDistributionChart
              traditionalData={currentResults.raw_data.traditional_failures}
              blockchainData={currentResults.raw_data.blockchain_failures}
              showComparison={true}
              showKDE={true}
              showStatistics={true}
            />
          )}

          {/* Probability Tab */}
          {activeTab === 2 && currentResults.raw_data && (
            <CumulativeProbabilityChart
              traditionalData={currentResults.raw_data.traditional_failures}
              blockchainData={currentResults.raw_data.blockchain_failures}
              showComparison={true}
              showThreshold={true}
              defaultThreshold={currentSimulation.parameters?.systemic_threshold || 3}
            />
          )}

          {/* Comparison Tab */}
          {activeTab === 3 && currentResults.raw_data && (
            <BoxPlotChart
              data={[
                {
                  label: 'Traditional',
                  values: currentResults.raw_data.traditional_failures,
                  color: '#1976d2'
                },
                {
                  label: 'Blockchain',
                  values: currentResults.raw_data.blockchain_failures,
                  color: '#ff9800'
                }
              ]}
              title="Failure Distribution Comparison"
              yLabel="Number of Bank Failures"
              showOutliers={true}
              showMean={true}
            />
          )}

          {/* Correlations Tab */}
          {activeTab === 4 && currentResults.raw_data?.bank_names && (
            <Alert severity="info">
              Correlation analysis requires additional simulation data. This feature will be available in future updates.
            </Alert>
          )}
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleExport('json')}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as JSON</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as CSV</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleShare}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share Results</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => navigate(`/simulations/compare?ids=${id}`)}>
          <ListItemIcon>
            <CompareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Compare with Others</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default SimulationDetail;