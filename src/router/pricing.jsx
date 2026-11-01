import { useMemo, useState } from "react";
import { LuArrowUpRight, LuCalculator, LuInfo, LuSparkles } from "react-icons/lu";
import { Link } from "react-router-dom";
import NavBar from "../components/nav/nav";
import Footer from "../components/footer/footer";
import { PLANS, METRICS, DEFAULT_USAGE, estimateMonthlyBill } from "../lib/pricing";
import "./pricing.css";

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantities = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

const questions = [
  {
    question: "How do the subscription and usage charges work?",
    answer: "The proposed monthly subscription is $0 for Free, $25 for Pro, or $99 for Team, per workspace. Each plan includes the allowances listed above. Pro and Team add usage charges only for the amount above each included allowance. Free has hard limits and no overage charges. All prices are in USD.",
  },
  {
    question: "Are allowances per project or per workspace?",
    answer: "Every allowance is pooled across the whole workspace. Free and Pro include one project; Team includes up to five projects. Five Team projects share 20 GB-month of database storage, 5,000 MAU, 50 GB-month of file storage, 100 GB of monthly egress, and 5 million monthly API requests. Those allowances are not multiplied by the number of projects.",
  },
  {
    question: "What counts as a monthly active user (MAU)?",
    answer: "A MAU is a distinct authenticated user active within a project during a calendar month. Repeat activity in that project counts once for that month. The same identity active in two projects counts once in each project. These project-level counts are then added together against the workspace allowance.",
  },
  {
    question: "How are storage, egress, and API requests measured?",
    answer: "Database and file storage use the average amount stored over the calendar month, measured in GB-month. For example, 10 GB stored for half a month and zero for the rest is about 5 GB-month. Egress is the total GB of data sent out during the month. API requests are the total number of requests during the month. Enter whole numbers for users and requests in the estimator.",
  },
  {
    question: "Are extra API requests charged in whole million-request blocks?",
    answer: "No. The proposed $5 per million additional API requests is proportional: 200,000 extra requests cost $1, not $5. Paid-plan storage and egress overages are also proportional to the amount used. The estimator rounds the displayed monetary amounts to cents.",
  },
  {
    question: "What happens when Free reaches a limit?",
    answer: "Free is designed with hard limits rather than automatic usage charges. Usage must stay within every included allowance, or the workspace needs a paid plan. The estimator marks any exceeded Free limits and asks you to upgrade instead of displaying a misleading $0 estimate for that usage.",
  },
  {
    question: "What is outside these prices?",
    answer: "SMS, SSO, delivery emails, file-operation request charges, paid plugins, Stripe processing fees, and taxes are excluded from this core estimate. Email and file-request rates are still to be finalized. A plugin’s own subscription or transaction fees are separate from Grupedia usage charges. Dedicated compute and long-running jobs need an individual quote; they are not included in this shared-platform estimate.",
  },
  {
    question: "Can I buy a plan or receive a bill from this page?",
    answer: "No. This is a pricing proposal and an interactive product preview. The estimator calculates locally in your browser; it does not start a subscription, provision resources, collect payment, or create a bill. Final availability and billing terms will be confirmed before paid plans launch.",
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

function quotaLabel(metric, amount) {
  return `${quantities.format(amount)} ${metric.unit}`;
}

function UsageTable() {
  return <section className="pricing-usage-section container" aria-labelledby="usage-heading">
    <div className="pricing-section-intro"><p className="eyebrow">Know what’s included</p><h2 id="usage-heading">Your allowance first.<br />Only pay for the extra.</h2><p>One subscription, shared workspace allowances, and clear rates for usage beyond them.</p></div>
    <p className="pricing-table-scroll-hint">Swipe the table to compare all plans.</p>
    <div className="pricing-table-scroll" tabIndex={0} role="region" aria-label="Included monthly allowances and paid overage rates, scroll horizontally on smaller screens">
      <table className="pricing-usage-table">
        <caption className="sr-only">Proposed monthly workspace allowances and overage rates for Pro and Team</caption>
        <thead><tr><th scope="col">Monthly workspace usage</th>{PLANS.map((plan) => <th scope="col" key={plan.id}>{plan.name}<small>{plan.id === "free" ? "Hard limits" : "Included"}</small></th>)}<th scope="col">Pro & Team overage<small>Above the included allowance</small></th></tr></thead>
        <tbody>{METRICS.map((metric) => <tr key={metric.key}><th scope="row">{metric.label}</th>{PLANS.map((plan) => <td key={plan.id}>{quotaLabel(metric, plan.included[metric.key])}</td>)}<td className="pricing-overage-rate">{metric.rateLabel}</td></tr>)}</tbody>
      </table>
    </div>
    <div className="pricing-usage-note"><LuInfo aria-hidden="true" /><p>All allowances are pooled per workspace, including Team’s five projects. They are not multiplied by project count. Free has no overage billing.</p></div>
    <p className="pricing-unit-note">Storage is measured as average GB over the month (GB-month). Egress and API requests are monthly totals. Authentication is measured in monthly active users (MAU). See the FAQs for counting rules.</p>
  </section>;
}

function UsageEstimator() {
  const [planId, setPlanId] = useState("pro");
  const [usageValues, setUsageValues] = useState(() => Object.fromEntries(METRICS.map((metric) => [metric.key, String(DEFAULT_USAGE[metric.key])])));
  const [badInputs, setBadInputs] = useState({});
  const { bill, errors } = useMemo(() => {
    const usage = {};
    const nextErrors = {};
    METRICS.forEach((metric) => {
      const value = usageValues[metric.key] === "" ? 0 : Number(usageValues[metric.key]);
      if (badInputs[metric.key] || !Number.isFinite(value) || value < 0) {
        nextErrors[metric.key] = "Enter a finite number of zero or more.";
      } else if (metric.integer && !Number.isSafeInteger(value)) {
        nextErrors[metric.key] = "Enter a whole number of zero or more.";
      } else {
        usage[metric.key] = value;
      }
    });
    if (Object.keys(nextErrors).length) return { bill: null, errors: nextErrors };
    try {
      return { bill: estimateMonthlyBill(planId, usage), errors: {} };
    } catch {
      return { bill: null, errors: { estimate: "These values are outside the supported range. Review your usage to see an estimate." } };
    }
  }, [planId, usageValues, badInputs]);
  const selectedPlan = PLANS.find((plan) => plan.id === planId);
  const isFreeLimited = Boolean(bill?.exceedsFreeLimit);
  const hasErrors = Object.keys(errors).length > 0;

  function changeUsage(metric, event) {
    const { value, validity } = event.currentTarget;
    setUsageValues((current) => ({ ...current, [metric.key]: value }));
    setBadInputs((current) => ({ ...current, [metric.key]: validity.badInput }));
  }

  return <section className="pricing-estimate-section container" aria-labelledby="estimate-heading">
    <div className="pricing-section-intro"><p className="eyebrow">A little planning goes a long way</p><h2 id="estimate-heading">A clearer view<br />of your month.</h2><p>Try a plan and adjust your expected usage. This local estimate uses the proposed rates above.</p></div>
    <div className="pricing-estimator">
      <div className="pricing-estimator-inputs">
        <div className="pricing-estimator-heading"><span className="pricing-estimator-icon"><LuCalculator aria-hidden="true" /></span><div><h3>Your workspace usage</h3><p>Start with an example, then make it yours.</p></div></div>
        <div className="pricing-estimator-field pricing-plan-select"><label htmlFor="estimate-plan">Choose a plan</label><select id="estimate-plan" value={planId} onChange={(event) => setPlanId(event.target.value)}>{PLANS.map((plan) => <option value={plan.id} key={plan.id}>{plan.name} — ${plan.monthlyPrice} / month</option>)}</select></div>
        <div className="pricing-usage-input-grid">{METRICS.map((metric) => <div className={`pricing-estimator-field${metric.key === "apiRequests" ? " pricing-estimator-field-wide" : ""}`} key={metric.key}><label htmlFor={`usage-${metric.key}`}>{metric.inputLabel}</label><input id={`usage-${metric.key}`} type="number" inputMode={metric.integer ? "numeric" : "decimal"} min="0" step={metric.step} value={usageValues[metric.key]} onChange={(event) => changeUsage(metric, event)} aria-invalid={Boolean(errors[metric.key])} aria-describedby={`usage-${metric.key}-help${errors[metric.key] ? ` usage-${metric.key}-error` : ""}`} /><small id={`usage-${metric.key}-help`}>{metric.help}</small>{errors[metric.key] && <span className="pricing-field-error" id={`usage-${metric.key}-error`}>{errors[metric.key]}</span>}</div>)}</div>
        <p className="pricing-estimator-local-note"><LuInfo aria-hidden="true" /> Estimates stay in your browser. Nothing is purchased.</p>
      </div>
      <div className="pricing-estimator-result">
        <div className="pricing-result-heading"><span>{selectedPlan.name} workspace</span><span className="pricing-estimate-badge">Local estimate</span></div>
        <p className="pricing-total-label">{isFreeLimited ? "This usage needs a paid plan" : "Estimated monthly total"}</p>
        <output className={`pricing-estimate-total${isFreeLimited || hasErrors ? " pricing-estimate-total-message" : ""}`} aria-label="Estimated monthly total" aria-live="polite" aria-atomic="true">{hasErrors ? "Check your usage" : isFreeLimited ? "Upgrade required" : <>{dollars.format(bill.total)}<span> / month</span></>}</output>
        <p className="pricing-result-explanation">{hasErrors ? "Enter valid usage amounts to calculate your estimate." : isFreeLimited ? "Free has hard limits. It does not automatically charge for extra usage." : "Subscription + only the usage above your included allowances."}</p>
        {hasErrors ? <p className="pricing-estimate-error" role="alert">{errors.estimate || "Review the highlighted fields. Users and requests must be whole numbers; all amounts must be zero or more."}</p> : <>
          <div className="pricing-bill-summary"><div><span>Monthly subscription</span><strong>{dollars.format(bill.base)}</strong></div><div><span>{isFreeLimited ? "Automatic overage billing" : "Usage overages"}</span><strong>{isFreeLimited ? "Not available" : dollars.format(bill.overage)}</strong></div></div>
          <div className="pricing-bill-items"><h4>Usage breakdown</h4>{bill.items.map((item) => {
            const metric = METRICS.find((entry) => entry.key === item.key);
            return <div className="pricing-bill-item" key={item.key}><div><span>{item.label}</span><small>{item.extra > 0 ? `${quotaLabel(metric, item.extra)} above included` : "Within included allowance"}</small></div><strong>{isFreeLimited && item.extra > 0 ? "Over limit" : dollars.format(item.amount)}</strong></div>;
          })}</div>
          {isFreeLimited && <p className="pricing-free-limit-note" role="status">Above the Free allowance: {bill.items.filter((item) => item.extra > 0).map((item) => item.label).join(", ")}. Choose Pro or Team to estimate this usage.</p>}
        </>}
        <p className="pricing-result-footnote">USD. Pricing proposal, not a bill. Excludes email and file-request charges, optional services, and taxes. Displayed amounts are rounded to cents.</p>
      </div>
    </div>
  </section>;
}

export default function Pricing() {
  return (
    <div className="pricing-page">
      <NavBar />
      <main id="main-content">
        <header className="pricing-hero container">
          <p className="eyebrow"><span className="pricing-eyebrow-dot" /> A plan for every next step</p>
          <h1>Start small.<br /><span>Grow something great.</span></h1>
          <p className="pricing-hero-description">A monthly plan for your workspace, with usage included.<br className="pricing-desktop-break" /> Clear overage rates when your apps need a little more.</p>
          <div className="pricing-preview-note"><span>Pricing proposal</span><p>Monthly subscription + included usage. No payment is collected in this preview.</p></div>
        </header>
        <section className="pricing-plans container" aria-label="Compare pricing plans">
          {PLANS.map((plan) => (
            <article key={plan.id} className={`pricing-card${plan.featured ? " pricing-card-featured" : ""}`}>
              <div className="pricing-card-top"><span className="pricing-plan-icon"><PlanIcon type={plan.icon} /></span>{plan.featured && <span className="pricing-recommendation">For growing apps</span>}</div>
              <h2>{plan.name}</h2><p className="pricing-card-description">{plan.description}</p>
              <p className="pricing-price"><span className="pricing-currency">$</span>{plan.monthlyPrice}<span className="pricing-period">/ month</span></p>
              <p className="pricing-audience">{plan.audience}</p>
              <Link to="/register" className={`btn ${plan.featured ? "pricing-featured-button" : "btn-secondary"}`}>{plan.action}<span aria-hidden="true"><LuArrowUpRight /></span></Link>
              <p className="pricing-plan-billing-note">{plan.id === "free" ? "Hard limits. No overage charges." : "Plus usage above included allowances."}</p>
              <div className="pricing-features"><h3>Included per workspace</h3><ul>{plan.features.map((feature) => <li key={feature}><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>{feature}</li>)}</ul></div>
            </article>
          ))}
        </section>
        <div className="pricing-bottom-note container"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg><p>Explore at your own pace. No subscription starts and no resources are provisioned here.</p></div>
        <UsageTable />
        <UsageEstimator />
        <div className="container pricing-exclusions"><LuInfo aria-hidden="true" /><p>Delivery emails, file-operation requests, SMS, SSO, paid plugins, Stripe fees, and taxes are excluded. Email and file-request rates are still to be finalized. Dedicated compute and long-running jobs need an individual quote. This estimate covers the shared app platform.</p></div>
        <section className="pricing-faq-section"><div className="container pricing-faq-layout"><div className="pricing-faq-heading"><p className="eyebrow">A few helpful answers</p><h2>Good questions.<br />Clear answers.</h2><p>The units, allowances, and counting rules behind your estimate.</p><Link to="/devs">Explore the developer preview <span aria-hidden="true"><LuArrowUpRight /></span></Link></div><div className="pricing-faq-list">{questions.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden="true" className="pricing-faq-plus">+</span></summary><p>{answer}</p></details>)}</div></div></section>
        <section className="container pricing-closing"><span aria-hidden="true" className="pricing-closing-mark"><LuSparkles /></span><h2>Every great app<br />starts with a first step.</h2><Link className="btn btn-primary" to="/register">Take a look around <span aria-hidden="true"><LuArrowUpRight /></span></Link></section>
      </main>
      <Footer />
    </div>
  );
}
