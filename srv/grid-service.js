import cds from '@sap/cds';

export default class GridService extends cds.ApplicationService {

    async init() {
        const { GridSnapshots, PredictionRequests, PowerPlants, DatasetUploads, PredictionComparisons } = this.entities;

        // ============================================
        // ACTION: Activate Preset Dataset
        // ============================================
        this.on('activatePresetDataset', async (req) => {
            const { preset } = req.data;

            // Check if preset already exists
            let dataset = await SELECT.one.from(DatasetUploads).where({ name: `${preset === 'germany' ? 'Germany (Variable)' : 'Canary Islands (Stable)'}` });

            if (dataset) {
                // Dataset already exists, just activate it
                await UPDATE(DatasetUploads).set({ isActive: false });
                await UPDATE(DatasetUploads, dataset.ID).set({ isActive: true });

                return {
                    datasetId: dataset.ID,
                    name: dataset.name,
                    recordCount: dataset.recordCount,
                    variabilityScore: dataset.variabilityScore
                };
            }

            // Dataset doesn't exist, import it
            // Deactivate current dataset
            await UPDATE(DatasetUploads).set({ isActive: false });

            // Load preset data
            const csvFileName = preset === 'germany' ? 'germany-grid-data.csv' : 'canary-islands-grid-data.csv';
            const datasetName = preset === 'germany' ? 'Germany (Variable)' : 'Canary Islands (Stable)';
            const location = preset === 'germany' ? 'Germany' : 'Tenerife, Canary Islands, Spain';

            // Import CSV data
            const result = await this._importPresetDataset(preset, datasetName, location, csvFileName);
            dataset = result.dataset;

            return {
                datasetId: dataset.ID,
                name: dataset.name,
                recordCount: dataset.recordCount,
                variabilityScore: dataset.variabilityScore
            };
        });

        // ============================================
        // ACTION: Request Comparison Prediction
        // ============================================
        this.on('requestComparisonPrediction', async (req) => {
            const {
                targetDate,
                targetHour,
                forecastInsolation,
                forecastWindSpeed,
                gasStoragePct,
                gridReserveCapacityMW,
                frenchImportPriceEUR
            } = req.data;

            const overallStartTime = Date.now();

            // Get active dataset
            const activeDataset = await SELECT.one.from(DatasetUploads).where({ isActive: true });
            if (!activeDataset) {
                req.error(400, 'No active dataset. Please activate a dataset first.');
            }

            // Run RPT prediction
            const rptStartTime = Date.now();
            let rptResult;
            try {
                const contextRecords = await this._fetchAnalogueDays(
                    forecastInsolation,
                    forecastWindSpeed,
                    50
                );

                const targetRecord = {
                    Hour_Of_Day: targetHour,
                    Forecast_Insolation: forecastInsolation,
                    Forecast_Wind_Speed: forecastWindSpeed,
                    Current_Gas_Storage_Pct: gasStoragePct,
                    Grid_Reserve_Capacity_MW: gridReserveCapacityMW,
                    French_Import_Price_EUR: frenchImportPriceEUR,
                    Buy_Advance_Energy_FR: null
                };

                rptResult = await this._callSapRpt(contextRecords, targetRecord);
                rptResult.responseTimeMs = Date.now() - rptStartTime;
            } catch (error) {
                console.error('RPT prediction failed (simulating):', error);

                // SIMULATED RPT RESPONSE when credentials not available
                // Use simple heuristic to simulate RPT-like prediction
                const simulatedPrediction = this._simulateRptPrediction({
                    forecastInsolation,
                    forecastWindSpeed,
                    gasStoragePct,
                    gridReserveCapacityMW
                });

                rptResult = {
                    prediction: simulatedPrediction.decision,
                    confidence: simulatedPrediction.confidence,
                    justification: `[SIMULATED - No AI Core credentials] ${simulatedPrediction.justification}`,
                    responseTimeMs: -1  // -1 indicates simulated response
                };
            }

            // Run simple average calculation
            const avgStartTime = Date.now();
            const avgResult = await this._calculateAveragePrediction({
                targetInsolation: forecastInsolation,
                targetWindSpeed: forecastWindSpeed,
                gasStoragePct,
                gridReserveCapacityMW,
                frenchImportPriceEUR
            });
            avgResult.calculationTimeMs = Date.now() - avgStartTime;

            // Comparison analysis
            const predictionsMatch = rptResult.prediction === avgResult.avgPrediction;
            let recommendation = 'REVIEW_NEEDED';
            let analysisNotes = '';

            if (activeDataset.variabilityScore > 3.0) {
                recommendation = 'TRUST_RPT';
                analysisNotes = `High variability dataset (score: ${activeDataset.variabilityScore}/10). ` +
                    `RPT's pattern recognition is more reliable than simple averaging. ` +
                    `Average method shows ${avgResult.avgStdDeviation ? `high uncertainty (±${avgResult.avgStdDeviation.toFixed(1)} MW)` : 'limited data'}.`;
            } else if (activeDataset.variabilityScore < 1.5) {
                recommendation = predictionsMatch ? 'TRUST_AVG' : 'REVIEW_NEEDED';
                analysisNotes = `Low variability dataset (score: ${activeDataset.variabilityScore}/10). ` +
                    `Simple averaging is sufficient for stable conditions. ` +
                    (predictionsMatch ?
                        'Both methods agree, indicating clear pattern.' :
                        'Methods disagree - unusual for stable conditions, review recommended.');
            } else {
                recommendation = 'TRUST_RPT';
                analysisNotes = `Medium variability dataset (score: ${activeDataset.variabilityScore}/10). ` +
                    `RPT recommended for moderate complexity. ` +
                    `${predictionsMatch ? 'Both methods agree.' : 'RPT identified patterns that averaging may miss.'}`;
            }

            // Store comparison
            const comparisonId = cds.utils.uuid();
            await INSERT.into(PredictionComparisons).entries({
                ID: comparisonId,
                requestTimestamp: new Date().toISOString(),
                dataset_ID: activeDataset.ID,
                targetDate,
                targetHour,
                forecastInsolation,
                forecastWindSpeed,
                gasStoragePct,
                gridReserveCapacityMW,
                frenchImportPriceEUR,
                rptPrediction: rptResult.prediction,
                rptConfidence: rptResult.confidence,
                rptJustification: rptResult.justification,
                rptResponseTimeMs: rptResult.responseTimeMs,
                avgPrediction: avgResult.avgPrediction,
                avgBasedOnRecords: avgResult.basedOnRecords,
                avgStdDeviation: avgResult.stdDeviation,
                avgCalculationTimeMs: avgResult.calculationTimeMs,
                avgLogic: avgResult.logic,
                predictionsMatch,
                recommendation,
                analysisNotes
            });

            return {
                rptPrediction: rptResult.prediction,
                rptConfidence: rptResult.confidence,
                rptJustification: rptResult.justification,
                rptResponseTimeMs: rptResult.responseTimeMs,
                avgPrediction: avgResult.avgPrediction,
                avgBasedOnRecords: avgResult.basedOnRecords,
                avgStdDeviation: avgResult.stdDeviation,
                avgLogic: avgResult.logic,
                avgCalculationTimeMs: avgResult.calculationTimeMs,
                predictionsMatch,
                recommendation,
                analysisNotes,
                comparisonId
            };
        });

        // ============================================
        // FUNCTION: Get Active Dataset
        // ============================================
        this.on('getActiveDataset', async () => {
            const dataset = await SELECT.one.from(DatasetUploads).where({ isActive: true });

            if (!dataset) {
                return {
                    datasetId: null,
                    name: 'No dataset active',
                    location: null,
                    recordCount: 0,
                    variabilityScore: 0
                };
            }

            return {
                datasetId: dataset.ID,
                name: dataset.name,
                location: dataset.location,
                recordCount: dataset.recordCount,
                variabilityScore: dataset.variabilityScore,
                insolationMean: dataset.insolationMean,
                insolationStdDev: dataset.insolationStdDev,
                windSpeedMean: dataset.windSpeedMean,
                windSpeedStdDev: dataset.windSpeedStdDev
            };
        });

        // ============================================
        // ACTION: Request Prediction from SAP RPT
        // ============================================
        this.on('requestPrediction', async (req) => {
            const {
                targetDate,
                targetHour,
                forecastInsolation,
                forecastWindSpeed,
                gasStoragePct,
                gridReserveCapacityMW,
                frenchImportPriceEUR
            } = req.data;

            const startTime = Date.now();

            try {
                // 1. Fetch analogue days (historical context for RPT)
                const contextRecords = await this._fetchAnalogueDays(
                    forecastInsolation,
                    forecastWindSpeed,
                    50 // Get 50 similar historical records
                );

                // 2. Build the target record (what we want to predict)
                const targetRecord = {
                    Hour_Of_Day: targetHour,
                    Forecast_Insolation: forecastInsolation,
                    Forecast_Wind_Speed: forecastWindSpeed,
                    Current_Gas_Storage_Pct: gasStoragePct,
                    Grid_Reserve_Capacity_MW: gridReserveCapacityMW,
                    French_Import_Price_EUR: frenchImportPriceEUR,
                    Buy_Advance_Energy_FR: null  // This is what RPT predicts
                };

                // 3. Call SAP RPT
                const rptResponse = await this._callSapRpt(contextRecords, targetRecord);

                const responseTimeMs = Date.now() - startTime;

                // 4. Store the prediction request
                const requestId = cds.utils.uuid();
                await INSERT.into(PredictionRequests).entries({
                    ID: requestId,
                    requestTimestamp: new Date().toISOString(),
                    targetDate,
                    targetHour,
                    forecastInsolation,
                    forecastWindSpeed,
                    gasStoragePct,
                    gridReserveCapacityMW,
                    frenchImportPriceEUR,
                    predictedDecision: rptResponse.prediction,
                    confidenceScore: rptResponse.confidence,
                    justification: rptResponse.justification,
                    status: 'COMPLETED',
                    rptResponseTimeMs: responseTimeMs
                });

                return {
                    predictedDecision: rptResponse.prediction,
                    confidenceScore: rptResponse.confidence,
                    justification: rptResponse.justification,
                    requestId
                };

            } catch (error) {
                console.error('RPT Prediction Error:', error);

                // Store failed request
                const requestId = cds.utils.uuid();
                await INSERT.into(PredictionRequests).entries({
                    ID: requestId,
                    requestTimestamp: new Date().toISOString(),
                    targetDate,
                    targetHour,
                    forecastInsolation,
                    forecastWindSpeed,
                    gasStoragePct,
                    gridReserveCapacityMW,
                    frenchImportPriceEUR,
                    status: 'ERROR',
                    errorMessage: error.message,
                    rptResponseTimeMs: Date.now() - startTime
                });

                req.error(500, `RPT Prediction failed: ${error.message}`);
            }
        });

        // ============================================
        // FUNCTION: Get Current Grid Status
        // ============================================
        this.on('getGridStatus', async () => {
            const { PowerPlants, GridSnapshots } = this.entities;

            // Get current power plant outputs
            const plants = await SELECT.from(PowerPlants).where({ status: 'ONLINE' });

            const solarOutputMW = plants
                .filter(p => p.type === 'SOLAR')
                .reduce((sum, p) => sum + parseFloat(p.currentOutputMW || 0), 0);

            const windOutputMW = plants
                .filter(p => p.type === 'WIND')
                .reduce((sum, p) => sum + parseFloat(p.currentOutputMW || 0), 0);

            const gasOutputMW = plants
                .filter(p => p.type === 'GAS')
                .reduce((sum, p) => sum + parseFloat(p.currentOutputMW || 0), 0);

            const totalGenerationMW = solarOutputMW + windOutputMW + gasOutputMW;

            // Get latest snapshot for demand and reserves
            const latestSnapshot = await SELECT.one.from(GridSnapshots)
                .orderBy('timestamp desc');

            const totalDemandMW = latestSnapshot?.currentDemandMW || 0;
            const reserveCapacityMW = latestSnapshot?.gridReserveCapacityMW || 0;
            const gasStoragePct = latestSnapshot?.gasStoragePct || 0;

            // Calculate grid health
            const surplusMW = totalGenerationMW - totalDemandMW + reserveCapacityMW;
            let gridHealthStatus = 'HEALTHY';
            if (surplusMW < 100) gridHealthStatus = 'WARNING';
            if (surplusMW < 0 || gasStoragePct < 30) gridHealthStatus = 'CRITICAL';

            return {
                totalGenerationMW,
                totalDemandMW,
                reserveCapacityMW,
                gasStoragePct,
                solarOutputMW,
                windOutputMW,
                gasOutputMW,
                gridHealthStatus
            };
        });

        // ============================================
        // FUNCTION: Get Analogue Days
        // ============================================
        this.on('getAnalogueDays', async (req) => {
            const { targetInsolation, targetWindSpeed, limit = 20 } = req.data;
            return this._fetchAnalogueDays(targetInsolation, targetWindSpeed, limit);
        });

        await super.init();
    }

