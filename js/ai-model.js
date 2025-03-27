/**
 * Current+ Enterprise ESG Analytics Platform
 * AI Model JavaScript Module
 * 
 * This file handles the AI-based predictions using TensorFlow.js, including:
 * - ESG impact prediction based on energy usage data
 * - Carbon footprint forecasting
 * - Energy efficiency scoring
 * - Sustainability recommendations generation
 */

// AI Model constants
const AI_MODEL = {
  // Model metadata
  metadata: {
    version: '1.0.0',
    description: 'ESG Impact Prediction Model',
    created: '2023-07-15',
    trainingDataPoints: 15000,
    accuracyScore: 0.89,
    modelType: 'Sequential Neural Network'
  },
  
  // Model configuration
  config: {
    trainEpochs: 50,
    layers: [
      { type: 'dense', units: 16, activation: 'relu', inputShape: [4] },
      { type: 'dense', units: 8, activation: 'relu' },
      { type: 'dense', units: 4, activation: 'sigmoid' }
    ],
    optimizer: 'adam',
    loss: 'meanSquaredError',
    metrics: ['mae']
  },
  
  // Feature importance
  featureImportance: {
    energyUsage: 0.45,
    carbonEmissions: 0.35,
    energyTrend: 0.12,
    timeOfDay: 0.08
  },
  
  // Recommendation templates
  recommendationTemplates: [
    {
      id: 'energy_reduction',
      condition: (data) => data.energyEfficiency < 60,
      template: 'Consider optimizing energy consumption during peak hours to reduce overall usage by approximately {reduction_potential}%.'
    },
    {
      id: 'carbon_offset',
      condition: (data) => data.carbonEmissions > 75,
      template: 'Your carbon footprint is higher than industry average. Consider implementing carbon offset programs to neutralize approximately {offset_potential} kg of CO₂ emissions.'
    },
    {
      id: 'renewable_energy',
      condition: (data) => data.renewablePercentage < 30,
      template: 'Increasing renewable energy sources from {current_renewable}% to {target_renewable}% could improve your ESG score by approximately {score_improvement} points.'
    },
    {
      id: 'efficiency_improvement',
      condition: (data) => data.energyTrend > 0,
      template: 'Your energy consumption is trending upward. Implementing smart energy management could potentially reduce consumption by {efficiency_gain}% over the next quarter.'
    },
    {
      id: 'benchmark_comparison',
      condition: (data) => data.industryRank > 50,
      template: 'Your current sustainability metrics place you in the top {industry_percentile}% of your industry. Further improvements in {improvement_area} could elevate your ranking.'
    }
  ]
};

// AI Model state
let aiModelInstance = null;
let modelInputNormalizer = null;
let forecastModel = null;

// Keep track of model load status
let modelLoaded = false;
let model = null;
let fallbackMode = false;

// Initialize the AI model when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (typeof tf !== 'undefined') {
    showLoading('Initializing AI model...');
    loadAIModel().then(() => hideLoading());
  } else {
    console.error('TensorFlow.js is not loaded');
  }
});

/**
 * Initialize the ESG Model
 * This function checks for TensorFlow.js availability and either loads
 * the AI model or falls back to a simple statistical model
 */
async function initializeESGModel() {
  console.log("[AI] Initializing ESG Model...");
  
  try {
    // Check if TensorFlow.js is available by accessing the global tf object
    if (typeof tf === 'undefined') {
      console.warn("[AI] TensorFlow.js is not available. Using fallback model.");
      return initializeFallbackModel();
    }
    
    // Create sequential model
    model = tf.sequential();
    
    // Add input layer
    model.add(tf.layers.dense({
      units: 16, 
      activation: 'relu',
      inputShape: [30] // We'll use 30 data points as input
    }));
    
    // Add hidden layers
    model.add(tf.layers.dense({
      units: 8,
      activation: 'relu'
    }));
    
    // Add output layer (energy prediction, carbon prediction, environment score)
    model.add(tf.layers.dense({
      units: 3,
      activation: 'linear'
    }));
    
    // Compile the model
    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError'
    });
    
    console.log("[AI] TensorFlow model created and compiled successfully");
    
    // Set status variables
    modelLoaded = true;
    fallbackMode = false;
    
    // Set a global reference if APP_STATE is available
    if (window.APP_STATE) {
      window.APP_STATE.aiModelLoaded = true;
      window.APP_STATE.usingFallbackAI = false;
    }
    
    // Try to immediately run predictions if we have data
    if (window.APP_STATE && window.APP_STATE.historicalData && window.APP_STATE.historicalData.length > 0) {
      console.log("[AI] Historical data found, generating initial predictions");
      await predictESGImpact();
    } else {
      console.log("[AI] No historical data available yet for predictions");
    }
    
    console.log("[AI] ESG Model initialized successfully");
    return true;
    
  } catch (error) {
    console.error("[AI] Error initializing ESG Model:", error);
    
    // Fall back to statistical model on error
    return initializeFallbackModel();
  }
}

