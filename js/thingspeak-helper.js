/**
 * ThingSpeak Helper - A safer way to interact with ThingSpeak API
 * This prevents "Cannot read properties of null (reading 'style')" errors
 */

class ThingSpeakHelper {
  constructor() {
    this.loadingElement = null;
    this.loadingTextElement = null;
    this.errorNotificationElement = null;
    this.errorTextElement = null;
    this.successNotificationElement = null;
    this.successTextElement = null;
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => this.initializeElements());
    
    // Failsafe: If the DOM is already loaded, initialize elements now
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(() => this.initializeElements(), 0);
    }
  }
  
  /**
   * Initialize references to DOM elements
   */
  initializeElements() {
    // Use the safe DOM methods from our error handler if available
    if (window.domSafe) {
      this.loadingElement = window.domSafe.getElement('loading-indicator');
      this.loadingTextElement = window.domSafe.getElement('loading-text');
      this.errorNotificationElement = window.domSafe.getElement('error-notification');
      this.errorTextElement = window.domSafe.getElement('error-text');
      this.successNotificationElement = window.domSafe.getElement('success-notification');
      this.successTextElement = window.domSafe.getElement('notification-text');
    } else {
      // Fallback to standard method with null checks
      this.loadingElement = document.getElementById('loading-indicator');
      this.loadingTextElement = document.getElementById('loading-text');
      this.errorNotificationElement = document.getElementById('error-notification');
      this.errorTextElement = document.getElementById('error-text');
      this.successNotificationElement = document.getElementById('success-notification');
      this.successTextElement = document.getElementById('notification-text');
    }
    
    console.log('ThingSpeak Helper initialized', 
      this.loadingElement ? 'with' : 'without', 'loading element', 
      this.errorNotificationElement ? 'with' : 'without', 'error element');
  }
  
  /**
   * Show loading indicator with custom text
   * @param {string} text - Text to display in loading indicator
   */
  showLoading(text = 'Loading...') {
    try {
      // Use safe DOM methods if available
      if (window.domSafe) {
        window.domSafe.setText('loading-text', text);
        window.domSafe.toggleClass('loading-indicator', 'hidden', false);
        return;
      }
      
      // Fallback to direct access with safety checks
      if (this.loadingElement && this.loadingTextElement) {
        try {
          this.loadingTextElement.textContent = text;
          this.loadingElement.classList.remove('hidden');
        } catch (e) {
          console.warn('Error manipulating loading elements:', e);
        }
      } else {
        console.warn('Loading elements not properly initialized');
        
        // Additional fallback - try to get them again
        const loadingIndicator = document.getElementById('loading-indicator');
        const loadingText = document.getElementById('loading-text');
        
        if (loadingIndicator && loadingText) {
          try {
            loadingText.textContent = text;
            loadingIndicator.classList.remove('hidden');
          } catch (e) {
            console.warn('Error in fallback loading display:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error showing loading indicator:', error);
    }
  }
  
  /**
   * Hide loading indicator
   */
  hideLoading() {
    try {
      // Use safe DOM methods if available
      if (window.domSafe) {
        window.domSafe.toggleClass('loading-indicator', 'hidden', true);
        return;
      }
      
      // Fallback to direct access with safety checks
      if (this.loadingElement) {
        try {
          this.loadingElement.classList.add('hidden');
        } catch (e) {
          console.warn('Error hiding loading element:', e);
        }
      } else {
        // Additional fallback
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
          try {
            loadingIndicator.classList.add('hidden');
          } catch (e) {
            console.warn('Error in fallback hiding loading indicator:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error hiding loading indicator:', error);
    }
  }
  
  /**
   * Show error notification
   * @param {string} message - Error message to display
   */
  showError(message) {
    try {
      console.error('ThingSpeak Error:', message);
      
      // Use safe DOM methods if available
      if (window.domSafe) {
        window.domSafe.setText('error-text', message);
        window.domSafe.toggleClass('error-notification', 'hidden', false);
        
        // Hide after 5 seconds
        setTimeout(() => {
          window.domSafe.toggleClass('error-notification', 'hidden', true);
        }, 5000);
        
        return;
      }
      
      // Fallback to direct access with safety checks
      if (this.errorNotificationElement && this.errorTextElement) {
        try {
          this.errorTextElement.textContent = message;
          this.errorNotificationElement.classList.remove('hidden');
          
          // Hide after 5 seconds
          setTimeout(() => {
            if (this.errorNotificationElement) {
              this.errorNotificationElement.classList.add('hidden');
            }
          }, 5000);
        } catch (e) {
          console.warn('Error manipulating error notification:', e);
        }
      } else {
        // Fallback to console and alert
        console.error('Error notification elements not found:', message);
        alert('Error: ' + message);
      }
    } catch (error) {
      console.error('Error showing error notification:', error);
      
      // Last resort fallback
      try {
        alert('Error: ' + message);
      } catch (e) {
        // Nothing more we can do
      }
    }
  }
  
  /**
   * Show success notification
   * @param {string} message - Success message to display
   */
  showSuccess(message) {
    try {
      // Use safe DOM methods if available
      if (window.domSafe) {
        window.domSafe.setText('notification-text', message);
        window.domSafe.toggleClass('success-notification', 'hidden', false);
        
        // Hide after 3 seconds
        setTimeout(() => {
          window.domSafe.toggleClass('success-notification', 'hidden', true);
        }, 3000);
        
        return;
      }
      
      // Fallback to direct access with safety checks
      if (this.successNotificationElement && this.successTextElement) {
        try {
          this.successTextElement.textContent = message;
          this.successNotificationElement.classList.remove('hidden');
          
          // Hide after 3 seconds
          setTimeout(() => {
            if (this.successNotificationElement) {
              this.successNotificationElement.classList.add('hidden');
            }
          }, 3000);
        } catch (e) {
          console.warn('Error manipulating success notification:', e);
        }
      } else {
        console.warn('Success notification elements not found');
      }
    } catch (error) {
      console.error('Error showing success notification:', error);
    }
  }
  
  /**
   * Safely get the value of an input element
   * @param {string} elementId - ID of the input element
   * @param {*} defaultValue - Default value if element not found
   * @returns {*} - Element value or default value
   */
  getInputValue(elementId, defaultValue = '') {
    try {
      const element = document.getElementById(elementId);
      return element ? element.value : defaultValue;
    } catch (error) {
      console.error(`Error getting value for ${elementId}:`, error);
      return defaultValue;
    }
  }
  
  /**
   * Check if ThingSpeak configuration is valid
   * @returns {Object} - Result with status and message
   */
  checkConfiguration() {
    // First check localStorage for the newer format
    const settingsJSON = localStorage.getItem('thingSpeakSettings');
    if (settingsJSON) {
      try {
        const settings = JSON.parse(settingsJSON);
        if (settings && settings.channelId && settings.apiKey && 
            settings.channelId !== "YOUR_CHANNEL_ID" && settings.apiKey !== "YOUR_API_KEY") {
          return { 
            valid: true, 
            channelId: settings.channelId,
            apiKey: settings.apiKey,
            message: 'ThingSpeak configuration found in localStorage' 
          };
        }
      } catch (e) {
        console.error('Error parsing ThingSpeak settings:', e);
      }
    }
    
    // Then check for individual values (legacy format)
    const channelId = localStorage.getItem('thingspeak_channelID');
    const apiKey = localStorage.getItem('thingspeak_readAPIKey');
    
    if (channelId && apiKey && 
        channelId !== "YOUR_CHANNEL_ID" && apiKey !== "YOUR_API_KEY") {
      return { 
        valid: true, 
        channelId: channelId,
        apiKey: apiKey,
        message: 'ThingSpeak configuration found (legacy format)'
      };
    }
    
    // Then check global CONFIG if available
    if (window.CONFIG && window.CONFIG.thingspeak) {
      const config = window.CONFIG.thingspeak;
      if (config.channelID && config.readAPIKey &&
          config.channelID !== "YOUR_CHANNEL_ID" && config.readAPIKey !== "YOUR_API_KEY") {
        return { 
          valid: true, 
          channelId: config.channelID,
          apiKey: config.readAPIKey,
          message: 'ThingSpeak configuration found in global CONFIG'
        };
      }
    }
    
    return { 
      valid: false, 
      message: 'ThingSpeak configuration not found or invalid' 
    };
  }
  
  /**
   * Fetch data from ThingSpeak channel
   * @param {Object} options - Options for fetching data
   * @param {string} options.channelId - ThingSpeak channel ID
   * @param {string} options.apiKey - ThingSpeak API key
   * @param {number} options.results - Number of results to fetch
   * @param {Function} options.onSuccess - Success callback function
   * @param {Function} options.onError - Error callback function
   */
  async fetchData(options) {
    const {
      channelId,
      apiKey,
      results = 100,
      onSuccess,
      onError
    } = options;
    
    // If no explicit credentials are provided, check configuration
    if (!channelId || !apiKey) {
      const config = this.checkConfiguration();
      if (config.valid) {
        options.channelId = config.channelId;
        options.apiKey = config.apiKey;
      } else {
        const error = new Error('ThingSpeak credentials not found or invalid');
        console.error(error);
        this.showError('ThingSpeak credentials are missing or invalid. Please check settings.');
        
        if (typeof onError === 'function') {
          onError(error);
        }
        return;
      }
    }
    
    // Check if the ThingSpeakConnector is available
    let data;
    this.showLoading('Connecting to ThingSpeak...');
    
    try {
      if (window.thingSpeakConnector) {
        console.log('Using ThingSpeakConnector to fetch data');
        data = await window.thingSpeakConnector.fetchChannel(options);
      } else {
        console.log('ThingSpeakConnector not available, using direct fetch');
        const url = `https://api.thingspeak.com/channels/${encodeURIComponent(options.channelId)}/feeds.json?api_key=${options.apiKey}&results=${options.results || 100}`;
        
        const response = await fetch(url, {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`ThingSpeak API error: ${response.status} ${response.statusText}`);
        }
        
        data = await response.json();
        
        if (!data || !data.channel || !data.feeds) {
          throw new Error('Invalid response from ThingSpeak API');
        }
      }
      
      this.hideLoading();
      
      // Call success callback if provided
      if (typeof onSuccess === 'function') {
        onSuccess(data);
      }
      
      return data;
    } catch (error) {
      this.hideLoading();
      console.error('Error fetching data from ThingSpeak:', error);
      this.showError(`Failed to fetch ThingSpeak data: ${error.message}`);
      
      // Call error callback if provided
      if (typeof onError === 'function') {
        onError(error);
      }
      
      // Re-throw to allow caller to handle
      throw error;
    }
  }
  
  /**
   * Test ThingSpeak connection
   * @param {Object} options - Options for testing connection
   * @param {string} options.channelId - ThingSpeak channel ID
   * @param {string} options.apiKey - ThingSpeak API key
   * @param {HTMLElement} options.resultContainer - Element to display results in
   */
  async testConnection(options) {
    const { channelId, apiKey, resultContainer } = options;
    
    if (!resultContainer) {
      console.error('Result container is required for displaying test results');
      return;
    }
    
    try {
      resultContainer.innerHTML = '<div class="text-blue-400 text-sm"><i class="fas fa-circle-notch fa-spin mr-2"></i>Testing connection...</div>';
    } catch (e) {
      console.warn('Error updating result container:', e);
    }
    
    if (!channelId || !apiKey) {
      try {
        resultContainer.innerHTML = '<div class="text-red-400 text-sm">Channel ID and API Key are required</div>';
      } catch (e) {
        console.warn('Error updating result container:', e);
      }
      return;
    }
    
    try {
      await this.fetchData({
        channelId,
        apiKey,
        results: 1,
        onSuccess: (data) => {
          let html = `
            <div class="text-green-400 text-sm mb-2">✓ Connection successful!</div>
            <div class="mb-2">
              <div class="text-white text-sm font-medium">Channel: ${data.channel?.name || 'Unnamed'}</div>
              <div class="text-gray-300 text-xs">ID: ${channelId}</div>
              <div class="text-gray-300 text-xs">Fields available: ${Object.keys(data.channel).filter(k => k.startsWith('field')).length}</div>
            </div>
          `;
          
          try {
            resultContainer.innerHTML = html;
          } catch (e) {
            console.warn('Error updating result container with success:', e);
          }
        },
        onError: (error) => {
          try {
            resultContainer.innerHTML = `<div class="text-red-400 text-sm">Error: ${error.message}</div>`;
          } catch (e) {
            console.warn('Error updating result container with error:', e);
          }
        }
      });
    } catch (error) {
      try {
        resultContainer.innerHTML = `<div class="text-red-400 text-sm">Error: ${error.message}</div>`;
      } catch (e) {
        console.warn('Error updating result container with caught error:', e);
      }
    }
  }
}

// Create a global instance - but wrap it in a try/catch
try {
  window.thingSpeakHelper = new ThingSpeakHelper();
  
  // Export for module usage if needed
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThingSpeakHelper;
  }
} catch (error) {
  console.error('Error initializing ThingSpeakHelper:', error);
  
  // Create a failsafe version of the helper
  window.thingSpeakHelper = {
    showLoading: function(text) { console.log('Loading:', text); },
    hideLoading: function() { console.log('Loading complete'); },
    showError: function(msg) { console.error('Error:', msg); alert('Error: ' + msg); },
    showSuccess: function(msg) { console.log('Success:', msg); },
    testConnection: function(options) {
      if (options.resultContainer) {
        try {
          options.resultContainer.innerHTML = '<div style="color:red">Error initializing ThingSpeak helper</div>';
        } catch (e) {
          console.error('Cannot update result container', e);
        }
      }
    }
  };
} 