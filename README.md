# Current+ Enterprise ESG Analytics Platform

An AI-powered Environmental, Social, and Governance (ESG) reporting platform that uses real-time energy data from ThingSpeak to generate insightful sustainability reports.

![Current+ ESG Analytics](assets/current-plus-esg-demo.png)

## 🌟 Features

- **Real-time Energy Monitoring**: Connect to ThingSpeak IoT platform to track energy consumption data
- **AI-Powered Analysis**: TensorFlow.js models provide predictive analytics and sustainability scoring
- **Interactive Dashboard**: Modern, responsive UI with dark mode and dynamic data visualization
- **ESG Performance Metrics**: Track environmental, social, and governance metrics in one place
- **Professional PDF Report Generation**: Create professional ESG reports with custom parameters
- **Carbon Emission Calculation**: Automatically convert energy usage to carbon footprint
- **Sustainability Recommendations**: AI-generated insights to improve your organization's ESG performance
- **PowerBI Integration**: Export data for enhanced visualization and analysis in PowerBI
- **Enhanced Error Handling**: Robust protection against null references and API errors

## 📋 Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- ThingSpeak account with energy monitoring channel
- Internet connection to access TensorFlow.js and other libraries
- Microsoft PowerBI Desktop (optional, for enhanced data visualization)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/current-plus-esg.git
   cd current-plus-esg
   ```

2. **Configure your ThingSpeak API credentials**
   Edit `js/main.js` and update the ThingSpeak configuration:
   ```javascript
   const CONFIG = {
     thingspeak: {
       channelID: "YOUR_CHANNEL_ID",
       readAPIKey: "YOUR_API_KEY",
       fieldMap: {
         energyUsage: "field1", // Update according to your channel setup
         voltage: "field2",
         current: "field3"
       },
       refreshInterval: 30000, // 30 seconds
     },
     // ... other config
   };
   ```

3. **Launch the application**
   - Open `index.html` in your web browser
   - For development with hot-reloading, use a local server:
     ```bash
     npx http-server -o
     ```

## 🔧 Customization

### Adjusting Carbon Emission Calculation

The default carbon emission factor is set to 0.71 kg CO₂ per kWh. You can adjust this value in the `CONFIG` object in `js/main.js` based on your location's energy mix.

```javascript
carbonFactor: 0.71, // kg CO₂ per kWh - adjust based on your location
```

### Modifying Report Templates

ESG report templates can be customized in `js/report-generator.js`. You can modify the sections, content, and styling to meet your organizational reporting needs.

### Adding Custom AI Models

For advanced users, you can train and implement custom TensorFlow.js models by modifying the `js/ai-model.js` file. The application is designed to be easily extended with new prediction capabilities.

## 📊 Data Visualization

The dashboard includes various data visualization components using Chart.js:

- **Energy Consumption Trend**: Track usage patterns over time
- **Carbon Emissions Analysis**: Monitor your carbon footprint
- **ESG Score Breakdown**: Visualize performance across E, S, and G categories
- **AI Prediction Charts**: View forecasted sustainability metrics

### PowerBI Integration

For more advanced visualization:

1. Navigate to the Analytics page
2. Click "Export to PowerBI" button
3. Open the downloaded JSON file in PowerBI Desktop
4. Create custom dashboards or use our provided templates

## 🌱 Sustainability Insights

The AI model provides several types of sustainability insights:

1. **Sustainability Score**: Overall ESG performance metric (0-100)
2. **Carbon Forecast**: Predicted future carbon emissions
3. **Energy Efficiency Score**: Evaluation of energy usage efficiency 
4. **Targeted Recommendations**: Specific actions to improve sustainability

## 📄 Report Generation

Generate comprehensive ESG reports with customizable options:

- Include/exclude AI predictions
- Include/exclude data visualizations
- Include/exclude sustainability recommendations
- Professional PDF formatting with company branding
- Export data to PowerBI for interactive reports

## 🛡️ Error Handling and Reliability Features

The platform includes several advanced error handling and reliability features:

### 1. DOM Safe Utility

A utility to safely handle DOM operations and prevent "Cannot read properties of null" errors:

- Safe element selection with built-in error handling
- Protected methods for manipulating text, HTML, classes, and styles
- Automatic fallbacks when elements are not found

### 2. ThingSpeak Helper

A robust helper for ThingSpeak API interactions:

- Multiple layers of defensive coding against null elements
- Proper initialization with DOM-ready checks
- Error recovery and detailed logging for API interactions
- Fallback mechanisms for critical functions

### 3. AI Model Fallback System

A reliability system for AI-related operations:

- Automatic failover when the primary model encounters errors
- Status tracking for both primary and fallback models
- Configurable retry logic with progressive backoff

### 4. Global Error Handling

Comprehensive error handling throughout the application:

- Global catch for all JavaScript errors, including null reference errors
- Unhandled promise rejection handling
- Safe DOM manipulation utilities for the entire application

## �� Technical Details

### Technology Stack

- **Frontend**: HTML5, Tailwind CSS
- **JavaScript Libraries**: 
  - Chart.js (data visualization)
  - TensorFlow.js (AI models)
  - jsPDF (report generation)
- **Data Source**: ThingSpeak API
- **Architecture**: Browser-based application with modular JavaScript design
- **Data Visualization**: Native Chart.js with PowerBI export capability

### File Structure

```
current-plus-esg/
├── css/
│   └── styles.css           # Custom styling
├── js/
│   ├── main.js              # Core functionality and data fetching
│   ├── charts.js            # Data visualization components
│   ├── ai-model.js          # TensorFlow.js model implementation
│   ├── dom-safe.js          # Safe DOM manipulation utility
│   ├── thingspeak-helper.js # ThingSpeak API interaction helper
│   ├── ai-model-fallback.js # AI model redundancy system
│   └── report-generator.js  # PDF report generation
├── assets/                  # Images and static resources
├── models/                  # Pre-trained AI models (optional)
├── index.html               # Main application entry point
└── README.md                # Documentation
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [ThingSpeak](https://thingspeak.com/) for IoT data platform
- [TensorFlow.js](https://www.tensorflow.org/js) for browser-based machine learning
- [Chart.js](https://www.chartjs.org/) for responsive data visualization
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [jsPDF](https://github.com/parallax/jsPDF) for PDF generation
- [Font Awesome](https://fontawesome.com/) for icons
- [PowerBI](https://powerbi.microsoft.com/) for advanced data visualization

## 🚀 Deploying to GitHub

Follow these steps to deploy the Current+ ESG Analytics Platform to GitHub:

1. **Create a GitHub repository**
   - Go to [GitHub](https://github.com) and sign in to your account
   - Click the "+" icon in the top right and select "New repository"
   - Name your repository (e.g., "current-plus-esg")
   - Add a description and select visibility options
   - Click "Create repository"

2. **Initialize Git in your local project (if not already done)**
   ```bash
   cd current-plus-esg
   git init
   ```

3. **Add all files to Git staging**
   ```bash
   git add .
   ```

4. **Commit your changes**
   ```bash
   git commit -m "Initial commit of Current+ ESG Analytics Platform"
   ```

5. **Link to your GitHub repository**
   ```bash
   git remote add origin https://github.com/your-username/current-plus-esg.git
   ```

6. **Push to GitHub**
   ```bash
   git push -u origin main
   # If you're using 'master' branch instead of 'main'
   # git push -u origin master
   ```

7. **Configure GitHub Pages (optional for web hosting)**
   - Go to your repository on GitHub
   - Click "Settings" > "Pages"
   - In the "Source" section, select "main" branch
   - Click "Save"
   - Your application will be available at `https://your-username.github.io/current-plus-esg/`

8. **For future updates**
   After making changes to your code:
   ```bash
   git add .
   git commit -m "Description of your changes"
   git push
   ```

### GitHub Actions for Continuous Integration (Optional)

You can set up GitHub Actions to automatically run tests, build your project, or deploy it whenever changes are pushed:

1. Create a `.github/workflows` directory in your project
2. Add a workflow file, e.g., `.github/workflows/ci.yml`:

```yaml
name: Current+ CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: 16
    - name: Install dependencies
      run: npm ci
    - name: Run tests
      run: npm test
    - name: Deploy to GitHub Pages
      if: success() && github.ref == 'refs/heads/main'
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🌐 Recent Updates

### v1.2.4 (Latest)
- **Accessibility Improvements**: Fixed form element labeling for better screen reader support
- **Cross-Browser Compatibility**: Enhanced scrollbar styling for Chrome, Firefox, Safari and Edge
- **PowerBI Integration**: Added comprehensive PowerBI export functionality
- **GitHub Integration**: Added GitHub Actions workflow for continuous deployment
- **Bug Fixes**: Resolved duplicate ID issues and improved error handling

### v1.2.3
- Added professional report styling and PowerBI integration
- Enhanced chart visualization with PowerBI-inspired design
- Added cross-browser scrollbar compatibility

### v1.2.2
- Fixed mobile menu toggle IDs
- Improved report generation reliability
- Added ThingSpeak connection stability improvements 