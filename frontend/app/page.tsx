import Link from "next/link";
import { Navbar } from "../components/Navbar";

const markets = [
  { name: "Perpetual Trading", description: "Connect an agent to a delegated trading account and execute supported Perpl markets.", status: "LIVE" },
  { name: "Agent Execution", description: "Give an agent a connection to your account without handing over your primary wallet.", status: "LIVE" },
  { name: "More Connections", description: "Additional trading connections will be added as they become available.", status: "BUILDING" },
];

export default function Home() {
  return (
    <main className="site">
      <Navbar />
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">AGENTHUB / ONCHAIN AGENT TRADING</div>
          <h1>Give agents<br /><span>markets to trade.</span></h1>
          <p>Connect your wallet, create your AgentHub identity, and give your agent a dedicated connection to trade through your delegated account.</p>
          <div className="hero-actions">
            <Link href="/onboarding" className="button-primary">Launch AgentHub</Link>
            <Link href="/onboarding" className="button-secondary">Connect an agent</Link>
          </div>
        </div>
        <div className="hero-index">
          <div className="index-label">SYSTEM</div>
          <div className="index-value">AGENT / 01</div>
          <div className="index-line" />
          <div className="index-row"><span>NETWORK</span><span>ONCHAIN</span></div>
          <div className="index-row"><span>EXECUTION</span><span>NON-CUSTODIAL</span></div>
          <div className="index-row"><span>ACCESS</span><span>DELEGATED</span></div>
        </div>
      </section>

      <section className="ticker"><span>AGENTS</span><span>MARKETS</span><span>EXECUTION</span><span>ONCHAIN</span><span>DELEGATION</span></section>

      <section id="markets" className="markets-section">
        <div className="section-heading">
          <div><div className="eyebrow">01 / INFRASTRUCTURE</div><h2>Built for autonomous execution.</h2></div>
          <p>AgentHub separates wallet ownership from agent execution. Your primary wallet stays under your control while authorized agents use delegated trading connections.</p>
        </div>
        <div className="market-grid">
          {markets.map((market, index) => (
            <article className="market-card" key={market.name}>
              <div className="card-number">0{index + 1}</div>
              <div className="card-status">{market.status}</div>
              <h3>{market.name}</h3>
              <p>{market.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="agents" className="agent-section">
        <div><div className="eyebrow">02 / AGENTS</div><h2>Your agent.<br />Your authorization.</h2></div>
        <div className="agent-copy">
          <p>Your wallet proves ownership during onboarding. AgentHub then creates an identity and a separate connection credential for your agent.</p>
          <Link href="/onboarding" className="text-link">Configure an agent</Link>
        </div>
      </section>

      <footer className="footer"><span>AGENTHUB</span><span>ONCHAIN AGENT INFRASTRUCTURE</span><span>2026</span></footer>
    </main>
  );
}
