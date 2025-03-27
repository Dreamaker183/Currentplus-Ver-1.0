/**
 * Current+ Enterprise ESG Analytics Platform
 * Main JavaScript File
 * 
 * This file handles core functionality including:
 * - ThingSpeak API data fetching
 * - UI interactions and state management
 * - Data processing and calculations
 */

// Global Configuration
const CONFIG = {
  thingspeak: {
    channelID: localStorage.getItem('thingspeak_channelID') || "YOUR_CHANNEL_ID",
    readAPIKey: localStorage.getItem('thingspeak_readAPIKey') || "YOUR_API_KEY",
    results: 100,
    fieldMap: {
      energyUsage: "field1",
      voltage: "field2",
      current: "field3"
    },
    refreshInterval: 60000,
  },
  carbonFactor: 0.71, // kg CO₂ per kWh - average grid emission factor
  dateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
  timeFormat: { hour: '2-digit', minute: '2-digit' }
};

// Application State
const APP_STATE = {
  currentData: null,
  historicalData: [],
  previousPeriodData: null,
  aiModel: null,
  aiModelLoaded: false,
  forecast: null,
  activeTimeframe: 'week',
  comparisonMode: 'previous', // previous, baseline, target
  reportOptions: {
    includePredictions: true,
    includeCharts: true,
    includeRecommendations: true
  },
  esgRating: { score: 0, grade: 'N/A' },
  aiPredictions: {
    environmentalScore: 0,
    socialScore: 0,
    governanceScore: 0,
    sustainabilityScore: 0,
    energyTrend: 0
  },
  recommendations: []
};

// DOM Elements
const DOM = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initializeDOMElements();
  setupEventListeners();
  loadSettings();
  initializeUI();
  
  // Initialize ThingSpeak connector
  initializeThingSpeak();
  
  // Make APP_STATE accessible globally for report generation
  window.APP_STATE = APP_STATE;
  window.CONFIG = CONFIG;
  
  // Try to initialize the AI model
  setTimeout(() => {
    checkAndInitializeAIModel();
  }, 1000); // Delay to ensure other scripts are loaded
  
  fetchData().then(() => {
    // Set up periodic refresh
  setInterval(fetchData, CONFIG.thingspeak.refreshInterval);
  });
});

// Initialize DOM element references
function initializeDOMElements() {
  // KPI elements
  DOM.energyUsage = document.getElementById('energyUsage');
  DOM.carbonEmissions = document.getElementById('carbonEmissions');
  DOM.aiSustainabilityScore = document.getElementById('aiSustainabilityScore');
  DOM.esgRating = document.getElementById('esgRating');
  
  // Trend indicators
  DOM.energyTrend = document.getElementById('energyTrend');
  DOM.energyChangePercent = document.getElementById('energyChangePercent');
  DOM.carbonTrend = document.getElementById('carbonTrend');
  DOM.carbonChangePercent = document.getElementById('carbonChangePercent');
  DOM.aiScoreTrend = document.getElementById('aiScoreTrend');
  DOM.aiScoreChangePercent = document.getElementById('aiScoreChangePercent');
  
  // AI predictions
  DOM.carbonForecast = document.getElementById('carbonForecast');
  DOM.carbonForecastChange = document.getElementById('carbonForecastChange');
  DOM.efficiencyScore = document.getElementById('efficiencyScore');
  DOM.efficiencyChange = document.getElementById('efficiencyChange');
  DOM.aiRecommendation = document.getElementById('aiRecommendation');
  
  // ESG report scores
  DOM.envScores = {
    1: document.getElementById('envScore1'),
    2: document.getElementById('envScore2'),
    3: document.getElementById('envScore3')
  };
  DOM.envProgress = {
    1: document.getElementById('envProgress1'),
    2: document.getElementById('envProgress2'),
    3: document.getElementById('envProgress3')
  };
  DOM.socialScores = {
    1: document.getElementById('socialScore1'),
    2: document.getElementById('socialScore2'),
    3: document.getElementById('socialScore3')
  };
  DOM.socialProgress = {
    1: document.getElementById('socialProgress1'),
    2: document.getElementById('socialProgress2'),
    3: document.getElementById('socialProgress3')
  };
  DOM.govScores = {
    1: document.getElementById('govScore1'),
    2: document.getElementById('govScore2'),
    3: document.getElementById('govScore3')
  };
  DOM.govProgress = {
    1: document.getElementById('govProgress1'),
    2: document.getElementById('govProgress2'),
    3: document.getElementById('govProgress3')
  };
  
  // Buttons and interactive elements
  DOM.refreshDataBtn = document.getElementById('refresh-data');
  DOM.generateReportBtn = document.getElementById('generateReport');
  DOM.updatePredictionsBtn = document.getElementById('update-predictions-btn');
  DOM.downloadReportPDFBtn = document.getElementById('downloadReportPDF');
  
  // Mobile menu elements
  DOM.mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  DOM.mobileMenu = document.getElementById('mobile-menu');
  DOM.mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  DOM.closeMobileMenuBtn = document.getElementById('close-mobile-menu');
  
  // Modal elements
  DOM.reportModal = document.getElementById('report-modal');
  DOM.closeModalBtn = document.getElementById('close-modal');
  DOM.cancelReportBtn = document.getElementById('cancel-report');
  DOM.confirmReportBtn = document.getElementById('confirm-report');
  DOM.includePredictionsCheck = document.getElementById('include-predictions');
  DOM.includeChartsCheck = document.getElementById('include-charts');
  DOM.includeRecommendationsCheck = document.getElementById('include-recommendations');
  
  // Loading indicator
  DOM.loadingIndicator = document.getElementById('loading-indicator');
  DOM.loadingText = document.getElementById('loading-text');
}

