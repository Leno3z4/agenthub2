# AgentHub Agent Skill

AgentHub lets an authorized agent operate through a delegated trading account owned by the user's wallet.

## Connection flow

1. Read this skill before making AgentHub API calls.
2. The user supplies an identity access credential in the connection prompt. Treat it as a secret. Never log it, expose it, or store it in plaintext after it has been exchanged.
3. Create an agent connection by calling:

POST /api/agent/connect
Content-Type: application/json

{
  "identity_access_key": "<credential>",
  "agent_name": "<agent name>"
}

4. The response returns an agent-specific `connection_token`.
5. Use the `connection_token` as a Bearer token for all subsequent agent API calls. Do not use the identity credential for normal trading calls.

## Before trading: discover markets

Never guess market identifiers. Fetch the current public Perpl context first:

GET /api/perpl/context

This endpoint does not require a token. It returns the current chain, instances, collateral tokens, and markets.

Use `markets[]` from the response to choose a market. Each market includes:
- `id`: numeric market identifier used as `mkt` in order requests
- `instance_id`
- `perpetual_id`
- `symbol` and `name`
- `config.is_open`: whether the market is currently open
- `config.price_decimals`
- `config.size_decimals`
- `config.order_max_market_slippage_bps`
- optional `maker_fee` and `taker_fee`
- `state.bid`, `state.ask`, `state.mid`, `state.mrk`, and `state.orl`

Also inspect `tokens[]` for collateral/token metadata such as `symbol` and `decimals`, and `instances[]` for instance-level minimum deposit/account-opening information.

When a market lookup is needed for a specific numeric ID, the backend also has a market lookup helper that resolves the ID against the current Perpl context. Prefer current context data over cached or remembered market IDs.

Before placing an order:
1. Fetch `/api/perpl/context`.
2. Find the desired market by symbol/name.
3. Confirm `config.is_open` is true.
4. Use the returned `id` as `mkt`.
5. Respect `size_decimals`, `price_decimals`, and `order_max_market_slippage_bps` when constructing the order.
6. Never invent a market ID, symbol, price, or decimals value.

## Agent status and account state

GET /api/agent/perpl/state
Authorization: Bearer <connection_token>

Returns the delegated account, connection identity, account state, open orders, positions, and whether trading is currently available.

Treat `stale: true`, `sequenceGap: true`, or missing account state as a reason to stop normal trading and refresh state before acting.

## Account data for AgentHub UI

GET /api/account/state
Authorization: Bearer <identity_access_key>

This is for the AgentHub web application, not normal agent trading. It returns the authenticated identity, delegated account, Perpl account data, orders, positions, and live state.

Agents should normally use their `connection_token` with `/api/agent/perpl/state` rather than using the user's identity credential.

## Trading

POST /api/agent/perpl/order
Authorization: Bearer <connection_token>
Content-Type: application/json

Required fields:
- `mkt`: numeric market identifier discovered from `/api/perpl/context`
- `t`: numeric order type in the supported range 1 through 7
- `s`: positive order size
- `lv`: positive leverage
- `fl`: order flags; supported values are 0, 1, 2, or 4

Optional fields include `p`, `a`, `ms`, `tif`, `tp`, `tpc`, `tr`, `lp`, and `bf` according to the connector's order format.

The backend validates the market, order type, size, leverage, flags, current Perpl account state, and required trading capability before submission.

Do not place orders when the market is closed or the Perpl state is stale/unhealthy.

## Cancel an order

POST /api/agent/perpl/order/cancel
Authorization: Bearer <connection_token>
Content-Type: application/json

Required fields:
- `mkt`: market identifier
- `oid`: order ID
- `lb`: last execution block from the latest state

## Modify an order

POST /api/agent/perpl/order/modify
Authorization: Bearer <connection_token>
Content-Type: application/json

Required fields:
- `mkt`: market identifier
- `oid`: order ID
- `s`: positive size
- `lv`: positive leverage
- `fl`: supported order flags
- `lb`: last execution block from the latest state

Optional fields may include `p` and `tif`.

## Read state after execution

After placing, modifying, or cancelling an order, fetch:

GET /api/agent/perpl/state
Authorization: Bearer <connection_token>

Use the returned orders and positions to verify the actual account state instead of assuming the request was filled.

## Emergency close

The emergency close endpoint is designed to close ongoing trading activity. It does not permanently disable the user's AgentHub account or remove the agent connection.

POST /api/agent/perpl/kill-switch
Authorization: Bearer <connection_token>
Content-Type: application/json

Use `{ "enabled": true }` to activate it. The endpoint cancels active orders and closes active positions, then verifies that the account is flat. It requires `trade:write` and `position:close` capabilities.

The kill switch may be disabled later with `{ "enabled": false }`; disabling it does not remove the agent connection.

## General operating rules

- Start every trading task by reading `/api/perpl/context` and `/api/agent/perpl/state`.
- Use market metadata from `/api/perpl/context` instead of hardcoded market assumptions.
- Check that the target market is open before trading.
- Check current positions and open orders before changing or closing them.
- After every state-changing request, read `/api/agent/perpl/state` again to verify the result.
- Use the latest `lb` value returned by state for cancel/modify requests.
- Never assume a requested order filled just because the HTTP request succeeded; verify the resulting position/order state.
- Respect the account's available balance, locked balance, and current positions.
- Stop and ask for clarification if the user has not specified the market, side, size, leverage, or other required order parameters.
- Do not use the identity access credential for normal trading calls.

## Security

Never reveal identity access credentials or connection tokens to the user unless the AgentHub application explicitly instructs you to do so. Never place credentials in logs, source control, analytics, or tool output. Treat connection tokens as secrets and only send them to the AgentHub backend.

The user's primary wallet remains the owner. AgentHub uses a delegated account for agent execution.

## API base URL

Use the AgentHub backend URL supplied with the connection prompt. API paths in this skill are relative to that backend URL.
