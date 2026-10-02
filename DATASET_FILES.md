# Dataset Files Documentation

> **🌐 Repository**: https://github.com/sharshatkind-debug/energy-grid-rpt

## Quick Reference

### Location
```
C:\Users\I040034\projects\energy-grid-rpt\db\data\
```

### Files
| File | Size | Records | Description |
|------|------|---------|-------------|
| `germany-grid-data.csv` | 59 KB | 365 | Variable weather, Germany |
| `canary-islands-grid-data.csv` | 59 KB | 365 | Stable climate, Canary Islands |
| `energy.grid-PowerPlants.csv` | 313 bytes | 5 | Power plant assets |

---

## Dataset Characteristics

### Germany Dataset (Variable)
- **Variability Score**: 3.8/10
- **Solar Radiation**: 50-950 W/m² (highly variable)
- **Wind Speed**: 1-20 m/s (storms and calm periods)
- **Gas Storage**: 25-98% (seasonal cycles)
- **Temperature**: -5°C to 32°C (four distinct seasons)
- **Storm Events**: 8% probability (~29 days/year)
- **Use Case**: Demonstrates when RPT adds value over simple averaging

### Canary Islands Dataset (Stable)
- **Variability Score**: 0.8/10
- **Solar Radiation**: 720-850 W/m² (very stable)
- **Wind Speed**: 8-12 m/s (steady trade winds)
- **Gas Storage**: 73-80% (minimal variation)
- **Temperature**: 20-26°C (year-round subtropical)
- **Rare Events**: 3% probability (~11 days/year)
- **Use Case**: Demonstrates when simple averaging works well

---

## CSV Structure

### Column Definitions

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `ID` | UUID | Unique identifier | `a1b2c3d4-...` |
| `timestamp` | ISO DateTime | Date and time | `2025-10-01T14:00:00Z` |
| `hourOfDay` | Integer | Hour (0-23) | `14` |
| `forecastInsolation` | Decimal | Solar radiation (W/m²) | `850.00` |
| `forecastWindSpeed` | Decimal | Wind speed (m/s) | `12.50` |
| `forecastTemperature` | Decimal | Temperature (°C) | `22.00` |
| `forecastRainProbability` | Integer | Rain probability (0-100%) | `5` |
| `solarGenerationMW` | Decimal | Solar output (MW) | `220.00` |
| `windGenerationMW` | Decimal | Wind output (MW) | `280.00` |
| `gasGenerationMW` | Decimal | Gas output (MW) | `50.00` |
| `totalGenerationMW` | Decimal | Total generation (MW) | `550.00` |
| `gasStoragePct` | Decimal | Gas storage level (%) | `85.00` |
| `gridReserveCapacityMW` | Decimal | Available reserve (MW) | `400.00` |
| `currentDemandMW` | Decimal | Current demand (MW) | `480.00` |
| `forecastDemandMW` | Decimal | Forecasted demand (MW) | `520.00` |
| `frenchImportPriceEUR` | Decimal | Import price (€/MWh) | `55.00` |
| `spotPriceEUR` | Decimal | Spot market price (€/MWh) | `48.00` |
| `buyDecision` | String | Decision (NO_ACTION, BUY_100MW, BUY_200MW, BUY_500MW) | `NO_ACTION` |
| `isActual` | Boolean | Historical vs forecast | `true` |

---

## How Datasets Are Generated

### Generation Script
```bash
npm run generate-datasets
```

**Script Location**: `scripts/generate-datasets.js`

### Generation Logic

#### Germany Dataset
```javascript
- Seasonal patterns: Winter low solar, Summer high solar
- Random weather events: 8% chance of storms per day
- Gas storage cycles: High in summer (95%), low in winter (35%)
- Wind variability: Atlantic weather systems
- Temperature range: -5°C to 32°C
```

#### Canary Islands Dataset
```javascript
- Year-round stability: Minimal seasonal variation
- Steady trade winds: 8-12 m/s consistency
- High solar: 720-850 W/m² almost every day
- Rare storms: 3% chance (Saharan dust / Atlantic lows)
- Stable temperature: 20-26°C subtropical
```

