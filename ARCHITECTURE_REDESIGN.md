# Architecture Redesign: Dynamic CSV Upload & RPT Comparison

## Overview

Transform the RPT demo from a fixed-dataset showcase into a **comparative analysis tool** that demonstrates HOW RPT works by contrasting stable vs. variable conditions against simple Excel-like averages.

## Key Concept

**Show the difference between:**
1. **Stable conditions (Canary Islands)** - Where simple averaging works well
2. **Variable conditions (Germany)** - Where pattern recognition (RPT) outperforms simple statistics

## Use Cases

### Use Case 1: Germany Dataset (Variable/Unstable)
- **Location**: Germany  
- **Characteristics**: Highly variable weather, fluctuating gas storage, seasonal changes
- **Weather Pattern**: 
  - Winter: Low solar (50-150 W/m²), variable wind (2-15 m/s), temperatures -5°C to 10°C
  - Summer: High solar (600-900 W/m²), moderate wind (5-12 m/s), temperatures 15-30°C
  - Spring/Fall: Medium solar (300-600 W/m²), high variability
- **Expected Result**: **RPT significantly outperforms simple average** because patterns are complex

### Use Case 2: Canary Islands Dataset (Stable)
- **Location**: Tenerife, Canary Islands
- **Characteristics**: Extremely stable climate, minimal seasonal variation
- **Weather Pattern**:
  - Year-round: Consistent solar (700-850 W/m²), steady trade winds (8-12 m/s), temperatures 20-26°C
  - Minimal rain (5-15% probability)
  - Gas supply stable (always 70-80%)
- **Expected Result**: **RPT ≈ Simple Average** because there's little pattern complexity

## New Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Energy Grid RPT Demo UI                       │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  1. CSV UPLOAD SECTION                                     │  │
│  │     [Choose File] [Upload Dataset]                         │  │
│  │     Presets: [Germany] [Canary Islands] [Custom]          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  2. DATASET STATISTICS                                     │  │
│  │     Records: 365 | Variability Score: 8.2 (HIGH)          │  │
│  │     Insolation: μ=425, σ=285 | Wind: μ=7.5, σ=4.2        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  3. PREDICTION INPUT                                       │  │
│  │     Insolation: [120 W/m²] Wind: [1.5 m/s]               │  │
│  │     Gas Storage: [42%] Reserve: [110 MW]                  │  │
│  │     French Price: [€112.50]                               │  │
│  │     [Predict with RPT] [Calculate Simple Average]         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  4. COMPARISON RESULTS                                     │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────────┐  │  │
│  │  │  RPT Prediction     │  │  Simple Average Method      │  │  │
│  │  │  BUY_200MW          │  │  BUY_150MW (avg of similar) │  │  │
│  │  │  Confidence: 94%    │  │  Deviation: σ=85MW         │  │  │
│  │  │  Response: 1.2s     │  │  Calculation: 0.05s        │  │  │
│  │  │                     │  │                            │  │  │
│  │  │  Justification:     │  │  Logic:                    │  │  │
│  │  │  "Gas storage 42%   │  │  "Average decision for     │  │  │
│  │  │  below threshold,   │  │  records with insolation   │  │  │
│  │  │  wind insufficient" │  │  100-140 and wind 0-3"     │  │  │
│  │  └─────────────────────┘  └─────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  5. ANALYSIS & INSIGHTS                                    │  │
│  │     Dataset Variability: HIGH                              │  │
│  │     → RPT recommended (complex patterns present)           │  │
│  │     Simple method unreliable: High deviation (±85MW)       │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Data Model Changes

### New Entity: DatasetUploads

```cds
entity DatasetUploads : cuid, managed {
    name                    : String(100);           // "Germany 2026", "Canary Islands"
    description             : LargeString;
    location                : String(100);           // "Germany", "Canary Islands, Spain"
    
    // Dataset characteristics
    recordCount             : Integer;
    dateRangeStart          : Date;
    dateRangeEnd            : Date;
    
    // Variability metrics (computed on upload)
    insolationMean          : Decimal(10,2);
    insolationStdDev        : Decimal(10,2);
    windSpeedMean           : Decimal(10,2);
    windSpeedStdDev         : Decimal(10,2);
    gasStorageMean          : Decimal(5,2);
    gasStorageStdDev        : Decimal(5,2);
    
    // Variability score (0-10: 0=very stable, 10=very variable)
    variabilityScore        : Decimal(3,1);
    
    // Status
    isActive                : Boolean default false; // Currently loaded dataset
    uploadStatus            : String(20);            // UPLOADED, VALIDATED, ACTIVE, ARCHIVED
    
    // File reference
    csvFileContent          : LargeBinary;           // Store original CSV
}
```

