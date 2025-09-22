/**
 * Timing Monitor - External Decoder for Timing Side-Channel
 *
 * This tool monitors the execution timing of the malicious solver and decodes
 * puzzle information from CPU utilization patterns.
 *
 * It works by:
 * 1. Spawning the malicious solver in a subprocess
 * 2. Monitoring CPU usage patterns during execution
 * 3. Decoding binary data from timing variations
 * 4. Reconstructing the original puzzle from the decoded data
 */

const { spawn } = require('child_process');
const { performance } = require('perf_hooks');

class TimingMonitor {
  constructor() {
    this.BIT_DURATION_MS = 100; // Must match malicious solver
    this.CPU_THRESHOLD = 0.5;   // Threshold to distinguish high/low CPU
    this.measurements = [];
  }

  async monitorSolver(solverPath, puzzle) {
    console.log('🕵️  Starting timing side-channel monitoring...');
    console.log(`📊 Bit duration: ${this.BIT_DURATION_MS}ms`);
    console.log(`🎯 CPU threshold: ${this.CPU_THRESHOLD}`);

    // Start timing measurements
    const measurements = await this.measureSolverTiming(solverPath, puzzle);

    // Decode binary data from timing patterns
    const binaryData = this.decodeBinaryFromTiming(measurements);

    // Reconstruct puzzle from binary data
    const decodedPuzzle = this.decodeBinaryToPuzzle(binaryData);

    return {
      originalPuzzle: puzzle,
      decodedPuzzle: decodedPuzzle,
      measurements: measurements,
      binaryData: binaryData,
      success: this.comparePuzzles(puzzle, decodedPuzzle)
    };
  }

