
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { LineChart, Line, ReferenceLine } from "recharts";
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA336A", "#f6bbee", "#0a843f", "#AA6633", "#6633AA", "#2a5941"];

export function SpendingLineChart({ data }) {
  if (!data || data.length === 0) {
    return <p>No spending trend data available.</p>;
  }

  const avg = data.reduce((sum, item) => sum + Number(item.amount || 0), 0) / data.length;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, "Spent"]} />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#8884d8"
          strokeWidth={3}
        />
        <ReferenceLine
          y={avg}
          stroke="red"
          strokeDasharray="3 3"
          label={`Avg: $${avg.toFixed(0)}`}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export const SpendingBarChart = ({ data }) => {
  if (!data || data.length === 0) return <p>No data to display</p>;

  const sortedData = [...data].sort((a, b) => b.value - a.value);
  const total = sortedData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={{ width: "100%", minHeight: "320px", height: "320px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          margin={{ top: 20, right: 20, left: 0, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            interval={0}
            height={70}
            axisLine={{ stroke: "#666" }}
            tickLine={false}
            tick={({ x, y, payload }) => (
              <text
                x={x}
                y={y + 10}
                textAnchor="end"
                fill="#666"
                fontSize={12}
                transform={`rotate(-35, ${x}, ${y + 10})`}
              >
                {payload.value}
              </text>
            )}
          />
          <YAxis fontSize={12} tick={{ fill: "#666" }} />
          <Tooltip
            formatter={(val) => {
              const percent = ((Number(val) / total) * 100).toFixed(1);
              return [`$${Number(val).toFixed(2)} (${percent}%)`, "Amount"];
            }}
            cursor={{ fill: "#f3f4f6" }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {sortedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? "#ff4d4f" : COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

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