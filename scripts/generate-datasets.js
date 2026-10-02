/**
 * Generate realistic weather datasets for RPT demonstration
 * - Germany: Highly variable conditions (continental climate)
 * - Canary Islands: Very stable conditions (subtropical oceanic climate)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: Generate random value within range with normal distribution
function normalRandom(min, max, skew = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    num = num / 10.0 + 0.5;
    if (num > 1 || num < 0) num = normalRandom(min, max, skew);
    num = Math.pow(num, skew);
    num *= max - min;
    num += min;
    return num;
}

// Helper: Clamp value between min and max
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Helper: Generate UUID-like ID
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Generate Germany dataset (365 days, high variability)
 */
function generateGermanyDataset() {
    console.log('Generating Germany dataset (variable conditions)...');

    const records = [];
    const startDate = new Date('2025-10-01');

    for (let day = 0; day < 365; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);

        const month = date.getMonth() + 1; // 1-12
        const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);

        // Seasonal solar factor (peak in June, lowest in December)
        const solarSeasonFactor = Math.cos((dayOfYear - 172) * Math.PI / 182.5) * 0.5 + 0.5;

        // Monthly weather patterns for Germany
        let insolation, windSpeed, temperature, rainProb;

        if (month >= 12 || month <= 2) {
            // Winter: Low solar, variable wind, cold
            insolation = normalRandom(50, 200, 1.2);
            windSpeed = normalRandom(8, 20, 1.5);
            temperature = normalRandom(-5, 8, 1);
            rainProb = Math.floor(normalRandom(40, 80, 1));
        } else if (month >= 3 && month <= 5) {
            // Spring: Rising solar, high wind, moderate temp
            insolation = normalRandom(300, 650, 1);
            windSpeed = normalRandom(8, 18, 1.3);
            temperature = normalRandom(8, 18, 1);
            rainProb = Math.floor(normalRandom(30, 60, 1));
        } else if (month >= 6 && month <= 8) {
            // Summer: Peak solar, moderate wind, hot
            insolation = normalRandom(700, 950, 0.8);
            windSpeed = normalRandom(5, 12, 1);
            temperature = normalRandom(18, 32, 1);
            rainProb = Math.floor(normalRandom(20, 50, 1));
        } else {
            // Fall: Declining solar, variable wind, cooling
            insolation = normalRandom(350, 550, 1);
            windSpeed = normalRandom(6, 16, 1.2);
            temperature = normalRandom(10, 20, 1);
            rainProb = Math.floor(normalRandom(35, 70, 1));
        }

        // Add random weather events (storms, heat waves)
        if (Math.random() < 0.08) { // 8% chance of extreme weather
            if (Math.random() < 0.6) {
                // Storm
                insolation *= 0.3;
                windSpeed = normalRandom(1, 4, 1);
                rainProb = Math.floor(normalRandom(80, 100, 1));
            } else {
                // Heat wave / high pressure
                insolation *= 1.2;
                windSpeed *= 0.4;
                temperature += normalRandom(3, 8, 1);
            }
        }

        // Gas storage follows seasonal pattern (high in summer, low in winter)
        const gasStorageBase = 50 + solarSeasonFactor * 45; // 50-95%
        const gasStorage = clamp(gasStorageBase + normalRandom(-15, 15, 1), 25, 98);

        // Grid reserve capacity varies with weather confidence
        const gridReserve = normalRandom(100, 450, 1);

        // Calculate generation based on weather
        const solarGeneration = (insolation / 1000) * 260; // Max 260 MW capacity
        const windGeneration = Math.min(windSpeed * 25, 350); // Max 350 MW
        const baseLoadDemand = 480;
        const demandVariation = (month >= 12 || month <= 2 || month >= 6 && month <= 8) ? 60 : 30;
        const currentDemand = baseLoadDemand + normalRandom(-demandVariation, demandVariation, 1);

        const renewableGen = solarGeneration + windGeneration;
        const shortfall = currentDemand - renewableGen;
        const gasGeneration = Math.max(0, Math.min(shortfall + 50, 500)); // Gas plant max 500 MW

        // French import price (higher in winter and during low renewable generation)
        const seasonPriceBase = 50 + (1 - solarSeasonFactor) * 40;
        const demandPriceFactor = (currentDemand - 450) * 0.5;
        const frenchPrice = clamp(seasonPriceBase + demandPriceFactor + normalRandom(-10, 10, 1), 45, 135);

        // Spot price (slightly lower than import price)
        const spotPrice = frenchPrice * 0.85 + normalRandom(-5, 5, 1);

        // Determine buy decision based on multiple factors
        let buyDecision = 'NO_ACTION';

        const criticalGas = gasStorage < 40;
        const lowRenewables = renewableGen < 200;
        const lowReserve = gridReserve < 150;
        const highDemand = currentDemand > 550;

        if (criticalGas && lowRenewables && lowReserve) {
            buyDecision = 'BUY_500MW';
        } else if ((criticalGas && lowRenewables) || (lowReserve && highDemand)) {
            buyDecision = 'BUY_200MW';
        } else if (gasStorage < 55 && renewableGen < 280 && gridReserve < 250) {
            buyDecision = 'BUY_100MW';
        }

        // Add some randomness to make it realistic (operators don't always make optimal decisions)
        if (Math.random() < 0.05) {
            const decisions = ['NO_ACTION', 'BUY_100MW', 'BUY_200MW'];
            buyDecision = decisions[Math.floor(Math.random() * decisions.length)];
        }

        records.push({
            ID: generateId(),
            timestamp: `${date.toISOString().split('T')[0]}T14:00:00Z`,
            hourOfDay: 14,
            forecastInsolation: insolation.toFixed(2),
            forecastWindSpeed: windSpeed.toFixed(2),
            forecastTemperature: temperature.toFixed(2),
            forecastRainProbability: rainProb,
            solarGenerationMW: solarGeneration.toFixed(2),
            windGenerationMW: windGeneration.toFixed(2),
            gasGenerationMW: gasGeneration.toFixed(2),
            totalGenerationMW: (solarGeneration + windGeneration + gasGeneration).toFixed(2),
            gasStoragePct: gasStorage.toFixed(2),
            gridReserveCapacityMW: gridReserve.toFixed(2),
            currentDemandMW: currentDemand.toFixed(2),
            forecastDemandMW: (currentDemand + normalRandom(-20, 40, 1)).toFixed(2),
            frenchImportPriceEUR: frenchPrice.toFixed(2),
            spotPriceEUR: spotPrice.toFixed(2),
            buyDecision,
            isActual: true
        });
    }

    console.log(`Generated ${records.length} records for Germany`);
    return records;
}

