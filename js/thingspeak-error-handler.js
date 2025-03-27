/**
 * ThingSpeak Error Handler
 * This script adds global error handling to catch and prevent "Cannot read properties of null" errors
 */

(function() {
  // Track any elements that were accessed before they existed
  const accessedBeforeExistence = new Set();
  
  // Create a safe wrapper for DOM manipulation
  window.domSafe = {
    /**
     * Safely get an element by ID
     * @param {string} id - Element ID to find
     * @returns {HTMLElement|null} - The element or null
     */
    getElement: function(id) {
      const element = document.getElementById(id);
      if (!element) {
        console.warn(`Element with ID "${id}" not found`);
        accessedBeforeExistence.add(id);
      }
      return element;
    },
    
    /**
     * Safely add/remove a class to an element
     * @param {HTMLElement|string} element - Element or element ID
     * @param {string} className - Class to add
     * @param {boolean} add - Whether to add (true) or remove (false) the class
     */
    toggleClass: function(element, className, add = true) {
      try {
        if (typeof element === 'string') {
          element = this.getElement(element);
        }
        
        if (element && element.classList) {
          add ? element.classList.add(className) : element.classList.remove(className);
        }
      } catch (error) {
        console.warn(`Error toggling class "${className}": `, error);
      }
    },
    
    /**
     * Safely set the text content of an element
     * @param {HTMLElement|string} element - Element or element ID
     * @param {string} text - Text to set
     */
    setText: function(element, text) {
      try {
        if (typeof element === 'string') {
          element = this.getElement(element);
        }
        
        if (element) {
          element.textContent = text;
        }
      } catch (error) {
        console.warn(`Error setting text content: `, error);
      }
    },
    
    /**
     * Safely set the innerHTML of an element
     * @param {HTMLElement|string} element - Element or element ID
     * @param {string} html - HTML to set
     */
    setHTML: function(element, html) {
      try {
        if (typeof element === 'string') {
          element = this.getElement(element);
        }
        
        if (element) {
          element.innerHTML = html;
        }
      } catch (error) {
        console.warn(`Error setting innerHTML: `, error);
      }
    },
    
    /**
     * Safely set a style property of an element
     * @param {HTMLElement|string} element - Element or element ID
     * @param {string} property - CSS property to set
     * @param {string} value - CSS value to set
     */
    setStyle: function(element, property, value) {
      try {
        if (typeof element === 'string') {
          element = this.getElement(element);
        }
        
        if (element && element.style) {
          element.style[property] = value;
        }
      } catch (error) {
        console.warn(`Error setting style.${property}: `, error);
      }
    }
  };
  
  // Global error handler specifically designed to catch "Cannot read properties of null"
  window.addEventListener('error', function(event) {
    // Check if it's a null property access error
    if (event.error && event.error.message && 
        (event.error.message.includes("Cannot read properties of null") || 
         event.error.message.includes("null is not an object"))) {
      
      console.error("ThingSpeak API Error Handler caught:", event.error.message);
      console.error("Error occurred at:", event.filename, "line:", event.lineno, "column:", event.colno);
      
      // Prevent the error from showing in the console
      event.preventDefault();
      
      // Create or update an error notification for the user
      const createOrUpdateErrorNotification = function() {
        let notification = document.getElementById('global-error-notification');
        
        if (!notification) {
          // Create the notification if it doesn't exist
          notification = document.createElement('div');
          notification.id = 'global-error-notification';
          notification.style.position = 'fixed';
          notification.style.bottom = '20px';
          notification.style.left = '20px';
          notification.style.backgroundColor = 'rgba(185, 28, 28, 0.9)';
          notification.style.color = 'white';
          notification.style.padding = '10px 15px';
          notification.style.borderRadius = '5px';
          notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
          notification.style.zIndex = '9999';
          notification.style.fontSize = '14px';
          notification.style.maxWidth = '300px';
          
          // Add close button
          const closeBtn = document.createElement('button');
          closeBtn.textContent = '×';
          closeBtn.style.marginLeft = '10px';
          closeBtn.style.background = 'none';
          closeBtn.style.border = 'none';
          closeBtn.style.color = 'white';
          closeBtn.style.fontSize = '20px';
          closeBtn.style.cursor = 'pointer';
          closeBtn.style.float = 'right';
          closeBtn.style.marginTop = '-5px';
          closeBtn.onclick = function() {
            document.body.removeChild(notification);
          };
          
          notification.appendChild(closeBtn);
          document.body.appendChild(notification);
        }
        
        // Set content
        const errorId = event.error.message.substring(0, 50) + '...';
        const content = document.createElement('div');
        content.innerHTML = `
          <strong>Warning:</strong> A non-critical error occurred.<br>
          <span style="font-size: 12px">The application will continue to work, but some features may be limited.</span>
          <div id="error-details-${errorId}" style="display: none; margin-top: 10px; font-size: 12px; color: #f8d7da;">
            ${event.error.message}<br>
            Location: ${event.filename.split('/').pop()} (line ${event.lineno})
          </div>
          <button id="toggle-details-${errorId}" style="background: none; border: none; color: #f8d7da; text-decoration: underline; padding: 0; margin-top: 5px; cursor: pointer; font-size: 12px;">Show details</button>
        `;
        
        // Replace existing content
        notification.innerHTML = '';
        notification.appendChild(closeBtn);
        notification.appendChild(content);
        
        // Add toggle functionality
        setTimeout(() => {
          const toggleBtn = document.getElementById(`toggle-details-${errorId}`);
          const details = document.getElementById(`error-details-${errorId}`);
          
          if (toggleBtn && details) {
            toggleBtn.addEventListener('click', function() {
              const isHidden = details.style.display === 'none';
              details.style.display = isHidden ? 'block' : 'none';
              toggleBtn.textContent = isHidden ? 'Hide details' : 'Show details';
            });
          }
        }, 0);
        
        // Auto-hide after 15 seconds
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 15000);
      };
      
      // Ensure the DOM is ready before trying to add the notification
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        createOrUpdateErrorNotification();
      } else {
        document.addEventListener('DOMContentLoaded', createOrUpdateErrorNotification);
      }
      
      return true;
    }
  });
  
  // Patch the ThingSpeak helper when it's available
  const patchThingSpeakHelper = function() {
    if (window.thingSpeakHelper) {
      // Fix the initializeElements method to use our safe DOM methods
      const originalInitializeElements = window.thingSpeakHelper.initializeElements;
      window.thingSpeakHelper.initializeElements = function() {
        try {
          // Call the original method first
          originalInitializeElements.call(window.thingSpeakHelper);
          
          // Double-check elements with our safe method
          this.loadingElement = window.domSafe.getElement('loading-indicator');
          this.loadingTextElement = window.domSafe.getElement('loading-text');
          this.errorNotificationElement = window.domSafe.getElement('error-notification');
          this.errorTextElement = window.domSafe.getElement('error-text');
          this.successNotificationElement = window.domSafe.getElement('success-notification');
          this.successTextElement = window.domSafe.getElement('notification-text');
          
          console.log('ThingSpeak Helper patched successfully');
        } catch (error) {
          console.error('Error patching ThingSpeak Helper:', error);
        }
      };
      
      // Re-initialize the elements to use our patched method
      window.thingSpeakHelper.initializeElements();
      
      // Patch the showLoading method
      const originalShowLoading = window.thingSpeakHelper.showLoading;
      window.thingSpeakHelper.showLoading = function(text) {
        try {
          if (this.loadingElement && this.loadingTextElement) {
            window.domSafe.setText(this.loadingTextElement, text);
            window.domSafe.toggleClass(this.loadingElement, 'hidden', false);
          } else {
            // Fallback if elements not found
            console.warn('Loading elements not properly initialized, using fallback');
            const loadingElem = window.domSafe.getElement('loading-indicator');
            const textElem = window.domSafe.getElement('loading-text');
            
            if (textElem) window.domSafe.setText(textElem, text);
            if (loadingElem) window.domSafe.toggleClass(loadingElem, 'hidden', false);
          }
        } catch (error) {
          console.error('Error in patched showLoading:', error);
        }
      };
      
      console.log('ThingSpeak Helper methods patched');
    }
  };
  
  // Try to patch immediately
  patchThingSpeakHelper();
  
  // If not ready yet, wait for it
  document.addEventListener('DOMContentLoaded', function() {
    // Wait a short time for scripts to initialize
    setTimeout(patchThingSpeakHelper, 500);
  });
  
  // Inform user that the error handler is active
  console.log('ThingSpeak Error Handler installed successfully');
})(); 