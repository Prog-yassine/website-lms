import { LuArrowUpRight, LuArrowDown } from "react-icons/lu";
import { Link } from "react-router-dom";
import NavBar from "../components/nav/nav";
import Footer from "../components/footer/footer";
import "./developer.css";

const capabilities = [
  {
    icon: "code",
    label: "01 / API access",
    title: "Your learning data.\nMore possibilities.",
    text: "Connect course information and approved learning datasets to the tools your institution already uses.",
  },
  {
    icon: "plugin",
    label: "02 / Custom plugins",
    title: "Make room for\nyour own ideas.",
    text: "A planned plugin framework to bring useful new experiences to teachers, students, and your team.",
  },
  {
    icon: "lock",
    label: "03 / Thoughtful permissions",
    title: "The right access.\nIn the right hands.",
    text: "We’re designing admin-approved, project-scoped access so developers can work with only the data they need.",
  },
];

const workflow = [
  { title: "Choose your use case", text: "Start with the learning experience you want to improve and the data you’ll need." },
  { title: "Agree on access", text: "Your institution’s admin will review the request and define the appropriate scope." },
  { title: "Build something useful", text: "Connect your tools or create an extension, with clear boundaries around each integration." },
];

function DeveloperIcon({ type }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === "code" && <><path d="m8 6-6 6 6 6M16 6l6 6-6 6M14 3l-4 18" /></>}
    {type === "plugin" && <><path d="M9 3v4M15 3v4M7 7h10v4a5 5 0 0 1-10 0V7ZM12 16v5" /><path d="M5 7h14" /></>}
    {type === "lock" && <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>}
  </svg>;
}

function CodePreview() {
  return <div className="developer-code-panel">
    <div className="developer-code-toolbar"><span className="developer-window-dots" aria-hidden="true"><i /><i /><i /></span><span>your-next-idea.js</span><span className="developer-code-language">JS</span></div>
    <div className="developer-code-body">
      <p className="developer-code-comment">{'// A first look at what’s ahead'}</p>
      <pre aria-label="Illustrative JavaScript API request"><code><span className="developer-code-purple">const</span>{" response = "}<span className="developer-code-purple">await</span>{" fetch(\n  "}<span className="developer-code-mint">&apos;/api/v1/courses&apos;</span>{",\n  {\n    headers: {\n      Authorization: "}<span className="developer-code-mint">&apos;Bearer YOUR_API_KEY&apos;</span>{",\n    },\n  }\n);\n\n"}<span className="developer-code-purple">const</span>{" courses = "}<span className="developer-code-purple">await</span>{" response."}<span className="developer-code-yellow">json</span>{"();"}</code></pre>
    </div>
    <div className="developer-code-footer"><span className="developer-code-status" /><span>Illustrative example · API not yet available</span><span aria-hidden="true"><LuArrowUpRight /></span></div>
  </div>;
}

export default function Developer() {
  return <div className="developer-page">
    <NavBar />
    <main id="main-content">
      <section className="developer-hero container">
        <div className="developer-hero-copy">
          <p className="eyebrow"><span className="developer-brackets" aria-hidden="true">&lt; / &gt;</span> Built for your next idea</p>
          <h1>Better learning.<br /><span>Built together.</span></h1>
          <p className="developer-hero-description">Your tools. Your workflows. Your possibilities. A first look at how we’re opening Grupedia to the people who build.</p>
          <div className="developer-hero-actions"><Link to="/register" className="btn btn-primary">Explore Grupedia <span aria-hidden="true"><LuArrowUpRight /></span></Link><a href="#developer-roadmap" className="developer-text-link">See what’s ahead <span aria-hidden="true"><LuArrowDown /></span></a></div>
          <p className="developer-release-note"><span /> Developer tools are coming soon</p>
        </div>
        <div className="developer-hero-visual"><div className="developer-code-caption"><span>From idea to possibility</span><span aria-hidden="true">01 — 03</span></div><CodePreview /><div className="developer-visual-caption"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m5 12 4 4 10-10" /></svg><span>Designed around your institution, not the other way around.</span></div></div>
      </section>

      <section className="developer-capabilities-section" id="developer-roadmap">
        <div className="container">
          <div className="developer-section-intro"><div><p className="eyebrow">The developer preview</p><h2>A toolkit taking shape.<br />Ideas without a ceiling.</h2></div><p>We’re building the foundations for an extensible learning platform. Here’s the direction we’re working toward.</p></div>
          <div className="developer-capabilities">{capabilities.map(({ icon, label, title, text }) => <article className="developer-capability" key={label}><div className="developer-capability-top"><span className="developer-capability-icon"><DeveloperIcon type={icon} /></span><span className="developer-planned-label">Planned</span></div><p className="developer-capability-label">{label}</p><h3>{title.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h3><p className="developer-capability-text">{text}</p></article>)}</div>
        </div>
      </section>

      <section className="container developer-workflow-section">
        <div className="developer-workflow-intro"><p className="eyebrow">A considered approach</p><h2>From a good idea<br />to a useful connection.</h2><p>Our planned workflow keeps developers moving and institutions in control.</p><Link to="/coming-soon" className="developer-text-link">Documentation is on the way <span aria-hidden="true"><LuArrowUpRight /></span></Link></div>
        <ol className="developer-workflow">{workflow.map(({ title, text }, index) => <li key={title}><span className="developer-step-number">0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
      </section>

      <section className="container developer-ecosystem-section"><div className="developer-ecosystem"><div className="developer-ecosystem-copy"><p className="eyebrow">Connected by design</p><h2>One learning space.<br />Your wider ecosystem.</h2><p>Learning doesn’t happen in a silo. We’re exploring connections for calendars, files, collaboration, and the tools that make your day work.</p><span className="developer-ecosystem-note">Integration availability will be announced at launch.</span></div><div className="developer-ecosystem-visual" aria-label="Planned integration categories"><div className="developer-ecosystem-hub"><img src="/logo.svg" alt="" /><span>Grupedia</span></div><div className="developer-ecosystem-nodes"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 10h16M8 2v6M16 2v6M8 14h3M14 14h2M8 17h3" /></svg>Calendars</span><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6M8 13h8M8 17h6" /></svg>Files & resources</span><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4 8.5 8.5 0 0 1 17 0ZM8 11h.01M12 11h.01M16 11h.01" /></svg>Collaboration</span><span><DeveloperIcon type="code" />Your own tools</span></div></div></div></section>

      <section className="container developer-closing"><p className="eyebrow">The next chapter is coming</p><h2>Good tools bring people together.<br /><span>Let’s build what comes next.</span></h2><p>Explore the platform today. Developer access, documentation,<br className="developer-desktop-break" /> and integrations will follow as Grupedia grows.</p><Link className="btn btn-primary" to="/register">Discover Grupedia <span aria-hidden="true"><LuArrowUpRight /></span></Link></section>
    </main>
    <Footer />
  </div>;
}
