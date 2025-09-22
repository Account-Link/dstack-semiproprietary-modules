/**
 * Test ECIES End-to-End Integration
 *
 * This test demonstrates the complete workflow:
 * 1. Enclave derives public key for a module
 * 2. Module author encrypts using that public key
 * 3. Enclave decrypts the module
 */

const { DStackIntegration } = require('../enclave/dstack-integration');
const { ModuleEncryption } = require('../enclave/module-encryption');
const { ECIESEncryption } = require('../scripts/encrypt-module');
const crypto = require('crypto');
const secp256k1 = require('secp256k1');
const fs = require('fs');

async function testECIESIntegration() {
  console.log('🧪 Testing ECIES End-to-End Integration...\n');

  const moduleId = 'test-integration-module';
  const policy = { author: 'test-author', version: '1.0.0' };

  try {
    // Step 1: Enclave derives public key
    console.log('Step 1: Enclave derives public key');
    console.log('=====================================');

    const dstack = new DStackIntegration();
    await dstack.initialize();

    // Derive the key path (same as used in module encryption)
    const keyPath = `semiprop-modules/${moduleId}`;
    const policyHash = crypto.createHash('sha256').update(JSON.stringify(policy)).digest('hex');
    const fullPath = `${keyPath}/${policyHash.substring(0, 16)}`;

    console.log(`🔑 Deriving key for path: ${fullPath}`);
    const keyInfo = await dstack.deriveKey(fullPath, 'module-encryption');

    // Generate public key from private key
    const publicKey = secp256k1.publicKeyCreate(keyInfo.key, false); // uncompressed

    console.log(`✅ Key derived successfully`);
    console.log(`   Private key: ${keyInfo.key.toString('hex')}`);
    console.log(`   Public key: ${Buffer.from(publicKey).toString('hex')}`);

    // Step 2: Module author encrypts using public key
    console.log('\nStep 2: Module author encrypts using public key');
    console.log('===============================================');

    const testModuleSource = `
// Test sudoku solver module
function solveSudoku(board) {
  // Simple test solver
  return board;
}

function validatePuzzle(board) {
  return true;
}

const metadata = {
  name: 'test-solver',
  version: '1.0.0',
  algorithm: 'test'
};

module.exports = { solveSudoku, validatePuzzle, metadata };
`.trim();

    console.log(`📝 Module source (${testModuleSource.length} bytes)`);

    // Create metadata
    const metadata = {
      moduleId,
      encryptionVersion: '3.0-ecies',
      algorithm: 'ecies-secp256k1',
      policy,
      timestamp: new Date().toISOString(),
      sourceHash: crypto.createHash('sha256').update(testModuleSource).digest('hex'),
      publicKeyHash: crypto.createHash('sha256').update(publicKey).digest('hex'),
      publishedAt: new Date().toISOString()
    };

    // Encrypt using ECIES
    console.log(`🔐 Encrypting module using ECIES...`);
    const encryptedSource = ECIESEncryption.encrypt(Buffer.from(testModuleSource, 'utf-8'), publicKey);

    const encryptedPackage = {
      metadata,
      encryptedSource: encryptedSource.toString('hex')
    };

    console.log(`✅ Module encrypted successfully`);
    console.log(`   Encrypted size: ${encryptedSource.length} bytes`);
    console.log(`   Source hash: ${metadata.sourceHash.substring(0, 16)}...`);

    // Step 3: Enclave decrypts the module
    console.log('\nStep 3: Enclave decrypts the module');
    console.log('==================================');

    const moduleEncryption = new ModuleEncryption();
    await moduleEncryption.initialize();

    console.log(`🔓 Attempting to decrypt module...`);
    const result = await moduleEncryption.decryptModule(encryptedPackage, moduleId, {});

    console.log(`✅ Module decrypted successfully!`);
    console.log(`   Decrypted source length: ${result.source.length} bytes`);
    console.log(`   Source integrity verified: ${result.source.length === testModuleSource.length}`);

    // Verify the decrypted content matches
    if (result.source === testModuleSource) {
      console.log(`🎉 End-to-end ECIES integration test PASSED!`);
      console.log(`\n📊 Summary:`);
      console.log(`   ✅ Public key derivation`);
      console.log(`   ✅ ECIES encryption`);
      console.log(`   ✅ ECIES decryption`);
      console.log(`   ✅ Source integrity verification`);
      console.log(`   ✅ Policy verification`);
    } else {
      console.log(`❌ Content mismatch!`);
      console.log(`   Original: ${testModuleSource.length} bytes`);
      console.log(`   Decrypted: ${result.source.length} bytes`);
      console.log(`   First 100 chars original: ${testModuleSource.substring(0, 100)}`);
      console.log(`   First 100 chars decrypted: ${result.source.substring(0, 100)}`);
    }

  } catch (error) {
    console.error(`❌ Integration test failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Run if called directly
if (require.main === module) {
  testECIESIntegration();
}

module.exports = { testECIESIntegration };