// Initialize ThingSpeak connector with proper settings
function initializeThingSpeak() {
  try {
    // Check if ThingSpeak connector class is available
    if (typeof ThingSpeakConnector === 'function') {
      // Check if we have valid credentials
      if (CONFIG.thingspeak.channelID && CONFIG.thingspeak.readAPIKey &&
          CONFIG.thingspeak.channelID !== "YOUR_CHANNEL_ID" && 
          CONFIG.thingspeak.readAPIKey !== "YOUR_API_KEY") {
        
        // Initialize the ThingSpeak connector
        window.thingSpeakConnector = new ThingSpeakConnector({
          debug: true,
          timeout: 20000, // 20 seconds timeout
          retryCount: 3
        });
        
        console.log('ThingSpeak connector initialized with credentials');
        
        // Make fetchThingSpeakData available globally
        window.fetchThingSpeakData = fetchThingSpeakData;
        
        // Optional: Show success message
        try {
          const successNotification = document.getElementById('success-notification');
          const notificationText = document.getElementById('notification-text');
          if (successNotification && notificationText) {
            notificationText.textContent = 'ThingSpeak connector initialized';
            successNotification.classList.remove('hidden');
            setTimeout(() => successNotification.classList.add('hidden'), 3000);
          }
        } catch (e) {
          console.warn('Error showing success notification:', e);
        }
      } else {
        console.warn('ThingSpeak configuration missing or using default values');
      }
    } else {
      console.warn('ThingSpeakConnector class not available');
    }
  } catch (error) {
    console.error('Error initializing ThingSpeak connector:', error);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Data refresh
  const refreshDataBtns = document.querySelectorAll('[id$="refresh-data"]');
  if (refreshDataBtns.length > 0) {
    refreshDataBtns.forEach(btn => {
      btn.addEventListener('click', () => {
    showLoading('Refreshing data...');
        fetchData().finally(() => hideLoading());
  });
    });
  }
  
  // Generate report
  if (DOM.generateReportBtn) {
  DOM.generateReportBtn.addEventListener('click', showReportModal);
  }
  
  // Update AI predictions
  const updatePredictionsButton = document.getElementById('update-predictions-btn') || DOM.updatePredictionsBtn;
  if (updatePredictionsButton) {
    updatePredictionsButton.addEventListener('click', () => {
    showLoading('Updating AI predictions...');
      updateAIPredictions().finally(() => hideLoading());
  });
  }
  
  // Download PDF report
  const downloadPDFButton = document.getElementById('downloadReportPDF');
  if (downloadPDFButton) {
    downloadPDFButton.addEventListener('click', () => {
      console.log("Download Report PDF button clicked");
      
      // Ensure the window.downloadReportPDF function exists
      if (typeof window.downloadReportPDF === 'function') {
        // Pass current app data to the report generator
        window.downloadReportPDF();
      } else {
        console.error("downloadReportPDF function not found!");
        showError("PDF generation functionality not available. Please refresh the page.");
      }
    });
  }
  
  // Mobile menu toggle
  const mobileMenuToggles = document.querySelectorAll('[id$="-mobile-menu-toggle"]');
  if (mobileMenuToggles.length > 0) {
    mobileMenuToggles.forEach(toggle => {
      toggle.addEventListener('click', toggleMobileMenu);
    });
  }
  if (DOM.closeMobileMenuBtn) {
  DOM.closeMobileMenuBtn.addEventListener('click', closeMobileMenu);
  }
  if (DOM.mobileMenuOverlay) {
  DOM.mobileMenuOverlay.addEventListener('click', closeMobileMenu);
  }
  
  // Report modal
  if (DOM.closeModalBtn) {
  DOM.closeModalBtn.addEventListener('click', closeReportModal);
  }
  if (DOM.cancelReportBtn) {
  DOM.cancelReportBtn.addEventListener('click', closeReportModal);
  }
  if (DOM.confirmReportBtn) {
  DOM.confirmReportBtn.addEventListener('click', handleReportGeneration);
  }
  
  // Chart timeframe buttons
  document.querySelectorAll('.energy-timeframe').forEach(btn => {
    btn.addEventListener('click', (e) => {
      setEnergyTimeframe(e.target.dataset.timeframe);
    });
  });
  
  document.querySelectorAll('.carbon-timeframe').forEach(btn => {
    btn.addEventListener('click', (e) => {
      setCarbonTimeframe(e.target.dataset.timeframe);
    });
  });
  
  // Report options checkboxes
  DOM.includePredictionsCheck.addEventListener('change', (e) => {
    APP_STATE.reportOptions.includePredictions = e.target.checked;
  });
  
  DOM.includeChartsCheck.addEventListener('change', (e) => {
    APP_STATE.reportOptions.includeCharts = e.target.checked;
  });
  
  DOM.includeRecommendationsCheck.addEventListener('change', (e) => {
    APP_STATE.reportOptions.includeRecommendations = e.target.checked;
  });
  
  // PowerBI export functionality
  const exportToPowerBIBtns = document.querySelectorAll('[id$="export-to-powerbi"]');
  if (exportToPowerBIBtns.length > 0) {
    exportToPowerBIBtns.forEach(btn => {
      btn.addEventListener('click', exportToPowerBI);
    });
  }

  // Settings save button
  const saveSettingsBtn = document.getElementById('save-settings');
  if (saveSettingsBtn) {
    console.log('[setupEventListeners] Adding event listener to save settings button');
    saveSettingsBtn.addEventListener('click', function() {
      console.log('[saveSettingsBtn] Save button clicked');
      saveSettings();
    });
  }
}

// Initialize UI elements
function initializeUI() {
  // Set initial loading state
  showLoading('Initializing dashboard...');
  
  // Set up the confidence slider value display if we're on the settings page
  const confidenceSlider = document.getElementById('ai-confidence');
  const confidenceValue = document.getElementById('confidence-value');
  
  if (confidenceSlider && confidenceValue) {
    // Initial value
    confidenceValue.textContent = `${confidenceSlider.value}%`;
    
    // Update on change
    confidenceSlider.addEventListener('input', () => {
      confidenceValue.textContent = `${confidenceSlider.value}%`;
    });
  }
  
  // Set up the clear data button
  const clearDataBtn = document.getElementById('clear-data-btn');
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', clearLocalData);
  }
  
  // Set up the export all data button
  const exportAllDataBtn = document.getElementById('export-all-data-btn');
  if (exportAllDataBtn) {
    exportAllDataBtn.addEventListener('click', exportAllData);
  }
  
  // Set up the save settings button
  const saveSettingsBtn = document.getElementById('save-settings');
  if (saveSettingsBtn) {
    console.log('[initializeUI] Setting up save settings button event listener');
    saveSettingsBtn.addEventListener('click', saveSettings);
  }
  
  // Update the last saved time display on settings page if available
  updateLastSavedTime();
}

// Load settings from localStorage
function loadSettings() {
  console.log('[loadSettings] Attempting to load settings from localStorage');
  
  try {
    const savedChannelID = localStorage.getItem('thingspeakChannelID');
    const savedAPIKey = localStorage.getItem('thingspeakAPIKey');
    const savedCarbonFactor = localStorage.getItem('carbonFactor');
    const savedRefreshInterval = localStorage.getItem('refreshInterval');
    const savedAutoRefresh = localStorage.getItem('autoRefresh');
    
    // PowerBI Settings
    const savedPowerBIEnabled = localStorage.getItem('powerbiEnabled');
    const savedPowerBIWorkspace = localStorage.getItem('powerbiWorkspace');
    const savedPowerBITemplate = localStorage.getItem('powerbiTemplate');
    const savedPowerBIAutoExport = localStorage.getItem('powerbiAutoExport');
    
    // Report Settings
    const savedCompanyName = localStorage.getItem('companyName');
    const savedIncludePredictions = localStorage.getItem('includePredictions');
    const savedIncludePowerBISection = localStorage.getItem('includePowerBISection');
    const savedReportLogo = localStorage.getItem('reportLogo');
    
    // AI Settings
    const savedEnableAI = localStorage.getItem('enableAI');
    const savedPredictionHorizon = localStorage.getItem('predictionHorizon');
    const savedAIModelVersion = localStorage.getItem('aiModelVersion');
    const savedAIConfidence = localStorage.getItem('aiConfidence');

    // Log what we found
    console.log('[loadSettings] Found ThingSpeak settings:', {
      channelID: savedChannelID ? `Found: ${savedChannelID}` : 'Not found', 
      apiKey: savedAPIKey ? `Found (${savedAPIKey.length} characters)` : 'Not found',
      refreshInterval: savedRefreshInterval ? `${savedRefreshInterval} seconds` : 'Default: 30 seconds',
      autoRefresh: savedAutoRefresh ? savedAutoRefresh : 'Default: true'
    });

    // Check if we have both required ThingSpeak credentials
    if (!savedChannelID || !savedAPIKey) {
      console.log('[loadSettings] No saved ThingSpeak credentials found');
      
      // Set demo values only for specific cases
      if (window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1' || 
          window.location.pathname.includes('demo') ||
          window.location.search.includes('demo=true')) {
        console.log('[loadSettings] Development/demo environment detected, using demo values');
        
        // Demo ThingSpeak public channel - uses public channel for demo data
        CONFIG.thingspeak.channelID = "12397";  // This is a public ThingSpeak demo channel
        CONFIG.thingspeak.readAPIKey = "JMZCM47SV93DPC0R";  // Public read key
        
        console.log('[loadSettings] Using demo ThingSpeak channel:', CONFIG.thingspeak.channelID);
        
        // If we're on settings page, fill in the demo values
        if (document.getElementById('thingspeak-channel')) {
          document.getElementById('thingspeak-channel').value = CONFIG.thingspeak.channelID;
          document.getElementById('thingspeak-api-key').value = CONFIG.thingspeak.readAPIKey;
          
          // Show debug information that we're using demo values
          showDebugInfo("Using Demo Values", 
            `Using public ThingSpeak demo channel ${CONFIG.thingspeak.channelID} for demonstration purposes. Save these or enter your own credentials.`);
        }
        
        // For clarity, pop a notification to the user
        showSuccessMessage('Using demo ThingSpeak channel for testing');
        
        return true; // Return true since we're using demo values
      }
      
      // Show error message if we're on a page that needs data
      if (document.getElementById('energyUsage') || document.getElementById('carbonEmissions')) {
        showError('ThingSpeak API credentials not configured. Please update in Settings.');
        showDebugInfo("Missing Configuration", 
          "No ThingSpeak Channel ID or API Key found in settings. Please go to the Settings page to configure your ThingSpeak connection.");
      }
      
      return false; // No settings and not in demo mode
    }

    console.log('[loadSettings] Loading saved settings into CONFIG');
    
    // Update CONFIG with saved values
    CONFIG.thingspeak.channelID = savedChannelID;
    CONFIG.thingspeak.readAPIKey = savedAPIKey;
    
    if (savedCarbonFactor) {
      CONFIG.carbonFactor = parseFloat(savedCarbonFactor);
    }
    
    if (savedRefreshInterval) {
      CONFIG.thingspeak.refreshInterval = parseInt(savedRefreshInterval) * 1000; // Convert to milliseconds
    }
    
    // Update UI elements with saved values if we're on the settings page
    if (document.getElementById('thingspeak-channel')) {
      document.getElementById('thingspeak-channel').value = savedChannelID;
      document.getElementById('thingspeak-api-key').value = savedAPIKey;
      document.getElementById('refresh-interval').value = savedRefreshInterval || '30';
      
      if (document.getElementById('auto-refresh')) {
        document.getElementById('auto-refresh').checked = savedAutoRefresh === 'true';
      }
      
      // PowerBI Settings
      if (document.getElementById('powerbi-integration')) {
        document.getElementById('powerbi-integration').checked = savedPowerBIEnabled === 'true';
      }
      
      if (document.getElementById('powerbi-workspace')) {
        document.getElementById('powerbi-workspace').value = savedPowerBIWorkspace || '';
      }
      
      if (document.getElementById('powerbi-template')) {
        document.getElementById('powerbi-template').value = savedPowerBITemplate || 'https://current-plus.example.com/templates/esg-dashboard.pbit';
      }
      
      if (document.getElementById('powerbi-auto-export')) {
        document.getElementById('powerbi-auto-export').checked = savedPowerBIAutoExport === 'true';
      }
      
      // Report Settings
      if (document.getElementById('company-name')) {
        document.getElementById('company-name').value = savedCompanyName || 'Your Organization';
      }
      
      if (document.getElementById('carbon-factor')) {
        document.getElementById('carbon-factor').value = savedCarbonFactor || '0.71';
      }
      
      if (document.getElementById('include-ai-predictions')) {
        document.getElementById('include-ai-predictions').checked = savedIncludePredictions !== 'false';
      }
      
      if (document.getElementById('include-powerbi-section')) {
        document.getElementById('include-powerbi-section').checked = savedIncludePowerBISection !== 'false';
      }
      
      if (document.getElementById('report-logo')) {
        document.getElementById('report-logo').value = savedReportLogo || '';
      }
      
      // AI Settings
      if (document.getElementById('enable-ai')) {
        document.getElementById('enable-ai').checked = savedEnableAI !== 'false';
      }
      
      if (document.getElementById('prediction-horizon')) {
        document.getElementById('prediction-horizon').value = savedPredictionHorizon || '30';
      }
      
      if (document.getElementById('ai-model-version')) {
        document.getElementById('ai-model-version').value = savedAIModelVersion || 'standard';
      }
      
      if (document.getElementById('ai-confidence')) {
        document.getElementById('ai-confidence').value = savedAIConfidence || '85';
        document.getElementById('confidence-value').textContent = `${savedAIConfidence || '85'}%`;
      }
    }
    
    console.log('[loadSettings] Settings loaded successfully');
    return true;
  } catch (error) {
    console.error('[loadSettings] Error loading settings:', error);
    showError('Error loading saved settings. Using defaults.');
    showDebugInfo("Settings Load Error", error.message);
    return false;
  }
}