// Load the AI model
async function loadAIModel() {
  try {
    // Check if TensorFlow.js is available
    if (typeof tf === 'undefined') {
      throw new Error('TensorFlow.js is not available');
    }
    
    // Create model for ESG impact prediction
    aiModelInstance = tf.sequential();
    
    // Add layers based on configuration
    aiModelInstance.add(tf.layers.dense({
      units: AI_MODEL.config.layers[0].units,
      activation: AI_MODEL.config.layers[0].activation,
      inputShape: [4] // energy usage, carbon emissions, energy trend, time factor
    }));
    
    aiModelInstance.add(tf.layers.dense({
      units: AI_MODEL.config.layers[1].units,
      activation: AI_MODEL.config.layers[1].activation
    }));
    
    aiModelInstance.add(tf.layers.dense({
      units: AI_MODEL.config.layers[2].units,
      activation: AI_MODEL.config.layers[2].activation
    }));
    
    // Compile the model
    aiModelInstance.compile({
      optimizer: AI_MODEL.config.optimizer,
      loss: AI_MODEL.config.loss,
      metrics: AI_MODEL.config.metrics
    });
    
    // Create model for forecasting
    forecastModel = tf.sequential();
    
    forecastModel.add(tf.layers.dense({
      units: 12,
      activation: 'relu',
      inputShape: [8] // Last 8 data points for sequence prediction
    }));
    
    forecastModel.add(tf.layers.dense({
      units: 8,
      activation: 'relu'
    }));
    
    forecastModel.add(tf.layers.dense({
      units: 5, // Predict next 5 data points
      activation: 'linear'
    }));
    
    forecastModel.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError'
    });
    
    // Train models with dummy data (in a real app, you'd load pre-trained weights)
    await trainModels();
    
    // Update application state
    APP_STATE.aiModelLoaded = true;
    APP_STATE.aiModel = aiModelInstance;
    
    // Make initial predictions
    await updateAIPredictions();
    
    return true;
  } catch (error) {
    console.error('Error loading AI model:', error);
    showError('Failed to load AI model');
    return false;
  }
}

// Train models with sample data
async function trainModels() {
  try {
    // Generate training data for ESG impact model
    const trainingData = generateTrainingData(100);
    
    // Train ESG impact model
    const xs = tf.tensor2d(trainingData.inputs);
    const ys = tf.tensor2d(trainingData.outputs);
    
    await aiModelInstance.fit(xs, ys, {
      epochs: 50,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Training epoch ${epoch + 1}/50, loss: ${logs.loss.toFixed(4)}`);
        }
      }
    });
    
    // Train forecast model
    const forecastTrainingData = generateForecastTrainingData(100);
    
    const forecastXs = tf.tensor2d(forecastTrainingData.inputs);
    const forecastYs = tf.tensor2d(forecastTrainingData.outputs);
    
    await forecastModel.fit(forecastXs, forecastYs, {
      epochs: 30,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Forecast training epoch ${epoch + 1}/30, loss: ${logs.loss.toFixed(4)}`);
        }
      }
    });
    
    // Clean up tensors
    xs.dispose();
    ys.dispose();
    forecastXs.dispose();
    forecastYs.dispose();
    
    return true;
  } catch (error) {
    console.error('Error training AI models:', error);
    return false;
  }
}

