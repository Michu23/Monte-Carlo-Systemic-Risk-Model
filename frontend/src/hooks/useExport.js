import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import simulationService from '../services/simulationService';

/**
 * Custom hook for handling various export functionalities
 */
export const useExport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Export simulation data in JSON format
  const exportJSON = useCallback(async (simulationId, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const data = await simulationService.exportSimulationResults(simulationId, 'json');
      
      // Create and download the file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      
      downloadBlob(blob, `simulation_${simulationId}_results.json`);
      
    } catch (err) {
      setError('Failed to export JSON data');
      console.error('JSON export error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Export simulation data in CSV format
  const exportCSV = useCallback(async (simulationId, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const data = await simulationService.exportSimulationResults(simulationId, 'csv');
      
      // Create and download the file
      const blob = new Blob([data], {
        type: 'text/csv'
      });
      
      downloadBlob(blob, `simulation_${simulationId}_results.csv`);
      
    } catch (err) {
      setError('Failed to export CSV data');
      console.error('CSV export error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Export charts as images
  const exportChartImages = useCallback(async (chartElements, simulationName = 'simulation') => {
    try {
      setLoading(true);
      setError(null);

      const images = [];
      
      for (let i = 0; i < chartElements.length; i++) {
        const element = chartElements[i];
        if (element) {
          const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2, // Higher resolution
            useCORS: true
          });
          
          images.push({
            name: `chart_${i + 1}.png`,
            dataUrl: canvas.toDataURL('image/png')
          });
        }
      }

      // Download each image
      images.forEach((image, index) => {
        const link = document.createElement('a');
        link.href = image.dataUrl;
        link.download = `${simulationName}_${image.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });

    } catch (err) {
      setError('Failed to export chart images');
      console.error('Chart export error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate PDF report
  const exportPDF = useCallback(async (simulationData, chartElements = [], options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Add title
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text(simulationData.name || 'Simulation Results', 20, yPosition);
      yPosition += 15;

      // Add metadata
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
      yPosition += 10;
      
      if (simulationData.created_at) {
        pdf.text(`Simulation Date: ${new Date(simulationData.created_at).toLocaleString()}`, 20, yPosition);
        yPosition += 10;
      }

      yPosition += 10;

      // Add parameters section
      if (options.includeParameters && simulationData.parameters) {
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text('Simulation Parameters', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        
        Object.entries(simulationData.parameters).forEach(([key, value]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          let displayValue = value;
          
          if (typeof value === 'number') {
            if (key.includes('prob') || key.includes('lgd') || key.includes('reduction')) {
              displayValue = `${(value * 100).toFixed(1)}%`;
            } else {
              displayValue = value.toLocaleString();
            }
          }
          
          pdf.text(`${label}: ${displayValue}`, 20, yPosition);
          yPosition += 6;
        });
        
        yPosition += 10;
      }

      // Add results summary
      if (options.includeStatistics && simulationData.results) {
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text('Results Summary', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');

        const { traditional_summary, blockchain_summary, improvements, statistical_analysis } = simulationData.results;

        if (traditional_summary) {
          pdf.text('Traditional Banking System:', 20, yPosition);
          yPosition += 6;
          pdf.text(`  Average Failures: ${traditional_summary.average_failures?.toFixed(2) || 'N/A'}`, 25, yPosition);
          yPosition += 5;
          pdf.text(`  Maximum Failures: ${traditional_summary.max_failures || 'N/A'}`, 25, yPosition);
          yPosition += 5;
          pdf.text(`  Systemic Risk: ${((traditional_summary.probability_systemic_event || 0) * 100).toFixed(1)}%`, 25, yPosition);
          yPosition += 8;
        }

        if (blockchain_summary) {
          pdf.text('Blockchain Banking System:', 20, yPosition);
          yPosition += 6;
          pdf.text(`  Average Failures: ${blockchain_summary.average_failures?.toFixed(2) || 'N/A'}`, 25, yPosition);
          yPosition += 5;
          pdf.text(`  Maximum Failures: ${blockchain_summary.max_failures || 'N/A'}`, 25, yPosition);
          yPosition += 5;
          pdf.text(`  Systemic Risk: ${((blockchain_summary.probability_systemic_event || 0) * 100).toFixed(1)}%`, 25, yPosition);
          yPosition += 8;
        }

        if (improvements) {
          pdf.text('Improvements with Blockchain:', 20, yPosition);
          yPosition += 6;
          pdf.text(`  Risk Reduction: ${(improvements.average_failures || 0).toFixed(1)}%`, 25, yPosition);
          yPosition += 5;
        }

        if (statistical_analysis) {
          pdf.text('Statistical Analysis:', 20, yPosition);
          yPosition += 6;
          pdf.text(`  P-value: ${statistical_analysis.p_value?.toFixed(6) || 'N/A'}`, 25, yPosition);
          yPosition += 5;
          pdf.text(`  Effect Size: ${statistical_analysis.effect || 'N/A'}`, 25, yPosition);
          yPosition += 8;
        }
      }

      // Add charts if requested
      if (options.includeCharts && chartElements.length > 0) {
        for (let i = 0; i < chartElements.length; i++) {
          const element = chartElements[i];
          if (element) {
            // Check if we need a new page
            if (yPosition > pageHeight - 80) {
              pdf.addPage();
              yPosition = 20;
            }

            pdf.setFontSize(14);
            pdf.setFont(undefined, 'bold');
            pdf.text(`Chart ${i + 1}`, 20, yPosition);
            yPosition += 10;

            try {
              const canvas = await html2canvas(element, {
                backgroundColor: '#ffffff',
                scale: 1,
                useCORS: true
              });

              const imgData = canvas.toDataURL('image/png');
              const imgWidth = pageWidth - 40;
              const imgHeight = (canvas.height * imgWidth) / canvas.width;

              // Check if image fits on current page
              if (yPosition + imgHeight > pageHeight - 20) {
                pdf.addPage();
                yPosition = 20;
              }

              pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 10;
            } catch (chartError) {
              console.warn(`Failed to add chart ${i + 1} to PDF:`, chartError);
              pdf.text(`[Chart ${i + 1} could not be rendered]`, 20, yPosition);
              yPosition += 10;
            }
          }
        }
      }

      // Save the PDF
      const fileName = `${simulationData.name || 'simulation'}_report.pdf`;
      pdf.save(fileName);

    } catch (err) {
      setError('Failed to generate PDF report');
      console.error('PDF export error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Generic export function that handles different formats
  const exportData = useCallback(async (simulationId, simulationData, options = {}) => {
    const { format, chartElements = [] } = options;

    switch (format) {
      case 'json':
        await exportJSON(simulationId, options);
        break;
      case 'csv':
        await exportCSV(simulationId, options);
        break;
      case 'pdf':
        await exportPDF(simulationData, chartElements, options);
        break;
      case 'images':
        await exportChartImages(chartElements, simulationData.name);
        break;
      default:
        setError('Unsupported export format');
    }
  }, [exportJSON, exportCSV, exportPDF, exportChartImages]);

  // Helper function to download blob
  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return {
    loading,
    error,
    exportData,
    exportJSON,
    exportCSV,
    exportPDF,
    exportChartImages
  };
};

export default useExport;