// Save settings to localStorage
function saveSettings() {
  console.log('[saveSettings] Saving settings...');
  showLoading('Saving settings...');
  
  // Add saving indicator animation to the save button
  const saveButton = document.getElementById('save-settings');
  const saveIndicator = document.getElementById('save-indicator');
  
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    saveButton.classList.add('opacity-75');
  }
  
  if (saveIndicator) {
    saveIndicator.classList.remove('hidden');
    saveIndicator.classList.add('saving-pulse');
    saveIndicator.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> Saving...';
  }
  
  try {
    // API Configuration - using optional chaining and default values
    const channelIDElement = document.getElementById('thingspeak-channel');
    const apiKeyElement = document.getElementById('thingspeak-api-key');
    
    if (!channelIDElement || !apiKeyElement) {
      console.error('[saveSettings] Could not find ThingSpeak input elements');
      throw new Error('ThingSpeak configuration elements not found on this page.');
    }
    
    const channelID = channelIDElement.value.trim();
    const apiKey = apiKeyElement.value.trim();
    const refreshInterval = document.getElementById('refresh-interval')?.value || '30';
    const autoRefresh = document.getElementById('auto-refresh')?.checked || false;
    
    // Basic validation
    if (!channelID) {
      throw new Error('ThingSpeak Channel ID is required');
    }
    
    if (!apiKey) {
      throw new Error('ThingSpeak API Key is required');
    }
    
    console.log('[saveSettings] Collected ThingSpeak settings:', {
      channelID,
      apiKey: apiKey ? '(valid)' : '(empty)',
      refreshInterval,
      autoRefresh
    });
    
    // First verify if the previous settings were different
    const previousChannelID = localStorage.getItem('thingspeakChannelID');
    const previousAPIKey = localStorage.getItem('thingspeakAPIKey');
    const settingsChanged = (previousChannelID !== channelID || previousAPIKey !== apiKey);
    
    // Save to localStorage with more robust error handling
    try {
      localStorage.setItem('thingspeakChannelID', channelID);
      localStorage.setItem('thingspeakAPIKey', apiKey);
      localStorage.setItem('refreshInterval', refreshInterval);
      localStorage.setItem('autoRefresh', String(autoRefresh));
      
      // Save other settings (PowerBI, Report Configuration, AI Configuration)
      // ... existing code ...
      
      console.log('[saveSettings] Settings saved to localStorage successfully');
      
      // Verify ThingSpeak settings were actually saved
      const verifyChannelID = localStorage.getItem('thingspeakChannelID');
      const verifyApiKey = localStorage.getItem('thingspeakAPIKey');
      
      if (verifyChannelID !== channelID || verifyApiKey !== apiKey) {
        console.error('[saveSettings] Settings verification failed:', {
          channelIDSaved: verifyChannelID === channelID,
          apiKeySaved: verifyApiKey === apiKey
        });
        throw new Error('Settings were not saved correctly. Please try again.');
      }
      
    } catch (storageError) {
      console.error('[saveSettings] Error saving to localStorage:', storageError);
      throw new Error('Failed to save settings to local storage: ' + storageError.message);
    }
    
    // Update CONFIG object with new values
    CONFIG.thingspeak.channelID = channelID;
    CONFIG.thingspeak.readAPIKey = apiKey;
    CONFIG.thingspeak.refreshInterval = parseInt(refreshInterval) * 1000; // Convert to milliseconds
    CONFIG.carbonFactor = parseFloat(carbonFactor);
    
    console.log('[saveSettings] Updated CONFIG object:', {
      channelID: CONFIG.thingspeak.channelID,
      apiKey: CONFIG.thingspeak.readAPIKey ? '(set)' : '(not set)',
      refreshInterval: CONFIG.thingspeak.refreshInterval,
      carbonFactor: CONFIG.carbonFactor
    });
    
    // Add current timestamp to localStorage
    const now = new Date();
    localStorage.setItem('lastSavedTime', now.toISOString());
    updateLastSavedTime();
    
    // Show success and hide loading indicator
    hideLoading();
    showSuccessMessage('Settings saved successfully!');
    
    // If ThingSpeak settings changed, test the connection immediately
    if (settingsChanged) {
      console.log('[saveSettings] ThingSpeak settings changed, testing connection');
      setTimeout(() => {
        testThingSpeakAPI(channelID, apiKey)
          .then(result => {
            if (result.success) {
              showSuccessMessage(`Connection to ThingSpeak channel "${result.channelName}" successful!`);
              showDebugInfo("ThingSpeak Connection Test", 
                `Successfully connected to channel "${result.channelName}" with ${Object.keys(result.fields).length} field(s)`);
            } else {
              showError(`ThingSpeak Connection Error: ${result.error}`);
              showDebugInfo("ThingSpeak Connection Failed", result.error);
            }
          })
          .catch(error => {
            showError(`Failed to test ThingSpeak connection: ${error.message}`);
          });
      }, 1000);
    }
    
    // Update UI based on new settings
    if (autoRefresh && window.refreshTimer === null) {
      startAutoRefresh();
    } else if (!autoRefresh && window.refreshTimer !== null) {
      stopAutoRefresh();
    }
    
    // Reset save button and indicator after short delay
    setTimeout(() => {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i> Save Settings';
        saveButton.classList.remove('opacity-75');
      }
      
      if (saveIndicator) {
        saveIndicator.classList.remove('saving-pulse');
        saveIndicator.innerHTML = '<i class="fas fa-check-circle mr-1.5 text-green-500"></i> <span>Last saved: <span id="last-saved-time">' + now.toLocaleString() + '</span></span>';
      }
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('[saveSettings] Error saving settings:', error);
    hideLoading();
    showError('Failed to save settings: ' + error.message);
    
    // Reset save button on error
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i> Save Settings';
      saveButton.classList.remove('opacity-75');
    }
    
    if (saveIndicator) {
      saveIndicator.classList.remove('saving-pulse');
      saveIndicator.innerHTML = '<i class="fas fa-times-circle mr-1.5 text-red-500"></i> Save failed';
    }
    
    return false;
  }
}

