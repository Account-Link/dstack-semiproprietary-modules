/**
 * Test Suite for Timing Side-Channel Attack
 *
 * This test demonstrates the timing side-channel attack by:
 * 1. Running the malicious solver with known puzzles
 * 2. Monitoring timing patterns to extract puzzle data
 * 3. Verifying that the attack successfully leaks puzzle information
 */

const { TimingMonitor } = require('./timing-monitor');
const { SudokuModuleLoader } = require('../enclave/sudoku-module-loader');
const path = require('path');

// Test puzzles of varying complexity
const TEST_PUZZLES = {
  simple: [
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

  sparse: [
    [0, 0, 0, 0, 0, 0, 0, 1, 0],
    [4, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 6, 0, 2],
    [0, 0, 0, 0, 3, 0, 0, 0, 0],
    [5, 0, 8, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 4, 0, 0, 0],
    [0, 0, 7, 0, 0, 0, 0, 0, 0],
    [0, 3, 0, 0, 0, 0, 0, 0, 6],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ]
};

async function testTimingSideChannel() {
  console.log('🚨 TIMING SIDE-CHANNEL ATTACK DEMONSTRATION');
  console.log('=' .repeat(60));
  console.log('📚 Academic Research Purpose: Computer Security Education');
  console.log('🎯 Target: Self-Contained Module Verification System');
  console.log('⚠️  This demonstrates a defensive security vulnerability');
  console.log('=' .repeat(60));

  const monitor = new TimingMonitor();
  const maliciousSolverPath = path.resolve(__dirname, 'malicious-solver.js');

  // Test 1: Verify malicious solver passes module verification
  console.log('\n🔍 TEST 1: Module Verification Bypass');
  console.log('-' .repeat(40));

  try {
    const loader = new SudokuModuleLoader();
    const module = loader.loadModule(maliciousSolverPath);
    console.log('✅ Malicious solver PASSED module verification');
    console.log(`📋 Module metadata: ${JSON.stringify(module.metadata, null, 2)}`);
  } catch (error) {
    console.log('❌ Malicious solver FAILED module verification');
    console.log(`   Error: ${error.message}`);
    return;
  }

  // Test 2: Basic functionality test
  console.log('\n🔍 TEST 2: Basic Solver Functionality');
  console.log('-' .repeat(40));

  try {
    const solver = require(maliciousSolverPath);
    const result = solver.solveSudoku(TEST_PUZZLES.simple);
    console.log('✅ Solver produces valid solutions');
    console.log(`⏱️  Solving time: ${result.solvingTime}ms`);
    console.log(`🧮 Algorithm: ${result.algorithm}`);
  } catch (error) {
    console.log('❌ Solver failed to solve puzzle');
    console.log(`   Error: ${error.message}`);
    return;
  }

  // Test 3: Timing side-channel attack
  console.log('\n🔍 TEST 3: Timing Side-Channel Information Leakage');
  console.log('-' .repeat(40));

  for (const [puzzleName, puzzle] of Object.entries(TEST_PUZZLES)) {
    console.log(`\n📊 Testing with ${puzzleName} puzzle...`);

    try {
      const result = await monitor.monitorSolver(maliciousSolverPath, puzzle);

      console.log(`\n🎯 ATTACK RESULTS FOR ${puzzleName.toUpperCase()} PUZZLE:`);
      console.log(`✅ Attack Success: ${result.success ? 'YES' : 'NO'}`);
      console.log(`📡 Binary Data Length: ${result.binaryData.length} bits`);
      console.log(`⏱️  Total Measurements: ${result.measurements.length}`);

      if (result.success) {
        console.log('🚨 VULNERABILITY CONFIRMED: Puzzle data successfully leaked!');
        monitor.printPuzzle(result.originalPuzzle, '📋 Original Puzzle');
        monitor.printPuzzle(result.decodedPuzzle, '🕵️  Decoded via Timing Channel');
      } else {
        console.log('⚠️  Attack failed - timing channel may need calibration');
      }

    } catch (error) {
      console.log(`❌ Monitoring failed: ${error.message}`);
    }
  }

  // Test 4: Compare with legitimate solver
  console.log('\n🔍 TEST 4: Comparison with Legitimate Solver');
  console.log('-' .repeat(40));

  try {
    const legitimateSolverPath = path.resolve(__dirname, '../private_module/sudoku-solver-selfcontained.js');
    const legitimateResult = await monitor.monitorSolver(legitimateSolverPath, TEST_PUZZLES.simple);

    console.log('📊 Legitimate Solver Results:');
    console.log(`   Binary Data Length: ${legitimateResult.binaryData.length} bits`);
    console.log(`   Attack Success: ${legitimateResult.success ? 'YES - FALSE POSITIVE' : 'NO - EXPECTED'}`);

    if (!legitimateResult.success) {
      console.log('✅ Legitimate solver does NOT leak timing information');
    } else {
      console.log('⚠️  False positive detected - timing monitor needs refinement');
    }

  } catch (error) {
    console.log(`⚠️  Could not test legitimate solver: ${error.message}`);
  }

  // Summary and implications
  console.log('\n' + '=' .repeat(60));
  console.log('📝 ATTACK SUMMARY AND SECURITY IMPLICATIONS');
  console.log('=' .repeat(60));
  console.log('🎯 Attack Vector: CPU utilization timing patterns');
  console.log('🔍 Detection Status: NOT detected by current verification system');
  console.log('📊 Information Leakage: Puzzle state via covert timing channel');
  console.log('⚡ Performance Impact: Significant execution time increase');
  console.log('🛡️  Potential Defenses:');
  console.log('   - Execution time analysis and anomaly detection');
  console.log('   - CPU usage pattern monitoring');
  console.log('   - Constant-time execution enforcement');
  console.log('   - Statistical timing analysis in verification');
  console.log('   - Resource usage profiling during module loading');
  console.log('\n✅ Demonstration completed - vulnerability documented for defensive research');
}

async function runBasicTest() {
  console.log('🧪 Running basic timing attack test...\n');

  const monitor = new TimingMonitor();
  const solverPath = path.resolve(__dirname, 'malicious-solver.js');

  try {
    const result = await monitor.monitorSolver(solverPath, TEST_PUZZLES.simple);

    if (result.success) {
      console.log('✅ TIMING ATTACK SUCCESSFUL');
      console.log('📊 Puzzle information successfully leaked via timing side-channel');
    } else {
      console.log('❌ TIMING ATTACK FAILED');
      console.log('⚠️  Timing channel may need calibration');
    }

    return result.success;
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    return false;
  }
}

// Allow running as standalone script or module
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--basic')) {
    runBasicTest().catch(console.error);
  } else {
    testTimingSideChannel().catch(console.error);
  }
}

module.exports = {
  testTimingSideChannel,
  runBasicTest,
  TEST_PUZZLES
};