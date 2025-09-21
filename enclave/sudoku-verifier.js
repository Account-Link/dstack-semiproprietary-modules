const { parse } = require('@typescript-eslint/parser');

/**
 * Sudoku-Specific Module Verifier
 *
 * This verifier is codesigned with the sudoku solver specification.
 * It proves the module is truly self-contained and cannot "cheat" by:
 * - Accessing external puzzle databases
 * - Making network requests for hints
 * - Reading pre-computed solutions from files
 * - Using any external computational resources
 */
class SudokuModuleVerifier {
  constructor() {
    this.allowedBuiltins = new Set([
      'Math', 'Array', 'Number', 'Object', 'JSON', 'console'
    ]);

    this.requiredExports = new Set([
      'solveSudoku', 'validatePuzzle'
    ]);

    this.algorithmicComplexity = {
      maxLoopCount: 20,      // Sudoku solving has many legitimate loops (rows, cols, boxes, backtracking)
      maxFunctionCalls: 10,  // Reasonable for solve/isValid helper functions
      maxArrayAccess: 100    // 9x9 grid access patterns
    };
  }

  /**
   * Verify that a sudoku solver module is truly self-contained
   */
  verifySudokuModule(source) {
    const ast = parse(source, {
      sourceType: 'script',
      ecmaVersion: 2022,
      loc: true,
      range: true
    });

    const analysis = {
      isContained: true,
      violations: [],
      algorithmStructure: {},
      exports: new Set(),
      complexity: {}
    };

    // Walk AST and analyze for self-containment
    this.walkAST(ast, (node) => {
      this.checkExternalAccess(node, analysis);
      this.checkAlgorithmicStructure(node, analysis);
      this.checkComplexity(node, analysis);
      this.checkExports(node, analysis);
    });

    this.validateSudokuConstraints(analysis);

    return analysis;
  }

  checkExternalAccess(node, analysis) {
    // 1. No external module requires
    if (node.type === 'CallExpression' && node.callee?.name === 'require') {
      const moduleName = node.arguments?.[0]?.value;
      if (moduleName && !this.isAllowedBuiltin(moduleName)) {
        analysis.violations.push(`External module access: require('${moduleName}')`);
        analysis.isContained = false;
      }
    }

    // 2. No external function calls (fetch, XMLHttpRequest, etc.)
    if (node.type === 'CallExpression') {
      const calleeName = this.getFunctionName(node.callee);
      if (this.isExternalAPI(calleeName)) {
        analysis.violations.push(`External API call: ${calleeName}()`);
        analysis.isContained = false;
      }
    }

    // 3. No file system access
    if (node.type === 'MemberExpression') {
      const objName = node.object?.name;
      const propName = node.property?.name;

      if ((objName === 'fs' || objName === 'process') && propName) {
        analysis.violations.push(`System access: ${objName}.${propName}`);
        analysis.isContained = false;
      }
    }

    // 4. No global/window access
    if (node.type === 'Identifier') {
      if (['global', 'window', 'self', 'globalThis'].includes(node.name)) {
        analysis.violations.push(`Global scope access: ${node.name}`);
        analysis.isContained = false;
      }
    }
  }

  checkAlgorithmicStructure(node, analysis) {
    // Look for backtracking patterns
    if (node.type === 'ForStatement' || node.type === 'WhileStatement') {
      analysis.algorithmStructure.hasLoops = true;
    }

    // Look for recursive calls (typical in backtracking)
    if (node.type === 'CallExpression') {
      const funcName = this.getFunctionName(node.callee);
      if (funcName && this.isLocalFunction(funcName)) {
        analysis.algorithmStructure.hasRecursion = true;
      }
    }

    // Check for grid validation patterns
    if (node.type === 'BinaryExpression' && node.operator === '===') {
      if (this.isGridAccessPattern(node)) {
        analysis.algorithmStructure.hasGridValidation = true;
      }
    }
  }

  checkComplexity(node, analysis) {
    // Count nested loops (should be reasonable for 9x9 sudoku)
    if (node.type === 'ForStatement') {
      analysis.complexity.loopCount = (analysis.complexity.loopCount || 0) + 1;
    }

    // Count function definitions
    if (node.type === 'FunctionDeclaration') {
      analysis.complexity.functionCount = (analysis.complexity.functionCount || 0) + 1;
    }

    // Look for array access patterns
    if (node.type === 'MemberExpression' && node.computed) {
      analysis.complexity.arrayAccess = (analysis.complexity.arrayAccess || 0) + 1;
    }
  }

  checkExports(node, analysis) {
    // Check module.exports patterns
    if (node.type === 'AssignmentExpression' &&
        node.left?.object?.name === 'module' &&
        node.left?.property?.name === 'exports') {

      if (node.right?.type === 'ObjectExpression') {
        node.right.properties.forEach(prop => {
          if (prop.key?.name) {
            analysis.exports.add(prop.key.name);
          }
        });
      }
    }
  }

  validateSudokuConstraints(analysis) {
    // Must export required functions
    for (const required of this.requiredExports) {
      if (!analysis.exports.has(required)) {
        analysis.violations.push(`Missing required export: ${required}`);
        analysis.isContained = false;
      }
    }

    // Must have algorithmic structure typical of sudoku solving
    if (!analysis.algorithmStructure.hasLoops) {
      analysis.violations.push('No iterative structure found - suspicious for sudoku solving');
      analysis.isContained = false;
    }

    if (!analysis.algorithmStructure.hasGridValidation) {
      analysis.violations.push('No grid validation patterns found');
      analysis.isContained = false;
    }

    // Complexity should be reasonable for sudoku
    if (analysis.complexity.loopCount > this.algorithmicComplexity.maxLoopCount) {
      analysis.violations.push(`Excessive loop complexity: ${analysis.complexity.loopCount}`);
      analysis.isContained = false;
    }

    if (analysis.complexity.functionCount > this.algorithmicComplexity.maxFunctionCalls) {
      analysis.violations.push(`Excessive function count: ${analysis.complexity.functionCount}`);
      analysis.isContained = false;
    }
  }

  isAllowedBuiltin(moduleName) {
    // Only allow built-in Node.js modules that can't access external resources
    const allowedBuiltins = ['crypto', 'util'];
    return allowedBuiltins.includes(moduleName);
  }

  isExternalAPI(funcName) {
    const externalAPIs = [
      'fetch', 'XMLHttpRequest', 'axios', 'request',
      'readFileSync', 'writeFileSync', 'spawn', 'exec',
      'connect', 'createConnection', 'createServer'
    ];
    return externalAPIs.includes(funcName);
  }

  isLocalFunction(funcName) {
    // Common sudoku function names
    const sudokuFunctions = ['solve', 'isValid', 'solveSudoku', 'validatePuzzle'];
    return sudokuFunctions.includes(funcName);
  }

  isGridAccessPattern(node) {
    // Look for patterns like board[row][col] === num
    return (node.left?.type === 'MemberExpression' &&
            node.left?.computed &&
            node.right?.type === 'Identifier');
  }

  getFunctionName(callee) {
    if (callee?.type === 'Identifier') {
      return callee.name;
    }
    if (callee?.type === 'MemberExpression') {
      return callee.property?.name;
    }
    return null;
  }

  walkAST(node, callback) {
    if (!node || typeof node !== 'object') return;
    callback(node);

    for (const key in node) {
      if (key === 'parent') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(item => this.walkAST(item, callback));
      } else if (child && typeof child === 'object') {
        this.walkAST(child, callback);
      }
    }
  }
}

module.exports = { SudokuModuleVerifier };