### Modified Entity: GridSnapshots

Add foreign key to dataset:

```cds
entity GridSnapshots : cuid, managed {
    // NEW: Link to dataset
    dataset                 : Association to DatasetUploads;
    
    // ... existing fields ...
}
```

### New Entity: PredictionComparisons

```cds
entity PredictionComparisons : cuid, managed {
    requestTimestamp        : Timestamp;
    dataset                 : Association to DatasetUploads;
    
    // Input parameters
    targetDate              : Date;
    targetHour              : Integer;
    forecastInsolation      : Decimal(10,2);
    forecastWindSpeed       : Decimal(10,2);
    gasStoragePct           : Decimal(5,2);
    gridReserveCapacityMW   : Decimal(10,2);
    frenchImportPriceEUR    : Decimal(10,2);
    
    // RPT Result
    rptPrediction           : String(20);
    rptConfidence           : Decimal(5,2);
    rptJustification        : LargeString;
    rptResponseTimeMs       : Integer;
    
    // Simple Average Result
    avgPrediction           : String(20);
    avgBasedOnRecords       : Integer;               // How many records matched criteria
    avgStdDeviation         : Decimal(10,2);         // Variability in matched records
    avgCalculationTimeMs    : Integer;
    avgLogic                : LargeString;           // Explanation of average calculation
    
    // Comparison
    predictionsMatch        : Boolean;               // Do RPT and average agree?
    recommendation          : String(20);            // TRUST_RPT, TRUST_AVG, REVIEW_NEEDED
    analysisNotes           : LargeString;
}
```

## Implementation Plan

### Phase 1: Data Generation (Realistic Weather Data)

#### Germany Dataset (365 days, realistic)
- January-March: Winter (low solar 50-200, variable wind 3-15, temp -5 to 8°C)
- April-May: Spring (rising solar 300-650, high wind 8-18, temp 8-18°C)
- June-August: Summer (peak solar 700-950, moderate wind 5-12, temp 18-32°C)
- September-October: Fall (declining solar 350-550, variable wind 6-16, temp 10-20°C)
- November-December: Winter (low solar 80-220, high wind 8-20, temp 0-10°C)

**Variability Drivers:**
- Weather fronts causing rapid changes
- Seasonal gas storage cycles (95% summer → 35% winter)
- Wind highly variable (Atlantic weather systems)
- Demand peaks in winter (heating) and summer (cooling)

#### Canary Islands Dataset (365 days, stable)
- **All year round**: 
  - Solar: 720-850 W/m² (subtropical latitude, minimal cloud cover)
  - Wind: 8-12 m/s (steady trade winds)
  - Temperature: 20-26°C (year-round spring)
  - Rain probability: 5-15%
  - Gas storage: 70-80% (small reserves, minimal use)
  - Demand: 200-250 MW (stable tourism + local consumption)

**Variability Score**: ~2.5/10 (very stable)

### Phase 2: Backend Implementation

#### New Actions in grid-service.cds

```cds
// Upload and validate dataset
action uploadDataset(
    name                : String(100),
    location            : String(100),
    csvContent          : LargeString
) returns {
    datasetId           : UUID;
    recordCount         : Integer;
    variabilityScore    : Decimal(3,1);
    validationStatus    : String(20);
};

// Activate a dataset (make it the current one)
action activateDataset(datasetId : UUID) returns {
    success             : Boolean;
};

// Calculate simple average prediction
function calculateAveragePrediction(
    targetInsolation    : Decimal(10,2),
    targetWindSpeed     : Decimal(10,2),
    gasStoragePct       : Decimal(5,2),
    gridReserveCapacityMW : Decimal(10,2),
    frenchImportPriceEUR : Decimal(10,2)
) returns {
    avgPrediction       : String(20);
    basedOnRecords      : Integer;
    stdDeviation        : Decimal(10,2);
    logic               : LargeString;
    calculationTimeMs   : Integer;
};

// Compare RPT vs Average
action requestComparisonPrediction(
    targetDate          : Date,
    targetHour          : Integer,
    forecastInsolation  : Decimal(10,2),
    forecastWindSpeed   : Decimal(10,2),
    gasStoragePct       : Decimal(5,2),
    gridReserveCapacityMW : Decimal(10,2),
    frenchImportPriceEUR : Decimal(10,2)
) returns {
    // RPT result
    rptPrediction       : String(20);
    rptConfidence       : Decimal(5,2);
    rptJustification    : LargeString;
    rptResponseTimeMs   : Integer;
    
    // Average result
    avgPrediction       : String(20);
    avgBasedOnRecords   : Integer;
    avgStdDeviation     : Decimal(10,2);
    avgLogic            : LargeString;
    avgCalculationTimeMs : Integer;
    
    // Comparison
    predictionsMatch    : Boolean;
    recommendation      : String(20);
    comparisonId        : UUID;
};
```

