# Energy Grid RPT Demo

A CAP application demonstrating **how SAP RPT (Relational Pretrained Transformer)** works by comparing it against simple statistical methods on variable vs. stable datasets.

> **🌐 Public Repository**: https://github.com/sharshatkind-debug/energy-grid-rpt  
> **📝 Purpose**: Customer presentations, demos, and educational content

## Overview

This application showcases the difference between:
- **SAP RPT 1.6**: Pattern recognition using in-context learning
- **Simple Averaging**: Excel-like statistical calculation

Using two contrasting datasets:
- **Germany (Variable)**: Highly fluctuating weather, seasonal changes, variability score 3.8/10
- **Canary Islands (Stable)**: Subtropical climate, minimal variation, variability score 0.8/10

## Key Features

- **Dynamic Dataset Upload** - Switch between Germany, Canary Islands, or upload custom CSV
- **Side-by-Side Comparison** - RPT prediction vs. simple average on the same input
- **Variability Analysis** - Shows when RPT adds value vs. when simple methods suffice
- **Real-time Grid Monitoring** - View power plant status, generation, and demand
- **Educational Value** - Demonstrates the principle: pattern recognition vs. statistical averaging

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 Energy Grid Control Center (UI)                  │
│                    /control-center/control-center.html           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      CAP Application                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ DatasetUploads│  │ GridSnapshots│  │ PredictionComparisons │  │
│  │ (Presets)    │  │ (Historical) │  │ (RPT vs Average)      │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
│                                                                  │
│  Actions:                                                        │
│  - activatePresetDataset()  - Switch datasets                   │
│  - requestComparisonPrediction()  - Compare RPT vs Average      │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    SAP AI Core (RPT 1.6 Large)                   │
│              Deployment: d90d7d67b9f30016                        │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js >= 18
- SAP BTP Account with:
  - SAP AI Core (extended plan) with Generative AI Hub enabled
  - Cloud Foundry environment (for deployment)
- SAP AI Core Service Key (for RPT API access)

## Local Development

### 1. Generate Realistic Datasets

```bash
npm run generate-datasets
```

This creates two CSV files in `db/data/`:
- `germany-grid-data.csv` (365 days, variable weather)
- `canary-islands-grid-data.csv` (365 days, stable climate)

**Note:** The datasets are already pre-generated, so you only need to run this if you want to regenerate them with different random variations.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure AI Core Credentials

Copy the environment template and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your SAP AI Core service key values:

```env
AI_CORE_CLIENT_ID=your-client-id
AI_CORE_CLIENT_SECRET=your-client-secret
AI_CORE_TOKEN_URL=https://your-subdomain.authentication.eu10.hana.ondemand.com
AI_CORE_API_URL=https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com
RPT_DEPLOYMENT_URL=https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com/v2/inference/deployments/d90d7d67b9f30016
```

### 4. Run Locally

```bash
npm run dev
```

Open: http://localhost:4004/control-center/control-center.html

### 5. Test Dataset Loading (Optional)

In another terminal while server is running:

```bash
node scripts/test-datasets.js
```

This will:
1. Activate Germany dataset
2. Run a comparison prediction
3. Switch to Canary Islands dataset

## Cloud Foundry Deployment

### 1. Login to CF

```bash
cf login -a https://api.cf.eu10.hana.ondemand.com --sso
cf target -o "CoE EMEA_ai-bb-dev-ext-aws" -s "ai-core-ext"
```

### 2. Deploy

```bash
cf push
```

### 3. Set Environment Variables (after first deploy)

```bash
cf set-env energy-grid-rpt AI_CORE_CLIENT_ID "your-client-id"
cf set-env energy-grid-rpt AI_CORE_CLIENT_SECRET "your-client-secret"
cf set-env energy-grid-rpt AI_CORE_TOKEN_URL "https://your-subdomain.authentication.eu10.hana.ondemand.com"
cf set-env energy-grid-rpt AI_CORE_API_URL "https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com"
cf set-env energy-grid-rpt RPT_DEPLOYMENT_URL "https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com/v2/inference/deployments/d90d7d67b9f30016"
cf restage energy-grid-rpt
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/grid/DatasetUploads` | GET | View uploaded datasets |
| `/grid/GridSnapshots` | GET | Historical grid data |
| `/grid/PredictionComparisons` | GET | Comparison history |
| `/grid/activatePresetDataset` | POST | Activate Germany or Canary dataset |
| `/grid/requestComparisonPrediction` | POST | Compare RPT vs Average |
| `/grid/getActiveDataset()` | GET | Current dataset info |
| `/grid/getGridStatus()` | GET | Current grid summary |

