-- AgentHub persistent security/data model.
-- Never store raw access keys, agent credentials, Perpl API secrets, or private keys.

CREATE TABLE IF NOT EXISTS identities (
  id TEXT PRIMARY KEY,
  owner_address TEXT NOT NULL UNIQUE,
  delegated_account TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  kill_switch_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_keys (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT 'Access key',
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS access_keys_identity_idx ON access_keys(identity_id);
CREATE INDEX IF NOT EXISTS access_keys_active_idx ON access_keys(identity_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agents_identity_idx ON agents(identity_id);

CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS connections_identity_idx ON connections(identity_id, status);
CREATE INDEX IF NOT EXISTS connections_agent_idx ON connections(agent_id, status);

CREATE TABLE IF NOT EXISTS agent_credentials (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  identity_id TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['trade:read'],
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credentials_identity_idx ON agent_credentials(identity_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS credentials_agent_idx ON agent_credentials(agent_id, revoked_at, expires_at);

CREATE TABLE IF NOT EXISTS agent_permissions (
  agent_id TEXT PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  trading_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  max_leverage INTEGER NOT NULL DEFAULT 1 CHECK (max_leverage BETWEEN 1 AND 50),
  max_order_notional NUMERIC(38, 18) NOT NULL DEFAULT 0 CHECK (max_order_notional >= 0),
  max_position_notional NUMERIC(38, 18) NOT NULL DEFAULT 0 CHECK (max_position_notional >= 0),
  daily_notional_limit NUMERIC(38, 18) NOT NULL DEFAULT 0 CHECK (daily_notional_limit >= 0),
  allow_withdrawals BOOLEAN NOT NULL DEFAULT FALSE CHECK (allow_withdrawals = FALSE),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  identity_id TEXT REFERENCES identities(id) ON DELETE SET NULL,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  connection_id TEXT REFERENCES connections(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'blocked')),
  request_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_identity_time_idx ON audit_events(identity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_agent_time_idx ON audit_events(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_action_time_idx ON audit_events(action, created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
