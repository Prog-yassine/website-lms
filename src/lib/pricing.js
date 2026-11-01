// Proposed Grupedia retail prices in USD. No payment or usage collection occurs here.
export const METRICS = [
  { key: 'databaseGB', label: 'Database storage', inputLabel: 'Database storage (GB, monthly average)', unit: 'GB', rateCents: 25, unitSize: 1, rateLabel: '$0.25 / extra GB-month', step: '0.1', integer: false, help: 'Average database storage, including tables and indexes. This is disk space, not RAM.' },
  { key: 'authMAU', label: 'Authentication', inputLabel: 'Monthly active auth users', unit: 'MAU', rateCents: 2, unitSize: 1, rateLabel: '$0.02 / extra active user / month', step: '1', integer: true, help: 'A distinct identity with an authentication action in a project during the calendar month, counted once per project.' },
  { key: 'storageGB', label: 'File storage', inputLabel: 'File storage (GB, monthly average)', unit: 'GB', rateCents: 5, unitSize: 1, rateLabel: '$0.05 / extra GB-month', step: '0.1', integer: false, help: 'Average space used by images, documents, and other uploaded files.' },
  { key: 'egressGB', label: 'Outbound transfer', inputLabel: 'Outbound transfer (GB / month)', unit: 'GB', rateCents: 15, unitSize: 1, rateLabel: '$0.15 / extra GB', step: '0.1', integer: false, help: 'Data delivered from your application to visitors during the month, counted once per delivery.' },
  { key: 'apiRequests', label: 'API requests', inputLabel: 'API requests / month', unit: 'requests', rateCents: 500, unitSize: 1000000, rateLabel: '$5.00 / extra million requests', step: '1', integer: true, help: 'Standard application API calls. Fractions of a million are charged proportionally; dedicated compute and long-running jobs are separate.' },
];

export const PLANS = [
  {
    id: 'free', name: 'Free', monthlyPrice: 0, projects: 1,
    description: 'Try your idea. Keep your costs at zero.',
    audience: 'For prototypes and personal projects.', action: 'Start with Free', icon: 'sprout',
    included: { databaseGB: 0.5, authMAU: 100, storageGB: 1, egressGB: 1, apiRequests: 10000 },
  },
  {
    id: 'pro', name: 'Pro', monthlyPrice: 25, projects: 1,
    description: 'A monthly foundation. Room to grow.',
    audience: 'For your first production app.', action: 'Explore Pro', icon: 'bolt', featured: true,
    included: { databaseGB: 8, authMAU: 1000, storageGB: 10, egressGB: 25, apiRequests: 1000000 },
  },
  {
    id: 'team', name: 'Team', monthlyPrice: 99, projects: 5,
    description: 'More projects. One shared allowance.',
    audience: 'For teams managing several applications.', action: 'Explore Team', icon: 'team',
    included: { databaseGB: 20, authMAU: 5000, storageGB: 50, egressGB: 100, apiRequests: 5000000 },
  },
].map(plan => ({
  ...plan,
  features: [
    `${plan.projects} active project${plan.projects === 1 ? '' : 's'}`,
    `${plan.included.databaseGB < 1 ? '500 MB' : `${plan.included.databaseGB} GB`} database storage`,
    `${plan.included.authMAU.toLocaleString('en-US')} monthly active auth users`,
    `${plan.included.storageGB} GB file storage`,
    `${plan.included.egressGB} GB outbound transfer / month`,
    `${plan.included.apiRequests.toLocaleString('en-US')} API requests / month`,
  ],
}));

export const DEFAULT_USAGE = {
  databaseGB: 12,
  authMAU: 1500,
  storageGB: 20,
  egressGB: 30,
  apiRequests: 1200000,
};

export function estimateMonthlyBill(planId, usage = {}) {
  const plan = PLANS.find(item => item.id === planId);
  if (!plan) throw new RangeError('Choose a valid plan.');
  const items = METRICS.map(metric => {
    const raw = usage[metric.key] ?? 0;
    const used = raw === '' ? 0 : Number(raw);
    if (!['number', 'string'].includes(typeof raw) || !Number.isFinite(used) || used < 0 || used > 1000000000000 || (metric.integer && !Number.isInteger(used))) {
      throw new RangeError(`${metric.label}: enter a non-negative ${metric.integer ? 'whole ' : ''}number up to 1 trillion.`);
    }
    const included = plan.included[metric.key];
    const extra = Math.max(0, used - included);
    const amountCents = plan.id === 'free' ? 0 : Math.round((extra * metric.rateCents / metric.unitSize) + Number.EPSILON);
    return { key: metric.key, label: metric.label, included, used, extra, amount: amountCents / 100, rateLabel: metric.rateLabel };
  });
  const blockedMetrics = plan.id === 'free' ? items.filter(item => item.extra > 0).map(item => item.key) : [];
  const overageCents = items.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  return {
    planId,
    base: plan.monthlyPrice,
    overage: overageCents / 100,
    total: (plan.monthlyPrice * 100 + overageCents) / 100,
    items,
    exceedsFreeLimit: blockedMetrics.length > 0,
    blockedMetrics,
  };
}