// Fetch data from ThingSpeak
async function fetchData() {
  // Validate configuration
  if (!CONFIG.thingspeak.channelID || CONFIG.thingspeak.channelID === "YOUR_CHANNEL_ID" || 
      !CONFIG.thingspeak.readAPIKey || CONFIG.thingspeak.readAPIKey === "YOUR_API_KEY") {
    console.error("[fetchData] Missing or default ThingSpeak configuration");
    showError("ThingSpeak Channel ID or API Key not configured or using default values. Please update in Settings.");
    
    // Show debug information
    showDebugInfo("Missing ThingSpeak Configuration", 
      `Current config: Channel ID: ${CONFIG.thingspeak.channelID}, API Key: ${CONFIG.thingspeak.readAPIKey ? "Set but may be invalid" : "Not set"}`);
    
    // Load demo data instead
    return loadDemoData();
  }

  showLoading('Fetching data from ThingSpeak...');
  console.log(`[fetchData] Attempting to fetch data from ThingSpeak channel: ${CONFIG.thingspeak.channelID}`);
  
  try {
    // First test the connection with minimal data to validate API key and channel ID
    const testResult = await testThingSpeakAPI(CONFIG.thingspeak.channelID, CONFIG.thingspeak.readAPIKey);
    
    if (testResult.error) {
      throw new Error(testResult.error);
    }
    
    console.log("[fetchData] ThingSpeak connection test successful, proceeding with full data fetch");
    
    // Construct the API URL with properly encoded parameters
    const params = new URLSearchParams({
      api_key: CONFIG.thingspeak.readAPIKey,
      results: CONFIG.thingspeak.results || 100
    }).toString();
    
    const url = `https://api.thingspeak.com/channels/${encodeURIComponent(CONFIG.thingspeak.channelID)}/feeds.json?${params}`;
    console.log(`[fetchData] Making request to: ${url.replace(CONFIG.thingspeak.readAPIKey, "REDACTED")}`);
    
    // Make request with CORS mode and appropriate headers
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`ThingSpeak API Error: Channel not found (ID: ${CONFIG.thingspeak.channelID})`);
      } else if (response.status === 401) {
        throw new Error(`ThingSpeak API Error: Invalid API key`);
      } else {
        throw new Error(`ThingSpeak API Error: ${response.status} ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    console.log(`[fetchData] Response received from ThingSpeak with ${data?.feeds?.length || 0} data points`);

    if (!data || !data.feeds || data.feeds.length === 0) {
      console.warn("[fetchData] No data received from ThingSpeak or empty feeds array");
      showError("No data received from ThingSpeak. The channel might be empty or the fields might not match what we expect.");
      showDebugInfo("Empty ThingSpeak Response", "The channel exists and API key is valid, but no data was returned.");
      
      // Fall back to demo data
      return loadDemoData();
    }
    
    // Success! Process and store the data
    console.log("[fetchData] ThingSpeak data received:", data);
    
    // Store channel info for field mapping
    const channelInfo = data.channel || {};
    console.log("[fetchData] Channel info:", channelInfo);
    
    // Auto-detect field mappings if not already set
    if (!channelInfo.field1) {
      console.warn("[fetchData] No field definitions found in channel info. Using default mappings.");
    } else if (CONFIG.thingspeak.fieldMap.energyUsage === "field1" && 
          channelInfo.field1 && channelInfo.field1.toLowerCase().includes("energy")) {
      // Keep existing mapping
      console.log("[fetchData] Using existing field mapping for energy usage:", CONFIG.thingspeak.fieldMap.energyUsage);
    } else {
      // Try to find energy usage field by name
      let foundEnergyField = false;
      for (let i = 1; i <= 8; i++) {
        const fieldName = `field${i}`;
        const fieldLabel = channelInfo[fieldName];
        
        if (fieldLabel && 
            (fieldLabel.toLowerCase().includes("energy") || 
             fieldLabel.toLowerCase().includes("power") ||
             fieldLabel.toLowerCase().includes("watt"))) {
          console.log(`[fetchData] Auto-detected energy usage in ${fieldName}: ${fieldLabel}`);
          CONFIG.thingspeak.fieldMap.energyUsage = fieldName;
          foundEnergyField = true;
          break;
        }
      }
      
      if (!foundEnergyField) {
        console.warn("[fetchData] Could not auto-detect energy usage field. Using default field1.");
      }
    }
    
    // Process and store the data
    APP_STATE.historicalData = data.feeds.map(feed => {
      // Add calculated fields to make processing easier
      const energyField = CONFIG.thingspeak.fieldMap.energyUsage;
      let energyValue = parseFloat(feed[energyField]);
      
      if (isNaN(energyValue)) {
        console.warn(`[fetchData] Invalid energy value in field ${energyField}:`, feed[energyField]);
        energyValue = 0; // Use 0 as fallback for invalid values
      }
      
      return {
        ...feed, // Keep original fields
        // Add parsed values for easier access
        energy: energyValue,
        carbon: energyValue * CONFIG.carbonFactor,
        created_at: feed.created_at
      };
    }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // Ensure chronological order

    // Set current data to the most recent entry
    APP_STATE.currentData = APP_STATE.historicalData[APP_STATE.historicalData.length - 1];
    
    if (!APP_STATE.currentData) {
      console.error("[fetchData] No current data available after processing");
      showDebugInfo("Data Processing Error", "Historical data was loaded but the current data point could not be determined.");
    } else {
      console.log("[fetchData] Current data set to:", APP_STATE.currentData);
    }

    // Calculate data for trend comparison
    calculatePreviousPeriodData();
    
    // Update UI elements if they exist
    if (DOM.energyUsage) {
    updateUI();
    } else {
      console.warn("[fetchData] DOM.energyUsage not found, can't update UI");
    }
    
    // Update AI predictions if model is loaded
    if (APP_STATE.aiModelLoaded) {
      if (typeof updateAIPredictions === 'function') {
        await updateAIPredictions();
    } else {
        console.warn("[fetchData] updateAIPredictions function not available");
      }
    } else {
      console.log("[fetchData] AI model not loaded, skipping predictions");
      // If AI isn't ready, still update charts with historical data if function exists
      if (typeof updateCharts === 'function' && document.getElementById('energy-chart')) {
        updateCharts();
      }
    }

    showSuccessMessage("Data refreshed successfully");
    return APP_STATE.historicalData;
    
  } catch (error) {
    console.error("[fetchData] Error fetching data:", error);
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      showError("Network error: Could not connect to ThingSpeak. Check your internet connection.");
      showDebugInfo("Network Error", "Browser could not establish connection to ThingSpeak API. This could be due to network issues, CORS restrictions, or ThingSpeak service being unavailable.");
    } else if (error.message.includes('Timeout')) {
      showError("Request timed out. ThingSpeak server may be slow or unresponsive.");
    } else if (error.message.includes('CORS')) {
      showError("CORS error: Cross-origin request blocked. Using proxy mode.");
      // Try again with proxy mode
      return fetchDataWithProxy();
    } else {
      showError(`Failed to fetch data: ${error.message}`);
      showDebugInfo("ThingSpeak API Error", error.message);
    }
    
    // Load demo data after error
    return loadDemoData();
  } finally {
    hideLoading();
  }
}

// Test ThingSpeak API credentials without fetching full data
async function testThingSpeakAPI(channelID, apiKey) {
  console.log("[testThingSpeakAPI] Testing ThingSpeak API connection with minimal request");
  
  try {
    // Create a minimal request to verify credentials
    const testUrl = `https://api.thingspeak.com/channels/${encodeURIComponent(channelID)}/feeds.json?api_key=${apiKey}&results=1`;
    
    const response = await fetch(testUrl, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return { error: `Channel not found (ID: ${channelID})` };
      } else if (response.status === 401 || response.status === 400) {
        return { error: 'Invalid API key or you don\'t have permission to access this channel' };
      } else {
        return { error: `HTTP error: ${response.status} ${response.statusText}` };
      }
    }
    
    const data = await response.json();
    
    if (!data || !data.channel) {
      return { error: 'Invalid response from ThingSpeak API' };
    }
    
    // Check if we have field definitions
    const fieldsExist = Object.keys(data.channel).some(key => key.startsWith('field'));
    if (!fieldsExist) {
      return { error: 'Channel exists, but no field definitions found' };
    }
    
    // Test successful, return channel info
    return { 
      success: true, 
      channelName: data.channel.name || 'Unnamed Channel',
      fields: Object.keys(data.channel)
        .filter(key => key.startsWith('field'))
        .reduce((obj, key) => {
          obj[key] = data.channel[key];
          return obj;
        }, {})
    };
    
  } catch (error) {
    console.error("[testThingSpeakAPI] Test failed:", error);
    return { error: error.message };
  }
}

