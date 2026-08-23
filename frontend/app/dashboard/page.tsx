import Link from "next/link";
import { AgentStatus } from "../../components/AgentStatus";
import { DepositPanel } from "../../components/DepositPanel";
import { Positions } from "../../components/Positions";
import { KillSwitch } from "../../components/KillSwitch";

export default function DashboardPage() {
  return (
    <main className="dashboard">
      <header className="dashboard-nav">
        <Link href="/" className="dashboard-brand">
          <span className="brand-mark">A</span>
          AGENTHUB
        </Link>

        <div className="dashboard-nav-right">
          <span className="network-tag">ONCHAIN</span>
          <span className="wallet-address">0x••••••••</span>
        </div>
      </header>

      <div className="dashboard-container">
        <div className="dashboard-heading">
          <div>
            <div className="eyebrow">CONTROL CENTER / 01</div>
            <h1>Agent dashboard</h1>
            <p>
              Monitor your agent, capital, permissions and onchain
              market execution from one interface.
            </p>
          </div>

          <KillSwitch />
        </div>

        <AgentStatus />

        <section className="dashboard-grid">
          <DepositPanel />
          <Positions />
        </section>

        <section className="markets-panel">
          <div className="panel-label">SUPPORTED MARKETS</div>

          <div className="market-list">
            <div>
              <strong>Onchain Spot</strong>
              <span>ACTIVE</span>
            </div>

            <div>
              <strong>Perpetuals</strong>
              <span>ACTIVE</span>
            </div>

            <div>
              <strong>Prediction Markets</strong>
              <span>READY</span>
            </div>

            <div>
              <strong>Additional Venues</strong>
              <span>EXPANDING</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