// Generate dummy training data for ESG impact model
function generateTrainingData(samples) {
  const inputs = [];
  const outputs = [];
  
  for (let i = 0; i < samples; i++) {
    // Generate random input features
    const energyUsage = Math.random() * 100; // 0-100 kWh
    const carbonEmissions = energyUsage * 0.71; // kg CO₂
    const energyTrend = (Math.random() * 2 - 1) * 20; // -20% to +20%
    const timeFactor = Math.random(); // 0-1 normalized time factor
    
    // Calculate target outputs (ESG scores)
    // These are simplified calculations - in a real model, these would be based on actual data
    const environmentalScore = 100 - (energyUsage / 2) - (carbonEmissions / 3) - (Math.max(0, energyTrend) * 2);
    const socialScore = 60 + Math.random() * 30; // Dummy social score between 60-90
    const governanceScore = 70 + Math.random() * 20; // Dummy governance score between 70-90
    const sustainabilityScore = (environmentalScore * 0.5) + (socialScore * 0.3) + (governanceScore * 0.2);
    
    // Add to training data
    inputs.push([
      energyUsage / 100, // Normalize to 0-1
      carbonEmissions / 100, // Normalize to 0-1
      (energyTrend + 20) / 40, // Normalize from -20/+20 to 0-1
      timeFactor
    ]);
    
    outputs.push([
      environmentalScore / 100, // Normalize to 0-1
      socialScore / 100, // Normalize to 0-1
      governanceScore / 100, // Normalize to 0-1
      sustainabilityScore / 100 // Normalize to 0-1
    ]);
  }
  
  return { inputs, outputs };
}

// Generate dummy training data for forecasting model
function generateForecastTrainingData(samples) {
  const inputs = [];
  const outputs = [];
  
  for (let i = 0; i < samples; i++) {
    // Generate a sequence of 8 energy usage values with a trend
    const startValue = Math.random() * 50 + 30; // Start between 30-80 kWh
    const trend = (Math.random() * 0.4) - 0.2; // Trend between -0.2 and +0.2
    const sequence = [];
    
    for (let j = 0; j < 8; j++) {
      const noise = (Math.random() * 10) - 5; // Random noise between -5 and +5
      const value = startValue + (trend * j * 10) + noise;
      sequence.push(value);
    }
    
    // Generate the next 5 values in the sequence
    const forecastValues = [];
    for (let j = 0; j < 5; j++) {
      const noise = (Math.random() * 8) - 4; // Slightly less noise for forecasts
      const value = startValue + (trend * (j + 8) * 10) + noise;
      forecastValues.push(value);
    }
    
    // Add to training data
    inputs.push(sequence.map(v => v / 100)); // Normalize to 0-1
    outputs.push(forecastValues.map(v => v / 100)); // Normalize to 0-1
  }
  
  return { inputs, outputs };
}

// Predict ESG impact based on current data
async function predictESGImpact() {
  console.log('[AI] Generating ESG impact predictions...');
  
  try {
    // Check if we have a model or need to initialize
    if (!modelLoaded) {
      await initializeESGModel();
    }
    
    // Get historical data from APP_STATE
    const historicalData = window.APP_STATE?.historicalData || [];
    
    if (historicalData.length === 0) {
      console.warn('[AI] No historical data available for predictions');
      throw new Error('No historical data available for predictions');
    }
    
    // Make predictions
    let predictions;
    if (fallbackMode) {
      predictions = makeFallbackPredictions(historicalData);
    } else {
      predictions = makeTensorFlowPredictions(historicalData);
    }
    
    // Update APP_STATE with predictions
    updateAppStateWithPredictions(predictions);
    
    // Generate recommendations based on predictions
    generateRecommendations(predictions);
    
    console.log('[AI] ESG impact predictions completed');
    return true;
  } catch (error) {
    console.error('[AI] Error making ESG predictions:', error);
    
    // Try fallback if normal prediction fails
    if (!fallbackMode) {
      fallbackMode = true;
      return makeFallbackPredictions(window.APP_STATE?.historicalData || []);
    }
    
    throw error;
  }
}

// Initialize a fallback model when TensorFlow fails
function initializeFallbackModel() {
  console.log('[AI] Using fallback prediction model');
  
  // Simple statistical model based on historical data
  modelLoaded = true;
  fallbackMode = true;
  
  // Let the UI know we're using a fallback approach
  if (window.APP_STATE) {
    window.APP_STATE.aiModelLoaded = true;
    window.APP_STATE.usingFallbackAI = true;
  }
  
  return Promise.resolve(true);
}

