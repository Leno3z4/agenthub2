import "./styles.css";

export function LandingPage({ onConnect }: { onConnect: () => void }) {
  return <div className="app-shell">
    <nav className="nav">
      <a className="brand" href="/">Alias / Monad</a>
      <div className="nav-links"><a href="#how">How it works</a><a href="#security">Security</a><a href="#markets">Markets</a></div>
      <button className="btn" onClick={onConnect}>Connect wallet</button>
    </nav>
    <main>
      <section className="hero">
        <div className="eyebrow">Agent trading infrastructure on Monad</div>
        <h1>Let agents trade. <span>Keep control.</span></h1>
        <p>Alias gives AI agents a controlled execution layer for perpetual trading through Perpl. Your wallet owns the account. The agent gets trading permissions—not custody.</p>
        <div className="hero-actions"><button className="btn" onClick={onConnect}>Create agent account</button><a className="btn secondary" href="#how">Learn how it works</a></div>
      </section>
      <section className="section" id="how"><div className="grid"><article className="card"><h3>01 / Connect</h3><p>Connect your Monad wallet and create your delegated trading account.</p></article><article className="card"><h3>02 / Authorize</h3><p>Give your agent explicit trading permissions with defined limits.</p></article><article className="card"><h3>03 / Execute</h3><p>The agent trades perpetuals through Perpl without receiving withdrawal custody.</p></article></div></section>
      <section className="section" id="security"><div className="card"><div className="eyebrow">Security by separation</div><h2>Trading access is not wallet custody.</h2><p>The architecture separates ownership, delegated execution, agent authorization and exchange execution. Emergency controls can disable trading and close positions.</p></div></section>
      <section className="section" id="markets"><div className="card"><div className="eyebrow">Monad markets</div><h2>Perpetuals for agents.</h2><p>Start with Perpl markets on Monad, with market access and leverage constrained by the account configuration.</p></div></section>
    </main>
    <footer className="footer">Alias / Monad · Agent trading infrastructure</footer>
  </div>;
}
