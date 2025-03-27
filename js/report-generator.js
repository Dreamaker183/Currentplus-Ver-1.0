/**
 * Current+ Enterprise ESG Analytics Platform
 * Report Generator JavaScript Module
 * 
 * This file handles PDF report generation, including:
 * - Creating ESG report summaries
 * - Exporting interactive charts
 * - Adding TCFD disclosure recommendations
 * - Customizable content options
 */

// Report generator constants
const REPORT_GENERATOR = {
  // Report styling
  styles: {
    header: {
      fontSize: 22,
      fontStyle: 'bold',
      textColor: [24, 144, 255]
    },
    subheader: {
      fontSize: 16,
      fontStyle: 'bold',
      textColor: [31, 41, 55]
    },
    section: {
      fontSize: 14,
      fontStyle: 'bold',
      textColor: [31, 41, 55]
    },
    text: {
      fontSize: 10,
      fontStyle: 'normal',
      textColor: [51, 51, 51]
    },
    chart: {
      width: 180,
      height: 100
    }
  },
  
  // Report sections
  sections: {
    cover: {
      title: 'AI-Generated ESG Report',
      subtitle: 'Current+ Enterprise ESG Analytics Platform',
      description: 'This report provides comprehensive insights into your organization\'s Environmental, Social, and Governance (ESG) performance using AI-powered analytics.'
    },
    summary: {
      title: 'Executive Summary',
      content: 'This report analyzes energy consumption data to determine your organization\'s sustainability performance and provides AI-driven recommendations for improvement.'
    },
    environmental: {
      title: 'Environmental Impact Analysis',
      metrics: ['Energy Consumption', 'Carbon Emissions', 'Renewable Energy Usage']
    },
    social: {
      title: 'Social Impact Assessment',
      metrics: ['Community Impact', 'Stakeholder Engagement', 'Labor Practices']
    },
    governance: {
      title: 'Governance Evaluation',
      metrics: ['Board Diversity', 'Ethics & Compliance', 'Transparency']
    },
    predictions: {
      title: 'AI Sustainability Predictions',
      description: 'Our AI model analyzes your current trends to predict future sustainability metrics and potential areas of improvement.'
    },
    recommendations: {
      title: 'AI-Powered Recommendations',
      description: 'Based on your data, our AI model suggests the following actions to improve your ESG performance:'
    }
  }
};

// --- Helper functions ---

// Ensure jsPDF is loaded (load dynamically if not available)
async function checkJsPDFLibrary() {
    if (typeof window.jspdf !== 'undefined') {
    return true;
    }
    
    console.log("jsPDF not found, attempting to load dynamically...");
    return await loadJsPDF();
}

// Dynamically load jsPDF library if not already loaded
async function loadJsPDF() {
  return new Promise((resolve, reject) => {
        if (typeof window.jspdf !== 'undefined') {
            console.log("jsPDF already loaded.");
            resolve(true);
            return;
        }
        
        try {
            // Check if script is already being loaded
            const existingScript = document.querySelector('script[src*="jspdf"]');
            if (existingScript) {
                existingScript.addEventListener('load', () => {
                    console.log("jsPDF loaded from existing script tag");
                    resolve(true);
                });
                existingScript.addEventListener('error', () => {
                    reject(new Error("Failed to load jsPDF from existing script"));
                });
        return;
      }
      
            // Add new script element for jsPDF
            const jsPdfScript = document.createElement('script');
            jsPdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            jsPdfScript.async = true;
            
            jsPdfScript.addEventListener('load', () => {
                console.log("jsPDF loaded dynamically");
                
                // Check for html2canvas
                const html2canvasExists = typeof html2canvas !== 'undefined';
                if (!html2canvasExists) {
                    console.log("html2canvas not found, loading dynamically...");
                    
                    const html2canvasScript = document.createElement('script');
                    html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                    html2canvasScript.async = true;
                    
                    html2canvasScript.addEventListener('load', () => {
                        console.log("html2canvas loaded dynamically");
                        resolve(true);
                    });
                    
                    html2canvasScript.addEventListener('error', () => {
                        reject(new Error("Failed to load html2canvas"));
                    });
                    
                    document.head.appendChild(html2canvasScript);
                } else {
                    resolve(true);
                }
            });
            
            jsPdfScript.addEventListener('error', () => {
                reject(new Error("Failed to load jsPDF"));
            });
            
            document.head.appendChild(jsPdfScript);
            
        } catch (error) {
            console.error("Error loading jsPDF:", error);
            reject(error);
        }
    });
}

