import { AgentIdentity } from "../../components/AgentIdentity";
import { AgentSelector } from "../../components/AgentSelector";
import { DepositPanel } from "../../components/DepositPanel";
import { KillSwitch } from "../../components/KillSwitch";
import { Positions } from "../../components/Positions";
import { DashboardGate } from "../../components/DashboardGate";

export default function DashboardPage() {
  return (
    <DashboardGate>
      <main className="dashboard">
        <header className="dashboard-nav">
          <div className="dashboard-nav-right">
            <span className="wallet-address">Connected wallet</span>
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
    </DashboardGate>
  );
}
