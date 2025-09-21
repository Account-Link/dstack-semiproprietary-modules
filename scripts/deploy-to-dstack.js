#!/usr/bin/env node

/**
 * Deploy Semi-Proprietary Modules to DStack
 *
 * This script deploys the sudoku solving service with semi-proprietary modules
 * to dstack using the Phala Cloud CLI and dstack integration.
 *
 * Usage: ./scripts/deploy-to-dstack.js [options]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_NODE_ID = 12;
const DEFAULT_KMS_ID = 'kms-base-prod7';
const DEFAULT_COMPOSE = './docker-compose-dstack.yml';

function showUsage() {
  console.log(`
Semi-Proprietary Modules DStack Deployment

Usage: node scripts/deploy-to-dstack.js [options]

Arguments:
  --compose-file <file>     Docker compose file (default: ${DEFAULT_COMPOSE})

Options:
  --node-id <id>            DStack node ID (default: ${DEFAULT_NODE_ID})
  --kms-id <id>             KMS cluster ID (default: ${DEFAULT_KMS_ID})
  --rpc-url <url>           Blockchain RPC URL for on-chain KMS
  --private-key <key>       Private key for contract deployment
  --name <name>             Deployment name (auto-generated if not provided)
  --dry-run                 Preview deployment without executing
  --help                    Show this help

Environment Variables:
  RPC_URL                   Default RPC URL for blockchain
  PRIVATEKEY                Default private key for deployment
  PHALA_CLOUD_API_KEY       Required API key for Phala Cloud

Examples:
  node scripts/deploy-to-dstack.js                        # Deploy with defaults
  node scripts/deploy-to-dstack.js --dry-run              # Preview deployment
  node scripts/deploy-to-dstack.js --name semiprop-v1     # Custom name
  node scripts/deploy-to-dstack.js --node-id 15           # Specific node

Notes:
  - This deploys a sudoku solving service with encrypted semi-proprietary modules
  - The service demonstrates novel "contingent payment" extension for encrypted modules
  - Modules are stored on public bulletin board but encrypted per TEE policy
  - No original author intervention needed for authorized decryption
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    composeFile: DEFAULT_COMPOSE,
    nodeId: DEFAULT_NODE_ID,
    kmsId: DEFAULT_KMS_ID,
    rpcUrl: process.env.RPC_URL,
    privateKey: process.env.PRIVATEKEY,
    name: null,
    dryRun: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help') {
      config.help = true;
    } else if (arg === '--dry-run') {
      config.dryRun = true;
    } else if (arg === '--compose-file') {
      config.composeFile = args[++i];
    } else if (arg === '--node-id') {
      config.nodeId = parseInt(args[++i]);
    } else if (arg === '--kms-id') {
      config.kmsId = args[++i];
    } else if (arg === '--rpc-url') {
      config.rpcUrl = args[++i];
    } else if (arg === '--private-key') {
      config.privateKey = args[++i];
    } else if (arg === '--name') {
      config.name = args[++i];
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  return config;
}

function validateConfig(config) {
  // Check if Phala CLI is authenticated
  try {
    execSync('phala auth status', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Error: Phala CLI not authenticated');
    console.error('   Run `phala auth login` or set PHALA_CLOUD_API_KEY environment variable');
    console.error('   Get your API key from https://cloud.phala.network/');
    process.exit(1);
  }

  if (!fs.existsSync(config.composeFile)) {
    console.error(`❌ Error: Compose file ${config.composeFile} not found`);
    process.exit(1);
  }

  if (!config.dryRun && !config.help) {
    if (!config.rpcUrl) {
      console.error('❌ Error: --rpc-url is required or set RPC_URL environment variable');
      console.error('   Example: export RPC_URL="https://polygon-rpc.com/"');
      process.exit(1);
    }

    if (!config.privateKey) {
      console.error('❌ Error: --private-key is required or set PRIVATEKEY environment variable');
      console.error('   Example: export PRIVATEKEY="0x..."');
      process.exit(1);
    }
  }
}

function deployToPhala(config) {
  const composePath = path.resolve(config.composeFile);

  console.log(`🚀 Deploying Semi-Proprietary Modules to DStack...`);
  console.log(`   Compose file: ${composePath}`);
  console.log(`   Node ID: ${config.nodeId}`);
  console.log(`   KMS ID: ${config.kmsId}`);
  console.log(`   Deployment: ${config.name}`);
  console.log('');

  if (config.dryRun) {
    console.log('🔍 DRY RUN - would execute:');
    console.log(`   phala deploy --node-id ${config.nodeId} --kms-id ${config.kmsId} ${composePath}`);
    console.log(`            --rpc-url ${config.rpcUrl} --private-key [REDACTED]`);
    if (config.name) {
      console.log(`            --name ${config.name}`);
    }
    console.log('');
    console.log('📋 This would deploy:');
    console.log('   ✅ Sudoku solving service with semi-proprietary modules');
    console.log('   ✅ DStack TEE integration with guest agent');
    console.log('   ✅ Encrypted module bulletin board');
    console.log('   ✅ Policy-based decryption system');
    console.log('   ✅ Self-containment verification');
    return;
  }

  // Build deployment command
  const cmd = [
    'phala', 'deploy',
    '--node-id', config.nodeId.toString(),
    '--kms-id', config.kmsId,
    composePath,
    '--rpc-url', config.rpcUrl,
    '--private-key', config.privateKey
  ];

  if (config.name) {
    cmd.push('--name', config.name);
  }

  console.log(`📡 Executing deployment...`);
  console.log(`   Command: phala deploy --node-id ${config.nodeId} --kms-id ${config.kmsId} [...]`);

  try {
    execSync(cmd.join(' '), {
      stdio: 'inherit',
      env: { ...process.env }
    });

    console.log('');
    console.log('🎉 Deployment completed successfully!');
    console.log('');
    console.log('📋 What was deployed:');
    console.log('   ✅ Semi-proprietary module system');
    console.log('   ✅ Sudoku solver with encrypted modules');
    console.log('   ✅ DStack TEE integration');
    console.log('   ✅ Policy-based access control');
    console.log('');
    console.log('🔗 Next steps:');
    console.log('   1. Use `phala cvms list` to check deployment status');
    console.log('   2. Test the API endpoints once CVM is running');
    console.log('   3. Try solving sudoku puzzles via semi-proprietary modules');

  } catch (error) {
    console.error('');
    console.error('❌ Deployment failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('   1. Check your Phala Cloud API key');
    console.error('   2. Verify node ID and KMS ID are correct');
    console.error('   3. Ensure RPC URL and private key are valid');
    console.error('   4. Check `phala help deploy` for more options');
    process.exit(1);
  }
}

function main() {
  console.log('🧩 Semi-Proprietary Modules - DStack Deployment');
  console.log('   A novel encrypted module distribution system');
  console.log('');

  const config = parseArgs();

  if (config.help) {
    showUsage();
    return;
  }

  validateConfig(config);

  // Auto-generate deployment name if not provided
  if (!config.name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    config.name = `semiprop-sudoku-${timestamp}`;
  }

  deployToPhala(config);
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs, validateConfig };