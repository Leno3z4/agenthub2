# Alias — Monad / Perpl

Separate Monad implementation of Alias. This repo does not modify the existing Hyperliquid AgentHub.

## Architecture

```text
User wallet (owner)
        |
        v
InvAIriant DelegatedAccount
        |
        +---- USDC / collateral
        |
        +---- Alias operator (hot wallet)
                    |
                    v
              Perpl Exchange
                    |
                    v
                  Monad
```

The owner wallet keeps custody. The operator is only configured for delegated execution and cannot call owner-only withdrawal/configuration functions.

## Monad mainnet

- Chain ID: `143`
- RPC: `https://rpc.monad.xyz`
- Perpl Exchange: `0x34B6552d57a35a1D042CcAe1951BD1C370112a6F`
- InvAIriant Factory: `0xb54B83513519Ec64e579F8F1CDdeaEF1CF4BB71b`
- InvAIriant Implementation: `0x0CBBaB6F3f5915EBe3054Af76ef7e5c638AADa2e`

## Current implementation

Implemented:

- Monad/Perpl deployment verification
- InvAIriant factory ABI
- DelegatedAccount ABI
- Separate agent operator key generation
- Delegated account creation
- Perpl protocol whitelist configuration
- Perpl selector whitelist configuration
- `CAN_TRADE_PERPS` + `CAN_LEVERAGE` operator permissions
- Token whitelist configuration
- Per-token spending and per-transaction limits
- Generic delegated `execute()` calldata wrapper

Not hardcoded yet:

- Perpl order-function ABI/selectors
- Mainnet USDC address
- Agent operator key persistence/encryption

Those stay configurable until verified against Perpl's current deployed exchange interface.

## Development

```bash
npm install
npm run build
npm run dev
```

Set `MONAD_RPC_URL` only if a custom RPC is required.
