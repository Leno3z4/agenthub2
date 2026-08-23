export function AgentStatus() {
  return (
    <section className="status-panel">
      <div className="status-main">
        <div className="status-icon">A</div>

        <div>
          <div className="panel-label">ACTIVE AGENT</div>
          <h2>Trading Agent</h2>
          <span className="status-live">
            <i />
            AUTHORIZED
          </span>
        </div>
      </div>

      <div className="status-data">
        <div>
          <span>DELEGATED ACCOUNT</span>
          <strong>0x••••••••••••</strong>
        </div>

        <div>
          <span>PERMISSIONS</span>
          <strong>TRADE ONLY</strong>
        </div>

        <div>
          <span>NETWORK</span>
          <strong>ONCHAIN</strong>
        </div>
      </div>
    </section>
  );
}
