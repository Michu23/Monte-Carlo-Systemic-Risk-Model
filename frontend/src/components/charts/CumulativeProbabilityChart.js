import React, { useState } from 'react';
import * as d3 from 'd3';
import { Box, FormControlLabel, Switch, Slider, Typography } from '@mui/material';
import BaseChart from './BaseChart';
import { useTheme } from '@mui/material/styles';

/**
 * Cumulative probability chart component (ECDF)
 */
const CumulativeProbabilityChart = ({
  traditionalData,
  blockchainData,
  title = "Cumulative Probability of Bank Failures",
  subtitle,
  showComparison = true,
  showThreshold = true,
  defaultThreshold = 3,
  showConfidenceBands = false,
  ...props
}) => {
  const theme = useTheme();
  const [threshold, setThreshold] = useState(defaultThreshold);
  const [showThresholdLine, setShowThresholdLine] = useState(showThreshold);
  const [showBands, setShowBands] = useState(showConfidenceBands);
  
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
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height, 0]);
    
    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.format('d'));
    
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d3.format('.0%'));
    
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
      .text('Cumulative Probability');
    
    // Function to create ECDF data
    const createECDF = (data) => {
      const sorted = [...data].sort((a, b) => a - b);
      const n = sorted.length;
      
      return sorted.map((value, i) => ({
        x: value,
        y: (i + 1) / n
      }));
    };
    
    // Function to draw ECDF line
    const drawECDF = (data, color, label, dashArray = null) => {
      const ecdfData = createECDF(data);
      
      // Create step function line
      const line = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveStepAfter);
      
      const path = g.append('path')
        .datum(ecdfData)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', dashArray)
        .attr('d', line)
        .style('opacity', 0);
      
      // Animate line drawing
      const totalLength = path.node().getTotalLength();
      path
        .attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0)
        .style('opacity', 1)
        .on('end', () => {
          if (dashArray) {
            path.attr('stroke-dasharray', dashArray);
          } else {
            path.attr('stroke-dasharray', null);
          }
        });
      
      // Add interactive dots at key points
      const keyPoints = ecdfData.filter((d, i) => i % Math.ceil(ecdfData.length / 20) === 0);
      
      g.selectAll(`.dot-${label}`)
        .data(keyPoints)
        .enter().append('circle')
        .attr('class', `dot-${label}`)
        .attr('cx', d => xScale(d.x))
        .attr('cy', d => yScale(d.y))
        .attr('r', 3)
        .attr('fill', color)
        .style('opacity', 0)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(100)
            .attr('r', 5);
          
          if (tooltip) {
            tooltip.transition()
              .duration(200)
              .style('opacity', 0.9);
            
            tooltip.html(`
              <strong>${label}</strong><br/>
              Failures: ${d.x}<br/>
              Cumulative Probability: ${(d.y * 100).toFixed(1)}%<br/>
              ${(100 - d.y * 100).toFixed(1)}% of simulations had more failures
            `)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          }
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(100)
            .attr('r', 3);
          
          if (tooltip) {
            tooltip.transition()
              .duration(500)
              .style('opacity', 0);
          }
        })
        .transition()
        .delay(2000)
        .duration(500)
        .style('opacity', 1);
      
      return ecdfData;
    };
    
    // Draw traditional ECDF
    const traditionalECDF = drawECDF(traditionalData, traditionalColor, 'Traditional');
    
    // Draw blockchain ECDF if comparison is enabled
    let blockchainECDF = [];
    if (showComparison && blockchainData) {
      blockchainECDF = drawECDF(blockchainData, blockchainColor, 'Blockchain');
    }
    
    // Add confidence bands if enabled
    if (showBands) {
      const addConfidenceBands = (data, color, alpha = 0.05) => {
        const n = data.length;
        const ecdfData = createECDF(data);
        
        // Calculate confidence bands using Dvoretzky-Kiefer-Wolfowitz inequality
        const epsilon = Math.sqrt(Math.log(2 / alpha) / (2 * n));
        
        const upperBand = ecdfData.map(d => ({
          x: d.x,
          y: Math.min(1, d.y + epsilon)
        }));
        
        const lowerBand = ecdfData.map(d => ({
          x: d.x,
          y: Math.max(0, d.y - epsilon)
        }));
        
        // Create area between bands
        const area = d3.area()
          .x(d => xScale(d.x))
          .y0(d => yScale(d.y))
          .y1((d, i) => yScale(upperBand[i].y))
          .curve(d3.curveStepAfter);
        
        g.append('path')
          .datum(lowerBand)
          .attr('fill', color)
          .attr('fill-opacity', 0.2)
          .attr('d', area)
          .style('opacity', 0)
          .transition()
          .delay(2500)
          .duration(500)
          .style('opacity', 1);
      };
      
      addConfidenceBands(traditionalData, traditionalColor);
      
      if (showComparison && blockchainData) {
        addConfidenceBands(blockchainData, blockchainColor);
      }
    }
    
    // Add threshold line if enabled
    if (showThresholdLine) {
      const thresholdLine = g.append('line')
        .attr('x1', xScale(threshold))
        .attr('x2', xScale(threshold))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', theme.palette.error.main)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .style('opacity', 0);
      
      thresholdLine.transition()
        .delay(3000)
        .duration(500)
        .style('opacity', 0.8);
      
      // Add threshold label
      g.append('text')
        .attr('x', xScale(threshold) + 5)
        .attr('y', 15)
        .style('font-size', '12px')
        .style('fill', theme.palette.error.main)
        .style('opacity', 0)
        .text(`Systemic Threshold: ${threshold}`)
        .transition()
        .delay(3000)
        .duration(500)
        .style('opacity', 1);
      
      // Calculate and display probabilities at threshold
      const traditionalProb = traditionalECDF.find(d => d.x >= threshold)?.y || 1;
      const blockchainProb = blockchainECDF.length > 0 
        ? (blockchainECDF.find(d => d.x >= threshold)?.y || 1)
        : 0;
      
      // Add probability annotations
      let yOffset = 30;
      
      g.append('text')
        .attr('x', xScale(threshold) + 5)
        .attr('y', yOffset)
        .style('font-size', '11px')
        .style('fill', traditionalColor)
        .style('opacity', 0)
        .text(`Traditional: ${((1 - traditionalProb) * 100).toFixed(1)}% > ${threshold}`)
        .transition()
        .delay(3500)
        .duration(500)
        .style('opacity', 1);
      
      if (showComparison && blockchainData) {
        yOffset += 15;
        g.append('text')
          .attr('x', xScale(threshold) + 5)
          .attr('y', yOffset)
          .style('font-size', '11px')
          .style('fill', blockchainColor)
          .style('opacity', 0)
          .text(`Blockchain: ${((1 - blockchainProb) * 100).toFixed(1)}% > ${threshold}`)
          .transition()
          .delay(3500)
          .duration(500)
          .style('opacity', 1);
      }
    }
    
    // Add legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 150}, ${height - 80})`);
    
    const legendData = [
      { label: 'Traditional', color: traditionalColor }
    ];
    
    if (showComparison && blockchainData) {
      legendData.push({ label: 'Blockchain', color: blockchainColor });
    }
    
    legendData.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendRow.append('line')
        .attr('x1', 0)
        .attr('x2', 20)
        .attr('y1', 6)
        .attr('y2', 6)
        .attr('stroke', item.color)
        .attr('stroke-width', 2);
      
      legendRow.append('text')
        .attr('x', 25)
        .attr('y', 9)
        .style('font-size', '12px')
        .text(item.label);
    });
  };
  
  const handleThresholdChange = (event, newValue) => {
    setThreshold(newValue);
  };
  
  return (
    <Box>
      {/* Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: '300px' }}>
          <FormControlLabel
            control={
              <Switch
                checked={showThresholdLine}
                onChange={(e) => setShowThresholdLine(e.target.checked)}
                size="small"
              />
            }
            label="Threshold"
          />
          
          {showThresholdLine && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: '200px' }}>
              <Typography variant="body2" sx={{ minWidth: '80px' }}>
                Threshold: {threshold}
              </Typography>
              <Slider
                value={threshold}
                onChange={handleThresholdChange}
                min={0}
                max={Math.max(...(traditionalData || [0]))}
                step={1}
                size="small"
                sx={{ flexGrow: 1 }}
              />
            </Box>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showBands}
                onChange={(e) => setShowBands(e.target.checked)}
                size="small"
              />
            }
            label="Confidence Bands"
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

export default CumulativeProbabilityChart;