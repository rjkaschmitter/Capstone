
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA336A"];
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

export function TotalAmount({ transactions }) {
  const normalized = normalizeTransactions(transactions);
  const spent = totalSpent(transactions);

  const pendingCount = (transactions || []).filter(t => t.pending).length;
  const rawPositive = (transactions || []).reduce((s, t) => s + (Number(t.amount) > 0 ? Number(t.amount) : 0), 0);

  const biggest = [...normalized]
    .sort((a, b) => b.spending - a.spending)
    .slice(0, 10);

  return (
    <div>
      <h2>Total Spent</h2>
      <p>${spent.toFixed(2)}</p>
    </div>
  );

  
  /*const spent = totalSpent(transactions);

  return (
    <div>
      <h2>Total Spent</h2>
      <p>${spent.toFixed(2)}</p>
    </div>
  );*/
}

// 3) Pie chart: use spendingByCategory (same logic as total)
export function SpendingPieAgg({ data }) {
  if (!data || data.length === 0) return <p>No spending data yet</p>;

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}>
      <PieChart width={290} height={320}>
        <Pie data={data} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}