/**
 * Generate Canary Islands dataset (365 days, very stable)
 */
function generateCanaryIslandsDataset() {
    console.log('Generating Canary Islands dataset (stable conditions)...');

    const records = [];
    const startDate = new Date('2025-10-01');

    for (let day = 0; day < 365; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);

        // Canary Islands: Subtropical climate, very stable year-round
        // Slight variation between summer (June-Sept) and winter (Dec-Feb)
        const month = date.getMonth() + 1;
        const isSummer = month >= 6 && month <= 9;

        // Very stable solar (trade wind climate, minimal clouds)
        const solarBase = isSummer ? 820 : 750;
        let insolation = solarBase + normalRandom(-30, 30, 0.8);

        // Steady trade winds (very predictable)
        const windBase = isSummer ? 11 : 9.5;
        let windSpeed = windBase + normalRandom(-1.5, 1.5, 0.8);

        // Stable temperature
        const tempBase = isSummer ? 25 : 21;
        const temperature = tempBase + normalRandom(-2, 2, 0.8);

        // Very low rain probability
        let rainProb = Math.floor(normalRandom(5, 15, 1));

        // Stable gas storage (small reserves, minimal seasonal variation)
        const gasStorage = 76 + normalRandom(-4, 4, 0.8);

        // Stable grid reserve
        const gridReserve = 220 + normalRandom(-20, 20, 0.8);

        // Calculate generation (very predictable)
        const solarGeneration = (insolation / 1000) * 180; // Smaller solar capacity
        const windGeneration = windSpeed * 20; // Wind capacity ~240 MW
        const baseLoadDemand = 220; // Stable tourism + local consumption
        const currentDemand = baseLoadDemand + normalRandom(-15, 15, 0.8);

        const renewableGen = solarGeneration + windGeneration;
        const shortfall = currentDemand - renewableGen;
        const gasGeneration = Math.max(0, Math.min(shortfall + 30, 150)); // Small gas plant

        // French import price (stable, imported from Spanish mainland)
        const frenchPrice = 72 + normalRandom(-8, 8, 0.8);
        const spotPrice = frenchPrice * 0.9 + normalRandom(-3, 3, 0.8);

        // Determine buy decision (rarely needed due to stable renewables)
        let buyDecision = 'NO_ACTION';

        // Very rare to need imports
        if (insolation < 680 && windSpeed < 8.5 && gasStorage < 70) {
            buyDecision = 'BUY_100MW';
        }

        // Occasional rare storm (calima or Atlantic low)
        if (Math.random() < 0.03) { // 3% chance per year (~10 days)
            insolation *= 0.6;
            windSpeed *= 1.5;
            rainProb = 60;
            if (renewableGen < 180) {
                buyDecision = 'BUY_100MW';
            }
        }

        records.push({
            ID: generateId(),
            timestamp: `${date.toISOString().split('T')[0]}T14:00:00Z`,
            hourOfDay: 14,
            forecastInsolation: insolation.toFixed(2),
            forecastWindSpeed: windSpeed.toFixed(2),
            forecastTemperature: temperature.toFixed(2),
            forecastRainProbability: rainProb,
            solarGenerationMW: solarGeneration.toFixed(2),
            windGenerationMW: windGeneration.toFixed(2),
            gasGenerationMW: gasGeneration.toFixed(2),
            totalGenerationMW: (solarGeneration + windGeneration + gasGeneration).toFixed(2),
            gasStoragePct: gasStorage.toFixed(2),
            gridReserveCapacityMW: gridReserve.toFixed(2),
            currentDemandMW: currentDemand.toFixed(2),
            forecastDemandMW: (currentDemand + normalRandom(-10, 20, 0.8)).toFixed(2),
            frenchImportPriceEUR: frenchPrice.toFixed(2),
            spotPriceEUR: spotPrice.toFixed(2),
            buyDecision,
            isActual: true
        });
    }

    console.log(`Generated ${records.length} records for Canary Islands`);
    return records;
}

