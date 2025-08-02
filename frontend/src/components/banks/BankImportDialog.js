import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle
} from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { importBanks } from '../../store/banksSlice';

/**
 * Dialog for importing bank data from CSV files
 */
const BankImportDialog = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('select'); // 'select', 'preview', 'importing', 'result'

  const expectedColumns = [
    'Bank Name',
    'CET1 Ratio (%)',
    'Total Assets (€B)',
    'Interbank Assets (€B)',
    'Interbank Liabilities (€B)',
    'Capital Buffer (€B)' // Optional
  ];

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setSelectedFile(file);
    previewFile(file);
  };

  const previewFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('CSV file must contain at least a header row and one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1, 6).map(line => // Preview first 5 rows
          line.split(',').map(cell => cell.trim().replace(/"/g, ''))
        );

        // Validate headers
        const missingColumns = expectedColumns.filter(col => 
          col !== 'Capital Buffer (€B)' && !headers.includes(col)
        );

        const extraColumns = headers.filter(col => !expectedColumns.includes(col));

        setPreviewData({
          headers,
          rows,
          totalRows: lines.length - 1,
          missingColumns,
          extraColumns,
          isValid: missingColumns.length === 0
        });

        setStep('preview');
      } catch (error) {
        alert(`Error reading CSV file: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!selectedFile || !previewData?.isValid) return;

    setStep('importing');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const result = await dispatch(importBanks(formData)).unwrap();
      setImportResult(result);
      setStep('result');
    } catch (error) {
      setImportResult({
        created: 0,
        updated: 0,
        errors: [error.message || 'Import failed']
      });
      setStep('result');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedFile(null);
      setPreviewData(null);
      setImportResult(null);
      setStep('select');
      onClose();
    }
  };

  const handleStartOver = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setStep('select');
  };

  const renderFileSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Import Bank Data from CSV
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload a CSV file containing bank data. The file should include the following columns:
      </Typography>

      <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
          Required Columns:
        </Typography>
        <List dense>
          {expectedColumns.map((col, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {col.includes('Optional') ? <WarningIcon color="warning" /> : <CheckCircle color="success" />}
              </ListItemIcon>
              <ListItemText 
                primary={col}
                secondary={col === 'Capital Buffer (€B)' ? 'Optional - will be calculated if not provided' : null}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          bgcolor: dragOver ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Drop CSV file here or click to browse
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Supported format: CSV files only
        </Typography>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
      </Paper>
    </Box>
  );

  const renderPreview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Preview Import Data
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          File: {selectedFile?.name} ({previewData?.totalRows} rows)
        </Typography>
      </Box>

      {/* Validation Results */}
      {previewData?.missingColumns.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Missing required columns: {previewData.missingColumns.join(', ')}
        </Alert>
      )}

      {previewData?.extraColumns.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Extra columns found (will be ignored): {previewData.extraColumns.join(', ')}
        </Alert>
      )}

      {previewData?.isValid && (
        <Alert severity="success" sx={{ mb: 2 }}>
          File format is valid and ready for import
        </Alert>
      )}

      {/* Data Preview */}
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {previewData?.headers.map((header, index) => (
                <TableCell key={index}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {header}
                    {expectedColumns.includes(header) ? (
                      <Chip label="Required" size="small" color="success" />
                    ) : header === 'Capital Buffer (€B)' ? (
                      <Chip label="Optional" size="small" color="warning" />
                    ) : (
                      <Chip label="Extra" size="small" color="default" />
                    )}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {previewData?.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {previewData?.totalRows > 5 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Showing first 5 rows. Total rows to import: {previewData.totalRows}
        </Typography>
      )}
    </Box>
  );

  const renderImporting = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Typography variant="h6" gutterBottom>
        Importing Bank Data...
      </Typography>
      <LinearProgress sx={{ mt: 2, mb: 2 }} />
      <Typography variant="body2" color="text.secondary">
        Please wait while we process your file
      </Typography>
    </Box>
  );

  const renderResult = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Import Results
      </Typography>

      {importResult && (
        <Box sx={{ mb: 3 }}>
          <Alert 
            severity={importResult.errors?.length > 0 ? 'warning' : 'success'}
            sx={{ mb: 2 }}
          >
            Import completed: {importResult.created} banks created, {importResult.updated} banks updated
            {importResult.errors?.length > 0 && ` with ${importResult.errors.length} errors`}
          </Alert>

          {/* Success Summary */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
              Summary:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Chip 
                icon={<SuccessIcon />} 
                label={`${importResult.created} Created`} 
                color="success" 
                size="small" 
              />
              <Chip 
                icon={<SuccessIcon />} 
                label={`${importResult.updated} Updated`} 
                color="info" 
                size="small" 
              />
              {importResult.errors?.length > 0 && (
                <Chip 
                  icon={<ErrorIcon />} 
                  label={`${importResult.errors.length} Errors`} 
                  color="error" 
                  size="small" 
                />
              )}
            </Box>
          </Paper>

          {/* Errors */}
          {importResult.errors?.length > 0 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                Errors:
              </Typography>
              <List dense>
                {importResult.errors.map((error, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <ErrorIcon color="error" />
                    </ListItemIcon>
                    <ListItemText primary={error} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );

  const getDialogActions = () => {
    switch (step) {
      case 'select':
        return (
          <>
            <Button onClick={handleClose}>Cancel</Button>
          </>
        );
      case 'preview':
        return (
          <>
            <Button onClick={handleStartOver}>Back</Button>
            <Button 
              onClick={handleImport}
              variant="contained"
              disabled={!previewData?.isValid}
            >
              Import {previewData?.totalRows} Banks
            </Button>
          </>
        );
      case 'importing':
        return (
          <Button disabled>Importing...</Button>
        );
      case 'result':
        return (
          <>
            <Button onClick={handleStartOver}>Import Another File</Button>
            <Button onClick={handleClose} variant="contained">Done</Button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        Import Bank Data
      </DialogTitle>

      <DialogContent dividers>
        {step === 'select' && renderFileSelection()}
        {step === 'preview' && renderPreview()}
        {step === 'importing' && renderImporting()}
        {step === 'result' && renderResult()}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        {getDialogActions()}
      </DialogActions>
    </Dialog>
  );
};

export default BankImportDialog;