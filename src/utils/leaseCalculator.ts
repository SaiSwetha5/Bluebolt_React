// Operating lease / DaaS billing calculator ("LRF" — Lease Repayment Factor).
// Reproduces the "Operating lease calculator" workbook: given an asset cost,
// an annual implicit interest rate, a term, a start date and a residual
// (balloon) value, computes the level monthly payment that amortizes the
// asset down to its residual value, plus the full amortization schedule.
//
// Standard level-payment loan/lease formula with a future value (residual):
//   r  = monthly rate = annualRatePct / 100 / 12
//   n  = number of monthly payments = termYears * 12
//   PV = asset cost, FV = residual value
//   payment = (PV - FV * (1+r)^-n) * r / (1 - (1+r)^-n)

export interface LeaseAmortizationRow {
  period: number;
  paymentDate: string; // ISO yyyy-mm-dd
  beginningBalance: number;
  payment: number;
  principal: number;
  interest: number;
  endingBalance: number;
}

export interface LeaseCalculationInput {
  assetCost: number;
  annualInterestRatePct: number;
  termYears: number;
  startDate: string; // ISO yyyy-mm-dd
  residualValue: number;
}

export interface LeaseCalculationResult extends LeaseCalculationInput {
  monthlyPayment: number;
  numberOfPayments: number;
  totalInterest: number;
  totalCostOfLease: number;
  schedule: LeaseAmortizationRow[];
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Formats an ISO date (yyyy-mm-dd) as dd-mm-yyyy, matching the source workbook. */
export function fmtDMY(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
}

export function calculateOperatingLease(input: LeaseCalculationInput): LeaseCalculationResult {
  const { assetCost, annualInterestRatePct, termYears, startDate, residualValue } = input;
  const n = Math.max(Math.round(termYears * 12), 1);
  const r = annualInterestRatePct / 100 / 12;

  let payment: number;
  if (r === 0) {
    payment = (assetCost - residualValue) / n;
  } else {
    const vn = Math.pow(1 + r, -n);
    payment = ((assetCost - residualValue * vn) * r) / (1 - vn);
  }
  payment = round2(payment);

  const schedule: LeaseAmortizationRow[] = [];
  let beginningBalance = assetCost;
  for (let period = 1; period <= n; period++) {
    const interest = round2(beginningBalance * r);
    let principal = round2(payment - interest);
    let endingBalance = round2(beginningBalance - principal);
    // On the final period, absorb any rounding drift so the schedule lands
    // exactly on the residual value.
    if (period === n) {
      principal = round2(beginningBalance - residualValue);
      endingBalance = residualValue;
    }
    schedule.push({
      period,
      paymentDate: addMonthsIso(startDate, period),
      beginningBalance: round2(beginningBalance),
      payment: round2(principal + interest),
      principal,
      interest,
      endingBalance,
    });
    beginningBalance = endingBalance;
  }

  const totalInterest = round2(schedule.reduce((s, row) => s + row.interest, 0));
  const totalCostOfLease = round2(schedule.reduce((s, row) => s + row.payment, 0));

  return {
    ...input,
    monthlyPayment: payment,
    numberOfPayments: n,
    totalInterest,
    totalCostOfLease,
    schedule,
  };
}
