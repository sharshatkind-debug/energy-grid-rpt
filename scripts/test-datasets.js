/**
 * Initialize datasets by calling the activatePresetDataset action
 * This script is useful for testing the preset dataset loading
 */

async function testDatasetActivation() {
    console.log('Testing dataset activation via HTTP API...\n');

    const baseUrl = 'http://localhost:4004/grid';

    try {
        // Test Germany dataset activation
        console.log('1. Activating Germany dataset...');
        const germanyResponse = await fetch(`${baseUrl}/activatePresetDataset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preset: 'germany' })
        });

        if (!germanyResponse.ok) {
            console.error('Failed to activate Germany dataset:', await germanyResponse.text());
            return;
        }

        const germanyData = await germanyResponse.json();
        console.log('Germany dataset activated:', germanyData);

        // Get active dataset info
        console.log('\n2. Getting active dataset info...');
        const infoResponse = await fetch(`${baseUrl}/getActiveDataset()`);
        const infoData = await infoResponse.json();
        console.log('Active dataset:', infoData.value);

        // Test a comparison prediction
        console.log('\n3. Testing comparison prediction (storm scenario)...');
        const predictionResponse = await fetch(`${baseUrl}/requestComparisonPrediction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetDate: '2026-10-03',
                targetHour: 14,
                forecastInsolation: 120,
                forecastWindSpeed: 1.5,
                gasStoragePct: 42,
                gridReserveCapacityMW: 110,
                frenchImportPriceEUR: 112.50
            })
        });

        if (!predictionResponse.ok) {
            console.error('Prediction failed:', await predictionResponse.text());
            return;
        }

        const predictionData = await predictionResponse.json();
        console.log('\nComparison Results:');
        console.log('-------------------');
        console.log('RPT Prediction:', predictionData.rptPrediction);
        console.log('RPT Confidence:', predictionData.rptConfidence);
        console.log('Average Prediction:', predictionData.avgPrediction);
        console.log('Based on Records:', predictionData.avgBasedOnRecords);
        console.log('Predictions Match:', predictionData.predictionsMatch);
        console.log('Recommendation:', predictionData.recommendation);
        console.log('\nAnalysis:', predictionData.analysisNotes);

        // Switch to Canary Islands dataset
        console.log('\n4. Switching to Canary Islands dataset...');
        const canaryResponse = await fetch(`${baseUrl}/activatePresetDataset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preset: 'canary' })
        });

        const canaryData = await canaryResponse.json();
        console.log('Canary Islands dataset activated:', canaryData);

        console.log('\n✅ Dataset initialization and testing complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\nMake sure the server is running: npm run dev');
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testDatasetActivation();
}

export { testDatasetActivation };