// Fallback to fetch ThingSpeak data through a proxy to avoid CORS
async function fetchDataWithProxy() {
  showLoading('Fetching data via proxy...');
  console.log("[fetchDataWithProxy] Attempting to fetch data through CORS proxy");
  
  try {
    // Use a CORS proxy service
    // Note: This is for development only. For production, set up your own proxy or ensure proper CORS headers
    const proxyUrl = "https://cors-anywhere.herokuapp.com/";
    const targetUrl = `https://api.thingspeak.com/channels/${encodeURIComponent(CONFIG.thingspeak.channelID)}/feeds.json?api_key=${CONFIG.thingspeak.readAPIKey}&results=${CONFIG.thingspeak.results || 100}`;
    
    const response = await fetch(proxyUrl + targetUrl, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': window.location.origin,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Process data the same way as the main fetchData function
    if (!data || !data.feeds || data.feeds.length === 0) {
      throw new Error("No data received from ThingSpeak via proxy");
    }
    
    // Process data (simplified version of what's in fetchData)
    APP_STATE.historicalData = data.feeds.map(feed => ({
      ...feed,
      energy: parseFloat(feed[CONFIG.thingspeak.fieldMap.energyUsage]) || 0,
      carbon: (parseFloat(feed[CONFIG.thingspeak.fieldMap.energyUsage]) || 0) * CONFIG.carbonFactor,
      created_at: feed.created_at
    })).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    APP_STATE.currentData = APP_STATE.historicalData[APP_STATE.historicalData.length - 1];
    calculatePreviousPeriodData();
    updateUI();
    
    showSuccessMessage("Data fetched via proxy successfully");
    return APP_STATE.historicalData;
    
  } catch (error) {
    console.error("[fetchDataWithProxy] Error fetching data via proxy:", error);
    showError("Failed to fetch data via proxy: " + error.message);
    // Fall back to demo data after all fetch methods have failed
    return loadDemoData();
  } finally {
    hideLoading();
  }
}

// Load demo data when ThingSpeak is not available
function loadDemoData() {
  console.log("[loadDemoData] Loading sample data for demonstration");
  showLoading('Loading demo data...');
  
  try {
    // Generate sample data
    const demoData = generateDemoData();
    
    // Update application state
    APP_STATE.historicalData = demoData;
    APP_STATE.currentData = demoData[demoData.length - 1];
    
    // Calculate data for trend comparison
    calculatePreviousPeriodData();
    
    // Update UI elements
    if (DOM.energyUsage) {
      updateUI();
    }
    
    // Update charts if function exists
    if (typeof updateCharts === 'function' && document.getElementById('energy-chart')) {
      updateCharts();
    }
    
    showSuccessMessage("Demo data loaded successfully");
    return demoData;
  } catch (error) {
    console.error("[loadDemoData] Error loading demo data:", error);
    showError("Failed to load demo data: " + error.message);
    return [];
  } finally {
    hideLoading();
  }
}

// Generate sample data for demo purposes
function generateDemoData() {
  console.log("[generateDemoData] Creating sample data points");
  const demoData = [];
  const now = new Date();
  
  // Generate 100 data points with a realistic pattern
  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(now.getTime() - ((100 - i) * 15 * 60 * 1000)); // 15 minute intervals
    
    // Create a realistic energy usage pattern with daily cycle
    const hour = timestamp.getHours();
    const baseUsage = 30 + (hour >= 8 && hour <= 20 ? 20 : 5); // Higher during day
    const randomFactor = Math.random() * 10 - 5; // Random variation
    const energyUsage = baseUsage + randomFactor;
    
    demoData.push({
      created_at: timestamp.toISOString(),
      entry_id: i + 1,
      field1: energyUsage.toFixed(2),
      field2: (220 + (Math.random() * 10 - 5)).toFixed(2), // Voltage
      field3: ((energyUsage / 220) * (0.9 + Math.random() * 0.2)).toFixed(3), // Current
      energy: energyUsage,
      carbon: energyUsage * CONFIG.carbonFactor
    });
  }
  
  return demoData;
}

// Calculate previous period data for trend comparison
function calculatePreviousPeriodData() {
  if (APP_STATE.historicalData.length === 0) return;
  
  // Split the historical data in half
  const halfIndex = Math.floor(APP_STATE.historicalData.length / 2);
  
  // Current period is the latter half
  const currentPeriod = APP_STATE.historicalData.slice(halfIndex);
  
  // Previous period is the first half
  const previousPeriod = APP_STATE.historicalData.slice(0, halfIndex);
  
  // Calculate averages for both periods
  const currentAvg = {
    energyUsage: calculateAverage(currentPeriod, CONFIG.thingspeak.fieldMap.energyUsage),
    voltage: calculateAverage(currentPeriod, CONFIG.thingspeak.fieldMap.voltage),
    current: calculateAverage(currentPeriod, CONFIG.thingspeak.fieldMap.current)
  };
  
  const previousAvg = {
    energyUsage: calculateAverage(previousPeriod, CONFIG.thingspeak.fieldMap.energyUsage),
    voltage: calculateAverage(previousPeriod, CONFIG.thingspeak.fieldMap.voltage),
    current: calculateAverage(previousPeriod, CONFIG.thingspeak.fieldMap.current)
  };
  
  APP_STATE.previousPeriodData = {
    currentAvg,
    previousAvg
  };
}

// Calculate average for a specific field in data array
function calculateAverage(data, field) {
  if (data.length === 0) return 0;
  
  const sum = data.reduce((acc, item) => {
    const value = parseFloat(item[field]) || 0;
    return acc + value;
  }, 0);
  
  return sum / data.length;
}

// Update UI with data
function updateUI() {
  if (!APP_STATE.currentData) return;
  
  // Get data values
  const energyUsage = parseFloat(APP_STATE.currentData[CONFIG.thingspeak.fieldMap.energyUsage]) || 0;
  const carbonEmissions = (energyUsage * CONFIG.carbonFactor).toFixed(2);
  
  // Update KPI displays if they exist
  if (DOM.energyUsage) {
  DOM.energyUsage.textContent = energyUsage.toFixed(2);
  }
  
  if (DOM.carbonEmissions) {
  DOM.carbonEmissions.textContent = carbonEmissions;
  }
  
  // Update ESG Rating if element exists
  if (DOM.esgRating) {
  setESGRating(calculateESGRating(energyUsage, carbonEmissions));
  }
  
  // Update trends if previous period data is available and elements exist
  if (APP_STATE.previousPeriodData && DOM.energyTrend && DOM.carbonTrend) {
    updateTrends();
  }
  
  // Update ESG scores if elements exist
  if (DOM.envScores && DOM.envProgress) {
  updateESGScores();
  }
  
  // Update last data refresh time on settings page
  const lastDataRefresh = document.getElementById('last-data-refresh');
  if (lastDataRefresh) {
    lastDataRefresh.textContent = new Date().toLocaleString();
  }
}

// Calculate ESG Rating based on energy usage and carbon emissions
function calculateESGRating(energyUsage, carbonEmissions) {
  // A simple algorithm for demonstration purposes
  // In reality, this would be a complex calculation based on industry standards
  // and multiple factors
  
  // Lower energy usage and emissions = higher rating
  const maxEnergyUsage = 100; // Adjust based on expected range
  const maxEmissions = 100; // Adjust based on expected range
  
  // Normalize values to 0-1 range (inverted so lower is better)
  const normalizedEnergy = 1 - Math.min(energyUsage / maxEnergyUsage, 1);
  const normalizedEmissions = 1 - Math.min(carbonEmissions / maxEmissions, 1);
  
  // Weighted score (more weight on emissions)
  const weightedScore = (normalizedEnergy * 0.4) + (normalizedEmissions * 0.6);
  
  // Convert to letter rating
  const ratings = ['D', 'C', 'B', 'A', 'A+'];
  const ratingIndex = Math.min(Math.floor(weightedScore * 5), 4);
  
  return ratings[ratingIndex];
}

