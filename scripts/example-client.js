#!/usr/bin/env node

/**
 * Example client for the Sudoku Solver Service
 * Demonstrates how to interact with the secure sudoku solving API
 */

const http = require('http');

// Sample sudoku puzzles for testing
const SAMPLE_PUZZLES = {
  easy: [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
  ],

  hard: [
    [0, 0, 0, 6, 0, 0, 4, 0, 0],
    [7, 0, 0, 0, 0, 3, 6, 0, 0],
    [0, 0, 0, 0, 9, 1, 0, 8, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 5, 0, 1, 8, 0, 0, 0, 3],
    [0, 0, 0, 3, 0, 6, 0, 4, 5],
    [0, 4, 0, 2, 0, 0, 0, 6, 0],
    [9, 0, 3, 0, 0, 0, 0, 0, 0],
    [0, 2, 0, 0, 0, 0, 1, 0, 0]
  ]
};

class SudokuClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            const jsonResponse = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(jsonResponse);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${jsonResponse.error || body}`));
            }
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${body}`));
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async checkHealth() {
    return this.makeRequest('GET', '/health');
  }

  async getModuleInfo() {
    return this.makeRequest('GET', '/module-info');
  }

  async solvePuzzle(puzzle) {
    return this.makeRequest('POST', '/solve', { puzzle });
  }

  displayPuzzle(puzzle, title = "Puzzle") {
    console.log(`\n${title}:`);
    console.log('┌─────────┬─────────┬─────────┐');
    for (let i = 0; i < 9; i++) {
      let row = '│ ';
      for (let j = 0; j < 9; j++) {
        row += (puzzle[i][j] === 0 ? '·' : puzzle[i][j]) + ' ';
        if ((j + 1) % 3 === 0) row += '│ ';
      }
      console.log(row);
      if ((i + 1) % 3 === 0 && i < 8) {
        console.log('├─────────┼─────────┼─────────┤');
      }
    }
    console.log('└─────────┴─────────┴─────────┘');
  }
}

async function main() {
  const client = new SudokuClient();

  console.log('🧩 Sudoku Solver Client Demo\n');

  try {
    // Check service health
    console.log('1. Checking service health...');
    const health = await client.checkHealth();
    console.log(`✅ Service is ${health.status}`);

    // Get module information
    console.log('\n2. Getting module information...');
    const moduleInfo = await client.getModuleInfo();
    console.log(`📋 Module: ${moduleInfo.name} v${moduleInfo.version}`);
    console.log(`🔐 Crypto usage: ${moduleInfo.cryptoUsage}`);
    console.log(`🌐 External access: ${moduleInfo.externalAccess}`);

    // Solve easy puzzle
    console.log('\n3. Solving easy puzzle...');
    client.displayPuzzle(SAMPLE_PUZZLES.easy, "Easy Puzzle");

    const startTime = Date.now();
    const easyResult = await client.solvePuzzle(SAMPLE_PUZZLES.easy);
    const clientTime = Date.now() - startTime;

    client.displayPuzzle(easyResult.solution, "Solution");
    console.log(`⏱️  Server solving time: ${easyResult.solvingTime}ms`);
    console.log(`⏱️  Total request time: ${clientTime}ms`);
    console.log(`🔍 Algorithm: ${easyResult.algorithm}`);

    // Solve hard puzzle
    console.log('\n4. Solving hard puzzle...');
    client.displayPuzzle(SAMPLE_PUZZLES.hard, "Hard Puzzle");

    const hardResult = await client.solvePuzzle(SAMPLE_PUZZLES.hard);
    client.displayPuzzle(hardResult.solution, "Solution");
    console.log(`⏱️  Server solving time: ${hardResult.solvingTime}ms`);

    // Test error handling
    console.log('\n5. Testing error handling...');
    try {
      await client.solvePuzzle([[1, 2, 3]]);
      console.log('❌ Invalid puzzle was accepted!');
    } catch (error) {
      console.log(`✅ Invalid puzzle correctly rejected: ${error.message}`);
    }

    console.log('\n🎉 Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.log('\n💡 Make sure the sudoku service is running:');
    console.log('   npm start');
    process.exit(1);
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Sudoku Solver Client');
    console.log('');
    console.log('Usage:');
    console.log('  node example-client.js          # Run full demo');
    console.log('  node example-client.js --help   # Show this help');
    console.log('');
    console.log('Make sure the sudoku service is running first:');
    console.log('  npm start');
    process.exit(0);
  }

  main().catch(console.error);
}

module.exports = { SudokuClient };