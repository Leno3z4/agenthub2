import Link from "next/link";
import { DashboardGate } from "./DashboardGate";
import { DashboardNavigation } from "./DashboardNavigation";

type Props = {
  title: string;
  description: string;
};

export function AccountSectionPage({ title, description }: Props) {
  return (
    <DashboardGate>
      <main className="dashboard">
        <header className="dashboard-nav">
          <DashboardNavigation />
          <span className="wallet-address">Connected wallet</span>
        </header>

        <div className="dashboard-container">
          <Link className="muted" href="/dashboard">
            Back to dashboard
          </Link>
          <div className="dashboard-heading">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <section className="status-panel">
            <p className="muted">
              This section is ready for the live account data from the backend.
            </p>
          </section>
        </div>
      </main>
    </DashboardGate>
  );
}
