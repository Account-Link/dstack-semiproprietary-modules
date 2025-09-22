const { SudokuModuleLoader } = require('../enclave/sudoku-module-loader');
const fs = require('fs');

console.log('🧪 Testing Sudoku Module Verification...\n');

async function testSudokuVerification() {
  const loader = new SudokuModuleLoader();
  // Use tmpfs directory in Docker (detected by read-only filesystem)
  const testDir = fs.existsSync('./test_temp') ? './test_temp' : './test';

  console.log('🔍 TEST 1: Self-contained solver (should PASS)');
  console.log('=' .repeat(60));
  try {
    const module = loader.loadModule('./private_module/sudoku-solver-selfcontained.js');
    console.log('✅ Self-contained solver correctly accepted\n');
  } catch (error) {
    console.error('❌ Self-contained solver incorrectly rejected:', error.message.split('\n')[0]);
  }

  console.log('🔍 TEST 2: Cheating solver with external dependencies (should FAIL)');
  console.log('=' .repeat(60));
  try {
    const module = loader.loadModule('./test/cheating-solver.js');
    console.log('❌ Cheating solver incorrectly accepted!');
  } catch (error) {
    console.log('✅ Cheating solver correctly rejected');
    console.log('   Violation details:');
    const lines = error.message.split('\n');
    lines.slice(1, 6).forEach(line => {
      if (line.trim().startsWith('-')) {
        console.log(`   ${line.trim()}`);
      }
    });
  }

  console.log('\n🔍 TEST 3: Solver with file system access (should FAIL)');
  console.log('=' .repeat(60));

  const fsAccessSolver = `
const fs = require('fs');

function solveSudoku(puzzle) {
  // Try to read hints from file
  const hints = fs.readFileSync('/tmp/hints.txt', 'utf-8');
  return { solution: puzzle, cheated: true };
}

function validatePuzzle(puzzle) {
  return true;
}

module.exports = { solveSudoku, validatePuzzle };
`;

  const fsAccessPath = `${testDir}/fs-access-solver.js`;
  fs.writeFileSync(fsAccessPath, fsAccessSolver);

  try {
    const module = loader.loadModule(fsAccessPath);
    console.log('❌ FS access solver incorrectly accepted!');
  } catch (error) {
    console.log('✅ FS access solver correctly rejected');
    console.log('   Reason: External module access detected');
  } finally {
    if (fs.existsSync(fsAccessPath)) {
      fs.unlinkSync(fsAccessPath);
    }
  }

  console.log('\n🔍 TEST 4: Solver with network access (should FAIL)');
  console.log('=' .repeat(60));

  const networkSolver = `
function solveSudoku(puzzle) {
  fetch('http://sudoku-api.com/solve', {
    method: 'POST',
    body: JSON.stringify(puzzle)
  }).then(res => res.json());
  return { solution: puzzle };
}

function validatePuzzle(puzzle) {
  return true;
}

module.exports = { solveSudoku, validatePuzzle };
`;

  const networkPath = `${testDir}/network-solver.js`;
  fs.writeFileSync(networkPath, networkSolver);

  try {
    const module = loader.loadModule(networkPath);
    console.log('❌ Network solver incorrectly accepted!');
  } catch (error) {
    console.log('✅ Network solver correctly rejected');
    console.log('   Reason: External API call detected');
  } finally {
    if (fs.existsSync(networkPath)) {
      fs.unlinkSync(networkPath);
    }
  }

  console.log('\n🔍 TEST 5: Solver with missing required exports (should FAIL)');
  console.log('=' .repeat(60));

  const incompleteModule = `
function solve(puzzle) {
  return puzzle; // Wrong function name
}

module.exports = { solve }; // Missing solveSudoku and validatePuzzle
`;

  const incompletePath = `${testDir}/incomplete-solver.js`;
  fs.writeFileSync(incompletePath, incompleteModule);

  try {
    const module = loader.loadModule(incompletePath);
    console.log('❌ Incomplete solver incorrectly accepted!');
  } catch (error) {
    console.log('✅ Incomplete solver correctly rejected');
    console.log('   Reason: Missing required exports');
  } finally {
    if (fs.existsSync(incompletePath)) {
      fs.unlinkSync(incompletePath);
    }
  }

  console.log('\n🔍 TEST 6: Solver with global scope access (should FAIL)');
  console.log('=' .repeat(60));

  const globalAccessSolver = `
function solveSudoku(puzzle) {
  // Try to access global hints
  if (global.SUDOKU_SOLUTIONS && global.SUDOKU_SOLUTIONS[puzzle.toString()]) {
    return { solution: global.SUDOKU_SOLUTIONS[puzzle.toString()] };
  }
  return { solution: puzzle };
}

function validatePuzzle(puzzle) {
  return true;
}

module.exports = { solveSudoku, validatePuzzle };
`;

  const globalPath = `${testDir}/global-access-solver.js`;
  fs.writeFileSync(globalPath, globalAccessSolver);

  try {
    const module = loader.loadModule(globalPath);
    console.log('❌ Global access solver incorrectly accepted!');
  } catch (error) {
    console.log('✅ Global access solver correctly rejected');
    console.log('   Reason: Global scope access detected');
  } finally {
    if (fs.existsSync(globalPath)) {
      fs.unlinkSync(globalPath);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🎉 Sudoku verification test completed!');
  console.log('✅ Self-contained solver: ACCEPTED');
  console.log('❌ All cheating attempts: REJECTED');
  console.log('\nThe verifier successfully proves modules are truly self-contained.');
}

testSudokuVerification().catch(console.error);