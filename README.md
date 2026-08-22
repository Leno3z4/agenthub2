# Alias — Monad / Perpl

Separate Monad implementation of Alias. This repo does not modify the existing Hyperliquid AgentHub.

## Architecture

```text
User wallet (owner)
        |
        v
InvAIriant DelegatedAccount
        |
        +---- AUSD / collateral
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
- Perpl collateral: AUSD `0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a`
- InvAIriant Factory: `0xb54B83513519Ec64e579F8F1CDdeaEF1CF4BB71b`
- InvAIriant Implementation: `0x0CBBaB6F3f5915EBe3054Af76ef7e5c638AADa2e`

## Perpl integration

Implemented:

- Monad/Perpl deployment verification
- Perpl public context/market client
- Public market-data WebSocket
- Authenticated Perpl trading WebSocket
- API-key Ed25519 key generation
- Perpl API-key enrollment payload flow
- Wallet-signature + Ed25519 proof-of-possession enrollment
- Delegated-account target-profile support
- Perpl order request types and order submission
- Perpl market subscriptions
- Separate agent operator key support
- Existing InvAIriant delegated-account integration

### Trading flow

```text
Connect owner wallet
        |
        v
Create/configure delegated account
        |
        v
Generate operator key
        |
        v
Enroll Perpl trade API key
        |
        v
Perpl trading WebSocket
        |
        v
OrderRequest (mt: 22)
        |
        v
Perpl Exchange -> Monad
```

API keys are trade-scoped and cannot withdraw or transfer funds out. The user signs the one-time API-key enrollment payload; the Ed25519 private key remains with the integration/agent and must be stored securely.

## Development

```bash
npm install
npm run build
npm run dev
```

Set `MONAD_RPC_URL`, `PERPL_API_URL`, or `PERPL_WS_URL` only when using custom endpoints.
