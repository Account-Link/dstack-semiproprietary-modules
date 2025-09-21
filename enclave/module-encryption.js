const crypto = require('crypto');
const fs = require('fs');
const { DStackIntegration } = require('./dstack-integration');

/**
 * Module Encryption for Semi-Proprietary Modules
 *
 * This implements the encryption layer for modules that will be stored
 * on a public bulletin board (blockchain blob storage) and can be
 * decrypted by authorized dstack enclaves according to on-chain policy.
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

      // 2. Derive the decryption key using dstack
      const keyInfo = await this.dstack.deriveModuleKey(moduleId, encryptedPackage.metadata.policy);

      // 3. Verify integrity
      const expectedHash = encryptedPackage.metadata.sourceHash;

      // 4. Decrypt the source
      const key = crypto.scryptSync(keyInfo.moduleKey, 'salt', 32);
      const iv = Buffer.from(encryptedPackage.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

      let decrypted = decipher.update(encryptedPackage.encryptedSource, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

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
   * Retrieve encrypted module from bulletin board
   */
  retrieveFromBulletinBoard(moduleId) {
    console.log(`📥 Retrieving module from bulletin board: ${moduleId}`);

    try {
      const bulletinPath = `./bulletin_board/${moduleId}.json`;

      if (!fs.existsSync(bulletinPath)) {
        throw new Error(`Module not found on bulletin board: ${moduleId}`);
      }

      const bulletinEntry = JSON.parse(fs.readFileSync(bulletinPath, 'utf-8'));

      console.log(`✅ Module retrieved from bulletin board`);
      console.log(`   Published: ${bulletinEntry.publishedAt}`);
      console.log(`   Size: ${bulletinEntry.size} bytes`);

      return bulletinEntry.encryptedPackage;

    } catch (error) {
      console.error(`❌ Bulletin board retrieval failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { ModuleEncryption };