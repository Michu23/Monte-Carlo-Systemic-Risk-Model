import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  InputAdornment,
  Tooltip
} from '@mui/material';
import {
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Link as LinkIcon,
  Close as CloseIcon,
  Add as AddIcon
} from '@mui/icons-material';
import exportService from '../../services/exportService';

const ShareDialog = ({
  open,
  onClose,
  simulationId,
  simulationName
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [shareLinks, setShareLinks] = useState([]);
  
  // New share link form
  const [expiresIn, setExpiresIn] = useState(7);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [includeRawData, setIncludeRawData] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open && simulationId) {
      fetchShareLinks();
    }
  }, [open, simulationId]);

  const fetchShareLinks = async () => {
    try {
      setLoading(true);
      const links = await exportService.getShareLinks(simulationId);
      setShareLinks(links);
    } catch (err) {
      setError('Failed to fetch share links');
      console.error('Error fetching share links:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShareLink = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const options = {
        expiresIn,
        passwordProtected,
        password: passwordProtected ? password : null,
        includeRawData
      };
      
      const shareData = await exportService.generateShareLink(simulationId, options);
      
      setSuccess('Share link created successfully!');
      setPassword('');
      setPasswordProtected(false);
      
      // Refresh the list
      await fetchShareLinks();
      
    } catch (err) {
      setError('Failed to create share link');
      console.error('Error creating share link:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (shareUrl) => {
    try {
      await exportService.copyToClipboard(shareUrl);
      setSuccess('Link copied to clipboard!');
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  const handleRevokeLink = async (shareToken) => {
    try {
      setLoading(true);
      await exportService.revokeShareLink(simulationId, shareToken);
      setSuccess('Share link revoked successfully!');
      
      // Refresh the list
      await fetchShareLinks();
      
    } catch (err) {
      setError('Failed to revoke share link');
      console.error('Error revoking share link:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatExpiryDate = (expiresAt) => {
    try {
      return new Date(expiresAt).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const isExpired = (expiresAt) => {
    try {
      return new Date(expiresAt) < new Date();
    } catch {
      return false;
    }
  };

  const getShareUrl = (shareToken) => {
    return `${window.location.origin}/shared/${shareToken}`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ShareIcon />
          Share Simulation Results
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Typography variant="h6" gutterBottom>
          {simulationName}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create shareable links that allow others to view your simulation results without requiring an account.
        </Typography>

        {/* Create New Share Link */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Create New Share Link
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Expires in (days)"
              type="number"
              value={expiresIn}
              onChange={(e) => setExpiresIn(Math.max(1, parseInt(e.target.value) || 1))}
              size="small"
              inputProps={{ min: 1, max: 365 }}
              helperText="Link will expire after this many days"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={passwordProtected}
                  onChange={(e) => setPasswordProtected(e.target.checked)}
                />
              }
              label="Password protected"
            />
            
            {passwordProtected && (
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="small"
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                helperText="Others will need this password to access the shared results"
              />
            )}
            
            <FormControlLabel
              control={
                <Switch
                  checked={includeRawData}
                  onChange={(e) => setIncludeRawData(e.target.checked)}
                />
              }
              label="Include raw simulation data"
            />
            
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
              onClick={handleCreateShareLink}
              disabled={loading || (passwordProtected && !password.trim())}
            >
              {loading ? 'Creating...' : 'Create Share Link'}
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Existing Share Links */}
        <Typography variant="h6" gutterBottom>
          Active Share Links
        </Typography>
        
        {loading && shareLinks.length === 0 ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        ) : shareLinks.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No active share links. Create one above to get started.
          </Typography>
        ) : (
          <List>
            {shareLinks.map((link, index) => (
              <ListItem key={link.token} divider={index < shareLinks.length - 1}>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinkIcon fontSize="small" />
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {getShareUrl(link.token).substring(0, 50)}...
                      </Typography>
                      {link.password_protected && (
                        <Chip label="Password Protected" size="small" color="warning" />
                      )}
                      {isExpired(link.expires_at) && (
                        <Chip label="Expired" size="small" color="error" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Created: {formatExpiryDate(link.created_at)}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        Expires: {formatExpiryDate(link.expires_at)}
                      </Typography>
                      {link.include_raw_data && (
                        <>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            Includes raw data
                          </Typography>
                        </>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box display="flex" gap={0.5}>
                    <Tooltip title="Copy Link">
                      <IconButton
                        size="small"
                        onClick={() => handleCopyLink(getShareUrl(link.token))}
                        disabled={isExpired(link.expires_at)}
                      >
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Revoke Link">
                      <IconButton
                        size="small"
                        onClick={() => handleRevokeLink(link.token)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button
          onClick={onClose}
          startIcon={<CloseIcon />}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareDialog;