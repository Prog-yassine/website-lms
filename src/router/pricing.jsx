import { LuArrowUpRight, LuSparkles } from "react-icons/lu";
import { Link } from "react-router-dom";
import NavBar from "../components/nav/nav";
import Footer from "../components/footer/footer";
import "./pricing.css";

const plans = [
  {
    name: "Free",
    price: "0",
    description: "A small beginning. A big possibility.",
    audience: "For exploring your next web app.",
    features: [
      "1 active project",
      "5,000 monthly active users",
      "500 MB database storage",
      "1 GB file storage",
      "5 GB bandwidth",
      "Community support",
    ],
    action: "Start with Free",
    icon: "sprout",
  },
  {
    name: "Pro",
    price: "25",
    description: "Everything you need to find your stride.",
    audience: "For growing apps and independent developers.",
    features: [
      "100,000 monthly active users",
      "8 GB database storage per project",
      "100 GB file storage",
      "250 GB bandwidth",
      "Daily backups, retained for 7 days",
      "Email support",
    ],
    action: "Explore Pro",
    icon: "bolt",
    featured: true,
  },
  {
    name: "Team",
    price: "599",
    description: "More room for your whole organization.",
    audience: "For development teams building together at scale.",
    features: [
      "Everything in Pro",
      "Project-scoped team access",
      "Read-only access controls",
      "Daily backups, retained for 14 days",
      "28-day log retention",
      "Priority email support",
    ],
    action: "Explore Team",
    icon: "team",
  },
];

const questions = [
  {
    question: "Can I try Grupedia for free?",
    answer:
      "A Free plan is part of our launch plans, so you can explore the platform before choosing a paid option. For now, you can browse the product preview and see what we’re building.",
  },
  {
    question: "Can I change plans as my project grows?",
    answer:
      "Flexible upgrades are part of the planned experience. We’ll share the upgrade process, usage limits, and any additional charges before paid plans become available.",
  },
  {
    question: "Are these the final prices and features?",
    answer:
      "These plans are an early preview, not a paid offer. Final prices, included features, and availability will be confirmed at launch. No payment is collected on this website.",
  },
];

function PlanIcon({ type }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {type === "sprout" && <><path d="M12 21v-9M12 14C6 14 3 11 3 5c6 0 9 3 9 9ZM12 11c0-5 3-8 9-8 0 6-3 9-9 9" /></>}
      {type === "bolt" && <path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z" />}
      {type === "team" && <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5.2" /></>}
    </svg>
  );
}

export default function Pricing() {
  return (
    <div className="pricing-page">
      <NavBar />
      <main id="main-content">
        <header className="pricing-hero container">
          <p className="eyebrow"><span className="pricing-eyebrow-dot" /> A plan for every next step</p>
          <h1>Start small.<br /><span>Grow something great.</span></h1>
          <p className="pricing-hero-description">From your first product listing to your next web app.<br className="pricing-desktop-break" /> Choose the space you need, with room for what comes next.</p>
          <div className="pricing-preview-note"><span>Plan preview</span><p>Indicative monthly pricing. Final plans will be confirmed at launch.</p></div>
        </header>

        <section className="pricing-plans container" aria-label="Compare pricing plans">
          {plans.map((plan) => (
            <article key={plan.name} className={`pricing-card${plan.featured ? " pricing-card-featured" : ""}`}>
              <div className="pricing-card-top">
                <span className="pricing-plan-icon"><PlanIcon type={plan.icon} /></span>
                {plan.featured && <span className="pricing-recommendation">For growing apps</span>}
              </div>
              <h2>{plan.name}</h2>
              <p className="pricing-card-description">{plan.description}</p>
              <p className="pricing-price"><span className="pricing-currency">$</span>{plan.price}<span className="pricing-period">/ month</span></p>
              <p className="pricing-audience">{plan.audience}</p>
              <Link to="/register" className={`btn ${plan.featured ? "pricing-featured-button" : "btn-secondary"}`}>{plan.action}<span aria-hidden="true"><LuArrowUpRight /></span></Link>
              <div className="pricing-features">
                <h3>Planned inclusions</h3>
                <ul>{plan.features.map((feature) => <li key={feature}><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>{feature}</li>)}</ul>
              </div>
            </article>
          ))}
        </section>

        <div className="pricing-bottom-note container"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg><p>Explore at your own pace. No payment is collected in this preview.</p></div>

        <section className="pricing-faq-section">
          <div className="container pricing-faq-layout">
            <div className="pricing-faq-heading"><p className="eyebrow">A few helpful answers</p><h2>Good questions.<br />Clear answers.</h2><p>A little more about the plans and what to expect as Grupedia takes shape.</p><Link to="/devs">Explore the developer preview <span aria-hidden="true"><LuArrowUpRight /></span></Link></div>
            <div className="pricing-faq-list">{questions.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden="true" className="pricing-faq-plus">+</span></summary><p>{answer}</p></details>)}</div>
          </div>
        </section>
        <section className="container pricing-closing"><span aria-hidden="true" className="pricing-closing-mark"><LuSparkles /></span><h2>Every great app<br />starts with a first step.</h2><Link className="btn btn-primary" to="/register">Take a look around <span aria-hidden="true"><LuArrowUpRight /></span></Link></section>
      </main>
      <Footer />
    </div>
  );
}
