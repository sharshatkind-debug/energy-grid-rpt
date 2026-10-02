using GridService from '../../srv/grid-service';

// ============================================
// Fiori Elements Annotations for Grid Cockpit
// ============================================

// --------------------------------------------
// Grid Snapshots - Historical Data View
// --------------------------------------------
annotate GridService.GridSnapshots with @(
    UI: {
        HeaderInfo: {
            TypeName: 'Grid Snapshot',
            TypeNamePlural: 'Grid Snapshots',
            Title: { Value: timestamp },
            Description: { Value: buyDecision }
        },

        SelectionFields: [
            hourOfDay,
            buyDecision,
            timestamp
        ],

        LineItem: [
            { Value: timestamp, Label: 'Timestamp' },
            { Value: hourOfDay, Label: 'Hour' },
            { Value: forecastInsolation, Label: 'Insolation (W/m²)' },
            { Value: forecastWindSpeed, Label: 'Wind (m/s)' },
            { Value: totalGenerationMW, Label: 'Generation (MW)' },
            { Value: currentDemandMW, Label: 'Demand (MW)' },
            { Value: gasStoragePct, Label: 'Gas Storage %' },
            { Value: gridReserveCapacityMW, Label: 'Reserve (MW)' },
            { Value: frenchImportPriceEUR, Label: 'FR Price (€)' },
            { Value: buyDecision, Label: 'Decision' }
        ],

        Facets: [
            {
                $Type: 'UI.ReferenceFacet',
                ID: 'WeatherFacet',
                Label: 'Weather Forecast',
                Target: '@UI.FieldGroup#Weather'
            },
            {
                $Type: 'UI.ReferenceFacet',
                ID: 'GenerationFacet',
                Label: 'Power Generation',
                Target: '@UI.FieldGroup#Generation'
            },
            {
                $Type: 'UI.ReferenceFacet',
                ID: 'GridStatusFacet',
                Label: 'Grid Status',
                Target: '@UI.FieldGroup#GridStatus'
            },
            {
                $Type: 'UI.ReferenceFacet',
                ID: 'PricingFacet',
                Label: 'Pricing',
                Target: '@UI.FieldGroup#Pricing'
            }
        ],

        FieldGroup#Weather: {
            Label: 'Weather Forecast',
            Data: [
                { Value: forecastInsolation, Label: 'Solar Radiation (W/m²)' },
                { Value: forecastWindSpeed, Label: 'Wind Speed (m/s)' },
                { Value: forecastTemperature, Label: 'Temperature (°C)' },
                { Value: forecastRainProbability, Label: 'Rain Probability (%)' }
            ]
        },

        FieldGroup#Generation: {
            Label: 'Power Generation',
            Data: [
                { Value: solarGenerationMW, Label: 'Solar (MW)' },
                { Value: windGenerationMW, Label: 'Wind (MW)' },
                { Value: gasGenerationMW, Label: 'Gas (MW)' },
                { Value: totalGenerationMW, Label: 'Total Generation (MW)' }
            ]
        },

        FieldGroup#GridStatus: {
            Label: 'Grid Status',
            Data: [
                { Value: currentDemandMW, Label: 'Current Demand (MW)' },
                { Value: forecastDemandMW, Label: 'Forecast Demand (MW)' },
                { Value: gridReserveCapacityMW, Label: 'Reserve Capacity (MW)' },
                { Value: gasStoragePct, Label: 'Gas Storage (%)' }
            ]
        },

        FieldGroup#Pricing: {
            Label: 'Pricing',
            Data: [
                { Value: frenchImportPriceEUR, Label: 'French Import Price (€/MWh)' },
                { Value: spotPriceEUR, Label: 'Spot Price (€/MWh)' },
                { Value: buyDecision, Label: 'Buy Decision' }
            ]
        }
    }
);