---

## How Data Flows in the Application

### 1. Application Startup
```
CSV files exist in db/data/ (pre-generated)
```

### 2. User Clicks Dataset Button
```
UI: Click "Germany" button
  ↓
Backend: activatePresetDataset('germany')
  ↓
Read: db/data/germany-grid-data.csv
  ↓
Parse: 365 rows
  ↓
Calculate: Variability metrics
  - Mean insolation: 463 W/m²
  - Std dev insolation: 268 W/m²
  - Variability score: 3.8/10
  ↓
Store: SQLite (in-memory database)
  - DatasetUpload record (metadata)
  - 365 GridSnapshot records (data)
  ↓
Return: Dataset info to UI
  ↓
UI: Update header, chart, scenario buttons
```

### 3. User Requests Prediction
```
UI: Click "Compare RPT vs Average"
  ↓
Backend: Fetch GridSnapshots for active dataset
  ↓
Simple Average: Find matching records (±100 W/m², ±2 m/s)
RPT: Use analogue days as context (±150 W/m², ±3 m/s)
  ↓
Return: Comparison results
  ↓
UI: Display side-by-side results
```

### 4. Chart Display
```
UI: Load active dataset
  ↓
Backend: SELECT GridSnapshots ORDER BY timestamp LIMIT 365
  ↓
Return: All 365 records with weather data
  ↓
UI: Render Chart.js line chart
  - Yellow line: Solar radiation
  - Blue line: Wind speed (scaled)
```

---

## Customizing Datasets

### Option 1: Edit Existing CSV
```bash
# Open in Excel or text editor
notepad "C:\Users\I040034\projects\energy-grid-rpt\db\data\germany-grid-data.csv"

# Modify values
# Save file
# Restart application
```

### Option 2: Modify Generator Script
```javascript
// Edit scripts/generate-datasets.js

// Change weather patterns
if (month >= 6 && month <= 8) {
    // Your custom summer logic
    insolation = normalRandom(600, 1000, 1);
    windSpeed = normalRandom(3, 15, 1.2);
}

// Run generator
npm run generate-datasets
```

### Option 3: Add New Dataset
```bash
# Create new CSV with same structure
# Place in db/data/my-new-dataset.csv

# Modify srv/grid-service.js
# Add new preset option

# Update UI buttons
# Add new dataset selector
```

---

## Validation

### Check Dataset Statistics
```bash
curl http://localhost:4004/grid/getActiveDataset()
```

**Expected Output:**
```json
{
  "name": "Germany (Variable)",
  "recordCount": 365,
  "variabilityScore": "3.8",
  "insolationMean": "462.99",
  "insolationStdDev": "267.59",
  "windSpeedMean": "10.06",
  "windSpeedStdDev": "2.73"
}
```

### Verify Record Count
```bash
curl http://localhost:4004/grid/GridSnapshots?$count=true
```

Should show 365 records for each dataset.

---

## Troubleshooting

### Issue: "INSUFFICIENT_DATA" in predictions
**Cause**: Query conditions don't match any historical records
**Solution**: Check if scenario values are realistic for the dataset

### Issue: Chart not displaying
**Cause**: No GridSnapshots loaded
**Solution**: Activate a dataset first by clicking Germany or Canary Islands

### Issue: "UNIQUE constraint failed"
**Cause**: Trying to import same dataset twice
**Solution**: Fixed in latest version - datasets are now reused if already loaded

---

## Summary

✅ **Pre-generated**: CSV files already exist, no setup needed
✅ **Realistic**: Weather patterns based on actual climate characteristics
✅ **Educational**: Shows clear contrast between variable and stable conditions
✅ **Customizable**: Can edit CSVs or regenerate with different parameters
✅ **Well-documented**: Full column definitions and generation logic available

**Location**: `C:\Users\I040034\projects\energy-grid-rpt\db\data\`
