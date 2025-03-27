/**
 * DOM Safe - A utility to safely handle DOM operations
 * Prevents "Cannot read properties of null" errors by adding safety checks
 */

(function() {
  'use strict';

  // Create the global domSafe object
  window.domSafe = {
    /**
     * Safely get an element by ID with logging
     * @param {string} id - Element ID
     * @param {boolean} logError - Whether to log error when element not found
     * @returns {HTMLElement|null} - Element or null if not found
     */
    getElement: function(id, logError = true) {
      if (!id) return null;
      
      const element = document.getElementById(id);
      
      if (!element && logError) {
        console.warn(`DOM element not found: #${id}`);
      }
      
      return element;
    },
    
    /**
     * Safely get elements by a CSS selector
     * @param {string} selector - CSS selector
     * @returns {NodeList} - Node list of matching elements (empty if error)
     */
    getElements: function(selector) {
      if (!selector) return [];
      
      try {
        return document.querySelectorAll(selector);
      } catch (e) {
        console.warn(`Error selecting elements with: ${selector}`, e);
        return [];
      }
    },
    
    /**
     * Safely set text content of an element
     * @param {string|HTMLElement} idOrElement - Element ID or element
     * @param {string} text - Text to set
     * @returns {boolean} - Success status
     */
    setText: function(idOrElement, text) {
      let element = null;
      
      if (typeof idOrElement === 'string') {
        element = this.getElement(idOrElement);
      } else {
        element = idOrElement;
      }
      
      if (!element) return false;
      
      try {
        element.textContent = text;
        return true;
      } catch (e) {
        console.warn(`Error setting text for element`, e);
        return false;
      }
    },
    
    /**
     * Safely set HTML content of an element
     * @param {string|HTMLElement} idOrElement - Element ID or element
     * @param {string} html - HTML to set
     * @returns {boolean} - Success status
     */
    setHTML: function(idOrElement, html) {
      let element = null;
      
      if (typeof idOrElement === 'string') {
        element = this.getElement(idOrElement);
      } else {
        element = idOrElement;
      }
      
      if (!element) return false;
      
      try {
        element.innerHTML = html;
        return true;
      } catch (e) {
        console.warn(`Error setting HTML for element`, e);
        return false;
      }
    },
    
    /**
     * Safely add, remove, or toggle a class
     * @param {string|HTMLElement} idOrElement - Element ID or element
     * @param {string} className - Class name
     * @param {boolean|null} force - If boolean, forces add or remove
     * @returns {boolean} - Success status
     */
    toggleClass: function(idOrElement, className, force) {
      let element = null;
      
      if (typeof idOrElement === 'string') {
        element = this.getElement(idOrElement);
      } else {
        element = idOrElement;
      }
      
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
        console.warn(`Error toggling class "${className}" for element`, e);
        return false;
      }
    },
    
    /**
     * Safely add event listener
     * @param {string|HTMLElement} idOrElement - Element ID or element
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     * @returns {boolean} - Success status
     */
    addEvent: function(idOrElement, event, callback) {
      let element = null;
      
      if (typeof idOrElement === 'string') {
        element = this.getElement(idOrElement);
      } else {
        element = idOrElement;
      }
      
      if (!element) return false;
      
      try {
        element.addEventListener(event, callback);
        return true;
      } catch (e) {
        console.warn(`Error adding ${event} event for element`, e);
        return false;
      }
    },
    
    /**
     * Safely get input value
     * @param {string|HTMLElement} idOrElement - Element ID or element
     * @param {*} defaultValue - Default value if element not found
     * @returns {*} - Element value or default value
     */
    getValue: function(idOrElement, defaultValue = '') {
      let element = null;
      
      if (typeof idOrElement === 'string') {
        element = this.getElement(idOrElement);
      } else {
        element = idOrElement;
      }
      
      if (!element) return defaultValue;
      
      try {
        return element.value;
      } catch (e) {
        console.warn(`Error getting value for element`, e);
        return defaultValue;
      }
    },
    
    /**
     * Safely set input value
     * @param {string|HTMLElement} idOrElement - Element ID or element
     * @param {*} value - Value to set
     * @returns {boolean} - Success status
     */
    setValue: function(idOrElement, value) {
      let element = null;
      
      if (typeof idOrElement === 'string') {
        element = this.getElement(idOrElement);
      } else {
        element = idOrElement;
      }
      
      if (!element) return false;
      
      try {
        element.value = value;
        return true;
      } catch (e) {
        console.warn(`Error setting value for element`, e);
        return false;
      }
    },
    
    /**
     * Safely set style properties
     * @param {string|HTMLElement} idOrElement - Element ID or element
     * @param {string} property - CSS property name
     * @param {string} value - CSS property value
     * @returns {boolean} - Success status
     */
    setStyle: function(idOrElement, property, value) {
      let element = null;
      
      if (typeof idOrElement === 'string') {
        element = this.getElement(idOrElement);
      } else {
        element = idOrElement;
      }
      
      if (!element) return false;
      
      try {
        element.style[property] = value;
        return true;
      } catch (e) {
        console.warn(`Error setting style "${property}" for element`, e);
        return false;
      }
    },
    
    /**
     * Safely show or hide an element
     * @param {string|HTMLElement} idOrElement - Element ID or element
     * @param {boolean} show - Whether to show or hide
     * @returns {boolean} - Success status
     */
    display: function(idOrElement, show) {
      if (show) {
        return this.setStyle(idOrElement, 'display', '');
      } else {
        return this.setStyle(idOrElement, 'display', 'none');
      }
    }
  };
  
  // Log to confirm loading
  console.log('DOM Safe utility loaded');
  
  // Handle any errors in the script
})(); 