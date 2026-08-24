export interface ConnectorDefinition {
  id: string;
  name: string;
  capabilities: readonly string[];
}

const connectors = new Map<string, ConnectorDefinition>();

export function registerConnector(definition: ConnectorDefinition): void {
  if (!/^[a-z0-9][a-z0-9_-]{1,31}$/.test(definition.id)) throw new Error("Invalid connector id");
  if (connectors.has(definition.id)) throw new Error("Connector already registered");
  connectors.set(definition.id, { ...definition, capabilities: Object.freeze([...definition.capabilities]) });
}

export function getConnector(id: string): ConnectorDefinition | undefined {
  return connectors.get(id);
}

export function listConnectors(): ConnectorDefinition[] {
  return [...connectors.values()].map((connector) => ({ ...connector, capabilities: [...connector.capabilities] }));
}

export function requireConnector(id: string): ConnectorDefinition {
  const connector = getConnector(id);
  if (!connector) throw new Error("Connector not found");
  return connector;
}

registerConnector({ id: "perpl", name: "Perpl", capabilities: ["trading", "positions", "orders"] });
registerConnector({ id: "memecoin", name: "Memecoin Trading", capabilities: ["trading"] });
