
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { LineChart, Line } from "recharts";
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA336A", "#f6bbee", "#0a843f", "#AA6633", "#6633AA", "#2a5941"];
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

export function SpendingLineChart({ data }) {
  if (!data || data.length === 0) {
    return <p>No spending trend data available.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export const SpendingBarChart = ({ data }) => {
  if (!data || data.length === 0) return <p>No data to display</p>;
  console.log("Chart Data:", data)
  return (
    // minHeight ensures the container isn't 0px on load
    <div style={{ width: '100%', minHeight: '300px', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            fontSize={12} 
            tick={{ fill: '#666' }} 
            interval={0}
          />
          <YAxis fontSize={12} tick={{ fill: '#666' }} />
          <Tooltip 
            formatter={(val) => `$${Number(val).toFixed(2)}`}
            cursor={{ fill: '#f3f4f6' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
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

export function TotalAmount({ transactions, selectedDate }) {
  const month = selectedDate.getMonth();
  const year = selectedDate.getFullYear();
  const monthTxns = (transactions || []).filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === month && date.getFullYear() === year;
  });

}

export function SpendingPieAgg({ data }) {
  if (!data || data.length === 0) return <p>No spending data yet</p>;

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}>
      <PieChart width={290} height={320} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <Pie data={data} cx="50%" cy="50%" outerRadius={85} dataKey="value" nameKey="name" label>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}