import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  GetApp as ExportIcon,
  Share as ShareIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import simulationService from '../../services/simulationService';
import FailureDistributionChart from '../charts/FailureDistributionChart';
import CumulativeProbabilityChart from '../charts/CumulativeProbabilityChart';
import BoxPlotChart from '../charts/BoxPlotChart';
import MetricsSummary from '../dashboard/MetricsSummary';
import ExportDialog from '../export/ExportDialog';
import ShareDialog from '../export/ShareDialog';
import { useExport } from '../../hooks/useExport';

const SimulationDetailView = ({ 
  simulationId, 
  open, 
  onClose, 
  onRerun 
}) => {
  const [simulation, setSimulation] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  const { loading: exportLoading, error: exportError, exportData } = useExport();

  useEffect(() => {
    if (open && simulationId) {
      fetchSimulationDetails();
    }
  }, [open, simulationId]);

  const fetchSimulationDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch simulation details and results in parallel
      const [simulationResponse, resultsResponse] = await Promise.all([
        simulationService.getSimulation(simulationId),
        simulationService.getSimulationResults(simulationId, true)
      ]);
      
      setSimulation(simulationResponse);
      setResults(resultsResponse);
    } catch (err) {
      setError('Failed to fetch simulation details');
      console.error('Error fetching simulation details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = () => {
    if (onRerun && simulation) {
      onRerun(simulation);
      onClose();
    }
  };

  const handleExport = async (exportOptions) => {
    // Get chart elements for PDF/image export
    const chartElements = [];
    const chartContainers = document.querySelectorAll('[data-chart-container]');
    chartContainers.forEach(container => chartElements.push(container));

    const simulationData = {
      ...simulation,
      results
    };

    await exportData(simulationId, simulationData, {
      ...exportOptions,
      chartElements
    });
    
    setExportDialogOpen(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'primary';
      case 'failed':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return 'Invalid date';
    }
  };

  const formatParameter = (key, value) => {
    switch (key) {
      case 'shock_prob':
        return `${(value * 100).toFixed(1)}%`;
      case 'n_sim':
        return value.toLocaleString();
      case 'systemic_threshold':
        return value.toString();
      case 'trad_lgd':
      case 'bc_lgd':
      case 'bc_liability_reduction':
        return `${(value * 100).toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  const getParameterLabel = (key) => {
    const labels = {
      shock_prob: 'Shock Probability',
      n_sim: 'Number of Simulations',
      systemic_threshold: 'Systemic Threshold',
      trad_lgd: 'Traditional LGD',
      bc_lgd: 'Blockchain LGD',
      bc_liability_reduction: 'BC Liability Reduction'
    };
    return labels[key] || key;
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Simulation Details
          </Typography>
          <Button
            onClick={onClose}
            startIcon={<CloseIcon />}
            variant="outlined"
            size="small"
          >
            Close
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : simulation ? (
            <Grid container spacing={3}>
              {/* Simulation Info */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box>
                        <Typography variant="h5" gutterBottom>
                          {simulation.name}
                        </Typography>
                        {simulation.description && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {simulation.description}
                          </Typography>
                        )}
                        <Box display="flex" gap={2} alignItems="center" mt={1}>
                          <Chip
                            label={simulation.status}
                            color={getStatusColor(simulation.status)}
                            size="small"
                          />
                          <Typography variant="body2" color="text.secondary">
                            Created: {formatDate(simulation.created_at)}
                          </Typography>
                          {simulation.status === 'running' && (
                            <Typography variant="body2" color="text.secondary">
                              Progress: {Math.round(simulation.progress || 0)}%
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box display="flex" gap={1}>
                        {simulation.status === 'completed' && (
                          <>
                            <Button
                              startIcon={<PlayIcon />}
                              onClick={handleRerun}
                              variant="outlined"
                              size="small"
                            >
                              Rerun
                            </Button>
                            <Button
                              startIcon={<ExportIcon />}
                              onClick={() => setExportDialogOpen(true)}
                              disabled={exportLoading}
                              variant="outlined"
                              size="small"
                            >
                              Export
                            </Button>
                            <Button
                              startIcon={<ShareIcon />}
                              onClick={() => setShareDialogOpen(true)}
                              variant="outlined"
                              size="small"
                            >
                              Share
                            </Button>
                          </>
                        )}
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Parameters */}
                    <Typography variant="h6" gutterBottom>
                      Simulation Parameters
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableBody>
                          {simulation.parameters && Object.entries(simulation.parameters).map(([key, value]) => (
                            <TableRow key={key}>
                              <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                                {getParameterLabel(key)}
                              </TableCell>
                              <TableCell>{formatParameter(key, value)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Results */}
              {results && simulation.status === 'completed' && (
                <>
                  {/* Summary Metrics */}
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Results Summary
                        </Typography>
                        <MetricsSummary 
                          traditionalResults={results.traditional_summary}
                          blockchainResults={results.blockchain_summary}
                          improvements={results.improvements}
                          statisticalAnalysis={results.statistical_analysis}
                        />
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Statistical Analysis */}
                  {results.statistical_analysis && (
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Statistical Analysis
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="body2" color="text.secondary">
                                T-Statistic
                              </Typography>
                              <Typography variant="h6">
                                {results.statistical_analysis.t_stat?.toFixed(4) || 'N/A'}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="body2" color="text.secondary">
                                P-Value
                              </Typography>
                              <Typography variant="h6">
                                {results.statistical_analysis.p_value?.toFixed(6) || 'N/A'}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="body2" color="text.secondary">
                                Cohen's D
                              </Typography>
                              <Typography variant="h6">
                                {results.statistical_analysis.cohens_d?.toFixed(4) || 'N/A'}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="body2" color="text.secondary">
                                Effect Size
                              </Typography>
                              <Typography variant="h6">
                                {results.statistical_analysis.effect || 'N/A'}
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}

                  {/* Charts */}
                  {results.raw_data && (
                    <>
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Failure Distribution
                            </Typography>
                            <div data-chart-container>
                              <FailureDistributionChart
                                traditionalData={results.raw_data.traditional_failures}
                                blockchainData={results.raw_data.blockchain_failures}
                                height={300}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Cumulative Probability
                            </Typography>
                            <div data-chart-container>
                              <CumulativeProbabilityChart
                                traditionalData={results.raw_data.traditional_failures}
                                blockchainData={results.raw_data.blockchain_failures}
                                height={300}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Box Plot Comparison
                            </Typography>
                            <div data-chart-container>
                              <BoxPlotChart
                                data={[
                                  {
                                    label: 'Traditional',
                                    values: results.raw_data.traditional_failures,
                                    color: '#1976d2'
                                  },
                                  {
                                    label: 'Blockchain',
                                    values: results.raw_data.blockchain_failures,
                                    color: '#9c27b0'
                                  }
                                ]}
                                height={300}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </Grid>
                    </>
                  )}
                </>
              )}

              {/* Running Status */}
              {simulation.status === 'running' && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <CircularProgress size={24} />
                        <Box>
                          <Typography variant="h6">
                            Simulation Running
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Progress: {Math.round(simulation.progress || 0)}%
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Failed Status */}
              {simulation.status === 'failed' && (
                <Grid item xs={12}>
                  <Alert severity="error">
                    Simulation failed to complete. Please check the parameters and try again.
                  </Alert>
                </Grid>
              )}
            </Grid>
          ) : null}
        </Box>
      </DialogContent>

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExport}
        simulationData={simulation}
        loading={exportLoading}
        error={exportError}
      />

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        simulationId={simulationId}
        simulationName={simulation?.name}
      />
    </Dialog>
  );
};

export default SimulationDetailView;