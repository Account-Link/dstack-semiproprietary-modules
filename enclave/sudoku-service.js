const { SudokuModuleLoader } = require('./module-loader');
const http = require('http');
const url = require('url');

class SudokuService {
  constructor() {
    this.loader = new SudokuModuleLoader({
      maxRequiredModules: ['crypto'],
      allowedCryptoUsage: 'builtin-only',
      allowExternalAccess: false
    });

    this.solverModule = null;
    this.server = null;
  }

  async initialize(modulePath = './sudoku-solver.js') {
    console.log('🚀 Initializing Sudoku Service...');

    try {
      // Load the proprietary sudoku solver module
      this.solverModule = this.loader.loadModule(modulePath);
      console.log('✅ Sudoku solver module loaded successfully');
      console.log(`📋 Module metadata:`, this.solverModule.metadata);
    } catch (error) {
      console.error('❌ Failed to load sudoku solver module:', error.message);
      throw error;
    }
  }

  createServer(port = 3000) {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(port, () => {
      console.log(`🌐 Sudoku Service running on http://localhost:${port}`);
      console.log('📖 Endpoints:');
      console.log('   POST /solve - Solve a sudoku puzzle');
      console.log('   GET /health - Health check');
      console.log('   GET /module-info - Module information');
    });

    return this.server;
  }

  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      if (path === '/health' && method === 'GET') {
        this.handleHealth(req, res);
      } else if (path === '/module-info' && method === 'GET') {
        this.handleModuleInfo(req, res);
      } else if (path === '/solve' && method === 'POST') {
        await this.handleSolve(req, res);
      } else {
        this.handleNotFound(req, res);
      }
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  handleHealth(req, res) {
    const health = {
      status: 'healthy',
      service: 'sudoku-solver',
      moduleLoaded: !!this.solverModule,
      timestamp: new Date().toISOString()
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health, null, 2));
  }

  handleModuleInfo(req, res) {
    if (!this.solverModule) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Solver module not loaded' }));
      return;
    }

    const moduleInfo = {
      ...this.solverModule.metadata,
      status: 'loaded',
      capabilities: ['solve', 'validate']
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(moduleInfo, null, 2));
  }

  async handleSolve(req, res) {
    if (!this.solverModule) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Solver module not loaded' }));
      return;
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { puzzle } = JSON.parse(body);

        if (!puzzle) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing puzzle in request body' }));
          return;
        }

        // Validate and solve the puzzle using the proprietary module
        const result = this.solverModule.solveSudoku(puzzle);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          ...result,
          solvedAt: new Date().toISOString()
        }, null, 2));

      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
  }

  handleNotFound(req, res) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Endpoint not found',
      availableEndpoints: ['/health', '/module-info', '/solve']
    }));
  }

  handleError(req, res, error) {
    console.error('🚨 Service error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }));
  }

  async shutdown() {
    if (this.server) {
      console.log('🛑 Shutting down Sudoku Service...');
      this.server.close();
    }
  }
}

// Example usage
async function main() {
  const service = new SudokuService();

  try {
    await service.initialize();
    service.createServer(3000);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await service.shutdown();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start service:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SudokuService };