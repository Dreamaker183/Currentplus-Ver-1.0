/**
 * Current+ ESG Dashboard
 * Main dashboard functionality with reliable ThingSpeak data fetching
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the dashboard
  Dashboard.init();
});

/**
 * Dashboard module - handles all dashboard functionality
 */
const Dashboard = {
  config: {
    refreshInterval: 60000, // 1 minute default refresh
    chartColors: {
      energy: {
        primary: 'rgba(66, 135, 245, 0.7)',
        secondary: 'rgba(66, 135, 245, 0.3)'
      },
      carbon: {
        primary: 'rgba(52, 168, 83, 0.7)',
        secondary: 'rgba(52, 168, 83, 0.3)'
      },
      temperature: {
        primary: 'rgba(234, 67, 53, 0.7)',
        secondary: 'rgba(234, 67, 53, 0.3)'
      }
    },
    carbonFactor: 0.71, // kg CO₂ per kWh
  },
  
  state: {
    thingSpeakSettings: null,
    chartInstances: {},
    lastUpdated: null,
    refreshTimer: null,
    data: {
      energy: [],
      carbon: [],
      temperature: [],
      statusData: {}
    },
    isLoading: false,
    timeframe: 'week', // default timeframe
  },
  
  // DOM Elements
  elements: {},
  
  /**
   * Initialize the dashboard
   */
  init: function() {
    this.loadDOMElements();
    this.loadSettings();
    this.setupEventListeners();
    this.initCharts();
    
    // Fetch data on init
    this.fetchDashboardData();
    
    // Setup auto-refresh if enabled
    this.setupAutoRefresh();
    
    console.log('Dashboard initialized');
  },
  
  /**
   * Load DOM elements for easier access
   */
  loadDOMElements: function() {
    try {
      // Status elements
      this.elements.lastUpdated = document.getElementById('last-updated');
      this.elements.connectionStatus = document.getElementById('connection-status');
      this.elements.channelName = document.getElementById('channel-name');
      
      // Chart containers
      this.elements.energyChart = document.getElementById('energy-chart');
      this.elements.carbonChart = document.getElementById('carbon-chart');
      this.elements.temperatureChart = document.getElementById('temperature-chart');
      
      // Metric cards
      this.elements.currentEnergyValue = document.getElementById('current-energy-value');
      this.elements.currentCarbonValue = document.getElementById('current-carbon-value');
      this.elements.currentTemperatureValue = document.getElementById('current-temperature-value');
      
      // ESG Score elements
      this.elements.esgScore = document.getElementById('esg-score');
      this.elements.environmentScore = document.getElementById('environment-score');
      this.elements.socialScore = document.getElementById('social-score');
      this.elements.governanceScore = document.getElementById('governance-score');
      
      // Loading indicator
      this.elements.loadingIndicator = document.getElementById('loading-indicator');
      this.elements.loadingText = document.getElementById('loading-text');
      
      // Error notification
      this.elements.errorNotification = document.getElementById('error-notification');
      this.elements.errorText = document.getElementById('error-text');
    } catch (error) {
      console.error('Error loading DOM elements:', error);
    }
  },
  
  /**
   * Load ThingSpeak settings from localStorage
   */
  loadSettings: function() {
    try {
      const settingsJSON = localStorage.getItem('thingSpeakSettings');
      
      if (settingsJSON) {
        this.state.thingSpeakSettings = JSON.parse(settingsJSON);
        console.log('ThingSpeak settings loaded');
        
        // Initialize the ThingSpeak connector with loaded settings
        if (window.ThingSpeakConnector && !window.thingSpeakConnector) {
          window.thingSpeakConnector = new ThingSpeakConnector({
            debug: true
          });
          console.log('ThingSpeak connector initialized');
        }
      } else {
        // Try to load channel ID and API key individually (legacy support)
        const channelId = localStorage.getItem('thingspeak_channelID');
        const apiKey = localStorage.getItem('thingspeak_readAPIKey');
        
        if (channelId && apiKey) {
          this.state.thingSpeakSettings = {
            channelId: channelId,
            apiKey: apiKey,
            resultsToFetch: 100
          };
          
          // Save in the new format for future use
          localStorage.setItem('thingSpeakSettings', JSON.stringify(this.state.thingSpeakSettings));
          console.log('ThingSpeak settings migrated from legacy format');
          
          // Initialize the ThingSpeak connector with loaded settings
          if (window.ThingSpeakConnector && !window.thingSpeakConnector) {
            window.thingSpeakConnector = new ThingSpeakConnector({
              debug: true
            });
            console.log('ThingSpeak connector initialized');
          }
        } else {
          console.warn('ThingSpeak settings not found in localStorage');
          this.showConfigurationRequired();
        }
      }
      
      // Load other settings
      const autoRefresh = localStorage.getItem('autoRefresh');
      if (autoRefresh === 'true') {
        this.config.autoRefresh = true;
        
        const refreshInterval = localStorage.getItem('refreshInterval');
        if (refreshInterval) {
          this.config.refreshInterval = parseInt(refreshInterval) * 1000;
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showError('Error loading settings: ' + error.message);
    }
  },
  
  /**
   * Set up event listeners
   */
  setupEventListeners: function() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.fetchDashboardData());
    }
    
    // Timeframe selection
    const timeframeButtons = document.querySelectorAll('.timeframe-btn');
    if (timeframeButtons.length) {
      timeframeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const timeframe = e.target.dataset.timeframe;
          this.changeTimeframe(timeframe);
        });
      });
    }
    
    // Setup error notification close button
    const errorCloseBtn = document.querySelector('#error-notification .close-btn');
    if (errorCloseBtn) {
      errorCloseBtn.addEventListener('click', () => {
        this.hideError();
      });
    }
  },
  
  /**
   * Set up auto-refresh if enabled
   */
  setupAutoRefresh: function() {
    // Clear existing timer
    if (this.state.refreshTimer) {
      clearInterval(this.state.refreshTimer);
    }
    
    // Set up new timer if auto-refresh is enabled
    if (this.config.autoRefresh) {
      this.state.refreshTimer = setInterval(() => {
        this.fetchDashboardData();
      }, this.config.refreshInterval);
      
      console.log(`Auto-refresh enabled: ${this.config.refreshInterval / 1000}s`);
    }
  },
  
  /**
   * Fetch dashboard data from ThingSpeak
   */
  fetchDashboardData: async function() {
    // Check if we have necessary settings
    if (!this.state.thingSpeakSettings) {
      console.error('ThingSpeak settings not found');
      this.showConfigurationRequired();
      return;
    }
    
    // Extract settings, checking for both camelCase and snake_case property names for compatibility
    const channelId = this.state.thingSpeakSettings.channelId || 
                      this.state.thingSpeakSettings.channelID || 
                      localStorage.getItem('thingspeak_channelID');
                      
    const apiKey = this.state.thingSpeakSettings.apiKey || 
                  this.state.thingSpeakSettings.readAPIKey || 
                  localStorage.getItem('thingspeak_readAPIKey');
                  
    const resultsToFetch = this.state.thingSpeakSettings.resultsToFetch || 
                          this.state.thingSpeakSettings.results || 
                          100;
    
    if (!channelId || !apiKey || channelId === "YOUR_CHANNEL_ID" || apiKey === "YOUR_API_KEY") {
      console.error('Invalid ThingSpeak settings:', { channelId, apiKey });
      this.showError('ThingSpeak Channel ID and API Key are required. Please configure in Settings.');
      return;
    }
    
    this.showLoading('Fetching data from ThingSpeak...');
    this.state.isLoading = true;
    
    try {
      console.log('Fetching ThingSpeak data with:', { channelId, apiKey: apiKey.substring(0, 4) + '...' });
      
      // Use the ThingSpeak connector if available
      if (window.thingSpeakConnector) {
        console.log('Using ThingSpeakConnector for data fetch');
        const data = await window.thingSpeakConnector.fetchChannel({
          channelId,
          apiKey,
          results: resultsToFetch
        });
        
        this.processThingSpeakData(data);
      } else if (window.fetchThingSpeakData) {
        // Use global helper function if available (from main.js)
        console.log('Using global fetchThingSpeakData helper');
        const data = await window.fetchThingSpeakData({
          channelId,
          apiKey,
          results: resultsToFetch
        });
        
        this.processThingSpeakData(data);
      } else {
        // Fallback to direct fetch
        console.log('Using fallback direct fetch method');
        await this.fallbackFetchData(channelId, apiKey, resultsToFetch);
      }
      
      // Update last updated time
      this.state.lastUpdated = new Date();
      if (this.elements.lastUpdated) {
        this.elements.lastUpdated.textContent = this.formatDateTime(this.state.lastUpdated);
      }
      
      // Update connection status
      if (this.elements.connectionStatus) {
        this.elements.connectionStatus.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-2"></i> Connected';
      }
      
      this.hideLoading();
      this.state.isLoading = false;
    } catch (error) {
      console.error('Error fetching data:', error);
      this.hideLoading();
      this.state.isLoading = false;
      this.showError('Error fetching data: ' + error.message);
      
      // Update connection status to show error
      if (this.elements.connectionStatus) {
        this.elements.connectionStatus.innerHTML = '<i class="fas fa-exclamation-circle text-red-500 mr-2"></i> Connection Failed';
      }
      
      // Try to load from cache as a last resort
      this.tryLoadFromCache();
    }
  },
  
  /**
   * Process ThingSpeak data
   * @param {Object} data - ThingSpeak API response
   */
  processThingSpeakData: function(data) {
    if (!data || !data.channel || !data.feeds) {
      this.showError('Invalid data format from ThingSpeak');
      return;
    }
    
    // Update channel info
    if (this.elements.channelName) {
      this.elements.channelName.textContent = data.channel.name || 'ThingSpeak Channel';
    }
    
    if (this.elements.connectionStatus) {
      this.elements.connectionStatus.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle mr-1"></i>Connected</span>';
    }
    
    // Process feeds
    const feeds = data.feeds;
    
    // Prepare data arrays for charts
    const energyData = [];
    const carbonData = [];
    const temperatureData = [];
    
    feeds.forEach(feed => {
      const timestamp = new Date(feed.created_at);
      
      // Example mapping - adjust based on your actual field mapping
      const energyValue = parseFloat(feed.field1) || 0;
      const temperatureValue = parseFloat(feed.field2) || 0;
      
      // Calculate carbon emissions based on energy
      const carbonValue = energyValue * this.config.carbonFactor;
      
      // Add to data arrays
      energyData.push({
        x: timestamp,
        y: energyValue
      });
      
      carbonData.push({
        x: timestamp,
        y: carbonValue
      });
      
      temperatureData.push({
        x: timestamp,
        y: temperatureValue
      });
    });
    
    // Store the processed data
    this.state.data.energy = energyData;
    this.state.data.carbon = carbonData;
    this.state.data.temperature = temperatureData;
    
    // Update charts
    this.updateCharts();
    
    // Update current metrics
    this.updateCurrentMetrics();
    
    // Calculate and update ESG scores
    this.updateESGScores();
    
    // Cache the data
    this.saveDataToCache(data);
  },
  
  /**
   * Fallback method to fetch ThingSpeak data directly
   */
  fallbackFetchData: async function(channelId, apiKey, results = 100) {
    console.log('Using fallback method to fetch ThingSpeak data');
    
    const url = `https://api.thingspeak.com/channels/${encodeURIComponent(channelId)}/feeds.json?api_key=${apiKey}&results=${results}`;
    
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Channel not found (ID: ${channelId})`);
      } else if (response.status === 401) {
        throw new Error('Invalid API key or insufficient permissions');
      } else {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    
    if (!data || !data.channel) {
      throw new Error('Invalid response from ThingSpeak API');
    }
    
    this.processThingSpeakData(data);
    return data;
  },
  
  /**
   * Try to load data from cache as a last resort
   */
  tryLoadFromCache: function() {
    try {
      const cachedData = localStorage.getItem('dashboardCache');
      
      if (cachedData) {
        const data = JSON.parse(cachedData);
        const cacheTime = new Date(data.timestamp);
        const now = new Date();
        const cacheAge = (now - cacheTime) / (1000 * 60); // In minutes
        
        this.processThingSpeakData(data.thingSpeakData);
        
        if (this.elements.connectionStatus) {
          this.elements.connectionStatus.innerHTML = 
            `<span class="text-yellow-500"><i class="fas fa-exclamation-triangle mr-1"></i>Using cached data (${Math.round(cacheAge)} min old)</span>`;
        }
        
        console.log(`Loaded data from cache (${Math.round(cacheAge)} minutes old)`);
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
  },
  
  /**
   * Save data to cache
   * @param {Object} data - ThingSpeak data to cache
   */
  saveDataToCache: function(data) {
    try {
      const cacheData = {
        timestamp: new Date().toISOString(),
        thingSpeakData: data
      };
      
      localStorage.setItem('dashboardCache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  },
  
  /**
   * Initialize dashboard charts
   */
  initCharts: function() {
    // Destroy existing charts if they exist
    if (this.state.chartInstances.energyChart) {
      this.state.chartInstances.energyChart.destroy();
    }
    
    if (this.state.chartInstances.carbonChart) {
      this.state.chartInstances.carbonChart.destroy();
    }
    
    if (this.state.chartInstances.temperatureChart) {
      this.state.chartInstances.temperatureChart.destroy();
    }
    
    // Create new charts if containers exist
    if (this.elements.energyChart) {
      this.state.chartInstances.energyChart = this.createTimeSeriesChart(
        this.elements.energyChart,
        'Energy Consumption',
        [],
        this.config.chartColors.energy,
        'kWh'
      );
    }
    
    if (this.elements.carbonChart) {
      this.state.chartInstances.carbonChart = this.createTimeSeriesChart(
        this.elements.carbonChart,
        'Carbon Emissions',
        [],
        this.config.chartColors.carbon,
        'kg CO₂'
      );
    }
    
    if (this.elements.temperatureChart) {
      this.state.chartInstances.temperatureChart = this.createTimeSeriesChart(
        this.elements.temperatureChart,
        'Temperature',
        [],
        this.config.chartColors.temperature,
        '°C'
      );
    }
  },
  
  /**
   * Create a time series chart
   * @param {HTMLElement} container - Chart container element
   * @param {string} label - Chart label
   * @param {Array} data - Initial data
   * @param {Object} colors - Chart colors object
   * @param {string} unit - Data unit
   * @returns {Chart} - Chart.js chart instance
   */
  createTimeSeriesChart: function(container, label, data, colors, unit) {
    const ctx = container.getContext('2d');
    
    return new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: label,
          data: data,
          borderColor: colors.primary,
          backgroundColor: colors.secondary,
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day',
              tooltipFormat: 'MMM d, yyyy HH:mm'
            },
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: unit
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} ${unit}`;
              }
            }
          }
        }
      }
    });
  },
  
  /**
   * Update charts with current data
   */
  updateCharts: function() {
    if (!this.state.data.energy.length) {
      return;
    }
    
    // Filter data based on selected timeframe
    const filteredData = this.filterDataByTimeframe();
    
    // Update energy chart
    if (this.state.chartInstances.energyChart) {
      this.state.chartInstances.energyChart.data.datasets[0].data = filteredData.energy;
      this.state.chartInstances.energyChart.update();
    }
    
    // Update carbon chart
    if (this.state.chartInstances.carbonChart) {
      this.state.chartInstances.carbonChart.data.datasets[0].data = filteredData.carbon;
      this.state.chartInstances.carbonChart.update();
    }
    
    // Update temperature chart
    if (this.state.chartInstances.temperatureChart) {
      this.state.chartInstances.temperatureChart.data.datasets[0].data = filteredData.temperature;
      this.state.chartInstances.temperatureChart.update();
    }
  },
  
  /**
   * Filter data based on selected timeframe
   * @returns {Object} - Filtered data
   */
  filterDataByTimeframe: function() {
    const now = new Date();
    let cutoffDate;
    
    switch (this.state.timeframe) {
      case 'day':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to week
    }
    
    // Filter each dataset
    const filteredEnergy = this.state.data.energy.filter(point => point.x >= cutoffDate);
    const filteredCarbon = this.state.data.carbon.filter(point => point.x >= cutoffDate);
    const filteredTemperature = this.state.data.temperature.filter(point => point.x >= cutoffDate);
    
    return {
      energy: filteredEnergy,
      carbon: filteredCarbon,
      temperature: filteredTemperature
    };
  },
  
  /**
   * Change the timeframe for charts
   * @param {string} timeframe - New timeframe (day, week, month, year)
   */
  changeTimeframe: function(timeframe) {
    // Update active button UI
    const buttons = document.querySelectorAll('.timeframe-btn');
    buttons.forEach(btn => {
      if (btn.dataset.timeframe === timeframe) {
        btn.classList.add('bg-blue-600');
        btn.classList.remove('bg-gray-700');
      } else {
        btn.classList.remove('bg-blue-600');
        btn.classList.add('bg-gray-700');
      }
    });
    
    // Update timeframe state
    this.state.timeframe = timeframe;
    
    // Update chart scales
    let timeUnit;
    switch (timeframe) {
      case 'day':
        timeUnit = 'hour';
        break;
      case 'week':
        timeUnit = 'day';
        break;
      case 'month':
        timeUnit = 'day';
        break;
      case 'year':
        timeUnit = 'month';
        break;
      default:
        timeUnit = 'day';
    }
    
    // Update chart time units
    Object.values(this.state.chartInstances).forEach(chart => {
      if (chart && chart.options && chart.options.scales && chart.options.scales.x) {
        chart.options.scales.x.time.unit = timeUnit;
      }
    });
    
    // Update charts with filtered data
    this.updateCharts();
  },
  
  /**
   * Update current metric values
   */
  updateCurrentMetrics: function() {
    // Use the most recent data point for current values
    if (this.state.data.energy.length > 0) {
      const latestEnergyData = this.state.data.energy[this.state.data.energy.length - 1];
      if (this.elements.currentEnergyValue) {
        this.elements.currentEnergyValue.textContent = latestEnergyData.y.toFixed(2) + ' kWh';
      }
    }
    
    if (this.state.data.carbon.length > 0) {
      const latestCarbonData = this.state.data.carbon[this.state.data.carbon.length - 1];
      if (this.elements.currentCarbonValue) {
        this.elements.currentCarbonValue.textContent = latestCarbonData.y.toFixed(2) + ' kg CO₂';
      }
    }
    
    if (this.state.data.temperature.length > 0) {
      const latestTempData = this.state.data.temperature[this.state.data.temperature.length - 1];
      if (this.elements.currentTemperatureValue) {
        this.elements.currentTemperatureValue.textContent = latestTempData.y.toFixed(1) + ' °C';
      }
    }
  },
  
  /**
   * Update ESG scores
   */
  updateESGScores: function() {
    // Calculate environmental score based on energy and carbon data
    let environmentalScore = 0;
    if (this.state.data.energy.length > 0 && this.state.data.carbon.length > 0) {
      // Get average energy consumption over the last week
      const recentEnergy = this.getRecentData(this.state.data.energy, 7);
      const avgEnergy = this.calculateAverage(recentEnergy);
      
      // Simple scoring algorithm (lower energy consumption = higher score)
      // This is just an example - replace with your actual scoring logic
      const baseScore = 100 - (avgEnergy * 0.5);
      environmentalScore = Math.max(0, Math.min(100, baseScore));
    } else {
      environmentalScore = 70; // Default score if no data
    }
    
    // Social and governance scores would normally be calculated from other data sources
    // For this example, we'll use placeholder values
    const socialScore = 75;
    const governanceScore = 80;
    
    // Overall ESG score (weighted average)
    const esgScore = Math.round(
      (environmentalScore * 0.4) + (socialScore * 0.3) + (governanceScore * 0.3)
    );
    
    // Update score displays if the elements exist
    if (this.elements.esgScore) {
      this.elements.esgScore.textContent = esgScore;
    }
    
    if (this.elements.environmentScore) {
      this.elements.environmentScore.textContent = Math.round(environmentalScore);
    }
    
    if (this.elements.socialScore) {
      this.elements.socialScore.textContent = socialScore;
    }
    
    if (this.elements.governanceScore) {
      this.elements.governanceScore.textContent = governanceScore;
    }
  },
  
  /**
   * Get recent data points
   * @param {Array} data - Data array
   * @param {number} days - Number of days to include
   * @returns {Array} - Recent data points
   */
  getRecentData: function(data, days) {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return data.filter(point => point.x >= cutoffDate);
  },
  
  /**
   * Calculate average value from data points
   * @param {Array} data - Data array
   * @returns {number} - Average value
   */
  calculateAverage: function(data) {
    if (!data || data.length === 0) {
      return 0;
    }
    
    const sum = data.reduce((total, point) => total + point.y, 0);
    return sum / data.length;
  },
  
  /**
   * Format date and time
   * @param {Date} date - Date to format
   * @returns {string} - Formatted date and time
   */
  formatDateTime: function(date) {
    return date.toLocaleString();
  },
  
  /**
   * Show loading indicator
   * @param {string} message - Loading message
   */
  showLoading: function(message = 'Loading...') {
    if (this.elements.loadingIndicator && this.elements.loadingText) {
      this.elements.loadingText.textContent = message;
      this.elements.loadingIndicator.classList.remove('hidden');
    }
  },
  
  /**
   * Hide loading indicator
   */
  hideLoading: function() {
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.classList.add('hidden');
    }
  },
  
  /**
   * Show error notification
   * @param {string} message - Error message
   */
  showError: function(message) {
    console.error('Dashboard error:', message);
    
    if (this.elements.errorNotification && this.elements.errorText) {
      this.elements.errorText.textContent = message;
      this.elements.errorNotification.classList.remove('hidden');
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        this.hideError();
      }, 10000);
    }
  },
  
  /**
   * Hide error notification
   */
  hideError: function() {
    if (this.elements.errorNotification) {
      this.elements.errorNotification.classList.add('hidden');
    }
  },
  
  /**
   * Show message that configuration is required
   */
  showConfigurationRequired: function() {
    if (this.elements.connectionStatus) {
      this.elements.connectionStatus.innerHTML = 
        '<span class="text-red-500"><i class="fas fa-exclamation-circle mr-1"></i>Configuration Required</span>';
    }
    
    this.showError('ThingSpeak API not configured. Please go to Settings to configure your ThingSpeak channel.');
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Dashboard;
} 