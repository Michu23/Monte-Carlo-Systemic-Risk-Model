import React, { useRef, useEffect, useState } from 'react';
import { Box, Paper, Typography, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { MoreVert as MoreVertIcon, Download as DownloadIcon } from '@mui/icons-material';
import * as d3 from 'd3';
import useResizeObserver from '../../hooks/useResizeObserver';

/**
 * Base chart component with common functionality
 */
const BaseChart = ({
  title,
  subtitle,
  data,
  renderChart,
  width: fixedWidth,
  height: fixedHeight = 400,
  margin = { top: 20, right: 20, bottom: 40, left: 60 },
  showLegend = true,
  showTooltip = true,
  showExport = true,
  className,
  ...props
}) => {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const { ref: containerRef, dimensions } = useResizeObserver();
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Calculate chart dimensions
  const width = fixedWidth || dimensions.width || 800;
  const height = fixedHeight;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  useEffect(() => {
    if (!data || !svgRef.current || width === 0) return;
    
    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create tooltip if enabled
    let tooltip;
    if (showTooltip && tooltipRef.current) {
      tooltip = d3.select(tooltipRef.current)
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', 1000);
    }
    
    // Render the specific chart
    if (renderChart) {
      renderChart({
        svg,
        g,
        data,
        width: innerWidth,
        height: innerHeight,
        tooltip,
        ...props
      });
    }
  }, [data, width, height, innerWidth, innerHeight, renderChart, showTooltip, margin, props]);
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleExportSVG = () => {
    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'chart'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    handleMenuClose();
  };
  
  const handleExportPNG = () => {
    const svgElement = svgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title || 'chart'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
      
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
    handleMenuClose();
  };
  
  return (
    <Paper elevation={2} className={className}>
      {(title || showExport) && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          p: 2, 
          pb: 1 
        }}>
          <Box>
            {title && (
              <Typography variant="h6" component="h3">
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          
          {showExport && (
            <Box>
              <Tooltip title="Export options">
                <IconButton onClick={handleMenuOpen} size="small">
                  <MoreVertIcon />
                </IconButton>
              </Tooltip>
              
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={handleExportSVG}>
                  <DownloadIcon sx={{ mr: 1 }} />
                  Export as SVG
                </MenuItem>
                <MenuItem onClick={handleExportPNG}>
                  <DownloadIcon sx={{ mr: 1 }} />
                  Export as PNG
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Box>
      )}
      
      <Box ref={containerRef} sx={{ position: 'relative', p: 1 }}>
        <svg ref={svgRef} style={{ display: 'block' }} />
        {showTooltip && <div ref={tooltipRef} />}
      </Box>
    </Paper>
  );
};

export default BaseChart;