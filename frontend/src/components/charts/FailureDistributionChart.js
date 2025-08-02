import React, { useState } from 'react';
import * as d3 from 'd3';
import { Box, ToggleButton, ToggleButtonGroup, FormControlLabel, Switch } from '@mui/material';
import BaseChart from './BaseChart';
import { useTheme } from '@mui/material/styles';

/**
 * Failure distribution histogram component
 */
const FailureDistributionChart = ({
  traditionalData,
  blockchainData,
  title = "Bank Failure Distribution",
  subtitle,
  showComparison = true,
  showKDE = true,
  showStatistics = true,
  ...props
}) => {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState('overlay');
  const [showKDECurve, setShowKDECurve] = useState(showKDE);
  const [showStats, setShowStats] = useState(showStatistics);
  
  const traditionalColor = theme.palette.chart?.traditional || theme.palette.primary.main;
  const blockchainColor = theme.palette.chart?.blockchain || theme.palette.secondary.main;
  
  const renderChart = ({ g, width, height, tooltip }) => {
    if (!traditionalData || traditionalData.length === 0) return;
    
    // Combine data for scale calculation
    const allData = showComparison && blockchainData 
      ? [...traditionalData, ...blockchainData]
      : traditionalData;
    
    const maxValue = d3.max(allData);
    const minValue = d3.min(allData);
    
    // Create histogram bins
    const numBins = Math.min(20, Math.ceil(Math.sqrt(traditionalData.length)));
    const binWidth = (maxValue - minValue) / numBins;
    
    const xScale = d3.scaleLinear()
      .domain([minValue, maxValue + 1])
      .range([0, width]);
    
    // Create histogram for traditional data
    const traditionalHist = d3.histogram()
      .domain(xScale.domain())
      .thresholds(xScale.ticks(numBins))(traditionalData);
    
    // Create histogram for blockchain data if available
    let blockchainHist = [];
    if (showComparison && blockchainData) {
      blockchainHist = d3.histogram()
        .domain(xScale.domain())
        .thresholds(xScale.ticks(numBins))(blockchainData);
    }
    
    // Calculate y scale
    const maxCount = d3.max([
      d3.max(traditionalHist, d => d.length),
      ...(blockchainHist.length > 0 ? [d3.max(blockchainHist, d => d.length)] : [])
    ]);
    
    const yScale = d3.scaleLinear()
      .domain([0, maxCount])
      .nice()
      .range([height, 0]);
    
    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.format('d'));
    
    const yAxis = d3.axisLeft(yScale);
    
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);
    
    g.append('g')
      .call(yAxis);
    
    // Add axis labels
    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + 35})`)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Number of Bank Failures');
    
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -height / 2)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Frequency');
    
    // Function to draw histogram bars
    const drawHistogram = (histData, color, opacity = 0.7, offset = 0) => {
      const barWidth = viewMode === 'sideBySide' 
        ? (xScale(histData[0].x1) - xScale(histData[0].x0)) / 2 - 1
        : xScale(histData[0].x1) - xScale(histData[0].x0) - 1;
      
      const bars = g.selectAll(`.bar-${color.replace('#', '')}`)
        .data(histData)
        .enter().append('rect')
        .attr('class', `bar-${color.replace('#', '')}`)
        .attr('x', d => xScale(d.x0) + offset)
        .attr('y', height)
        .attr('width', barWidth)
        .attr('height', 0)
        .attr('fill', color)
        .attr('fill-opacity', opacity)
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .style('cursor', 'pointer');
      
      // Add interactions
      bars
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(100)
            .attr('fill-opacity', Math.min(opacity + 0.2, 1));
          
          if (tooltip) {
            tooltip.transition()
              .duration(200)
              .style('opacity', 0.9);
            
            tooltip.html(`
              <strong>Failures: ${d.x0} - ${d.x1 - 1}</strong><br/>
              Frequency: ${d.length}<br/>
              Percentage: ${(d.length / (histData.reduce((sum, bin) => sum + bin.length, 0)) * 100).toFixed(1)}%
            `)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          }
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(100)
            .attr('fill-opacity', opacity);
          
          if (tooltip) {
            tooltip.transition()
              .duration(500)
              .style('opacity', 0);
          }
        });
      
      // Animate bars
      bars.transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .attr('y', d => yScale(d.length))
        .attr('height', d => height - yScale(d.length));
      
      return bars;
    };
    
    // Draw traditional histogram
    const traditionalBars = drawHistogram(traditionalHist, traditionalColor, 0.7);
    
    // Draw blockchain histogram if comparison is enabled
    if (showComparison && blockchainData && blockchainHist.length > 0) {
      const offset = viewMode === 'sideBySide' 
        ? (xScale(traditionalHist[0].x1) - xScale(traditionalHist[0].x0)) / 2
        : 0;
      
      const opacity = viewMode === 'overlay' ? 0.5 : 0.7;
      drawHistogram(blockchainHist, blockchainColor, opacity, offset);
    }
    
    // Add KDE curves if enabled
    if (showKDECurve) {
      const addKDECurve = (data, color, label) => {
        // Simple KDE implementation
        const kde = kernelDensityEstimator(kernelEpanechnikov(0.5), xScale.ticks(100));
        const density = kde(data);
        
        // Scale density to match histogram
        const maxDensity = d3.max(density, d => d[1]);
        const scaleFactor = maxCount / maxDensity * 0.8;
        
        const line = d3.line()
          .x(d => xScale(d[0]))
          .y(d => yScale(d[1] * scaleFactor))
          .curve(d3.curveBasis);
        
        g.append('path')
          .datum(density)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5')
          .attr('d', line)
          .style('opacity', 0)
          .transition()
          .delay(1000)
          .duration(500)
          .style('opacity', 1);
      };
      
      addKDECurve(traditionalData, traditionalColor, 'Traditional');
      
      if (showComparison && blockchainData) {
        addKDECurve(blockchainData, blockchainColor, 'Blockchain');
      }
    }
    
    // Add statistics overlay if enabled
    if (showStats) {
      const addStatsOverlay = (data, color, label, yOffset = 0) => {
        const mean = d3.mean(data);
        const median = d3.median(data);
        const std = d3.deviation(data);
        
        // Add mean line
        g.append('line')
          .attr('x1', xScale(mean))
          .attr('x2', xScale(mean))
          .attr('y1', 0)
          .attr('y2', height)
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '3,3')
          .style('opacity', 0)
          .transition()
          .delay(1500)
          .duration(500)
          .style('opacity', 0.8);
        
        // Add mean label
        g.append('text')
          .attr('x', xScale(mean) + 5)
          .attr('y', 20 + yOffset)
          .style('font-size', '10px')
          .style('fill', color)
          .style('opacity', 0)
          .text(`${label} Mean: ${mean.toFixed(2)}`)
          .transition()
          .delay(1500)
          .duration(500)
          .style('opacity', 1);
      };
      
      addStatsOverlay(traditionalData, traditionalColor, 'Traditional', 0);
      
      if (showComparison && blockchainData) {
        addStatsOverlay(blockchainData, blockchainColor, 'Blockchain', 15);
      }
    }
    
    // Add legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 150}, 20)`);
    
    const legendData = [
      { label: 'Traditional', color: traditionalColor }
    ];
    
    if (showComparison && blockchainData) {
      legendData.push({ label: 'Blockchain', color: blockchainColor });
    }
    
    legendData.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendRow.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', item.color)
        .attr('fill-opacity', 0.7);
      
      legendRow.append('text')
        .attr('x', 16)
        .attr('y', 9)
        .style('font-size', '12px')
        .text(item.label);
    });
  };
  
  // KDE helper functions
  const kernelDensityEstimator = (kernel, X) => {
    return (V) => {
      return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
  };
  
  const kernelEpanechnikov = (k) => {
    return (t) => {
      return Math.abs(t /= k) <= 1 ? 0.75 * (1 - t * t) / k : 0;
    };
  };
  
  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };
  
  return (
    <Box>
      {/* Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {showComparison && blockchainData && (
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton value="overlay">Overlay</ToggleButton>
              <ToggleButton value="sideBySide">Side by Side</ToggleButton>
            </ToggleButtonGroup>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showKDECurve}
                onChange={(e) => setShowKDECurve(e.target.checked)}
                size="small"
              />
            }
            label="KDE Curve"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={showStats}
                onChange={(e) => setShowStats(e.target.checked)}
                size="small"
              />
            }
            label="Statistics"
          />
        </Box>
      </Box>
      
      <BaseChart
        title={title}
        subtitle={subtitle}
        data={traditionalData}
        renderChart={renderChart}
        {...props}
      />
    </Box>
  );
};

export default FailureDistributionChart;