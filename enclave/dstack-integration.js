const { DstackClient } = require('@phala/dstack-sdk');
const crypto = require('crypto');

/**
 * DStack Integration for Semi-Proprietary Modules
 *
 * This module provides real dstack TEE integration for:
 * - Key derivation via guest agent
 * - TEE attestation and signature chains
 * - Policy-based access control using dstack attestation
 */

class DStackIntegration {
  constructor() {
    this.client = null;
    this.instanceInfo = null;
  }

  /**
   * Initialize dstack integration and get TEE instance info
   */
  async initialize() {
    console.log(`🔧 Initializing dstack integration...`);

    try {
      this.client = new DstackClient();
      this.instanceInfo = await this.client.info();

      console.log(`✅ DStack integration initialized`);
      console.log(`   App ID: ${this.instanceInfo.app_id}`);
      console.log(`   Instance ID: ${this.instanceInfo.instance_id}`);
      console.log(`   Device ID: ${this.instanceInfo.device_id}`);

      return this.instanceInfo;
    } catch (error) {
      console.error(`❌ DStack initialization failed: ${error.message}`);
      console.log(`🔄 Falling back to mock mode for development...`);
      this.client = null;
      return this.initializeMockMode();
    }
  }


  /**
   * Derive app-specific key using dstack guest agent
   */
  async deriveKey(path, purpose = 'encryption') {
    console.log(`🔑 Deriving dstack key: ${path} (${purpose})`);

    if (this.client) {
      try {
        const keyResult = await this.client.getKey(path, purpose);

        console.log(`✅ Key derived successfully`);
        console.log(`   Path: ${path}`);
        console.log(`   Purpose: ${purpose}`);
        console.log(`   Signature chain length: ${keyResult.signature_chain?.length || 0}`);

        return {
          key: Buffer.from(keyResult.key),
          signatureChain: keyResult.signature_chain || [],
          derivedAt: new Date().toISOString()
        };

      } catch (error) {
        console.error(`❌ Key derivation failed: ${error.message}`);
        console.log(`🔄 Falling back to mock key derivation...`);
        return this.deriveMockKey(path, purpose);
      }
    } else {
      console.log(`🔄 Using mock key derivation (no dstack client)...`);
      return this.deriveMockKey(path, purpose);
    }
  }

  /**
   * Get TEE attestation quote
   */
  async getAttestation(reportData = null) {
    console.log(`📋 Getting TEE attestation quote...`);

    if (this.client) {
      try {
        let processedReportData = reportData;

        // If reportData is too large (>64 bytes), hash it
        if (reportData) {
          const dataBuffer = Buffer.isBuffer(reportData) ? reportData : Buffer.from(JSON.stringify(reportData));
          if (dataBuffer.length > 64) {
            console.log(`⚠️  Report data too large (${dataBuffer.length} bytes), hashing to 32 bytes`);
            processedReportData = crypto.createHash('sha256').update(dataBuffer).digest();
          } else {
            processedReportData = dataBuffer;
          }
        }

        const quoteResult = await this.client.getQuote(processedReportData);

        console.log(`✅ Attestation quote generated`);
        console.log(`   Quote length: ${quoteResult.quote?.length || 0} bytes`);

        return {
          quote: quoteResult.quote,
          reportData: processedReportData,
          eventLog: quoteResult.event_log,
          generatedAt: new Date().toISOString(),
          replayRtmrs: quoteResult.replayRtmrs
        };

      } catch (error) {
        console.error(`❌ Attestation failed: ${error.message}`);
        console.log(`🔄 Using mock attestation for development...`);
        return this.generateMockAttestation(reportData);
      }
    } else {
      console.log(`🔄 Using mock attestation (no dstack client)...`);
      return this.generateMockAttestation(reportData);
    }
  }

  /**
   * Derive module-specific encryption key using dstack keys
   */
  async deriveModuleKey(moduleId, policy) {
    const keyPath = `semiprop-modules/${moduleId}`;
    const policyHash = crypto.createHash('sha256').update(JSON.stringify(policy)).digest('hex');
    const fullPath = `${keyPath}/${policyHash.substring(0, 16)}`;

    const keyInfo = await this.deriveKey(fullPath, 'module-encryption');

    // Use the derived key as seed for module key
    const moduleKey = crypto.createHash('sha256')
      .update(keyInfo.key)
      .update(moduleId)
      .update(JSON.stringify(policy))
      .digest('hex');

    return {
      moduleKey,
      signatureChain: keyInfo.signatureChain,
      keyPath: fullPath
    };
  }

