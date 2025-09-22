#!/usr/bin/env node

/**
 * Encrypt Module for Semi-Proprietary Distribution
 *
 * This script allows module authors to encrypt modules using ECIES
 * with a public key derived from a dstack enclave. The encrypted
 * module can then be distributed publicly and only decrypted by
 * the authorized enclave.
 *
 * Usage:
 *   node scripts/encrypt-module.js <module-file> <module-id> --public-key <key-file>
 *   node scripts/encrypt-module.js <module-file> <module-id> --public-key-hex <hex-string>
 *
 * Examples:
 *   node scripts/encrypt-module.js solver.js my-solver-v1 --public-key ./public-keys/my-solver-v1.json
 *   node scripts/encrypt-module.js solver.js premium-v1 --public-key-hex 03a1b2c3...
 */

const crypto = require('crypto');
const secp256k1 = require('secp256k1');
const { SudokuModuleVerifier } = require('../enclave/sudoku-verifier');
const fs = require('fs');
const path = require('path');

class ECIESEncryption {
  /**
   * Encrypt data using ECIES with secp256k1
   */
  static encrypt(data, publicKey) {
    // Generate ephemeral key pair
    let ephemeralPrivateKey;
    let ephemeralPublicKey;

    do {
      ephemeralPrivateKey = crypto.randomBytes(32);
    } while (!secp256k1.privateKeyVerify(ephemeralPrivateKey));

    ephemeralPublicKey = secp256k1.publicKeyCreate(ephemeralPrivateKey, false);

    // Perform ECDH to get shared secret
    const sharedPoint = secp256k1.publicKeyTweakMul(publicKey, ephemeralPrivateKey);

    // Derive encryption key from shared secret using HKDF
    const sharedSecret = sharedPoint.slice(1, 33); // x-coordinate of shared point
    const derivedKey = crypto.createHmac('sha256', Buffer.alloc(0))
      .update(sharedSecret)
      .digest();

    // Split derived key into encryption key and MAC key
    const encKey = derivedKey.slice(0, 16); // AES-128 key
    const macKey = derivedKey.slice(16, 32); // HMAC key

    // Encrypt the data using AES-128-CTR
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-128-ctr', encKey, iv);

    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([iv, encrypted, cipher.final()]);

    // Create MAC over ephemeral public key + encrypted data (including IV)
    const macData = Buffer.concat([ephemeralPublicKey, encrypted]);
    const mac = crypto.createHmac('sha256', macKey).update(macData).digest();

    // Return: ephemeral_pubkey (65) + iv + encrypted_data + mac (32)
    return Buffer.concat([ephemeralPublicKey, encrypted, mac]);
  }

