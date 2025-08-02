import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  GetApp as ExportIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import simulationService from '../../services/simulationService';
import FailureDistributionChart from '../charts/FailureDistributionChart';
import CumulativeProbabilityChart from '../charts/CumulativeProbabilityChart';
import BoxPlotChart from '../charts/BoxPlotChart';

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`comparison-tabpanel-${index}`}
    aria-labelledby={`comparison-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const SimulationComparisonView = ({ 
  simulationIds, 
  open, 
  onClose 
}) => {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (open && simulationIds && simulationIds.length >= 2) {
      fetchComparisonData();
    }
  }, [open, simulationIds]);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await simulationService.compareSimulations(simulationIds);
      setComparisonData(response);
    } catch (err) {
      setError('Failed to fetch comparison data');
      console.error('Error fetching comparison data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      // Create a comprehensive comparison report
      const reportData = {
        comparison_date: new Date().toISOString(),
        simulations: comparisonData.simulations,
        summary: comparisonData.summary,
        statistical_comparison: comparisonData.statistical_comparison
      };
      
      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `simulation_comparison_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export comparison');
      console.error('Error exporting comparison:', err);
    } finally {
      setExportLoading(false);
    }
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
      return format(parseISO(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  const formatValue = (value, type = 'number') => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (type) {
      case 'percentage':
        return `${(value * 100).toFixed(2)}%`;
      case 'integer':
        return Math.round(value).toLocaleString();
      case 'decimal':
        return value.toFixed(4);
      default:
        return value.toString();
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Simulation Comparison ({simulationIds?.length || 0} simulations)
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              startIcon={<ExportIcon />}
              onClick={handleExport}
              disabled={exportLoading || !comparisonData}
              variant="outlined"
              size="small"
            >
              Export
            </Button>
            <Button
              onClick={onClose}
              startIcon={<CloseIcon />}
              variant="outlined"
              size="small"
            >
              Close
            </Button>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ height: '100%', overflow: 'auto' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box p={3}>
              <Alert severity="error">{error}</Alert>
            </Box>
          ) : comparisonData ? (
            <Box>
              <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Overview" />
                <Tab label="Parameters" />
                <Tab label="Results" />
                <Tab label="Charts" />
              </Tabs>

              {/* Overview Tab */}
              <TabPanel value={activeTab} index={0}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Simulation Overview
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell>Description</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {comparisonData.simulations.map((simulation) => (
                                <TableRow key={simulation.id}>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight="medium">
                                      {simulation.name}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={simulation.status}
                                      color={getStatusColor(simulation.status)}
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {formatDate(simulation.created_at)}
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                      {simulation.description || 'No description'}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Summary Statistics */}
                  {comparisonData.summary && (
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Comparison Summary
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography variant="body2" color="text.secondary">
                                Best Traditional Performance
                              </Typography>
                              <Typography variant="h6">
                                {comparisonData.summary.best_traditional_performance?.name || 'N/A'}
                              </Typography>
                              <Typography variant="caption">
                                {formatValue(comparisonData.summary.best_traditional_performance?.avg_failures, 'decimal')} avg failures
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography variant="body2" color="text.secondary">
                                Best Blockchain Performance
                              </Typography>
                              <Typography variant="h6">
                                {comparisonData.summary.best_blockchain_performance?.name || 'N/A'}
                              </Typography>
                              <Typography variant="caption">
                                {formatValue(comparisonData.summary.best_blockchain_performance?.avg_failures, 'decimal')} avg failures
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography variant="body2" color="text.secondary">
                                Largest Improvement
                              </Typography>
                              <Typography variant="h6">
                                {comparisonData.summary.largest_improvement?.name || 'N/A'}
                              </Typography>
                              <Typography variant="caption">
                                {formatValue(comparisonData.summary.largest_improvement?.improvement_pct, 'percentage')} improvement
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography variant="body2" color="text.secondary">
                                Most Significant
                              </Typography>
                              <Typography variant="h6">
                                {comparisonData.summary.most_significant?.name || 'N/A'}
                              </Typography>
                              <Typography variant="caption">
                                p-value: {formatValue(comparisonData.summary.most_significant?.p_value, 'decimal')}
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              </TabPanel>

              {/* Parameters Tab */}
              <TabPanel value={activeTab} index={1}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Parameter Comparison
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Parameter</TableCell>
                            {comparisonData.simulations.map((sim) => (
                              <TableCell key={sim.id} align="center">
                                {sim.name}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {comparisonData.parameter_comparison && Object.entries(comparisonData.parameter_comparison).map(([param, values]) => (
                            <TableRow key={param}>
                              <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                                {param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </TableCell>
                              {values.map((value, index) => (
                                <TableCell key={index} align="center">
                                  {formatValue(value, param.includes('prob') || param.includes('lgd') || param.includes('reduction') ? 'percentage' : 'number')}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </TabPanel>

              {/* Results Tab */}
              <TabPanel value={activeTab} index={2}>
                <Grid container spacing={3}>
                  {/* Traditional Results */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Traditional Banking Results
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Simulation</TableCell>
                                <TableCell align="right">Avg Failures</TableCell>
                                <TableCell align="right">Max Failures</TableCell>
                                <TableCell align="right">Systemic Risk</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {comparisonData.results_comparison?.traditional.map((result, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    {comparisonData.simulations[index]?.name}
                                  </TableCell>
                                  <TableCell align="right">
                                    {formatValue(result.average_failures, 'decimal')}
                                  </TableCell>
                                  <TableCell align="right">
                                    {formatValue(result.max_failures, 'integer')}
                                  </TableCell>
                                  <TableCell align="right">
                                    {formatValue(result.probability_systemic_event, 'percentage')}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Blockchain Results */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Blockchain Banking Results
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Simulation</TableCell>
                                <TableCell align="right">Avg Failures</TableCell>
                                <TableCell align="right">Max Failures</TableCell>
                                <TableCell align="right">Systemic Risk</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {comparisonData.results_comparison?.blockchain.map((result, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    {comparisonData.simulations[index]?.name}
                                  </TableCell>
                                  <TableCell align="right">
                                    {formatValue(result.average_failures, 'decimal')}
                                  </TableCell>
                                  <TableCell align="right">
                                    {formatValue(result.max_failures, 'integer')}
                                  </TableCell>
                                  <TableCell align="right">
                                    {formatValue(result.probability_systemic_event, 'percentage')}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Improvements */}
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Blockchain Improvements
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>Simulation</TableCell>
                                <TableCell align="right">Avg Failures Reduction</TableCell>
                                <TableCell align="right">Max Failures Reduction</TableCell>
                                <TableCell align="right">Systemic Risk Reduction</TableCell>
                                <TableCell align="right">Statistical Significance</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {comparisonData.results_comparison?.improvements.map((improvement, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    {comparisonData.simulations[index]?.name}
                                  </TableCell>
                                  <TableCell align="right">
                                    {formatValue(improvement.average_failures, 'decimal')}
                                  </TableCell>
                                  <TableCell align="right">
                                    {formatValue(improvement.max_failures, 'integer')}
                                  </TableCell>
                                  <TableCell align="right">
                                    {formatValue(improvement.probability_systemic_event, 'percentage')}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Chip
                                      label={comparisonData.statistical_comparison?.[index]?.effect || 'N/A'}
                                      color={
                                        comparisonData.statistical_comparison?.[index]?.p_value < 0.05 
                                          ? 'success' 
                                          : 'default'
                                      }
                                      size="small"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Charts Tab */}
              <TabPanel value={activeTab} index={3}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Visual Comparison
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Charts show overlaid data from all selected simulations for comparison.
                    </Typography>
                  </Grid>

                  {comparisonData.chart_data && (
                    <>
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Failure Distribution Comparison
                            </Typography>
                            <FailureDistributionChart
                              data={comparisonData.chart_data.distributions}
                              height={300}
                              showLegend={true}
                            />
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Cumulative Probability Comparison
                            </Typography>
                            <CumulativeProbabilityChart
                              data={comparisonData.chart_data.cumulative}
                              height={300}
                              showLegend={true}
                            />
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Box Plot Comparison
                            </Typography>
                            <BoxPlotChart
                              data={comparisonData.chart_data.boxplot}
                              height={400}
                              showLegend={true}
                            />
                          </CardContent>
                        </Card>
                      </Grid>
                    </>
                  )}
                </Grid>
              </TabPanel>
            </Box>
          ) : null}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SimulationComparisonView;