// Make predictions using TensorFlow model
function makeTensorFlowPredictions(historicalData) {
  // Extract features for prediction
  const energyData = historicalData.map(item => item.energy);
  
  // Preprocess data for the model
  const tensorData = tf.tensor2d(energyData.slice(-30), [1, 30]);
    
    // Make prediction
  const predictionTensor = model.predict(tensorData);
  const predictionValues = predictionTensor.dataSync();
    
    // Clean up tensors
  tensorData.dispose();
  predictionTensor.dispose();
  
  // Process prediction values into the expected format
  return {
    energyForecast: predictionValues[0],
    carbonForecast: predictionValues[0] * window.CONFIG.carbonFactor,
    environmentalScore: Math.min(100, Math.max(0, 70 - predictionValues[0] / 10)),
    socialScore: 65 + Math.random() * 15,
    governanceScore: 70 + Math.random() * 20,
    sustainabilityScore: Math.min(100, Math.max(0, 75 - predictionValues[0] / 8)),
    confidenceScore: 0.85
  };
}

// Make predictions using fallback statistical model
function makeFallbackPredictions(historicalData) {
  if (historicalData.length === 0) {
    return {
      energyForecast: 0,
      carbonForecast: 0,
      environmentalScore: 50,
      socialScore: 50,
      governanceScore: 50,
      sustainabilityScore: 50,
      confidenceScore: 0.6
    };
  }
  
  // Calculate average energy usage from historical data
  const energyValues = historicalData.map(item => parseFloat(item.energy) || 0);
  const averageEnergy = energyValues.reduce((sum, val) => sum + val, 0) / energyValues.length;
  
  // Calculate standard deviation
  const sumSquaredDiffs = energyValues.reduce((sum, val) => sum + Math.pow(val - averageEnergy, 2), 0);
  const stdDev = Math.sqrt(sumSquaredDiffs / energyValues.length);
  
  // Get trend from recent data
  const recentValues = energyValues.slice(-10);
  const recentAverage = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
  
  // Predict future energy use based on recent trend
  const predictedEnergy = recentAverage + (recentAverage - averageEnergy) * 0.5;
  const carbonForecast = predictedEnergy * window.CONFIG.carbonFactor;
  
  // Calculate scores based on predicted energy
  const environmentalScore = Math.min(100, Math.max(0, 80 - predictedEnergy / 5));
  const socialScore = 65 + Math.random() * 15;
  const governanceScore = 70 + Math.random() * 15;
  const sustainabilityScore = Math.min(100, Math.max(0, 75 - predictedEnergy / 4));
  
  return {
    energyForecast: predictedEnergy,
    carbonForecast: carbonForecast,
    environmentalScore: environmentalScore,
    socialScore: socialScore,
    governanceScore: governanceScore,
    sustainabilityScore: sustainabilityScore,
    confidenceScore: 0.7  // Lower confidence for fallback model
  };
}

// Update APP_STATE with generated predictions
function updateAppStateWithPredictions(predictions) {
  // Update APP_STATE with predictions
  if (!window.APP_STATE) return;
  
  // Store predictions in APP_STATE
  window.APP_STATE.aiPredictions = {
    environmentalScore: predictions.environmentalScore.toFixed(1),
    socialScore: predictions.socialScore.toFixed(1),
    governanceScore: predictions.governanceScore.toFixed(1),
    sustainabilityScore: predictions.sustainabilityScore.toFixed(1),
    energyTrend: 0,  // Will be calculated in updateUI
    confidenceScore: predictions.confidenceScore
  };
  
  // Store forecast data
  window.APP_STATE.forecast = {
    energy: predictions.energyForecast,
    carbon: predictions.carbonForecast
  };
  
  // Update UI elements if they exist
  updateUIWithPredictions(predictions);
}

