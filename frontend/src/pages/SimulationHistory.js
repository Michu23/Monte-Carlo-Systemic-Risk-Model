import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SimulationHistoryBrowser from '../components/simulation/SimulationHistoryBrowser';
import SimulationDetailView from '../components/simulation/SimulationDetailView';
import SimulationComparisonView from '../components/simulation/SimulationComparisonView';
import ParameterControlPanel from '../components/simulation/ParameterControlPanel';

const SimulationHistory = () => {
  const navigate = useNavigate();
  const [selectedSimulation, setSelectedSimulation] = useState(null);
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [comparisonViewOpen, setComparisonViewOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState([]);
  const [rerunDialogOpen, setRerunDialogOpen] = useState(false);
  const [simulationToRerun, setSimulationToRerun] = useState(null);
  const [notification, setNotification] = useState(null);

  const handleViewSimulation = (simulation) => {
    setSelectedSimulation(simulation);
    setDetailViewOpen(true);
  };

  const handleCompareSimulations = (simulationIds) => {
    if (simulationIds.length < 2) {
      setNotification({
        type: 'warning',
        message: 'Please select at least 2 simulations to compare.'
      });
      return;
    }
    
    setSelectedForComparison(simulationIds);
    setComparisonViewOpen(true);
  };

  const handleRerunSimulation = (simulation) => {
    setSimulationToRerun(simulation);
    setRerunDialogOpen(true);
  };

  const handleRerunConfirm = (parameters) => {
    // Navigate to dashboard with pre-filled parameters
    navigate('/dashboard', { 
      state: { 
        prefilledParameters: parameters,
        simulationName: `${simulationToRerun.name} (Rerun)`
      }
    });
    setRerunDialogOpen(false);
    setSimulationToRerun(null);
  };

  const handleCloseDetailView = () => {
    setDetailViewOpen(false);
    setSelectedSimulation(null);
  };

  const handleCloseComparisonView = () => {
    setComparisonViewOpen(false);
    setSelectedForComparison([]);
  };

  const handleCloseRerunDialog = () => {
    setRerunDialogOpen(false);
    setSimulationToRerun(null);
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          color="inherit"
          href="/dashboard"
          onClick={(e) => {
            e.preventDefault();
            navigate('/dashboard');
          }}
        >
          Dashboard
        </Link>
        <Typography color="text.primary">Simulation History</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Simulation History
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse, compare, and manage your simulation results. View detailed analysis, 
          compare multiple simulations, and rerun scenarios with different parameters.
        </Typography>
      </Box>

      {/* Notifications */}
      {notification && (
        <Alert 
          severity={notification.type} 
          onClose={handleCloseNotification}
          sx={{ mb: 3 }}
        >
          {notification.message}
        </Alert>
      )}

      {/* Main Content */}
      <SimulationHistoryBrowser
        onViewSimulation={handleViewSimulation}
        onCompareSimulations={handleCompareSimulations}
        onRerunSimulation={handleRerunSimulation}
      />

      {/* Detail View Dialog */}
      <SimulationDetailView
        simulationId={selectedSimulation?.id}
        open={detailViewOpen}
        onClose={handleCloseDetailView}
        onRerun={handleRerunSimulation}
      />

      {/* Comparison View Dialog */}
      <SimulationComparisonView
        simulationIds={selectedForComparison}
        open={comparisonViewOpen}
        onClose={handleCloseComparisonView}
      />

      {/* Rerun Dialog */}
      {rerunDialogOpen && simulationToRerun && (
        <ParameterControlPanel
          open={rerunDialogOpen}
          onClose={handleCloseRerunDialog}
          onSubmit={handleRerunConfirm}
          initialParameters={simulationToRerun.parameters}
          title={`Rerun: ${simulationToRerun.name}`}
          submitButtonText="Start Rerun"
          mode="rerun"
        />
      )}
    </Container>
  );
};

export default SimulationHistory;