// Set ESG rating with appropriate styling
function setESGRating(rating) {
  if (!DOM.esgRating) return;
  
  DOM.esgRating.textContent = rating;
  
  // Apply color based on rating
  DOM.esgRating.className = 'text-3xl font-bold mt-2';
  
  switch(rating) {
    case 'A+':
      DOM.esgRating.classList.add('text-green-400');
      break;
    case 'A':
      DOM.esgRating.classList.add('text-green-500');
      break;
    case 'B':
      DOM.esgRating.classList.add('text-blue-400');
      break;
    case 'C':
      DOM.esgRating.classList.add('text-yellow-400');
      break;
    case 'D':
      DOM.esgRating.classList.add('text-red-400');
      break;
    default:
      DOM.esgRating.classList.add('text-blue-400');
  }
}

// Update trend indicators
function updateTrends() {
  if (!APP_STATE.previousPeriodData) return;
  if (!DOM.energyTrend || !DOM.carbonTrend) return;
  
  const { currentAvg, previousAvg } = APP_STATE.previousPeriodData;
  
  // Energy usage trend
  const energyChange = calculatePercentChange(currentAvg.energyUsage, previousAvg.energyUsage);
  if (DOM.energyTrend && DOM.energyChangePercent) {
  updateTrendIndicator(DOM.energyTrend, DOM.energyChangePercent, energyChange, false);
  }
  
  // Carbon emissions trend
  const carbonChange = calculatePercentChange(
    currentAvg.energyUsage * CONFIG.carbonFactor, 
    previousAvg.energyUsage * CONFIG.carbonFactor
  );
  if (DOM.carbonTrend && DOM.carbonChangePercent) {
  updateTrendIndicator(DOM.carbonTrend, DOM.carbonChangePercent, carbonChange, false);
  }
  
  // AI Score trend - will be updated by AI model if elements exist
  if (DOM.aiScoreTrend && DOM.aiScoreChangePercent && APP_STATE.aiModelLoaded) {
    // This will be handled by the AI model functions when they're called
    console.log('AI model will update score trends if loaded');
  }
}

// Calculate percent change between two values
function calculatePercentChange(current, previous) {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

// Update trend indicator with appropriate styling
function updateTrendIndicator(trendElement, percentElement, percentChange, higherIsBetter = true) {
  const formattedChange = Math.abs(percentChange).toFixed(1) + '%';
  percentElement.textContent = formattedChange;
  
  // Reset classes
  trendElement.className = 'flex items-center text-sm';
  
  // Apply appropriate styling based on trend direction and whether higher is better
  if (percentChange > 0) {
    if (higherIsBetter) {
      trendElement.classList.add('text-success-500');
      trendElement.innerHTML = `<i class="fa-solid fa-arrow-up mr-1"></i><span>${formattedChange}</span>`;
    } else {
      trendElement.classList.add('text-danger-500');
      trendElement.innerHTML = `<i class="fa-solid fa-arrow-up mr-1"></i><span>${formattedChange}</span>`;
    }
  } else if (percentChange < 0) {
    if (higherIsBetter) {
      trendElement.classList.add('text-danger-500');
      trendElement.innerHTML = `<i class="fa-solid fa-arrow-down mr-1"></i><span>${formattedChange}</span>`;
    } else {
      trendElement.classList.add('text-success-500');
      trendElement.innerHTML = `<i class="fa-solid fa-arrow-down mr-1"></i><span>${formattedChange}</span>`;
    }
  } else {
    trendElement.classList.add('text-gray-400');
    trendElement.innerHTML = `<i class="fa-solid fa-minus mr-1"></i><span>${formattedChange}</span>`;
  }
}

// Update ESG scores
function updateESGScores() {
  // Environmental scores
  setScoreAndProgress(DOM.envScores[1], DOM.envProgress[1], getRandomScore(60, 85));
  setScoreAndProgress(DOM.envScores[2], DOM.envProgress[2], getRandomScore(50, 75));
  setScoreAndProgress(DOM.envScores[3], DOM.envProgress[3], getRandomScore(20, 40));
  
  // Social scores
  setScoreAndProgress(DOM.socialScores[1], DOM.socialProgress[1], getRandomScore(70, 90));
  setScoreAndProgress(DOM.socialScores[2], DOM.socialProgress[2], getRandomScore(65, 85));
  setScoreAndProgress(DOM.socialScores[3], DOM.socialProgress[3], getRandomScore(75, 95));
  
  // Governance scores
  setScoreAndProgress(DOM.govScores[1], DOM.govProgress[1], getRandomScore(60, 80));
  setScoreAndProgress(DOM.govScores[2], DOM.govProgress[2], getRandomScore(70, 90));
  setScoreAndProgress(DOM.govScores[3], DOM.govProgress[3], getRandomScore(65, 85));
}

// Set score text and progress bar
function setScoreAndProgress(scoreElement, progressElement, score) {
  scoreElement.textContent = score + '/100';
  progressElement.style.width = score + '%';
}

// Get a random score within a range
function getRandomScore(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Show report generation modal
function showReportModal() {
  DOM.reportModal.classList.remove('hidden');
}

// Close report generation modal
function closeReportModal() {
  DOM.reportModal.classList.add('hidden');
}

// Handle report generation from modal
async function handleReportGeneration() {
  const options = {
    includePredictions: DOM.includePredictionsCheck?.checked || false,
    includeCharts: DOM.includeChartsCheck?.checked || false,
    includeRecommendations: DOM.includeRecommendationsCheck?.checked || false,
  };
  
  closeReportModal(); // Close modal before starting generation
  
  // Ensure the window.generateESGReport function exists
  if (typeof window.generateESGReport === 'function') {
    try {
      await window.generateESGReport(options);
    } catch (error) {
      console.error("Error generating report:", error);
      showError(`Failed to generate report: ${error.message}`);
    }
  } else {
    console.error("generateESGReport function not found!");
    showError("Report generation functionality not available. Please refresh the page.");
  }
}

// Toggle mobile menu
function toggleMobileMenu() {
  if (DOM.mobileMenu.classList.contains('-translate-x-full')) {
    DOM.mobileMenu.classList.remove('-translate-x-full');
  } else {
    DOM.mobileMenu.classList.add('-translate-x-full');
  }
}

// Close mobile menu
function closeMobileMenu() {
  DOM.mobileMenu.classList.add('-translate-x-full');
}

// Show loading indicator
function showLoading(text = 'Loading...') {
  const loadingIndicator = document.getElementById('loading-indicator');
  const loadingText = document.getElementById('loading-text');
  
  if (loadingIndicator && loadingText) {
    loadingText.textContent = text;
    loadingIndicator.classList.remove('hidden');
  } else {
    console.log('Loading:', text); // Fallback if elements don't exist
  }
}

// Hide loading indicator
function hideLoading() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.classList.add('hidden');
  }
}

// Show error message
function showError(message) {
  console.error(message);
  
  const notification = document.getElementById('error-notification');
  const errorText = document.getElementById('error-text');
  
  if (notification && errorText) {
    errorText.textContent = message;
    notification.classList.remove('hidden');
    
    // Hide after 5 seconds
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 5000);
  } else {
    // Fallback if elements don't exist
    console.error('Error:', message);
    alert(message); // Only as a last resort
  }
}

// Show success message
function showSuccessMessage(message) {
  console.log('Success:', message);
  
  const notification = document.getElementById('success-notification');
  const notificationText = document.getElementById('notification-text');
  
  if (notification && notificationText) {
    notificationText.textContent = message;
    notification.classList.remove('hidden');
    
    // Hide after 3 seconds
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 3000);
  }
}

// Helper function: update AI predictions
async function updateAIPredictions() {
  try {
  if (typeof predictESGImpact === 'function') {
    await predictESGImpact();
    } else {
      console.warn('AI prediction function not available');
      showError('Failed to load AI model: prediction function not found');
      APP_STATE.aiModelLoaded = false;
      
      // Set some default values for UI elements that depend on AI predictions
      if (DOM.aiSustainabilityScore) {
        DOM.aiSustainabilityScore.textContent = 'N/A';
      }
      
      if (DOM.aiRecommendation) {
        DOM.aiRecommendation.textContent = 'AI model not loaded. Using historical data only.';
      }
    }
  } catch (error) {
    console.error('Error updating AI predictions:', error);
    showError('Failed to update AI predictions: ' + error.message);
    APP_STATE.aiModelLoaded = false;
  }
}

