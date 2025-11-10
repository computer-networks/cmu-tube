#!/usr/bin/env node
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

class ABRTestRunner {
    constructor(visualMode = false, benchMode = false, duration = 60) {
        this.visualMode = visualMode;
        this.benchMode = benchMode;
        this.duration = duration; // seconds
        this.containersStarted = false;
        this.testConfigs = [
            {
                name: "unrestricted",
                port: 9001,
                script: "unrestricted.sh",
                weight: 1.0,
                description: "No network constraints",
            },
            {
                name: "6mbit-50ms-jitter",
                port: 9002,
                script: "6mbit_50ms_jitter.sh",
                weight: 1.5,
                description: "Moderate bandwidth with jitter",
            },
            {
                name: "500kbit-100ms-1min",
                port: 9003,
                script: "500kbit_100ms_1min.sh",
                weight: 2.0,
                description: "Low bandwidth",
            },
            {
                name: "10mbit-100ms-1min",
                port: 9004,
                script: "10mbit_100ms_1min.sh",
                weight: 0.5,
                description: "High bandwidth",
            },
            {
                name: "500kbit-then-unrestricted",
                port: 9005,
                script: "500kbit_then_unrestricted.sh",
                weight: 1.5,
                description: "Bandwidth improvement",
            },
            {
                name: "56kbit-100ms-1min",
                port: 9006,
                script: "56kbit_100ms_1min.sh",
                weight: 1.0,
                description: "Very low bandwidth",
            },
            {
                name: "oscillate-1mbit-start",
                port: 9007,
                script: "oscillate_1mbit_start.sh",
                weight: 2.0,
                description: "Variable bandwidth starting low",
            },
            {
                name: "oscillate-5mbit-start",
                port: 9008,
                script: "oscillate_5mbit_start.sh",
                weight: 1.5,
                description: "Variable bandwidth starting high",
            },
            {
                name: "4mbit-then-200kbit",
                port: 9009,
                script: "4mbit_then_200kbit.sh",
                weight: 1.5,
                description: "Bandwidth degradation",
            },
            {
                name: "3mbit-100ms-1min",
                port: 9010,
                script: "3mbit_100ms_1min.sh",
                weight: 2.0,
                description: "Median bandwidth",
            },
            {
                name: "jernbanetorget-ljabru-tram",
                port: 9011,
                script: "jernbanetorget_ljabru_tram.sh",
                description: "real-world bandwidth when taking a tram from Ljansbakken to Jernbanetorget"
            },
            {
                name: "snaroya-smestad-car",
                port: 9012,
                script: "snaroya_smestad_car.sh",
                description: "real-world bandwidth when driving from snaroya to smestad"
            }
        ];


        this.results = {};
        this.scores = {};
    }

    // Test cases should realistically adapt based on the manifest file
    // The `qualityExpectation` used to tag a test with the appropriate
    // expectation
    // TODO: Open to suggestions on these target values
    getNetworkCapability(testName) {
        const capabilities = {
            unrestricted: {
                maxRealistic: 4220,
                variableBandwidth: false,
                qualityExpectation: "maximum",
                qualityTarget: 3500,
                switchTolerance: "strict",
            },
            "200kbit-100ms-1min": {
                maxRealistic: 178,
                variableBandwidth: false,
                qualityExpectation: "constrained",
                qualityTarget: 150,
                switchTolerance: "strict",
            },
            "500kbit-then-unrestricted": {
                maxRealistic: 2800,
                variableBandwidth: true,
                qualityExpectation: "adaptive",
                qualityTarget: 1500,
                switchTolerance: "lenient",
            },
            "1mbit-100ms-1min": {
                maxRealistic: 791,
                variableBandwidth: false,
                qualityExpectation: "moderate",
                qualityTarget: 600,
                switchTolerance: "strict",
            },
            "6mbit-50ms-jitter": {
                maxRealistic: 4220,
                variableBandwidth: true,
                qualityExpectation: "high",
                qualityTarget: 3000,
                switchTolerance: "moderate",
            },
            "10mbit-100ms-1min": {
                maxRealistic: 4220,
                variableBandwidth: false,
                qualityExpectation: "maximum",
                qualityTarget: 4000,
                switchTolerance: "strict",
            },
            "oscillate-1mbit-start": {
                maxRealistic: 2800,
                variableBandwidth: true,
                qualityExpectation: "adaptive",
                qualityTarget: 1200,
                switchTolerance: "very_lenient",
            },
            "oscillate-5mbit-start": {
                maxRealistic: 2800,
                variableBandwidth: true,
                qualityExpectation: "adaptive",
                qualityTarget: 1800,
                switchTolerance: "very_lenient",
            },
            "unrestricted-then-1mbit": {
                maxRealistic: 2800,
                variableBandwidth: true,
                qualityExpectation: "adaptive",
                qualityTarget: 1500,
                switchTolerance: "lenient",
            },
        };

        return (
            capabilities[testName] || {
                maxRealistic: 0,
                variableBandwidth: false,
                qualityExpectation: "unknown",
                qualityTarget: 0,
                switchTolerance: "strict",
            }
        );
    }

