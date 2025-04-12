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
        
        // Ensure element exists and has a style property before setting
        if (element && typeof element.style !== 'undefined') {
          element.style[property] = value;
        } else if (element) {
          console.warn(`Element exists but style property is undefined`, element);
        }
      } catch (error) {
        console.warn(`Error setting style.${property}: `, error);
      }
    },
    
    /**
     * Check if an element exists and has a style property
     * @param {HTMLElement|string} element - Element or element ID
     * @returns {boolean} - Whether the element exists and has a style property
     */
    canStyle: function(element) {
      try {
        if (typeof element === 'string') {
          element = this.getElement(element);
        }
        
        return !!(element && typeof element.style !== 'undefined');
      } catch (error) {
        console.warn('Error checking if element can be styled:', error);
        return false;
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
          
          // Use direct property assignment instead of style.property = value
          Object.assign(notification.style, {
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            backgroundColor: 'rgba(185, 28, 28, 0.9)',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '5px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            zIndex: '9999',
            fontSize: '14px',
            maxWidth: '300px'
          });
          
          // Add close button
          const closeBtn = document.createElement('button');
          closeBtn.textContent = '×';
          
          // Use direct property assignment for styles
          Object.assign(closeBtn.style, {
            marginLeft: '10px',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            float: 'right',
            marginTop: '-5px'
          });
          
          closeBtn.onclick = function() {
            // Only remove if document.body and notification both exist
            if (document.body && notification && document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          };
          
          // Only append if both notification and closeBtn exist
          if (notification && closeBtn) {
            notification.appendChild(closeBtn);
          }
          
          // Only append to body if both document.body and notification exist
          if (document.body && notification) {
            document.body.appendChild(notification);
          }
        }
        
        // Set content only if notification exists
        if (notification) {
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
          
          // Only append if both elements exist
          if (notification && closeBtn) {
            notification.appendChild(closeBtn);
          }
          if (notification && content) {
            notification.appendChild(content);
          }
          
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
            if (document.body && notification && document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 15000);
        }
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
  
  // Fix the style issues in other scripts
  document.addEventListener('DOMContentLoaded', function() {
    // Attempt to fix any elements that use inline styles in dashboard.html
    const fixStylesForElements = ['esg-score-circle', 'environment-score-bar', 'social-score-bar', 'governance-score-bar'];
    
    fixStylesForElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        // Clone the inline styles to ensure they're properly set 
        const currentStyles = element.getAttribute('style');
        if (currentStyles) {
          element.removeAttribute('style');
          setTimeout(() => {
            element.setAttribute('style', currentStyles);
          }, 0);
        }
      }
    });
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
    }
  };
  
  // Run when DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    patchThingSpeakHelper();
  } else {
    document.addEventListener('DOMContentLoaded', patchThingSpeakHelper);
  }
  
  // Periodically check for window.thingSpeakHelper
  const helperCheckInterval = setInterval(() => {
    if (window.thingSpeakHelper) {
      patchThingSpeakHelper();
      clearInterval(helperCheckInterval);
    }
  }, 100);
  
  // Clear the interval after 10 seconds to avoid memory leaks
  setTimeout(() => {
    clearInterval(helperCheckInterval);
  }, 10000);
})();

/**
 * iOS Style UI Toggle
 * This script transforms the ESG dashboard into an iOS-style UI
 * based on SwiftUI design principles
 */
