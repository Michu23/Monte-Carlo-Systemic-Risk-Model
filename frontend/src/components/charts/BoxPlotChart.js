import React, { useState } from 'react';
import * as d3 from 'd3';
import { Box, FormControlLabel, Switch, ToggleButton, ToggleButtonGroup } from '@mui/material';
import BaseChart from './BaseChart';
import { useTheme } from '@mui/material/styles';

/**
 * Box plot chart component for comparing distributions
 */
const BoxPlotChart = ({
  data, // Array of { label, values, color? }
  title = "Distribution Comparison",
  subtitle,
  yLabel = "Number of Bank Failures",
  showOutliers = true,
  showMean = true,
  showNotches = false,
  orientation = 'vertical', // 'vertical' or 'horizontal'
  ...props
}) => {
  const theme = useTheme();
  const [showOutlierPoints, setShowOutlierPoints] = useState(showOutliers);
  const [showMeanLine, setShowMeanLine] = useState(showMean);
  const [showNotch, setShowNotch] = useState(showNotches);
  const [chartOrientation, setChartOrientation] = useState(orientation);
  
  const defaultColors = [
    theme.palette.chart?.traditional || theme.palette.primary.main,
    theme.palette.chart?.blockchain || theme.palette.secondary.main,
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main
  ];
  
  const renderChart = ({ g, width, height, tooltip }) => {
    if (!data || data.length === 0) return;
    
    const isVertical = chartOrientation === 'vertical';
    const boxWidth = isVertical 
      ? Math.min(80, (width / data.length) * 0.6)
      : Math.min(80, (height / data.length) * 0.6);
    
    // Calculate statistics for each dataset
    const boxData = data.map((dataset, i) => {
      const values = [...dataset.values].sort((a, b) => a - b);
      const q1 = d3.quantile(values, 0.25);
      const median = d3.quantile(values, 0.5);
      const q3 = d3.quantile(values, 0.75);
      const iqr = q3 - q1;
      const min = Math.max(d3.min(values), q1 - 1.5 * iqr);
      const max = Math.min(d3.max(values), q3 + 1.5 * iqr);
      const mean = d3.mean(values);
      
      // Find outliers
      const outliers = values.filter(v => v < min || v > max);
      
      return {
        label: dataset.label,
        values,
        q1,
        median,
        q3,
        min,
        max,
        mean,
        outliers,
        color: dataset.color || defaultColors[i % defaultColors.length]
      };
    });
    
    // Create scales
    const allValues = boxData.flatMap(d => d.values);
    const valueExtent = d3.extent(allValues);
    
    let xScale, yScale;
    
    if (isVertical) {
      xScale = d3.scaleBand()
        .domain(boxData.map(d => d.label))
        .range([0, width])
        .padding(0.2);
      
      yScale = d3.scaleLinear()
        .domain(valueExtent)
        .nice()
        .range([height, 0]);
    } else {
      xScale = d3.scaleLinear()
        .domain(valueExtent)
        .nice()
        .range([0, width]);
      
      yScale = d3.scaleBand()
        .domain(boxData.map(d => d.label))
        .range([0, height])
        .padding(0.2);
    }
    
    // Add axes
    const xAxis = isVertical 
      ? d3.axisBottom(xScale)
      : d3.axisBottom(xScale);
    
    const yAxis = isVertical
      ? d3.axisLeft(yScale)
      : d3.axisLeft(yScale);
    
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);
    
    g.append('g')
      .call(yAxis);
    
    // Add axis labels
    if (isVertical) {
      g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + 35})`)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Distribution');
      
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -40)
        .attr('x', -height / 2)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text(yLabel);
    } else {
      g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + 35})`)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text(yLabel);
      
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -40)
        .attr('x', -height / 2)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Distribution');
    }
    
    // Draw box plots
    boxData.forEach((box, i) => {
      const boxGroup = g.append('g')
        .attr('class', `box-${i}`);
      
      let centerX, centerY, boxX, boxY, boxW, boxH;
      
      if (isVertical) {
        centerX = xScale(box.label) + xScale.bandwidth() / 2;
        boxX = centerX - boxWidth / 2;
        boxY = yScale(box.q3);
        boxW = boxWidth;
        boxH = yScale(box.q1) - yScale(box.q3);
      } else {
        centerY = yScale(box.label) + yScale.bandwidth() / 2;
        boxX = xScale(box.q1);
        boxY = centerY - boxWidth / 2;
        boxW = xScale(box.q3) - xScale(box.q1);
        boxH = boxWidth;
      }
      
      // Draw whiskers
      if (isVertical) {
        // Lower whisker
        boxGroup.append('line')
          .attr('x1', centerX)
          .attr('x2', centerX)
          .attr('y1', yScale(box.q1))
          .attr('y2', yScale(box.min))
          .attr('stroke', box.color)
          .attr('stroke-width', 1)
          .style('opacity', 0)
          .transition()
          .delay(i * 200)
          .duration(500)
          .style('opacity', 1);
        
        // Upper whisker
        boxGroup.append('line')
          .attr('x1', centerX)
          .attr('x2', centerX)
          .attr('y1', yScale(box.q3))
          .attr('y2', yScale(box.max))
          .attr('stroke', box.color)
          .attr('stroke-width', 1)
          .style('opacity', 0)
          .transition()
          .delay(i * 200)
          .duration(500)
          .style('opacity', 1);
        
        // Whisker caps
        [box.min, box.max].forEach(value => {
          boxGroup.append('line')
            .attr('x1', centerX - boxWidth / 4)
            .attr('x2', centerX + boxWidth / 4)
            .attr('y1', yScale(value))
            .attr('y2', yScale(value))
            .attr('stroke', box.color)
            .attr('stroke-width', 1)
            .style('opacity', 0)
            .transition()
            .delay(i * 200 + 200)
            .duration(300)
            .style('opacity', 1);
        });
      } else {
        // Left whisker
        boxGroup.append('line')
          .attr('x1', xScale(box.q1))
          .attr('x2', xScale(box.min))
          .attr('y1', centerY)
          .attr('y2', centerY)
          .attr('stroke', box.color)
          .attr('stroke-width', 1)
          .style('opacity', 0)
          .transition()
          .delay(i * 200)
          .duration(500)
          .style('opacity', 1);
        
        // Right whisker
        boxGroup.append('line')
          .attr('x1', xScale(box.q3))
          .attr('x2', xScale(box.max))
          .attr('y1', centerY)
          .attr('y2', centerY)
          .attr('stroke', box.color)
          .attr('stroke-width', 1)
          .style('opacity', 0)
          .transition()
          .delay(i * 200)
          .duration(500)
          .style('opacity', 1);
        
        // Whisker caps
        [box.min, box.max].forEach(value => {
          boxGroup.append('line')
            .attr('x1', xScale(value))
            .attr('x2', xScale(value))
            .attr('y1', centerY - boxWidth / 4)
            .attr('y2', centerY + boxWidth / 4)
            .attr('stroke', box.color)
            .attr('stroke-width', 1)
            .style('opacity', 0)
            .transition()
            .delay(i * 200 + 200)
            .duration(300)
            .style('opacity', 1);
        });
      }
      
      // Draw box
      const boxRect = boxGroup.append('rect')
        .attr('x', boxX)
        .attr('y', boxY)
        .attr('width', isVertical ? boxW : 0)
        .attr('height', isVertical ? 0 : boxH)
        .attr('fill', box.color)
        .attr('fill-opacity', 0.3)
        .attr('stroke', box.color)
        .attr('stroke-width', 2)
        .style('cursor', 'pointer');
      
      // Animate box
      boxRect.transition()
        .delay(i * 200 + 300)
        .duration(500)
        .attr('width', boxW)
        .attr('height', boxH);
      
      // Add box interactions
      boxRect
        .on('mouseover', function(event) {
          d3.select(this)
            .transition()
            .duration(100)
            .attr('fill-opacity', 0.5);
          
          if (tooltip) {
            tooltip.transition()
              .duration(200)
              .style('opacity', 0.9);
            
            tooltip.html(`
              <strong>${box.label}</strong><br/>
              Min: ${box.min.toFixed(2)}<br/>
              Q1: ${box.q1.toFixed(2)}<br/>
              Median: ${box.median.toFixed(2)}<br/>
              Q3: ${box.q3.toFixed(2)}<br/>
              Max: ${box.max.toFixed(2)}<br/>
              Mean: ${box.mean.toFixed(2)}<br/>
              Outliers: ${box.outliers.length}
            `)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          }
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(100)
            .attr('fill-opacity', 0.3);
          
          if (tooltip) {
            tooltip.transition()
              .duration(500)
              .style('opacity', 0);
          }
        });
      
      // Draw median line
      if (isVertical) {
        boxGroup.append('line')
          .attr('x1', boxX)
          .attr('x2', boxX + boxW)
          .attr('y1', yScale(box.median))
          .attr('y2', yScale(box.median))
          .attr('stroke', box.color)
          .attr('stroke-width', 3)
          .style('opacity', 0)
          .transition()
          .delay(i * 200 + 600)
          .duration(300)
          .style('opacity', 1);
      } else {
        boxGroup.append('line')
          .attr('x1', xScale(box.median))
          .attr('x2', xScale(box.median))
          .attr('y1', boxY)
          .attr('y2', boxY + boxH)
          .attr('stroke', box.color)
          .attr('stroke-width', 3)
          .style('opacity', 0)
          .transition()
          .delay(i * 200 + 600)
          .duration(300)
          .style('opacity', 1);
      }
      
      // Draw mean line if enabled
      if (showMeanLine) {
        if (isVertical) {
          boxGroup.append('line')
            .attr('x1', boxX)
            .attr('x2', boxX + boxW)
            .attr('y1', yScale(box.mean))
            .attr('y2', yScale(box.mean))
            .attr('stroke', box.color)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '3,3')
            .style('opacity', 0)
            .transition()
            .delay(i * 200 + 800)
            .duration(300)
            .style('opacity', 0.8);
        } else {
          boxGroup.append('line')
            .attr('x1', xScale(box.mean))
            .attr('x2', xScale(box.mean))
            .attr('y1', boxY)
            .attr('y2', boxY + boxH)
            .attr('stroke', box.color)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '3,3')
            .style('opacity', 0)
            .transition()
            .delay(i * 200 + 800)
            .duration(300)
            .style('opacity', 0.8);
        }
      }
      
      // Draw outliers if enabled
      if (showOutlierPoints && box.outliers.length > 0) {
        boxGroup.selectAll('.outlier')
          .data(box.outliers)
          .enter().append('circle')
          .attr('class', 'outlier')
          .attr('cx', isVertical ? centerX : d => xScale(d))
          .attr('cy', isVertical ? d => yScale(d) : centerY)
          .attr('r', 3)
          .attr('fill', box.color)
          .attr('stroke', 'white')
          .attr('stroke-width', 1)
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
                <strong>Outlier</strong><br/>
                ${box.label}: ${d.toFixed(2)}
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
          .delay(i * 200 + 1000)
          .duration(300)
          .style('opacity', 1);
      }
    });
    
    // Add legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(20, 20)`);
    
    // Legend items
    const legendItems = [
      { label: 'Median', type: 'line', color: '#333', width: 3 },
      ...(showMeanLine ? [{ label: 'Mean', type: 'dashed', color: '#333', width: 2 }] : []),
      ...(showOutlierPoints ? [{ label: 'Outliers', type: 'circle', color: '#333' }] : [])
    ];
    
    legendItems.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 15})`);
      
      if (item.type === 'line') {
        legendRow.append('line')
          .attr('x1', 0)
          .attr('x2', 15)
          .attr('y1', 6)
          .attr('y2', 6)
          .attr('stroke', item.color)
          .attr('stroke-width', item.width);
      } else if (item.type === 'dashed') {
        legendRow.append('line')
          .attr('x1', 0)
          .attr('x2', 15)
          .attr('y1', 6)
          .attr('y2', 6)
          .attr('stroke', item.color)
          .attr('stroke-width', item.width)
          .attr('stroke-dasharray', '3,3');
      } else if (item.type === 'circle') {
        legendRow.append('circle')
          .attr('cx', 7.5)
          .attr('cy', 6)
          .attr('r', 3)
          .attr('fill', item.color);
      }
      
      legendRow.append('text')
        .attr('x', 20)
        .attr('y', 9)
        .style('font-size', '10px')
        .text(item.label);
    });
  };
  
  const handleOrientationChange = (event, newOrientation) => {
    if (newOrientation !== null) {
      setChartOrientation(newOrientation);
    }
  };
  
  return (
    <Box>
      {/* Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <ToggleButtonGroup
          value={chartOrientation}
          exclusive
          onChange={handleOrientationChange}
          size="small"
        >
          <ToggleButton value="vertical">Vertical</ToggleButton>
          <ToggleButton value="horizontal">Horizontal</ToggleButton>
        </ToggleButtonGroup>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showMeanLine}
                onChange={(e) => setShowMeanLine(e.target.checked)}
                size="small"
              />
            }
            label="Mean"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={showOutlierPoints}
                onChange={(e) => setShowOutlierPoints(e.target.checked)}
                size="small"
              />
            }
            label="Outliers"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={showNotch}
                onChange={(e) => setShowNotch(e.target.checked)}
                size="small"
              />
            }
            label="Notches"
          />
        </Box>
      </Box>
      
      <BaseChart
        title={title}
        subtitle={subtitle}
        data={data}
        renderChart={renderChart}
        {...props}
      />
    </Box>
  );
};

export default BoxPlotChart;