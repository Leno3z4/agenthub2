import { AgentIdentity } from "../../components/AgentIdentity";
import { AgentSelector } from "../../components/AgentSelector";
import { DashboardNavigation } from "../../components/DashboardNavigation";
import { DepositPanel } from "../../components/DepositPanel";
import { WithdrawPanel } from "../../components/WithdrawPanel";
import { KillSwitch } from "../../components/KillSwitch";
import { Positions } from "../../components/Positions";
import { PerplEnrollment } from "../../components/PerplEnrollment";
import { DashboardGate } from "../../components/DashboardGate";

export default function DashboardPage() {
  return (
    <DashboardGate>
      <main className="dashboard">
        <header className="dashboard-nav">
          <DashboardNavigation />
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
          <PerplEnrollment />

          <section className="dashboard-grid">
            <DepositPanel />
            <WithdrawPanel />
            <Positions />
          </section>

          <KillSwitch />
        </div>
      </main>
    </DashboardGate>
  );
}
