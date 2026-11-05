import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Pricing from './pricing';
import { METRICS } from '../lib/pricing';

function renderPricing() {
  render(<MemoryRouter initialEntries={['/pricing']}><Pricing /></MemoryRouter>);
  return screen.getByRole('region', { name: /a clearer view/i });
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test('the example Pro estimate separates the subscription from itemized usage charges', () => {
  const estimator = renderPricing();

  expect(screen.getByLabelText('Estimated monthly total')).toHaveTextContent('$38.25');
  expect(within(estimator).getByText('Monthly subscription')).toBeInTheDocument();
  expect(within(estimator).getByText('$25.00')).toBeInTheDocument();
  expect(within(estimator).getByText('Usage overages')).toBeInTheDocument();
  expect(within(estimator).getByText('$13.25')).toBeInTheDocument();
  expect(within(estimator).getByText('500 MAU above included')).toBeInTheDocument();
  expect(within(estimator).getByText('$10.00')).toBeInTheDocument();
  expect(within(estimator).getByText('10 GB above included')).toBeInTheDocument();
  expect(within(estimator).getByText('$0.50')).toBeInTheDocument();
  expect(within(estimator).getAllByText('$1.00')).toHaveLength(2);
  expect(within(estimator).getByText('$0.75')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('reducing active users to the included allowance removes only the auth surcharge', () => {
  const estimator = renderPricing();
  fireEvent.change(screen.getByLabelText('Monthly active auth users'), { target: { value: '1000' } });

  expect(screen.getByLabelText('Estimated monthly total')).toHaveTextContent('$28.25');
  expect(within(estimator).getByText('$3.25')).toBeInTheDocument();
  expect(within(estimator).queryByText('500 MAU above included')).not.toBeInTheDocument();
  expect(within(estimator).queryByText('$10.00')).not.toBeInTheDocument();
  expect(within(estimator).getByText('$25.00')).toBeInTheDocument();
  expect(within(estimator).getByText('10 GB above included')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('Free usage above the hard limits requires an upgrade instead of quoting a zero bill', () => {
  const estimator = renderPricing();
  fireEvent.change(screen.getByLabelText('Choose a plan'), { target: { value: 'free' } });

  const total = screen.getByLabelText('Estimated monthly total');
  expect(total).toHaveTextContent('Upgrade required');
  expect(total).not.toHaveTextContent(/\$\d/);
  expect(within(estimator).getByText('Not available')).toBeInTheDocument();
  expect(within(estimator).getByText(/Above the Free allowance:/)).toBeInTheDocument();

  METRICS.forEach(({ inputLabel }) => {
    fireEvent.change(screen.getByLabelText(inputLabel), { target: { value: '0' } });
  });
  expect(total).toHaveTextContent('$0.00');
  expect(within(estimator).queryByText(/Above the Free allowance:/)).not.toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('negative or fractional active-user counts hide the stale total until corrected', () => {
  const estimator = renderPricing();
  const activeUsers = screen.getByLabelText('Monthly active auth users');
  const total = screen.getByLabelText('Estimated monthly total');

  ['-1', '1.5'].forEach((value) => {
    fireEvent.change(activeUsers, { target: { value } });
    expect(activeUsers).toHaveAttribute('aria-invalid', 'true');
    expect(total).toHaveTextContent('Check your usage');
    expect(total).not.toHaveTextContent(/\$\d/);
    expect(within(estimator).getByRole('alert')).toBeInTheDocument();
    expect(within(estimator).queryByText('Usage breakdown')).not.toBeInTheDocument();
  });

  fireEvent.change(activeUsers, { target: { value: '1000' } });
  expect(activeUsers).toHaveAttribute('aria-invalid', 'false');
  expect(total).toHaveTextContent('$28.25');
  expect(within(estimator).queryByRole('alert')).not.toBeInTheDocument();
});