#### Simple Average Algorithm

```javascript
async _calculateAveragePrediction(params) {
    const {
        targetInsolation,
        targetWindSpeed,
        gasStoragePct,
        gridReserveCapacityMW,
        frenchImportPriceEUR
    } = params;
    
    const startTime = Date.now();
    
    // Define matching criteria (wider tolerance than RPT analogue days)
    const insolationRange = 100; // ±100 W/m²
    const windSpeedRange = 2;    // ±2 m/s
    
    // Find matching historical records
    const matchingRecords = await SELECT.from(GridSnapshots)
        .where({
            isActual: true,
            and: {
                forecastInsolation: { 
                    between: targetInsolation - insolationRange, 
                    targetInsolation + insolationRange 
                },
                and: {
                    forecastWindSpeed: { 
                        between: targetWindSpeed - windSpeedRange, 
                        targetWindSpeed + windSpeedRange 
                    }
                }
            }
        });
    
    if (matchingRecords.length === 0) {
        return {
            avgPrediction: 'INSUFFICIENT_DATA',
            basedOnRecords: 0,
            stdDeviation: 0,
            logic: 'No similar historical records found',
            calculationTimeMs: Date.now() - startTime
        };
    }
    
    // Count occurrences of each decision
    const decisionCounts = {};
    matchingRecords.forEach(record => {
        const decision = record.buyDecision || 'NO_ACTION';
        decisionCounts[decision] = (decisionCounts[decision] || 0) + 1;
    });
    
    // Get most common decision (mode)
    const avgPrediction = Object.entries(decisionCounts)
        .sort((a, b) => b[1] - a[1])[0][0];
    
    // Calculate standard deviation of decisions (measure of confidence)
    // Convert decisions to numbers for std dev calculation
    const decisionValues = matchingRecords.map(r => {
        const d = r.buyDecision || 'NO_ACTION';
        if (d === 'NO_ACTION') return 0;
        if (d === 'BUY_100MW') return 100;
        if (d === 'BUY_200MW') return 200;
        if (d === 'BUY_500MW') return 500;
        return 0;
    });
    
    const mean = decisionValues.reduce((sum, v) => sum + v, 0) / decisionValues.length;
    const variance = decisionValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / decisionValues.length;
    const stdDeviation = Math.sqrt(variance);
    
    const logic = `Found ${matchingRecords.length} similar historical records ` +
        `(insolation ${targetInsolation}±${insolationRange}, ` +
        `wind ${targetWindSpeed}±${windSpeedRange}). ` +
        `Most common decision: ${avgPrediction} ` +
        `(${decisionCounts[avgPrediction]} out of ${matchingRecords.length}). ` +
        `Standard deviation: ±${stdDeviation.toFixed(1)} MW.`;
    
    return {
        avgPrediction,
        basedOnRecords: matchingRecords.length,
        stdDeviation,
        logic,
        calculationTimeMs: Date.now() - startTime
    };
}
```

### Phase 3: UI Updates

#### CSV Upload Section
```html
<div class="upload-section">
    <h3>Dataset Selection</h3>
    <div class="preset-buttons">
        <button onclick="loadPreset('germany')">Germany (Variable)</button>
        <button onclick="loadPreset('canary')">Canary Islands (Stable)</button>
    </div>
    <div class="custom-upload">
        <label>Or upload custom CSV:</label>
        <input type="file" accept=".csv" onchange="handleUpload(event)">
    </div>
    <div class="dataset-info">
        <p>Current Dataset: <strong id="datasetName">-</strong></p>
        <p>Records: <span id="recordCount">-</span></p>
        <p>Variability Score: <span id="variabilityScore">-</span></p>
    </div>
</div>
```

