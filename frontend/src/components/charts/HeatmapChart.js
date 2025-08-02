import React from 'react';
import * as d3 from 'd3';
import BaseChart from './BaseChart';
import { useTheme } from '@mui/material/styles';

/**
 * Heatmap chart component for matrix data
 */
const HeatmapChart = ({
  data,
  rowLabels,
  colLabels,
  title,
  subtitle,
  colorScheme = 'Blues',
  showValues = true,
  animate = true,
  ...props
}) => {
  const theme = useTheme();
  
  const renderChart = ({ g, data, width, height, tooltip }) => {
    if (!data || data.length === 0 || !rowLabels || !colLabels) return;
    
    const numRows = rowLabels.length;
    const numCols = colLabels.length;
    
    // Calculate cell dimensions
    const cellWidth = width / numCols;
    const cellHeight = height / numRows;
    
    // Create color scale
    const colorScale = d3.scaleSequential()
      .interpolator(d3[`interpolate${colorScheme}`])
      .domain(d3.extent(data.flat()));
    
    // Create cells
    const cells = g.selectAll('.cell')
      .data(data.flatMap((row, i) => 
        row.map((value, j) => ({
          row: i,
          col: j,
          value: value,
          rowLabel: rowLabels[i],
          colLabel: colLabels[j]
        }))
      ))
      .enter().append('rect')
      .attr('class', 'cell')
      .attr('x', d => d.col * cellWidth)
      .attr('y', d => d.row * cellHeight)
      .attr('width', cellWidth - 1)
      .attr('height', cellHeight - 1)
      .attr('fill', animate ? '#f0f0f0' : d => colorScale(d.value))
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('stroke', theme.palette.text.primary)
          .attr('stroke-width', 2);
        
        if (tooltip) {
          tooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
          
          tooltip.html(`
            <strong>${d.rowLabel} → ${d.colLabel}</strong><br/>
            Value: ${d.value.toFixed(4)}
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        }
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('stroke', 'none');
        
        if (tooltip) {
          tooltip.transition()
            .duration(500)
            .style('opacity', 0);
        }
      });
    
    // Animate color transition
    if (animate) {
      cells.transition()
        .duration(1000)
        .delay((d, i) => i * 10)
        .attr('fill', d => colorScale(d.value));
    }
    
    // Add row labels
    g.selectAll('.row-label')
      .data(rowLabels)
      .enter().append('text')
      .attr('class', 'row-label')
      .attr('x', -5)
      .attr('y', (d, i) => i * cellHeight + cellHeight / 2)
      .attr('dy', '0.35em')
      .style('text-anchor', 'end')
      .style('font-size', '12px')
      .text(d => d);
    
    // Add column labels
    g.selectAll('.col-label')
      .data(colLabels)
      .enter().append('text')
      .attr('class', 'col-label')
      .attr('x', (d, i) => i * cellWidth + cellWidth / 2)
      .attr('y', -5)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(d => d)
      .attr('transform', (d, i) => `rotate(-45, ${i * cellWidth + cellWidth / 2}, -5)`);
    
    // Add values if enabled
    if (showValues) {
      const valueLabels = g.selectAll('.value-label')
        .data(data.flatMap((row, i) => 
          row.map((value, j) => ({
            row: i,
            col: j,
            value: value
          }))
        ))
        .enter().append('text')
        .attr('class', 'value-label')
        .attr('x', d => d.col * cellWidth + cellWidth / 2)
        .attr('y', d => d.row * cellHeight + cellHeight / 2)
        .attr('dy', '0.35em')
        .style('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', d => {
          const brightness = d3.hsl(colorScale(d.value)).l;
          return brightness > 0.5 ? '#000' : '#fff';
        })
        .style('opacity', animate ? 0 : 1)
        .text(d => d.value.toFixed(3));
      
      if (animate) {
        valueLabels.transition()
          .duration(1000)
          .delay(1000)
          .style('opacity', 1);
      }
    }
    
    // Add color legend
    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = width - legendWidth - 20;
    const legendY = height + 40;
    
    const legendScale = d3.scaleLinear()
      .domain(colorScale.domain())
      .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d3.format('.3f'));
    
    // Create gradient for legend
    const defs = g.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');
    
    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      const t = i / numStops;
      const value = colorScale.domain()[0] + t * (colorScale.domain()[1] - colorScale.domain()[0]);
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
      .style('fill', 'url(#legend-gradient)');
    
    // Add legend axis
    g.append('g')
      .attr('transform', `translate(${legendX}, ${legendY + legendHeight})`)
      .call(legendAxis);
  };
  
  return (
    <BaseChart
      title={title}
      subtitle={subtitle}
      data={data}
      renderChart={renderChart}
      height={props.height || Math.max(400, rowLabels?.length * 30 + 100)}
      margin={{ top: 60, right: 20, bottom: 80, left: 120 }}
      {...props}
    />
  );
};

export default HeatmapChart;