// Format number with default precision and handle nulls/NaN
function formatNumber(value, precision = 1) {
    if (value === null || value === undefined || isNaN(value)) {
        return '0';
    }
    const number = parseFloat(value);
    return number.toFixed(precision);
}

// Ensure variable is defined with fallback
function ensureDefined(variable, defaultValue) {
    return (variable !== undefined && variable !== null) ? variable : defaultValue;
}

// Show loading indicator
function showLoading(text = 'Loading...') {
  const loadingIndicator = document.getElementById('loading-indicator');
  const loadingText = document.getElementById('loading-text');
  
  if (loadingIndicator && loadingText) {
    loadingText.textContent = text;
    loadingIndicator.classList.remove('hidden');
  }
}

// Hide loading indicator
function hideLoading() {
  const loadingIndicator = document.getElementById('loading-indicator');
  
  if (loadingIndicator) {
    loadingIndicator.classList.add('hidden');
  }
}

// Show error notification
function showError(message) {
    console.error("Error:", message);
  
  const errorNotification = document.getElementById('error-notification');
  const errorText = document.getElementById('error-text');
  
  if (errorNotification && errorText) {
    errorText.textContent = message;
    errorNotification.classList.remove('hidden');
    
    // Hide after 5 seconds
    setTimeout(() => {
      errorNotification.classList.add('hidden');
    }, 5000);
  }
}

// Show success notification
function showSuccessMessage(message) {
  const successNotification = document.getElementById('success-notification');
  const notificationText = document.getElementById('notification-text');
  
  if (successNotification && notificationText) {
    notificationText.textContent = message;
    successNotification.classList.remove('hidden');
    
    // Hide after 3 seconds
    setTimeout(() => {
      successNotification.classList.add('hidden');
    }, 3000);
  }
}

// Prepare data for report generation
function prepareReportData() {
    // Collect data from APP_STATE or DOM elements
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
    // Get values from APP_STATE if available (preferred) or DOM elements as fallback
    const getValueFromStateOrDOM = (stateKey, domId, fallback) => {
        // Check if we have window.APP_STATE and the key exists
        if (window.APP_STATE && window.APP_STATE[stateKey] !== undefined) {
            return window.APP_STATE[stateKey];
        }
        
        // Otherwise try to get from DOM
        const element = document.getElementById(domId);
    return element ? (element.textContent || fallback) : fallback;
  };
    
    // Get energy usage from APP_STATE.currentData or DOM
    let energyUsage = '0';
    if (window.APP_STATE && window.APP_STATE.currentData && window.CONFIG) {
        energyUsage = window.APP_STATE.currentData[window.CONFIG.thingspeak.fieldMap.energyUsage] || '0';
    } else {
        energyUsage = document.getElementById('energyUsage')?.textContent || '0';
    }
    
    // Get carbon emissions from calculation or DOM
    let carbonEmissions = '0';
    if (window.APP_STATE && window.APP_STATE.currentData && window.CONFIG) {
        const energy = window.APP_STATE.currentData[window.CONFIG.thingspeak.fieldMap.energyUsage] || 0;
        carbonEmissions = (energy * (window.CONFIG.carbonFactor || 0.71)).toFixed(2);
    } else {
        carbonEmissions = document.getElementById('carbonEmissions')?.textContent || '0';
    }
  
  return {
    date: currentDate,
    companyName: 'Your Company',
    energyData: {
            consumption: energyUsage,
      unit: 'kWh',
    },
    carbonData: {
            emissions: carbonEmissions, 
      unit: 'kg CO₂',
    },
    esgScore: {
            overall: getValueFromStateOrDOM('aiPredictions.sustainabilityScore', 'aiSustainabilityScore', '0'),
            rating: getValueFromStateOrDOM('esgRating.grade', 'esgRating', 'N/A'),
    },
    environmental: {
            score: getValueFromStateOrDOM('aiPredictions.environmentalScore', 'envScoreValue', '0'),
            waterUsage: getValueFromStateOrDOM('waterUsage', 'waterUsage', '0'),
    },
    social: {
            score: getValueFromStateOrDOM('aiPredictions.socialScore', 'socialScoreValue', '0'),
    },
    governance: {
            score: getValueFromStateOrDOM('aiPredictions.governanceScore', 'govScoreValue', '0'),
        },
        aiRecommendation: getValueFromStateOrDOM('recommendations[0]', 'aiRecommendation', ''),
        carbonForecast: getValueFromStateOrDOM('forecast.carbon[0]', 'carbonForecast', '0')
    };
}