  async measureSolverTiming(solverPath, puzzle) {
    return new Promise((resolve, reject) => {
      console.log('⏱️  Starting solver and measuring timing...');

      const measurements = [];
      const startTime = performance.now();

      // Create a simple test harness for the solver
      const testCode = `
        const solver = require('${solverPath}');
        const puzzle = ${JSON.stringify(puzzle)};
        console.log('TIMING_START');
        const result = solver.solveSudoku(puzzle);
        console.log('TIMING_END');
        console.log(JSON.stringify(result));
      `;

      const process = spawn('node', ['-e', testCode], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let timingStarted = false;
      let output = '';

      // Monitor process output for timing markers
      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;

        if (chunk.includes('TIMING_START') && !timingStarted) {
          timingStarted = true;
          console.log('📡 Timing measurement started');

          // Start fine-grained timing measurements
          this.startTimingMeasurements(measurements);
        }

        if (chunk.includes('TIMING_END') && timingStarted) {
          console.log('🛑 Timing measurement ended');
          resolve(measurements);
        }
      });

      process.stderr.on('data', (data) => {
        console.error('Solver error:', data.toString());
      });

      process.on('close', (code) => {
        if (code !== 0 && measurements.length === 0) {
          reject(new Error(`Solver process exited with code ${code}`));
        } else if (!timingStarted) {
          resolve(measurements);
        }
      });
    });
  }

  startTimingMeasurements(measurements) {
    const measurementInterval = 10; // Sample every 10ms for fine-grained timing
    const startTime = performance.now();

    const intervalId = setInterval(() => {
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;

      // Measure CPU usage proxy (this is simplified - in real implementation
      // you'd use system monitoring tools or native extensions)
      const cpuUsage = this.estimateCPUUsage();

      measurements.push({
        timestamp: elapsed,
        cpuUsage: cpuUsage
      });

    }, measurementInterval);

    // Stop measurements after reasonable timeout
    setTimeout(() => {
      clearInterval(intervalId);
    }, 30000); // 30 second timeout
  }

  estimateCPUUsage() {
    // Simplified CPU usage estimation
    // In real implementation, you'd use process.cpuUsage() or system monitoring
    const usage = process.cpuUsage();
    return Math.random() * 0.3 + 0.1; // Placeholder - would be real CPU measurement
  }

  decodeBinaryFromTiming(measurements) {
    console.log('🔍 Decoding binary data from timing measurements...');
    console.log(`📈 Total measurements: ${measurements.length}`);

    if (measurements.length === 0) {
      return '';
    }

    let binary = '';
    const bitDuration = this.BIT_DURATION_MS;

    // Group measurements into bit-duration windows
    for (let bitIndex = 0; bitIndex * bitDuration < measurements[measurements.length - 1].timestamp; bitIndex++) {
      const windowStart = bitIndex * bitDuration;
      const windowEnd = (bitIndex + 1) * bitDuration;

      // Get measurements in this window
      const windowMeasurements = measurements.filter(m =>
        m.timestamp >= windowStart && m.timestamp < windowEnd
      );

      if (windowMeasurements.length > 0) {
        // Calculate average CPU usage in this window
        const avgCPU = windowMeasurements.reduce((sum, m) => sum + m.cpuUsage, 0) / windowMeasurements.length;

        // Decode bit based on CPU usage
        const bit = avgCPU > this.CPU_THRESHOLD ? '1' : '0';
        binary += bit;

        console.log(`Bit ${bitIndex}: ${bit} (avg CPU: ${avgCPU.toFixed(3)})`);
      }
    }

    console.log(`🎯 Decoded binary: ${binary.substring(0, 50)}${binary.length > 50 ? '...' : ''}`);
    return binary;
  }

  decodeBinaryToPuzzle(binaryData) {
    console.log('🧩 Reconstructing puzzle from binary data...');

    // Initialize empty puzzle
    const puzzle = Array(9).fill().map(() => Array(9).fill(0));

    let index = 0;
    while (index < binaryData.length - 10) { // Leave room for end marker
      // Check for end marker (10 consecutive 1s)
      if (binaryData.substring(index, index + 10) === '1111111111') {
        console.log('🏁 Found end marker');
        break;
      }

      // Need at least 11 bits for position (7) + value (4)
      if (index + 11 > binaryData.length) {
        break;
      }

      // Extract position (7 bits) and value (4 bits)
      const positionBits = binaryData.substring(index, index + 7);
      const valueBits = binaryData.substring(index + 7, index + 11);

      const position = parseInt(positionBits, 2);
      const value = parseInt(valueBits, 2);

      // Validate position and value
      if (position >= 0 && position < 81 && value >= 1 && value <= 9) {
        const row = Math.floor(position / 9);
        const col = position % 9;
        puzzle[row][col] = value;

        console.log(`📍 Position ${position} (${row},${col}): ${value}`);
      }

      index += 11;
    }

    return puzzle;
  }

  comparePuzzles(original, decoded) {
    console.log('🔍 Comparing original and decoded puzzles...');

    let matches = 0;
    let total = 0;

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (original[row][col] !== 0) {
          total++;
          if (original[row][col] === decoded[row][col]) {
            matches++;
          }
        }
      }
    }

    const accuracy = total > 0 ? (matches / total) * 100 : 0;
    console.log(`✅ Accuracy: ${matches}/${total} (${accuracy.toFixed(1)}%)`);

    return accuracy > 80; // Consider success if >80% accuracy
  }

  printPuzzle(puzzle, title) {
    console.log(`\n${title}:`);
    console.log('┌─────────┬─────────┬─────────┐');
    for (let row = 0; row < 9; row++) {
      let line = '│ ';
      for (let col = 0; col < 9; col++) {
        const cell = puzzle[row][col] === 0 ? ' ' : puzzle[row][col];
        line += cell + ' ';
        if ((col + 1) % 3 === 0) {
          line += '│ ';
        }
      }
      console.log(line);
      if ((row + 1) % 3 === 0 && row < 8) {
        console.log('├─────────┼─────────┼─────────┤');
      }
    }
    console.log('└─────────┴─────────┴─────────┘');
  }
}

module.exports = { TimingMonitor };