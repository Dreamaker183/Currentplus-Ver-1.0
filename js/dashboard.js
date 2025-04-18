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
      // Critical elements - if these are missing, the dashboard won't function properly
      const criticalElements = [
        'last-updated', 
        'connection-status', 
        'channel-name', 
        'energy-chart', 
        'carbon-chart', 
        'error-notification', 
        'error-text',
        'loading-indicator',
        'loading-text'
      ];
      
      // Non-critical elements - dashboard can function without these
      const optionalElements = [
        'current-energy-value',
        'current-carbon-value',
        'esg-score', 
        'environment-score',
        'social-score', 
        'governance-score', 
        'environment-score-bar',
        'social-score-bar', 
        'governance-score-bar', 
        'esg-score-circle',
        'historical-panel',
        'history-start-date',
        'history-end-date',
        'show-history',
        'fetch-history',
        'cancel-history'
      ];
      
      const missingCritical = [];
      const missingOptional = [];
      
      // Check for critical elements
      criticalElements.forEach(id => {
        this.elements[id] = document.getElementById(id);
        if (!this.elements[id]) {
          missingCritical.push(id);
          console.error(`[loadDOMElements] Critical element #${id} NOT FOUND - Dashboard may not function properly`);
        }
      });
      
      // Check for optional elements
      optionalElements.forEach(id => {
        this.elements[id] = document.getElementById(id);
        if (!this.elements[id]) {
          missingOptional.push(id);
          console.warn(`[loadDOMElements] Optional element #${id} not found`);
        }
      });
      
      // Log summary of missing elements
      if (missingCritical.length > 0) {
        console.error(`[loadDOMElements] ${missingCritical.length} critical elements missing: ${missingCritical.join(', ')}`);
      }
      
      if (missingOptional.length > 0) {
        console.warn(`[loadDOMElements] ${missingOptional.length} optional elements missing: ${missingOptional.join(', ')}`);
      }
      
      // Show a visible error if critical elements are missing
      if (missingCritical.length > 0) {
        const errorElement = document.getElementById('error-notification');
        const errorText = document.getElementById('error-text');
        
        if (errorElement && errorText) {
          errorText.textContent = `Missing critical elements: ${missingCritical.join(', ')}. Dashboard may not function properly.`;
          errorElement.classList.remove('hidden');
        } else {
          alert(`Dashboard Error: Missing critical elements: ${missingCritical.join(', ')}`);
        }
      }
    } catch (error) {
      console.error('[loadDOMElements] Error loading DOM elements:', error);
      alert('Dashboard Error: Failed to initialize elements. Check console for details.');
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
    console.log('[processThingSpeakData] Start processing. Is historical:', isHistorical);
    if (!data || !data.channel || !data.feeds) {
      console.error('[processThingSpeakData] Invalid data format received:', data);
      this.showError('Invalid data format from ThingSpeak');
      return;
    }

    // ----- Update basic info safely ----- 
    try {
      if (this.elements.channelName) {
        this.elements.channelName.textContent = data.channel.name + (isHistorical ? ' (Historical)' : '');
        console.log('[processThingSpeakData] Updated channel name');
      } else {
        console.warn('[processThingSpeakData] channelName element not found');
      }

      if (this.elements.connectionStatus) {
        this.elements.connectionStatus.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle mr-1"></i>Connected</span>';
        console.log('[processThingSpeakData] Updated connection status');
      } else {
        console.warn('[processThingSpeakData] connectionStatus element not found');
      }
    } catch (basicInfoError) {
      console.error('[processThingSpeakData] Error updating basic info:', basicInfoError);
    }

    // ----- Process feeds safely ----- 
    const feeds = data.feeds;
    const energyData = [];
    const carbonData = [];
    let energyField = 'field1'; // Default fallback
    
    try {
      if (window.CONFIG && window.CONFIG.thingspeak && window.CONFIG.thingspeak.fieldMap) {
        energyField = window.CONFIG.thingspeak.fieldMap.energyUsage || 'field1';
      }
      console.log('[processThingSpeakData] Using energy field:', energyField);

      feeds.forEach(feed => {
        const timestamp = new Date(feed.created_at);
        const energyValue = parseFloat(feed[energyField]) || 0;
        const carbonValue = energyValue * this.config.carbonFactor;
        
        energyData.push({ x: timestamp, y: energyValue });
        carbonData.push({ x: timestamp, y: carbonValue });
      });
      
      // Store processed data only if successful
      this.state.data.energy = energyData;
      this.state.data.carbon = carbonData;
      console.log(`[processThingSpeakData] Processed ${feeds.length} feeds into energy/carbon data`);
    } catch (feedProcessingError) {
      console.error('[processThingSpeakData] Error processing feeds:', feedProcessingError);
      this.showError('Error processing data feeds. Charts and scores might be inaccurate.');
      // Clear data to prevent using corrupted data
      this.state.data.energy = [];
      this.state.data.carbon = [];
      // Skip further UI updates if feed processing failed
      return;
    }

    // ----- Update UI components safely ----- 
    // Use requestAnimationFrame to ensure DOM is ready for updates
    requestAnimationFrame(() => {
      try {
        console.log('[processThingSpeakData RAF] Attempting to update charts...');
        this.updateCharts();
        console.log('[processThingSpeakData RAF] Charts update attempted.');
      } catch (chartError) {
        console.error('[processThingSpeakData RAF] Error during updateCharts call:', chartError);
      }
      
      try {
        console.log('[processThingSpeakData RAF] Attempting to update current metrics...');
        this.updateCurrentMetrics();
        console.log('[processThingSpeakData RAF] Current metrics update attempted.');
      } catch (metricsError) {
        console.error('[processThingSpeakData RAF] Error during updateCurrentMetrics call:', metricsError);
      }
      
      try {
        console.log('[processThingSpeakData RAF] Attempting to update ESG scores...');
        // Pass feeds data to the ESG score update within RAF
        this.updateESGScores(feeds); 
        console.log('[processThingSpeakData RAF] ESG scores update attempted.');
      } catch (esgError) {
        console.error('[processThingSpeakData RAF] Error during updateESGScores call:', esgError);
      }
    });

    // Cache the original, raw data (can happen outside RAF)
    try {
      this.saveDataToCache(data);
      console.log('[processThingSpeakData] Data saved to cache.');
    } catch (cacheError) {
      console.error('[processThingSpeakData] Error saving data to cache:', cacheError);
    }
    
    console.log('[processThingSpeakData] Processing complete (UI updates scheduled).');
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
    if (!container) {
      console.error(`Chart container for ${label} is null or undefined`);
      return null;
    }
    
    try {
      // Ensure Chart.js is available before attempting to create chart
      if (typeof Chart === 'undefined') {
        console.error('Chart.js is not available. Chart creation aborted.');
        return null;
      }
      
      // Safely get the 2D context
      let ctx;
      try {
        ctx = container.getContext('2d');
        if (!ctx) {
          console.error(`Failed to get 2D context from container for ${label}`);
          return null;
        }
      } catch (ctxError) {
        console.error(`Error getting context for ${label} chart:`, ctxError);
        return null;
      }
      
      // Create and return chart instance with error handling
      return new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [{
            label: label,
            data: data || [], // Ensure data is never undefined
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
    // Check if we have data to update
    if (!this.state.data.energy || this.state.data.energy.length === 0) {
      console.warn('No energy data available to update charts');
      return;
    }
    
    try {
      // Filter data based on selected timeframe
      const filteredData = this.filterDataByTimeframe();
      
      // Safely update energy chart
      if (this.state.chartInstances.energyChart) {
        try {
          const chart = this.state.chartInstances.energyChart;
          
          // Ensure the chart has the required properties before updating
          if (chart.data && 
              chart.data.datasets && 
              Array.isArray(chart.data.datasets) && 
              chart.data.datasets.length > 0) {
            
            chart.data.datasets[0].data = filteredData.energy || [];
            
            // Use safe update mode
            if (typeof chart.update === 'function') {
              chart.update('none'); // 'none' mode for better performance
            } else {
              console.warn('Energy chart update method not available');
            }
          } else {
            console.warn('Energy chart structure is not as expected');
          }
        } catch (energyError) {
          console.error('Error updating energy chart:', energyError);
        }
      }
      
      // Safely update carbon chart
      if (this.state.chartInstances.carbonChart) {
        try {
          const chart = this.state.chartInstances.carbonChart;
          
          // Ensure the chart has the required properties before updating
          if (chart.data && 
              chart.data.datasets && 
              Array.isArray(chart.data.datasets) && 
              chart.data.datasets.length > 0) {
            
            chart.data.datasets[0].data = filteredData.carbon || [];
            
            // Use safe update mode
            if (typeof chart.update === 'function') {
              chart.update('none'); // 'none' mode for better performance
            } else {
              console.warn('Carbon chart update method not available');
            }
          } else {
            console.warn('Carbon chart structure is not as expected');
          }
        } catch (carbonError) {
          console.error('Error updating carbon chart:', carbonError);
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
    console.log('[changeTimeframe] Changing timeframe to:', timeframe);
    try {
      // Update active button UI safely
      const buttons = document.querySelectorAll('.timeframe-btn');
      if (buttons && buttons.length) {
        buttons.forEach(btn => {
          // Check if button and its classList exist before modification
          if (btn && btn.classList) { 
            if (btn.dataset.timeframe === timeframe) {
              btn.classList.add('bg-blue-600');
              btn.classList.remove('bg-gray-700');
            } else {
              btn.classList.remove('bg-blue-600');
              btn.classList.add('bg-gray-700');
            }
          } else {
            console.warn('[changeTimeframe] Found invalid button in timeframe buttons list');
          }
        });
        console.log('[changeTimeframe] Updated button styles');
      } else {
        console.warn('[changeTimeframe] No timeframe buttons found');
      }
      
      // Update timeframe state
      this.state.timeframe = timeframe;
      
      // Map timeframe to chart time unit
      let timeUnit = 'day'; // Default
      switch (timeframe) {
        case 'day': timeUnit = 'hour'; break;
        case 'week': timeUnit = 'day'; break;
        case 'month': timeUnit = 'day'; break;
        case 'year': timeUnit = 'month'; break;
      }
      
      // Update chart time units if possible
      Object.entries(this.state.chartInstances).forEach(([chartName, chart]) => {
        try {
          if (chart && 
              chart.options && 
              chart.options.scales && 
              chart.options.scales.x && 
              chart.options.scales.x.time) {
            chart.options.scales.x.time.unit = timeUnit;
          }
        } catch (error) {
          console.warn(`Failed to update time unit for ${chartName}:`, error.message);
        }
      });
      
      // Update charts with filtered data
      this.updateCharts();
    } catch (error) {
      console.error('Error changing timeframe:', error);
    }
  },
  
  /**
   * Update current metric values
   */
  updateCurrentMetrics: function() {
    console.log('[updateCurrentMetrics] Updating current values...');
    // Use the most recent data point for current values
    if (this.state.data.energy && this.state.data.energy.length > 0) {
      const latestEnergyData = this.state.data.energy[this.state.data.energy.length - 1];
      // Safely update element
      if (this.elements.currentEnergyValue) {
        this.elements.currentEnergyValue.textContent = latestEnergyData.y.toFixed(2) + ' kWh';
        console.log('[updateCurrentMetrics] Updated energy value');
      } else {
        console.warn('[updateCurrentMetrics] currentEnergyValue element not found');
      }
    } else {
       console.warn('[updateCurrentMetrics] No energy data available');
       // Optionally clear or set placeholder if element exists
       if (this.elements.currentEnergyValue) this.elements.currentEnergyValue.textContent = '-- kWh';
    }
    
    if (this.state.data.carbon && this.state.data.carbon.length > 0) {
      const latestCarbonData = this.state.data.carbon[this.state.data.carbon.length - 1];
      // Safely update element
      if (this.elements.currentCarbonValue) {
        this.elements.currentCarbonValue.textContent = latestCarbonData.y.toFixed(2) + ' kg CO₂';
        console.log('[updateCurrentMetrics] Updated carbon value');
      } else {
        console.warn('[updateCurrentMetrics] currentCarbonValue element not found');
      }
    } else {
       console.warn('[updateCurrentMetrics] No carbon data available');
       // Optionally clear or set placeholder if element exists
       if (this.elements.currentCarbonValue) this.elements.currentCarbonValue.textContent = '-- kg CO₂';
    }
  },
  
  /**
   * Update ESG scores based on ThingSpeak data
   * @param {Array} feeds - ThingSpeak data feeds
   */
  updateESGScores: function(feeds) {
    console.log("[updateESGScores] Starting update...");
    
    // Initialize with safe default values
    let overallScore = '--';
    let envScore = '--';
    let socialScore = '--';
    let govScore = '--';
    
    try {
      // First check if we have any valid data to calculate scores
      if (feeds && Array.isArray(feeds) && feeds.length > 0) {
        try {
          // Calculate environmental score based on energy usage
          envScore = this.calculateEnvironmentalScore(feeds);
          console.log(`[updateESGScores] Calculated environmental score: ${envScore}`);
          
          // Placeholder scores for social and governance
          socialScore = 70; // Example placeholder
          govScore = 65;    // Example placeholder
          
          // Calculate overall ESG score (weighted average)
          // Only convert to numbers for calculation if the scores are numeric
          const envNum = typeof envScore === 'number' ? envScore : 0;
          const socialNum = typeof socialScore === 'number' ? socialScore : 0;
          const govNum = typeof govScore === 'number' ? govScore : 0;
          
          overallScore = Math.round((envNum * 0.5) + (socialNum * 0.25) + (govNum * 0.25));
          console.log(`[updateESGScores] Calculated overall score: ${overallScore}`);
        } catch (calcError) {
          console.error("[updateESGScores] Error calculating scores:", calcError);
          // Keep default values on calculation error
        }
      } else {
        console.warn("[updateESGScores] No valid feeds data provided, using default scores");
      }
      
      // Convert all scores to strings to avoid potential type issues
      const safeOverall = overallScore?.toString() || '--';
      const safeEnv = envScore?.toString() || '--';
      const safeSocial = socialScore?.toString() || '--';
      const safeGov = govScore?.toString() || '--';
      
      console.log(`[updateESGScores] Final scores to display: Overall=${safeOverall}, E=${safeEnv}, S=${safeSocial}, G=${safeGov}`);
      
      // Update DOM elements with scores - add multiple layers of safety
      this.updateScoreElement('esgScore', safeOverall);
      this.updateScoreElement('environmentScore', safeEnv);
      this.updateScoreElement('socialScore', safeSocial);
      this.updateScoreElement('governanceScore', safeGov);
      
      console.log("[updateESGScores] Finished updating scores");
    } catch (error) {
      console.error("[updateESGScores] Unexpected error:", error);
      
      // Fall back to safe defaults on any error
      try {
        this.updateScoreElement('esgScore', '--');
        this.updateScoreElement('environmentScore', '--');
        this.updateScoreElement('socialScore', '--');
        this.updateScoreElement('governanceScore', '--');
      } catch (fallbackError) {
        console.error("[updateESGScores] Error setting fallback values:", fallbackError);
      }
    }
  },
  
  /**
   * Helper method to safely update a score element
   * @param {string} elementKey - Key in this.elements object
   * @param {string} value - Value to set
   */
  updateScoreElement: function(elementKey, value) {
    try {
      const element = this.elements[elementKey];
      
      if (!element) {
        console.warn(`[updateScoreElement] Element '${elementKey}' not found in this.elements`);
        return;
      }
      
      // Double check element exists in DOM to catch potential stale references
      if (!document.body.contains(element)) {
        console.warn(`[updateScoreElement] Element '${elementKey}' is not in document`);
        return;
      }
      
      // Safely update the textContent
      element.textContent = value;
      console.log(`[updateScoreElement] Successfully updated ${elementKey} to "${value}"`);
    } catch (error) {
      console.error(`[updateScoreElement] Error updating ${elementKey}:`, error);
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
   * Show the loading indicator
   * @param {string} message - Optional loading message
   */
  showLoading: function(message = 'Loading...') {
    console.log('[showLoading] Showing loading indicator. Message:', message);
    
    // Use the cached elements if available
    const loadingIndicator = this.elements.loadingIndicator;
    const loadingText = this.elements.loadingText;
    
    if (loadingIndicator) {
      console.log('  - Found loadingIndicator element');
      // Safely access style properties
      if (loadingIndicator.style) {
        console.log('  - loadingIndicator.style exists');
        loadingIndicator.classList.remove('hidden');
        console.log('  - Removed hidden class from loadingIndicator');
      } else {
        console.warn('[showLoading] loadingIndicator element found, but .style is null');
      }
    } else {
      console.warn('[showLoading] Loading indicator element (#loading-indicator) not found');
    }
    
    if (loadingText) {
      console.log('  - Found loadingText element');
      loadingText.textContent = message;
      console.log('  - Set text content for loadingText');
    } else {
      console.warn('[showLoading] Loading text element (#loading-text) not found');
    }
  },
  
  /**
   * Hide the loading indicator
   */
  hideLoading: function() {
    console.log('[hideLoading] Hiding loading indicator.');
    
    // Use the cached elements if available
    const loadingIndicator = this.elements.loadingIndicator;
    
    if (loadingIndicator) {
      console.log('  - Found loadingIndicator element');
      // Safely access style properties
      if (loadingIndicator.style) {
        console.log('  - loadingIndicator.style exists');
        loadingIndicator.classList.add('hidden');
        console.log('  - Added hidden class to loadingIndicator');
      } else {
        console.warn('[hideLoading] loadingIndicator element found, but .style is null');
      }
    } else {
      console.warn('[hideLoading] Loading indicator element (#loading-indicator) not found');
    }
  },
  
  /**
   * Show an error message
   * @param {string} message - Error message to display
   */
  showError: function(message) {
    console.error('[showError] Displaying error:', message);
    
    // Use cached elements
    const errorNotification = this.elements.errorNotification;
    const errorText = this.elements.errorText;
    
    if (errorNotification) {
      console.log('  - Found errorNotification element');
      if (errorText) {
        console.log('  - Found errorText element');
        errorText.textContent = message;
        console.log('  - Set text content for errorText');
      } else {
        console.warn('[showError] Error text element (#error-text) not found');
      }
      
      // Safely access style properties
      if (errorNotification.style) {
        console.log('  - errorNotification.style exists');
        errorNotification.classList.remove('hidden');
        console.log('  - Removed hidden class from errorNotification');
      } else {
        console.warn('[showError] errorNotification element found, but .style is null');
      }
    } else {
      console.warn('[showError] Error notification element (#error-notification) not found');
      // Fallback to alert if the notification area is missing
      alert('Dashboard Error: ' + message);
    }
  },
  
  /**
   * Hide the error message
   */
  hideError: function() {
    console.log('[hideError] Hiding error notification.');
    
    // Use cached elements
    const errorNotification = this.elements.errorNotification;
    
    if (errorNotification) {
      console.log('  - Found errorNotification element');
      // Safely access style properties
      if (errorNotification.style) {
        console.log('  - errorNotification.style exists');
        errorNotification.classList.add('hidden');
        console.log('  - Added hidden class to errorNotification');
      } else {
        console.warn('[hideError] errorNotification element found, but .style is null');
      }
    } else {
      console.warn('[hideError] Error notification element (#error-notification) not found');
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
    console.log('[toggleHistoricalPanel] Toggling panel visibility to:', show);
    if (this.elements.historicalPanel) {
      // Check if classList exists before modifying
      if (this.elements.historicalPanel.classList) {
        if (show) {
          this.elements.historicalPanel.classList.remove('hidden');
        } else {
          this.elements.historicalPanel.classList.add('hidden');
        }
        console.log('[toggleHistoricalPanel] Visibility updated');
      } else {
        console.warn('[toggleHistoricalPanel] historicalPanel element found, but classList is missing');
      }
    } else {
      console.warn('[toggleHistoricalPanel] Historical panel element not found');
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
  },
  
  /**
   * Create iOS-style KPI cards when iOS mode is enabled
   * This demonstrates how the data would look in iOS-style UI
   */
  createIOSStyleCards: function() {
    console.log('[createIOSStyleCards] Creating iOS-style KPI cards');
    
    // Check if iOS style is enabled
    if (!document.body.classList.contains('ios-style')) {
      console.log('[createIOSStyleCards] iOS style not active, skipping card creation');
      return;
    }

    // Container for iOS KPI cards
    let iosCardsContainer = document.getElementById('ios-kpi-cards-container');
    
    // If container doesn't exist, create and insert it
    if (!iosCardsContainer) {
      iosCardsContainer = document.createElement('div');
      iosCardsContainer.id = 'ios-kpi-cards-container';
      iosCardsContainer.className = 'grid grid-cols-1 md:grid-cols-3 gap-6 mb-6';

      // Insert after the current metrics cards
      const currentMetricsContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-3');
      if (currentMetricsContainer) {
        currentMetricsContainer.parentNode.insertBefore(iosCardsContainer, currentMetricsContainer.nextSibling);
      } else {
        console.warn('[createIOSStyleCards] Cannot find current metrics container to insert iOS cards');
        return;
      }
    } else {
      // Clear existing cards
      iosCardsContainer.innerHTML = '';
    }
    
    // Energy KPI Card
    const energyCard = this.createIOSKPICard({
      title: 'Energy Consumption',
      value: this.elements.currentEnergyValue ? this.elements.currentEnergyValue.textContent : '-- kWh',
      icon: 'fa-bolt',
      iconColor: '#0A84FF',
      trend: {
        value: -12.5,
        text: 'vs. last week'
      }
    });
    
    // Carbon KPI Card
    const carbonCard = this.createIOSKPICard({
      title: 'Carbon Emissions',
      value: this.elements.currentCarbonValue ? this.elements.currentCarbonValue.textContent : '-- kg CO₂',
      icon: 'fa-leaf',
      iconColor: '#30D158',
      trend: {
        value: -8.2,
        text: 'vs. last week'
      }
    });
    
    // ESG Score KPI Card
    const esgScoreCard = this.createIOSKPICard({
      title: 'ESG Rating',
      value: this.elements.esgScore ? this.elements.esgScore.textContent : '--',
      icon: 'fa-star',
      iconColor: '#BF5AF2',
      trend: {
        value: 5.3,
        text: 'improvement'
      }
    });
    
    // Add cards to container
    iosCardsContainer.appendChild(energyCard);
    iosCardsContainer.appendChild(carbonCard);
    iosCardsContainer.appendChild(esgScoreCard);
    
    console.log('[createIOSStyleCards] iOS KPI cards created');
  },
  
  /**
   * Create a single iOS-style KPI card
   * @param {Object} options - Card options
   * @param {string} options.title - Card title
   * @param {string} options.value - Card value
   * @param {string} options.icon - FontAwesome icon name
   * @param {string} options.iconColor - Icon color (hex)
   * @param {Object} options.trend - Trend data
   * @param {number} options.trend.value - Trend percentage value
   * @param {string} options.trend.text - Trend text label
   * @returns {HTMLElement} - The KPI card element
   */
  createIOSKPICard: function(options) {
    const card = document.createElement('div');
    card.className = 'ios-kpi-card';
    
    // Header with icon
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-4';
    
    const titleEl = document.createElement('div');
    titleEl.className = 'title';
    titleEl.textContent = options.title;
    
    const iconEl = document.createElement('div');
    iconEl.className = 'w-10 h-10 rounded-full flex items-center justify-center';
    iconEl.style.backgroundColor = options.iconColor + '20'; // 20% opacity
    
    const icon = document.createElement('i');
    icon.className = `fas ${options.icon}`;
    icon.style.color = options.iconColor;
    
    iconEl.appendChild(icon);
    header.appendChild(titleEl);
    header.appendChild(iconEl);
    
    // Value
    const valueEl = document.createElement('div');
    valueEl.className = 'value';
    valueEl.textContent = options.value;
    
    // Trend
    const trendEl = document.createElement('div');
    trendEl.className = options.trend.value >= 0 ? 'trend positive' : 'trend negative';
    
    const trendIcon = document.createElement('i');
    trendIcon.className = `fas fa-${options.trend.value >= 0 ? 'arrow-up' : 'arrow-down'} mr-1`;
    
    const trendText = document.createElement('span');
    trendText.textContent = `${Math.abs(options.trend.value).toFixed(1)}% ${options.trend.text}`;
    
    trendEl.appendChild(trendIcon);
    trendEl.appendChild(trendText);
    
    // Assemble card
    card.appendChild(header);
    card.appendChild(valueEl);
    card.appendChild(trendEl);
    
    return card;
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Dashboard;
} 