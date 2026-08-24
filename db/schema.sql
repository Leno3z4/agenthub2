-- AgentHub persistent identity + generic connector model.
-- Never store raw access keys, connector credentials, API secrets, or private keys.

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
  connector TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  capabilities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  external_account_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS connections_identity_idx ON connections(identity_id, status);
CREATE INDEX IF NOT EXISTS connections_agent_idx ON connections(agent_id, status);
CREATE INDEX IF NOT EXISTS connections_connector_idx ON connections(connector, status);

CREATE TABLE IF NOT EXISTS agent_credentials (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  identity_id TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS credentials_identity_idx ON agent_credentials(identity_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS credentials_agent_idx ON agent_credentials(agent_id, revoked_at, expires_at);

CREATE TABLE IF NOT EXISTS connector_secrets (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  connection_id TEXT REFERENCES connections(id) ON DELETE CASCADE,
  connector TEXT NOT NULL,
  secret_type TEXT NOT NULL,
  ciphertext BYTEA NOT NULL,
  iv BYTEA NOT NULL,
  auth_tag BYTEA NOT NULL,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (identity_id, connector, secret_type)
);
CREATE INDEX IF NOT EXISTS connector_secrets_connection_idx ON connector_secrets(connection_id, connector);
CREATE INDEX IF NOT EXISTS connector_secrets_identity_idx ON connector_secrets(identity_id, connector, revoked_at);

CREATE TABLE IF NOT EXISTS perpl_enrollments (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  delegated_account TEXT NOT NULL,
  public_key TEXT NOT NULL,
  encrypted_private_key BYTEA NOT NULL,
  private_key_iv BYTEA NOT NULL,
  private_key_auth_tag BYTEA NOT NULL,
  typed_data JSONB,
  mac TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  processing_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS perpl_enrollments_identity_idx ON perpl_enrollments(identity_id, expires_at);

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
CREATE INDEX IF NOT EXISTS audit_connection_time_idx ON audit_events(connection_id, created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