// --- Main PDF generation functions ---

async function addElementScreenshot(doc, elementId, yPosition) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`[addElementScreenshot] Element with ID #${elementId} not found.`);
        // Optionally add text to the PDF indicating the element was missing
        doc.setTextColor(250, 173, 20); // Warning color
        doc.text(`Warning: Report section '#${elementId}' could not be found in the HTML.`, 15, yPosition);
        doc.setTextColor(200); // Reset color
        return yPosition + 10; // Return Y position below the warning
    }

    console.log(`[addElementScreenshot] Attempting to capture element #${elementId}`);
    try {
        const canvas = await html2canvas(element, {
            backgroundColor: '#111827', // Dark background for consistency
            useCORS: true,
            scale: 2, // Better resolution
            logging: false // Disable html2canvas internal logs unless debugging it specifically
        });
        console.log(`[addElementScreenshot] Canvas generated for #${elementId}, size: ${canvas.width}x${canvas.height}`);
        const imgData = canvas.toDataURL('image/png');

        // Basic check if image data seems valid (not foolproof)
        if (!imgData || imgData.length < 100 || imgData === 'data:,') {
            throw new Error("Generated image data appears empty or invalid.");
        }

        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth() - 30; // Page width with margins
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // Check if it fits, add new page if necessary
        const spaceNeeded = pdfHeight + 10; // Image height + bottom margin
        const spaceAvailable = doc.internal.pageSize.getHeight() - yPosition - 15; // Space left to bottom margin

        if (spaceNeeded > spaceAvailable) {
            console.log(`[addElementScreenshot] Adding new page for #${elementId}`);
            doc.addPage();
            yPosition = 45; // Reset Y position for new page (below header)
            // Optional: Add header to new page if desired for multi-page elements
            addHeader(doc, `ESG Report Summary (cont.)`);
        }

        console.log(`[addElementScreenshot] Adding image for #${elementId} at Y=${yPosition}`);
        doc.addImage(imgData, 'PNG', 15, yPosition, pdfWidth, pdfHeight);
        return yPosition + pdfHeight + 10; // Return new Y position below the added image + margin

    } catch (error) {
        console.error(`[addElementScreenshot] Error capturing or adding element #${elementId}:`, error);
        // Add specific error message to the PDF
        const errorY = yPosition;
        if (errorY + 10 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); yPosition = 45; } // Check space for error msg
        doc.setTextColor(245, 34, 45); // Danger color
        doc.text(`Error generating screenshot for report section '#${elementId}'. Check console.`, 15, yPosition);
        doc.setTextColor(200); // Reset color
        // Return Y position below the error message
        return yPosition + 10;
    }
}

/**
 * Downloads the ESG report as a PDF
 */
