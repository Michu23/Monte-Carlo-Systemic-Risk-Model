import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Button,
  Checkbox,
  Toolbar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Compare as CompareIcon,
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  GetApp as ExportIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { fetchSimulations } from '../../store/simulationsSlice';

const SimulationHistoryBrowser = ({ onViewSimulation, onCompareSimulations, onRerunSimulation }) => {
  const dispatch = useDispatch();
  const { simulations, pagination, loading, error } = useSelector(state => state.simulations);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSimulations, setSelectedSimulations] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [simulationToDelete, setSimulationToDelete] = useState(null);

  // Fetch simulations using Redux
  const fetchSimulationsData = useCallback(() => {
    dispatch(fetchSimulations({
      page: page + 1,
      per_page: rowsPerPage,
      sort_by: orderBy,
      sort_dir: order,
      ...(searchTerm && { search: searchTerm }),
      ...(statusFilter && { status: statusFilter })
    }));
  }, [dispatch, page, rowsPerPage, orderBy, order, searchTerm, statusFilter]);

  useEffect(() => {
    fetchSimulationsData();
  }, [fetchSimulationsData]);

  // Handle sorting
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle search
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when searching
  };

  // Handle status filter
  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0); // Reset to first page when filtering
  };

  // Handle selection
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = simulations.map((simulation) => simulation.id);
      setSelectedSimulations(newSelected);
    } else {
      setSelectedSimulations([]);
    }
  };

  const handleClick = (event, id) => {
    const selectedIndex = selectedSimulations.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedSimulations, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedSimulations.slice(1));
    } else if (selectedIndex === selectedSimulations.length - 1) {
      newSelected = newSelected.concat(selectedSimulations.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedSimulations.slice(0, selectedIndex),
        selectedSimulations.slice(selectedIndex + 1)
      );
    }

    setSelectedSimulations(newSelected);
  };

  const isSelected = (id) => selectedSimulations.indexOf(id) !== -1;

  // Handle actions
  const handleViewSimulation = (simulation) => {
    if (onViewSimulation) {
      onViewSimulation(simulation);
    }
  };

  const handleCompareSelected = () => {
    if (selectedSimulations.length >= 2 && onCompareSimulations) {
      onCompareSimulations(selectedSimulations);
    }
  };

  const handleRerunSimulation = (simulation) => {
    if (onRerunSimulation) {
      onRerunSimulation(simulation);
    }
  };

  const handleDeleteSimulation = async () => {
    if (!simulationToDelete) return;

    try {
      // TODO: Implement delete simulation action in Redux
      console.log('Delete simulation:', simulationToDelete.id);
      setDeleteDialogOpen(false);
      setSimulationToDelete(null);
      fetchSimulationsData(); // Refresh the list
    } catch (err) {
      console.error('Error deleting simulation:', err);
    }
  };

  const handleExportSimulation = async (simulation, format = 'json') => {
    try {
      // TODO: Implement export simulation functionality
      console.log('Export simulation:', simulation.id, format);
      // Placeholder: show alert for now
      alert(`Export functionality for ${simulation.name} will be implemented soon.`);
    } catch (err) {
      console.error('Error exporting simulation:', err);
    }
  };

  // Status chip color mapping
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

  // Format date
  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" component="h2">
              Simulation History
            </Typography>
            <Box display="flex" gap={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={fetchSimulations} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Toggle Filters">
                <IconButton onClick={() => setShowFilters(!showFilters)}>
                  <FilterIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Filters */}
          {showFilters && (
            <Box display="flex" gap={2} mb={2} flexWrap="wrap">
              <TextField
                label="Search"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: <SearchIcon color="action" />
                }}
                sx={{ minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="running">Running</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Selection toolbar */}
          {selectedSimulations.length > 0 && (
            <Toolbar
              sx={{
                pl: { sm: 2 },
                pr: { xs: 1, sm: 1 },
                bgcolor: 'action.selected',
                borderRadius: 1,
                mb: 2
              }}
            >
              <Typography
                sx={{ flex: '1 1 100%' }}
                color="inherit"
                variant="subtitle1"
                component="div"
              >
                {selectedSimulations.length} selected
              </Typography>
              {selectedSimulations.length >= 2 && (
                <Tooltip title="Compare Selected">
                  <IconButton onClick={handleCompareSelected}>
                    <CompareIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Toolbar>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      indeterminate={selectedSimulations.length > 0 && selectedSimulations.length < simulations.length}
                      checked={simulations.length > 0 && selectedSimulations.length === simulations.length}
                      onChange={handleSelectAllClick}
                    />
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'name'}
                      direction={orderBy === 'name' ? order : 'asc'}
                      onClick={() => handleRequestSort('name')}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'created_at'}
                      direction={orderBy === 'created_at' ? order : 'asc'}
                      onClick={() => handleRequestSort('created_at')}
                    >
                      Created
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : simulations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No simulations found
                    </TableCell>
                  </TableRow>
                ) : (
                  simulations.map((simulation) => {
                    const isItemSelected = isSelected(simulation.id);
                    return (
                      <TableRow
                        key={simulation.id}
                        hover
                        onClick={(event) => handleClick(event, simulation.id)}
                        role="checkbox"
                        aria-checked={isItemSelected}
                        selected={isItemSelected}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            color="primary"
                            checked={isItemSelected}
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {simulation.name}
                            </Typography>
                            {simulation.description && (
                              <Typography variant="caption" color="text.secondary">
                                {simulation.description}
                              </Typography>
                            )}
                          </Box>
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
                          {simulation.status === 'running' ? (
                            <Box display="flex" alignItems="center" gap={1}>
                              <CircularProgress size={16} />
                              <Typography variant="caption">
                                {Math.round(simulation.progress || 0)}%
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption">
                              {simulation.status === 'completed' ? '100%' : '-'}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewSimulation(simulation);
                                }}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            {simulation.status === 'completed' && (
                              <>
                                <Tooltip title="Rerun">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRerunSimulation(simulation);
                                    }}
                                  >
                                    <PlayIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Export">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportSimulation(simulation);
                                    }}
                                  >
                                    <ExportIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSimulationToDelete(simulation);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={pagination?.total_items || 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Simulation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the simulation "{simulationToDelete?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteSimulation} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SimulationHistoryBrowser;