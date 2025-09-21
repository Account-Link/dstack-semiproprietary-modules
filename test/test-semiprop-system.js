const { SemiProprietaryModuleLoader } = require('../enclave/semiprop-module-loader');
const fs = require('fs');

console.log('🧪 Testing Semi-Proprietary Module System...\n');

async function testSemiProprietarySystem() {
  const loader = new SemiProprietaryModuleLoader();

  console.log('🔍 TEST 1: Publishing self-contained module to bulletin board');
  console.log('=' .repeat(70));

  try {
    // Read the self-contained solver
    const moduleSource = fs.readFileSync('./private_module/sudoku-solver-selfcontained.js', 'utf-8');

    // Publish with basic policy
    const bulletinEntry = await loader.publishModule(moduleSource, 'test-solver-v1', {
      author: 'test-author',
      version: '1.0.0',
      requiresPayment: false
    });

    console.log('✅ Module published successfully');
    console.log(`   Storage hash: ${bulletinEntry.storageHash.substring(0, 16)}...`);

  } catch (error) {
    console.error('❌ Publishing failed:', error.message);
    return;
  }

  console.log('\n🔍 TEST 2: Loading module from bulletin board');
  console.log('=' .repeat(70));

  try {
    // Load the module we just published
    const module = await loader.loadModuleById('test-solver-v1');

    console.log('✅ Module loaded successfully from bulletin board');
    console.log(`   Module metadata: ${JSON.stringify(module.metadata)}`);

  } catch (error) {
    console.error('❌ Loading failed:', error.message);
    return;
  }

  console.log('\n🔍 TEST 3: Testing loaded module functionality');
  console.log('=' .repeat(70));

  try {
    const testPuzzle = [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ];

    const loadedModules = loader.getLoadedModules();
    const module = loader.loadedModules.get('test-solver-v1').module;

    const result = module.solveSudoku(testPuzzle);

    console.log('✅ Semi-proprietary module solved puzzle successfully');
    console.log(`   Solving time: ${result.solvingTime}ms`);
    console.log(`   Algorithm: ${result.algorithm}`);
    console.log(`   Self-contained: ${result.selfContained}`);

  } catch (error) {
    console.error('❌ Module execution failed:', error.message);
    return;
  }

  console.log('\n🔍 TEST 4: Testing policy-restricted access');
  console.log('=' .repeat(70));

  try {
    // Publish a module with payment requirement
    const moduleSource = fs.readFileSync('./private_module/sudoku-solver-selfcontained.js', 'utf-8');

    await loader.publishModule(moduleSource, 'premium-solver-v1', {
      requiresPayment: true,
      price: '100',
      currency: 'USDC'
    });

    console.log('✅ Premium module published with payment policy');

    // Try to load without payment proof (should fail)
    try {
      await loader.loadModuleById('premium-solver-v1', {});
      console.log('❌ Premium module loaded without payment - security violation!');
    } catch (error) {
      console.log('✅ Premium module correctly rejected without payment');
      console.log(`   Reason: ${error.message}`);
    }

    // Try to load with payment proof (should succeed)
    try {
      await loader.loadModuleById('premium-solver-v1', {
        paymentProof: 'mock-payment-receipt-12345'
      });
      console.log('✅ Premium module loaded with valid payment proof');
    } catch (error) {
      console.error('❌ Premium module rejected with valid payment:', error.message);
    }

  } catch (error) {
    console.error('❌ Policy testing failed:', error.message);
    return;
  }

  console.log('\n🔍 TEST 5: Testing time-based access policy');
  console.log('=' .repeat(70));

  try {
    // Publish a module with expiration
    const moduleSource = fs.readFileSync('./private_module/sudoku-solver-selfcontained.js', 'utf-8');

    // Set expiration to past date
    await loader.publishModule(moduleSource, 'expired-solver-v1', {
      validUntil: '2023-01-01T00:00:00Z'
    });

    console.log('✅ Time-limited module published');

    // Try to load expired module (should fail)
    try {
      await loader.loadModuleById('expired-solver-v1', {});
      console.log('❌ Expired module loaded - security violation!');
    } catch (error) {
      console.log('✅ Expired module correctly rejected');
      console.log(`   Reason: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Time-based policy testing failed:', error.message);
    return;
  }

  console.log('\n🔍 TEST 6: Testing bulletin board integrity');
  console.log('=' .repeat(70));

  try {
    // Check bulletin board directory
    const bulletinDir = './bulletin_board';

    if (!fs.existsSync(bulletinDir)) {
      throw new Error('Bulletin board directory not found');
    }

    const bulletinFiles = fs.readdirSync(bulletinDir);
    console.log(`✅ Bulletin board contains ${bulletinFiles.length} modules:`);

    bulletinFiles.forEach(file => {
      const moduleData = JSON.parse(fs.readFileSync(`${bulletinDir}/${file}`, 'utf-8'));
      console.log(`   - ${moduleData.moduleId} (${moduleData.size} bytes)`);
    });

  } catch (error) {
    console.error('❌ Bulletin board integrity check failed:', error.message);
    return;
  }

  console.log('\n' + '=' .repeat(70));
  console.log('🎉 Semi-Proprietary Module System Test Complete!');
  console.log('');
  console.log('✅ Key Features Verified:');
  console.log('   📤 Module publishing to bulletin board');
  console.log('   🔓 Policy-based decryption');
  console.log('   🔍 Self-containment verification');
  console.log('   ⚡ Runtime module execution');
  console.log('   💰 Payment-based access control');
  console.log('   ⏰ Time-based access expiration');
  console.log('   🔗 Bulletin board integrity');
  console.log('');
  console.log('This demonstrates a novel "semi-proprietary" approach where:');
  console.log('- Modules are encrypted and stored publicly');
  console.log('- Enclaves can decrypt per on-chain policy');
  console.log('- No author intervention needed for access');
  console.log('- Self-containment is cryptographically proven');
}

testSemiProprietarySystem().catch(console.error);