(function() {
  // Create the iOS style toggle button
  function createStyleToggle() {
    const existingToggle = document.getElementById('ios-style-toggle');
    if (existingToggle) return;
    
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'ios-style-toggle';
    toggleBtn.className = 'btn btn-sm btn-outline-secondary';
    toggleBtn.innerHTML = '<i class="fas fa-toggle-off"></i> iOS Style';
    toggleBtn.style.position = 'fixed';
    toggleBtn.style.bottom = '20px';
    toggleBtn.style.right = '20px';
    toggleBtn.style.zIndex = '1000';
    
    document.body.appendChild(toggleBtn);
    setupiOSToggle();
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(createStyleToggle, 500);
    });
  } else {
    setTimeout(createStyleToggle, 500);
  }

  // Toggle between standard and iOS style
  function toggleiOSStyle() {
    document.body.classList.toggle('ios-style');
    
    // Store preference in localStorage
    const isIOSStyle = document.body.classList.contains('ios-style');
    localStorage.setItem('ios_style_enabled', isIOSStyle);
    
    if (isIOSStyle) {
      applyiOSStyle();
    } else {
      removeIOSStyle();
    }
  }
  
  // Apply iOS styling to specific elements
  function applyiOSStyle() {
    console.log('Applying iOS style');
    
    // Convert all cards to iOS cards
    document.querySelectorAll('.card:not(.ios-converted)').forEach(card => {
      card.classList.add('ios-card', 'ios-converted');
    });
    
    // Convert buttons
    document.querySelectorAll('button:not(.ios-converted), .btn:not(.ios-converted)').forEach(button => {
      let buttonType = 'ios-button';
      
      // Determine button type based on existing classes
      if (button.classList.contains('btn-primary')) {
        buttonType += ' ios-button-primary';
      } else if (button.classList.contains('btn-success')) {
        buttonType += ' ios-button-success';
      } else if (button.classList.contains('btn-danger')) {
        buttonType += ' ios-button-danger';
      } else if (button.classList.contains('btn-warning')) {
        buttonType += ' ios-button-warning';
      } else if (button.classList.contains('btn-info')) {
        buttonType += ' ios-button-info';
      }
      
      button.classList.add(buttonType, 'ios-converted');
    });
    
    // Convert inputs
    document.querySelectorAll('input:not(.ios-converted), select:not(.ios-converted), textarea:not(.ios-converted)').forEach(input => {
      input.classList.add('ios-input', 'ios-converted');
    });
    
    // Convert header
    const header = document.querySelector('header');
    if (header && !header.classList.contains('ios-converted')) {
      header.classList.add('ios-header', 'ios-converted');
      
      // Make header title larger for iOS style
      const headerTitle = header.querySelector('h1, .navbar-brand');
      if (headerTitle) {
        headerTitle.classList.add('ios-header-title');
      }
    }
    
    // Convert chart containers
    document.querySelectorAll('.chart-container:not(.ios-converted)').forEach(chart => {
      chart.classList.add('ios-chart-container', 'ios-converted');
    });
    
    // Convert notifications
    document.querySelectorAll('.alert:not(.ios-converted), .notification:not(.ios-converted)').forEach(notification => {
      // Determine notification type
      let notificationType = 'ios-notification';
      
      if (notification.classList.contains('alert-success')) {
        notificationType += ' ios-notification-success';
      } else if (notification.classList.contains('alert-danger') || notification.classList.contains('alert-error')) {
        notificationType += ' ios-notification-error';
      } else if (notification.classList.contains('alert-warning')) {
        notificationType += ' ios-notification-warning';
      } else if (notification.classList.contains('alert-info')) {
        notificationType += ' ios-notification-info';
      }
      
      notification.classList.add(notificationType, 'ios-converted');
      
      // Restructure error notifications to iOS style if needed
      if (!notification.querySelector('.notification-content') && !notification.classList.contains('restructured')) {
        const content = notification.innerHTML;
        notification.innerHTML = '';
        
        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        icon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'notification-content';
        contentDiv.innerHTML = content;
        
        notification.appendChild(icon);
        notification.appendChild(contentDiv);
        notification.classList.add('restructured');
      }
    });
    
    // Convert loading indicators
    document.querySelectorAll('.loading-indicator:not(.ios-converted)').forEach(loader => {
      loader.classList.add('ios-loading', 'ios-converted');
      
      // Restructure to iOS style spinner if needed
      if (!loader.querySelector('.spinner') && !loader.classList.contains('restructured')) {
        const originalContent = loader.innerHTML;
        loader.innerHTML = '';
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        
        const textSpan = document.createElement('span');
        textSpan.textContent = 'Loading...';
        if (originalContent && originalContent.trim() !== 'Loading...') {
          textSpan.textContent = originalContent;
        }
        
        loader.appendChild(spinner);
        loader.appendChild(textSpan);
        loader.classList.add('restructured');
      }
    });
    
    // Convert progress bars
    document.querySelectorAll('.progress-bar:not(.ios-converted)').forEach(progressBar => {
      progressBar.classList.add('ios-progress', 'ios-converted');
    });
    
    // Create iOS-style KPI cards if Dashboard object exists
    if (typeof Dashboard !== 'undefined' && typeof Dashboard.createIOSStyleCards === 'function') {
      Dashboard.createIOSStyleCards();
    }
  }
  
  // Restore original styling
  function removeIOSStyle() {
    console.log('Removing iOS style');
    
    // Remove iOS classes from all converted elements
    document.querySelectorAll('.ios-converted').forEach(element => {
      element.classList.remove(
        'ios-card', 
        'ios-button', 
        'ios-button-primary', 
        'ios-button-success', 
        'ios-button-danger', 
        'ios-button-warning', 
        'ios-button-info',
        'ios-input',
        'ios-header',
        'ios-chart-container',
        'ios-notification',
        'ios-notification-success',
        'ios-notification-error',
        'ios-notification-warning',
        'ios-notification-info',
        'ios-loading',
        'ios-progress',
        'ios-converted'
      );
    });
    
    // Remove iOS KPI cards container if it exists
    const iosCardsContainer = document.getElementById('ios-kpi-cards-container');
    if (iosCardsContainer) {
      iosCardsContainer.remove();
    }
  }
  
  // Set up the iOS style toggle
  function setupiOSToggle() {
    const iosToggle = document.getElementById('ios-style-toggle');
    
    if (iosToggle) {
      iosToggle.addEventListener('click', () => {
        if (iosToggle.classList.contains('active')) {
          // Switching back to normal style
          iosToggle.classList.remove('active');
          iosToggle.innerHTML = '<i class="fas fa-toggle-off"></i> iOS Style';
          document.body.classList.remove('ios-style');
          removeIOSStyle();
        } else {
          // Switching to iOS style
          iosToggle.classList.add('active');
          iosToggle.innerHTML = '<i class="fas fa-toggle-on"></i> iOS Style';
          document.body.classList.add('ios-style');
          applyiOSStyle();
        }
      });
      
      // Check for saved preference and apply if needed
      const savedPreference = localStorage.getItem('iosStyle');
      if (savedPreference === 'true') {
        iosToggle.classList.add('active');
        iosToggle.innerHTML = '<i class="fas fa-toggle-on"></i> iOS Style';
        document.body.classList.add('ios-style');
        applyiOSStyle();
      }
    }
  }
})(); 