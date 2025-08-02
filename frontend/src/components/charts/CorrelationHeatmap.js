import React, { useState } from 'react';
import * as d3 from 'd3';
import { 
  Box, 
  FormControlLabel, 
  Switch, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Slider,
  Typography,
  Chip
} from '@mui/material';
import BaseChart from './BaseChart';
import { useTheme } from '@mui/material/styles';

/**
 * Correlation heatmap component for bank failure correlations
 */
const CorrelationHeatmap = ({
  correlationMatrix,
  bankNames,
  title = "Bank Failure Correlation Matrix",
  subtitle,
  colorScheme = 'RdBu',
  showValues = true,
  showDendogram = false,
  clusterBanks = false,
  ...props
}) => {
  const theme = useTheme();
  const [showCellValues, setShowCellValues] = useState(showValues);
  const [selectedColorScheme, setSelectedColorScheme] = useState(colorScheme);
  const [correlationThreshold, setCorrelationThreshold] = useState(0.5);
  const [showOnlySignificant, setShowOnlySignificant] = useState(false);
  const [selectedBanks, setSelectedBanks] = useState([]);
  const [hoveredCell, setHoveredCell] = useState(null);
  
  const colorSchemes = [
    { value: 'RdBu', label: 'Red-Blue' },
    { value: 'RdYlBu', label: 'Red-Yellow-Blue' },
    { value: 'Spectral', label: 'Spectral' },
    { value: 'Viridis', label: 'Viridis' },
    { value: 'Plasma', label: 'Plasma' }
  ];
  
  const renderChart = ({ g, width, height, tooltip }) => {
    if (!correlationMatrix || !bankNames || correlationMatrix.length === 0) return;
    
    const n = bankNames.length;
    const cellSize = Math.min(width / n, height / n) * 0.9;
    const chartWidth = cellSize * n;
    const chartHeight = cellSize * n;
    
    // Center the heatmap
    const offsetX = (width - chartWidth) / 2;
    const offsetY = (height - chartHeight) / 2;
    
    // Create color scale
    const colorScale = d3.scaleSequential()
      .interpolator(d3[`interpolate${selectedColorScheme}`])
      .domain([-1, 1]);
    
    // Create scales for positioning
    const xScale = d3.scaleBand()
      .domain(bankNames)
      .range([0, chartWidth])
      .padding(0.02);
    
    const yScale = d3.scaleBand()
      .domain(bankNames)
      .range([0, chartHeight])
      .padding(0.02);
    
    // Create main group with offset
    const mainGroup = g.append('g')
      .attr('transform', `translate(${offsetX}, ${offsetY})`);
    
    // Prepare cell data
    const cellData = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const correlation = correlationMatrix[i][j];
        const isSignificant = Math.abs(correlation) >= correlationThreshold;
        
        if (!showOnlySignificant || isSignificant || i === j) {
          cellData.push({
            row: i,
            col: j,
            rowBank: bankNames[i],
            colBank: bankNames[j],
            correlation: correlation,
            isSignificant: isSignificant,
            isDiagonal: i === j
          });
        }
      }
    }
    
    // Create cells
    const cells = mainGroup.selectAll('.correlation-cell')
      .data(cellData)
      .enter().append('rect')
      .attr('class', 'correlation-cell')
      .attr('x', d => xScale(d.colBank))
      .attr('y', d => yScale(d.rowBank))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => showOnlySignificant && !d.isSignificant && !d.isDiagonal ? '#f0f0f0' : colorScale(d.correlation))
      .attr('stroke', 'white')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .style('opacity', 0);
    
    // Animate cells
    cells.transition()
      .duration(1000)
      .delay((d, i) => i * 5)
      .style('opacity', 1);
    
    // Add cell interactions
    cells
      .on('mouseover', function(event, d) {
        setHoveredCell(d);
        
        // Highlight row and column
        mainGroup.selectAll('.correlation-cell')
          .transition()
          .duration(100)
          .style('opacity', cell => 
            cell.row === d.row || cell.col === d.col ? 1 : 0.3
          );
        
        // Highlight labels
        mainGroup.selectAll('.row-label')
          .transition()
          .duration(100)
          .style('font-weight', label => label === d.rowBank ? 'bold' : 'normal')
          .style('fill', label => label === d.rowBank ? theme.palette.primary.main : theme.palette.text.primary);
        
        mainGroup.selectAll('.col-label')
          .transition()
          .duration(100)
          .style('font-weight', label => label === d.colBank ? 'bold' : 'normal')
          .style('fill', label => label === d.colBank ? theme.palette.primary.main : theme.palette.text.primary);
        
        if (tooltip) {
          tooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
          
          const correlationStrength = Math.abs(d.correlation) > 0.7 ? 'Strong' :
                                    Math.abs(d.correlation) > 0.3 ? 'Moderate' : 'Weak';
          
          const correlationDirection = d.correlation > 0 ? 'Positive' : 'Negative';
          
          tooltip.html(`
            <strong>${d.rowBank} ↔ ${d.colBank}</strong><br/>
            Correlation: ${d.correlation.toFixed(4)}<br/>
            Strength: ${correlationStrength}<br/>
            Direction: ${correlationDirection}<br/>
            ${d.isDiagonal ? '<em>Same bank</em>' : ''}
            ${d.isSignificant ? '<br/><strong>Significant</strong>' : ''}
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        }
      })
      .on('mouseout', function() {
        setHoveredCell(null);
        
        // Reset highlighting
        mainGroup.selectAll('.correlation-cell')
          .transition()
          .duration(200)
          .style('opacity', 1);
        
        mainGroup.selectAll('.row-label, .col-label')
          .transition()
          .duration(200)
          .style('font-weight', 'normal')
          .style('fill', theme.palette.text.primary);
        
        if (tooltip) {
          tooltip.transition()
            .duration(500)
            .style('opacity', 0);
        }
      })
      .on('click', function(event, d) {
        // Toggle bank selection
        const bankPair = [d.rowBank, d.colBank];
        setSelectedBanks(prev => {
          const isSelected = prev.some(pair => 
            (pair[0] === bankPair[0] && pair[1] === bankPair[1]) ||
            (pair[0] === bankPair[1] && pair[1] === bankPair[0])
          );
          
          if (isSelected) {
            return prev.filter(pair => 
              !(pair[0] === bankPair[0] && pair[1] === bankPair[1]) &&
              !(pair[0] === bankPair[1] && pair[1] === bankPair[0])
            );
          } else {
            return [...prev, bankPair];
          }
        });
      });
    
    // Add cell values if enabled
    if (showCellValues) {
      const valueLabels = mainGroup.selectAll('.cell-value')
        .data(cellData)
        .enter().append('text')
        .attr('class', 'cell-value')
        .attr('x', d => xScale(d.colBank) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.rowBank) + yScale.bandwidth() / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', `${Math.min(10, cellSize / 8)}px`)
        .style('fill', d => {
          const brightness = d3.hsl(colorScale(d.correlation)).l;
          return brightness > 0.5 ? '#000' : '#fff';
        })
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .text(d => d.correlation.toFixed(2));
      
      valueLabels.transition()
        .delay(1000)
        .duration(500)
        .style('opacity', 1);
    }
    
    // Add row labels
    mainGroup.selectAll('.row-label')
      .data(bankNames)
      .enter().append('text')
      .attr('class', 'row-label')
      .attr('x', -5)
      .attr('y', d => yScale(d) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .style('font-size', `${Math.min(12, cellSize / 6)}px`)
      .style('fill', theme.palette.text.primary)
      .text(d => d);
    
    // Add column labels
    mainGroup.selectAll('.col-label')
      .data(bankNames)
      .enter().append('text')
      .attr('class', 'col-label')
      .attr('x', d => xScale(d) + xScale.bandwidth() / 2)
      .attr('y', -5)
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'middle')
      .style('font-size', `${Math.min(12, cellSize / 6)}px`)
      .style('fill', theme.palette.text.primary)
      .attr('transform', d => `rotate(-45, ${xScale(d) + xScale.bandwidth() / 2}, -5)`)
      .text(d => d);
    
    // Add color legend
    const legendWidth = Math.min(200, width * 0.3);
    const legendHeight = 20;
    const legendX = offsetX + chartWidth + 20;
    const legendY = offsetY + 20;
    
    // Create gradient for legend
    const defs = g.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'correlation-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');
    
    const numStops = 11;
    for (let i = 0; i <= numStops; i++) {
      const t = i / numStops;
      const value = -1 + t * 2; // -1 to 1
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', colorScale(value));
    }
    
    // Add legend rectangle
    g.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#correlation-gradient)')
      .attr('stroke', theme.palette.divider)
      .attr('stroke-width', 1);
    
    // Add legend scale
    const legendScale = d3.scaleLinear()
      .domain([-1, 1])
      .range([legendX, legendX + legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d3.format('.1f'));
    
    g.append('g')
      .attr('transform', `translate(0, ${legendY + legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-size', '10px');
    
    // Add legend title
    g.append('text')
      .attr('x', legendX + legendWidth / 2)
      .attr('y', legendY - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Correlation Coefficient');
    
    // Add statistics panel
    const stats = calculateCorrelationStats(correlationMatrix);
    const statsX = offsetX + chartWidth + 20;
    const statsY = legendY + 60;
    
    const statsGroup = g.append('g')
      .attr('class', 'stats-panel')
      .attr('transform', `translate(${statsX}, ${statsY})`);
    
    const statsData = [
      { label: 'Mean Correlation:', value: stats.mean.toFixed(3) },
      { label: 'Std Deviation:', value: stats.std.toFixed(3) },
      { label: 'Max Correlation:', value: stats.max.toFixed(3) },
      { label: 'Min Correlation:', value: stats.min.toFixed(3) },
      { label: 'Strong Correlations:', value: stats.strongCount },
      { label: 'Weak Correlations:', value: stats.weakCount }
    ];
    
    statsData.forEach((stat, i) => {
      const statRow = statsGroup.append('g')
        .attr('transform', `translate(0, ${i * 15})`);
      
      statRow.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .style('font-size', '11px')
        .style('fill', theme.palette.text.secondary)
        .text(stat.label);
      
      statRow.append('text')
        .attr('x', 120)
        .attr('y', 0)
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', theme.palette.text.primary)
        .text(stat.value);
    });
  };
  
  const calculateCorrelationStats = (matrix) => {
    const values = [];
    const n = matrix.length;
    
    // Get upper triangle values (excluding diagonal)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        values.push(matrix[i][j]);
      }
    }
    
    const mean = d3.mean(values);
    const std = d3.deviation(values);
    const max = d3.max(values);
    const min = d3.min(values);
    const strongCount = values.filter(v => Math.abs(v) > 0.7).length;
    const weakCount = values.filter(v => Math.abs(v) < 0.3).length;
    
    return { mean, std, max, min, strongCount, weakCount };
  };
  
  const handleColorSchemeChange = (event) => {
    setSelectedColorScheme(event.target.value);
  };
  
  const handleThresholdChange = (event, newValue) => {
    setCorrelationThreshold(newValue);
  };
  
  return (
    <Box>
      {/* Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Color Scheme</InputLabel>
            <Select
              value={selectedColorScheme}
              onChange={handleColorSchemeChange}
              label="Color Scheme"
            >
              {colorSchemes.map(scheme => (
                <MenuItem key={scheme.value} value={scheme.value}>
                  {scheme.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
            <Typography variant="body2" sx={{ minWidth: 80 }}>
              Threshold: {correlationThreshold.toFixed(2)}
            </Typography>
            <Slider
              value={correlationThreshold}
              onChange={handleThresholdChange}
              min={0}
              max={1}
              step={0.05}
              size="small"
              sx={{ flexGrow: 1 }}
            />
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showCellValues}
                onChange={(e) => setShowCellValues(e.target.checked)}
                size="small"
              />
            }
            label="Values"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={showOnlySignificant}
                onChange={(e) => setShowOnlySignificant(e.target.checked)}
                size="small"
              />
            }
            label="Significant Only"
          />
        </Box>
      </Box>
      
      {/* Selected banks display */}
      {selectedBanks.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Selected Bank Pairs:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedBanks.map((pair, i) => (
              <Chip
                key={i}
                label={`${pair[0]} ↔ ${pair[1]}`}
                onDelete={() => setSelectedBanks(prev => prev.filter((_, idx) => idx !== i))}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}
      
      <BaseChart
        title={title}
        subtitle={subtitle}
        data={correlationMatrix}
        renderChart={renderChart}
        height={Math.max(400, bankNames?.length * 25 + 150)}
        {...props}
      />
    </Box>
  );
};

export default CorrelationHeatmap;