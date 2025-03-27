/**
 * ThingSpeak Connector
 * Reliable connectivity to ThingSpeak API with multiple fallback mechanisms
 */

class ThingSpeakConnector {
  constructor(config = {}) {
    // Default configuration
    this.config = {
      baseUrl: 'https://api.thingspeak.com',
      proxyUrl: null,  // Optional proxy server
      timeout: 15000,  // 15 seconds timeout
      retryCount: 3,
      retryDelay: 1000,
      useHttps: true,
      cacheResults: true,
      cacheDuration: 60000, // 1 minute
      debug: false,
      ...config
    };
    
    // Cache for API responses
    this.cache = {};
    
    // Status tracking
    this.status = {
      lastSuccess: null,
      lastError: null,
      errorCount: 0,
      requestCount: 0,
      responseCount: 0
    };
    
    this.log('ThingSpeak Connector initialized');
  }
  
  /**
   * Log messages when in debug mode
   * @param {string} message - Message to log
   * @param {string} level - Log level (log, warn, error)
   * @private
   */
  log(message, level = 'log') {
    if (this.config.debug || level === 'error') {
      console[level](`[ThingSpeak] ${message}`);
    }
  }
  
  /**
   * Fetch data from a ThingSpeak channel with retries and caching
   * @param {Object} options - Fetch options
   * @param {string} options.channelId - Channel ID
   * @param {string} options.apiKey - API Key
   * @param {number} options.results - Number of results to fetch
   * @param {boolean} options.bypassCache - Skip cache lookup
   * @returns {Promise<Object>} - Channel data
   */
  async fetchChannel(options) {
    const { 
      channelId, 
      apiKey, 
      results = 100, 
      bypassCache = false 
    } = options;
    
    // Validate required parameters
    if (!channelId) {
      throw new Error('Channel ID is required');
    }
    
    if (!apiKey) {
      throw new Error('API Key is required');
    }
    
    // Generate cache key
    const cacheKey = `channel_${channelId}_${results}`;
    
    // Check cache if enabled and not bypassed
    if (this.config.cacheResults && !bypassCache) {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        this.log(`Using cached data for channel ${channelId}`);
        return cachedData;
      }
    }
    
    this.status.requestCount++;
    
    // Construct API URL
    const url = this.buildApiUrl('/channels/' + channelId + '/feeds.json', {
      api_key: apiKey,
      results: results
    });
    
    // Try to fetch with retries
    let lastError = null;
    for (let attempt = 1; attempt <= this.config.retryCount; attempt++) {
      try {
        this.log(`Fetching channel ${channelId} (Attempt ${attempt}/${this.config.retryCount})`);
        
        // Try direct API call
        const data = await this.fetchWithTimeout(url);
        
        // Validate response
        if (!data || !data.channel) {
          throw new Error('Invalid response format from ThingSpeak API');
        }
        
        // Update status
        this.status.lastSuccess = new Date();
        this.status.responseCount++;
        this.status.errorCount = 0;
        
        // Cache the results
        if (this.config.cacheResults) {
          this.saveToCache(cacheKey, data);
        }
        
        return data;
      } catch (error) {
        lastError = error;
        this.log(`Attempt ${attempt} failed: ${error.message}`, 'warn');
        
        // If this is not the last attempt, wait before retrying
        if (attempt < this.config.retryCount) {
          await this.delay(this.config.retryDelay * attempt); // Exponential backoff
        }
      }
    }
    
    // If we get here, all attempts failed
    this.status.lastError = new Date();
    this.status.errorCount++;
    
    // If we have a proxy, try it as a last resort
    if (this.config.proxyUrl && lastError) {
      try {
        this.log('Trying proxy as a fallback', 'warn');
        return await this.fetchViaProxy(options);
      } catch (proxyError) {
        this.log(`Proxy fallback also failed: ${proxyError.message}`, 'error');
        // Fall through to the error handler
      }
    }
    
    // Check if we have cached data, even if it's expired, as a last resort
    const expiredCache = this.getFromCache(cacheKey, true);
    if (expiredCache) {
      this.log('Using expired cache data as a fallback', 'warn');
      return {
        ...expiredCache,
        meta: {
          ...(expiredCache.meta || {}),
          cached: true,
          expired: true,
          lastUpdated: this.cache[cacheKey]?.timestamp
        }
      };
    }
    
