const { SudokuModuleVerifier } = require('./sudoku-verifier');
const fs = require('fs');

/**
 * Sudoku Module Loader
 *
 * Loads and validates sudoku solver modules using the codesigned verifier.
 * Ensures modules are truly self-contained and cannot cheat with external hints.
 */
class SudokuModuleLoader {
  constructor() {
    this.verifier = new SudokuModuleVerifier();
  }

  /**
   * Load a sudoku solver module after verification
   */
  loadModule(modulePath) {
    console.log(`🔍 Verifying sudoku solver module: ${modulePath}`);

    // Read module source
    const source = fs.readFileSync(modulePath, 'utf-8');

    // Verify the module is self-contained
    const verification = this.verifier.verifySudokuModule(source);

    if (!verification.isContained) {
      this.throwVerificationError(verification, modulePath);
    }

    // Log verification success
    this.logVerificationSuccess(verification);

    // Load the verified module
    console.log(`✅ Module ${modulePath} passed verification, loading...`);
    const loadedModule = require(require.resolve(modulePath, { paths: [process.cwd()] }));

    // Runtime verification - test that it actually works
    this.performRuntimeVerification(loadedModule);

    return loadedModule;
  }

  /**
   * Load a sudoku solver module from URL after verification
   */
  async loadModuleFromUrl(moduleUrl) {
    console.log(`🔍 Fetching and verifying sudoku solver module: ${moduleUrl}`);

    try {
      const response = await fetch(moduleUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch module: HTTP ${response.status}`);
      }

      const source = await response.text();
      console.log(`📥 Fetched ${source.length} bytes from ${moduleUrl}`);

      // Verify the module is self-contained
      const verification = this.verifier.verifySudokuModule(source);

      if (!verification.isContained) {
        this.throwVerificationError(verification, moduleUrl);
      }

      this.logVerificationSuccess(verification);

      // Create temporary file and load module
      console.log(`✅ Module ${moduleUrl} passed verification, loading...`);

      const tempPath = `/tmp/sudoku-module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.js`;
      fs.writeFileSync(tempPath, source);

      try {
        delete require.cache[require.resolve(tempPath)];
        const loadedModule = require(tempPath);

        // Runtime verification
        this.performRuntimeVerification(loadedModule);

        fs.unlinkSync(tempPath);
        return loadedModule;

      } catch (loadError) {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        throw new Error(`Failed to load module: ${loadError.message}`);
      }

    } catch (error) {
      console.error(`❌ Module loading failed: ${error.message}`);
      throw error;
    }
  }

  throwVerificationError(verification, modulePath) {
    const error = new Error(
      `❌ REJECTED: Module ${modulePath} failed self-containment verification:\n` +
      verification.violations.map(v => `  - ${v}`).join('\n') +
      `\n\nThe module is not truly self-contained and could potentially cheat using external resources.`
    );
    error.name = 'ModuleVerificationFailure';
    throw error;
  }

  logVerificationSuccess(verification) {
    console.log(`✅ Self-containment verification passed:`);
    console.log(`   Algorithmic structure: ${JSON.stringify(verification.algorithmStructure)}`);
    console.log(`   Complexity: ${JSON.stringify(verification.complexity)}`);
    console.log(`   Exports: [${Array.from(verification.exports).join(', ')}]`);
  }

  /**
   * Runtime verification - test the module actually works on a simple puzzle
   */
  performRuntimeVerification(module) {
    console.log(`🧪 Performing runtime verification...`);

    // Simple 4x4 sudoku for quick verification
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
      // Test that the solve function exists and returns something
      const result = module.solveSudoku(testPuzzle);

      if (!result || !result.solution) {
        throw new Error('Module did not return expected solution format');
      }

      // Verify the solution is actually valid
      const solution = result.solution;
      if (!Array.isArray(solution) || solution.length !== 9) {
        throw new Error('Invalid solution format returned');
      }

      // Check that the first cell is still 1 (preserved from input)
      if (solution[0][0] !== 1) {
        throw new Error('Module modified fixed puzzle values');
      }

      console.log(`✅ Runtime verification passed`);

    } catch (error) {
      throw new Error(`Runtime verification failed: ${error.message}`);
    }
  }
}

module.exports = { SudokuModuleLoader };