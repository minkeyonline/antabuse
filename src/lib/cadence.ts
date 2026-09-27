export type Cadence = "weekly" | "monthly" | "yearly";

export function addPeriod(d: Date, cadence: Cadence, n = 1) {
  const r = new Date(d);
  if (cadence === "weekly") r.setUTCDate(r.getUTCDate() + 7 * n);
  else if (cadence === "monthly") r.setUTCMonth(r.getUTCMonth() + n);
  else r.setUTCFullYear(r.getUTCFullYear() + n);
  return r;
}

/** Start of the billing period that contains `now`, anchored on `startedAt`. */
export function currentPeriodStart(startedAt: Date, cadence: Cadence, now = new Date()) {
  let start = new Date(startedAt);
  if (now < start) return start;
  // Step forward until the next period would pass `now`.
  for (let i = 0; i < 10_000; i++) {
    const next = addPeriod(startedAt, cadence, i + 1);
    if (next > now) return start;
    start = next;
  }
  return start;
}

/** When the next charge is due: the current period's start if not charged yet this period, else the next period. */
export function nextChargeDate(startedAt: Date, cadence: Cadence, lastChargedAt: Date | null, now = new Date()) {
  const periodStart = currentPeriodStart(startedAt, cadence, now);
  if (!lastChargedAt || lastChargedAt < periodStart) return periodStart;
  return addPeriod(periodStart, cadence);
}
