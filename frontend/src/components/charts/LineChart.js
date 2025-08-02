import React from 'react';
import * as d3 from 'd3';
import BaseChart from './BaseChart';
import { useTheme } from '@mui/material/styles';

/**
 * Line chart component for time series data
 */
const LineChart = ({
  data,
  xKey = 'x',
  yKey = 'y',
  seriesKey = 'series',
  title,
  subtitle,
  xLabel,
  yLabel,
  colors,
  showDots = true,
  showArea = false,
  animate = true,
  ...props
}) => {
  const theme = useTheme();
  
  // Default colors from theme
  const defaultColors = [
    theme.palette.chart?.traditional || theme.palette.primary.main,
    theme.palette.chart?.blockchain || theme.palette.secondary.main,
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main
  ];
  
  const renderChart = ({ g, data, width, height, tooltip }) => {
    if (!data || data.length === 0) return;
    
    // Group data by series
    const series = d3.group(data, d => d[seriesKey]);
    const seriesNames = Array.from(series.keys());
    
    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => new Date(d[xKey])))
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d[yKey]))
      .nice()
      .range([height, 0]);
    
    // Color scale
    const colorScale = d3.scaleOrdinal()
      .domain(seriesNames)
      .range(colors || defaultColors);
    
    // Create line generator
    const line = d3.line()
      .x(d => xScale(new Date(d[xKey])))
      .y(d => yScale(d[yKey]))
      .curve(d3.curveMonotoneX);
    
    // Create area generator if needed
    const area = showArea ? d3.area()
      .x(d => xScale(new Date(d[xKey])))
      .y0(height)
      .y1(d => yScale(d[yKey]))
      .curve(d3.curveMonotoneX) : null;
    
    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat('%m/%d'));
    
    const yAxis = d3.axisLeft(yScale);
    
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);
    
    g.append('g')
      .call(yAxis);
    
    // Add axis labels
    if (xLabel) {
      g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + 35})`)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text(xLabel);
    }
    
    if (yLabel) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -40)
        .attr('x', -height / 2)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text(yLabel);
    }
    
    // Draw series
    series.forEach((seriesData, seriesName) => {
      const color = colorScale(seriesName);
      
      // Draw area if enabled
      if (showArea && area) {
        g.append('path')
          .datum(seriesData)
          .attr('fill', color)
          .attr('fill-opacity', 0.3)
          .attr('d', area);
      }
      
      // Draw line
      const path = g.append('path')
        .datum(seriesData)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('d', line);
      
      // Animate line drawing
      if (animate) {
        const totalLength = path.node().getTotalLength();
        path
          .attr('stroke-dasharray', totalLength + ' ' + totalLength)
          .attr('stroke-dashoffset', totalLength)
          .transition()
          .duration(1500)
          .ease(d3.easeLinear)
          .attr('stroke-dashoffset', 0);
      }
      
      // Add dots if enabled
      if (showDots) {
        g.selectAll(`.dot-${seriesName}`)
          .data(seriesData)
          .enter().append('circle')
          .attr('class', `dot-${seriesName}`)
          .attr('cx', d => xScale(new Date(d[xKey])))
          .attr('cy', d => yScale(d[yKey]))
          .attr('r', 4)
          .attr('fill', color)
          .style('opacity', animate ? 0 : 1)
          .on('mouseover', function(event, d) {
            if (tooltip) {
              tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
              
              tooltip.html(`
                <strong>${seriesName}</strong><br/>
                ${xLabel || 'Date'}: ${new Date(d[xKey]).toLocaleDateString()}<br/>
                ${yLabel || 'Value'}: ${d[yKey].toFixed(2)}
              `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
            }
            
            d3.select(this)
              .transition()
              .duration(100)
              .attr('r', 6);
          })
          .on('mouseout', function() {
            if (tooltip) {
              tooltip.transition()
                .duration(500)
                .style('opacity', 0);
            }
            
            d3.select(this)
              .transition()
              .duration(100)
              .attr('r', 4);
          });
        
        // Animate dots
        if (animate) {
          g.selectAll(`.dot-${seriesName}`)
            .transition()
            .delay((d, i) => i * 50)
            .duration(500)
            .style('opacity', 1);
        }
      }
    });
    
    // Add legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 100}, 20)`);
    
    seriesNames.forEach((seriesName, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendRow.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', colorScale(seriesName));
      
      legendRow.append('text')
        .attr('x', 16)
        .attr('y', 9)
        .style('font-size', '12px')
        .text(seriesName);
    });
  };
  
  return (
    <BaseChart
      title={title}
      subtitle={subtitle}
      data={data}
      renderChart={renderChart}
      {...props}
    />
  );
};

export default LineChart;