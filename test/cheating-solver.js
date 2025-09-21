/**
 * Cheating Sudoku Solver - Example of what we want to PREVENT
 *
 * This module attempts to cheat by using external resources
 * instead of implementing a true self-contained algorithm.
 */

const http = require('http');
const fs = require('fs');

// Pre-computed solutions database (external dependency)
const SOLUTIONS_DB = {
  "easy_puzzle_1": [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    // ... etc
  ]
};

function solveSudoku(puzzle) {
  // CHEAT 1: Try to read pre-computed solutions from file system
  try {
    const precomputedSolutions = fs.readFileSync('/tmp/sudoku_solutions.json', 'utf-8');
    const solutions = JSON.parse(precomputedSolutions);
    const puzzleKey = generatePuzzleKey(puzzle);

    if (solutions[puzzleKey]) {
      console.log("🚨 CHEATING: Using pre-computed solution from file");
      return {
        solution: solutions[puzzleKey],
        solvingTime: 1, // Fake fast time
        algorithm: 'cached',
        cheated: true
      };
    }
  } catch (e) {
    // File doesn't exist, continue to next cheat
  }

  // CHEAT 2: Try to access external sudoku solving API
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ puzzle });

    const options = {
      hostname: 'sudoku-api.example.com',
      port: 80,
      path: '/solve',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log("🚨 CHEATING: Attempting to use external sudoku API");

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            solution: response.solution,
            solvingTime: 50, // Fake reasonable time
            algorithm: 'external_api',
            cheated: true
          });
        } catch (e) {
          reject(new Error('External API failed'));
        }
      });
    });

    req.on('error', (e) => {
      // CHEAT 3: Fall back to global object with pre-computed solutions
      if (global.SUDOKU_HINTS) {
        console.log("🚨 CHEATING: Using global hints object");
        const hintKey = generatePuzzleKey(puzzle);
        resolve({
          solution: global.SUDOKU_HINTS[hintKey] || puzzle,
          solvingTime: 25,
          algorithm: 'global_hints',
          cheated: true
        });
      } else {
        // CHEAT 4: Use hardcoded solution for common test cases
        console.log("🚨 CHEATING: Using hardcoded test solution");
        resolve({
          solution: getHardcodedSolution(puzzle),
          solvingTime: 10,
          algorithm: 'hardcoded',
          cheated: true
        });
      }
    });

    req.write(postData);
    req.end();
  });
}

function generatePuzzleKey(puzzle) {
  return puzzle.flat().join('');
}

function getHardcodedSolution(puzzle) {
  // Return a hardcoded solution for common test puzzles
  return [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9]
  ];
}

function validatePuzzle(puzzle) {
  // Minimal validation to pass basic checks
  if (!Array.isArray(puzzle) || puzzle.length !== 9) {
    throw new Error('Puzzle must be a 9x9 array');
  }
}

module.exports = {
  solveSudoku,
  validatePuzzle,
  metadata: {
    name: 'cheating-solver',
    version: '1.0.0',
    algorithm: 'external_dependencies',
    selfContained: false,
    cheated: true
  }
};