#!/usr/bin/env node

/**
 * Publish Module to GitHub Gist Bulletin Board
 *
 * Usage:
 *   node scripts/publish-module-gist.js <module-path> <module-id> [options]
 *
 * Examples:
 *   # Basic publish
 *   node scripts/publish-module-gist.js ./private_module/sudoku-solver.js my-solver-v1
 *
 *   # With custom policy
 *   node scripts/publish-module-gist.js ./private_module/premium-solver.js premium-v1 --payment --price 100
 *
 *   # Time-limited access
 *   node scripts/publish-module-gist.js ./private_module/demo-solver.js demo-v1 --expires "2024-12-31"
 *
 * Environment:
 *   GITHUB_TOKEN - GitHub personal access token with gist scope
 */

const { Octokit } = require('@octokit/rest');
const path = require('path');
const fs = require('fs');

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node scripts/publish-module-gist.js <module-path> <module-id> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --payment          Require payment for access');
    console.error('  --price <amount>   Set price (requires --payment)');
    console.error('  --currency <curr>  Set currency (default: USDC)');
    console.error('  --expires <date>   Set expiration date (ISO format)');
    console.error('  --author <name>    Set author name');
    console.error('  --description <text> Set description');
    console.error('');
    console.error('Environment:');
    console.error('  GITHUB_TOKEN       GitHub token with gist scope');
    process.exit(1);
  }

  const modulePath = args[0];
  const moduleId = args[1];

  // Parse command line options
  const options = parseOptions(args.slice(2));

  // Check if module file exists
  if (!fs.existsSync(modulePath)) {
    console.error(`❌ Module file not found: ${modulePath}`);
    process.exit(1);
  }

  console.log(`📤 Publishing semi-proprietary module: ${moduleId}`);
  console.log(`   Source: ${modulePath}`);
  console.log(`   Policy: ${JSON.stringify(options.policy, null, 2)}`);

  try {
    // For scripts, we need to create the encrypted package manually or use a simpler approach
    // For now, let's assume the user has already created the encrypted package
    // This script just handles the gist publishing part

    let encryptedPackage;

    // Check if encrypted package already exists
    const encryptedPath = `./bulletin_board/${moduleId}.json`;
    if (fs.existsSync(encryptedPath)) {
      const bulletinEntry = JSON.parse(fs.readFileSync(encryptedPath, 'utf-8'));
      encryptedPackage = bulletinEntry.encryptedPackage || bulletinEntry;
      console.log(`📦 Using existing encrypted package: ${encryptedPath}`);
    } else {
      console.error(`❌ Encrypted package not found: ${encryptedPath}`);
      console.error(`   Please first run: node scripts/publish-module.js ${modulePath} ${moduleId}`);
      process.exit(1);
    }

    // Initialize GitHub API
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.log(`⚠️  GITHUB_TOKEN not set, using local fallback`);
      const publishResult = {
        storageId: `local:${moduleId}`,
        retrievalUrl: `file://${path.resolve(`./bulletin_board/${moduleId}.json`)}`,
        publishedAt: new Date().toISOString()
      };

      console.log(`✅ Module published to local storage`);
      console.log(`   Storage ID: ${publishResult.storageId}`);
      console.log(`   Retrieval URL: ${publishResult.retrievalUrl}`);

      // Output for enclave use
      console.log(`\n🔗 For enclave use:`);
      console.log(`   await loadSemiProprietaryModule("${publishResult.retrievalUrl}")`);
      return;
    }

    const octokit = new Octokit({ auth: token });

    // Publish to gist
    console.log(`📢 Publishing to GitHub Gist...`);

    const gistData = {
      description: `Semi-proprietary module: ${moduleId}`,
      public: true,
      files: {
        [`${moduleId}.json`]: {
          content: JSON.stringify(encryptedPackage, null, 2)
        }
      }
    };

    const response = await octokit.rest.gists.create(gistData);

    const publishResult = {
      storageId: response.data.id,
      retrievalUrl: response.data.files[`${moduleId}.json`].raw_url,
      gistUrl: response.data.html_url,
      publishedAt: response.data.created_at
    };

    console.log(`✅ Module published successfully`);
    console.log(`   Module ID: ${moduleId}`);
    console.log(`   Storage ID: ${publishResult.storageId}`);
    console.log(`   Retrieval URL: ${publishResult.retrievalUrl}`);

    if (publishResult.gistUrl) {
      console.log(`   Gist URL: ${publishResult.gistUrl}`);
    }

    // Output the URL for enclave use
    console.log(`\n🔗 For enclave use:`);
    console.log(`   node enclave/semiprop-service.js`);
    console.log(`   # Then load with: "${publishResult.retrievalUrl}"`);
    console.log(`\n📋 Or test with:`);
    console.log(`   # In semiprop-module-loader, use this URL:`);
    console.log(`   await loadSemiProprietaryModule("${publishResult.retrievalUrl}")`);

    // Update package.json scripts if needed
    console.log(`\n💡 You can also add this to package.json scripts:`);
    console.log(`   "load-${moduleId}": "node -e 'require(\\"./enclave/semiprop-module-loader\\").loadSemiProprietaryModule(\\"${publishResult.retrievalUrl}\\")'"`);

    // Save publishing record
    const publishRecord = {
      moduleId,
      modulePath,
      policy: options.policy,
      publishResult,
      publishedAt: new Date().toISOString()
    };

    const recordPath = `./publish-records/${moduleId}.json`;
    fs.mkdirSync('./publish-records', { recursive: true });
    fs.writeFileSync(recordPath, JSON.stringify(publishRecord, null, 2));

    console.log(`📋 Publishing record saved: ${recordPath}`);

  } catch (error) {
    console.error(`❌ Publishing failed: ${error.message}`);
    process.exit(1);
  }
}

function parseOptions(args) {
  const policy = {};
  const options = { policy };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--payment':
        policy.requiresPayment = true;
        break;

      case '--price':
        if (i + 1 >= args.length) {
          console.error('❌ --price requires a value');
          process.exit(1);
        }
        policy.price = args[++i];
        policy.requiresPayment = true;
        break;

      case '--currency':
        if (i + 1 >= args.length) {
          console.error('❌ --currency requires a value');
          process.exit(1);
        }
        policy.currency = args[++i];
        break;

      case '--expires':
        if (i + 1 >= args.length) {
          console.error('❌ --expires requires a date');
          process.exit(1);
        }
        policy.validUntil = args[++i];
        break;

      case '--author':
        if (i + 1 >= args.length) {
          console.error('❌ --author requires a name');
          process.exit(1);
        }
        policy.author = args[++i];
        break;

      case '--description':
        if (i + 1 >= args.length) {
          console.error('❌ --description requires text');
          process.exit(1);
        }
        policy.description = args[++i];
        break;

      default:
        console.error(`❌ Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  // Set defaults
  if (policy.requiresPayment && !policy.currency) {
    policy.currency = 'USDC';
  }

  if (!policy.author) {
    policy.author = 'anonymous';
  }

  if (!policy.version) {
    policy.version = '1.0.0';
  }

  return options;
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, parseOptions };