    // If we get here, all retries and fallbacks failed
    throw lastError || new Error('Failed to fetch ThingSpeak data after multiple attempts');
  }
  
  /**
   * Fetch data via a proxy server
   * @param {Object} options - Fetch options
   * @private
   */
  async fetchViaProxy(options) {
    const { channelId, apiKey, results = 100 } = options;
    
    if (!this.config.proxyUrl) {
      throw new Error('Proxy URL not configured');
    }
    
    // Construct proxy request
    const proxyParams = {
      url: `${this.config.baseUrl}/channels/${channelId}/feeds.json`,
      params: {
        api_key: apiKey,
        results: results
      }
    };
    
    const response = await fetch(this.config.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proxyParams)
    });
    
    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Add metadata to indicate this came via proxy
    return {
      ...data,
      meta: {
        ...(data.meta || {}),
        viaProxy: true
      }
    };
  }
  
  /**
   * Build API URL with parameters
   * @param {string} path - API path
   * @param {Object} params - Query parameters
   * @returns {string} - Full URL
   * @private
   */
  buildApiUrl(path, params) {
    const url = new URL(path, this.config.baseUrl);
    
    // Add query parameters
    if (params) {
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });
    }
    
    return url.toString();
  }
  
  /**
   * Fetch with timeout
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} - Response data
   * @private
   */
  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...(options.headers || {})
        }
      });
      
      if (!response.ok) {
        const errorMsg = await this.handleHttpError(response);
        throw new Error(errorMsg);
      }
      
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  /**
   * Handle HTTP error responses
   * @param {Response} response - Fetch response
   * @returns {Promise<string>} - Error message
   * @private
   */
  async handleHttpError(response) {
    let errorMessage = `HTTP error: ${response.status}`;
    
    switch (response.status) {
      case 401:
        errorMessage = 'Invalid API key or insufficient permissions';
        break;
      case 404:
        errorMessage = 'Channel not found';
        break;
      case 429:
        errorMessage = 'Rate limit exceeded. Please try again later';
        break;
      case 500:
        errorMessage = 'ThingSpeak server error';
        break;
      default:
        try {
          // Try to get more details from the response
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // Ignore parsing errors
        }
    }
    
    return errorMessage;
  }
  
  /**
   * Save data to cache
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   * @private
   */
  saveToCache(key, data) {
    this.cache[key] = {
      data: data,
      timestamp: new Date().getTime()
    };
  }
  
  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @param {boolean} ignoreExpiry - Get even if expired
   * @returns {Object|null} - Cached data or null
   * @private
   */
  getFromCache(key, ignoreExpiry = false) {
    const cacheEntry = this.cache[key];
    
    if (!cacheEntry) {
      return null;
    }
    
    // Check if cache is still valid
    if (!ignoreExpiry) {
      const now = new Date().getTime();
      if (now - cacheEntry.timestamp > this.config.cacheDuration) {
        return null;
      }
    }
    
    return cacheEntry.data;
  }
  
  /**
   * Clear entire cache or a specific key
   * @param {string} key - Optional specific key to clear
   */
  clearCache(key = null) {
    if (key) {
      delete this.cache[key];
    } else {
      this.cache = {};
    }
  }
  
  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Test connection to ThingSpeak
   * @param {Object} options - Test options
   * @param {string} options.channelId - Channel ID to test
   * @param {string} options.apiKey - API Key to test
   * @param {Function} options.onProgress - Progress callback
   * @returns {Promise<Object>} - Test results
   */
  async testConnection(options) {
    const { channelId, apiKey, onProgress } = options;
    
    const results = {
      success: false,
      directApi: { success: false, time: null, error: null },
      proxy: { success: false, time: null, error: null },
      data: null
    };
    
    // Function to update progress
    const updateProgress = (message, percentage) => {
      if (onProgress) {
        onProgress(message, percentage);
      }
    };
    
    updateProgress('Testing direct API connection...', 10);
    
    // Test direct API
    const directStart = performance.now();
    try {
      // Try to fetch just 1 result to validate connection
      const data = await this.fetchChannel({
        channelId,
        apiKey,
        results: 1,
        bypassCache: true
      });
      
      results.directApi.success = true;
      results.directApi.time = performance.now() - directStart;
      results.data = data;
      results.success = true;
      
      updateProgress('Direct API connection successful', 70);
    } catch (error) {
      results.directApi.success = false;
      results.directApi.time = performance.now() - directStart;
      results.directApi.error = error.message;
      
      updateProgress(`Direct API failed: ${error.message}`, 40);
    }
    
    // If proxy is configured, test it too
    if (this.config.proxyUrl) {
      updateProgress('Testing proxy connection...', 60);
      
      const proxyStart = performance.now();
      try {
        const data = await this.fetchViaProxy({
          channelId,
          apiKey,
          results: 1
        });
        
        results.proxy.success = true;
        results.proxy.time = performance.now() - proxyStart;
        
        // If direct API failed but proxy succeeded, use this data
        if (!results.data) {
          results.data = data;
          results.success = true;
        }
        
        updateProgress('Proxy connection successful', 90);
      } catch (error) {
        results.proxy.success = false;
        results.proxy.time = performance.now() - proxyStart;
        results.proxy.error = error.message;
        
        updateProgress(`Proxy failed: ${error.message}`, 80);
      }
    }
    
    updateProgress('Test completed', 100);
    return results;
  }
  
  /**
   * Get connector status
   * @returns {Object} - Current status
   */
  getStatus() {
    return {
      ...this.status,
      cacheSize: Object.keys(this.cache).length,
      config: { ...this.config, proxyUrl: this.config.proxyUrl ? '(configured)' : null }
    };
  }
  
  /**
   * Fetch historical data from a ThingSpeak channel by date range
   * @param {Object} options - Fetch options
   * @param {string} options.channelId - Channel ID
   * @param {string} options.apiKey - API Key
   * @param {Date|string} options.startDate - Start date for historical data
   * @param {Date|string} options.endDate - End date for historical data (defaults to now)
   * @param {boolean} options.bypassCache - Skip cache lookup
   * @returns {Promise<Object>} - Channel data
   */
  async fetchHistoricalData(options) {
    const { 
      channelId, 
      apiKey, 
      startDate,
      endDate = new Date(),
      bypassCache = false 
    } = options;
    
    // Validate required parameters
    if (!channelId) {
      throw new Error('Channel ID is required');
    }
    
    if (!apiKey) {
      throw new Error('API Key is required');
    }
    
    if (!startDate) {
      throw new Error('Start date is required for historical data');
    }
    
    // Format dates for ThingSpeak API (YYYY-MM-DD HH:MM:SS format)
    const formatDate = (date) => {
      if (typeof date === 'string') {
        return date;
      }
      
      const d = new Date(date);
      return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
    };
    
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    
    // Generate cache key
    const cacheKey = `historical_${channelId}_${formattedStartDate}_${formattedEndDate}`;
    
    // Check cache if enabled and not bypassed
    if (this.config.cacheResults && !bypassCache) {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        this.log(`Using cached historical data for channel ${channelId}`);
        return cachedData;
      }
    }
    
    this.status.requestCount++;
    
    // Construct API URL with start and end dates
    const url = this.buildApiUrl('/channels/' + channelId + '/feeds.json', {
      api_key: apiKey,
      start: formattedStartDate,
      end: formattedEndDate
    });
    
    // Try to fetch with retries
    let lastError = null;
    for (let attempt = 1; attempt <= this.config.retryCount; attempt++) {
      try {
        this.log(`Fetching historical data for channel ${channelId} (Attempt ${attempt}/${this.config.retryCount})`);
        
        // Try direct API call
        const data = await this.fetchWithTimeout(url);
        
        // Validate response
        if (!data || !data.channel) {
          throw new Error('Invalid response format from ThingSpeak API');
        }
        
        // Update status
        this.status.lastSuccess = new Date();
        this.status.responseCount++;
        this.status.errorCount = 0;
        
        // Cache the results
        if (this.config.cacheResults) {
          this.saveToCache(cacheKey, data);
        }
        
        return data;
      } catch (error) {
        lastError = error;
        this.log(`Attempt ${attempt} failed: ${error.message}`, 'warn');
        
        // If this is not the last attempt, wait before retrying
        if (attempt < this.config.retryCount) {
          await this.delay(this.config.retryCount * attempt); // Exponential backoff
        }
      }
    }
    
    // If we get here, all attempts failed
    this.status.lastError = new Date();
    this.status.errorCount++;
    
    // If we have a proxy, try it as a last resort
    if (this.config.proxyUrl && lastError) {
      try {
        this.log('Trying proxy as a fallback for historical data', 'warn');
        return await this.fetchHistoricalViaProxy(options);
      } catch (proxyError) {
        this.log(`Proxy fallback also failed: ${proxyError.message}`, 'error');
        // Fall through to the error handler
      }
    }
    
    // Check if we have cached data, even if it's expired, as a last resort
    const expiredCache = this.getFromCache(cacheKey, true);
    if (expiredCache) {
      this.log('Using expired cache historical data as a fallback', 'warn');
      return {
        ...expiredCache,
        meta: {
          ...(expiredCache.meta || {}),
          cached: true,
          expired: true,
          lastUpdated: this.cache[cacheKey]?.timestamp
        }
      };
    }
    
    // If we get here, all retries and fallbacks failed
    throw lastError || new Error('Failed to fetch historical ThingSpeak data after multiple attempts');
  }
  
  /**
   * Fetch historical data via a proxy server
   * @param {Object} options - Fetch options
   * @private
   */
  async fetchHistoricalViaProxy(options) {
    const { channelId, apiKey, startDate, endDate } = options;
    
    if (!this.config.proxyUrl) {
      throw new Error('Proxy URL not configured');
    }
    
    // Format dates for ThingSpeak API
    const formatDate = (date) => {
      if (typeof date === 'string') {
        return date;
      }
      
      const d = new Date(date);
      return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
    };
    
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate || new Date());
    
    // Construct proxy request
    const proxyParams = {
      url: `${this.config.baseUrl}/channels/${channelId}/feeds.json`,
      params: {
        api_key: apiKey,
        start: formattedStartDate,
        end: formattedEndDate
      }
    };
    
    const response = await fetch(this.config.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proxyParams)
    });
    
    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Add metadata to indicate this came via proxy
    return {
      ...data,
      meta: {
        ...(data.meta || {}),
        viaProxy: true,
        historical: true
      }
    };
  }
}

// Create a global instance
window.thingSpeakConnector = new ThingSpeakConnector({
  debug: true,  // Set to false in production
  retryCount: 3,
  cacheResults: true
});

// For module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThingSpeakConnector;
} 