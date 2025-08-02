import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  TextField,
  Slider,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton,
  Alert,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  RestoreOutlined as ResetIcon,
  InfoOutlined as InfoIcon,
  PlayArrow as RunIcon,
  Save as SaveIcon
} from '@mui/icons-material';

/**
 * Parameter control panel for simulation configuration
 */
const ParameterControlPanel = ({
  initialParameters = {},
  onParametersChange,
  onRunSimulation,
  onSavePreset,
  onSubmit,
  onClose,
  presets = [],
  loading = false,
  disabled = false,
  validationErrors = {},
  open = false,
  title = 'Simulation Parameters',
  submitButtonText = 'Run Simulation',
  mode = 'normal'
}) => {
  // Default parameter values
  const defaultParams = {
    shock_prob: 0.03,
    n_sim: 10000,
    systemic_threshold: 3,
    trad_lgd: 0.6,
    bc_lgd: 0.3,
    bc_liability_reduction: 0.5,
    ...initialParameters
  };
  
  const [parameters, setParameters] = useState(defaultParams);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    advanced: false,
    blockchain: false
  });
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);
  
  // Parameter definitions with metadata
  const parameterDefs = {
    shock_prob: {
      label: 'Initial Shock Probability',
      description: 'Probability that a bank fails in the initial shock',
      min: 0.001,
      max: 0.1,
      step: 0.001,
      unit: '',
      format: (val) => `${(val * 100).toFixed(1)}%`,
      section: 'basic',
      tooltip: 'Higher values increase the likelihood of initial bank failures'
    },
    n_sim: {
      label: 'Number of Simulations',
      description: 'Total number of Monte Carlo simulations to run',
      min: 100,
      max: 50000,
      step: 100,
      unit: '',
      format: (val) => val.toLocaleString(),
      section: 'basic',
      tooltip: 'More simulations provide better statistical accuracy but take longer to run'
    },
    systemic_threshold: {
      label: 'Systemic Event Threshold',
      description: 'Number of bank failures that constitute a systemic event',
      min: 1,
      max: 10,
      step: 1,
      unit: 'banks',
      format: (val) => val.toString(),
      section: 'basic',
      tooltip: 'Events with failures above this threshold are considered systemic crises'
    },
    trad_lgd: {
      label: 'Traditional LGD',
      description: 'Loss Given Default for traditional banking system',
      min: 0.1,
      max: 0.9,
      step: 0.01,
      unit: '',
      format: (val) => `${(val * 100).toFixed(0)}%`,
      section: 'advanced',
      tooltip: 'Percentage of exposure lost when a bank defaults in traditional system'
    },
    bc_lgd: {
      label: 'Blockchain LGD',
      description: 'Loss Given Default for blockchain banking system',
      min: 0.05,
      max: 0.8,
      step: 0.01,
      unit: '',
      format: (val) => `${(val * 100).toFixed(0)}%`,
      section: 'blockchain',
      tooltip: 'Percentage of exposure lost when a bank defaults in blockchain system'
    },
    bc_liability_reduction: {
      label: 'Blockchain Liability Reduction',
      description: 'Reduction in interbank liabilities due to blockchain efficiency',
      min: 0.1,
      max: 0.9,
      step: 0.01,
      unit: '',
      format: (val) => `${(val * 100).toFixed(0)}%`,
      section: 'blockchain',
      tooltip: 'How much blockchain reduces interbank exposures compared to traditional system'
    }
  };
  
  useEffect(() => {
    if (onParametersChange) {
      onParametersChange(parameters);
    }
  }, [parameters, onParametersChange]);
  
  const handleParameterChange = (paramName, value) => {
    const def = parameterDefs[paramName];
    const clampedValue = Math.max(def.min, Math.min(def.max, value));
    
    setParameters(prev => ({
      ...prev,
      [paramName]: clampedValue
    }));
  };
  
  const handleSliderChange = (paramName) => (event, newValue) => {
    handleParameterChange(paramName, newValue);
  };
  
  const handleTextFieldChange = (paramName) => (event) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      handleParameterChange(paramName, value);
    }
  };
  
  const handleAccordionChange = (section) => (event, isExpanded) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: isExpanded
    }));
  };
  
  const handleReset = () => {
    setParameters(defaultParams);
  };
  
  const handleLoadPreset = (preset) => {
    setParameters({ ...defaultParams, ...preset.parameters });
  };
  
  const handleSavePreset = () => {
    if (presetName.trim() && onSavePreset) {
      onSavePreset({
        name: presetName.trim(),
        parameters: { ...parameters },
        createdAt: new Date().toISOString()
      });
      setPresetName('');
      setShowSavePreset(false);
    }
  };
  
  const renderParameterControl = (paramName) => {
    const def = parameterDefs[paramName];
    const value = parameters[paramName];
    const error = validationErrors[paramName];
    
    return (
      <Grid item xs={12} key={paramName}>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, flexGrow: 1 }}>
              {def.label}
            </Typography>
            <Tooltip title={def.tooltip} arrow>
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            {def.description}
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={8}>
              <Slider
                value={value}
                onChange={handleSliderChange(paramName)}
                min={def.min}
                max={def.max}
                step={def.step}
                disabled={disabled || loading}
                valueLabelDisplay="auto"
                valueLabelFormat={def.format}
                sx={{
                  '& .MuiSlider-valueLabel': {
                    fontSize: '0.75rem'
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={4}>
              <TextField
                value={value}
                onChange={handleTextFieldChange(paramName)}
                size="small"
                type="number"
                inputProps={{
                  min: def.min,
                  max: def.max,
                  step: def.step
                }}
                disabled={disabled || loading}
                error={!!error}
                helperText={error}
                sx={{ width: '100%' }}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Min: {def.format(def.min)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Current: {def.format(value)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Max: {def.format(def.max)}
            </Typography>
          </Box>
        </Box>
      </Grid>
    );
  };
  
  const getSectionParameters = (section) => {
    return Object.keys(parameterDefs).filter(key => parameterDefs[key].section === section);
  };
  
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(parameters);
    } else if (onRunSimulation) {
      onRunSimulation(parameters);
    }
  };

  const renderContent = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Reset to defaults">
            <IconButton onClick={handleReset} disabled={disabled || loading}>
              <ResetIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="outlined"
            size="small"
            startIcon={<SaveIcon />}
            onClick={() => setShowSavePreset(!showSavePreset)}
            disabled={disabled || loading}
          >
            Save Preset
          </Button>
        </Box>
      </Box>
      
      {/* Validation Errors */}
      {hasValidationErrors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Please fix the following errors before running the simulation:
          <ul>
            {Object.entries(validationErrors).map(([param, error]) => (
              <li key={param}>{parameterDefs[param]?.label}: {error}</li>
            ))}
          </ul>
        </Alert>
      )}
      
      {/* Save Preset */}
      {showSavePreset && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={8}>
              <TextField
                label="Preset Name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                size="small"
                fullWidth
                placeholder="Enter preset name..."
              />
            </Grid>
            <Grid item xs={4}>
              <Button
                variant="contained"
                size="small"
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                fullWidth
              >
                Save
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {/* Presets */}
      {presets.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            Saved Presets
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {presets.map((preset, index) => (
              <Chip
                key={index}
                label={preset.name}
                onClick={() => handleLoadPreset(preset)}
                variant="outlined"
                size="small"
                disabled={disabled || loading}
              />
            ))}
          </Box>
        </Box>
      )}
      
      <Divider sx={{ mb: 2 }} />
      
      {/* Basic Parameters */}
      <Accordion
        expanded={expandedSections.basic}
        onChange={handleAccordionChange('basic')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Basic Parameters
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {getSectionParameters('basic').map(renderParameterControl)}
          </Grid>
        </AccordionDetails>
      </Accordion>
      
      {/* Advanced Parameters */}
      <Accordion
        expanded={expandedSections.advanced}
        onChange={handleAccordionChange('advanced')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Advanced Parameters
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {getSectionParameters('advanced').map(renderParameterControl)}
          </Grid>
        </AccordionDetails>
      </Accordion>
      
      {/* Blockchain Parameters */}
      <Accordion
        expanded={expandedSections.blockchain}
        onChange={handleAccordionChange('blockchain')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Blockchain Parameters
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {getSectionParameters('blockchain').map(renderParameterControl)}
          </Grid>
        </AccordionDetails>
      </Accordion>
      
      {/* Run Simulation Button - only show in normal mode */}
      {mode === 'normal' && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<RunIcon />}
            onClick={handleSubmit}
            disabled={disabled || loading || hasValidationErrors}
            sx={{ minWidth: 200 }}
          >
            {loading ? 'Running Simulation...' : submitButtonText}
          </Button>
        </Box>
      )}
      
      {/* Parameter Summary */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
          Current Configuration Summary
        </Typography>
        <Grid container spacing={1}>
          {Object.entries(parameters).map(([key, value]) => {
            const def = parameterDefs[key];
            return (
              <Grid item xs={6} sm={4} key={key}>
                <Typography variant="caption" color="text.secondary">
                  {def.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {def.format(value)}
                </Typography>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );

  // Return dialog mode if open prop is true
  if (open) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent sx={{ overflow: 'auto' }}>
          {renderContent()}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={disabled || loading || hasValidationErrors}
            startIcon={<RunIcon />}
          >
            {loading ? 'Processing...' : submitButtonText}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Return normal mode
  return (
    <Paper sx={{ p: 3 }}>
      {renderContent()}
    </Paper>
  );
};

export default ParameterControlPanel;