/**
 * Calculate variability metrics for a dataset
 */
function calculateVariabilityMetrics(records) {
    const insolations = records.map(r => parseFloat(r.forecastInsolation));
    const windSpeeds = records.map(r => parseFloat(r.forecastWindSpeed));
    const gasStorages = records.map(r => parseFloat(r.gasStoragePct));

    const stats = (arr) => {
        const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
        const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / mean; // Coefficient of variation
        return { mean, stdDev, cv };
    };

    const insolStats = stats(insolations);
    const windStats = stats(windSpeeds);
    const gasStats = stats(gasStorages);

    // Variability score (0-10): weighted average of coefficients of variation
    const variabilityScore = (
        insolStats.cv * 4 +
        windStats.cv * 3 +
        gasStats.cv * 3
    );

    return {
        insolationMean: insolStats.mean.toFixed(2),
        insolationStdDev: insolStats.stdDev.toFixed(2),
        windSpeedMean: windStats.mean.toFixed(2),
        windSpeedStdDev: windStats.stdDev.toFixed(2),
        gasStorageMean: gasStats.mean.toFixed(2),
        gasStorageStdDev: gasStats.stdDev.toFixed(2),
        variabilityScore: variabilityScore.toFixed(1)
    };
}

/**
 * Write CSV file
 */
function writeCSV(records, filename) {
    const headers = Object.keys(records[0]);
    const csv = [
        headers.join(';'),
        ...records.map(record =>
            headers.map(h => record[h]).join(';')
        )
    ].join('\n');

    const outputPath = path.join(__dirname, '..', 'db', 'data', filename);
    fs.writeFileSync(outputPath, csv, 'utf8');
    console.log(`Written ${records.length} records to ${outputPath}`);
}

/**
 * Main execution
 */
function main() {
    console.log('Starting dataset generation...\n');

    // Generate Germany dataset
    const germanyRecords = generateGermanyDataset();
    const germanyMetrics = calculateVariabilityMetrics(germanyRecords);
    console.log('Germany metrics:', germanyMetrics);
    writeCSV(germanyRecords, 'germany-grid-data.csv');

    console.log('\n---\n');

    // Generate Canary Islands dataset
    const canaryRecords = generateCanaryIslandsDataset();
    const canaryMetrics = calculateVariabilityMetrics(canaryRecords);
    console.log('Canary Islands metrics:', canaryMetrics);
    writeCSV(canaryRecords, 'canary-islands-grid-data.csv');

    console.log('\n---\n');
    console.log('Dataset generation complete!');
    console.log('\nComparison:');
    console.log('Germany variability score:', germanyMetrics.variabilityScore);
    console.log('Canary Islands variability score:', canaryMetrics.variabilityScore);
}

main();