async function downloadReportPDF() {
    console.log('[downloadReportPDF] Starting PDF generation');
    
    try {
        // Check for required libraries
        if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
            await loadJsPDF();
            if (typeof html2canvas === 'undefined') {
                throw new Error("html2canvas library is required but not available");
            }
        }
        
        // Show loading while generating the report
        showLoading('Generating ESG Report...');
        
        // Prepare data for the report
        const reportData = prepareReportData();
        console.log('[downloadReportPDF] Report data prepared:', reportData);
        
        // Create PDF document - A4 size (standard corporate size for reports)
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true // Enable compression for smaller file size
        });
        
        // Add professional header with report date
        addHeader(doc, "Current+ ESG Analytics Report");
        let yPosition = 45; // Starting Y position after header
        
        // Add executive summary section
        doc.setFontSize(16);
        doc.setTextColor(44, 62, 80); // Dark blue-gray
        doc.text("Executive Summary", 15, yPosition);
        yPosition += 10;
        
        doc.setFontSize(11);
        doc.setTextColor(44, 62, 80); // Dark blue-gray
        const summaryText = [
            "This report summarizes your organization's ESG performance metrics for the current period.",
            `The data shows overall energy consumption of ${reportData.energyData.consumption} kWh with associated`,
            `carbon emissions of ${reportData.carbonData.emissions} kg CO2e.`,
            `Your current ESG rating is ${reportData.esgScore.rating} with an AI Sustainability Score of ${reportData.esgScore.overall}.`
        ];
        
        for (const line of summaryText) {
            doc.text(line, 15, yPosition);
            yPosition += 6;
        }
        yPosition += 5;
        
        // Key Performance Indicators section with professional styling
        doc.setFontSize(16);
        doc.setTextColor(44, 62, 80);
        doc.text("Key Performance Indicators", 15, yPosition);
        yPosition += 10;
        
        // Create a KPI section with rounded rectangles
        const kpiData = [
            { label: "Energy Consumption", value: `${reportData.energyData.consumption} kWh`, color: [1, 118, 211] }, // PowerBI blue
            { label: "AI Sustainability Score", value: `${reportData.esgScore.overall}/100`, color: [114, 46, 209] }, // Purple
            { label: "Carbon Emissions", value: `${reportData.carbonData.emissions} kg CO2e`, color: [16, 137, 62] }, // Green
            { label: "ESG Rating", value: reportData.esgScore.rating, color: [241, 127, 36] } // Orange
        ];
        
        // Create a 2x2 grid for KPIs
        const pageWidth = doc.internal.pageSize.getWidth();
        const kpiWidth = (pageWidth - 30 - 10) / 2; // Width for each KPI rectangle (30mm margins, 10mm gap)
        const kpiHeight = 16;
        const kpiGap = 10;
        
        for (let i = 0; i < kpiData.length; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            const x = 15 + (col * (kpiWidth + kpiGap));
            const y = yPosition + (row * (kpiHeight + kpiGap));
            
            // Draw rounded rectangle with KPI color
            doc.setFillColor(...kpiData[i].color, 0.1); // Light background
            doc.setDrawColor(...kpiData[i].color); // Border color
            doc.roundedRect(x, y, kpiWidth, kpiHeight, 3, 3, 'FD'); // Filled with border
            
            // Add KPI label
            doc.setTextColor(100, 116, 139); // Slate color
            doc.setFontSize(9);
            doc.text(kpiData[i].label, x + 5, y + 5);
            
            // Add KPI value
            doc.setTextColor(...kpiData[i].color);
            doc.setFontSize(13);
            doc.setFont(undefined, 'bold');
            doc.text(kpiData[i].value, x + 5, y + 13);
            doc.setFont(undefined, 'normal');
        }
        
        yPosition += 2 * (kpiHeight + kpiGap) + 5; // Move below KPI section
        
        // ESG Breakdown - capture screenshot if element exists
        if (document.getElementById('reportSummary')) {
    doc.setFontSize(16);
            doc.setTextColor(44, 62, 80);
            doc.text("ESG Score Breakdown", 15, yPosition);
            yPosition += 10;
            
            // Add ESG breakdown data
            yPosition = await addElementScreenshot(doc, 'reportSummary', yPosition);
            yPosition += 5;
            
            // Note about PowerBI integration
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text("For enhanced visualizations, export this data to PowerBI using the 'Export to PowerBI' feature", 15, yPosition);
            yPosition += 10;
        }
        
        // AI Recommendations section
        doc.setFontSize(16);
        doc.setTextColor(44, 62, 80);
        doc.text("AI Insights & Recommendations", 15, yPosition);
        yPosition += 10;
        
        // Check if we need to add a new page
        if (yPosition > doc.internal.pageSize.getHeight() - 50) {
            doc.addPage();
            addHeader(doc, "Current+ ESG Analytics Report (cont.)");
            yPosition = 45;
        }
        
        // Add AI insights - simple representation
        doc.setDrawColor(114, 46, 209); // Purple for AI
        doc.setFillColor(114, 46, 209, 0.1);
        doc.roundedRect(15, yPosition, pageWidth - 30, 35, 3, 3, 'FD');
        
        // Add AI icon (simplified representation)
        doc.setFillColor(114, 46, 209, 0.8);
        doc.circle(25, yPosition + 10, 5, 'F');
        
        // Add AI recommendation text
        doc.setTextColor(44, 62, 80);
        doc.setFontSize(11);
        doc.text("AI RECOMMENDATION", 35, yPosition + 7);
        
        doc.setFontSize(10);
        doc.setTextColor(44, 62, 80);
        const aiText = `Based on your current energy usage patterns, we recommend optimizing HVAC 
operating hours during off-peak times. This could reduce consumption by approximately 
8-10% and improve your ESG rating to ${reportData.esgScore.rating === 'B+' ? 'A-' : 'A'} within the next reporting period.`;
        
        doc.text(aiText, 35, yPosition + 12, { maxWidth: pageWidth - 50 });
        yPosition += 40;
        
        // PowerBI integration section
        doc.setFontSize(16);
        doc.setTextColor(44, 62, 80);
        doc.text("PowerBI Integration Guide", 15, yPosition);
        yPosition += 10;
        
        // Add PowerBI info
        doc.setDrawColor(1, 118, 211); // PowerBI blue
        doc.setFillColor(1, 118, 211, 0.1);
        doc.roundedRect(15, yPosition, pageWidth - 30, 40, 3, 3, 'FD');
        
        doc.setTextColor(1, 118, 211); // PowerBI blue
        doc.setFontSize(11);
        doc.text("ENHANCED VISUALIZATION WITH POWERBI", 25, yPosition + 7);
        
        doc.setFontSize(10);
        doc.setTextColor(44, 62, 80);
        const powerbiText = `Export your ESG data to Microsoft PowerBI for advanced analytics and customized dashboards.
        
1. Use the 'Export to PowerBI' button in the Analytics dashboard
2. Import the JSON file into PowerBI Desktop
3. Utilize our pre-built ESG templates or create your own visualizations
        
For assistance with PowerBI integration, contact your Current+ administrator.`;
        
        doc.text(powerbiText, 25, yPosition + 12, { maxWidth: pageWidth - 50 });
        
        // Add footer with page numbers
        addFooter(doc);
        
        // Save PDF with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `Current_ESG_Report_${timestamp}.pdf`;
        
        // Download the PDF file
        doc.save(filename);
        
        console.log('[downloadReportPDF] PDF report generated successfully');
        hideLoading();
        showSuccessMessage('ESG Report downloaded successfully!');
        
        return true;
    } catch (error) {
        console.error('[downloadReportPDF] Error generating PDF:', error);
        hideLoading();
        showError('Failed to generate report: ' + error.message);
        
        // Try to recover and provide alternatives
        setTimeout(() => {
            if (confirm('Would you like to try generating a simplified report instead?')) {
                generateESGReport({ simplified: true });
            }
        }, 1000);
        
        return false;
    }
}

