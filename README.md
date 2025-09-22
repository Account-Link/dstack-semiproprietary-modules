# Semi-Proprietary Modules for DStack

A novel approach to encrypted module distribution with self-containment verification.

## Concept

**Semi-proprietary modules** extend the classic "contingent payment" ZK proof pattern:

1. **Authors** encrypt modules and publish to public bulletin board
2. **Enclaves** decrypt according to on-chain policy (no author needed)
3. **Sudoku-specific verifier** proves modules are truly self-contained
4. **No cheating** with external hints or pre-computed solutions

## Quick Start

```bash
# Install dependencies
npm install

# Publish a module to local bulletin board
node scripts/publish-module.js private_module/sudoku-solver-selfcontained.js sudoku-solver-v1

# Test the system
node test/test-semiprop-system.js

# Run enclave service
node enclave/semiprop-service.js
```

## GitHub Gist Bulletin Board

Use GitHub Gists as a distributed bulletin board for encrypted modules:

```bash
# 1. Get GitHub token with gist scope from https://github.com/settings/tokens
export GITHUB_TOKEN="your_token_here"

# 2. Encrypt and publish module
node scripts/encrypt-module.js solver.js my-solver --public-key ./public-keys/my-solver.json
node scripts/publish-module-gist.js solver.js my-solver

# 3. Use the returned raw gist URL in your enclave
```

The enclave loads from the raw gist URL with zero GitHub dependencies.

## Running Tests

### Local Tests
```bash
# Run all tests locally
npm test                              # Service functionality tests
npm run test-module                   # Module loading and security tests
node test/test-sudoku-verification.js # Sudoku-specific verification tests
node test/test-semiprop-system.js     # Complete semi-proprietary system tests
```

### Docker Tests
```bash
# Setup: Make bulletin board writable for Docker
chmod 777 ./bulletin_board

# Run tests in Docker
docker compose run --rm semiprop-enclave npm test
docker compose run --rm semiprop-enclave npm run test-module
docker compose run --rm semiprop-enclave node test/test-sudoku-verification.js
docker compose run --rm semiprop-enclave node test/test-semiprop-system.js
```

## Directory Structure

- `private_module/` - Author's private solver code
- `enclave/` - TEE code (verifier + service + encryption)
- `scripts/` - Module publishing and deployment utilities
- `test/` - System verification tests
- `bulletin_board/` - Public encrypted module storage

## Docker

```bash
# Run complete system
docker compose up
```

## Security Considerations

### TEE Security

- Modules encrypted with TEE-derived keys
- Attestation proves enclave integrity
- Hardware isolation prevents key extraction
- Signature chains prove authorization

### Policy Enforcement

- Payment policies enforced via attestation
- Time-based expiration checked cryptographically
- Self-containment verified via sudoku-specific analysis
- No external dependencies allowed in modules

### Audit Trail

- All key derivations logged with paths
- Module access attempts tracked
- Policy violations recorded
- Signature chains provide proof of legitimacy