// --------------------------------------------
// Power Plants - Asset Overview
// --------------------------------------------
annotate GridService.PowerPlants with @(
    UI: {
        HeaderInfo: {
            TypeName: 'Power Plant',
            TypeNamePlural: 'Power Plants',
            Title: { Value: name },
            Description: { Value: type }
        },

        SelectionFields: [
            type,
            status
        ],

        LineItem: [
            { Value: name, Label: 'Plant Name' },
            { Value: type, Label: 'Type' },
            { Value: capacityMW, Label: 'Capacity (MW)' },
            { Value: currentOutputMW, Label: 'Current Output (MW)' },
            { Value: efficiency, Label: 'Efficiency (%)' },
            { Value: status, Label: 'Status' }
        ],

        Facets: [
            {
                $Type: 'UI.ReferenceFacet',
                ID: 'PlantDetails',
                Label: 'Plant Details',
                Target: '@UI.FieldGroup#PlantDetails'
            }
        ],

        FieldGroup#PlantDetails: {
            Label: 'Plant Details',
            Data: [
                { Value: name, Label: 'Name' },
                { Value: type, Label: 'Type' },
                { Value: capacityMW, Label: 'Max Capacity (MW)' },
                { Value: currentOutputMW, Label: 'Current Output (MW)' },
                { Value: efficiency, Label: 'Operating Efficiency (%)' },
                { Value: status, Label: 'Status' }
            ]
        }
    }
);

// --------------------------------------------
// Prediction Requests - Prediction History
// --------------------------------------------
annotate GridService.PredictionRequests with @(
    UI: {
        HeaderInfo: {
            TypeName: 'Prediction',
            TypeNamePlural: 'Predictions',
            Title: { Value: predictedDecision },
            Description: { Value: requestTimestamp }
        },

        SelectionFields: [
            status,
            predictedDecision,
            targetDate
        ],

        LineItem: [
            { Value: requestTimestamp, Label: 'Requested At' },
            { Value: targetDate, Label: 'Target Date' },
            { Value: targetHour, Label: 'Target Hour' },
            { Value: forecastInsolation, Label: 'Insolation' },
            { Value: forecastWindSpeed, Label: 'Wind Speed' },
            { Value: gasStoragePct, Label: 'Gas Storage %' },
            { Value: predictedDecision, Label: 'Prediction' },
            { Value: confidenceScore, Label: 'Confidence %' },
            { Value: status, Label: 'Status' },
            { Value: rptResponseTimeMs, Label: 'Response (ms)' }
        ],

        Facets: [
            {
                $Type: 'UI.ReferenceFacet',
                ID: 'InputParameters',
                Label: 'Input Parameters',
                Target: '@UI.FieldGroup#InputParameters'
            },
            {
                $Type: 'UI.ReferenceFacet',
                ID: 'PredictionResult',
                Label: 'Prediction Result',
                Target: '@UI.FieldGroup#PredictionResult'
            }
        ],

        FieldGroup#InputParameters: {
            Label: 'Input Parameters',
            Data: [
                { Value: targetDate, Label: 'Target Date' },
                { Value: targetHour, Label: 'Target Hour' },
                { Value: forecastInsolation, Label: 'Forecast Insolation (W/m²)' },
                { Value: forecastWindSpeed, Label: 'Forecast Wind Speed (m/s)' },
                { Value: gasStoragePct, Label: 'Gas Storage (%)' },
                { Value: gridReserveCapacityMW, Label: 'Grid Reserve (MW)' },
                { Value: frenchImportPriceEUR, Label: 'French Import Price (€)' }
            ]
        },

        FieldGroup#PredictionResult: {
            Label: 'Prediction Result',
            Data: [
                { Value: predictedDecision, Label: 'Predicted Decision' },
                { Value: confidenceScore, Label: 'Confidence Score (%)' },
                { Value: justification, Label: 'RPT Justification' },
                { Value: status, Label: 'Status' },
                { Value: rptResponseTimeMs, Label: 'Response Time (ms)' },
                { Value: errorMessage, Label: 'Error Message' }
            ]
        }
    }
);

// --------------------------------------------
// Labels
// --------------------------------------------
annotate GridService.PowerPlants with {
    type @Common.Label: 'Plant Type';
    status @Common.Label: 'Status';
    name @Common.Label: 'Plant Name';
};

annotate GridService.GridSnapshots with {
    buyDecision @Common.Label: 'Buy Decision';
    hourOfDay @Common.Label: 'Hour of Day';
    timestamp @Common.Label: 'Timestamp';
};