// Generate full ESG report with customizable sections
async function generateESGReport(options = {}) {
    console.log("Generate Full ESG Report requested. Options:", options);
    showLoading("Generating Full ESG report...");
    
    const {
        includePredictions = true,
        includeCharts = true,
        includeRecommendations = true
    } = options;
    
    try {
        // Check if the required libraries are available
        const jsPdfReady = await checkJsPDFLibrary();
        if (!jsPdfReady) {
            throw new Error("Failed to load PDF generation libraries");
        }
        
        if (typeof window.jspdf === 'undefined' || typeof html2canvas === 'undefined') {
            throw new Error("PDF libraries not available. Please refresh and try again.");
        }
        
        const { jsPDF } = window.jspdf;
        
        // Collect data
        const reportData = prepareReportData();
        console.log("[Full Report] Report data prepared:", reportData);
        
        // Create PDF document
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        let currentY = 45; // Start Y position after header
        
        // --- Page 1: Title and Summary ---
        console.log("[Full Report] 1. Adding Header & KPIs");
        addHeader(doc, `ESG Performance Report - ${reportData.date}`);
        
        doc.setFontSize(14); 
        doc.setTextColor(220); 
        doc.text('Key Performance Indicators', 15, currentY); 
        currentY += 8;
        
  doc.setFontSize(10);
        doc.setTextColor(180);
        doc.text(`Energy Consumption: ${reportData.energyData.consumption} ${reportData.energyData.unit}`, 20, currentY); 
        doc.text(`AI Score: ${reportData.esgScore.overall} / 100`, 110, currentY); 
        currentY += 6;
        doc.text(`Carbon Emissions: ${reportData.carbonData.emissions} ${reportData.carbonData.unit}`, 20, currentY); 
        doc.text(`ESG Rating: ${reportData.esgScore.rating}`, 110, currentY); 
        currentY += 10;
        
        console.log("[Full Report] 2. Adding ESG Summary Screenshot");
        if (document.getElementById('reportSummary')) {
            doc.setFontSize(14); 
            doc.setTextColor(220); 
            doc.text('ESG Breakdown', 15, currentY); 
            currentY += 5;
            currentY = await addElementScreenshot(doc, 'reportSummary', currentY);
            console.log(` -> Summary screenshot done. New Y: ${currentY}`);
        } else { 
            console.warn("[Full Report] #reportSummary not found."); 
            doc.setTextColor(250, 173, 20); // Warning color
            doc.text("Warning: ESG Breakdown section could not be captured.", 15, currentY);
            doc.setTextColor(200); // Reset color
            currentY += 10; 
        }
        
        // --- Charts ---
        if (includeCharts) {
            console.log("[Full Report] 3. Adding Charts");
            // Check if space needed on new page
            if (currentY + 60 > doc.internal.pageSize.getHeight() - 15) { // Rough estimate for chart height
                doc.addPage(); 
                currentY = 45; 
                addHeader(doc, 'Data Visualizations');
            } else if (currentY > 45) { // Add space if not on a fresh page
                currentY += 5;
            }
            
            const energyChartElement = document.getElementById('energyChart');
            if (energyChartElement) {
                doc.setFontSize(12); 
                doc.setTextColor(200); 
                doc.text('Energy Consumption Trend (kWh)', 15, currentY); 
                currentY += 5;
                currentY = await addElementScreenshot(doc, 'energyChart', currentY);
                console.log(` -> Energy chart done. New Y: ${currentY}`);
            } else { 
                console.warn("[Full Report] #energyChart not found."); 
                doc.setTextColor(250, 173, 20); // Warning color
                doc.text("Warning: Energy Chart could not be captured.", 15, currentY);
                doc.setTextColor(200); // Reset color
                currentY += 10;
            }
            
            // Check space again before carbon chart
            if (currentY + 60 > doc.internal.pageSize.getHeight() - 15) {
                doc.addPage(); 
                currentY = 45; 
                addHeader(doc, 'Data Visualizations (cont.)');
            } else if (currentY > 45) {
                currentY += 5;
            }
            
            const carbonChartElement = document.getElementById('carbonChart');
            if (carbonChartElement) {
                doc.setFontSize(12); 
                doc.setTextColor(200); 
                doc.text('Carbon Emissions Analysis (kg CO₂)', 15, currentY); 
                currentY += 5;
                currentY = await addElementScreenshot(doc, 'carbonChart', currentY);
                console.log(` -> Carbon chart done. New Y: ${currentY}`);
            } else { 
                console.warn("[Full Report] #carbonChart not found."); 
                doc.setTextColor(250, 173, 20); // Warning color
                doc.text("Warning: Carbon Chart could not be captured.", 15, currentY);
                doc.setTextColor(200); // Reset color
                currentY += 10;
            }
        }
        
        // --- AI Predictions & Recommendations ---
        if (includePredictions || includeRecommendations) {
            console.log("[Full Report] 4. Adding AI Insights");
            // Check space, add new page if necessary
            if (currentY + 40 > doc.internal.pageSize.getHeight() - 15) { // Estimate space
                doc.addPage(); 
                currentY = 45; 
                addHeader(doc, 'AI-Powered Insights');
            } else if (currentY > 45) {
                currentY += 10; // Add space if adding to existing page
            }
            
            if (includePredictions) {
                doc.setFontSize(12); 
                doc.setTextColor(200); 
                doc.text('Forecasts & Efficiency', 15, currentY); 
                currentY += 8;
  doc.setFontSize(10);
                doc.setTextColor(180);
                
                // Get carbon forecast and change data
                let carbonForecast = reportData.carbonForecast;
                let carbonForecastChange = '0';
                
                // Check for window.APP_STATE.forecast for more accurate data
                if (window.APP_STATE && window.APP_STATE.forecast && window.APP_STATE.forecast.carbon) {
                    carbonForecast = window.APP_STATE.forecast.carbon[0] || carbonForecast;
                    
                    // Calculate change if we have both current and forecast
                    if (window.APP_STATE.currentData && window.CONFIG) {
                        const currentEnergy = window.APP_STATE.currentData[window.CONFIG.thingspeak.fieldMap.energyUsage] || 0;
                        const currentCarbon = currentEnergy * (window.CONFIG.carbonFactor || 0.71);
                        
                        if (currentCarbon > 0) {
                            carbonForecastChange = ((carbonForecast - currentCarbon) / currentCarbon * 100).toFixed(1);
                        }
                    }
                }
                
                doc.text(`Carbon Forecast (Next Month): ${carbonForecast} kg CO₂ (${carbonForecastChange}%)`, 20, currentY); 
                currentY += 6;
                
                // Get efficiency score
                let efficiencyScore = '75'; // Default fallback
                const efficiencyScoreElem = document.getElementById('efficiencyScore');
                if (efficiencyScoreElem) {
                    const scoreText = efficiencyScoreElem.textContent;
                    const match = scoreText.match(/(\d+)/);
                    if (match) {
                        efficiencyScore = match[1];
                    }
                }
                
                doc.text(`Energy Efficiency Score: ${efficiencyScore} / 100`, 20, currentY); 
                currentY += 10;
                console.log(" -> Predictions added.");
            }
            
            if (includeRecommendations && reportData.aiRecommendation && reportData.aiRecommendation !== "Loading AI recommendations...") {
                doc.setFontSize(12); 
                doc.setTextColor(200); 
                doc.text('AI Recommendation', 15, currentY); 
                currentY += 7;
                doc.setFontSize(10); 
                doc.setTextColor(180);
                const recommendationsText = doc.splitTextToSize(reportData.aiRecommendation, doc.internal.pageSize.getWidth() - 40);
                doc.text(recommendationsText, 20, currentY);
                currentY += (recommendationsText.length * 4) + 5;
                console.log(" -> Recommendation added.");
            } else if (includeRecommendations) {
                doc.setFontSize(10); 
                doc.setTextColor(150); 
                doc.text('AI Recommendation data not available or still loading.', 15, currentY); 
                currentY += 10;
                console.log(" -> AI Recommendation not available.");
            }
        }
        
        // --- Final Touches ---
        console.log("[Full Report] 5. Adding Footer");
        addFooter(doc);
        console.log("[Full Report] 6. Saving PDF Document");
        doc.save(`CurrentPlus_ESG_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        showSuccessMessage("Full ESG Report generated successfully!");
        
      } catch (error) {
        console.error("!!! Unexpected Error generating full PDF:", error);
        showError(`Full PDF Generation Failed: ${error.message}. See console.`);
    } finally {
        console.log("[Full Report] 7. Hiding loading indicator.");
        hideLoading();
    }
}

// Add header to PDF
function addHeader(doc, title) {
  // Professional corporate styling with blue accent color
  doc.setFillColor(24, 144, 255, 0.1);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 40, 'F');
  
  // Add logo placeholder (could be replaced with company logo)
  doc.setDrawColor(24, 144, 255);
  doc.setFillColor(24, 144, 255);
  doc.circle(25, 20, 8, 'FD');
  doc.setTextColor(255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.text('C+', 21, 23);
  
  // Add report title with professional styling
  doc.setFont(undefined, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(44, 62, 80); // Dark blue-gray for professional look
  doc.text('Current+ ESG Analytics', 40, 20);
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139); // Lighter slate for subtitle
  doc.text(title, 40, 30);
  
  // Add horizontal divider line
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 45, doc.internal.pageSize.getWidth() - 15, 45);
  
  // Add watermark "CONFIDENTIAL" for professional reports
  doc.setTextColor(226, 232, 240, 0.3); // Very light gray, mostly transparent
  doc.setFontSize(60);
  doc.setFont(undefined, 'bold');
  doc.text('CONFIDENTIAL', doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() / 2, {
    align: 'center',
    angle: 45
  });
  
  // Reset text color for main content
  doc.setTextColor(44, 62, 80);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
}

// Add footer to PDF
function addFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
  // Add footer to each page
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
    // Add bottom colored bar
    doc.setFillColor(241, 245, 249, 0.7); // Very light gray with transparency
    doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
    
    // Add company info
      doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate gray for footer text
    doc.text('Current+ ESG Analytics Platform', 15, pageHeight - 15);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | ${new Date().toLocaleTimeString()}`, 15, pageHeight - 8);
    
    // Add page numbers
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 15, { align: 'right' });
    
    // Add disclaimer
    const disclaimer = 'Confidential - For internal use only';
    doc.text(disclaimer, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }
}

// Make functions available globally
window.downloadReportPDF = downloadReportPDF;
window.generateESGReport = generateESGReport; 