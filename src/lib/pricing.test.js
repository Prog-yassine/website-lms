import { PLANS, DEFAULT_USAGE, estimateMonthlyBill } from './pricing';

test.each(PLANS)('$name includes its full allowance without overage', plan => {
  const bill = estimateMonthlyBill(plan.id, plan.included);
  expect(bill.total).toBe(plan.monthlyPrice);
  expect(bill.overage).toBe(0);
  expect(bill.exceedsFreeLimit).toBe(false);
});

test('the published Pro example totals the five independent overages', () => {
  const bill = estimateMonthlyBill('pro', DEFAULT_USAGE);
  expect(bill.base).toBe(25);
  expect(bill.items.map(item => item.amount)).toEqual([1, 10, 0.5, 0.75, 1]);
  expect(bill.overage).toBe(13.25);
  expect(bill.total).toBe(38.25);
});

test('only usage above the included threshold is charged, with proportional API requests', () => {
  const bill = estimateMonthlyBill('pro', { databaseGB: 8.4, authMAU: 1001, storageGB: 9, egressGB: 24, apiRequests: 1100000 });
  expect(bill.items.map(item => item.amount)).toEqual([0.1, 0.02, 0, 0, 0.5]);
  expect(bill.total).toBe(25.62);
});

test('Free never incurs charges and identifies the resources requiring an upgrade', () => {
  const bill = estimateMonthlyBill('free', { databaseGB: 1, authMAU: 101, apiRequests: 10001 });
  expect(bill.total).toBe(0);
  expect(bill.overage).toBe(0);
  expect(bill.exceedsFreeLimit).toBe(true);
  expect(bill.blockedMetrics).toEqual(['databaseGB', 'authMAU', 'apiRequests']);
});

test('Team quotas are shared across projects, not multiplied by project count', () => {
  const bill = estimateMonthlyBill('team', { databaseGB: 21, authMAU: 5001 });
  expect(bill.total).toBe(99.27);
});

test('empty fields can be edited and count as zero in an estimate', () => {
  expect(estimateMonthlyBill('pro', { databaseGB: '' }).total).toBe(25);
});

test.each([
  { databaseGB: -1 }, { storageGB: Infinity }, { egressGB: 'not a number' },
  { authMAU: 1000.5 }, { apiRequests: 2.3 }, { authMAU: true }, { databaseGB: 1e15 },
])('rejects invalid usage instead of displaying a misleading bill: %p', usage => {
  expect(() => estimateMonthlyBill('pro', usage)).toThrow(RangeError);
});

test('rejects unknown plans', () => expect(() => estimateMonthlyBill('unknown', {})).toThrow(RangeError));
