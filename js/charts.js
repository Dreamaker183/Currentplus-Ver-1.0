/**
 * Current+ Enterprise ESG Analytics Platform
 * Charts JavaScript Module
 * 
 * This file handles all data visualization with Chart.js, including:
 * - Energy consumption trends
 * - Carbon emissions analysis
 * - ESG performance metrics
 * - Predictive analytics visualization
 */

// Chart references - make it globally accessible
window.CHARTS = {
  energy: null,
  carbon: null
};

// Local reference for easier access within this file
const CHARTS = window.CHARTS;

// Chart configuration - update with PowerBI-inspired styling
const CHART_CONFIG = {
  timeframes: {
    day: { count: 24, unit: 'hour', format: 'HH:mm' },
    week: { count: 7, unit: 'day', format: 'MMM D' },
    month: { count: 30, unit: 'day', format: 'MMM D' }
  },
  colors: {
    // PowerBI-inspired color palette
    energy: {
      line: 'rgba(1, 118, 211, 1)', // PowerBI blue
      fill: 'rgba(1, 118, 211, 0.1)',
      pointBorder: 'rgba(1, 118, 211, 1)',
      pointBackground: 'rgba(1, 118, 211, 0.8)'
    },
    carbon: {
      line: 'rgba(16, 137, 62, 1)', // PowerBI green
      fill: 'rgba(16, 137, 62, 0.1)',
      pointBorder: 'rgba(16, 137, 62, 1)', 
      pointBackground: 'rgba(16, 137, 62, 0.8)'
    },
    forecast: {
      line: 'rgba(241, 127, 36, 1)', // PowerBI orange
      fill: 'rgba(241, 127, 36, 0.05)',
      pointBorder: 'rgba(241, 127, 36, 1)',
      pointBackground: 'rgba(241, 127, 36, 0.6)'
    }
  }
};

// Initialize chart data
let energyChartData = {
  labels: [],
  datasets: [{
    label: 'Energy Consumption (kWh)',
    data: [],
    borderColor: CHART_CONFIG.colors.energy.line,
    backgroundColor: CHART_CONFIG.colors.energy.fill,
    borderWidth: 2,
    pointBorderColor: CHART_CONFIG.colors.energy.pointBorder,
    pointBackgroundColor: CHART_CONFIG.colors.energy.pointBackground,
    pointRadius: 3,
    pointHoverRadius: 5,
    tension: 0.3,
    fill: true
  }]
};

let carbonChartData = {
  labels: [],
  datasets: [{
    label: 'Carbon Emissions (kg CO₂)',
    data: [],
    borderColor: CHART_CONFIG.colors.carbon.line,
    backgroundColor: CHART_CONFIG.colors.carbon.fill,
    borderWidth: 2,
    pointBorderColor: CHART_CONFIG.colors.carbon.pointBorder,
    pointBackgroundColor: CHART_CONFIG.colors.carbon.pointBackground,
    pointRadius: 3,
    pointHoverRadius: 5,
    tension: 0.3,
    fill: true
  }]
};

