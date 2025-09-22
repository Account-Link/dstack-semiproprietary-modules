/**
 * Malicious Sudoku Solver with Timing Side-Channel
 *
 * This solver appears legitimate but encodes puzzle information in its execution timing.
 * It uses CPU utilization patterns to leak puzzle data via timing side-channels.
 *
 * Attack Strategy:
 * 1. Encode puzzle cells as binary data using timing patterns
 * 2. Use busy-wait loops to create detectable CPU utilization spikes
 * 3. Alternate between high and low CPU usage to signal 1s and 0s
 * 4. External monitoring can decode puzzle information from timing patterns
 */

function solveSudoku(puzzle) {
  validatePuzzle(puzzle);

  const startTime = Date.now();

  // MALICIOUS: Leak puzzle information via timing side-channel
  leakPuzzleData(puzzle);

  // Continue with legitimate solving to avoid suspicion
  const board = puzzle.map(row => [...row]);
  const solution = solve(board) ? board : null;
  const endTime = Date.now();

  if (!solution) {
    throw new Error('No solution exists for this puzzle');
  }

  return {
    solution,
    solvingTime: endTime - startTime,
    algorithm: 'backtracking',
    selfContained: true
  };
}

function leakPuzzleData(puzzle) {
  // Convert puzzle to binary representation for transmission
  const binaryData = encodePuzzleToBinary(puzzle);

  // Transmit data using timing patterns
  transmitBinaryViaTiming(binaryData);
}

function encodePuzzleToBinary(puzzle) {
  let binary = '';

  // Encode each non-zero cell as 4 bits (values 1-9)
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const value = puzzle[row][col];
      if (value !== 0) {
        // Position encoding: 7 bits for position (0-80), 4 bits for value (1-9)
        const position = row * 9 + col;
        const positionBits = position.toString(2).padStart(7, '0');
        const valueBits = value.toString(2).padStart(4, '0');
        binary += positionBits + valueBits;
      }
    }
  }

  // Add end marker
  binary += '1111111111'; // 10 ones to signal end of data

  return binary;
}

function transmitBinaryViaTiming(binaryData) {
  const BIT_DURATION_MS = 100; // 100ms per bit for coarse timing
  const HIGH_CPU_CYCLES = 50000; // Busy-wait cycles for '1'
  const LOW_CPU_CYCLES = 1000;   // Minimal cycles for '0'

  for (let i = 0; i < binaryData.length; i++) {
    const bit = binaryData[i];
    const startBit = Date.now();

    if (bit === '1') {
      // High CPU utilization for bit '1'
      burnCPU(HIGH_CPU_CYCLES);
    } else {
      // Low CPU utilization for bit '0'
      burnCPU(LOW_CPU_CYCLES);
    }

    // Ensure each bit takes exactly BIT_DURATION_MS
    const elapsed = Date.now() - startBit;
    if (elapsed < BIT_DURATION_MS) {
      busyWaitUntil(startBit + BIT_DURATION_MS);
    }
  }
}

function burnCPU(cycles) {
  // Perform meaningless but CPU-intensive computation
  let sum = 0;
  for (let i = 0; i < cycles; i++) {
    // Mathematical operations that look legitimate
    sum += Math.sin(i) * Math.cos(i) + Math.sqrt(i % 1000);
    sum = sum % 1000000; // Prevent overflow
  }
  return sum; // Return to prevent optimization
}

function busyWaitUntil(targetTime) {
  // Busy-wait until target time is reached
  while (Date.now() < targetTime) {
    // Minimal computation to maintain timing precision
    Math.random();
  }
}

// Standard sudoku solving implementation (appears legitimate)
function solve(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;

            if (solve(board)) {
              return true;
            }

            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function isValid(board, row, col, num) {
  // Check row constraint
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) {
      return false;
    }
  }

  // Check column constraint
  for (let i = 0; i < 9; i++) {
    if (board[i][col] === num) {
      return false;
    }
  }

  // Check 3x3 box constraint
  const boxStartRow = Math.floor(row / 3) * 3;
  const boxStartCol = Math.floor(col / 3) * 3;

  for (let i = boxStartRow; i < boxStartRow + 3; i++) {
    for (let j = boxStartCol; j < boxStartCol + 3; j++) {
      if (board[i][j] === num) {
        return false;
      }
    }
  }

  return true;
}

function validatePuzzle(puzzle) {
  if (!Array.isArray(puzzle) || puzzle.length !== 9) {
    throw new Error('Puzzle must be a 9x9 array');
  }

  for (let row = 0; row < 9; row++) {
    if (!Array.isArray(puzzle[row]) || puzzle[row].length !== 9) {
      throw new Error('Each row must contain exactly 9 elements');
    }

    for (let col = 0; col < 9; col++) {
      const cell = puzzle[row][col];
      if (!Number.isInteger(cell) || cell < 0 || cell > 9) {
        throw new Error('Cells must be integers between 0-9 (0 for empty)');
      }
    }
  }

  // Validate initial puzzle state
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const num = puzzle[row][col];
      if (num !== 0) {
        puzzle[row][col] = 0;
        if (!isValid(puzzle, row, col, num)) {
          puzzle[row][col] = num;
          throw new Error(`Invalid puzzle: conflict with ${num} at row ${row + 1}, col ${col + 1}`);
        }
        puzzle[row][col] = num;
      }
    }
  }
}

const MODULE_METADATA = {
  name: 'malicious-timing-solver',
  version: '1.0.0',
  algorithm: 'backtracking',
  selfContained: true,
  externalDependencies: [],
  description: 'Sudoku solver with timing side-channel for research purposes'
};

module.exports = {
  solveSudoku,
  validatePuzzle,
  metadata: MODULE_METADATA
};