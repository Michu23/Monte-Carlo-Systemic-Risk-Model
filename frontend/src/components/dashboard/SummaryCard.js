import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Chip,
  LinearProgress,
  Avatar
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * Summary card component for displaying key metrics
 */
const SummaryCard = ({
  title,
  value,
  previousValue,
  unit = '',
  subtitle,
  icon,
  color = 'primary',
  trend,
  trendLabel,
  progress,
  comparison,
  onClick,
  loading = false,
  error,
  ...props
}) => {
  const theme = useTheme();
  
  // Calculate trend if not provided
  const calculatedTrend = trend || (previousValue !== undefined && value !== undefined 
    ? (value > previousValue ? 'up' : value < previousValue ? 'down' : 'flat')
    : null);
  
  // Calculate percentage change
  const percentageChange = previousValue !== undefined && previousValue !== 0
    ? ((value - previousValue) / Math.abs(previousValue)) * 100
    : null;
  
  const getTrendIcon = (trendDirection) => {
    switch (trendDirection) {
      case 'up':
        return <TrendingUpIcon color="success" />;
      case 'down':
        return <TrendingDownIcon color="error" />;
      case 'flat':
        return <TrendingFlatIcon color="disabled" />;
      default:
        return null;
    }
  };
  
  const getTrendColor = (trendDirection) => {
    switch (trendDirection) {
      case 'up':
        return theme.palette.success.main;
      case 'down':
        return theme.palette.error.main;
      case 'flat':
        return theme.palette.text.disabled;
      default:
        return theme.palette.text.secondary;
    }
  };
  
  const formatValue = (val) => {
    if (val === undefined || val === null) return 'N/A';
    
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      } else if (val % 1 === 0) {
        return val.toString();
      } else {
        return val.toFixed(2);
      }
    }
    
    return val.toString();
  };
  
  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        } : {},
        position: 'relative',
        overflow: 'visible'
      }}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <LinearProgress
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2
          }}
        />
      )}
      
      <CardContent sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500, mb: 0.5 }}
            >
              {title}
            </Typography>
            
            {error ? (
              <Typography variant="h6" color="error">
                Error
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography
                  variant="h4"
                  component="div"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette[color]?.main || theme.palette.text.primary
                  }}
                >
                  {formatValue(value)}
                </Typography>
                
                {unit && (
                  <Typography variant="body2" color="text.secondary">
                    {unit}
                  </Typography>
                )}
              </Box>
            )}
            
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          
          {icon && (
            <Avatar
              sx={{
                bgcolor: theme.palette[color]?.main || theme.palette.primary.main,
                width: 48,
                height: 48
              }}
            >
              {icon}
            </Avatar>
          )}
        </Box>
        
        {/* Progress bar */}
        {progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.palette.grey[200],
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor: theme.palette[color]?.main || theme.palette.primary.main
                }
              }}
            />
          </Box>
        )}
        
        {/* Trend and comparison */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          {calculatedTrend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getTrendIcon(calculatedTrend)}
              <Typography
                variant="body2"
                sx={{ color: getTrendColor(calculatedTrend), fontWeight: 500 }}
              >
                {percentageChange !== null && (
                  `${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%`
                )}
                {trendLabel && ` ${trendLabel}`}
              </Typography>
            </Box>
          )}
          
          {comparison && (
            <Chip
              label={comparison.label}
              size="small"
              color={comparison.type || 'default'}
              variant="outlined"
            />
          )}
        </Box>
        
        {/* Additional info */}
        {(previousValue !== undefined || error) && (
          <Box sx={{ mt: 1 }}>
            {previousValue !== undefined && (
              <Typography variant="caption" color="text.secondary">
                Previous: {formatValue(previousValue)}{unit}
              </Typography>
            )}
            
            {error && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <InfoIcon fontSize="small" color="error" />
                <Typography variant="caption" color="error">
                  {error}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SummaryCard;