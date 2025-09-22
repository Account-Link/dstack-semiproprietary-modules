#!/usr/bin/env node

/**
 * Derive Public Key from DStack Enclave
 *
 * This script derives the enclave's public key from a dstack enclave.
 * Module authors can use this public key to encrypt modules that only
 * this specific enclave can decrypt.
 *
 * Usage:
 *   node scripts/derive-public-key.js
 */

const { DStackIntegration } = require('../enclave/dstack-integration');
const crypto = require('crypto');
const secp256k1 = require('secp256k1');

async function main() {
  console.log(`🔑 Deriving enclave public key`);

  try {
    // Initialize dstack integration (this needs to run in enclave context)
    const dstack = new DStackIntegration();
    await dstack.initialize();

    // Use a fixed key path for the enclave identity
    const keyPath = 'enclave-identity';

    console.log(`📍 Enclave key path: ${keyPath}`);

    // Get the enclave's private key
    const keyInfo = await dstack.deriveKey(keyPath, 'enclave-public-key');

    // Derive the public key from private key
    const publicKey = secp256k1.publicKeyCreate(keyInfo.key, false); // uncompressed
    const compressedPublicKey = secp256k1.publicKeyCreate(keyInfo.key, true); // compressed

    console.log(`✅ Enclave public key derived successfully`);
    console.log(`   Private key available in enclave: ${keyInfo.key.length} bytes`);
    console.log(`   Public key (uncompressed): ${Buffer.from(publicKey).toString('hex')}`);
    console.log(`   Public key (compressed): ${Buffer.from(compressedPublicKey).toString('hex')}`);
    console.log(`   Signature chain: ${keyInfo.signatureChain.length} signatures`);

    // Output for module authors
    const keyRecord = {
      keyPath: keyPath,
      publicKey: Buffer.from(compressedPublicKey).toString('hex'),
      publicKeyUncompressed: Buffer.from(publicKey).toString('hex'),
      signatureChain: keyInfo.signatureChain || [],
      derivedAt: new Date().toISOString(),
      enclaveInfo: dstack.getInstanceInfo()
    };

    console.log(`\n📋 Enclave public key for module authors:`);
    console.log(JSON.stringify(keyRecord, null, 2));

    // Save to file for module authors
    const keyFile = `./enclave-public-key.json`;
    const { writeFileSync } = require('fs');
    writeFileSync(keyFile, JSON.stringify(keyRecord, null, 2));

    console.log(`\n💾 Enclave public key saved: ${keyFile}`);
    console.log(`\n🔗 Module authors can now encrypt to this enclave`);
    console.log(`   node scripts/encrypt-module.js <module-file> <module-id> --public-key ${keyFile}`);

  } catch (error) {
    console.error(`❌ Key derivation failed: ${error.message}`);

    if (error.message.includes('dstack')) {
      console.error(`\n💡 This script must run in an environment with dstack access`);
    }

    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main };