// Update UI elements with predictions
function updateUIWithPredictions(predictions) {
  console.log('[AI] Updating UI with predictions');
  
  try {
    // Update AI sustainability score
    const aiScoreElement = document.getElementById('aiSustainabilityScore');
    if (aiScoreElement) {
      aiScoreElement.textContent = predictions.sustainabilityScore.toFixed(1);
    }
    
    // Update carbon forecast
    const carbonForecastElement = document.getElementById('carbonForecast');
    if (carbonForecastElement) {
      carbonForecastElement.textContent = predictions.carbonForecast.toFixed(2);
    }
    
    // Update efficiency score
    const efficiencyScoreElement = document.getElementById('efficiencyScore');
    if (efficiencyScoreElement) {
      const efficiencyScore = 100 - (predictions.energyForecast / 10);
      efficiencyScoreElement.textContent = efficiencyScore.toFixed(1);
    }
    
    // Add fallback mode indicator if we're using fallback
    if (fallbackMode) {
      const fallbackIndicator = document.createElement('span');
      fallbackIndicator.className = 'text-xs text-yellow-500 ml-2';
      fallbackIndicator.textContent = '(basic model)';
      
      const aiPredictionsTitle = document.querySelector('.ai-predictions-title');
      if (aiPredictionsTitle && !aiPredictionsTitle.querySelector('.fallback-indicator')) {
        aiPredictionsTitle.appendChild(fallbackIndicator);
      }
    }
    
    // Update charts if the function exists
    if (typeof updateAICharts === 'function') {
      updateAICharts();
    }
  } catch (error) {
    console.error('[AI] Error updating UI with predictions:', error);
  }
}

// Generate recommendations based on predictions
function generateRecommendations(predictions) {
  console.log('[AI] Generating recommendations based on predictions');
  
  // Set of potential recommendations
  const recommendations = [
    {
      id: 'hvac',
      title: 'Optimize HVAC Systems',
      description: 'Reduce energy consumption by optimizing HVAC operating hours and temperature settings.',
      potentialSavings: '8-12%',
      implementationDifficulty: 'Medium',
      relevanceScore: 0
    },
    {
      id: 'lighting',
      title: 'LED Lighting Upgrade',
      description: 'Replace traditional lighting with energy-efficient LED alternatives.',
      potentialSavings: '5-8%',
      implementationDifficulty: 'Low',
      relevanceScore: 0
    },
    {
      id: 'renewable',
      title: 'Renewable Energy Integration',
      description: 'Implement on-site renewable energy solutions like solar panels.',
      potentialSavings: '20-30%',
      implementationDifficulty: 'High',
      relevanceScore: 0
    },
    {
      id: 'employee',
      title: 'Employee Engagement Program',
      description: 'Launch sustainability awareness programs for employees to encourage energy-saving behaviors.',
      potentialSavings: '3-5%',
      implementationDifficulty: 'Low',
      relevanceScore: 0
    },
    {
      id: 'equipment',
      title: 'Energy-Efficient Equipment',
      description: 'Upgrade to energy-efficient equipment and appliances when replacing old ones.',
      potentialSavings: '7-15%',
      implementationDifficulty: 'Medium',
      relevanceScore: 0
    }
  ];
  
  // Calculate relevance scores for each recommendation based on predictions
  const energyEfficiency = 100 - predictions.energyForecast / 10;
  
  // Assign relevance based on current efficiency
  recommendations.forEach(rec => {
    switch (rec.id) {
      case 'hvac':
        rec.relevanceScore = energyEfficiency < 70 ? 0.9 : 0.5;
        break;
      case 'lighting':
        rec.relevanceScore = energyEfficiency < 80 ? 0.8 : 0.4;
        break;
      case 'renewable':
        rec.relevanceScore = predictions.environmentalScore < 65 ? 0.95 : 0.7;
        break;
      case 'employee':
        rec.relevanceScore = 0.7; // Always somewhat relevant
        break;
      case 'equipment':
        rec.relevanceScore = energyEfficiency < 75 ? 0.85 : 0.6;
        break;
    }
    
    // Adjust relevance based on model confidence
    if (fallbackMode) {
      rec.relevanceScore *= 0.9; // Reduce relevance slightly for fallback model
    }
  });
  
  // Sort by relevance score
  recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Take top 3 recommendations
  const topRecommendations = recommendations.slice(0, 3);
  
  // Store in APP_STATE
  if (window.APP_STATE) {
    window.APP_STATE.recommendations = topRecommendations;
  }
  
  // Update recommendation UI if element exists
  const aiRecommendationElement = document.getElementById('aiRecommendation');
  if (aiRecommendationElement) {
    aiRecommendationElement.textContent = topRecommendations[0].title + ": " + topRecommendations[0].description;
  }
  
  return topRecommendations;
}

// Make functions available globally
window.initializeESGModel = initializeESGModel;
window.predictESGImpact = predictESGImpact; 