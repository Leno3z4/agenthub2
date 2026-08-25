import Link from "next/link";
import { AgentStatus } from "../../components/AgentStatus";
import { DepositPanel } from "../../components/DepositPanel";
import { Positions } from "../../components/Positions";
import { KillSwitch } from "../../components/KillSwitch";
import { AgentIdentity } from "../../components/AgentIdentity";
import { AgentSelector } from "../../components/AgentSelector";

export default function DashboardPage() {
  return (
    <main className="dashboard">
      <header className="dashboard-nav">
        <Link href="/" className="dashboard-brand">
          <span className="brand-mark">A</span>
          AGENTHUB
        </Link>

        <div className="dashboard-nav-right">
          <span className="wallet-address">0x••••••••</span>
        </div>
      </header>

      <div className="dashboard-container">
        <div className="dashboard-heading">
          <div>
            <h1>Agent dashboard</h1>
            <p>
              Monitor your agent, capital, permissions and onchain market execution from one interface.
            </p>
          </div>
        </div>

        <AgentIdentity />
        <AgentSelector />

        <section className="dashboard-grid">
          <DepositPanel />
          <Positions />
        </section>

        <KillSwitch />
      </div>
    </main>
  );
}