    // ============================================
    // PRIVATE: Fetch similar historical days
    // ============================================
    async _fetchAnalogueDays(targetInsolation, targetWindSpeed, limit) {
        const { GridSnapshots, DatasetUploads } = this.entities;

        // Get active dataset
        const activeDataset = await SELECT.one.from(DatasetUploads).where({ isActive: true });

        // Define tolerance ranges for "similar" weather
        const insolationTolerance = 150; // W/m²
        const windSpeedTolerance = 3;    // m/s

        // Build where clause
        const whereClause = {
            isActual: true,
            and: {
                forecastInsolation: { '>=': targetInsolation - insolationTolerance },
                and: {
                    forecastInsolation: { '<=': targetInsolation + insolationTolerance },
                    and: {
                        forecastWindSpeed: { '>=': targetWindSpeed - windSpeedTolerance },
                        and: {
                            forecastWindSpeed: { '<=': targetWindSpeed + windSpeedTolerance }
                        }
                    }
                }
            }
        };

        // If active dataset exists, filter by it
        if (activeDataset) {
            whereClause.dataset_ID = activeDataset.ID;
        }

        // Query historical records with similar weather patterns
        const records = await SELECT.from(GridSnapshots)
            .where(whereClause)
            .orderBy('timestamp desc')
            .limit(limit);

        // If not enough similar records, expand the search
        if (records.length < limit / 2) {
            console.log(`Only ${records.length} analogue days found, fetching recent records as fallback`);
            const fallbackWhere = { isActual: true };
            if (activeDataset) {
                fallbackWhere.dataset_ID = activeDataset.ID;
            }
            const recentRecords = await SELECT.from(GridSnapshots)
                .where(fallbackWhere)
                .orderBy('timestamp desc')
                .limit(limit);
            return recentRecords;
        }

        return records;
    }

