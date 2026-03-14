import { useEffect, useState } from "react";
import Sidebar from "./sidebar.jsx";
import { SpendingPieAgg, TotalAmount } from "./DashboardComponents";
import ProgressBar from "./Progressbar.jsx";
import "./Dashboard.css";

export default function Dashboard() {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [whatIfEnabled, setWhatIfEnabled] = useState(false);
  const [whatIfAmount, setWhatIfAmount] = useState("");
  const [whatIfCategory, setWhatIfCategory] = useState("");
  const [transSort, setTransSort] = useState("date_desc");
  const [transLimit, setTransLimit] = useState(10);

  const whatIfAmountNum = Number(whatIfAmount) || 0;


  async function fetchDashboard(y = year, m = month) {
    const res = await fetch(`http://localhost:8000/api/dashboard/?year=${y}&month=${m}`, {
      credentials: "include",
    });
    const data = await res.json();
    setDash(data);
  }

  const [dash, setDash] = useState(null);
  async function fetchTransactions() {
    const res = await fetch("http://localhost:8000/api/transactions/", {
      credentials: "include",
    });
    const data = await res.json();
    setTransactions(data);
  }


  async function addTransaction(e) {
    e.preventDefault();


    const body = {
      name,
      amount,
      date,
      category,
    };

    const res = await fetch("http://localhost:8000/api/transactions/add/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log("Added:", data);


    await fetchTransactions();
    await fetchDashboard();


    setName("");
    setAmount("");
    setDate("");
    setCategory("");
  }

  useEffect(() => {
    fetch("http://localhost:8000/api/plaid_accounts/", {
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => setAccounts(data.accounts || []));

    fetchTransactions();
    fetchDashboard();
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [year, month]);

  const monthlyTransactions = (transactions || []).filter((t) => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getFullYear() === year && (d.getMonth() + 1) === month;
  });

  const sortedTransactions = [...monthlyTransactions].sort((a, b) => {
    const ad = new Date(a.date).getTime();
    const bd = new Date(b.date).getTime();
    return transSort === "date_asc" ? ad - bd : bd - ad;
  });

  const displayedTransactions = sortedTransactions.slice(0, transLimit);

  const plaidCurrent = accounts.reduce((sum, a) => sum + (Number(a.balances?.current) || 0), 0);
  const totalAvailable = accounts.reduce((sum, a) => sum + (Number(a.balances?.available) || 0), 0);
  const totalSpent = dash ? Number(dash.total_spent) : 0;
  const byCategory = dash ? dash.by_category : [];
  const remaining = dash ? dash.remaining_by_category : [];
  const totalCurrent = plaidCurrent - totalSpent;
  const topProgress = (remaining || [])
    .filter(r => r.budget > 0)
    .sort((a, b) => (b.percent_used ?? 0) - (a.percent_used ?? 0))
    .slice(0, 3);

  const categoryOptions = Array.from(new Set([...(byCategory || []).map((c) => c.category), ...(remaining || []).map((r) => r.category)])).filter(Boolean);

  const scenarioTotalSpent = totalSpent + (whatIfEnabled && whatIfCategory ? whatIfAmountNum : 0);
  const scenarioTotalCurrent = plaidCurrent - scenarioTotalSpent;
  const scenarioByCategory = (() => {
    if (!whatIfEnabled || !whatIfCategory || whatIfAmountNum <= 0) return byCategory;

    const normalized = (byCategory || [])
      .map((c) => {
        const cat =
          c.category ?? c.name ?? c.label ?? c.key ?? c.type;
        const amt = Number(
          c.amount ?? c.total ?? c.spent ?? c.value ?? c.sum ?? 0
        );
        return cat ? { category: String(cat), amount: amt } : null;
      })
      .filter(Boolean);

    const map = new Map(normalized.map((x) => [x.category, x.amount]));

    map.set(whatIfCategory, (map.get(whatIfCategory) || 0) + whatIfAmountNum);

    return Array.from(map.entries()).map(([category, amount]) => ({
      category,
      amount,
      name: category,
      value: amount,
    }));
  })();

  const scenarioRemaining = (() => {
    if (!whatIfEnabled || !whatIfCategory || whatIfAmountNum <= 0) return remaining;
    return (remaining || []).map((r) => {
      if (r.category !== whatIfCategory) return r;
      const budget = Number(r.budget ?? 0);
      const baselineRemaining = Number(r.remaining ?? 0);
      const newRemaining = baselineRemaining - whatIfAmountNum;

      const percent_used = budget > 0 ? ((budget - newRemaining) / budget) * 100 : r.percent_used ?? 0;

      return { ...r, remaining: newRemaining, percent_used, };
    });
  })();

  const scenarioImpact = whatIfEnabled && whatIfCategory ? -whatIfAmountNum : 0;

  const deleteAllBudgetsAndTransactions = async () => {
    if (!window.confirm("Are you sure you want to delete all budgets and transactions? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch("http://localhost:8000/api/reset/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirm: true }),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${text}`);
      }
      const data = JSON.parse(text);
      console.log("Reset successful:", data);
    }
    catch (err) {
      console.error("Error resetting data:", err);
      alert("Failed to reset data: " + err.message);
      return;
    }
  };
  

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-content">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
        </header>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>Account Balances</h2>
            <p>Total Current Balance: ${scenarioTotalCurrent.toFixed(2)}</p>
            <p>Total spending: ${scenarioTotalSpent.toFixed(2)}</p>
            <TotalAmount transactions={transactions} selectedDate={now} />
          </div>

          <div className="dashboard-card">
            <h2>Budget Overview</h2>
            <SpendingPieAgg data={scenarioByCategory} />
            <p>Total Spending: ${scenarioTotalSpent.toFixed(2)}</p>
          </div>

          <div className="dashboard-card">
            <h2>Progress For the Month</h2>
            {!dash ? (
              <p>Loading…</p>
            ) : (scenarioRemaining || []).filter(r => Number(r.budget) > 0).length === 0 ? (
              <p>No budgets set yet.</p>
            ) : (
              (scenarioRemaining || [])
                .filter(r => Number(r.budget) > 0)
                .sort((a, b) => (b.percent_used ?? 0) - (a.percent_used ?? 0))
                .map(r => {
                  const pctRaw = Number(r.percent_used ?? 0);
                  const pct = Math.round(Math.min(100, Math.max(0, pctRaw)));
                  return (
                    <div key={r.category} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{r.category}</span>
                        <span>
                          ${Number(r.remaining).toFixed(2)} left ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <ProgressBar completed={pct} />
                    </div>
                  );
                })
            )}
          </div>

          <div className="dashboard-card">
            <h2>Recent Activity</h2>
            
            <form onSubmit={addTransaction} style={{ marginBottom: "20px" }}>
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <input
                type="text"
                placeholder="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />

              <button type="submit">Add Transaction</button>
            </form>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Year</span>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  min="2000"
                  max="2100"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Month</span>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
              </label>
               <button type="button" onClick={deleteAllBudgetsAndTransactions}>
                Delete All Budgets and Transactions
              </button>
            </div>

            {displayedTransactions.length === 0 ? (
              <p>No transactions for {year}-{String(month).padStart(2, "0")}.</p>
            ) : (
              <ul>
                {displayedTransactions.map((t) => (
                  <li key={t.id}>
                    {t.date}: {t.name} — ${Number(t.amount).toFixed(2)}{" "}
                    {t.category ? `(${t.category})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="dashboard-card">
            <h2>What-If: Hypothetical Expense</h2>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={whatIfEnabled}
                onChange={(e) => setWhatIfEnabled(e.target.checked)}
              />
              Apply to dashboard
            </label>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <select
                value={whatIfCategory}
                onChange={(e) => setWhatIfCategory(e.target.value)}
              >
                <option value="">Select category</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Amount"
                value={whatIfAmount}
                onChange={(e) => setWhatIfAmount(e.target.value)}
                min="0"
                step="0.01"
              />

              <p style={{ margin: 0 }}>
                Impact: <strong>{scenarioImpact.toFixed(2)}</strong>
              </p>

              <button
                type="button"
                onClick={() => {
                  setWhatIfEnabled(false);
                  setWhatIfAmount("");
                  setWhatIfCategory("");
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}