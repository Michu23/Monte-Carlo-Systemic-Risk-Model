import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  Chip,
  Tooltip,
  Alert,
  LinearProgress,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { fetchBanks, deleteBank } from '../store/banksSlice';
import BankEditDialog from '../components/banks/BankEditDialog';
import BankImportDialog from '../components/banks/BankImportDialog';
import bankService from '../services/bankService';

/**
 * Banks list page with CRUD operations
 */
const BanksList = () => {
  const dispatch = useDispatch();
  const { banks, pagination, loading, error } = useSelector(state => state.banks);
  const { user } = useSelector(state => state.auth);
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [editMode, setEditMode] = useState('create');
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuBank, setMenuBank] = useState(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadBanks();
  }, [dispatch, page, rowsPerPage, searchTerm, sortBy, sortDir]);

  const loadBanks = () => {
    dispatch(fetchBanks({
      page: page + 1,
      per_page: rowsPerPage,
      search: searchTerm,
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

  const handleSortChange = (event) => {
    setSortBy(event.target.value);
    setPage(0);
  };

  const handleSortDirChange = (event) => {
    setSortDir(event.target.value);
    setPage(0);
  };

  const handleRefresh = () => {
    loadBanks();
  };

  // Bank operations
  const handleAddBank = () => {
    setSelectedBank(null);
    setEditMode('create');
    setEditDialogOpen(true);
  };

  const handleEditBank = (bank) => {
    setSelectedBank(bank);
    setEditMode('edit');
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = (bank) => {
    setSelectedBank(bank);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (selectedBank) {
      try {
        await dispatch(deleteBank(selectedBank.id)).unwrap();
        setDeleteDialogOpen(false);
        setSelectedBank(null);
      } catch (error) {
        // Error handling is done by Redux
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedBank(null);
  };

  const handleImportBanks = () => {
    setImportDialogOpen(true);
  };

  const handleExportBanks = async () => {
    try {
      const csvData = await bankService.exportBanks();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `banks_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Menu handlers
  const handleMenuOpen = (event, bank) => {
    setAnchorEl(event.currentTarget);
    setMenuBank(bank);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuBank(null);
  };

  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(decimals) : value;
  };

  const getCapitalAdequacyColor = (cet1Ratio) => {
    if (cet1Ratio >= 12) return 'success';
    if (cet1Ratio >= 8) return 'warning';
    return 'error';
  };

  const getCapitalAdequacyLabel = (cet1Ratio) => {
    if (cet1Ratio >= 12) return 'Strong';
    if (cet1Ratio >= 8) return 'Adequate';
    return 'Weak';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Banks Management
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isAdmin && (
            <>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={handleImportBanks}
              >
                Import
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportBanks}
              >
                Export
              </Button>
              
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddBank}
              >
                Add Bank
              </Button>
            </>
          )}
          
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Search banks"
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
          
          <FormControl size="small" sx={{ minWidth: '120px' }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={handleSortChange}
              label="Sort By"
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="total_assets">Total Assets</MenuItem>
              <MenuItem value="cet1_ratio">CET1 Ratio</MenuItem>
              <MenuItem value="capital_buffer">Capital Buffer</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: '100px' }}>
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

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Banks Table */}
      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        
        <Table sx={{ minWidth: 650 }} aria-label="banks table">
          <TableHead>
            <TableRow>
              <TableCell>Bank Name</TableCell>
              <TableCell align="right">CET1 Ratio (%)</TableCell>
              <TableCell align="right">Total Assets (€B)</TableCell>
              <TableCell align="right">Interbank Assets (€B)</TableCell>
              <TableCell align="right">Interbank Liabilities (€B)</TableCell>
              <TableCell align="right">Capital Buffer (€B)</TableCell>
              <TableCell align="center">Capital Adequacy</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {banks.map((bank) => (
              <TableRow
                key={bank.id}
                hover
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {bank.name}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {formatNumber(bank.cet1_ratio, 1)}%
                </TableCell>
                <TableCell align="right">
                  {formatNumber(bank.total_assets, 1)}
                </TableCell>
                <TableCell align="right">
                  {formatNumber(bank.interbank_assets, 1)}
                </TableCell>
                <TableCell align="right">
                  {formatNumber(bank.interbank_liabilities, 1)}
                </TableCell>
                <TableCell align="right">
                  {formatNumber(bank.capital_buffer, 2)}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={getCapitalAdequacyLabel(bank.cet1_ratio)}
                    color={getCapitalAdequacyColor(bank.cet1_ratio)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, bank)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            
            {banks.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1">
                    No banks found. {isAdmin ? 'Add some banks to get started.' : 'Contact an administrator to add banks.'}
                  </Typography>
                  {isAdmin && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddBank}
                      sx={{ mt: 2 }}
                    >
                      Add First Bank
                    </Button>
                  )}
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

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleEditBank(menuBank)} disabled={!isAdmin}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleDeleteClick(menuBank)} disabled={!isAdmin}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <BankEditDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        bank={selectedBank}
        mode={editMode}
      />

      {/* Import Dialog */}
      <BankImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Delete Bank
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete "{selectedBank?.name}"? This action cannot be undone and may affect existing simulations.
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

export default BanksList;