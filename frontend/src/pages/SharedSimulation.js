import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Alert,
  CircularProgress,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Divider
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility as ViewIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import exportService from '../services/exportService';
import FailureDistributionChart from '../components/charts/FailureDistributionChart';
import CumulativeProbabilityChart from '../components/charts/CumulativeProbabilityChart';
import BoxPlotChart from '../components/charts/BoxPlotChart';
import MetricsSummary from '../components/dashboard/MetricsSummary';

const SharedSimulation = () => {
  const { shareToken } = useParams();
  const [sharedData, setSharedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);

  useEffect(() => {
    if (shareToken) {
      fetchSharedData();
    }
  }, [shareToken]);

  const fetchSharedData = async (passwordAttempt = null) => {
    try {
      setLoading(true);
      setError(null);
      setPasswordError(null);
      
      const data = await exportService.getSharedSimulation(shareToken, passwordAttempt);
      setSharedData(data);
      setPasswordRequired(false);
      
    } catch (err) {
      if (err.response?.status === 401) {
        setPasswordRequired(true);
        if (passwordAttempt) {
          setPasswordError('Incorrect password. Please try again.');
        }
      } else if (err.response?.status === 404) {
        setError('This shared link is invalid or has expired.');
      } else if (err.response?.status === 410) {
        setError('This shared link has expired.');
      } else {
        setError('Failed to load shared simulation data.');
      }
      console.error('Error fetching shared data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password.trim()) {
      fetchSharedData(password.trim());
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

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CircularProgress size={48} />
          <Typography variant="h6">Loading shared simulation...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Typography variant="body1" color="text.secondary">
          The link you're trying to access may have expired or been revoked. 
          Please contact the person who shared this link for assistance.
        </Typography>
      </Container>
    );
  }

  if (passwordRequired) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <LockIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Password Required
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              This shared simulation is password protected. Please enter the password to view the results.
            </Typography>
            
            <Box component="form" onSubmit={handlePasswordSubmit} sx={{ mt: 2 }}>
              <TextField
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                error={!!passwordError}
                helperText={passwordError}
                sx={{ mb: 2 }}
                autoFocus
              />
              <Button
                type="submit"
                variant="contained"
                startIcon={<ViewIcon />}
                disabled={!password.trim()}
                fullWidth
              >
                View Simulation
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (!sharedData) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="warning">
          No simulation data available.
        </Alert>
      </Container>
    );
  }

  const { simulation, results } = sharedData;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={2}>
          <ShareIcon color="primary" />
          <Typography variant="h4" component="h1">
            Shared Simulation Results
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          This simulation was shared with you. You can view the results but cannot modify or rerun the simulation.
        </Typography>
      </Box>

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
                  </Box>
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
                      <FailureDistributionChart
                        traditionalData={results.raw_data.traditional_failures}
                        blockchainData={results.raw_data.blockchain_failures}
                        height={300}
                      />
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Cumulative Probability
                      </Typography>
                      <CumulativeProbabilityChart
                        traditionalData={results.raw_data.traditional_failures}
                        blockchainData={results.raw_data.blockchain_failures}
                        height={300}
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
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
          </>
        )}

        {/* Footer */}
        <Grid item xs={12}>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              This simulation was shared from the Systemic Risk Dashboard. 
              Results are read-only and cannot be modified.
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SharedSimulation;