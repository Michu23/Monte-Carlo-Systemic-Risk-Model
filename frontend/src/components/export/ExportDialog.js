import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Typography,
  Box,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  Description as PdfIcon,
  TableChart as CsvIcon,
  Code as JsonIcon,
  Image as ImageIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const ExportDialog = ({
  open,
  onClose,
  onExport,
  simulationData,
  loading = false,
  error = null
}) => {
  const [exportFormat, setExportFormat] = useState('json');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRawData, setIncludeRawData] = useState(false);
  const [includeParameters, setIncludeParameters] = useState(true);
  const [includeStatistics, setIncludeStatistics] = useState(true);

  const handleExport = () => {
    const exportOptions = {
      format: exportFormat,
      includeCharts,
      includeRawData,
      includeParameters,
      includeStatistics
    };
    
    if (onExport) {
      onExport(exportOptions);
    }
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'csv':
        return <CsvIcon color="success" />;
      case 'json':
        return <JsonIcon color="primary" />;
      case 'images':
        return <ImageIcon color="warning" />;
      default:
        return <DownloadIcon />;
    }
  };

  const getFormatDescription = (format) => {
    switch (format) {
      case 'pdf':
        return 'Complete report with charts and analysis';
      case 'csv':
        return 'Raw data in spreadsheet format';
      case 'json':
        return 'Structured data for further analysis';
      case 'images':
        return 'High-resolution chart images';
      default:
        return '';
    }
  };

  const getEstimatedSize = () => {
    if (!simulationData) return 'Unknown';
    
    let size = 'Small';
    if (includeRawData) size = 'Large';
    else if (includeCharts) size = 'Medium';
    
    return size;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <DownloadIcon />
          Export Simulation Results
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Export Format Selection */}
        <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
          <FormLabel component="legend" sx={{ mb: 2 }}>
            Export Format
          </FormLabel>
          <RadioGroup
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
          >
            <FormControlLabel
              value="json"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1} width="100%">
                  {getFormatIcon('json')}
                  <Box>
                    <Typography variant="body1">JSON</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getFormatDescription('json')}
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <FormControlLabel
              value="csv"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1} width="100%">
                  {getFormatIcon('csv')}
                  <Box>
                    <Typography variant="body1">CSV</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getFormatDescription('csv')}
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <FormControlLabel
              value="pdf"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1} width="100%">
                  {getFormatIcon('pdf')}
                  <Box>
                    <Typography variant="body1">PDF Report</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getFormatDescription('pdf')}
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <FormControlLabel
              value="images"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1} width="100%">
                  {getFormatIcon('images')}
                  <Box>
                    <Typography variant="body1">Chart Images</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getFormatDescription('images')}
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        {/* Export Options */}
        <Typography variant="h6" gutterBottom>
          Include in Export
        </Typography>
        
        <List dense>
          <ListItem>
            <ListItemIcon>
              <Checkbox
                checked={includeParameters}
                onChange={(e) => setIncludeParameters(e.target.checked)}
              />
            </ListItemIcon>
            <ListItemText
              primary="Simulation Parameters"
              secondary="Configuration used for the simulation"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <Checkbox
                checked={includeStatistics}
                onChange={(e) => setIncludeStatistics(e.target.checked)}
              />
            </ListItemIcon>
            <ListItemText
              primary="Statistical Analysis"
              secondary="Summary statistics and test results"
            />
          </ListItem>
          
          {exportFormat !== 'csv' && (
            <ListItem>
              <ListItemIcon>
                <Checkbox
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                />
              </ListItemIcon>
              <ListItemText
                primary="Charts and Visualizations"
                secondary="Embedded charts and graphs"
              />
            </ListItem>
          )}
          
          <ListItem>
            <ListItemIcon>
              <Checkbox
                checked={includeRawData}
                onChange={(e) => setIncludeRawData(e.target.checked)}
              />
            </ListItemIcon>
            <ListItemText
              primary="Raw Simulation Data"
              secondary="Individual simulation results (increases file size)"
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Export Summary */}
        <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Export Summary
          </Typography>
          <Typography variant="body2">
            Format: <strong>{exportFormat.toUpperCase()}</strong>
          </Typography>
          <Typography variant="body2">
            Estimated Size: <strong>{getEstimatedSize()}</strong>
          </Typography>
          {simulationData && (
            <Typography variant="body2">
              Simulation: <strong>{simulationData.name}</strong>
            </Typography>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button
          onClick={onClose}
          startIcon={<CloseIcon />}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
          disabled={loading}
        >
          {loading ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;