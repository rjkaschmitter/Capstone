export function normalizeTransactions(transactions) {
  return (transactions || [])
    .filter((t) => !t.pending)
    .map((t) => {
      const amount = Number(t.amount) || 0;
      const spending = amount > 0 ? amount : 0;

      const category =
        t.personal_finance_category?.primary ||
        (Array.isArray(t.category) ? t.category[0] : null) ||
        "Other";

      return { ...t, amount, spending, category };
    });
}

export function totalSpent(transactions) {
  const tx = normalizeTransactions(transactions);
  return tx.reduce((sum, t) => sum + t.spending, 0);
}

export function spendingByCategory(transactions) {
  const tx = normalizeTransactions(transactions);

  const buckets = new Map();
  for (const t of tx) {
    if (t.spending <= 0) continue;
    buckets.set(t.category, (buckets.get(t.category) || 0) + t.spending);
  }

  return Array.from(buckets.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}