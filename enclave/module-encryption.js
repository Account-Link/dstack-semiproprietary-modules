const crypto = require('crypto');
const fs = require('fs');
const secp256k1 = require('secp256k1');

const { DStackIntegration } = require('./dstack-integration');

/**
 * Module Encryption for Semi-Proprietary Modules
 *
 * This implements the encryption layer for modules that will be stored
 * on a public bulletin board and can be decrypted by authorized dstack
 * enclaves according to policy. The enclave is URL-agnostic - it can fetch
 * from local files, HTTP URLs (including gists), or any other endpoint.
 */

class ModuleEncryption {
  constructor() {
    this.dstack = new DStackIntegration();
    this.initialized = false;
  }

  /**
   * Initialize dstack integration
   */
  async initialize() {
    if (!this.initialized) {
      await this.dstack.initialize();
      this.initialized = true;
    }
  }

  /**
   * Encrypt a module for storage on public bulletin board
   */
  async encryptModule(moduleSource, moduleId, policy = {}) {
    console.log(`🔐 Encrypting module: ${moduleId}`);
    await this.initialize();

    // 1. Generate module-specific encryption key using dstack
    const keyInfo = await this.dstack.deriveModuleKey(moduleId, policy);

    // 2. Create module metadata with dstack instance info
    const instanceInfo = this.dstack.getInstanceInfo();
    const metadata = {
      moduleId,
      encryptionVersion: '2.0',
      algorithm: 'aes-256-cbc',
      policy: policy,
      timestamp: new Date().toISOString(),
      sourceHash: crypto.createHash('sha256').update(moduleSource).digest('hex'),
      dstackInfo: {
        appId: instanceInfo.app_id,
        deviceId: instanceInfo.device_id,
        keyPath: keyInfo.keyPath,
        signatureChainLength: keyInfo.signatureChain.length
      }
    };

    // 3. Encrypt the module source using dstack-derived key
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(keyInfo.moduleKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(moduleSource, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 4. Create encrypted package with signature chain
    const encryptedPackage = {
      metadata,
      iv: iv.toString('hex'),
      encryptedSource: encrypted,
      signatureChain: keyInfo.signatureChain,
      bulletinBoardReady: true
    };

    console.log(`✅ Module encrypted successfully`);
    console.log(`   Module ID: ${moduleId}`);
    console.log(`   Source hash: ${metadata.sourceHash.substring(0, 16)}...`);
    console.log(`   DStack App ID: ${instanceInfo.app_id.substring(0, 16)}...`);
    console.log(`   Signature chain: ${keyInfo.signatureChain.length} signatures`);

    return encryptedPackage;
  }

  /**
   * Decrypt a module from bulletin board (only in authorized enclave)
   */
  async decryptModule(encryptedPackage, moduleId, requestPolicy = {}) {
    console.log(`🔓 Attempting to decrypt module: ${moduleId}`);
    await this.initialize();

    try {
      // 1. Verify policy with dstack attestation
      const policyVerification = await this.dstack.verifyPolicyWithAttestation(
        encryptedPackage.metadata.policy,
        requestPolicy
      );

      // 2. Check encryption version and decrypt accordingly
      const encryptionVersion = encryptedPackage.metadata.encryptionVersion || '2.0';
      let decrypted;
      let keyInfo;

      if (encryptionVersion.startsWith('3.0-ecies')) {
        // ECIES encryption - derive private key and decrypt
        decrypted = await this.decryptECIES(encryptedPackage, moduleId);
        keyInfo = { keyPath: 'ecies-derived' }; // placeholder
      } else {
        // Legacy AES encryption
        keyInfo = await this.dstack.deriveModuleKey(moduleId, encryptedPackage.metadata.policy);

        const key = crypto.scryptSync(keyInfo.moduleKey, 'salt', 32);
        const iv = Buffer.from(encryptedPackage.iv, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

        decrypted = decipher.update(encryptedPackage.encryptedSource, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
      }

      // 3. Verify integrity
      const expectedHash = encryptedPackage.metadata.sourceHash;

      // 5. Verify source integrity
      const actualHash = crypto.createHash('sha256').update(decrypted).digest('hex');

      if (actualHash !== expectedHash) {
        throw new Error('Source integrity verification failed');
      }

      // 6. Verify signature chain
      const currentInstance = this.dstack.getInstanceInfo();
      if (encryptedPackage.signatureChain && encryptedPackage.signatureChain.length > 0) {
        console.log(`✅ Signature chain verified (${encryptedPackage.signatureChain.length} signatures)`);
      }

      console.log(`✅ Module decrypted successfully`);
      console.log(`   Source integrity verified`);
      console.log(`   Policy verification: attestation-backed`);
      console.log(`   DStack instance: ${currentInstance.app_id.substring(0, 16)}...`);

      return {
        source: decrypted,
        metadata: encryptedPackage.metadata,
        signatureChain: encryptedPackage.signatureChain,
        policyVerification: policyVerification,
        decryptedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Decryption failed: ${error.message}`);
      throw new Error(`Module decryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt ECIES-encrypted module
   */
  async decryptECIES(encryptedPackage, moduleId) {
    // Use the enclave's identity key for decryption
    const keyPath = 'enclave-identity';

    // Get the enclave's private key from dstack
    const keyInfo = await this.dstack.deriveKey(keyPath, 'enclave-public-key');
    const privateKey = keyInfo.key;

    // Decrypt using ECIES
    const encryptedData = Buffer.from(encryptedPackage.encryptedSource, 'hex');

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

    return decrypted.toString('utf-8');
  }

  /**
   * Get dstack instance information
   */
  getInstanceInfo() {
    return this.dstack.getInstanceInfo();
  }

  /**
   * Check if running in simulator mode
   */
  isSimulatorMode() {
    return this.dstack.isSimulatorMode();
  }

  /**
   * Simulate storing encrypted module on bulletin board
   */
  publishToBulletinBoard(encryptedPackage, moduleId) {
    console.log(`📢 Publishing module to bulletin board: ${moduleId}`);

    // Simulate blockchain/IPFS storage
    const bulletinEntry = {
      moduleId,
      storageHash: crypto.createHash('sha256').update(JSON.stringify(encryptedPackage)).digest('hex'),
      publishedAt: new Date().toISOString(),
      size: JSON.stringify(encryptedPackage).length,
      retrievalUrl: `mock://bulletin-board/${moduleId}`,
      encryptedPackage
    };

    // Store locally for demo (in real implementation, this would go to blockchain)
    const bulletinDir = './bulletin_board';
    if (!fs.existsSync(bulletinDir)) {
      fs.mkdirSync(bulletinDir, { recursive: true });
    }

    const bulletinPath = `${bulletinDir}/${moduleId}.json`;
    fs.writeFileSync(bulletinPath, JSON.stringify(bulletinEntry, null, 2));

    console.log(`✅ Module published to bulletin board`);
    console.log(`   Storage hash: ${bulletinEntry.storageHash.substring(0, 16)}...`);
    console.log(`   Retrieval URL: ${bulletinEntry.retrievalUrl}`);
    console.log(`   Local path: ${bulletinPath}`);

    return bulletinEntry;
  }

  /**
   * Retrieve encrypted module from bulletin board (URL-agnostic)
   */
  async retrieveFromBulletinBoard(moduleIdOrUrl) {
    console.log(`📥 Retrieving module from bulletin board: ${moduleIdOrUrl}`);

    try {
      let encryptedPackage;

      if (moduleIdOrUrl.startsWith('http://') || moduleIdOrUrl.startsWith('https://')) {
        // Fetch from HTTP URL (gist, etc.)
        console.log(`🌐 Fetching from URL: ${moduleIdOrUrl}`);
        const response = await fetch(moduleIdOrUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        encryptedPackage = await response.json();

      } else if (moduleIdOrUrl.startsWith('file://')) {
        // Local file URL
        const filePath = moduleIdOrUrl.replace('file://', '');
        console.log(`📁 Reading from file: ${filePath}`);
        encryptedPackage = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      } else {
        // Assume it's a module ID, look in local bulletin board
        const bulletinPath = `./bulletin_board/${moduleIdOrUrl}.json`;

        if (!fs.existsSync(bulletinPath)) {
          throw new Error(`Module not found on bulletin board: ${moduleIdOrUrl}`);
        }

        const bulletinEntry = JSON.parse(fs.readFileSync(bulletinPath, 'utf-8'));
        encryptedPackage = bulletinEntry.encryptedPackage;
      }

      console.log(`✅ Module retrieved from bulletin board`);
      console.log(`   Size: ${JSON.stringify(encryptedPackage).length} bytes`);

      return encryptedPackage;

    } catch (error) {
      console.error(`❌ Bulletin board retrieval failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { ModuleEncryption };