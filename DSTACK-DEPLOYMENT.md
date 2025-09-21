# DStack Deployment Guide

This guide covers deploying the Semi-Proprietary Modules system to DStack TEE infrastructure.

## Overview

The Semi-Proprietary Modules system demonstrates a novel extension of "contingent payment" ZK proofs for practical encrypted module distribution:

- **Encrypted modules** stored on public bulletin board
- **Policy-based decryption** via DStack TEE attestation
- **Self-containment verification** prevents external hints/cheating
- **No author intervention** needed for authorized access

## Prerequisites

### 1. Install Phala CLI

```bash
npm install -g @phala/cli
```

### 2. Configure API Access

Get your API key from [Phala Cloud](https://cloud.phala.network/):

```bash
export PHALA_CLOUD_API_KEY="your-api-key-here"
```

### 3. Blockchain Configuration

For on-chain KMS, set your RPC and private key:

```bash
export RPC_URL="https://polygon-rpc.com/"
export PRIVATEKEY="0x..." # Your deployment private key
```

## Quick Deployment

### Deploy with Defaults

```bash
node scripts/deploy-to-dstack.js
```

### Preview Deployment

```bash
node scripts/deploy-to-dstack.js --dry-run
```

### Custom Configuration

```bash
node scripts/deploy-to-dstack.js \
  --name semiprop-demo \
  --node-id 15 \
  --kms-id kms-prod-cluster
```

## Deployment Configuration

### Docker Compose for DStack

The `docker-compose-dstack.yml` is configured for TEE deployment:

- **TEE Integration**: Mounts `/var/run/dstack.sock` for guest agent
- **Security**: Read-only filesystem with tmpfs for cache
- **Resources**: 1GB memory, 2 CPU cores
- **Health Checks**: Monitor service availability
- **Persistent Storage**: Volume for bulletin board data

### DStack Features Used

- **Key Derivation**: Uses dstack guest agent for app-specific keys
- **Attestation**: TDX quotes for policy verification
- **Signature Chains**: Cryptographic proof of TEE authorization
- **Instance Info**: App ID, device ID, measurements for verification

## Testing the Deployment

### 1. Check Deployment Status

```bash
phala cvms list
```

### 2. Test API Endpoints

Once deployed, test the service:

```bash
# Health check
curl https://your-cvm-url.phala.network/health

# Get instance info (shows DStack integration)
curl https://your-cvm-url.phala.network/info

# Solve a sudoku puzzle
curl -X POST https://your-cvm-url.phala.network/solve \
  -H "Content-Type: application/json" \
  -d '{"puzzle": [[5,3,0,0,7,0,0,0,0], ...]}'
```

### 3. Verify Semi-Proprietary Features

```bash
# List available modules on bulletin board
curl https://your-cvm-url.phala.network/modules

# Load a specific module (requires policy compliance)
curl -X POST https://your-cvm-url.phala.network/load-module \
  -H "Content-Type: application/json" \
  -d '{"moduleId": "sudoku-solver-v1", "policy": {}}'
```

## Development vs Production

### Development (Simulator Mode)

```bash
# Set environment variable for simulator
export DSTACK_SIMULATOR_ENDPOINT="http://localhost:8080"

# Or run with docker-compose locally
docker-compose up
```

### Production (TEE Mode)

Production deployment automatically uses:
- Real DStack guest agent via Unix socket
- TDX attestation quotes
- Hardware-derived keys
- TEE security boundaries

## Monitoring and Debugging

### View Logs

```bash
phala cvms logs <cvm-id>
```

### Monitor Health

The health check endpoint reports:
- Service status
- DStack integration status
- Bulletin board availability
- Module verification status

### Debug DStack Integration

Check the logs for DStack integration messages:
- `🔧 Initializing dstack integration...`
- `✅ DStack integration initialized`
- `🔑 Deriving dstack key: ...`
- `📋 Getting TEE attestation quote...`

## Architecture in Production

```
┌─────────────────────────────────────┐
│          Public Internet           │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     Encrypted Modules       │    │
│  │   (Bulletin Board/IPFS)     │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
                   │
                   │ Encrypted Module Retrieval
                   ▼
┌─────────────────────────────────────┐
│         DStack TEE (Intel TDX)      │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     DStack Guest Agent      │    │
│  │   - Key derivation          │    │
│  │   - TDX attestation         │    │
│  │   - Signature chains        │    │
│  └─────────────────────────────┘    │
│                   │                 │
│                   │ Unix Socket     │
│                   ▼                 │
│  ┌─────────────────────────────┐    │
│  │  Semi-Proprietary Service   │    │
│  │   - Module decryption       │    │
│  │   - Policy verification     │    │
│  │   - Self-containment check  │    │
│  │   - Sudoku solving          │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

## Troubleshooting

### Common Issues

1. **API Key**: Ensure `PHALA_CLOUD_API_KEY` is set correctly
2. **Node ID**: Check available nodes with `phala nodes list`
3. **KMS ID**: Verify KMS cluster with `phala kms list`
4. **RPC URL**: Ensure blockchain RPC is accessible
5. **Private Key**: Check key has sufficient balance for deployment

### Getting Help

- Check `phala help deploy` for CLI options
- View [DStack documentation](https://docs.dstack.io/) for TEE details
- Review logs with `phala cvms logs <cvm-id>`
- Test locally first with `docker-compose up`
