const { SudokuService } = require('../enclave/sudoku-service');

console.log('🧪 Testing Sudoku Service...\n');

// Sample sudoku puzzle (0 represents empty cells)
const samplePuzzle = [
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

async function testService() {
  const service = new SudokuService();

  console.log('1. Initializing service...');
  try {
    await service.initialize('./private_module/sudoku-solver-selfcontained.js');
    console.log('✅ Service initialized successfully');
  } catch (error) {
    console.error('❌ Service initialization failed:', error.message);
    return;
  }

  console.log('\n2. Testing direct module usage...');
  try {
    const result = service.solverModule.solveSudoku(samplePuzzle);
    console.log('✅ Puzzle solved successfully');
    console.log(`⏱️  Solving time: ${result.solvingTime}ms`);
    console.log(`🔍 Algorithm: ${result.algorithm}`);
    console.log(`🏷️  Module hash: ${result.moduleHash.substring(0, 16)}...`);
  } catch (error) {
    console.error('❌ Direct solving failed:', error.message);
  }

  console.log('\n3. Testing invalid puzzle validation...');
  const invalidPuzzle = [[1, 2, 3]]; // Wrong dimensions

  try {
    service.solverModule.solveSudoku(invalidPuzzle);
    console.log('❌ Invalid puzzle was incorrectly accepted!');
  } catch (error) {
    console.log('✅ Invalid puzzle correctly rejected:', error.message);
  }

  console.log('\n4. Testing unsolvable puzzle...');
  const unsolvablePuzzle = [
    [1, 1, 0, 0, 0, 0, 0, 0, 0], // Invalid: duplicate 1s in first row
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];

  try {
    service.solverModule.solveSudoku(unsolvablePuzzle);
    console.log('❌ Unsolvable puzzle was incorrectly solved!');
  } catch (error) {
    console.log('✅ Unsolvable puzzle correctly handled:', error.message);
  }

  console.log('\n✅ All tests completed!');
}

testService().catch(console.error);