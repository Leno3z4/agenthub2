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

## Agent status

GET /api/agent/perpl/state
Authorization: Bearer <connection_token>

Returns the delegated account, connection identity, account state, open orders, positions, and whether trading is currently available.

## Trading

POST /api/agent/perpl/order
Authorization: Bearer <connection_token>
Content-Type: application/json

Required fields:
- `mkt`: numeric market identifier
- `t`: numeric order type
- `s`: positive order size
- `lv`: positive leverage
- `fl`: order flags; supported values are 0, 1, 2, or 4

Optional fields include `p`, `a`, `ms`, `tif`, `tp`, `tpc`, `tr`, `lp`, and `bf` according to the connector's order format.

Cancel an order:

POST /api/agent/perpl/order/cancel
Authorization: Bearer <connection_token>
Content-Type: application/json

Required fields:
- `mkt`: market identifier
- `oid`: order ID
- `lb`: last execution block

Modify an order:

POST /api/agent/perpl/order/modify
Authorization: Bearer <connection_token>
Content-Type: application/json

Required fields:
- `mkt`: market identifier
- `oid`: order ID
- `s`: positive size
- `lv`: positive leverage
- `fl`: supported order flags
- `lb`: last execution block

## Emergency close

The emergency close endpoint is designed to close ongoing trading activity. It does not permanently disable the user's AgentHub account or remove the agent connection.

POST /api/agent/perpl/kill-switch
Authorization: Bearer <connection_token>
Content-Type: application/json

Use `{ "enabled": true }` to activate it. The endpoint cancels active orders and closes active positions, then verifies that the account is flat. It requires `trade:write` and `position:close` capabilities.

The kill switch may be disabled later with `{ "enabled": false }`; disabling it does not remove the agent connection.

## Security

Never reveal identity access credentials or connection tokens to the user unless the AgentHub application explicitly instructs you to do so. Never place credentials in logs, source control, analytics, or tool output. Treat connection tokens as secrets and only send them to the AgentHub backend.

The user's primary wallet remains the owner. AgentHub uses a delegated account for agent execution.

## API base URL

Use the AgentHub backend URL supplied with the connection prompt. API paths in this skill are relative to that backend URL.
