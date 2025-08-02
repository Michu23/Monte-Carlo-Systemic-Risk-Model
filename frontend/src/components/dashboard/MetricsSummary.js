import React from 'react';
import { Grid, Box, Typography } from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  AccountBalance as BankIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import SummaryCard from './SummaryCard';

/**
 * Metrics summary component for simulation results
 */
const MetricsSummary = ({
  traditionalResults,
  blockchainResults,
  improvements,
  statisticalAnalysis,
  loading = false,
  error
}) => {
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
      </Box>
    );
  }
  
  if (!traditionalResults || !blockchainResults) {
    return (
      <Grid container spacing={3}>
        {[...Array(6)].map((_, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <SummaryCard
              title="Loading..."
              value={0}
              loading={true}
            />
          </Grid>
        ))}
      </Grid>
    );
  }
  
  const metrics = [
    {
      title: 'Average Failures',
      traditionalValue: traditionalResults.average_failures,
      blockchainValue: blockchainResults.average_failures,
      improvement: improvements?.average_failures,
      unit: '',
      icon: <AssessmentIcon />,
      color: 'primary',
      description: 'Average number of bank failures per simulation'
    },
    {
      title: 'Maximum Failures',
      traditionalValue: traditionalResults.max_failures,
      blockchainValue: blockchainResults.max_failures,
      improvement: improvements?.max_failures,
      unit: '',
      icon: <WarningIcon />,
      color: 'error',
      description: 'Worst-case scenario: maximum failures observed'
    },
    {
      title: 'Systemic Risk Probability',
      traditionalValue: traditionalResults.probability_systemic_event * 100,
      blockchainValue: blockchainResults.probability_systemic_event * 100,
      improvement: improvements?.probability_systemic_event,
      unit: '%',
      icon: <SecurityIcon />,
      color: 'warning',
      description: 'Probability of systemic banking crisis'
    },
    {
      title: 'Volatility (Std Dev)',
      traditionalValue: traditionalResults.std_dev_failures,
      blockchainValue: blockchainResults.std_dev_failures,
      improvement: improvements?.std_dev_failures,
      unit: '',
      icon: <SpeedIcon />,
      color: 'info',
      description: 'Standard deviation of failure distribution'
    },
    {
      title: 'Risk Reduction',
      traditionalValue: null,
      blockchainValue: improvements?.average_failures || 0,
      improvement: null,
      unit: '%',
      icon: <TrendingUpIcon />,
      color: 'success',
      description: 'Overall risk reduction with blockchain'
    },
    {
      title: 'Statistical Significance',
      traditionalValue: null,
      blockchainValue: statisticalAnalysis?.p_value ? (statisticalAnalysis.p_value < 0.05 ? 1 : 0) : 0,
      improvement: null,
      unit: '',
      icon: <BankIcon />,
      color: statisticalAnalysis?.p_value < 0.05 ? 'success' : 'error',
      description: 'Statistical significance of the difference'
    }
  ];
  
  return (
    <Grid container spacing={3}>
      {metrics.map((metric, index) => {
        const isComparison = metric.traditionalValue !== null && metric.blockchainValue !== null;
        const isImprovement = metric.improvement !== null && metric.improvement > 0;
        const isSignificance = metric.title === 'Statistical Significance';
        const isRiskReduction = metric.title === 'Risk Reduction';
        
        let displayValue, trend, comparison, subtitle;
        
        if (isSignificance) {
          displayValue = statisticalAnalysis?.p_value < 0.05 ? 'Yes' : 'No';
          subtitle = `p-value: ${statisticalAnalysis?.p_value?.toFixed(4) || 'N/A'}`;
        } else if (isRiskReduction) {
          displayValue = metric.blockchainValue;
          trend = metric.blockchainValue > 0 ? 'up' : 'flat';
          subtitle = 'Blockchain vs Traditional';
        } else if (isComparison) {
          displayValue = metric.blockchainValue;
          trend = metric.blockchainValue < metric.traditionalValue ? 'down' : 
                 metric.blockchainValue > metric.traditionalValue ? 'up' : 'flat';
          
          comparison = {
            label: `${isImprovement ? '↓' : '↑'} ${Math.abs(metric.improvement || 0).toFixed(1)}%`,
            type: isImprovement ? 'success' : 'error'
          };
          
          subtitle = `Traditional: ${metric.traditionalValue?.toFixed(2) || 'N/A'}${metric.unit}`;
        } else {
          displayValue = metric.blockchainValue;
        }
        
        return (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <SummaryCard
              title={metric.title}
              value={displayValue}
              previousValue={isComparison ? metric.traditionalValue : undefined}
              unit={metric.unit}
              subtitle={subtitle}
              icon={metric.icon}
              color={metric.color}
              trend={trend}
              comparison={comparison}
              loading={loading}
            />
          </Grid>
        );
      })}
      
      {/* Additional detailed metrics */}
      {traditionalResults && blockchainResults && (
        <>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              Detailed Comparison
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Traditional Min Failures"
              value={traditionalResults.min_failures || 0}
              unit=""
              icon={<AssessmentIcon />}
              color="primary"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Blockchain Min Failures"
              value={blockchainResults.min_failures || 0}
              unit=""
              icon={<SecurityIcon />}
              color="secondary"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Effect Size (Cohen's d)"
              value={statisticalAnalysis?.cohens_d?.toFixed(3) || 'N/A'}
              subtitle={statisticalAnalysis?.effect || 'Unknown'}
              icon={<SpeedIcon />}
              color="info"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="T-Statistic"
              value={statisticalAnalysis?.t_stat?.toFixed(3) || 'N/A'}
              subtitle="Statistical test result"
              icon={<AssessmentIcon />}
              color="warning"
            />
          </Grid>
        </>
      )}
      
      {/* Confidence intervals if available */}
      {traditionalResults?.ci_lower !== undefined && (
        <>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              Confidence Intervals (95%)
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <SummaryCard
              title="Traditional CI"
              value={`${traditionalResults.ci_lower?.toFixed(2)} - ${traditionalResults.ci_upper?.toFixed(2)}`}
              subtitle="95% confidence interval"
              icon={<AssessmentIcon />}
              color="primary"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <SummaryCard
              title="Blockchain CI"
              value={`${blockchainResults.ci_lower?.toFixed(2)} - ${blockchainResults.ci_upper?.toFixed(2)}`}
              subtitle="95% confidence interval"
              icon={<SecurityIcon />}
              color="secondary"
            />
          </Grid>
        </>
      )}
    </Grid>
  );
};

export default MetricsSummary;