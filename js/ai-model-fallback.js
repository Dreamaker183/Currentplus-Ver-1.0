/**
 * AI Model Fallback System
 * Provides a fallback mechanism when the primary AI model fails or is unavailable
 */

class AIModelFallback {
  constructor(options = {}) {
    this.options = {
      debugMode: false,
      retryAttempts: 3,
      retryDelay: 1000,
      timeoutMs: 10000,
      ...options
    };
    
    this.modelStatus = {
      primary: {
        available: true,
        failureCount: 0,
        lastFailure: null,
        lastSuccess: null
      },
      fallback: {
        available: true,
        failureCount: 0,
        lastFailure: null,
        lastSuccess: null
      }
    };
    
    this.log('AI Model Fallback System initialized');
  }
  
  /**
   * Log message based on debug mode
   * @param {string} message - Message to log
   * @param {string} level - Log level (log, warn, error)
   */
  log(message, level = 'log') {
    if (this.options.debugMode || level === 'error') {
      console[level](`[AI Fallback] ${message}`);
    }
  }
  
  /**
   * Update model status
   * @param {string} model - Model name (primary/fallback)
   * @param {boolean} success - Whether the operation succeeded
   */
  updateModelStatus(model, success) {
    const status = this.modelStatus[model];
    
    if (success) {
      status.available = true;
      status.lastSuccess = new Date();
      
      // Reset failure count after successful operation
      if (status.failureCount > 0) {
        this.log(`${model} model recovered after ${status.failureCount} failures`, 'warn');
        status.failureCount = 0;
      }
    } else {
      status.failureCount++;
      status.lastFailure = new Date();
      
      // Mark as unavailable after consistent failures
      if (status.failureCount >= this.options.retryAttempts) {
        status.available = false;
        this.log(`${model} model marked unavailable after ${status.failureCount} failures`, 'warn');
      }
    }
  }
  
  /**
   * Execute operation with fallback 
   * @param {Function} primaryOperation - Primary operation to attempt
   * @param {Function} fallbackOperation - Fallback operation if primary fails
   * @param {boolean} forceFailover - Force using fallback
   * @returns {Promise<any>} - Result of operation
   */
  async executeWithFallback(primaryOperation, fallbackOperation, forceFailover = false) {
    // If forced failover or primary is unavailable, go straight to fallback
    if (forceFailover || !this.modelStatus.primary.available) {
      this.log('Using fallback model (forced or primary unavailable)', 'warn');
      return this.executeFallbackOperation(fallbackOperation);
    }
    
    try {
      // Try primary operation with timeout
      const primaryResult = await this.executeWithTimeout(
        primaryOperation, 
        this.options.timeoutMs,
        'Primary operation timeout'
      );
      
      this.updateModelStatus('primary', true);
      return primaryResult;
    } catch (error) {
      this.log(`Primary model error: ${error.message}`, 'error');
      this.updateModelStatus('primary', false);
      
      // Wait before trying fallback
      await this.delay(this.options.retryDelay);
      return this.executeFallbackOperation(fallbackOperation);
    }
  }
  
  /**
   * Execute fallback operation
   * @param {Function} fallbackOperation - Fallback operation
   * @returns {Promise<any>} - Result of operation
   */
  async executeFallbackOperation(fallbackOperation) {
    if (!this.modelStatus.fallback.available) {
      throw new Error('Both primary and fallback models are unavailable');
    }
    
    try {
      // Try fallback operation with timeout
      const fallbackResult = await this.executeWithTimeout(
        fallbackOperation,
        this.options.timeoutMs,
        'Fallback operation timeout'
      );
      
      this.updateModelStatus('fallback', true);
      return fallbackResult;
    } catch (error) {
      this.log(`Fallback model error: ${error.message}`, 'error');
      this.updateModelStatus('fallback', false);
      throw new Error(`AI model operation failed: ${error.message}`);
    }
  }
  
  /**
   * Execute operation with timeout
   * @param {Function} operation - Operation to execute
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} timeoutMessage - Message for timeout error
   * @returns {Promise<any>} - Result of operation
   */
  executeWithTimeout(operation, timeoutMs, timeoutMessage) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
      
      Promise.resolve().then(() => operation())
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
  
  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Reset model availability
   * @param {string} model - Model to reset (primary/fallback/all)
   */
  resetModel(model = 'all') {
    if (model === 'all' || model === 'primary') {
      this.modelStatus.primary.available = true;
      this.modelStatus.primary.failureCount = 0;
      this.log('Primary model status reset', 'warn');
    }
    
    if (model === 'all' || model === 'fallback') {
      this.modelStatus.fallback.available = true;
      this.modelStatus.fallback.failureCount = 0;
      this.log('Fallback model status reset', 'warn');
    }
  }
  
  /**
   * Get current model status
   * @returns {Object} - Current model status
   */
  getStatus() {
    return {
      ...this.modelStatus,
      timestamp: new Date()
    };
  }
}

// Create a global instance
try {
  window.aiModelFallback = new AIModelFallback({
    debugMode: true,  // Set to false in production
    retryAttempts: 2,
    retryDelay: 500,
    timeoutMs: 5000
  });
  
  // Example usage
  /*
  async function someAIOperation() {
    return window.aiModelFallback.executeWithFallback(
      // Primary operation
      async () => {
        // Call to primary AI model
        return primaryResult;
      },
      // Fallback operation
      async () => {
        // Simpler fallback logic or different endpoint
        return fallbackResult;
      }
    );
  }
  */
  
  // Export for module usage if needed
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIModelFallback;
  }
} catch (error) {
  console.error('Error initializing AIModelFallback:', error);
} 