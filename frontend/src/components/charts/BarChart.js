import React from 'react';
import * as d3 from 'd3';
import BaseChart from './BaseChart';
import { useTheme } from '@mui/material/styles';

/**
 * Bar chart component for categorical data
 */
const BarChart = ({
  data,
  xKey = 'x',
  yKey = 'y',
  title,
  subtitle,
  xLabel,
  yLabel,
  color,
  horizontal = false,
  animate = true,
  showValues = false,
  ...props
}) => {
  const theme = useTheme();
  
  const defaultColor = color || theme.palette.primary.main;
  
  const renderChart = ({ g, data, width, height, tooltip }) => {
    if (!data || data.length === 0) return;
    
    // Create scales
    const xScale = horizontal 
      ? d3.scaleLinear()
          .domain([0, d3.max(data, d => d[yKey])])
          .nice()
          .range([0, width])
      : d3.scaleBand()
          .domain(data.map(d => d[xKey]))
          .range([0, width])
          .padding(0.1);
    
    const yScale = horizontal
      ? d3.scaleBand()
          .domain(data.map(d => d[xKey]))
          .range([0, height])
          .padding(0.1)
      : d3.scaleLinear()
          .domain([0, d3.max(data, d => d[yKey])])
          .nice()
          .range([height, 0]);
    
    // Add axes
    const xAxis = horizontal
      ? d3.axisBottom(xScale)
      : d3.axisBottom(xScale);
    
    const yAxis = horizontal
      ? d3.axisLeft(yScale)
      : d3.axisLeft(yScale);
    
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', horizontal ? 'middle' : 'end')
      .attr('dx', horizontal ? '0' : '-.8em')
      .attr('dy', horizontal ? '.71em' : '.15em')
      .attr('transform', horizontal ? null : 'rotate(-45)');
    
    g.append('g')
      .call(yAxis);
    
    // Add axis labels
    if (xLabel) {
      g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + (horizontal ? 35 : 60)})`)
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
    
    // Create bars
    const bars = g.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('fill', defaultColor)
      .style('cursor', 'pointer');
    
    if (horizontal) {
      bars
        .attr('x', 0)
        .attr('y', d => yScale(d[xKey]))
        .attr('width', animate ? 0 : d => xScale(d[yKey]))
        .attr('height', yScale.bandwidth());
    } else {
      bars
        .attr('x', d => xScale(d[xKey]))
        .attr('y', animate ? height : d => yScale(d[yKey]))
        .attr('width', xScale.bandwidth())
        .attr('height', animate ? 0 : d => height - yScale(d[yKey]));
    }
    
    // Add interactions
    bars
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('fill', d3.color(defaultColor).darker(0.2));
        
        if (tooltip) {
          tooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
          
          tooltip.html(`
            <strong>${d[xKey]}</strong><br/>
            ${yLabel || 'Value'}: ${d[yKey].toFixed(2)}
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        }
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('fill', defaultColor);
        
        if (tooltip) {
          tooltip.transition()
            .duration(500)
            .style('opacity', 0);
        }
      });
    
    // Animate bars
    if (animate) {
      if (horizontal) {
        bars.transition()
          .duration(1000)
          .delay((d, i) => i * 50)
          .attr('width', d => xScale(d[yKey]));
      } else {
        bars.transition()
          .duration(1000)
          .delay((d, i) => i * 50)
          .attr('y', d => yScale(d[yKey]))
          .attr('height', d => height - yScale(d[yKey]));
      }
    }
    
    // Add value labels if enabled
    if (showValues) {
      const labels = g.selectAll('.value-label')
        .data(data)
        .enter().append('text')
        .attr('class', 'value-label')
        .style('font-size', '12px')
        .style('text-anchor', 'middle')
        .style('opacity', animate ? 0 : 1);
      
      if (horizontal) {
        labels
          .attr('x', d => xScale(d[yKey]) + 5)
          .attr('y', d => yScale(d[xKey]) + yScale.bandwidth() / 2)
          .attr('dy', '0.35em')
          .text(d => d[yKey].toFixed(1));
      } else {
        labels
          .attr('x', d => xScale(d[xKey]) + xScale.bandwidth() / 2)
          .attr('y', d => yScale(d[yKey]) - 5)
          .text(d => d[yKey].toFixed(1));
      }
      
      if (animate) {
        labels.transition()
          .duration(1000)
          .delay((d, i) => i * 50 + 500)
          .style('opacity', 1);
      }
    }
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

export default BarChart;