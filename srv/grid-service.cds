using energy.grid from '../db/schema';

/**
 * Energy Grid Management Service
 * Provides APIs for grid monitoring and RPT predictions with comparison capabilities
 */
service GridService @(path: '/grid') {

    // Dataset management
    entity DatasetUploads as projection on grid.DatasetUploads;

    // Read-only access to historical data
    @readonly
    entity GridSnapshots as projection on grid.GridSnapshots;

    // Weather forecast management
    entity WeatherForecast as projection on grid.WeatherForecast;

    // Power plant status
    @readonly
    entity PowerPlants as projection on grid.PowerPlants;

    // Prediction history
    @readonly
    entity PredictionRequests as projection on grid.PredictionRequests;

    // Comparison history
    @readonly
    entity PredictionComparisons as projection on grid.PredictionComparisons;

    // ============================================
    // ACTIONS - Core functionality
    // ============================================

    /**
     * Upload and activate a dataset (with automatic metric calculation)
     */
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

    /**
     * Activate a preset dataset (Germany or Canary Islands)
     */
    action activatePresetDataset(
        preset              : String(20)  // "germany" or "canary"
    ) returns {
        datasetId           : UUID;
        name                : String(100);
        recordCount         : Integer;
        variabilityScore    : Decimal(3,1);
    };

    /**
     * Request a COMPARISON prediction (RPT vs Simple Average)
     */
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
        analysisNotes       : LargeString;
        comparisonId        : UUID;
    };

    /**
     * Request a prediction from SAP RPT (original functionality)
     */
    action requestPrediction(
        targetDate          : Date,
        targetHour          : Integer,
        forecastInsolation  : Decimal(10,2),
        forecastWindSpeed   : Decimal(10,2),
        gasStoragePct       : Decimal(5,2),
        gridReserveCapacityMW : Decimal(10,2),
        frenchImportPriceEUR : Decimal(10,2)
    ) returns {
        predictedDecision   : String(20);
        confidenceScore     : Decimal(5,2);
        justification       : LargeString;
        requestId           : UUID;
    };

    /**
     * Get current grid status summary
     */
    function getGridStatus() returns {
        totalGenerationMW   : Decimal(10,2);
        totalDemandMW       : Decimal(10,2);
        reserveCapacityMW   : Decimal(10,2);
        gasStoragePct       : Decimal(5,2);
        solarOutputMW       : Decimal(10,2);
        windOutputMW        : Decimal(10,2);
        gasOutputMW         : Decimal(10,2);
        gridHealthStatus    : String(20);      // HEALTHY, WARNING, CRITICAL
    };

    /**
     * Get active dataset info
     */
    function getActiveDataset() returns {
        datasetId           : UUID;
        name                : String(100);
        location            : String(100);
        recordCount         : Integer;
        variabilityScore    : Decimal(3,1);
        insolationMean      : Decimal(10,2);
        insolationStdDev    : Decimal(10,2);
        windSpeedMean       : Decimal(10,2);
        windSpeedStdDev     : Decimal(10,2);
    };

    /**
     * Fetch analogue days for RPT context
     * Returns historical days with similar weather patterns
     */
    function getAnalogueDays(
        targetInsolation    : Decimal(10,2),
        targetWindSpeed     : Decimal(10,2),
        limit               : Integer default 20
    ) returns array of GridSnapshots;
}
