# Biatec Algorand Scan

Biatec Algorand Scan is a Vue 3 + TypeScript + Vite frontend application that provides a professional Algorand blockchain explorer with real-time blocks, transactions, and AMM trades.

## Features

- **Transaction Search with Block ID**: Enhanced transaction lookup with fallback to block-level search
- **Inner Transaction Support**: Recursively searches through inner transactions with proper ID calculation
- **Real-time Updates**: SignalR integration for live blockchain data
- **Multi-language Support**: Internationalization with i18n

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Available environment variables:

- `VITE_ALGORAND_INDEXER_URL`: Algorand indexer endpoint (default: https://mainnet-idx.voi.nodely.dev)
- `VITE_ALGORAND_ALGOD_URL`: Algorand algod endpoint (default: https://algorand-algod-public.de-4.biatec.io)
- `VITE_ENABLE_VERBOSE_LOGGING`: Enable detailed console logging for transaction search (default: false)

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

### Building for Production

```bash
npm run build
```

### Testing

#### Unit Tests

Run the unit tests that verify transaction ID calculation logic:

```bash
npm test -- --exclude="**/*.integration.test.ts"
```

These tests use mocked data and don't require network access. They verify:
- Transaction reconstruction with genesis parameters
- ID calculation for different transaction types
- Impact of genesis parameters on transaction IDs

#### Integration Tests

Integration tests verify the complete flow against real Algorand mainnet data:

```bash
npm test -- src/services/algorandService.integration.test.ts
```

**Note**: Integration tests require network access to Algorand indexer and will fail in restricted environments. These tests are designed for:
- Local development with internet access
- CI/CD environments with network access enabled
- Staging/production validation

**CI Configuration**: Integration tests should be run in CI only if the environment has network access to Algorand mainnet. Consider:
- Running integration tests as a separate CI job with network access
- Skipping integration tests in restricted environments using `--exclude="**/*.integration.test.ts"`
- Running them periodically (e.g., nightly) rather than on every commit

#### Run All Tests

```bash
npm test
```

## Project Setup and IDE Support

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## Key Implementation Details

### Transaction Search with Block ID

The application includes an enhanced transaction search that can find transactions even when they're not indexed properly:

- Route: `/transaction/:txId/block/:round` (with block ID)
- Route: `/transaction/:txId` (backward compatible)

When searching with a block ID, the system:
1. Attempts indexer lookup first
2. Falls back to block-level search if indexer fails
3. Recursively searches through all inner transactions
4. Properly calculates transaction IDs by filling in genesis parameters

### Inner Transaction ID Calculation

Inner transactions require special handling because they don't have complete data. The implementation:
1. Fills in `genesisHash` and `genesisID` from block header
2. Fills in `group` from parent transaction
3. Recreates the transaction using algosdk
4. Calculates the proper transaction ID

This follows the pattern from [AVMTradeReporter](https://github.com/scholtz/AVMTradeReporter).

## License

[Your License Here]

