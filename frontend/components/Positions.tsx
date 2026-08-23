export function Positions() {
  return (
    <section className="dashboard-panel">
      <div className="panel-header">
        <div>
          <div className="panel-label">EXECUTION</div>
          <h2>Open positions</h2>
        </div>

        <span className="position-count">0</span>
      </div>

      <div className="empty-state">
        <div className="empty-mark">—</div>
        <strong>No open positions</strong>
        <span>
          Your agent's active onchain positions will appear here.
        </span>
      </div>
    </section>
  );
}