  /**
   * Decrypt data using ECIES with secp256k1
   */
  static decrypt(encryptedData, privateKey) {
    if (encryptedData.length < 97) { // 65 + 32 minimum
      throw new Error('Invalid encrypted data length');
    }

    // Extract components
    const ephemeralPublicKey = encryptedData.slice(0, 65);
    const encrypted = encryptedData.slice(65, -32);
    const mac = encryptedData.slice(-32);

    // Perform ECDH to get shared secret
    const sharedPoint = secp256k1.publicKeyTweakMul(ephemeralPublicKey, privateKey);
    const sharedSecret = sharedPoint.slice(1, 33); // x-coordinate

    // Derive keys
    const derivedKey = crypto.createHmac('sha256', Buffer.alloc(0))
      .update(sharedSecret)
      .digest();

    const encKey = derivedKey.slice(0, 16);
    const macKey = derivedKey.slice(16, 32);

    // Verify MAC
    const macData = Buffer.concat([ephemeralPublicKey, encrypted]);
    const expectedMac = crypto.createHmac('sha256', macKey).update(macData).digest();

    if (!mac.equals(expectedMac)) {
      throw new Error('MAC verification failed');
    }

    // Extract IV and decrypt the data
    const iv = encrypted.slice(0, 16);
    const actualEncrypted = encrypted.slice(16);
    const decipher = crypto.createDecipheriv('aes-128-ctr', encKey, iv);
    let decrypted = decipher.update(actualEncrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: node scripts/encrypt-module.js <module-file> <module-id> --public-key <key-file>');
    console.error('   or: node scripts/encrypt-module.js <module-file> <module-id> --public-key-hex <hex-string>');
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/encrypt-module.js solver.js my-solver-v1 --public-key ./public-keys/my-solver-v1.json');
    console.error('  node scripts/encrypt-module.js solver.js premium-v1 --public-key-hex 03a1b2c3...');
    process.exit(1);
  }

  const moduleFile = args[0];
  const moduleId = args[1];
  const keyOption = args[2];
  const keyValue = args[3];

  // Parse command line options
  const options = parseOptions(args.slice(2));

  // Check if module file exists
  if (!fs.existsSync(moduleFile)) {
    console.error(`❌ Module file not found: ${moduleFile}`);
    process.exit(1);
  }

  console.log(`🔐 Encrypting semi-proprietary module: ${moduleId}`);
  console.log(`   Source: ${moduleFile}`);
  console.log(`   Policy: ${JSON.stringify(options.policy, null, 2)}`);

  try {
    // Load public key
    let publicKey;
    let keyRecord;

    if (options.publicKeyFile) {
      console.log(`📋 Loading public key from: ${options.publicKeyFile}`);
      keyRecord = JSON.parse(fs.readFileSync(options.publicKeyFile, 'utf-8'));
      publicKey = Buffer.from(keyRecord.publicKey, 'hex');

      // Validate the key record matches our module
      if (keyRecord.moduleId !== moduleId) {
        console.warn(`⚠️  Key record is for ${keyRecord.moduleId}, but encrypting ${moduleId}`);
      }
    } else if (options.publicKeyHex) {
      console.log(`🔑 Using public key from hex: ${options.publicKeyHex.substring(0, 16)}...`);
      publicKey = Buffer.from(options.publicKeyHex, 'hex');
    } else {
      throw new Error('Must provide either --public-key or --public-key-hex');
    }

    // Validate public key
    if (!secp256k1.publicKeyVerify(publicKey)) {
      throw new Error('Invalid public key');
    }

    // Read and verify module
    console.log(`📖 Reading module source...`);
    const moduleSource = fs.readFileSync(moduleFile, 'utf-8');

    console.log(`🔍 Verifying module self-containment...`);
    const verifier = new SudokuModuleVerifier();
    const verification = verifier.verifySudokuModule(moduleSource);

    if (!verification.isContained) {
      console.error(`❌ Module verification failed:`);
      verification.violations.forEach(v => console.error(`  - ${v}`));
      process.exit(1);
    }

    console.log(`✅ Module verification passed`);

    // Create metadata
    const metadata = {
      moduleId,
      encryptionVersion: '3.0-ecies',
      algorithm: 'ecies-secp256k1',
      policy: options.policy,
      timestamp: new Date().toISOString(),
      sourceHash: crypto.createHash('sha256').update(moduleSource).digest('hex'),
      publicKeyHash: crypto.createHash('sha256').update(publicKey).digest('hex'),
      verification: {
        algorithmic: verification.algorithmStructure,
        complexity: verification.complexity,
        exports: Array.from(verification.exports)
      },
      publishedAt: new Date().toISOString()
    };

    // Include key record info if available
    if (keyRecord) {
      metadata.targetEnclave = {
        keyPath: keyRecord.keyPath,
        enclaveInfo: keyRecord.enclaveInfo
      };
    }

    console.log(`🔐 Encrypting module using ECIES...`);

    // Encrypt the module source
    const encryptedSource = ECIESEncryption.encrypt(Buffer.from(moduleSource, 'utf-8'), publicKey);

    // Create encrypted package
    const encryptedPackage = {
      metadata,
      encryptedSource: encryptedSource.toString('hex')
    };

    // Save encrypted package
    const outputDir = './encrypted-modules';
    fs.mkdirSync(outputDir, { recursive: true });

    const outputFile = path.join(outputDir, `${moduleId}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(encryptedPackage, null, 2));

    console.log(`✅ Module encrypted successfully`);
    console.log(`   Module ID: ${moduleId}`);
    console.log(`   Source hash: ${metadata.sourceHash.substring(0, 16)}...`);
    console.log(`   Encrypted size: ${encryptedSource.length} bytes`);
    console.log(`   Saved to: ${outputFile}`);

    console.log(`\n🔗 Next steps:`);
    console.log(`   1. Publish to gist: node scripts/publish-encrypted-gist.js ${outputFile}`);
    console.log(`   2. Enclave can decrypt using the matching private key`);

    // Also save to bulletin board format for compatibility
    const bulletinFile = `./bulletin_board/${moduleId}.json`;
    fs.mkdirSync('./bulletin_board', { recursive: true });
    fs.writeFileSync(bulletinFile, JSON.stringify(encryptedPackage, null, 2));

    console.log(`\n📋 Also saved in bulletin board format: ${bulletinFile}`);

  } catch (error) {
    console.error(`❌ Encryption failed: ${error.message}`);
    process.exit(1);
  }
}

function parseOptions(args) {
  const options = {
    policy: {}
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--public-key':
        if (i + 1 >= args.length) {
          console.error('❌ --public-key requires a file path');
          process.exit(1);
        }
        options.publicKeyFile = args[++i];
        break;

      case '--public-key-hex':
        if (i + 1 >= args.length) {
          console.error('❌ --public-key-hex requires a hex string');
          process.exit(1);
        }
        options.publicKeyHex = args[++i];
        break;

      case '--payment':
        options.policy.requiresPayment = true;
        break;

      case '--price':
        if (i + 1 >= args.length) {
          console.error('❌ --price requires a value');
          process.exit(1);
        }
        options.policy.price = args[++i];
        options.policy.requiresPayment = true;
        break;

      case '--expires':
        if (i + 1 >= args.length) {
          console.error('❌ --expires requires a date');
          process.exit(1);
        }
        options.policy.validUntil = args[++i];
        break;

      case '--author':
        if (i + 1 >= args.length) {
          console.error('❌ --author requires a name');
          process.exit(1);
        }
        options.policy.author = args[++i];
        break;
    }
  }

  // Set defaults
  if (!options.policy.author) {
    options.policy.author = 'module-author';
  }
  if (!options.policy.version) {
    options.policy.version = '1.0.0';
  }

  return options;
}

// Export for testing
module.exports = { ECIESEncryption, main, parseOptions };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}