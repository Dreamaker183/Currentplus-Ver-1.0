/**
 * Current+ ESG Dashboard
 * Main dashboard functionality with reliable ThingSpeak data fetching
 */

// DOM safe utility to prevent "Cannot read property of null" errors
const domSafe = {
  getElementById: (id) => document.getElementById(id),
  setText: (id, text) => {
    const element = typeof id === 'string' ? document.getElementById(id) : id;
    if (element) element.textContent = text;
  },
  setHTML: (id, html) => {
    const element = typeof id === 'string' ? document.getElementById(id) : id;
    if (element) element.innerHTML = html;
  },
  addClass: (id, className) => {
    const element = typeof id === 'string' ? document.getElementById(id) : id;
    if (element) element.classList.add(className);
  },
  removeClass: (id, className) => {
    const element = typeof id === 'string' ? document.getElementById(id) : id;
    if (element) element.classList.remove(className);
  },
  setValue: (id, value) => {
    const element = typeof id === 'string' ? document.getElementById(id) : id;
    if (element) element.value = value;
  },
  getValue: (id) => {
    const element = typeof id === 'string' ? document.getElementById(id) : id;
    return element ? element.value : null;
  }
};

document.addEventListener('DOMContentLoaded', function() {
  // Check if Chart.js is available before initializing the dashboard
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded! Dashboard will not function properly.');
    const errorEl = document.getElementById('error-notification');
    const errorText = document.getElementById('error-text');
    if (errorEl && errorText) {
      errorText.textContent = 'Required library Chart.js is missing. Please check the console for details.';
      errorEl.classList.remove('hidden');
    } else {
      alert('Required library Chart.js is missing. Dashboard cannot initialize.');
    }
    return;
  }
  
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
      carbon: []
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
    this.setupHistoricalUI();
    
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
      // Track missing elements
      const missingElements = [];
      
      // Helper function to safely get elements and track missing ones
      const getElement = (id) => {
        const element = document.getElementById(id);
        if (!element) {
          missingElements.push(id);
        }
        return element;
      };
      
      // Status elements
      this.elements.lastUpdated = getElement('last-updated');
      this.elements.connectionStatus = getElement('connection-status');
      this.elements.channelName = getElement('channel-name');
      
      // Chart containers
      this.elements.energyChart = getElement('energy-chart');
      this.elements.carbonChart = getElement('carbon-chart');
      
      // Metric cards
      this.elements.currentEnergyValue = getElement('current-energy-value');
      this.elements.currentCarbonValue = getElement('current-carbon-value');
      
      // ESG Score elements
      this.elements.esgScore = getElement('esg-score');
      this.elements.environmentScore = getElement('environment-score');
      this.elements.socialScore = getElement('social-score');
      this.elements.governanceScore = getElement('governance-score');
      
      // Loading indicator
      this.elements.loadingIndicator = getElement('loading-indicator');
      this.elements.loadingText = getElement('loading-text');
      
      // Error notification
      this.elements.errorNotification = getElement('error-notification');
      this.elements.errorText = getElement('error-text');
      
      // Historical data elements
      this.elements.historicalPanel = getElement('historical-data-panel');
      this.elements.historyStartDate = getElement('history-start-date');
      this.elements.historyEndDate = getElement('history-end-date');
      this.elements.showHistoryBtn = getElement('show-history');
      this.elements.fetchHistoryBtn = getElement('fetch-history');
      this.elements.cancelHistoryBtn = getElement('cancel-history');
      
      // Log missing elements for debugging
      if (missingElements.length > 0) {
        console.warn('Missing DOM elements:', missingElements.join(', '));
      }
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
    
    // Historical data UI buttons
    const showHistoryBtn = document.getElementById('show-history');
    if (showHistoryBtn) {
      showHistoryBtn.addEventListener('click', () => this.toggleHistoricalPanel(true));
    }
    
    const fetchHistoryBtn = document.getElementById('fetch-history');
    if (fetchHistoryBtn) {
      fetchHistoryBtn.addEventListener('click', () => this.fetchHistoricalData());
    }
    
    const cancelHistoryBtn = document.getElementById('cancel-history');
    if (cancelHistoryBtn) {
      cancelHistoryBtn.addEventListener('click', () => this.toggleHistoricalPanel(false));
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
      
      // Try both potential localStorage keys since names might be inconsistent
      const channelId = localStorage.getItem('thingspeak_channelID') || localStorage.getItem('thingspeakChannelID');
      const apiKey = localStorage.getItem('thingspeak_readAPIKey') || localStorage.getItem('thingspeakAPIKey');
      
      if (channelId && apiKey && channelId !== "YOUR_CHANNEL_ID" && apiKey !== "YOUR_API_KEY") {
        console.log('Found ThingSpeak credentials in localStorage with alternate keys');
        this.state.thingSpeakSettings = {
          channelId: channelId,
          apiKey: apiKey,
          resultsToFetch: 100
        };
        // Save with consistent naming for next time
        localStorage.setItem('thingSpeakSettings', JSON.stringify(this.state.thingSpeakSettings));
      } else {
        this.showConfigurationRequired();
        return;
      }
    }
    
    // Extract settings, checking for both camelCase and snake_case property names for compatibility
    const channelId = this.state.thingSpeakSettings.channelId || 
                    this.state.thingSpeakSettings.channelID || 
                    localStorage.getItem('thingspeak_channelID') || 
                    localStorage.getItem('thingspeakChannelID');
                    
    const apiKey = this.state.thingSpeakSettings.apiKey || 
                  this.state.thingSpeakSettings.readAPIKey || 
                  localStorage.getItem('thingspeak_readAPIKey') || 
                  localStorage.getItem('thingspeakAPIKey');
                  
    const resultsToFetch = this.state.thingSpeakSettings.resultsToFetch || 
                          this.state.thingSpeakSettings.results || 
                          100;
    
    if (!channelId || !apiKey || channelId === "YOUR_CHANNEL_ID" || apiKey === "YOUR_API_KEY") {
      console.error('Invalid ThingSpeak settings:', { channelId, apiKey });
      this.showError('ThingSpeak Channel ID and API Key are required. Please configure in Settings.');
      return;
    }
    
    console.log('Using ThingSpeak credentials:', { channelId, apiKey: apiKey ? apiKey.substring(0, 4) + '...' : 'null' });
    
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
   * @param {boolean} isHistorical - Whether this is historical data
   */
  processThingSpeakData: function(data, isHistorical = false) {
    if (!data || !data.channel || !data.feeds) {
      this.showError('Invalid data format from ThingSpeak');
      return;
    }
    
    // Update channel info
    if (this.elements.channelName) {
      this.elements.channelName.textContent = data.channel.name + (isHistorical ? ' (Historical)' : '');
    }
    
    if (this.elements.connectionStatus) {
      this.elements.connectionStatus.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle mr-1"></i>Connected</span>';
    }
    
    // Process feeds
    const feeds = data.feeds;
    
    // Prepare data arrays for charts
    const energyData = [];
    const carbonData = [];
    
    // Get the energy field name from the global CONFIG if available
    let energyField = 'field1'; // Default fallback
    if (window.CONFIG && window.CONFIG.thingspeak && window.CONFIG.thingspeak.fieldMap) {
      energyField = window.CONFIG.thingspeak.fieldMap.energyUsage || 'field1';
    }
    
    console.log('Using energy field:', energyField);
    
    feeds.forEach(feed => {
      const timestamp = new Date(feed.created_at);
      
      // Use configured field for energy usage
      const energyValue = parseFloat(feed[energyField]) || 0;
      
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
    });
    
    // Store the processed data
    this.state.data.energy = energyData;
    this.state.data.carbon = carbonData;
    
    // Update charts
    this.updateCharts();
    
    // Update current metrics
    this.updateCurrentMetrics();
    
    // Calculate and update ESG scores
    this.updateESGScores(feeds);
    
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
    try {
      // Check if Chart object is available
      if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Charts cannot be initialized.');
        return;
      }
      
      // Destroy existing charts if they exist
      if (this.state.chartInstances.energyChart) {
        try {
          this.state.chartInstances.energyChart.destroy();
        } catch (error) {
          console.warn('Error destroying energy chart:', error);
        }
      }
      
      if (this.state.chartInstances.carbonChart) {
        try {
          this.state.chartInstances.carbonChart.destroy();
        } catch (error) {
          console.warn('Error destroying carbon chart:', error);
        }
      }
      
      // Create new charts if containers exist
      if (this.elements.energyChart) {
        try {
          this.state.chartInstances.energyChart = this.createTimeSeriesChart(
            this.elements.energyChart,
            'Energy Consumption',
            [],
            this.config.chartColors.energy,
            'kWh'
          );
        } catch (error) {
          console.error('Failed to create energy chart:', error);
        }
      } else {
        console.warn('Energy chart container not found in DOM');
      }
      
      if (this.elements.carbonChart) {
        try {
          this.state.chartInstances.carbonChart = this.createTimeSeriesChart(
            this.elements.carbonChart,
            'Carbon Emissions',
            [],
            this.config.chartColors.carbon,
            'kg CO₂'
          );
        } catch (error) {
          console.error('Failed to create carbon chart:', error);
        }
      } else {
        console.warn('Carbon chart container not found in DOM');
      }
    } catch (error) {
      console.error('Error initializing charts:', error);
    }
  },
  
  /**
   * Create a time series chart
   * @param {HTMLElement} container - Chart container element
   * @param {string} label - Chart label
   * @param {Array} data - Initial data
   * @param {Object} colors - Chart colors object
   * @param {string} unit - Data unit
   * @returns {Chart|null} - Chart.js chart instance or null if creation fails
   */
  createTimeSeriesChart: function(container, label, data, colors, unit) {
    try {
      if (!container) {
        console.error(`Chart container for ${label} is null or undefined`);
        return null;
      }
      
      // Check if Chart.js is available
      if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Cannot create chart.');
        return null;
      }
      
      const ctx = container.getContext('2d');
      if (!ctx) {
        console.error(`Could not get 2d context for ${label} chart`);
        return null;
      }
      
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
    } catch (error) {
      console.error(`Error creating ${label} chart:`, error);
      return null;
    }
  },
  
  /**
   * Update charts with current data
   */
  updateCharts: function() {
    try {
      if (!this.state.data.energy.length) {
        console.log('No energy data available to update charts');
        return;
      }
      
      // Filter data based on selected timeframe
      const filteredData = this.filterDataByTimeframe();
      
      // Update energy chart
      if (this.state.chartInstances.energyChart) {
        try {
          if (this.state.chartInstances.energyChart.data && 
              this.state.chartInstances.energyChart.data.datasets && 
              this.state.chartInstances.energyChart.data.datasets.length > 0) {
            
            this.state.chartInstances.energyChart.data.datasets[0].data = filteredData.energy;
            this.state.chartInstances.energyChart.update('none'); // Use 'none' mode for better performance
          } else {
            console.warn('Energy chart datasets not properly initialized');
          }
        } catch (error) {
          console.error('Error updating energy chart:', error);
        }
      }
      
      // Update carbon chart
      if (this.state.chartInstances.carbonChart) {
        try {
          if (this.state.chartInstances.carbonChart.data && 
              this.state.chartInstances.carbonChart.data.datasets && 
              this.state.chartInstances.carbonChart.data.datasets.length > 0) {
            
            this.state.chartInstances.carbonChart.data.datasets[0].data = filteredData.carbon;
            this.state.chartInstances.carbonChart.update('none'); // Use 'none' mode for better performance
          } else {
            console.warn('Carbon chart datasets not properly initialized');
          }
        } catch (error) {
          console.error('Error updating carbon chart:', error);
        }
      }
    } catch (error) {
      console.error('Error in updateCharts:', error);
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
    
    return {
      energy: filteredEnergy,
      carbon: filteredCarbon
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
    
    // Update chart time units with null checks
    Object.entries(this.state.chartInstances).forEach(([chartName, chart]) => {
      if (chart && chart.options && chart.options.scales && chart.options.scales.x && chart.options.scales.x.time) {
        chart.options.scales.x.time.unit = timeUnit;
      } else {
        console.warn(`Cannot update time unit for ${chartName}: chart or required properties are not available`);
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
  },
  
  /**
   * Update ESG scores
   */
  updateESGScores: function(feeds) {
    console.log("[updateESGScores] Updating scores...");
    
    // Default to placeholder values if we can't calculate scores
    let overallScore = '--';
    let envScore = '--';
    let socialScore = '--';
    let govScore = '--';
    
    try {
      if (feeds && feeds.length > 0) {
        // Calculate environmental score based on energy usage
        // This is a simplified example - adjust calculations based on your business logic
        envScore = this.calculateEnvironmentalScore(feeds);
        
        // Placeholder Social & Governance scores (replace with actual logic)
        socialScore = 70; // Example fixed value
        govScore = 65;    // Example fixed value
        
        // Calculate overall ESG score (weighted average)
        overallScore = Math.round((envScore * 0.5) + (socialScore * 0.25) + (govScore * 0.25));
        
        console.log(`[updateESGScores] Calculated scores: E=${envScore}, S=${socialScore}, G=${govScore}, Overall=${overallScore}`);
      } else {
        console.warn("[updateESGScores] No data feeds available to calculate scores");
      }
      
      // Ensure scores are valid strings (never undefined, null, or empty)
      overallScore = overallScore?.toString() || '--';
      envScore = envScore?.toString() || '--';
      socialScore = socialScore?.toString() || '--';
      govScore = govScore?.toString() || '--';
      
      // Update UI with scores - safely set text content
      if (this.elements.esgScore) {
        this.elements.esgScore.textContent = overallScore;
      } else {
        console.error("[updateESGScores] esgScore element not found in DOM");
      }
      
      if (this.elements.environmentScore) {
        this.elements.environmentScore.textContent = envScore;
      } else {
        console.error("[updateESGScores] environmentScore element not found in DOM");
      }
      
      if (this.elements.socialScore) {
        this.elements.socialScore.textContent = socialScore;
      } else {
        console.error("[updateESGScores] socialScore element not found in DOM");
      }
      
      if (this.elements.governanceScore) {
        this.elements.governanceScore.textContent = govScore;
      } else {
        console.error("[updateESGScores] governanceScore element not found in DOM");
      }
      
      console.log("[updateESGScores] Score element updates complete");
    } catch (error) {
      console.error("[updateESGScores] Error calculating or updating scores:", error);
      
      // Try to update UI with default values even if calculation failed
      try {
        if (this.elements.esgScore) this.elements.esgScore.textContent = '--';
        if (this.elements.environmentScore) this.elements.environmentScore.textContent = '--';
        if (this.elements.socialScore) this.elements.socialScore.textContent = '--';
        if (this.elements.governanceScore) this.elements.governanceScore.textContent = '--';
      } catch (e) {
        console.error("[updateESGScores] Failed to set default values:", e);
      }
    }
  },
  
  /**
   * Calculate environmental score based on energy usage from feeds
   * @param {Array} feeds - ThingSpeak data feeds
   * @returns {number} Environmental score (0-100)
   */
  calculateEnvironmentalScore: function(feeds) {
    try {
      // Example implementation - adjust based on your specific needs
      // Get the energy field from config
      const energyField = this.config.thingspeak.fieldMap.energyUsage || 'field1';
      
      // Get recent feeds (last 10)
      const recentFeeds = feeds.slice(-10);
      
      // Calculate average energy consumption
      let totalEnergy = 0;
      let validReadings = 0;
      
      recentFeeds.forEach(feed => {
        const value = parseFloat(feed[energyField]);
        if (!isNaN(value)) {
          totalEnergy += value;
          validReadings++;
        }
      });
      
      if (validReadings === 0) {
        console.warn("[calculateEnvironmentalScore] No valid energy readings found");
        return 50; // Default mid-range score
      }
      
      const avgEnergy = totalEnergy / validReadings;
      console.log(`[calculateEnvironmentalScore] Average energy: ${avgEnergy} from ${validReadings} readings`);
      
      // Example scoring logic: lower energy is better
      // Adjust thresholds based on your specific energy usage patterns
      if (avgEnergy < 5) return 90;
      if (avgEnergy < 10) return 80;
      if (avgEnergy < 15) return 70;
      if (avgEnergy < 20) return 60;
      if (avgEnergy < 25) return 50;
      if (avgEnergy < 30) return 40;
      if (avgEnergy < 35) return 30;
      
      return 20; // High energy usage gets a low score
    } catch (error) {
      console.error("[calculateEnvironmentalScore] Error:", error);
      return 50; // Default mid-range score on error
    }
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
    } else {
      console.warn('Loading indicator elements not found in the DOM');
    }
  },
  
  /**
   * Hide loading indicator
   */
  hideLoading: function() {
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.classList.add('hidden');
    } else {
      console.warn('Loading indicator element not found in the DOM');
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
    } else {
      console.warn('Error notification elements not found in the DOM, cannot show error:', message);
    }
  },
  
  /**
   * Hide error notification
   */
  hideError: function() {
    if (this.elements.errorNotification) {
      this.elements.errorNotification.classList.add('hidden');
    } else {
      console.warn('Error notification element not found in the DOM');
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
  },
  
  /**
   * Setup the historical data UI
   */
  setupHistoricalUI: function() {
    // Initialize date inputs with default values
    if (this.elements.historyStartDate) {
      // Default to 7 days ago
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 7);
      this.elements.historyStartDate.value = this.formatDateForInput(defaultStart);
    }
    
    if (this.elements.historyEndDate) {
      // Default to now
      const defaultEnd = new Date();
      this.elements.historyEndDate.value = this.formatDateForInput(defaultEnd);
    }
  },
  
  /**
   * Format a date for datetime-local input
   * @param {Date} date - Date to format
   * @returns {string} - Formatted date string
   */
  formatDateForInput: function(date) {
    const pad = (num) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },
  
  /**
   * Toggle the historical data panel
   * @param {boolean} show - Whether to show or hide the panel
   */
  toggleHistoricalPanel: function(show) {
    if (this.elements.historicalPanel) {
      if (show) {
        this.elements.historicalPanel.classList.remove('hidden');
      } else {
        this.elements.historicalPanel.classList.add('hidden');
      }
    } else {
      console.warn('Historical panel element not found in the DOM');
    }
  },
  
  /**
   * Fetch historical data based on date range
   */
  fetchHistoricalData: async function() {
    // Check if we have necessary settings
    if (!this.state.thingSpeakSettings) {
      console.error('ThingSpeak settings not found');
      this.showConfigurationRequired();
      return;
    }
    
    // Get dates from inputs
    let startDate = this.elements.historyStartDate ? this.elements.historyStartDate.value : null;
    let endDate = this.elements.historyEndDate ? this.elements.historyEndDate.value : null;
    
    if (!startDate) {
      this.showError('Please select a start date for historical data');
      return;
    }
    
    // Extract settings
    const channelId = this.state.thingSpeakSettings.channelId || 
                      this.state.thingSpeakSettings.channelID || 
                      localStorage.getItem('thingspeak_channelID');
                      
    const apiKey = this.state.thingSpeakSettings.apiKey || 
                  this.state.thingSpeakSettings.readAPIKey || 
                  localStorage.getItem('thingspeak_readAPIKey');
    
    if (!channelId || !apiKey || channelId === "YOUR_CHANNEL_ID" || apiKey === "YOUR_API_KEY") {
      console.error('Invalid ThingSpeak settings:', { channelId, apiKey });
      this.showError('ThingSpeak Channel ID and API Key are required. Please configure in Settings.');
      return;
    }
    
    this.showLoading('Fetching historical data from ThingSpeak...');
    this.state.isLoading = true;
    
    try {
      console.log('Fetching historical ThingSpeak data:', { channelId, startDate, endDate });
      
      // Close the historical panel
      this.toggleHistoricalPanel(false);
      
      // Use the ThingSpeak connector if available
      if (window.thingSpeakConnector) {
        console.log('Using ThingSpeakConnector for historical data fetch');
        const data = await window.thingSpeakConnector.fetchHistoricalData({
          channelId,
          apiKey,
          startDate,
          endDate
        });
        
        this.processThingSpeakData(data, true);
      } else {
        // Fallback to direct fetch
        console.log('Using fallback method for historical data');
        await this.fallbackFetchHistoricalData(channelId, apiKey, startDate, endDate);
      }
      
      // Update last updated time
      this.state.lastUpdated = new Date();
      if (this.elements.lastUpdated) {
        this.elements.lastUpdated.textContent = this.formatDateTime(this.state.lastUpdated) + ' (Historical)';
      }
      
      // Update connection status
      if (this.elements.connectionStatus) {
        this.elements.connectionStatus.innerHTML = '<i class="fas fa-history text-purple-500 mr-2"></i> Historical Data';
      }
      
      this.hideLoading();
      this.state.isLoading = false;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      this.hideLoading();
      this.state.isLoading = false;
      this.showError('Error fetching historical data: ' + error.message);
      
      // Update connection status to show error
      if (this.elements.connectionStatus) {
        this.elements.connectionStatus.innerHTML = '<i class="fas fa-exclamation-circle text-red-500 mr-2"></i> Historical Data Fetch Failed';
      }
    }
  },
  
  /**
   * Fallback method to fetch historical ThingSpeak data directly
   */
  fallbackFetchHistoricalData: async function(channelId, apiKey, startDate, endDate) {
    console.log('Using fallback method to fetch historical ThingSpeak data');
    
    // Format dates properly for ThingSpeak API (YYYY-MM-DD HH:MM:SS)
    const formatDateForAPI = (dateString) => {
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          console.error('Invalid date:', dateString);
          return null;
        }
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      } catch (error) {
        console.error('Error formatting date:', error);
        return null;
      }
    };
    
    // Construct the URL with start and end parameters
    const url = new URL(`https://api.thingspeak.com/channels/${encodeURIComponent(channelId)}/feeds.json`);
    url.searchParams.append('api_key', apiKey);
    
    const formattedStartDate = startDate ? formatDateForAPI(startDate) : null;
    const formattedEndDate = endDate ? formatDateForAPI(endDate) : null;
    
    if (formattedStartDate) {
      url.searchParams.append('start', formattedStartDate);
      console.log('Start date:', formattedStartDate);
    }
    
    if (formattedEndDate) {
      url.searchParams.append('end', formattedEndDate);
      console.log('End date:', formattedEndDate);
    }
    
    console.log('Fetching from URL:', url.toString());
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      
      if (response.status === 404) {
        throw new Error(`Channel not found (ID: ${channelId})`);
      } else if (response.status === 401) {
        throw new Error('Invalid API key or insufficient permissions');
      } else {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    console.log('Historical data received:', data);
    
    if (!data || !data.channel) {
      throw new Error('Invalid response from ThingSpeak API');
    }
    
    // Log the number of data points received
    if (data.feeds) {
      console.log(`Received ${data.feeds.length} historical data points`);
    }
    
    // Add metadata to indicate this is historical data
    data.meta = data.meta || {};
    data.meta.historical = true;
    
    this.processThingSpeakData(data, true);
    return data;
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Dashboard;
} 