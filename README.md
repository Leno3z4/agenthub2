# Alias Monad / Perpl

Monad-native Alias trading stack for Perpl perpetuals.

## Architecture

- User wallet = owner
- Perpl delegated account = custody and authorization boundary
- Alias operator = trading-only signer
- Perpl = perpetual execution venue
- Monad = settlement

The repo intentionally stays isolated from the existing Alias/Hyperliquid deployment.

## Status

Initial integration scaffold. Perpl contract/SDK bindings will be added after pinning the exact deployed ABI/version.

## Planned flow

Connect wallet -> create delegated account -> configure operator -> deposit USDC -> initialize Perpl account -> trade.