// Check if AI model is loaded and initialize it if needed
function checkAndInitializeAIModel() {
  try {
    console.log('Checking AI model status...');
    
    // Check if the AI module is loaded
    if (typeof initializeESGModel === 'function') {
      console.log('AI model module found, initializing...');
      
      showLoading('Initializing AI model...');
      
      // Try to initialize the model
      initializeESGModel()
        .then(() => {
          console.log('AI model initialized successfully');
          APP_STATE.aiModelLoaded = true;
          hideLoading();
          showSuccessMessage('AI model loaded successfully');
          
          // Update predictions with the newly loaded model
          updateAIPredictions();
        })
        .catch(error => {
          console.error('Error initializing AI model:', error);
          APP_STATE.aiModelLoaded = false;
          hideLoading();
          showError('Failed to initialize AI model: ' + error.message);
        });
    } else {
      console.warn('AI model initialization function not found');
      APP_STATE.aiModelLoaded = false;
      
      // Provide fallback data for UI elements
      if (DOM.aiSustainabilityScore) {
        DOM.aiSustainabilityScore.textContent = 'N/A';
      }
    }
  } catch (error) {
    console.error('Error checking AI model:', error);
    APP_STATE.aiModelLoaded = false;
  }
}

/**
 * Exports ESG data to PowerBI-compatible format
 * This function collects all relevant data and exports it as a JSON file
 * that can be imported into Microsoft PowerBI
 */
function exportToPowerBI() {
    console.log('[exportToPowerBI] Starting PowerBI data export');
    
    try {
        showLoading('Preparing PowerBI Export...');
        
        // Check if we have historical data to export
        if (!window.energyData || window.energyData.length === 0) {
            throw new Error("No historical data available to export. Please refresh data first.");
        }
        
        // Prepare data for export in a structured format
        const powerBIData = {
            metadata: {
                organization: "Your Organization",
                exportDate: new Date().toISOString(),
                dataSource: "Current+ ESG Analytics Platform",
                version: "1.0"
            },
            energyData: window.energyData.map(item => ({
                timestamp: item.timestamp,
                value: parseFloat(item.value),
                unit: "kWh"
            })),
            carbonData: window.carbonData.map(item => ({
                timestamp: item.timestamp,
                value: parseFloat(item.value),
                unit: "kg CO2e"
            })),
            esgScores: {
                overall: document.getElementById('esgRating').innerText.trim(),
                environmental: parseFloat(document.getElementById('envScore').innerText) || 0,
                social: parseFloat(document.getElementById('socialScore').innerText) || 0,
                governance: parseFloat(document.getElementById('govScore').innerText) || 0
            },
            forecasts: {
                energyForecast: window.energyForecastData || [],
                carbonForecast: window.carbonForecastData || []
            },
            recommendations: [
                {
                    title: "Optimize HVAC Systems",
                    description: "Reduce energy consumption by optimizing HVAC operating hours",
                    potentialSavings: "8-12%",
                    implementationDifficulty: "Medium"
                },
                {
                    title: "Renewable Energy Integration",
                    description: "Implement on-site renewable energy solutions",
                    potentialSavings: "20-30%",
                    implementationDifficulty: "High"
                },
                {
                    title: "Employee Engagement Program",
                    description: "Launch sustainability awareness programs for employees",
                    potentialSavings: "3-5%",
                    implementationDifficulty: "Low"
                }
            ]
        };
        
        // Convert to JSON string
        const jsonData = JSON.stringify(powerBIData, null, 2);
        
        // Create downloadable blob
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link and trigger click
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `Current_ESG_PowerBI_Export_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Release the blob URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        // Show success message
        hideLoading();
        showSuccessMessage('Data exported for PowerBI successfully!');
        
        // Show modal with instructions for importing to PowerBI
        showPowerBIInstructionsModal();
        
        console.log('[exportToPowerBI] Data export completed successfully');
        return true;
    } catch (error) {
        console.error('[exportToPowerBI] Error exporting data:', error);
        hideLoading();
        showError('Failed to export data: ' + error.message);
      return false;
    }
}

/**
 * Shows a modal with instructions for importing data to PowerBI
 */
function showPowerBIInstructionsModal() {
    // Create modal element if it doesn't exist
    let modal = document.getElementById('powerbi-instructions-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'powerbi-instructions-modal';
        modal.className = 'fixed inset-0 bg-dark-900 bg-opacity-80 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-dark-800 rounded-lg p-6 max-w-md powerbi-modal">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold">Import Data into PowerBI</h3>
                    <button id="close-powerbi-modal" class="text-gray-400 hover:text-white">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                
                <p class="mb-4">Follow these steps to import your exported data into Microsoft PowerBI:</p>
                
                <ol class="steps">
                    <li>Open <strong>PowerBI Desktop</strong> application</li>
                    <li>Click <strong>Home</strong> tab > <strong>Get Data</strong> > <strong>JSON</strong></li>
                    <li>Browse to locate the downloaded JSON file</li>
                    <li>In the Navigator window, select the data structure and click <strong>Load</strong></li>
                    <li>Create reports by dragging fields to the report canvas</li>
                </ol>
                
                <div class="tip mt-4">
                    <p class="text-sm"><strong>Pro Tip:</strong> Download our PowerBI template file for pre-built ESG dashboards from the Current+ resource portal.</p>
                </div>
                
                <div class="mt-6 flex justify-end">
                    <button id="got-it-powerbi" class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
                        Got it!
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners to close the modal
        document.getElementById('close-powerbi-modal').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        document.getElementById('got-it-powerbi').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    } else {
        // Show existing modal
        modal.classList.remove('hidden');
    }
}

/**
 * Update the last saved time display
 */
function updateLastSavedTime() {
  const lastSavedElement = document.getElementById('last-saved-time');
  if (lastSavedElement) {
    const lastSavedTime = localStorage.getItem('lastSavedTime');
    if (lastSavedTime) {
      lastSavedElement.textContent = new Date(lastSavedTime).toLocaleString();
    } else {
      lastSavedElement.textContent = 'Never';
    }
  }
}

/**
 * Clear all local data
 */
function clearLocalData() {
  if (confirm('Are you sure you want to clear all local data? This will reset all settings and remove saved data.')) {
    showLoading('Clearing data...');
    setTimeout(() => {
      try {
        localStorage.clear();
        hideLoading();
        showSuccessMessage('All local data cleared successfully!');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        hideLoading();
        showError('Failed to clear data: ' + error.message);
      }
    }, 500);
  }
}

/**
 * Export all data to a JSON file
 */
function exportAllData() {
  showLoading('Preparing data export...');
  setTimeout(() => {
    try {
      const exportData = {
        settings: {},
        data: {
          energyData: window.energyData || [],
          carbonData: window.carbonData || [],
          historicalData: window.APP_STATE?.historicalData || [],
          forecast: window.APP_STATE?.forecast || {}
        },
        exportDate: new Date().toISOString(),
        version: '1.2.4'
      };
      
      // Get all settings from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== 'historicalData' && key !== 'forecast') {
          exportData.settings[key] = localStorage.getItem(key);
        }
      }
      
      // Convert to JSON and create download
      const jsonData = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `Current_ESG_Data_Export_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      hideLoading();
      showSuccessMessage('Data exported successfully!');
    } catch (error) {
      hideLoading();
      showError('Failed to export data: ' + error.message);
    }
  }, 500);
}

// Show debug information in a panel for troubleshooting
function showDebugInfo(title, message) {
  console.log(`[DEBUG] ${title}: ${message}`);
  
  // Check if debug panel exists, create if not
  let debugPanel = document.getElementById('debug-panel');
  
  if (!debugPanel) {
    // Create the debug panel
    debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.position = 'fixed';
    debugPanel.style.top = '20px';
    debugPanel.style.right = '20px';
    debugPanel.style.padding = '15px';
    debugPanel.style.background = '#1E293B';
    debugPanel.style.border = '1px solid #4B5563';
    debugPanel.style.borderRadius = '6px';
    debugPanel.style.color = '#E5E7EB';
    debugPanel.style.fontSize = '14px';
    debugPanel.style.width = '400px';
    debugPanel.style.maxHeight = '80vh';
    debugPanel.style.overflowY = 'auto';
    debugPanel.style.zIndex = '9999';
    debugPanel.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '5px';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = '#F8FAFC';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => debugPanel.style.display = 'none';
    
    debugPanel.appendChild(closeButton);
    
    // Add header
    const header = document.createElement('h3');
    header.textContent = 'ThingSpeak Debug Info';
    header.style.margin = '0 0 15px 0';
    header.style.fontWeight = 'bold';
    header.style.fontSize = '16px';
    debugPanel.appendChild(header);
    
    // Add content container
    const content = document.createElement('div');
    content.id = 'debug-content';
    debugPanel.appendChild(content);
    
    // Add to body
    document.body.appendChild(debugPanel);
  }
  
  // Update content
  const contentDiv = document.getElementById('debug-content');
  if (contentDiv) {
    const entry = document.createElement('div');
    entry.style.marginBottom = '15px';
    entry.style.padding = '10px';
    entry.style.background = '#171E2E';
    entry.style.borderRadius = '4px';
    
    const titleEl = document.createElement('h4');
    titleEl.textContent = title;
    titleEl.style.margin = '0 0 8px 0';
    titleEl.style.fontSize = '15px';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.color = '#E0E7FF';
    
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.margin = '0';
    messageEl.style.fontSize = '13px';
    messageEl.style.color = '#D1D5DB';
    
    entry.appendChild(titleEl);
    entry.appendChild(messageEl);
    
    // Add timestamp
    const timestamp = document.createElement('div');
    timestamp.textContent = new Date().toLocaleTimeString();
    timestamp.style.marginTop = '5px';
    timestamp.style.fontSize = '12px';
    timestamp.style.color = '#94A3B8';
    entry.appendChild(timestamp);
    
    contentDiv.prepend(entry); // Add newest at top
    
    // Show the panel if hidden
    debugPanel.style.display = 'block';
  }
}

