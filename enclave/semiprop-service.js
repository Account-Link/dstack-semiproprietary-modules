const { SemiProprietaryModuleLoader } = require('./semiprop-module-loader');
const http = require('http');
const url = require('url');

/**
 * Semi-Proprietary Sudoku Service
 *
 * This service demonstrates the full semi-proprietary module system:
 * - Loads encrypted modules from bulletin board
 * - Verifies self-containment via codesigned verifier
 * - Decrypts according to on-chain policy
 * - Serves sudoku solving via secure enclave
 */

class SemiProprietaryService {
  constructor() {
    this.loader = new SemiProprietaryModuleLoader();
    this.server = null;
    this.defaultModuleId = 'sudoku-solver-v1';
  }

  async initialize(moduleId = this.defaultModuleId) {
    console.log('🚀 Initializing Semi-Proprietary Sudoku Service...');

    try {
      // Load the semi-proprietary module from bulletin board
      console.log(`📦 Loading module: ${moduleId}`);
      this.solverModule = await this.loader.loadModuleById(moduleId);

      console.log('✅ Semi-proprietary service initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize service:', error.message);
      throw error;
    }
  }

  createServer(port = 3000) {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(port, () => {
      console.log(`🌐 Semi-Proprietary Sudoku Service running on http://localhost:${port}`);
      console.log('📖 Endpoints:');
      console.log('   POST /solve - Solve a sudoku puzzle using semi-proprietary module');
      console.log('   GET /health - Health check');
      console.log('   GET /module-info - Module information');
      console.log('   GET /loaded-modules - List of loaded modules');
      console.log('   POST /load-module - Load a specific module by ID');
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
      } else if (path === '/loaded-modules' && method === 'GET') {
        this.handleLoadedModules(req, res);
      } else if (path === '/solve' && method === 'POST') {
        await this.handleSolve(req, res);
      } else if (path === '/load-module' && method === 'POST') {
        await this.handleLoadModule(req, res);
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
      service: 'semi-proprietary-sudoku-solver',
      moduleLoaded: !!this.solverModule,
      loadedModules: this.loader.getLoadedModules().length,
      capabilities: ['solve', 'load-module', 'bulletin-board-access'],
      timestamp: new Date().toISOString()
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health, null, 2));
  }

  handleModuleInfo(req, res) {
    if (!this.solverModule) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No solver module loaded' }));
      return;
    }

    const moduleInfo = {
      ...this.solverModule.metadata,
      status: 'loaded',
      type: 'semi-proprietary',
      source: 'bulletin-board',
      verified: true,
      capabilities: ['solve', 'validate']
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(moduleInfo, null, 2));
  }

  handleLoadedModules(req, res) {
    const loadedModules = this.loader.getLoadedModules();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      count: loadedModules.length,
      modules: loadedModules
    }, null, 2));
  }

  async handleSolve(req, res) {
    if (!this.solverModule) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No solver module loaded' }));
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

        // Solve using the semi-proprietary module
        const result = this.solverModule.solveSudoku(puzzle);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          ...result,
          solvedAt: new Date().toISOString(),
          solvedBy: 'semi-proprietary-module',
          moduleSource: 'bulletin-board'
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

  async handleLoadModule(req, res) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { moduleId, policy = {} } = JSON.parse(body);

        if (!moduleId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing moduleId in request body' }));
          return;
        }

        // Load the requested module
        const module = await this.loader.loadModuleById(moduleId, policy);

        // Set as current solver if it's a solver module
        if (module.solveSudoku) {
          this.solverModule = module;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          moduleId,
          loaded: true,
          setCurrent: !!module.solveSudoku,
          metadata: module.metadata || {},
          loadedAt: new Date().toISOString()
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
      availableEndpoints: ['/health', '/module-info', '/loaded-modules', '/solve', '/load-module']
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
      console.log('🛑 Shutting down Semi-Proprietary Service...');
      this.server.close();
    }
  }
}

// Example usage
async function main() {
  const service = new SemiProprietaryService();

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

module.exports = { SemiProprietaryService };