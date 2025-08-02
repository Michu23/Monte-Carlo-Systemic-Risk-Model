import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Box,
  Typography,
  Alert,
  InputAdornment,
  FormHelperText
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { createBank, updateBank } from '../../store/banksSlice';

/**
 * Dialog for creating or editing bank data
 */
const BankEditDialog = ({
  open,
  onClose,
  bank = null, // null for create, bank object for edit
  mode = 'create' // 'create' or 'edit'
}) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    name: '',
    cet1_ratio: '',
    total_assets: '',
    interbank_assets: '',
    interbank_liabilities: '',
    capital_buffer: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [autoCalculateBuffer, setAutoCalculateBuffer] = useState(true);

  useEffect(() => {
    if (bank && mode === 'edit') {
      setFormData({
        name: bank.name || '',
        cet1_ratio: bank.cet1_ratio?.toString() || '',
        total_assets: bank.total_assets?.toString() || '',
        interbank_assets: bank.interbank_assets?.toString() || '',
        interbank_liabilities: bank.interbank_liabilities?.toString() || '',
        capital_buffer: bank.capital_buffer?.toString() || ''
      });
      setAutoCalculateBuffer(false);
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        cet1_ratio: '',
        total_assets: '',
        interbank_assets: '',
        interbank_liabilities: '',
        capital_buffer: ''
      });
      setAutoCalculateBuffer(true);
    }
    setErrors({});
  }, [bank, mode, open]);

  // Auto-calculate capital buffer when CET1 ratio or total assets change
  useEffect(() => {
    if (autoCalculateBuffer && formData.cet1_ratio && formData.total_assets) {
      const cet1 = parseFloat(formData.cet1_ratio);
      const assets = parseFloat(formData.total_assets);
      if (!isNaN(cet1) && !isNaN(assets)) {
        const buffer = (cet1 * assets * 0.01).toFixed(2);
        setFormData(prev => ({ ...prev, capital_buffer: buffer }));
      }
    }
  }, [formData.cet1_ratio, formData.total_assets, autoCalculateBuffer]);

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Bank name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Bank name must be at least 2 characters';
    }

    // Numeric field validations
    const numericFields = [
      { key: 'cet1_ratio', label: 'CET1 Ratio', min: 0, max: 100 },
      { key: 'total_assets', label: 'Total Assets', min: 0.1, max: 10000 },
      { key: 'interbank_assets', label: 'Interbank Assets', min: 0, max: 5000 },
      { key: 'interbank_liabilities', label: 'Interbank Liabilities', min: 0, max: 5000 },
      { key: 'capital_buffer', label: 'Capital Buffer', min: 0, max: 1000 }
    ];

    numericFields.forEach(field => {
      const value = parseFloat(formData[field.key]);
      if (!formData[field.key] || isNaN(value)) {
        newErrors[field.key] = `${field.label} is required and must be a number`;
      } else if (value < field.min) {
        newErrors[field.key] = `${field.label} must be at least ${field.min}`;
      } else if (value > field.max) {
        newErrors[field.key] = `${field.label} cannot exceed ${field.max}`;
      }
    });

    // Business logic validations
    const totalAssets = parseFloat(formData.total_assets);
    const interbankAssets = parseFloat(formData.interbank_assets);
    
    if (!isNaN(totalAssets) && !isNaN(interbankAssets) && interbankAssets > totalAssets) {
      newErrors.interbank_assets = 'Interbank assets cannot exceed total assets';
    }

    // CET1 ratio reasonableness check
    const cet1 = parseFloat(formData.cet1_ratio);
    if (!isNaN(cet1) && (cet1 < 4 || cet1 > 30)) {
      newErrors.cet1_ratio = 'CET1 ratio should typically be between 4% and 30%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Disable auto-calculation if user manually edits capital buffer
    if (field === 'capital_buffer') {
      setAutoCalculateBuffer(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const bankData = {
        name: formData.name.trim(),
        cet1_ratio: parseFloat(formData.cet1_ratio),
        total_assets: parseFloat(formData.total_assets),
        interbank_assets: parseFloat(formData.interbank_assets),
        interbank_liabilities: parseFloat(formData.interbank_liabilities),
        capital_buffer: parseFloat(formData.capital_buffer)
      };

      if (mode === 'edit' && bank) {
        await dispatch(updateBank({ bankId: bank.id, bankData })).unwrap();
      } else {
        await dispatch(createBank(bankData)).unwrap();
      }

      onClose();
    } catch (error) {
      // Error handling is done by Redux
      console.error('Failed to save bank:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const title = mode === 'edit' ? 'Edit Bank' : 'Add New Bank';

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Typography variant="h6">{title}</Typography>
        {mode === 'edit' && bank && (
          <Typography variant="body2" color="text.secondary">
            Editing: {bank.name}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mt: 1 }}>
          <Grid container spacing={3}>
            {/* Bank Name */}
            <Grid item xs={12}>
              <TextField
                label="Bank Name"
                value={formData.name}
                onChange={handleInputChange('name')}
                error={!!errors.name}
                helperText={errors.name}
                fullWidth
                required
                placeholder="Enter bank name"
              />
            </Grid>

            {/* CET1 Ratio */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="CET1 Ratio"
                value={formData.cet1_ratio}
                onChange={handleInputChange('cet1_ratio')}
                error={!!errors.cet1_ratio}
                helperText={errors.cet1_ratio || 'Common Equity Tier 1 capital ratio'}
                fullWidth
                required
                type="number"
                inputProps={{ min: 0, max: 100, step: 0.1 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
              />
            </Grid>

            {/* Total Assets */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Total Assets"
                value={formData.total_assets}
                onChange={handleInputChange('total_assets')}
                error={!!errors.total_assets}
                helperText={errors.total_assets || 'Total bank assets'}
                fullWidth
                required
                type="number"
                inputProps={{ min: 0, step: 0.1 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€B</InputAdornment>
                }}
              />
            </Grid>

            {/* Interbank Assets */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Interbank Assets"
                value={formData.interbank_assets}
                onChange={handleInputChange('interbank_assets')}
                error={!!errors.interbank_assets}
                helperText={errors.interbank_assets || 'Assets exposed to other banks'}
                fullWidth
                required
                type="number"
                inputProps={{ min: 0, step: 0.1 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€B</InputAdornment>
                }}
              />
            </Grid>

            {/* Interbank Liabilities */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Interbank Liabilities"
                value={formData.interbank_liabilities}
                onChange={handleInputChange('interbank_liabilities')}
                error={!!errors.interbank_liabilities}
                helperText={errors.interbank_liabilities || 'Liabilities to other banks'}
                fullWidth
                required
                type="number"
                inputProps={{ min: 0, step: 0.1 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€B</InputAdornment>
                }}
              />
            </Grid>

            {/* Capital Buffer */}
            <Grid item xs={12}>
              <TextField
                label="Capital Buffer"
                value={formData.capital_buffer}
                onChange={handleInputChange('capital_buffer')}
                error={!!errors.capital_buffer}
                helperText={
                  errors.capital_buffer || 
                  (autoCalculateBuffer ? 'Auto-calculated from CET1 ratio and total assets' : 'Manually set capital buffer')
                }
                fullWidth
                required
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€B</InputAdornment>
                }}
              />
              {autoCalculateBuffer && (
                <FormHelperText>
                  Formula: CET1 Ratio × Total Assets × 0.01
                </FormHelperText>
              )}
            </Grid>

            {/* Validation Summary */}
            {Object.keys(errors).length > 0 && (
              <Grid item xs={12}>
                <Alert severity="error">
                  Please fix the validation errors above before saving.
                </Alert>
              </Grid>
            )}

            {/* Data Quality Indicators */}
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  Data Quality Indicators
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Asset Utilization
                    </Typography>
                    <Typography variant="body2">
                      {formData.total_assets && formData.interbank_assets
                        ? `${((parseFloat(formData.interbank_assets) / parseFloat(formData.total_assets)) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Capital Adequacy
                    </Typography>
                    <Typography variant="body2">
                      {formData.cet1_ratio
                        ? parseFloat(formData.cet1_ratio) >= 8 ? 'Adequate' : 'Below Basel III'
                        : 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          color="inherit"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={loading || Object.keys(errors).length > 0}
        >
          {loading ? 'Saving...' : (mode === 'edit' ? 'Update Bank' : 'Create Bank')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BankEditDialog;