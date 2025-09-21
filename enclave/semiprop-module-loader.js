const { SudokuModuleVerifier } = require('./sudoku-verifier');
const { ModuleEncryption } = require('./module-encryption');
const fs = require('fs');

/**
 * Semi-Proprietary Module Loader
 *
 * This implements the novel "semi-proprietary" concept:
 * 1. Modules are encrypted and stored on public bulletin board
 * 2. Enclave can decrypt according to on-chain policy
 * 3. Codesigned verifier proves modules are self-contained
 * 4. No original author intervention needed for decryption
 *
 * This extends the classic "contingent payment" ZK proof example
 * with practical encrypted module distribution.
 */

class SemiProprietaryModuleLoader {
  constructor() {
    this.verifier = new SudokuModuleVerifier();
    this.encryption = new ModuleEncryption();
    this.loadedModules = new Map();
  }

  /**
   * Load a module by ID from the bulletin board
   * This demonstrates the full semi-proprietary flow
   */
  async loadModuleById(moduleId, policy = {}) {
    console.log(`🔍 Loading semi-proprietary module: ${moduleId}`);

    try {
      // 1. Retrieve encrypted module from bulletin board
      console.log(`📥 Step 1: Retrieving from bulletin board...`);
      const encryptedPackage = this.encryption.retrieveFromBulletinBoard(moduleId);

      // 2. Verify policy allows decryption in this enclave
      console.log(`🔑 Step 2: Checking decryption policy...`);
      this.verifyDecryptionPolicy(encryptedPackage.metadata.policy, policy);

      // 3. Decrypt the module source
      console.log(`🔓 Step 3: Decrypting module source...`);
      const decryptedModule = await this.encryption.decryptModule(encryptedPackage, moduleId, policy);

      // 4. Verify module is self-contained (codesigned verification)
      console.log(`🔍 Step 4: Verifying self-containment...`);
      const verification = this.verifier.verifySudokuModule(decryptedModule.source);

      if (!verification.isContained) {
        throw new Error(
          `Module verification failed:\n` +
          verification.violations.map(v => `  - ${v}`).join('\n')
        );
      }

      // 5. Load and cache the verified module
      console.log(`⚡ Step 5: Loading verified module...`);
      const loadedModule = this.loadFromSource(decryptedModule.source, moduleId);

      // 6. Perform runtime verification
      console.log(`🧪 Step 6: Runtime verification...`);
      this.performRuntimeVerification(loadedModule);

      // Cache for future use
      this.loadedModules.set(moduleId, {
        module: loadedModule,
        metadata: decryptedModule.metadata,
        verification,
        loadedAt: new Date().toISOString()
      });

      console.log(`✅ Semi-proprietary module loaded successfully`);
      this.logLoadingSuccess(moduleId, verification);

      return loadedModule;

    } catch (error) {
      console.error(`❌ Semi-proprietary module loading failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Publish a module to the bulletin board (for module authors)
   */
  async publishModule(moduleSource, moduleId, policy = {}) {
    console.log(`📤 Publishing semi-proprietary module: ${moduleId}`);

    try {
      // 1. Verify the module is self-contained before publishing
      console.log(`🔍 Pre-publication verification...`);
      const verification = this.verifier.verifySudokuModule(moduleSource);

      if (!verification.isContained) {
        throw new Error(
          `Cannot publish non-self-contained module:\n` +
          verification.violations.map(v => `  - ${v}`).join('\n')
        );
      }

      // 2. Encrypt the module
      console.log(`🔐 Encrypting module...`);
      const encryptedPackage = await this.encryption.encryptModule(moduleSource, moduleId, policy);

      // 3. Publish to bulletin board
      console.log(`📢 Publishing to bulletin board...`);
      const bulletinEntry = this.encryption.publishToBulletinBoard(encryptedPackage, moduleId);

      console.log(`✅ Module published successfully`);
      console.log(`   Module ID: ${moduleId}`);
      console.log(`   Policy: ${JSON.stringify(policy)}`);
      console.log(`   Bulletin board entry: ${bulletinEntry.storageHash.substring(0, 16)}...`);

      return bulletinEntry;

    } catch (error) {
      console.error(`❌ Module publication failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify that the current enclave is authorized to decrypt this module
   */
  verifyDecryptionPolicy(modulePolicy, requestPolicy) {
    // In real implementation, this would check:
    // - On-chain smart contract conditions
    // - Payment/stake requirements
    // - Time-based conditions
    // - Enclave attestation requirements

    console.log(`🔑 Verifying decryption policy...`);
    console.log(`   Module policy: ${JSON.stringify(modulePolicy)}`);
    console.log(`   Request policy: ${JSON.stringify(requestPolicy)}`);

    // Mock policy check - in real implementation, this would be more sophisticated
    if (modulePolicy.requiresPayment && !requestPolicy.paymentProof) {
      throw new Error('Payment required for module decryption');
    }

    if (modulePolicy.validUntil && new Date() > new Date(modulePolicy.validUntil)) {
      throw new Error('Module access has expired');
    }

    console.log(`✅ Decryption policy verified`);
  }

  /**
   * Load module from decrypted source code
   */
  loadFromSource(source, moduleId) {
    const tempPath = `/tmp/semiprop-${moduleId}-${Date.now()}.js`;

    try {
      fs.writeFileSync(tempPath, source);
      delete require.cache[require.resolve(tempPath)];
      const loadedModule = require(tempPath);
      fs.unlinkSync(tempPath);
      return loadedModule;
    } catch (error) {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw new Error(`Failed to load module from source: ${error.message}`);
    }
  }

  /**
   * Runtime verification to ensure the module actually works
   */
  performRuntimeVerification(module) {
    console.log(`🧪 Performing runtime verification...`);

    const testPuzzle = [
      [1, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    try {
      const result = module.solveSudoku(testPuzzle);

      if (!result || !result.solution) {
        throw new Error('Module did not return expected solution format');
      }

      if (result.solution[0][0] !== 1) {
        throw new Error('Module modified fixed puzzle values');
      }

      console.log(`✅ Runtime verification passed`);

    } catch (error) {
      throw new Error(`Runtime verification failed: ${error.message}`);
    }
  }

  /**
   * Log successful loading details
   */
  logLoadingSuccess(moduleId, verification) {
    console.log(`📊 Module loading summary:`);
    console.log(`   Module ID: ${moduleId}`);
    console.log(`   Algorithmic structure: ${JSON.stringify(verification.algorithmStructure)}`);
    console.log(`   Complexity: ${JSON.stringify(verification.complexity)}`);
    console.log(`   Exports: [${Array.from(verification.exports).join(', ')}]`);
    console.log(`   Self-contained: ✅`);
    console.log(`   Decryption authorized: ✅`);
    console.log(`   Runtime verified: ✅`);
  }

  /**
   * Get information about loaded modules
   */
  getLoadedModules() {
    return Array.from(this.loadedModules.entries()).map(([id, info]) => ({
      moduleId: id,
      loadedAt: info.loadedAt,
      isContained: info.verification.isContained,
      exports: Array.from(info.verification.exports)
    }));
  }
}

module.exports = { SemiProprietaryModuleLoader };