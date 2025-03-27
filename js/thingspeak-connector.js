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
    this.log(`Fetching data for channel ${channelId}`);
    
    try {
      // Use the new retry operation system
      const data = await this.retryOperation(
        // The operation to perform
        async () => {
          // Construct API URL
          const url = this.buildApiUrl(`/channels/${channelId}/feeds.json`, {
            api_key: apiKey,
            results: results
          });
          
          // Perform the fetch with timeout
          const response = await this.fetchWithTimeout(url);
          
          // Validate response
          if (!response || !response.channel) {
            throw new Error('Invalid response format from ThingSpeak API');
          }
          
          return response;
        },
        // Context for error handling
        {
          operation: 'fetchChannel',
          params: { channelId, results },
          maxAttempts: this.config.retryCount
        }
      );
      
      // Update status
      this.status.lastSuccess = new Date();
      this.status.responseCount++;
      this.status.errorCount = 0;
      
      // Add metadata
      const enhancedData = {
        ...data,
        meta: {
          ...(data.meta || {}),
          timestamp: new Date().toISOString(),
          requestParams: {
            channelId,
            results
          }
        }
      };
      
      // Cache the results
      if (this.config.cacheResults) {
        this.saveToCache(cacheKey, enhancedData);
      }
      
      return enhancedData;
    } catch (error) {
      // If the error is already processed by our system, use it directly
      if (error.context && error.code) {
        // Try proxy as a last resort if available
        if (this.config.proxyUrl) {
          try {
            this.log('Trying proxy as a fallback', 'warn');
            return await this.fetchViaProxy(options);
          } catch (proxyError) {
            this.log(`Proxy fallback failed: ${proxyError.message}`, 'error');
          }
        }
        
        // Check for expired cache as a final fallback
        const expiredCache = this.getFromCache(cacheKey, true);
        if (expiredCache) {
          this.log('Using expired cache data as a fallback', 'warn');
          return {
            ...expiredCache,
            meta: {
              ...(expiredCache.meta || {}),
              cached: true,
              expired: true,
              lastUpdated: this.cache[cacheKey]?.timestamp,
              error: {
                message: error.message,
                code: error.code
              }
            }
          };
        }
        
        // Re-throw if no fallbacks worked
        throw error;
      } else {
        // This shouldn't happen if retryOperation is working correctly
        this.log(`Unhandled error in fetchChannel: ${error.message}`, 'error');
        throw error;
      }
    }
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
   * Enhanced cache system with compression and better memory management
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   * @param {Object} options - Cache options
   * @param {number} options.ttl - Time to live in milliseconds (overrides default)
   * @param {boolean} options.compress - Whether to compress the data (default: true for large data)
   */
  saveToCache(key, data, options = {}) {
    if (!key || !data) return;
    
    const timestamp = new Date().getTime();
    const dataSize = JSON.stringify(data).length;
    const shouldCompress = options.compress ?? (dataSize > 100000); // Auto-compress if > 100KB
    
    // Don't cache if cache is disabled
    if (!this.config.cacheResults) return;
    
    // Calculate expiry based on options or default config
    const ttl = options.ttl || this.config.cacheDuration;
    const expires = timestamp + ttl;

    try {
      // For large datasets, try to compress
      let cachedData = data;
      let isCompressed = false;

      if (shouldCompress) {
        try {
          // Basic compression by removing redundant data
          if (data.feeds && Array.isArray(data.feeds) && data.feeds.length > 0) {
            // Store channel info separately
            const channel = data.channel;
            
            // Compress feeds by removing repeated values
            const compressedFeeds = this.compressFeeds(data.feeds);
            
            cachedData = {
              channel,
              feeds: compressedFeeds,
              meta: {
                ...(data.meta || {}),
                compressed: true,
                originalSize: dataSize
              }
            };
            
            isCompressed = true;
            this.log(`Compressed cache data for key ${key} (saved ${Math.round((dataSize - JSON.stringify(cachedData).length) / dataSize * 100)}%)`);
          }
        } catch (compressError) {
          this.log(`Failed to compress cache data: ${compressError.message}`, 'warn');
          // Fall back to uncompressed data
          cachedData = data;
        }
      }
      
      // Store in cache with metadata
      this.cache[key] = {
        data: cachedData,
        timestamp,
        expires,
        compressed: isCompressed,
        size: dataSize
      };
      
      // Clean up old cache entries if we have too many
      this.cleanupCache();
    } catch (error) {
      this.log(`Error saving to cache: ${error.message}`, 'error');
    }
  }
  
  /**
   * Compress array of feed data to reduce memory usage
   * @param {Array} feeds - Feed data array
   * @returns {Object} - Compressed feeds representation
   * @private
   */
  compressFeeds(feeds) {
    if (!Array.isArray(feeds) || feeds.length === 0) return feeds;
    
    // Extract field names from first entry
    const firstEntry = feeds[0];
    const fieldNames = Object.keys(firstEntry).filter(k => k.startsWith('field'));
    
    // Create template object with all possible fields and their structure
    const template = {};
    fieldNames.forEach(field => {
      // Store type information to help with decompression
      const value = firstEntry[field];
      template[field] = { type: typeof value };
    });
    
    // Only store values array for each field + created_at entries
    const compressed = {
      template,
      timePoints: feeds.map(f => f.created_at),
      fields: {}
    };
    
    // For each field, extract just the values
    fieldNames.forEach(field => {
      compressed.fields[field] = feeds.map(f => f[field] !== undefined ? f[field] : null);
    });
    
    return compressed;
  }
  
  /**
   * Get data from cache with decompression if needed
   * @param {string} key - Cache key
   * @param {boolean} ignoreExpiry - Get data even if expired
   * @returns {Object|null} - Cached data or null
   */
  getFromCache(key, ignoreExpiry = false) {
    if (!key || !this.cache[key]) return null;
    
    const cached = this.cache[key];
    const now = new Date().getTime();
    
    // Check if expired
    if (!ignoreExpiry && cached.expires < now) {
      this.log(`Cache expired for key ${key}`);
      return null;
    }
    
    try {
      // Check if we need to decompress
      if (cached.compressed) {
        return this.decompressData(cached.data);
      }
      
      return cached.data;
    } catch (error) {
      this.log(`Error retrieving from cache: ${error.message}`, 'error');
      return null;
    }
  }
  
  /**
   * Decompress data structure back to original format
   * @param {Object} compressedData - Compressed data structure
   * @returns {Object} - Original data structure
   * @private
   */
  decompressData(compressedData) {
    // If data is not in compressed format, return as is
    if (!compressedData.meta?.compressed && !compressedData.feeds?.template) {
      return compressedData;
    }
    
    try {
      // If feeds is already in normal format, return as is
      if (Array.isArray(compressedData.feeds)) {
        return compressedData;
      }
      
      // Get compressed structure
      const { template, timePoints, fields } = compressedData.feeds;
      
      // Rebuild feeds array
      const feeds = timePoints.map((time, index) => {
        const feed = { created_at: time };
        
        // Add each field's value at this index
        Object.keys(fields).forEach(fieldName => {
          feed[fieldName] = fields[fieldName][index];
        });
        
        return feed;
      });
      
      // Recreate original structure
      return {
        channel: compressedData.channel,
        feeds,
        meta: {
          ...(compressedData.meta || {}),
          decompressed: true
        }
      };
    } catch (error) {
      this.log(`Error decompressing data: ${error.message}`, 'error');
      // Return original data if decompression fails
      return compressedData;
    }
  }
  
  /**
   * Clean up old cache entries to prevent memory leaks
   * @param {number} maxEntries - Maximum number of entries to keep (default 50)
   * @private
   */
  cleanupCache(maxEntries = 50) {
    const keys = Object.keys(this.cache);
    
    // If we're under the limit, do nothing
    if (keys.length <= maxEntries) return;
    
    // Get entries sorted by access time (oldest first)
    const sortedEntries = keys
      .map(key => ({ key, ...this.cache[key] }))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest entries
    const entriesToRemove = sortedEntries.slice(0, keys.length - maxEntries);
    
    // Remove from cache
    entriesToRemove.forEach(entry => {
      this.log(`Removing old cache entry: ${entry.key}`);
      delete this.cache[entry.key];
    });
    
    this.log(`Cache cleanup complete. Removed ${entriesToRemove.length} entries.`);
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
   * Fetch historical data from ThingSpeak with specific date range
   * @param {Object} options - Fetch options
   * @param {string} options.channelId - Channel ID
   * @param {string} options.apiKey - API Key
   * @param {Date|string} options.startDate - Start date for the range
   * @param {Date|string} options.endDate - End date for the range
   * @param {number} options.maxResults - Maximum number of results to fetch (default 8000)
   * @param {boolean} options.bypassCache - Skip cache lookup
   * @returns {Promise<Object>} - Historical channel data
   */
  async fetchHistoricalData(options) {
    const { 
      channelId, 
      apiKey, 
      startDate, 
      endDate, 
      maxResults = 8000, 
      bypassCache = false 
    } = options;
    
    // Validate required parameters
    if (!channelId || !apiKey) {
      throw new Error('Channel ID and API Key are required for historical data');
    }
    
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required for historical data');
    }

    // Format dates for ThingSpeak API
    const formatDate = (date) => {
      // Handle string dates or Date objects
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Validate date is valid
      if (isNaN(dateObj.getTime())) {
        throw new Error(`Invalid date: ${date}`);
      }
      
      // Format to YYYY-MM-DD HH:MM:SS
      return dateObj.toISOString().replace('T', ' ').substring(0, 19);
    };

    // Safety check for date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format provided');
    }
    
    if (start > end) {
      throw new Error('Start date must be before end date');
    }
    
    // Limit date range to prevent excessively large requests
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      this.log('Warning: Date range exceeds 90 days, which may cause performance issues', 'warn');
    }
    
    // Generate cache key
    const cacheKey = `historical_${channelId}_${formatDate(startDate)}_${formatDate(endDate)}`;
    
    // Check cache if enabled and not bypassed
    if (this.config.cacheResults && !bypassCache) {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        this.log(`Using cached historical data for channel ${channelId}`);
        return cachedData;
      }
    }
    
    this.status.requestCount++;
    this.log(`Fetching historical data for channel ${channelId} from ${formatDate(startDate)} to ${formatDate(endDate)}`);
    
    // Build the API URL with date parameters
    const url = this.buildApiUrl(`/channels/${channelId}/feeds.json`, {
      api_key: apiKey,
      start: formatDate(startDate),
      end: formatDate(endDate),
      results: maxResults
    });
    
    try {
      // Fetch with timeout
      const response = await this.fetchWithTimeout(url);
      
      // Validate response
      if (!response || !response.channel || !response.feeds) {
        throw new Error('Invalid response format from ThingSpeak API');
      }
      
      // Enhance response with metadata
      const enhancedResponse = {
        ...response,
        meta: {
          ...(response.meta || {}),
          queryType: 'historical',
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          recordCount: response.feeds.length,
          timestamp: new Date().toISOString()
        }
      };
      
      // Update status
      this.status.lastSuccess = new Date();
      this.status.responseCount++;
      
      // Cache the results
      if (this.config.cacheResults) {
        this.saveToCache(cacheKey, enhancedResponse);
      }
      
      this.log(`Successfully fetched ${enhancedResponse.feeds.length} historical records`);
      return enhancedResponse;
    } catch (error) {
      this.status.lastError = new Date();
      this.status.errorCount++;
      
      // Try proxy if available
      if (this.config.proxyUrl) {
        try {
          this.log('Trying proxy for historical data as a fallback', 'warn');
          return await this.fetchHistoricalViaProxy(options);
        } catch (proxyError) {
          this.log(`Proxy fallback failed: ${proxyError.message}`, 'error');
        }
      }
      
      // Check for expired cache as last resort
      const expiredCache = this.getFromCache(cacheKey, true);
      if (expiredCache) {
        this.log('Using expired cache data as a fallback for historical data', 'warn');
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
      
      // Log detailed error information to help with debugging
      this.log(`Historical data fetch failed: ${error.message}`, 'error');
      if (error.response) {
        this.log(`Status: ${error.response.status}`, 'error');
      }
      
      // Rethrow with more context
      throw new Error(`Failed to fetch historical data: ${error.message}`);
    }
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
  
  /**
   * Clear entire cache or a specific key
   * @param {string} key - Optional specific key to clear
   */
  clearCache(key = null) {
    if (key) {
      if (this.cache[key]) {
        this.log(`Clearing cache for key: ${key}`);
        delete this.cache[key];
      }
    } else {
      this.log('Clearing entire cache');
      this.cache = {};
    }
    
    return true;
  }
  
  /**
   * Enhanced error handling system for ThingSpeak API requests
   * @param {Error} error - The original error
   * @param {Object} context - Error context
   * @param {string} context.operation - Operation that failed (e.g., 'fetchChannel')
   * @param {Object} context.params - Parameters used in the operation
   * @param {number} context.attempt - Current attempt number
   * @param {number} context.maxAttempts - Maximum number of attempts
   * @returns {Error} - Enhanced error with additional context
   * @private
   */
  handleApiError(error, context) {
    const { operation, params = {}, attempt = 1, maxAttempts = this.config.retryCount } = context;
    
    // Create enhanced error object with additional context
    const enhancedError = new Error(error.message);
    enhancedError.originalError = error;
    enhancedError.context = {
      ...context,
      timestamp: new Date().toISOString(),
      connector: {
        version: '2.0.0',
        config: { ...this.config, proxyUrl: this.config.proxyUrl ? '[REDACTED]' : null }
      }
    };
    
    // Mask sensitive data in params
    const safeParams = { ...params };
    if (safeParams.apiKey) {
      safeParams.apiKey = safeParams.apiKey.substring(0, 4) + '...[REDACTED]';
    }
    enhancedError.context.params = safeParams;
    
    // Determine if error is retryable
    let isRetryable = true;
    let retryDelay = this.config.retryDelay;
    
    // Check specific error cases to determine if retry is appropriate
    if (error.name === 'AbortError') {
      // Request timed out, likely retryable
      enhancedError.code = 'TIMEOUT';
      enhancedError.retryable = true;
      // Increase timeout for next attempt
      retryDelay = this.config.retryDelay * 1.5;
    } else if (error.status === 401 || error.status === 403) {
      // Authentication errors, not retryable
      enhancedError.code = 'AUTH_ERROR';
      enhancedError.retryable = false;
      isRetryable = false;
    } else if (error.status === 404) {
      // Not found errors, not retryable
      enhancedError.code = 'NOT_FOUND';
      enhancedError.retryable = false;
      isRetryable = false;
    } else if (error.status === 429) {
      // Rate limiting, retryable with longer delay
      enhancedError.code = 'RATE_LIMITED';
      enhancedError.retryable = true;
      retryDelay = this.config.retryDelay * 3; // Wait longer for rate limiting
    } else if (error.status >= 500) {
      // Server errors, retryable
      enhancedError.code = 'SERVER_ERROR';
      enhancedError.retryable = true;
    } else {
      // Other errors, conditionally retryable
      enhancedError.code = 'UNKNOWN_ERROR';
      enhancedError.retryable = true;
    }
    
    // Log with appropriate level
    const logLevel = isRetryable && attempt < maxAttempts ? 'warn' : 'error';
    this.log(`${operation} error (${enhancedError.code}): ${error.message} [Attempt ${attempt}/${maxAttempts}]`, logLevel);
    
    // Track error in status
    this.status.lastError = new Date();
    this.status.errorCount++;
    
    // Add retry information
    enhancedError.retry = {
      attempt,
      maxAttempts,
      isRetryable: isRetryable && attempt < maxAttempts,
      delay: retryDelay
    };
    
    return enhancedError;
  }
  
  /**
   * Implement intelligent retry mechanism with exponential backoff
   * @param {Function} operation - Function to retry
   * @param {Object} context - Operation context for error handling
   * @returns {Promise<*>} - Result of the operation
   * @private
   */
  async retryOperation(operation, context) {
    const { maxAttempts = this.config.retryCount, baseDelay = this.config.retryDelay } = context;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Execute the operation
        return await operation();
      } catch (error) {
        // Process error with enhanced handling
        const enhancedError = this.handleApiError(error, {
          ...context,
          attempt,
          maxAttempts
        });
        
        lastError = enhancedError;
        
        // If error is not retryable or we're out of attempts, stop
        if (!enhancedError.retry.isRetryable) {
          break;
        }
        
        // Wait before retrying with exponential backoff
        const delay = enhancedError.retry.delay * Math.pow(1.5, attempt - 1);
        this.log(`Retrying in ${Math.round(delay/1000)} seconds (attempt ${attempt}/${maxAttempts})`, 'warn');
        await this.delay(delay);
      }
    }
    
    // If we get here, all attempts failed
    if (lastError) {
      // Add a note that all retries were exhausted
      if (lastError.retry && lastError.retry.attempt >= maxAttempts) {
        lastError.message = `${lastError.message} (all ${maxAttempts} retry attempts failed)`;
      }
      throw lastError;
    }
    
    // This should never happen if operation throws on error
    throw new Error('Operation failed without throwing an error');
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