### Request Comparison Prediction Example

```bash
curl -X POST http://localhost:4004/grid/requestComparisonPrediction \
  -H "Content-Type: application/json" \
  -d '{
    "targetDate": "2026-10-03",
    "targetHour": 14,
    "forecastInsolation": 120,
    "forecastWindSpeed": 1.5,
    "gasStoragePct": 42,
    "gridReserveCapacityMW": 110,
    "frenchImportPriceEUR": 112.50
  }'
```

Response:
```json
{
  "rptPrediction": "BUY_200MW",
  "rptConfidence": 94,
  "rptJustification": "Gas storage critically low...",
  "rptResponseTimeMs": 1240,
  "avgPrediction": "BUY_200MW",
  "avgBasedOnRecords": 23,
  "avgStdDeviation": 85.2,
  "avgLogic": "Found 23 similar records...",
  "avgCalculationTimeMs": 50,
  "predictionsMatch": true,
  "recommendation": "TRUST_RPT",
  "analysisNotes": "High variability dataset...",
  "comparisonId": "..."
}
```

### Activate Dataset Example

```bash
# Activate Germany dataset
curl -X POST http://localhost:4004/grid/activatePresetDataset \
  -H "Content-Type: application/json" \
  -d '{"preset": "germany"}'

# Activate Canary Islands dataset
curl -X POST http://localhost:4004/grid/activatePresetDataset \
  -H "Content-Type: application/json" \
  -d '{"preset": "canary"}'
```

## Project Structure

```
energy-grid-rpt/
├── app/
│   ├── cockpit/                    # Fiori Elements UI (annotations)
│   │   ├── annotations.cds
│   │   └── webapp/
│   └── control-center.html         # Custom demo UI with comparison view
├── db/
│   ├── schema.cds                  # Data model (GridSnapshots, DatasetUploads, etc.)
│   └── data/                       # CSV data files
│       ├── germany-grid-data.csv              # 365 days, variable weather (59 KB)
│       ├── canary-islands-grid-data.csv       # 365 days, stable climate (59 KB)
│       └── energy.grid-PowerPlants.csv        # Power plant configuration
├── srv/
│   ├── grid-service.cds            # Service definition
│   ├── grid-service.js             # Service implementation + RPT integration
│   └── server.js                   # Custom server bootstrap
├── scripts/
│   ├── generate-datasets.js        # Dataset generator (realistic weather data)
│   └── test-datasets.js            # Testing utility
├── .env.example                    # Environment template
├── manifest.yaml                   # CF deployment manifest
├── package.json
├── README.md                       # This file
├── ARCHITECTURE_REDESIGN.md        # Design documentation
└── TEST_RESULTS.md                 # Test results and validation
```

## Dataset Files

### Location
All dataset CSV files are stored in: **`db/data/`**

### Files Description

**1. germany-grid-data.csv** (59 KB, 365 records)
- Variable weather patterns for Germany
- Seasonal variations: Winter (low solar 50-200 W/m²), Summer (high solar 700-950 W/m²)
- Wind: 1-20 m/s (highly variable)
- Gas storage: 25-98% (seasonal cycles)
- Variability score: 3.8/10 (HIGH)
- Includes storm events (8% probability)

**2. canary-islands-grid-data.csv** (59 KB, 365 records)
- Stable subtropical climate for Canary Islands
- Year-round consistency: Solar 720-850 W/m², Wind 8-12 m/s
- Gas storage: 73-80% (minimal variation)
- Temperature: 20-26°C stable
- Variability score: 0.8/10 (VERY STABLE)
- Rare weather events (3% probability)

**3. energy.grid-PowerPlants.csv** (313 bytes)
- Power plant assets configuration
- Columns: name, type (SOLAR/WIND/GAS), capacity, status

