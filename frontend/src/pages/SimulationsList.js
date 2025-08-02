import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Compare as CompareIcon
} from '@mui/icons-material';
import { fetchSimulations, deleteSimulation } from '../store/simulationsSlice';

const SimulationsList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { simulations, pagination, loading } = useSelector(state => state.simulations);
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [simulationToDelete, setSimulationToDelete] = useState(null);
  const [selectedSimulations, setSelectedSimulations] = useState([]);
  
  useEffect(() => {
    loadSimulations();
  }, [dispatch, page, rowsPerPage, searchTerm, statusFilter, sortBy, sortDir]);
  
  const loadSimulations = () => {
    dispatch(fetchSimulations({
      page: page + 1,
      per_page: rowsPerPage,
      search: searchTerm,
      status: statusFilter,
      sort_by: sortBy,
      sort_dir: sortDir
    }));
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };
  
  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };
  
  const handleSortChange = (event) => {
    setSortBy(event.target.value);
    setPage(0);
  };
  
  const handleSortDirChange = (event) => {
    setSortDir(event.target.value);
    setPage(0);
  };
  
  const handleNewSimulation = () => {
    navigate('/simulations/new');
  };
  
  const handleViewSimulation = (id) => {
    navigate(`/simulations/${id}`);
  };
  
  const handleDeleteClick = (simulation) => {
    setSimulationToDelete(simulation);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = () => {
    if (simulationToDelete) {
      dispatch(deleteSimulation(simulationToDelete.id));
      setDeleteDialogOpen(false);
      setSimulationToDelete(null);
    }
  };
  
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSimulationToDelete(null);
  };
  
  const handleRefresh = () => {
    loadSimulations();
  };
  
  const handleSimulationSelect = (simulation) => {
    const isSelected = selectedSimulations.some(s => s.id === simulation.id);
    
    if (isSelected) {
      setSelectedSimulations(selectedSimulations.filter(s => s.id !== simulation.id));
    } else {
      setSelectedSimulations([...selectedSimulations, simulation]);
    }
  };
  
  const handleCompareSelected = () => {
    if (selectedSimulations.length >= 2) {
      const ids = selectedSimulations.map(s => s.id);
      navigate(`/simulations/compare?ids=${ids.join(',')}`);
    }
  };
  
  const getStatusChipColor = (status) => {
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
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Simulations
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
          
          <Button
            variant="outlined"
            startIcon={<CompareIcon />}
            onClick={handleCompareSelected}
            disabled={selectedSimulations.length < 2}
            sx={{ mr: 1 }}
          >
            Compare ({selectedSimulations.length})
          </Button>
          
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ flexGrow: 1, minWidth: '200px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: '150px' }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="running">Running</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="canceled">Canceled</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: '150px' }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={handleSortChange}
              label="Sort By"
            >
              <MenuItem value="created_at">Created Date</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="status">Status</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: '150px' }}>
            <InputLabel>Order</InputLabel>
            <Select
              value={sortDir}
              onChange={handleSortDirChange}
              label="Order"
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>
      
      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        
        <Table sx={{ minWidth: 650 }} aria-label="simulations table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {simulations.map((simulation) => (
              <TableRow
                key={simulation.id}
                hover
                selected={selectedSimulations.some(s => s.id === simulation.id)}
                onClick={() => handleSimulationSelect(simulation)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell component="th" scope="row">
                  {simulation.name}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={simulation.status} 
                    color={getStatusChipColor(simulation.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {simulation.status === 'running' || simulation.status === 'pending' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={simulation.progress * 100} 
                        />
                      </Box>
                      <Box sx={{ minWidth: 35 }}>
                        <Typography variant="body2" color="text.secondary">
                          {`${Math.round(simulation.progress * 100)}%`}
                        </Typography>
                      </Box>
                    </Box>
                  ) : simulation.status === 'completed' ? (
                    '100%'
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {new Date(simulation.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex' }}>
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewSimulation(simulation.id);
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    
                    {simulation.status === 'completed' && (
                      <Tooltip title="Run Again">
                        <IconButton 
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle rerun
                          }}
                        >
                          <PlayArrowIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {(simulation.status === 'running' || simulation.status === 'pending') && (
                      <Tooltip title="Cancel">
                        <IconButton 
                          size="small"
                          color="warning"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle cancel
                          }}
                        >
                          <StopIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    <Tooltip title="Delete">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(simulation);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            
            {simulations.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1">
                    No simulations found. Create a new simulation to get started.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleNewSimulation}
                    sx={{ mt: 2 }}
                  >
                    New Simulation
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={pagination.total_items || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Delete Simulation
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the simulation "{simulationToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SimulationsList;