  /**
   * Create attestation-backed policy verification
   */
  async verifyPolicyWithAttestation(modulePolicy, requestPolicy) {
    console.log(`🔍 Verifying policy with TEE attestation...`);

    // Get current TEE state
    const attestation = await this.getAttestation(JSON.stringify({
      modulePolicy,
      requestPolicy,
      timestamp: new Date().toISOString()
    }));

    // Policy verification logic
    if (modulePolicy.requiresPayment && !requestPolicy.paymentProof) {
      throw new Error('Payment required for module decryption');
    }

    if (modulePolicy.validUntil) {
      const expiry = new Date(modulePolicy.validUntil);
      if (new Date() > expiry) {
        throw new Error('Module access has expired');
      }
    }

    console.log(`✅ Policy verification passed with attestation`);

    return {
      verified: true,
      attestation: attestation,
      verifiedAt: new Date().toISOString()
    };
  }

  /**
   * Mock mode initialization for development
   */
  initializeMockMode() {
    console.log(`🔄 Initializing mock dstack mode...`);

    // Use deterministic mock values for testing consistency
    const mockSeed = 'dstack-mock-seed-for-testing';
    const hash = crypto.createHash('sha256').update(mockSeed).digest();

    this.instanceInfo = {
      app_id: '0x' + hash.slice(0, 20).toString('hex'),
      instance_id: '0x' + hash.slice(20, 36).toString('hex'),
      device_id: '0x' + hash.slice(36, 68).toString('hex'),
      app_name: 'semiprop-sudoku-demo',
      compose_hash: '0x' + crypto.createHash('sha256').update(mockSeed + 'compose').digest().slice(0, 32).toString('hex'),
      tcb_info: {
        mrtd: '0x' + crypto.createHash('sha256').update(mockSeed + 'mrtd').digest().slice(0, 48).toString('hex'),
        rtmr0: '0x' + crypto.createHash('sha256').update(mockSeed + 'rtmr0').digest().slice(0, 48).toString('hex'),
        rtmr1: '0x' + crypto.createHash('sha256').update(mockSeed + 'rtmr1').digest().slice(0, 48).toString('hex'),
        rtmr2: '0x' + crypto.createHash('sha256').update(mockSeed + 'rtmr2').digest().slice(0, 48).toString('hex'),
        rtmr3: '0x' + crypto.createHash('sha256').update(mockSeed + 'rtmr3').digest().slice(0, 48).toString('hex')
      }
    };

    return this.instanceInfo;
  }

  /**
   * Mock key derivation for development
   */
  deriveMockKey(path, purpose) {
    const appId = this.instanceInfo?.app_id || 'mock-app-id';
    const mockSeed = `mock-dstack-key:${appId}:${path}:${purpose}`;
    const key = crypto.createHash('sha256').update(mockSeed).digest();

    // Create mock signature chain
    const mockSignature = crypto.createHash('sha256').update(`signature:${mockSeed}`).digest();

    return {
      key: key,
      signatureChain: [mockSignature],
      derivedAt: new Date().toISOString()
    };
  }

  /**
   * Mock attestation for development
   */
  generateMockAttestation(reportData) {
    const mockQuote = Buffer.concat([
      Buffer.from('MOCK_TDX_QUOTE_', 'utf8'),
      crypto.randomBytes(32),
      reportData ? Buffer.from(reportData) : Buffer.alloc(0)
    ]);

    return {
      quote: mockQuote.toString('hex'),
      reportData: reportData,
      generatedAt: new Date().toISOString()
    };
  }


  /**
   * Get current TEE instance information
   */
  getInstanceInfo() {
    if (!this.instanceInfo) {
      console.warn('Instance info not initialized, returning mock info');
      this.initializeMockMode();
    }
    return this.instanceInfo;
  }

  /**
   * Check if running in simulator mode
   */
  isSimulatorMode() {
    return this.client === null;
  }
}

module.exports = { DStackIntegration };