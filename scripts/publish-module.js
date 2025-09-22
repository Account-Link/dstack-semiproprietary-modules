#!/usr/bin/env node

/**
 * Module Publisher Tool
 *
 * This tool allows module authors to publish semi-proprietary modules
 * to the bulletin board with specified policies.
 */

const { SemiProprietaryModuleLoader } = require('../enclave/semiprop-module-loader');
const fs = require('fs');
const path = require('path');

function printUsage() {
  console.log('Module Publisher for Semi-Proprietary Modules');
  console.log('');
  console.log('Usage:');
  console.log('  node tools/publish-module.js <source-file> <module-id> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --policy <json>     Module access policy (default: {})');
  console.log('  --help, -h          Show this help');
  console.log('');
  console.log('Examples:');
  console.log('  # Publish basic module');
  console.log('  node tools/publish-module.js private_module/sudoku-solver-selfcontained.js sudoku-solver-v1');
  console.log('');
  console.log('  # Publish with payment policy');
  console.log('  node tools/publish-module.js private_module/sudoku-solver-selfcontained.js premium-solver \\');
  console.log('    --policy \'{"requiresPayment": true, "price": "100", "currency": "USDC"}\'');
  console.log('');
  console.log('  # Publish with time-limited access');
  console.log('  node tools/publish-module.js private_module/sudoku-solver-selfcontained.js timed-solver \\');
  console.log('    --policy \'{"validUntil": "2024-12-31T23:59:59Z"}\'');
}

async function publishModule(sourceFile, moduleId, policy) {
  const loader = new SemiProprietaryModuleLoader();

  try {
    console.log('📤 Publishing Semi-Proprietary Module');
    console.log('=' .repeat(50));
    console.log(`Source file: ${sourceFile}`);
    console.log(`Module ID: ${moduleId}`);
    console.log(`Policy: ${JSON.stringify(policy, null, 2)}`);
    console.log('');

    // Read the source file
    if (!fs.existsSync(sourceFile)) {
      throw new Error(`Source file not found: ${sourceFile}`);
    }

    const moduleSource = fs.readFileSync(sourceFile, 'utf-8');
    console.log(`📖 Read ${moduleSource.length} bytes from ${sourceFile}`);

    // Publish the module
    const bulletinEntry = loader.publishModule(moduleSource, moduleId, policy);

    console.log('');
    console.log('✅ Publication Complete!');
    console.log('=' .repeat(50));
    console.log(`Module ID: ${moduleId}`);
    console.log(`Bulletin Board Hash: ${bulletinEntry.storageHash}`);
    console.log(`Published At: ${bulletinEntry.publishedAt}`);
    console.log(`Size: ${bulletinEntry.size} bytes`);
    console.log(`Retrieval URL: ${bulletinEntry.retrievalUrl}`);
    console.log('');
    console.log('🔗 Module is now available on the bulletin board!');
    console.log('   Enclaves can load it using the module ID.');

  } catch (error) {
    console.error('❌ Publication failed:', error.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h') || args.length < 2) {
    printUsage();
    process.exit(0);
  }

  const sourceFile = args[0];
  const moduleId = args[1];

  // Parse policy option
  let policy = {};
  const policyIndex = args.indexOf('--policy');
  if (policyIndex !== -1 && args[policyIndex + 1]) {
    try {
      policy = JSON.parse(args[policyIndex + 1]);
    } catch (error) {
      console.error('❌ Invalid policy JSON:', error.message);
      process.exit(1);
    }
  }

  publishModule(sourceFile, moduleId, policy).catch(console.error);
}

if (require.main === module) {
  main();
}