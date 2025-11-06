#!/usr/bin/env node

/**
 * This is a simple parser file which will convert the network traces
 * in the 'traces/' directory to a simpler format. This will be run
 * as part of the setup script so you do not need to re-run it.
 */

const fs = require('fs');
const path = require('path');

function parseTraceFile(inputFile, outputFile = null) {
    try {
        const data = fs.readFileSync(inputFile, 'utf8');
        const lines = data.trim().split('\n');

        let output = 'timestamp,linkrate_kbps\n';
        let startTime = null;
        let processedLines = 0;

        for (const line of lines) {
            if (!line.trim() || line.startsWith('#')) continue;

            const parts = line.trim().split(/\s+/);
            if (parts.length !== 6) continue;

            try {
                const unixTime = parseInt(parts[0]);
                const bytesReceived = parseInt(parts[4]);
                const elapsedMs = parseInt(parts[5]);

                if (startTime === null) startTime = unixTime;

                // This will make it easier to read the timestamp
                const relativeTime = unixTime - startTime;
                const linkRateKbps = (bytesReceived * 8) / elapsedMs;

                output += `${relativeTime},${linkRateKbps.toFixed(2)}\n`;
                processedLines++;

            } catch (e) {
                continue;
            }
        }

        if (outputFile) {
            fs.writeFileSync(outputFile, output);
            console.log(`${processedLines} lines: ${inputFile} -> ${outputFile}`);
        } else {
            process.stdout.write(output);
        }

        return true;

    } catch (error) {
        console.error(`Error: ${error.message}`);
        return false;
    }
}

function parseDirectory(directoryPath) {
    try {
        const files = fs.readdirSync(directoryPath);
        let successCount = 0;
        
        for (const file of files) {
            const fullPath = path.join(directoryPath, file);
            
            if (fs.statSync(fullPath).isDirectory() || file.startsWith('.')) {
                continue;
            }
            
            const outputFile = path.join(directoryPath, `${path.parse(file).name}.csv`);
            
            if (parseTraceFile(fullPath, outputFile)) {
                successCount++;
            }
        }
        
        return successCount > 0;
        
    } catch (error) {
        console.error(`Error reading directory: ${error.message}`);
        return false;
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
        console.log('Usage:');
        console.log('  node trace_parser.js INPUT_FILE [OUTPUT_FILE]');
        console.log('  node trace_parser.js --dir DIRECTORY_PATH');
        process.exit(args.length === 0 ? 1 : 0);
    }

    if (args[0] === '--dir') {
        if (args.length < 2) {
            console.error('Error: --dir requires a directory path');
            process.exit(1);
        }
        
        const directoryPath = args[1];
        const success = parseDirectory(directoryPath);
        process.exit(success ? 0 : 1);
    } else {
        const inputFile = args[0];
        const outputFile = args[1];

        const success = parseTraceFile(inputFile, outputFile);
        process.exit(success ? 0 : 1);
    }
}