// Chart options - update with PowerBI-inspired styling
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        color: 'rgba(255, 255, 255, 0.8)',
        font: {
          family: '"Segoe UI", Helvetica, Arial, sans-serif', // PowerBI font
          size: 12,
          weight: 500
        },
        boxWidth: 15,
        usePointStyle: true,
        pointStyle: 'circle'
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(31, 41, 55, 0.95)',
      titleColor: 'rgba(255, 255, 255, 0.95)',
      bodyColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: 'rgba(64, 85, 128, 0.5)',
      borderWidth: 1,
      padding: 12,
      boxPadding: 6,
      usePointStyle: true,
      cornerRadius: 4,
      bodyFont: {
        family: '"Segoe UI", Helvetica, Arial, sans-serif',
        size: 12
      },
      titleFont: {
        family: '"Segoe UI", Helvetica, Arial, sans-serif',
        weight: 600,
        size: 13
      },
      callbacks: {
        // Format labels to match PowerBI's precision and style
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            // Show 2 decimal places for values < 10, otherwise 1 decimal place
            const value = parseFloat(context.parsed.y);
            if (value < 10) {
              label += value.toFixed(2);
            } else {
              label += value.toFixed(1);
            }
          }
          return label;
        }
      }
    },
    // Add subtle shadow for a more professional look
    shadowPlugin: {
      beforeDraw: function(chart) {
        const ctx = chart.canvas.getContext('2d');
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(75, 85, 99, 0.15)', // PowerBI-style subtle grid lines
        tickBorderDash: [2, 2],
        drawBorder: false
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.7)',
        font: {
          family: '"Segoe UI", Helvetica, Arial, sans-serif',
          size: 11
        },
        maxRotation: 45,
        minRotation: 45,
        padding: 8
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(75, 85, 99, 0.15)', // PowerBI-style subtle grid lines
        tickBorderDash: [2, 2],
        drawBorder: false
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.7)',
        font: {
          family: '"Segoe UI", Helvetica, Arial, sans-serif',
          size: 11
        },
        padding: 10,
        callback: function(value) {
          // Add thousands separator for large numbers (PowerBI style)
          return value.toLocaleString();
        }
      }
    }
  },
  interaction: {
    mode: 'index',
    intersect: false
  },
  animation: {
    duration: 1000,
    easing: 'easeOutQuart' // Similar to PowerBI animation
  },
  elements: {
    line: {
      tension: 0.4 // Smoother curve like PowerBI
    },
    point: {
      radius: 3,
      hoverRadius: 5,
      borderWidth: 2
    }
  }
};

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeCharts();
  
  // Set up chart timeframe buttons
  setupChartTimeframeControls();
});

// Initialize all charts
function initializeCharts() {
  const energyChartCtx = document.getElementById('energyChart');
  const carbonChartCtx = document.getElementById('carbonChart');
  
  if (energyChartCtx) {
    CHARTS.energy = new Chart(energyChartCtx, {
      type: 'line',
      data: energyChartData,
      options: chartOptions
    });
  }
  
  if (carbonChartCtx) {
    CHARTS.carbon = new Chart(carbonChartCtx, {
      type: 'line',
      data: carbonChartData,
      options: chartOptions
    });
  }
}

// Setup chart timeframe control buttons
function setupChartTimeframeControls() {
  // Energy chart timeframe controls
  const energyTimeframeButtons = document.querySelectorAll('.energy-timeframe');
  if (energyTimeframeButtons.length > 0) {
    energyTimeframeButtons.forEach(button => {
      button.addEventListener('click', function() {
        const timeframe = this.textContent.toLowerCase();
        
        // Update active state
        energyTimeframeButtons.forEach(btn => {
          btn.classList.remove('bg-primary-600', 'text-white');
          btn.classList.add('bg-gray-700', 'hover:bg-gray-600');
        });
        
        this.classList.remove('bg-gray-700', 'hover:bg-gray-600');
        this.classList.add('bg-primary-600', 'text-white');
        
        // Update chart data
        setEnergyTimeframe(timeframe);
      });
    });
    
    // Set default active timeframe
    const defaultTimeframe = window.APP_STATE?.activeTimeframe || 'week';
    energyTimeframeButtons.forEach(btn => {
      if (btn.textContent.toLowerCase() === defaultTimeframe) {
        btn.click(); // Trigger click to set active state and load data
      }
    });
  }
  
  // Carbon chart timeframe controls
  const carbonTimeframeButtons = document.querySelectorAll('.carbon-timeframe');
  if (carbonTimeframeButtons.length > 0) {
    carbonTimeframeButtons.forEach(button => {
      button.addEventListener('click', function() {
        const timeframe = this.textContent.toLowerCase();
        
        // Update active state
        carbonTimeframeButtons.forEach(btn => {
          btn.classList.remove('bg-primary-600', 'text-white');
          btn.classList.add('bg-gray-700', 'hover:bg-gray-600');
        });
        
        this.classList.remove('bg-gray-700', 'hover:bg-gray-600');
        this.classList.add('bg-primary-600', 'text-white');
        
        // Update chart data
        setCarbonTimeframe(timeframe);
      });
    });
    
    // Set default active timeframe
    const defaultTimeframe = window.APP_STATE?.activeTimeframe || 'week';
    carbonTimeframeButtons.forEach(btn => {
      if (btn.textContent.toLowerCase() === defaultTimeframe) {
        btn.click(); // Trigger click to set active state and load data
      }
    });
  }
}

