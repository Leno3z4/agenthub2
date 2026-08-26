# AgentHub Agent Skill

AgentHub lets an authorized agent operate through a delegated trading account owned by the user's wallet.

## Connection flow

1. Read this skill before making AgentHub API calls.
2. The user supplies an identity access credential in the connection prompt. Treat it as a secret. Never log it, expose it, or store it in plaintext after it has been exchanged.
3. Create an agent connection:

POST /api/agent/connect
Content-Type: application/json

{"identity_access_key":"<credential>","agent_name":"<agent name>"}

4. The response returns an agent-specific `connection_token`.
5. Use the `connection_token` as a Bearer token for subsequent agent API calls.

## Perpl connection for AgentHub users

AgentHub uses the manual Perpl API-key path for users because programmatic enrollment requires a Perpl-whitelisted integration Origin.

The user must create a Perpl API key in the Perpl web UI:

- Mainnet: https://app.perpl.xyz/apikeys
- Testnet: https://testnet.perpl.xyz/apikeys

The key must have **read + trade** scope (`scope_mask: 3`). Perpl also provides the Ed25519 private key when the key is created. The user must provide **both** values to AgentHub:

- `X-API-Key` opaque API token
- Ed25519 private key (32-byte hex)

AgentHub sends both to its backend over HTTPS. The backend verifies the credentials against Perpl using Perpl's signed REST authentication, then encrypts them server-side.

Never ask the user for a wallet seed phrase or wallet private key. The Perpl Ed25519 private key is separate from the user's wallet key.

Perpl API-key authentication requires both the opaque API key and Ed25519 private key. Every authenticated Perpl request is signed with a fresh timestamp, nonce, and canonical request string.

The API key cannot withdraw or transfer funds out of Perpl. It can read and trade according to its scope.

## Market discovery and market conditions

Market discovery is independent of the user's private Perpl trading session. **Do not call `/api/agent/perpl/state` to discover whether markets exist.**

For all available Perpl markets use:

GET /api/agent/perpl/markets
Authorization: Bearer <connection_token>

This returns the live public Perpl context, including all current markets, instances, collateral tokens, and chain metadata.

For one market, use either its numeric market ID or symbol:

GET /api/agent/perpl/markets/<market-id-or-symbol>
Authorization: Bearer <connection_token>

The public unauthenticated equivalent is also available:

GET /api/perpl/context

Never invent market identifiers. Find the market in the returned `markets[]` array.

Each market may provide:
- `id`, `instance_id`, `perpetual_id`
- `symbol`, `name`
- `config.is_open`
- `config.price_decimals`
- `config.size_decimals`
- `config.initial_margin`
- `config.maintenance_margin`
- `config.order_max_market_slippage_bps`
- maker/taker fee fields and fee tiers when Perpl supplies them
- `state.bid`, `state.ask`, `state.mid`, `state.mrk`, `state.orl`, `state.lst`
- `state.dv`, `state.dva`, `state.oi`, `state.tvl`
- `funding.rate`, funding index/payment/sum fields
- any additional fields returned by Perpl must be preserved and treated as live exchange metadata

Use `initial_margin` to derive the protocol's maximum leverage where appropriate: e.g. 1000 = 10% initial margin = 10x maximum leverage. Do not invent a leverage ceiling if Perpl exposes a more specific risk field.

Also inspect `tokens[]` and `instances[]` for collateral decimals, symbols, account-opening minimums, deposit minimums, withdrawal minimums, maximum account equity, and trigger-order limits.

For deeper market data, AgentHub should use the documented Perpl public market-data endpoints when available:

GET /api/agent/perpl/markets/<market-id>/candles/<resolution>/<from>-<to>
GET /api/agent/perpl/markets/<market-id>/funding/<from>-<to>
GET /api/agent/perpl/markets/funding/<from>-<to>

These correspond to Perpl's public OHLCV and funding endpoints and do not require the private trading session.

Do not claim a market is unavailable merely because private account state is unavailable. Public market data and private account state are separate.

## Private Perpl account state

GET /api/agent/perpl/state
Authorization: Bearer <connection_token>

This returns the delegated account, account state, open orders, positions, sequence/head information, and trading availability.

Possible responses include:
- `status: connected`: private state is usable.
- `status: stale`: refresh before trading.
- `status: sequence_gap`: stop trading and refresh/reconnect.
- `status: disconnected`: private state is not currently synchronized.
- HTTP `409` with `code: perpl_enrollment_required`: Perpl credentials have not been connected to AgentHub yet. This is different from market availability.
- HTTP `409` with `code: perpl_state_unavailable`: the private Perpl session failed to initialize or synchronize. Do not assume the market is unavailable.

The web application's `/api/account/state` endpoint is for the AgentHub UI and is not the normal agent endpoint.

## Trading

POST /api/agent/perpl/order
Authorization: Bearer <connection_token>
Content-Type: application/json

Required fields:
- `mkt`: numeric market identifier from live market discovery
- `t`: supported order type 1 through 7
- `s`: positive order size
- `lv`: positive leverage
- `fl`: supported order flags 0, 1, 2, or 4

Optional fields may include `p`, `a`, `ms`, `tif`, `tp`, `tpc`, `tr`, `lp`, and `bf` according to the connector's order format.

Before placing an order:
1. Fetch `/api/agent/perpl/markets`.
2. Find the requested market by symbol/name.
3. Confirm `config.is_open` is true.
4. Use its numeric `id` as `mkt`.
5. Fetch `/api/agent/perpl/state` and confirm private state is connected and fresh.
6. Check balance, open orders, and positions.
7. Respect market decimals, margin/leverage constraints, slippage limits, fees, funding, and any live risk metadata returned by Perpl.

## Cancel an order

POST /api/agent/perpl/order/cancel
Authorization: Bearer <connection_token>
Content-Type: application/json

Required fields: `mkt`, `oid`, and the latest `lb` from private state.

## Modify an order

POST /api/agent/perpl/order/modify
Authorization: Bearer <connection_token>
Content-Type: application/json

Required fields: `mkt`, `oid`, `s`, `lv`, `fl`, and the latest `lb` from private state. Optional fields may include `p` and `tif`.

## Verify execution

After every order, cancel, or modification, fetch `/api/agent/perpl/state` again. Never assume an order filled because the HTTP request succeeded.

## Emergency close

POST /api/agent/perpl/kill-switch
Authorization: Bearer <connection_token>
Content-Type: application/json

Use `{ "enabled": true }` to activate the emergency action. It cancels active orders and closes active positions, then verifies the account is flat. It requires `trade:write` and `position:close`.

## Operating rules

- Read this skill before operating.
- Use live market discovery instead of hardcoded market IDs or prices.
- Public market discovery does not depend on private Perpl state.
- Never report all markets as unavailable because the private account session is unavailable.
- Do not trade a closed market.
- Do not trade when private state is stale or has a sequence gap.
- Use the latest `lb` for cancel/modify.
- Verify every state-changing operation through fresh private state.
- Respect available and locked balance and current positions.
- If the user has not specified the market, side, size, leverage, or other required parameters, ask for the missing information.

## Security

Never reveal identity access credentials or connection tokens. Never put credentials in logs, source control, analytics, or user-visible output. Send connection tokens only to the AgentHub backend.

Never ask for or accept a wallet seed phrase/private key. Perpl API credentials are distinct and must only be sent over HTTPS to AgentHub's backend.

The user's primary wallet remains the owner. AgentHub uses a delegated account for agent execution.

## API base URL

Use the AgentHub backend URL supplied with the connection prompt. All relative paths above use that backend URL.