### CSV Structure

Each weather dataset CSV contains these columns:
```
ID, timestamp, hourOfDay, forecastInsolation, forecastWindSpeed, 
forecastTemperature, forecastRainProbability, solarGenerationMW, 
windGenerationMW, gasGenerationMW, totalGenerationMW, gasStoragePct, 
gridReserveCapacityMW, currentDemandMW, forecastDemandMW, 
frenchImportPriceEUR, spotPriceEUR, buyDecision, isActual
```

### How Data is Used

1. **On Application Start**: CSV files are read by the backend
2. **Dataset Activation**: When you click a dataset button:
   - Backend reads the CSV from `db/data/`
   - Parses 365 rows
   - Calculates variability metrics (mean, std deviation, variability score)
   - Stores in SQLite database (in-memory)
   - Links all GridSnapshots to the DatasetUpload record
3. **Chart Display**: UI fetches GridSnapshots and renders the weather pattern chart
4. **Predictions**: Historical records are used as context for RPT and simple average calculations

### Regenerating Datasets

To create new datasets with different random variations:
```bash
npm run generate-datasets
```

This will overwrite existing CSV files with newly generated realistic weather data.

### Customizing Datasets

You can:
- Edit CSV files directly in Excel or text editor
- Modify `scripts/generate-datasets.js` to change weather patterns
- Add your own CSV files following the same structure
- Adjust variability by changing weather parameter ranges

---

## Demo Scenarios

### Scenario 1: Germany Dataset (Variable Weather)

**Characteristics:**
- Variability Score: 3.8/10 (HIGH)
- Weather patterns change significantly by season
- Gas storage fluctuates 25-98%

**Example 1: Storm Scenario**
```
Input:  Insolation=120 W/m², Wind=1.5 m/s, Gas=42%
RPT:    BUY_200MW (94% confidence, detailed reasoning)
Avg:    BUY_200MW (23 records, ±85 MW deviation)
Result: Both agree, but RPT shows higher confidence and better explanation
```

**Example 2: Sunny Day**
```
Input:  Insolation=850 W/m², Wind=12 m/s, Gas=85%
RPT:    NO_ACTION (98% confidence)
Avg:    NO_ACTION (156 records, ±15 MW deviation)
Result: Both agree - clear case
```

---

### Scenario 2: Canary Islands Dataset (Stable Climate)

**Characteristics:**
- Variability Score: 0.8/10 (VERY STABLE)
- Year-round sunshine and steady winds
- Minimal seasonal variation

**Example 1: Typical Day**
```
Input:  Insolation=800 W/m², Wind=11 m/s, Gas=76%
RPT:    NO_ACTION (98% confidence)
Avg:    NO_ACTION (312 records, ±5 MW deviation)
Result: Both agree - simple average is sufficient for stable data
```

**Example 2: Rare Storm (3% of year)**
```
Input:  Insolation=450 W/m², Wind=6 m/s, Gas=68%
RPT:    BUY_100MW (85% confidence)
Avg:    NO_ACTION (8 records only, high uncertainty)
Result: RPT detects rare pattern that simple averaging misses
```

---

### Key Insights

| Metric | Germany (Variable) | Canary Islands (Stable) |
|--------|-------------------|-------------------------|
| Variability Score | 3.8/10 | 0.8/10 |
| When RPT adds value | ✅ High - Complex patterns | ⚠️ Low - Simple patterns |
| Simple average reliability | ⚠️ High deviation | ✅ Low deviation |
| Recommendation | **Use RPT** | **Either method works** |

## Related Documentation

- [SAP RPT Product Page](https://www.sap.com/products/artificial-intelligence/sap-rpt.html)
- [SAP AI Core Documentation](https://help.sap.com/docs/sap-ai-core)
- [SAP RPT Getting Started Guide](https://community.sap.com/t5/artificial-intelligence-blogs-posts/sap-rpt-1-5-a-step-by-step-guide-on-getting-started/ba-p/14290171)

## License & Usage

**Public Educational Demo** - This application is designed for customer presentations, blog posts, and educational demonstrations of SAP RPT capabilities.