// Set energy chart timeframe and update data
function setEnergyTimeframe(timeframe) {
  if (!CHARTS.energy) {
    console.warn("Energy chart not initialized");
    return;
  }
  
  if (!window.APP_STATE?.historicalData || window.APP_STATE.historicalData.length === 0) {
    console.warn("No historical data available for chart");
    return;
  }
  
  // Store active timeframe in app state
  if (window.APP_STATE) {
    window.APP_STATE.activeTimeframe = timeframe;
  }
  
  // Generate chart data for the selected timeframe
  const data = generateTimeframeData(
    window.APP_STATE.historicalData, 
    'energy', // Use our processed energy field
    timeframe
  );
  
  // Update chart labels and data
  CHARTS.energy.data.labels = data.labels;
  CHARTS.energy.data.datasets[0].data = data.values;
  
  // Add forecast data if available
  if (window.APP_STATE?.aiModelLoaded && window.APP_STATE?.forecast?.energy && timeframe !== 'day') {
    addEnergyForecastData();
  } else {
    // Remove forecast dataset if exists
    if (CHARTS.energy.data.datasets.length > 1) {
      CHARTS.energy.data.datasets.splice(1, 1);
    }
  }
  
  CHARTS.energy.update();
}

// Set carbon chart timeframe and update data
function setCarbonTimeframe(timeframe) {
  if (!CHARTS.carbon) {
    console.warn("Carbon chart not initialized");
    return;
  }
  
  if (!window.APP_STATE?.historicalData || window.APP_STATE.historicalData.length === 0) {
    console.warn("No historical data available for chart");
    return;
  }
  
  const data = generateTimeframeData(
    window.APP_STATE.historicalData, 
    'carbon', // Use our processed carbon field
    timeframe
  );
  
  // Update chart labels and data
  CHARTS.carbon.data.labels = data.labels;
  CHARTS.carbon.data.datasets[0].data = data.values;
  
  // Add forecast data if available
  if (window.APP_STATE?.aiModelLoaded && window.APP_STATE?.forecast?.carbon && timeframe !== 'day') {
    addCarbonForecastData();
  } else {
    // Remove forecast dataset if exists
    if (CHARTS.carbon.data.datasets.length > 1) {
      CHARTS.carbon.data.datasets.splice(1, 1);
    }
  }
  
  CHARTS.carbon.update();
}

