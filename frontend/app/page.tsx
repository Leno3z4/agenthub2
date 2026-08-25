import Link from "next/link";
import styles from "./landing.module.css";
import { LandingConnect } from "../components/LandingConnect";
import { DashboardLink } from "../components/DashboardLink";

const features = [
  {
    name: "Execution",
    description: "Give an authorized agent access to a dedicated trading connection without handing over your primary wallet.",
  },
  {
    name: "Delegation",
    description: "Your wallet remains the owner while the agent operates through the account you explicitly authorize.",
  },
  {
    name: "Control",
    description: "Monitor the connection, manage agents, and close active trades from your AgentHub dashboard.",
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.logo}>
          Agenthub
        </Link>

        <nav className={styles.navLinks}>
          <a href="#docs">Docs</a>
          <DashboardLink href="/onboarding">Launch</DashboardLink>
        </nav>

        <LandingConnect className={styles.connect} />
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroGlowTwo} />

        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Give agents
            <br />
            <span>room to trade.</span>
          </h1>

          <p className={styles.heroDescription}>
            Connect autonomous agents to dedicated onchain trading accounts while keeping ownership and control in your hands.
          </p>

          <div className={styles.heroActions}>
            <DashboardLink href="/onboarding" className={styles.primary}>
              Launch
            </DashboardLink>
            <LandingConnect className={styles.secondary} />
          </div>
        </div>
      </section>

      <section className={styles.textSection} id="docs">
        <h2 className={styles.textHeading}>
          Infrastructure for
          <br />
          <span>autonomous execution.</span>
        </h2>

        <div className={styles.featureList}>
          {features.map((feature, index) => (
            <article className={styles.feature} key={feature.name}>
              <span className={styles.featureNumber}>0{index + 1}</span>
              <h3>{feature.name}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.agentSection}>
        <div>
          <h2>
            Your wallet.
            <br />
            Your agent.
            <br />
            Your control.
          </h2>
        </div>

        <div className={styles.agentCopy}>
          <p>
            Start with your wallet, create your trading account, then connect an agent using the guided connection flow. Existing accounts return directly to the dashboard.
          </p>
          <DashboardLink href="/onboarding" className={styles.agentLink}>
            Get started
          </DashboardLink>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>Agenthub</span>
        <span>ONCHAIN AGENT INFRASTRUCTURE</span>
        <span>2026</span>
      </footer>
    </main>
  );
}
