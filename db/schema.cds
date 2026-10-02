namespace energy.grid;

using { cuid, managed } from '@sap/cds/common';

/**
 * Uploaded datasets for comparison
 */
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

    // Relationships
    snapshots               : Association to many GridSnapshots on snapshots.dataset = $self;
}

/**
 * Historical grid status records - used as context for RPT predictions
 */
entity GridSnapshots : cuid, managed {
    // Link to dataset
    dataset                 : Association to DatasetUploads;

    timestamp               : Timestamp;
    hourOfDay               : Integer;         // 0-23

    // Weather forecasts
    forecastInsolation      : Decimal(10,2);   // W/m² - solar radiation
    forecastWindSpeed       : Decimal(10,2);   // m/s
    forecastTemperature     : Decimal(5,2);    // °C
    forecastRainProbability : Integer;         // 0-100%

    // Current generation status
    solarGenerationMW       : Decimal(10,2);   // Current solar output
    windGenerationMW        : Decimal(10,2);   // Current wind output
    gasGenerationMW         : Decimal(10,2);   // Current gas plant output
    totalGenerationMW       : Decimal(10,2);   // Computed total

    // Storage and reserves
    gasStoragePct           : Decimal(5,2);    // Gas storage level (0-100%)
    gridReserveCapacityMW   : Decimal(10,2);   // Available buffer

    // Demand
    currentDemandMW         : Decimal(10,2);   // Current grid demand
    forecastDemandMW        : Decimal(10,2);   // Forecasted demand

    // Pricing
    frenchImportPriceEUR    : Decimal(10,2);   // €/MWh from France
    spotPriceEUR            : Decimal(10,2);   // Current spot price

    // Decision (target for prediction)
    buyDecision             : String(20);      // NO_ACTION, BUY_100MW, BUY_200MW, BUY_500MW

    // Metadata
    isActual                : Boolean default true;  // true = historical, false = forecast/prediction
}

/**
 * Weather forecast input - operator adjusts this for predictions
 */
entity WeatherForecast : cuid, managed {
    forecastDate            : Date;
    hourOfDay               : Integer;
    insolation              : Decimal(10,2);   // W/m²
    windSpeed               : Decimal(10,2);   // m/s
    temperature             : Decimal(5,2);    // °C
    rainProbability         : Integer;         // 0-100%
    cloudCover              : Integer;         // 0-100%
}

/**
 * Power plants in the grid
 */
entity PowerPlants : cuid, managed {
    name                    : String(100);
    type                    : String(20);      // SOLAR, WIND, GAS
    capacityMW              : Decimal(10,2);   // Maximum capacity
    currentOutputMW         : Decimal(10,2);   // Current output
    status                  : String(20);      // ONLINE, OFFLINE, MAINTENANCE
    efficiency              : Decimal(5,2);    // Current efficiency %
}

/**
 * Prediction requests and results
 */
entity PredictionRequests : cuid, managed {
    requestTimestamp        : Timestamp;
    targetDate              : Date;
    targetHour              : Integer;

    // Input parameters (snapshot of forecast)
    forecastInsolation      : Decimal(10,2);
    forecastWindSpeed       : Decimal(10,2);
    gasStoragePct           : Decimal(5,2);
    gridReserveCapacityMW   : Decimal(10,2);
    frenchImportPriceEUR    : Decimal(10,2);

    // RPT Response
    predictedDecision       : String(20);      // NO_ACTION, BUY_100MW, etc.
    confidenceScore         : Decimal(5,2);    // 0-100%
    justification           : LargeString;     // RPT explanation

    // Execution info
    status                  : String(20);      // PENDING, COMPLETED, ERROR
    rptResponseTimeMs       : Integer;
    errorMessage            : LargeString;
}

/**
 * Prediction comparisons: RPT vs Simple Average
 */
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