#### Comparison Results Section
```html
<div class="comparison-results">
    <div class="result-card rpt-result">
        <h4>🤖 RPT Prediction</h4>
        <div class="prediction-value">BUY_200MW</div>
        <div class="confidence">Confidence: 94%</div>
        <div class="justification">
            "Gas storage critically low (42%), wind insufficient (1.5 m/s), 
            pattern matches 87% of similar crisis scenarios"
        </div>
        <div class="timing">Response time: 1.24s</div>
    </div>
    
    <div class="result-card avg-result">
        <h4>📊 Simple Average</h4>
        <div class="prediction-value">BUY_150MW</div>
        <div class="confidence">Based on: 23 records</div>
        <div class="logic">
            "Average decision for records with insolation 20-220 W/m² 
            and wind 0-3.5 m/s"
        </div>
        <div class="uncertainty">Std deviation: ±85 MW</div>
        <div class="timing">Calculation: 0.05s</div>
    </div>
</div>

<div class="analysis">
    <h4>Analysis</h4>
    <p>
        <strong>Recommendation: TRUST_RPT</strong><br>
        This dataset has HIGH variability (score: 8.2/10). 
        RPT can identify complex patterns that simple averaging misses.
        The simple average shows high uncertainty (±85 MW deviation).
    </p>
</div>
```

### Phase 4: Dataset Generation Script

Create realistic datasets with Python/Node.js script:

```javascript
// generate-datasets.js
const fs = require('fs');

function generateGermanyDataset() {
    const records = [];
    const startDate = new Date('2025-10-01');
    
    for (let day = 0; day < 365; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);
        
        const month = date.getMonth() + 1;
        const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
        
        // Seasonal patterns
        const summerFactor = Math.cos((dayOfYear - 172) * Math.PI / 182.5) * 0.5 + 0.5;
        
        // Generate weather with realistic variability
        const insolation = generateInsolation(month, summerFactor);
        const windSpeed = generateWindSpeed(month);
        const temperature = generateTemperature(month);
        const gasStorage = generateGasStorage(dayOfYear);
        
        const decision = determineDecision(insolation, windSpeed, gasStorage);
        
        records.push({
            date: date.toISOString().split('T')[0],
            hour: 14,
            insolation,
            windSpeed,
            temperature,
            gasStorage,
            decision
        });
    }
    
    return records;
}

function generateCanaryDataset() {
    const records = [];
    const startDate = new Date('2025-10-01');
    
    for (let day = 0; day < 365; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);
        
        // Very stable conditions
        const insolation = 780 + Math.random() * 70;      // 780-850 W/m²
        const windSpeed = 10 + Math.random() * 2;         // 10-12 m/s
        const temperature = 22 + Math.random() * 4;       // 22-26°C
        const gasStorage = 73 + Math.random() * 7;        // 73-80%
        
        // Almost always NO_ACTION due to stability
        const decision = (insolation < 700 && windSpeed < 9) ? 'BUY_100MW' : 'NO_ACTION';
        
        records.push({
            date: date.toISOString().split('T')[0],
            hour: 14,
            insolation,
            windSpeed,
            temperature,
            gasStorage,
            decision
        });
    }
    
    return records;
}
```

## Expected Demonstration Flow

1. **Start with Germany dataset**
   - Upload/activate Germany data
   - Show variability score: 8.2/10 (HIGH)
   - Input storm scenario: insolation=120, wind=1.5, gas=42%
   - **Results:**
     - RPT: BUY_200MW (94% confidence, detailed reasoning)
     - Average: BUY_150MW (23 records, ±85 MW deviation, uncertain)
   - **Insight**: "High variability → RPT wins, averaging is too simplistic"

2. **Switch to Canary Islands dataset**
   - Upload/activate Canary data
   - Show variability score: 2.5/10 (VERY STABLE)
   - Input typical day: insolation=800, wind=11, gas=76%
   - **Results:**
     - RPT: NO_ACTION (98% confidence)
     - Average: NO_ACTION (312 matching records, ±5 MW deviation, very certain)
   - **Insight**: "Low variability → Both methods agree, simple average sufficient"

## Success Metrics

This redesign successfully demonstrates:

✅ **HOW RPT works** - Not just "it works" but "WHY it works better than simple methods"  
✅ **When to use RPT** - High variability scenarios where patterns matter  
✅ **When NOT to use RPT** - Stable conditions where simple statistics suffice  
✅ **Transparency** - Side-by-side comparison makes the value proposition clear  
✅ **Educational** - Shows the difference between pattern recognition vs. averaging

## Next Steps

1. Generate realistic Germany and Canary Islands CSV files
2. Implement new data model entities
3. Add CSV upload functionality
4. Implement simple average calculation
5. Create comparison UI
6. Add dataset statistics visualization
7. Deploy and test with real SAP RPT 1.6
