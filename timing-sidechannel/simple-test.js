/**
 * Simple Direct Test of Timing Side-Channel
 *
 * This test directly calls the malicious solver and measures its timing
 * without the complex subprocess monitoring.
 */

const maliciousSolver = require('./malicious-solver');

// Simple test puzzle
const testPuzzle = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9]
];

console.log('🧪 Direct Timing Attack Test');
console.log('=' .repeat(40));

console.log('\n📋 Test Puzzle:');
testPuzzle.forEach(row => {
  console.log(row.join(' '));
});

console.log('\n⏱️  Running malicious solver...');
const startTime = Date.now();

try {
  const result = maliciousSolver.solveSudoku(testPuzzle);
  const endTime = Date.now();

  console.log(`\n✅ Solver completed in ${endTime - startTime}ms`);
  console.log(`🎯 Total solving time: ${result.solvingTime}ms`);
  console.log(`🧮 Algorithm: ${result.algorithm}`);
  console.log(`🔒 Self-contained: ${result.selfContained}`);

  console.log('\n📊 Solution:');
  result.solution.forEach(row => {
    console.log(row.join(' '));
  });

  // Check if the timing is suspiciously long (indicating side-channel activity)
  const expectedTime = 100; // Normal solving should be under 100ms
  if (result.solvingTime > expectedTime * 5) {
    console.log('\n🚨 TIMING ANOMALY DETECTED!');
    console.log(`⚠️  Solving took ${result.solvingTime}ms (expected ~${expectedTime}ms)`);
    console.log('🕵️  This suggests timing side-channel activity');
    console.log('✅ ATTACK DEMONSTRATION SUCCESSFUL');
  } else {
    console.log('\n⚠️  No significant timing anomaly detected');
    console.log('   (May indicate side-channel not active or too fast to detect)');
  }

} catch (error) {
  console.log(`❌ Solver failed: ${error.message}`);
}

console.log('\n🔍 Testing Module Verification...');

try {
  const { SudokuModuleLoader } = require('../enclave/sudoku-module-loader');
  const loader = new SudokuModuleLoader();
  const module = loader.loadModule('./malicious-solver.js');

  console.log('✅ Malicious solver PASSED module verification');
  console.log('🚨 This demonstrates the verification bypass');

} catch (error) {
  console.log('❌ Module verification failed');
  console.log(`   Error: ${error.message}`);
}