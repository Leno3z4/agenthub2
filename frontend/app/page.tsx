import Link from "next/link";
import { Navbar } from "../components/Navbar";

const markets = [
  {
    name: "Onchain Markets",
    description:
      "Agents execute trades across supported onchain markets using delegated permissions.",
    status: "LIVE",
  },
  {
    name: "Agent Strategies",
    description:
      "Give an agent a strategy and let it execute within the permissions you define.",
    status: "AVAILABLE",
  },
  {
    name: "Cross-Market Execution",
    description:
      "One agent interface for multiple onchain trading venues and market types.",
    status: "BUILDING",
  },
];

export default function Home() {
  return (
    <main className="site">
      <Navbar />

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            AGENTHUB / ONCHAIN AGENT TRADING
          </div>

          <h1>
            Give agents
            <br />
            <span>markets to trade.</span>
          </h1>

          <p>
            AgentHub is infrastructure for autonomous agents to trade
            onchain markets. Connect an agent, authorize its wallet,
            fund it, and let it execute strategies across supported
            markets.
          </p>

          <div className="hero-actions">
            <Link href="/dashboard" className="button-primary">
              Launch AgentHub
              <span>↗</span>
            </Link>

            <a href="#markets" className="button-secondary">
              Explore markets
            </a>
          </div>
        </div>

        <div className="hero-index">
          <div className="index-label">SYSTEM</div>
          <div className="index-value">AGENT / 01</div>

          <div className="index-line" />

          <div className="index-row">
            <span>NETWORK</span>
            <span>ONCHAIN</span>
          </div>

          <div className="index-row">
            <span>EXECUTION</span>
            <span>NON-CUSTODIAL</span>
          </div>

          <div className="index-row">
            <span>ACCESS</span>
            <span>DELEGATED</span>
          </div>
        </div>
      </section>

      <section className="ticker">
        <span>AGENTS</span>
        <span>MARKETS</span>
        <span>EXECUTION</span>
        <span>ONCHAIN</span>
        <span>DELEGATION</span>
      </section>

      <section id="markets" className="markets-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">01 / INFRASTRUCTURE</div>
            <h2>Built for autonomous execution.</h2>
          </div>

          <p>
            AgentHub gives agents the infrastructure required to interact
            with real onchain markets without requiring users to hand over
            their primary wallet.
          </p>
        </div>

        <div className="market-grid">
          {markets.map((market, index) => (
            <article className="market-card" key={market.name}>
              <div className="card-number">
                0{index + 1}
              </div>

              <div className="card-status">
                {market.status}
              </div>

              <h3>{market.name}</h3>

              <p>{market.description}</p>

              <span className="card-arrow">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section id="agents" className="agent-section">
        <div>
          <div className="eyebrow">02 / AGENTS</div>
          <h2>
            Your agent.
            <br />
            Your authorization.
          </h2>
        </div>

        <div className="agent-copy">
          <p>
            AgentHub separates ownership from execution. Your wallet
            remains yours while an authorized delegated account gives
            your agent the permissions it needs to trade.
          </p>

          <Link href="/dashboard" className="text-link">
            Configure an agent <span>→</span>
          </Link>
        </div>
      </section>

      <footer className="footer">
        <span>AGENTHUB</span>
        <span>ONCHAIN AGENT INFRASTRUCTURE</span>
        <span>2026</span>
      </footer>
    </main>
  );
}