// Generate data for a specific timeframe
function generateTimeframeData(data, field, timeframe) {
  const timeframeConfig = CHART_CONFIG.timeframes[timeframe] || CHART_CONFIG.timeframes.week;
  const count = timeframeConfig.count;
  
  // Sort data by timestamp
  const sortedData = [...data].sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  
  // Group data by timeframe unit
  const groupedData = groupDataByTimeUnit(sortedData, timeframeConfig.unit);
  
  // Take the last 'count' items
  const recentData = Object.entries(groupedData).slice(-count);
  
  // Format data for the chart
  const labels = [];
  const values = [];
  
  recentData.forEach(([timestamp, entries]) => {
    const date = new Date(timestamp);
    
    // Format the label based on timeframe
    let label;
    if (timeframe === 'day') {
      label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    labels.push(label);
    
    // Calculate average value for this timeframe
    let value = 0;
    if (entries.length > 0) {
      const sum = entries.reduce((acc, entry) => {
        return acc + entry[field];
      }, 0);
      
      value = sum / entries.length;
    }
    
    values.push(value.toFixed(2));
  });
  
  return { labels, values };
}

// Group data by time unit (hour, day, month)
function groupDataByTimeUnit(data, unit) {
  const grouped = {};
  
  data.forEach(entry => {
    const date = new Date(entry.created_at);
    let key;
    
    switch (unit) {
      case 'hour':
        // Set minutes and seconds to 0 to group by hour
        date.setMinutes(0, 0, 0);
        key = date.toISOString();
        break;
        
      case 'day':
        // Set hours, minutes and seconds to 0 to group by day
        date.setHours(0, 0, 0, 0);
        key = date.toISOString();
        break;
        
      case 'month':
        // Set day to 1 and hours, minutes, seconds to 0 to group by month
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        key = date.toISOString();
        break;
        
      default:
        key = entry.created_at;
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    
    grouped[key].push(entry);
  });
  
  return grouped;
}

// Add energy forecast data to chart
function addEnergyForecastData() {
  if (!CHARTS.energy || !window.APP_STATE?.forecast?.energy) return;
  
  // Check if forecast dataset already exists
  if (CHARTS.energy.data.datasets.length < 2) {
    // Add forecast dataset
    CHARTS.energy.data.datasets.push({
      label: 'Forecasted Energy Usage',
      data: [],
      borderColor: CHART_CONFIG.colors.forecast.line,
      backgroundColor: CHART_CONFIG.colors.forecast.fill,
      borderWidth: 2,
      pointBorderColor: CHART_CONFIG.colors.forecast.pointBorder,
      pointBackgroundColor: CHART_CONFIG.colors.forecast.pointBackground,
      pointRadius: 3,
      pointHoverRadius: 5,
      borderDash: [5, 5],
      tension: 0.3,
      fill: true
    });
  }
  
  // Add forecast data points
  const currentLabels = CHARTS.energy.data.labels;
  const currentData = CHARTS.energy.data.datasets[0].data;
  
  // Get the last actual data point
  const lastDataIndex = currentData.length - 1;
  
  // Generate forecast data
  const forecastData = [];
  for (let i = 0; i < currentLabels.length; i++) {
    if (i <= lastDataIndex) {
      // For historical data points, use null to not show the line
      forecastData.push(null);
    } else {
      // For future data points, use the forecasted values
      const forecastIndex = i - lastDataIndex - 1;
      if (forecastIndex < window.APP_STATE.forecast.energy.length) {
        forecastData.push(window.APP_STATE.forecast.energy[forecastIndex].toFixed(2));
      } else {
        forecastData.push(null);
      }
    }
  }
  
  CHARTS.energy.data.datasets[1].data = forecastData;
}

// Add carbon forecast data to chart
function addCarbonForecastData() {
  if (!CHARTS.carbon || !window.APP_STATE?.forecast?.carbon) return;
  
  // Check if forecast dataset already exists
  if (CHARTS.carbon.data.datasets.length < 2) {
    // Add forecast dataset
    CHARTS.carbon.data.datasets.push({
      label: 'Forecasted Carbon Emissions',
      data: [],
      borderColor: CHART_CONFIG.colors.forecast.line,
      backgroundColor: CHART_CONFIG.colors.forecast.fill,
      borderWidth: 2,
      pointBorderColor: CHART_CONFIG.colors.forecast.pointBorder,
      pointBackgroundColor: CHART_CONFIG.colors.forecast.pointBackground,
      pointRadius: 3,
      pointHoverRadius: 5,
      borderDash: [5, 5],
      tension: 0.3,
      fill: true
    });
  }
  
  // Add forecast data points
  const currentLabels = CHARTS.carbon.data.labels;
  const currentData = CHARTS.carbon.data.datasets[0].data;
  
  // Get the last actual data point
  const lastDataIndex = currentData.length - 1;
  
  // Generate forecast data
  const forecastData = [];
  for (let i = 0; i < currentLabels.length; i++) {
    if (i <= lastDataIndex) {
      // For historical data points, use null to not show the line
      forecastData.push(null);
    } else {
      // For future data points, use the forecasted values
      const forecastIndex = i - lastDataIndex - 1;
      if (forecastIndex < window.APP_STATE.forecast.carbon.length) {
        forecastData.push(window.APP_STATE.forecast.carbon[forecastIndex].toFixed(2));
      } else {
        forecastData.push(null);
      }
    }
  }
  
  CHARTS.carbon.data.datasets[1].data = forecastData;
}

// Update all charts with latest data
function updateCharts() {
  if (!window.APP_STATE?.historicalData || window.APP_STATE.historicalData.length === 0) {
    console.warn("No historical data available for updating charts");
    return;
  }
  
  // Update energy chart
  if (CHARTS.energy) {
    setEnergyTimeframe(window.APP_STATE.activeTimeframe || 'week');
  }
  
  // Update carbon chart
  if (CHARTS.carbon) {
    setCarbonTimeframe(window.APP_STATE.activeTimeframe || 'week');
  }
}

// Export chart as image (for reports)
function exportChartAsImage(chartId) {
  return new Promise((resolve, reject) => {
    const chart = chartId === 'energy' ? CHARTS.energy : CHARTS.carbon;
    
    if (!chart) {
      reject(new Error(`Chart '${chartId}' not found`));
      return;
    }
    
    const canvas = chart.canvas;
    const imageData = canvas.toDataURL('image/png');
    
    resolve(imageData);
  });
}

/**
 * Exports chart data to PowerBI-compatible JSON format
 * @param {string} chartId - The ID of the chart to export
 */
function exportChartToPowerBI(chartId) {
    console.log(`[exportChartToPowerBI] Exporting chart: ${chartId}`);
    
    try {
        // Get the chart instance
        let chartInstance = null;
        let chartTitle = "";
        
        if (chartId === 'energyUsageChart') {
            chartInstance = CHARTS.energy;
            chartTitle = "Energy Usage";
        } else if (chartId === 'carbonEmissionsChart') {
            chartInstance = CHARTS.carbon;
            chartTitle = "Carbon Emissions";
        } else {
            throw new Error(`Unknown chart ID: ${chartId}`);
        }
        
        if (!chartInstance) {
            throw new Error(`Chart ${chartId} not initialized`);
        }
        
        // Extract datasets and labels from the chart
        const labels = chartInstance.data.labels;
        const datasets = chartInstance.data.datasets;
        
        // Format data for PowerBI
        const powerBIData = {
            metadata: {
                chartTitle: chartTitle,
                exportDate: new Date().toISOString(),
                source: "Current+ ESG Analytics"
            },
            datasets: datasets.map(dataset => ({
                label: dataset.label,
                data: dataset.data.map((value, index) => ({
                    label: labels[index],
                    value: value
                }))
            }))
        };
        
        // Convert to JSON
        const jsonData = JSON.stringify(powerBIData, null, 2);
        
        // Create and download the file
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `Current_${chartTitle.replace(/\s+/g, '_')}_PowerBI_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        showSuccessMessage(`${chartTitle} data exported for PowerBI!`);
        console.log(`[exportChartToPowerBI] Successfully exported ${chartTitle} data`);
        return true;
    } catch (error) {
        console.error(`[exportChartToPowerBI] Error exporting chart data:`, error);
        showError(`Failed to export chart: ${error.message}`);
        return false;
    }
}

/**
 * Adds export buttons to all charts on the page
 */
function addChartExportButtons() {
    console.log('[addChartExportButtons] Adding export buttons to charts');
    
    const charts = [
        { id: 'energyUsageChart', title: 'Energy Usage' },
        { id: 'carbonEmissionsChart', title: 'Carbon Emissions' }
    ];
    
    charts.forEach(chart => {
        const chartContainer = document.getElementById(chart.id)?.closest('.chart-container');
        if (!chartContainer) return;
        
        // Check if export button already exists
        if (chartContainer.querySelector('.chart-export-btn')) return;
        
        // Find or create chart header
        let chartHeader = chartContainer.querySelector('.chart-header');
        if (!chartHeader) {
            chartHeader = document.createElement('div');
            chartHeader.className = 'chart-header flex justify-between items-center mb-4';
            chartContainer.prepend(chartHeader);
            
            // Add title if it doesn't exist
            const title = document.createElement('h3');
            title.className = 'text-lg font-semibold';
            title.textContent = chart.title;
            chartHeader.appendChild(title);
        }
        
        // Create export button container if it doesn't exist
        let btnContainer = chartHeader.querySelector('.chart-actions');
        if (!btnContainer) {
            btnContainer = document.createElement('div');
            btnContainer.className = 'chart-actions flex space-x-2';
            chartHeader.appendChild(btnContainer);
        }
        
        // Create export button
        const exportBtn = document.createElement('button');
        exportBtn.className = 'chart-export-btn text-xs bg-dark-700 hover:bg-dark-600 text-white px-2 py-1 rounded flex items-center';
        exportBtn.innerHTML = '<i class="fas fa-file-export mr-1"></i> Export';
        exportBtn.title = `Export ${chart.title} data for PowerBI`;
        exportBtn.addEventListener('click', () => exportChartToPowerBI(chart.id));
        
        btnContainer.appendChild(exportBtn);
    });
}

// Add function to initialize event handlers
function initializeChartEventHandlers() {
    // Add export buttons to charts when page is loaded
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a moment for charts to initialize
        setTimeout(() => {
            addChartExportButtons();
        }, 1000);
    });
    
    // Watch for charts being updated
    document.addEventListener('chartsUpdated', () => {
        addChartExportButtons();
    });
}

// Call this function to set up everything
initializeChartEventHandlers(); 