    async runAllTests() {
        console.log("Running all tests directly on host...");
        try {

            for (const config of this.testConfigs) {
                console.log(`\n--- Running test: ${config.name} ---`);
                await this.runSingleTest(config);

                console.log("[WAIT] Sleeping for 5 seconds before next test...");
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

        } finally {
            console.log("✅ Collected results for:", Object.keys(this.results));
            this.saveResults();
        }
    }

    async runSingleTest(config) {
        let scriptProcess = null;

        // If the test has a toxiproxy profile script, launch it
        if (config.script) {
            scriptProcess = this.startNetworkScript(config.script);
        }

        // Wait for toxiproxy setup
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const url = `http://localhost:${config.port}`;
        console.log(`[TEST] Accessing ${url}`);

        try {
            const metrics = await this.runHeadlessChrome(url, this.duration);
            this.results[config.name] = metrics;
        } catch (error) {
            console.log(`Test ${config.name} failed:`, error.message);
            this.results[config.name] = { error: error.message };
        }

        if (scriptProcess) {
            try { scriptProcess.kill(); } catch {}
        }
    }

    async runHeadlessChrome(url, duration = 60) {
        const puppeteer = require("puppeteer");
        const os = require("os");
        const path = require("path");

        const userDataDir = path.join(os.tmpdir(), `chrome-${Date.now()}`);

        const browser = await puppeteer.launch({
            executablePath: "/usr/bin/google-chrome",
            headless: this.visualMode ? false : "new",
            args: [
                `--user-data-dir=${userDataDir}`,
                "--no-sandbox",
            ],
        });

        const page = await browser.newPage();

        page.on("console", (msg) =>
            console.log("Browser console:", msg.text()),
        );
        
        page.on('response', async (response) => {
            if (response.status() >= 400) {
                console.log('[HTTP]', response.status(), response.url());
            }
        });

        page.on('requestfailed', req =>
            console.log('[REQFAIL]', req.url(), '→', req.failure()?.errorText)
        );

        try {
            await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });

            await page.waitForSelector("#player", { timeout: 30000 });
            await page.waitForFunction(
                () => {
                    return window.videoPlayer && window.videoPlayer.evalMetrics;
                },
                { timeout: 30000 },
            );

            await new Promise((resolve) => setTimeout(resolve, this.duration * 1000));

            const metrics = await page.evaluate(() => {
                const evalMetrics = window.videoPlayer.evalMetrics;
                const videoElement = document.getElementById("player");

                let avgBitrate = 0;
                if (typeof window.videoPlayer.getAverageBitrate === "function") {
                    avgBitrate = window.videoPlayer.getAverageBitrate();
                } else if (
                    evalMetrics.bitrateHistory &&
                    evalMetrics.bitrateHistory.length > 0
                ) {
                    const sum = evalMetrics.bitrateHistory.reduce((a, b) => a + b, 0);
                    avgBitrate = sum / evalMetrics.bitrateHistory.length;
                }

                const duration = videoElement ? videoElement.currentTime : 0;

                return {
                    timeToFirstFrame: evalMetrics.timeToFirstFrame,
                    numRebuffers: evalMetrics.numRebuffers,
                    numQualitySwitches: evalMetrics.numQualitySwitches,
                    averageBitrate: avgBitrate,
                    duration: duration,  // <-- renamed from currentTime
                    timestamp: new Date().toISOString(),
                    bitrateHistory: evalMetrics.bitrateHistory || [],
                };
            });
            return metrics;
        } catch (error) {
            console.log(error);
            throw error;
        } finally {
            await browser.close();
            try {
                const fs = require("fs");
                if (fs.existsSync(userDataDir)) {
                    fs.rmSync(userDataDir, { recursive: true, force: true });
                }
            } catch (cleanupError) {
                console.warn("temp directory cleanup failed");
            }
        }
    }

    // startDockerContainers() {
    //     try {
    //         execSync("sudo docker-compose up -d", { stdio: "inherit" });
    //         this.containersStarted = true;
    //     } catch (error) {
    //         throw new Error("cannot start docker containers");
    //     }
    // }

    // async waitForContainers() {
    //     console.log("Waiting for containers");
    //     await new Promise((resolve) => setTimeout(resolve, 10000));

    //     for (const config of this.testConfigs) {
    //         let retries = 5;
    //         let isReady = false;

    //         while (retries > 0 && !isReady) {
    //             try {
    //                 const result = execSync(
    //                     `curl -f -s http://localhost:${config.healthCheckPort || config.port}`,
    //                     {
    //                         timeout: 10000,
    //                         encoding: "utf8",
    //                     },
    //                 );
    //                 isReady = true;
    //             } catch (error) {
    //                 retries--;
    //                 if (retries > 0) {
    //                     await new Promise((resolve) =>
    //                         setTimeout(resolve, 5000),
    //                     );
    //                 }
    //             }
    //         }

    //         if (!isReady) {
    //             throw new Error(`Container on port ${config.port} not ready`);
    //         }
    //     }
    // }

    // startNetworkScript(containerName, scriptName) {
    //     return spawn(
    //         "docker",
    //         ["exec", containerName, "bash", `/scripts/${scriptName}`],
    //         { stdio: "inherit" },
    //     );
    // }

    // cleanupContainers() {
    //     if (!this.containersStarted) {
    //         return;
    //     }
    //     try {
    //         execSync("sudo docker-compose down", { stdio: "inherit" });
    //         this.containersStarted = false;
    //     } catch (error) {
    //         console.warn("Error stopping containers");
    //     }
    // }

    startNetworkScript(scriptName) {
        // Run the network profile script directly on host
        console.log(`Starting network script: ${scriptName}`);
        return spawn("bash", [path.join(__dirname, "scripts", scriptName)], { stdio: "inherit" });
    }


    saveResults() {
        const resultsFile = "test-results.json";
        const formattedResults = {};

        for (const config of this.testConfigs) {
            const testName = config.name;
            const metrics = this.results[testName];

            if (!metrics || metrics.error) {
                formattedResults[testName] = {
                    network: testName,
                    error: metrics?.error || "No data"
                };
                continue;
            }

            // Extract key metrics with safe defaults
            const averageBitrate = metrics.averageBitrate || 0;
            const numRebuffers = metrics.numRebuffers || 0;
            const numQualitySwitches = metrics.numQualitySwitches || 0;
            const timeToFirstFrame = metrics.timeToFirstFrame || 0;
            const duration = metrics.duration || 0;
            const stallTime = Math.max(0, this.duration - duration);

            // --- Compute simplified QoE metric ---
            const bitrateMbps = averageBitrate / 1e6;

            // Weighted QoE model (all penalties in seconds or counts)
            const QoE_score =
                100 * bitrateMbps       // reward for quality
                - 10.0 * stallTime         // stall time penalty (s)
                - 3.0 * numRebuffers      // each rebuffer hurts a lot
                - 1 * (timeToFirstFrame / 1000); // convert ms→s, mild penalty
                - 0.1 * numQualitySwitches// small annoyance
                
            // Store results
            formattedResults[testName] = {
                network: testName,
                QoE_score: QoE_score,
                metrics: {
                    averageBitrate_bps: averageBitrate,
                    numRebuffers: numRebuffers,
                    numQualitySwitches: numQualitySwitches,
                    timeToFirstFrame_ms: timeToFirstFrame,
                    duration_s: duration,
                    stallTime_s: stallTime,
                    bitrateHistory: metrics.bitrateHistory || []
                }
            };
            console.log(`[RESULT] ${testName}: QoE=${QoE_score.toFixed(2)}, bitrate=${averageBitrate.toFixed(0)}, rebuffer=${numRebuffers}, switches=${numQualitySwitches}, TTF=${timeToFirstFrame}, Stall Time=${stallTime}`);

        }

        const resultsData = {
            timestamp: new Date().toISOString(),
            testResults: formattedResults
        };

        fs.writeFileSync(resultsFile, JSON.stringify(resultsData, null, 2));
        console.log(`✅ Saved simplified QoE results to ${resultsFile}`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    let visualMode = false;
    let benchMode = false;
    let duration = 60; 
    let filteredArgs = [];

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--visual") {
            visualMode = true;
        } else if (args[i] === "--bench") {
            benchMode = true;
        } else if (args[i] === "--duration") {
            duration = parseInt(args[i + 1], 10) || 60;
            i++;
        }else {
            filteredArgs.push(args[i]);
        }
    }

    const runner = new ABRTestRunner(visualMode, benchMode, duration);

    const handleFatalError = (err) => {
        console.error("[FATAL] Unhandled error:", err);
        try { runner.stopToxiproxy(); } catch {}
        process.exit(1);
    };
    process.on("uncaughtException", handleFatalError);
    process.on("unhandledRejection", handleFatalError);


    const cleanShutdown = () => {
        console.log("[SHUTDOWN] Caught termination signal. Cleaning up...");
        try { runner.stopToxiproxy(); } catch {}
        // runner.cleanupContainers();
        process.exit(0);
    };

    process.on('SIGINT', cleanShutdown);
    process.on('SIGTERM', cleanShutdown);

    if (visualMode) {
        console.log("Running in visual mode");
    }

    if (filteredArgs.length === 0) {
        await runner.runAllTests();
    } else if (filteredArgs[0] === "list") {
        console.log("Available tests:");
        runner.testConfigs.forEach((config) => {
            console.log(
                `${config.name} (port: ${config.port}, weight: ${config.weight})`,
            );
            console.log(`-- ${config.description}`);
        });
    } else {
        const testName = filteredArgs[0];
        const config = runner.testConfigs.find((c) => c.name === testName);
        if (!config) {
            console.error(
                `"${testName}" not found. Use "list" to see all tests.`,
            );
            process.exit(1);
        }

        try {
            await runner.runSingleTest(config);
            runner.saveResults();
        } finally {
        }
    }
}

if (require.main === module) {
    main().catch((err) => {
        console.error("Test runner failed:", err.message);
        process.exit(1);
    });
}

module.exports = ABRTestRunner;