    // ============================================
    // PRIVATE: Call SAP RPT API
    // ============================================
    async _callSapRpt(contextRecords, targetRecord) {
        // Get AI Core destination/credentials
        const aiCoreCredentials = await this._getAiCoreCredentials();

        // Get OAuth token
        const token = await this._getOAuthToken(aiCoreCredentials);

        // Build RPT payload
        const payload = this._buildRptPayload(contextRecords, targetRecord);

        // Call RPT endpoint
        const deploymentUrl = process.env.RPT_DEPLOYMENT_URL ||
            'https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com/v2/inference/deployments/d90d7d67b9f30016';

        const response = await fetch(`${deploymentUrl}/invoke`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'AI-Resource-Group': 'default'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`RPT API Error (${response.status}): ${errorText}`);
        }

        const rptResult = await response.json();
        return this._parseRptResponse(rptResult);
    }

    // ============================================
    // PRIVATE: Get AI Core Credentials
    // ============================================
    async _getAiCoreCredentials() {
        // Option 1: From BTP Destination (for deployed apps)
        try {
            const destinationService = await cds.connect.to('destination');
            const destination = await destinationService.get('SAP_AI_CORE');
            if (destination) {
                return {
                    clientId: destination.clientId,
                    clientSecret: destination.clientSecret,
                    tokenUrl: destination.tokenServiceURL,
                    apiUrl: destination.URL
                };
            }
        } catch (e) {
            console.log('Destination not found, using environment variables');
        }

        // Option 2: From environment variables (for local dev)
        return {
            clientId: process.env.AI_CORE_CLIENT_ID,
            clientSecret: process.env.AI_CORE_CLIENT_SECRET,
            tokenUrl: process.env.AI_CORE_TOKEN_URL,
            apiUrl: process.env.AI_CORE_API_URL
        };
    }

    // ============================================
    // PRIVATE: Get OAuth Token
    // ============================================
    async _getOAuthToken(credentials) {
        const { clientId, clientSecret, tokenUrl } = credentials;

        if (!clientId || !clientSecret || !tokenUrl) {
            throw new Error('AI Core credentials not configured. Set environment variables or BTP destination.');
        }

        const response = await fetch(`${tokenUrl}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            throw new Error(`OAuth token request failed: ${response.status}`);
        }

        const tokenData = await response.json();
        return tokenData.access_token;
    }

    // ============================================
    // PRIVATE: Build RPT Payload
    // ============================================
    _buildRptPayload(contextRecords, targetRecord) {
        // Transform context records to RPT format
        const formattedContext = contextRecords.map(record => ({
            Hour_Of_Day: record.hourOfDay,
            Forecast_Insolation: parseFloat(record.forecastInsolation),
            Forecast_Wind_Speed: parseFloat(record.forecastWindSpeed),
            Current_Gas_Storage_Pct: parseFloat(record.gasStoragePct),
            Grid_Reserve_Capacity_MW: parseFloat(record.gridReserveCapacityMW),
            French_Import_Price_EUR: parseFloat(record.frenchImportPriceEUR),
            Buy_Advance_Energy_FR: record.buyDecision || 'NO_ACTION'
        }));

        return {
            context_records: formattedContext,
            target_record: targetRecord,
            target_column: 'Buy_Advance_Energy_FR',
            explain: true  // Request explanation from RPT
        };
    }

    // ============================================
    // PRIVATE: Parse RPT Response
    // ============================================
    _parseRptResponse(rptResult) {
        // Adapt this based on actual RPT 1.6 response format
        return {
            prediction: rptResult.prediction || rptResult.predicted_value || 'UNKNOWN',
            confidence: rptResult.confidence || rptResult.confidence_score || 0,
            justification: rptResult.explanation || rptResult.justification ||
                'No explanation provided by RPT'
        };
    }

    // ============================================
    // PRIVATE: Calculate Simple Average Prediction
    // ============================================
    async _calculateAveragePrediction(params) {
        const {
            targetInsolation,
            targetWindSpeed,
            gasStoragePct,
            gridReserveCapacityMW,
            frenchImportPriceEUR
        } = params;

        const startTime = Date.now();

        // Get active dataset
        const activeDataset = await SELECT.one.from(this.entities.DatasetUploads).where({ isActive: true });
        if (!activeDataset) {
            return {
                avgPrediction: 'NO_DATASET',
                basedOnRecords: 0,
                stdDeviation: 0,
                logic: 'No active dataset selected',
                calculationTimeMs: Date.now() - startTime
            };
        }

        // Define matching criteria (wider tolerance than RPT analogue days)
        const insolationRange = 100; // ±100 W/m²
        const windSpeedRange = 2;    // ±2 m/s

        // Find matching historical records from active dataset
        const matchingRecords = await SELECT.from(this.entities.GridSnapshots)
            .where({
                dataset_ID: activeDataset.ID,
                isActual: true,
                and: {
                    forecastInsolation: { '>=': targetInsolation - insolationRange },
                    and: {
                        forecastInsolation: { '<=': targetInsolation + insolationRange },
                        and: {
                            forecastWindSpeed: { '>=': targetWindSpeed - windSpeedRange },
                            and: {
                                forecastWindSpeed: { '<=': targetWindSpeed + windSpeedRange }
                            }
                        }
                    }
                }
            });

        if (matchingRecords.length === 0) {
            return {
                avgPrediction: 'INSUFFICIENT_DATA',
                basedOnRecords: 0,
                stdDeviation: 0,
                logic: `No similar historical records found (searched for insolation ${(targetInsolation - insolationRange).toFixed(0)}-${(targetInsolation + insolationRange).toFixed(0)} W/m², wind ${(targetWindSpeed - windSpeedRange).toFixed(1)}-${(targetWindSpeed + windSpeedRange).toFixed(1)} m/s)`,
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

        const percentageOfMode = ((decisionCounts[avgPrediction] / matchingRecords.length) * 100).toFixed(1);

        const logic = `Found ${matchingRecords.length} similar historical records ` +
            `(insolation ${(targetInsolation - insolationRange).toFixed(0)}-${(targetInsolation + insolationRange).toFixed(0)} W/m², ` +
            `wind ${(targetWindSpeed - windSpeedRange).toFixed(1)}-${(targetWindSpeed + windSpeedRange).toFixed(1)} m/s). ` +
            `Most common decision: ${avgPrediction} ` +
            `(${decisionCounts[avgPrediction]} out of ${matchingRecords.length} = ${percentageOfMode}%). ` +
            (stdDeviation > 0 ? `Standard deviation: ±${stdDeviation.toFixed(1)} MW indicates ${stdDeviation > 50 ? 'high' : 'moderate'} uncertainty.` : 'Very consistent decisions.');

        return {
            avgPrediction,
            basedOnRecords: matchingRecords.length,
            stdDeviation,
            logic,
            calculationTimeMs: Date.now() - startTime
        };
    }

    // ============================================
    // PRIVATE: Import Preset Dataset
    // ============================================
    async _importPresetDataset(preset, name, location, csvFileName) {
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const csvPath = path.join(__dirname, '..', 'db', 'data', csvFileName);
        const csvContent = fs.readFileSync(csvPath, 'utf8');

        // Parse CSV
        const lines = csvContent.split('\n');
        const headers = lines[0].split(';');
        const records = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(';');
            const record = {};
            headers.forEach((header, index) => {
                record[header.trim()] = values[index]?.trim();
            });
            records.push(record);
        }

        // Calculate variability metrics
        const insolations = records.map(r => parseFloat(r.forecastInsolation));
        const windSpeeds = records.map(r => parseFloat(r.forecastWindSpeed));
        const gasStorages = records.map(r => parseFloat(r.gasStoragePct));

        const calculateStats = (arr) => {
            const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
            const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
            const stdDev = Math.sqrt(variance);
            const cv = stdDev / mean; // Coefficient of variation
            return { mean, stdDev, cv };
        };

        const insolStats = calculateStats(insolations);
        const windStats = calculateStats(windSpeeds);
        const gasStats = calculateStats(gasStorages);

        // Variability score (0-10): weighted average of coefficients of variation
        const variabilityScore = (
            insolStats.cv * 4 +
            windStats.cv * 3 +
            gasStats.cv * 3
        );

        // Create dataset record
        const datasetId = cds.utils.uuid();
        await INSERT.into(this.entities.DatasetUploads).entries({
            ID: datasetId,
            name,
            description: `Preset dataset: ${name}`,
            location,
            recordCount: records.length,
            dateRangeStart: records[0].timestamp.split('T')[0],
            dateRangeEnd: records[records.length - 1].timestamp.split('T')[0],
            insolationMean: insolStats.mean,
            insolationStdDev: insolStats.stdDev,
            windSpeedMean: windStats.mean,
            windSpeedStdDev: windStats.stdDev,
            gasStorageMean: gasStats.mean,
            gasStorageStdDev: gasStats.stdDev,
            variabilityScore,
            isActive: true,
            uploadStatus: 'ACTIVE'
        });

        // Insert grid snapshots (always generate new IDs to avoid conflicts)
        const snapshots = records.map(r => ({
            ID: cds.utils.uuid(), // Always generate new UUID
            dataset_ID: datasetId,
            timestamp: r.timestamp,
            hourOfDay: parseInt(r.hourOfDay),
            forecastInsolation: parseFloat(r.forecastInsolation),
            forecastWindSpeed: parseFloat(r.forecastWindSpeed),
            forecastTemperature: parseFloat(r.forecastTemperature),
            forecastRainProbability: parseInt(r.forecastRainProbability),
            solarGenerationMW: parseFloat(r.solarGenerationMW),
            windGenerationMW: parseFloat(r.windGenerationMW),
            gasGenerationMW: parseFloat(r.gasGenerationMW),
            totalGenerationMW: parseFloat(r.totalGenerationMW),
            gasStoragePct: parseFloat(r.gasStoragePct),
            gridReserveCapacityMW: parseFloat(r.gridReserveCapacityMW),
            currentDemandMW: parseFloat(r.currentDemandMW),
            forecastDemandMW: parseFloat(r.forecastDemandMW),
            frenchImportPriceEUR: parseFloat(r.frenchImportPriceEUR),
            spotPriceEUR: parseFloat(r.spotPriceEUR),
            buyDecision: r.buyDecision,
            isActual: r.isActual === 'true'
        }));

        await INSERT.into(this.entities.GridSnapshots).entries(snapshots);

        console.log(`Imported ${snapshots.length} records for dataset: ${name}`);

        return {
            dataset: {
                ID: datasetId,
                name,
                location,
                recordCount: records.length,
                variabilityScore
            }
        };
    }

    // ============================================
    // PRIVATE: Simulate RPT Prediction (when no credentials)
    // ============================================
    _simulateRptPrediction(params) {
        const { forecastInsolation, forecastWindSpeed, gasStoragePct, gridReserveCapacityMW } = params;

        // Simple rule-based simulation to mimic RPT behavior
        const criticalGas = gasStoragePct < 40;
        const lowRenewables = forecastInsolation < 300 && forecastWindSpeed < 5;
        const lowReserve = gridReserveCapacityMW < 150;
        const veryLowRenewables = forecastInsolation < 150 && forecastWindSpeed < 3;

        let decision = 'NO_ACTION';
        let confidence = 85;
        let justification = '';

        if (criticalGas && veryLowRenewables && lowReserve) {
            decision = 'BUY_500MW';
            confidence = 92;
            justification = `Critical conditions detected: Gas storage critically low (${gasStoragePct.toFixed(1)}%), ` +
                `solar radiation very low (${forecastInsolation.toFixed(0)} W/m²), ` +
                `wind speed insufficient (${forecastWindSpeed.toFixed(1)} m/s), ` +
                `and grid reserve capacity low (${gridReserveCapacityMW.toFixed(0)} MW). ` +
                `High confidence recommendation to purchase 500MW from France to maintain grid stability.`;
        } else if ((criticalGas && lowRenewables) || (lowReserve && veryLowRenewables)) {
            decision = 'BUY_200MW';
            confidence = 88;
            justification = `Concerning conditions: Gas storage ${gasStoragePct < 45 ? 'below threshold' : 'moderate'} (${gasStoragePct.toFixed(1)}%), ` +
                `renewable generation ${lowRenewables ? 'insufficient' : 'limited'} ` +
                `(solar: ${forecastInsolation.toFixed(0)} W/m², wind: ${forecastWindSpeed.toFixed(1)} m/s). ` +
                `Recommend purchasing 200MW to ensure adequate reserve capacity.`;
        } else if (gasStoragePct < 55 && forecastInsolation < 400 && gridReserveCapacityMW < 250) {
            decision = 'BUY_100MW';
            confidence = 82;
            justification = `Moderate risk conditions: Gas storage at ${gasStoragePct.toFixed(1)}%, ` +
                `solar generation moderate (${forecastInsolation.toFixed(0)} W/m²), ` +
                `wind at ${forecastWindSpeed.toFixed(1)} m/s, reserve capacity ${gridReserveCapacityMW.toFixed(0)} MW. ` +
                `Prudent to purchase 100MW as preventive measure.`;
        } else {
            decision = 'NO_ACTION';
            confidence = forecastInsolation > 600 && forecastWindSpeed > 8 ? 95 : 85;
            justification = `Favorable conditions: Sufficient renewable generation expected ` +
                `(solar: ${forecastInsolation.toFixed(0)} W/m², wind: ${forecastWindSpeed.toFixed(1)} m/s), ` +
                `gas storage at ${gasStoragePct.toFixed(1)}%, ` +
                `grid reserve adequate (${gridReserveCapacityMW.toFixed(0)} MW). ` +
                `No additional energy purchase needed at this time.`;
        }

        return { decision, confidence, justification };
    }
}
