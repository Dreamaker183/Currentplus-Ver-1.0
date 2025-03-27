/**
 * Current+ Enterprise ESG Analytics Platform
 * Loader JavaScript Module
 * 
 * This file handles the proper loading sequence of all dependencies
 * and ensures that libraries are available before the application starts.
 */

// Track loaded dependencies
const DEPENDENCIES = {
  chartjs: false,
  tensorflowjs: false,
  jspdf: false,
  html2canvas: false
};

// Dependency URLs
const DEPENDENCY_URLS = {
  chartjs: 'https://cdn.jsdelivr.net/npm/chart.js',
  tensorflowjs: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.2.0/dist/tf.min.js',
  jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
};

// Main loader function
function loadDependencies() {
  return new Promise((resolve, reject) => {
    console.log("Starting dependency loading...");
    
    // Check which dependencies are already loaded
    if (typeof Chart !== 'undefined') DEPENDENCIES.chartjs = true;
    if (typeof tf !== 'undefined') DEPENDENCIES.tensorflowjs = true;
    if (typeof window.jspdf !== 'undefined') DEPENDENCIES.jspdf = true;
    if (typeof html2canvas !== 'undefined') DEPENDENCIES.html2canvas = true;
    
    // Track progress
    let loadingCount = 0;
    const requiredDependencies = Object.keys(DEPENDENCIES).filter(dep => !DEPENDENCIES[dep]);
    const totalToLoad = requiredDependencies.length;
    
    if (totalToLoad === 0) {
      console.log("All dependencies already loaded");
      resolve();
      return;
    }
    
    // Function to update loading progress
    function updateProgress() {
      loadingCount++;
      console.log(`Loading dependencies: ${loadingCount}/${totalToLoad}`);
      
      if (loadingCount === totalToLoad) {
        console.log("All dependencies loaded successfully");
        resolve();
      }
    }
    
    // Load Chart.js if needed
    if (!DEPENDENCIES.chartjs) {
      const script = document.createElement('script');
      script.src = DEPENDENCY_URLS.chartjs;
      script.async = true;
      script.onload = () => {
        console.log("Chart.js loaded");
        DEPENDENCIES.chartjs = true;
        updateProgress();
      };
      script.onerror = (e) => {
        console.error("Failed to load Chart.js", e);
        reject(new Error("Failed to load Chart.js"));
      };
      document.head.appendChild(script);
    }
    
    // Load TensorFlow.js if needed
    if (!DEPENDENCIES.tensorflowjs) {
      const script = document.createElement('script');
      script.src = DEPENDENCY_URLS.tensorflowjs;
      script.async = true;
      script.onload = () => {
        console.log("TensorFlow.js loaded");
        DEPENDENCIES.tensorflowjs = true;
        updateProgress();
      };
      script.onerror = (e) => {
        console.error("Failed to load TensorFlow.js", e);
        reject(new Error("Failed to load TensorFlow.js"));
      };
      document.head.appendChild(script);
    }
    
    // Load jsPDF if needed
    if (!DEPENDENCIES.jspdf) {
      const script = document.createElement('script');
      script.src = DEPENDENCY_URLS.jspdf;
      script.async = true;
      script.onload = () => {
        console.log("jsPDF loaded");
        DEPENDENCIES.jspdf = true;
        updateProgress();
      };
      script.onerror = (e) => {
        console.error("Failed to load jsPDF", e);
        reject(new Error("Failed to load jsPDF"));
      };
      document.head.appendChild(script);
    }
    
    // Load html2canvas if needed
    if (!DEPENDENCIES.html2canvas) {
      const script = document.createElement('script');
      script.src = DEPENDENCY_URLS.html2canvas;
      script.async = true;
      script.onload = () => {
        console.log("html2canvas loaded");
        DEPENDENCIES.html2canvas = true;
        updateProgress();
      };
      script.onerror = (e) => {
        console.error("Failed to load html2canvas", e);
        reject(new Error("Failed to load html2canvas"));
      };
      document.head.appendChild(script);
    }
  });
}

// Initialize application after dependencies are loaded
async function initializeApp() {
  console.log("Initializing CurrentPlus ESG Application...");
  
  // Show loading indicator
  const loadingIndicator = document.getElementById('loading-indicator');
  const loadingText = document.getElementById('loading-text');
  
  if (loadingIndicator && loadingText) {
    loadingText.textContent = "Loading application...";
    loadingIndicator.classList.remove('hidden');
  }
  
  try {
    // First, load all required dependencies
    await loadDependencies();
    
    // Then, if main.js is not already handling initialization
    // We can trigger our own initialization here
    if (typeof initializeApp !== 'function') {
      // Create and dispatch a custom event to notify that dependencies are loaded
      const event = new CustomEvent('dependenciesLoaded');
      document.dispatchEvent(event);
    }
    
    console.log("Application initialized successfully");
    
  } catch (error) {
    console.error("Failed to initialize application:", error);
    
    // Show error notification
    const errorNotification = document.getElementById('error-notification');
    const errorText = document.getElementById('error-text');
    
    if (errorNotification && errorText) {
      errorText.textContent = `Failed to load application: ${error.message}`;
      errorNotification.classList.remove('hidden');
    }
  } finally {
    // Hide loading indicator
    if (loadingIndicator) {
      loadingIndicator.classList.add('hidden');
    }
  }
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Make loader functions available globally
window.loadDependencies = loadDependencies; 