// Global error handler to catch and handle various errors
(function setupGlobalErrorHandler() {
    window.addEventListener('error', function(event) {
        console.error('Global error caught:', event.error);
        
        // Handle null reference errors specifically
        if (event.error && event.error.message && 
            (event.error.message.includes('null') || 
             event.error.message.includes('undefined'))) {
            
            console.error('Null reference error caught:', event.error.message);
            
            // Try to show a friendly error message if notification elements exist
            try {
                const errorNotification = document.getElementById('error-notification');
                const errorText = document.getElementById('error-text');
                
                if (errorNotification && errorText) {
                    errorText.textContent = 'An error occurred. The application will continue to function.';
                    errorNotification.classList.remove('hidden');
                    
                    setTimeout(function() {
                        errorNotification.classList.add('hidden');
                    }, 5000);
                }
            } catch (e) {
                console.error('Failed to show error notification:', e);
            }
            
            // Prevent the default error handling to keep the app running
            event.preventDefault();
      return true;
        }
        
        return false;
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        
        // Try to show a friendly error message
        try {
            const errorNotification = document.getElementById('error-notification');
            const errorText = document.getElementById('error-text');
            
            if (errorNotification && errorText) {
                errorText.textContent = 'A background operation failed. The application will continue to function.';
                errorNotification.classList.remove('hidden');
                
                setTimeout(function() {
                    errorNotification.classList.add('hidden');
                }, 5000);
            }
        } catch (e) {
            console.error('Failed to show error notification:', e);
        }
        
        // Prevent the default error handling
        event.preventDefault();
    });
})();

// Create a safe DOM utility if it doesn't exist yet
if (!window.domSafe) {
    window.domSafe = {
        getElement: function(id, logError = true) {
            if (!id) return null;
            
            const element = document.getElementById(id);
            
            if (!element && logError) {
                console.warn(`DOM element not found: #${id}`);
            }
            
            return element;
        },
        
        setText: function(id, text) {
            const element = this.getElement(id);
            if (!element) return false;
            
            try {
                element.textContent = text;
                return true;
            } catch (e) {
                console.warn(`Error setting text for #${id}:`, e);
                return false;
            }
        },
        
        setHTML: function(id, html) {
            const element = this.getElement(id);
            if (!element) return false;
            
            try {
                element.innerHTML = html;
                return true;
            } catch (e) {
                console.warn(`Error setting HTML for #${id}:`, e);
                return false;
            }
        },
        
        toggleClass: function(id, className, force) {
            const element = this.getElement(id);
            if (!element) return false;
            
            try {
                if (typeof force === 'boolean') {
                    if (force) {
                        element.classList.add(className);
    } else {
                        element.classList.remove(className);
                    }
                } else {
                    element.classList.toggle(className);
                }
                return true;
            } catch (e) {
                console.warn(`Error toggling class for #${id}:`, e);
      return false;
    }
        },
        
        getValue: function(id, defaultValue = '') {
            const element = this.getElement(id);
            if (!element) return defaultValue;
            
            try {
                return element.value;
            } catch (e) {
                console.warn(`Error getting value for #${id}:`, e);
                return defaultValue;
            }
        },
        
        setValue: function(id, value) {
            const element = this.getElement(id);
            if (!element) return false;
            
            try {
                element.value = value;
                return true;
            } catch (e) {
                console.warn(`Error setting value for #${id}:`, e);
    return false;
            }
        }
    };
}

// Application initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Current+ Enterprise ESG Analytics initialized');
    
    // Check for required utilities
    if (!window.thingSpeakHelper) {
        console.warn('ThingSpeak helper not loaded. Some features may not work properly.');
    }
    
    if (!window.aiModelFallback) {
        console.warn('AI model fallback not loaded. Redundancy features will not be available.');
    }
    
    // Initialize dark mode from settings
    try {
        const settings = JSON.parse(localStorage.getItem('thingSpeakSettings') || '{}');
        const darkMode = settings.darkMode !== undefined ? settings.darkMode : true;
        
        if (!darkMode) {
            document.body.classList.remove('bg-gray-950');
            document.body.classList.add('bg-gray-100');
            document.body.classList.add('text-gray-900');
        }
    } catch (e) {
        console.warn('Error initializing dark mode:', e);
    }
});

/**
 * Get ThingSpeak settings from localStorage
 * @returns {Object} ThingSpeak settings
 */
function getThingSpeakSettings() {
    try {
        const settingsJSON = localStorage.getItem('thingSpeakSettings');
        return settingsJSON ? JSON.parse(settingsJSON) : {};
    } catch (error) {
        console.error('Error loading ThingSpeak settings:', error);
        return {};
    }
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleString();
    } catch (error) {
        console.warn('Error formatting date:', error);
        return dateString || 'Unknown date';
    }
}

/**
 * Safely fetch data from ThingSpeak
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - ThingSpeak data
 */
async function fetchThingSpeakData(options = {}) {
    // Use ThingSpeak helper if available
    if (window.thingSpeakHelper) {
        return new Promise((resolve, reject) => {
            window.thingSpeakHelper.fetchData({
                ...options,
                onSuccess: resolve,
                onError: reject
            });
        });
    }
    
    // Fallback manual implementation
    const settings = getThingSpeakSettings();
    const channelId = options.channelId || settings.channelId;
    const apiKey = options.apiKey || settings.apiKey;
    const results = options.results || settings.resultsToFetch || 100;
    
    if (!channelId || !apiKey) {
        throw new Error('Channel ID and API Key are required');
    }
    
    // Show loading if possible
    try {
        const loadingIndicator = document.getElementById('loading-indicator');
        const loadingText = document.getElementById('loading-text');
        
        if (loadingIndicator && loadingText) {
            loadingText.textContent = 'Fetching data from ThingSpeak...';
            loadingIndicator.classList.remove('hidden');
        }
    } catch (e) {
        console.warn('Error showing loading indicator:', e);
    }
    
    try {
        const url = `https://api.thingspeak.com/channels/${encodeURIComponent(channelId)}/feeds.json?api_key=${apiKey}&results=${results}`;
        
        const response = await fetch(url, {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        // Hide loading if possible
        try {
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.classList.add('hidden');
            }
        } catch (e) {
            console.warn('Error hiding loading indicator:', e);
        }
        
        if (!response.ok) {
            let errorMessage = `HTTP error: ${response.status}`;
            
            if (response.status === 404) {
                errorMessage = `Channel not found (ID: ${channelId})`;
            } else if (response.status === 401) {
                errorMessage = 'Invalid API key or insufficient permissions';
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        if (!data || !data.channel) {
            throw new Error('Invalid response from ThingSpeak API');
        }
        
        return data;
    } catch (error) {
        // Hide loading if possible
        try {
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.classList.add('hidden');
            }
        } catch (e) {
            console.warn('Error hiding loading indicator:', e);
        }
        
        // Show error if possible
        try {
            const errorNotification = document.getElementById('error-notification');
            const errorText = document.getElementById('error-text');
            
            if (errorNotification && errorText) {
                errorText.textContent = `ThingSpeak API Error: ${error.message}`;
                errorNotification.classList.remove('hidden');
                
                setTimeout(function() {
                    errorNotification.classList.add('hidden');
                }, 5000);
            }
        } catch (e) {
            console.warn('Error showing error notification:', e);
        }
        
        throw error;
  }
} 