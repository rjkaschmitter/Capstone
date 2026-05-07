import { useEffect, useState } from "react";
import Sidebar from "./sidebar.jsx";
import { SpendingPieAgg, SpendingBarChart, SpendingLineChart } from "./DashboardComponents";
import ProgressBar from "./Progressbar.jsx";
import "./Dashboard.css";

export default function Dashboard() {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [level, setLevel] = useState(2);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [whatIfEnabled, setWhatIfEnabled] = useState(false);
  const [whatIfAmount, setWhatIfAmount] = useState("");
  const [whatIfCategory, setWhatIfCategory] = useState("");
  const [transLimit, setTransLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [report, setReport] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [goalCategory, setGoalCategory] = useState("");
  const [amountSaved, setAmountSaved] = useState("");
  const [goalPlan, setGoalPlan] = useState(null);
  const [appliedCuts, setAppliedCuts] = useState({});
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [budgets, setBudgets] = useState([]);

  const DEFAULT_WIDGETS = {
    balances: true,
    pie: true,
    bar: true,
    line: true,
    progress: true,
    recent: true,
    whatIf: true,
    savings: true,
  };

  const [visibleWidgets, setVisibleWidgets] = useState(() => {
    const saved = localStorage.getItem("dashboardWidgets");
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });

  useEffect(() => {
    localStorage.setItem("dashboardWidgets", JSON.stringify(visibleWidgets));
  }, [visibleWidgets]);

  function toggleWidget(widgetKey) {
    setVisibleWidgets((prev) => ({
      ...prev,
      [widgetKey]: !prev[widgetKey],
    }));
  }

  useEffect(() => {
    function handleBudgetUpdate() {
      setRefreshKey((prev) => prev + 1);
    }

    window.addEventListener("storage", handleBudgetUpdate);

    return () => {
      window.removeEventListener("storage", handleBudgetUpdate);
    };
  }, []);

  const whatIfAmountNum = Number(whatIfAmount) || 0;

  function showToast(message) {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 3000);
  }

  async function fetchDashboard(y = year, m = month) {
    const res = await fetch(`http://localhost:8000/api/dashboard/?year=${y}&month=${m}`, {
      credentials: "include",
    });
    const data = await res.json();
    setDash(data);
  }

  async function handleSimulateSpending() {
    try {
      const res = await fetch("http://localhost:8000/api/simulate-spending/", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        const pollInterval = setInterval(() => {
          console.log("Polling for new transactions...");
          setRefreshKey(prev => prev + 1);
        }, 5000);

        setTimeout(() => {
          clearInterval(pollInterval);
          console.log("Polling stopped.");
        }, 65000);

        showToast("New transactions will show up.");
      }
    } catch (err) {
      console.error("Simulation failed:", err);
    }
  }

  const [dash, setDash] = useState(null);
  async function fetchTransactions() {
    const res = await fetch("http://localhost:8000/api/transactions/", {
      credentials: "include",
    });
    const data = await res.json();
    setTransactions(data);
  }

  function handleGenerateReport() {
    const categories = (scenarioRemaining || [])
      .filter((r) => Number(r.budget) > 0)
      .map((r) => {
        const budget = Number(r.budget || 0);
        const remainingAmt = Number(r.remaining || 0);
        const usedPct = Number(r.percent_used || 0);
        const spentAmt = budget - remainingAmt;

        return {
          category: r.category,
          budget,
          spent: spentAmt,
          remaining: remainingAmt,
          percentUsed: usedPct,
          overBudget: remainingAmt < 0,
        };
      });

    const overBudgetCategories = categories.filter((c) => c.overBudget);
    const largestCategory =
      [...(scenarioByCategory || [])]
        .map((c) => ({
          category: c.category ?? c.name,
          amount: Number(c.amount ?? c.value ?? 0),
        }))
        .sort((a, b) => b.amount - a.amount)[0] || null;

    const totalBudget = categories.reduce((sum, c) => sum + c.budget, 0);
    const totalRemaining = categories.reduce((sum, c) => sum + c.remaining, 0);

    const reportData = {
      generatedAt: new Date().toLocaleString(),
      month,
      year,
      totalCurrent: scenarioTotalCurrent,
      totalSpent: scenarioTotalSpent,
      totalBudget,
      totalRemaining,
      overBudgetCount: overBudgetCategories.length,
      overBudgetCategories,
      largestCategory,
      categories,
      includesWhatIf: whatIfEnabled && !!whatIfCategory && whatIfAmountNum > 0,
      whatIfDetails:
        whatIfEnabled && !!whatIfCategory && whatIfAmountNum > 0
          ? {
            category: whatIfCategory,
            amount: whatIfAmountNum,
          }
          : null,
    };

    setReport(reportData);
    setShowReport(true);
  }

  const CATEGORY_FLEXIBILITY = {
    Rent: 0.1,
    Bills: 0.1,
    Utilities: 0.25,
    Groceries: 0.45,
    Fuel: 0.4,
    Transportation: 0.4,
    Dining: 0.9,
    Housing: 0.1,
    "Dine In": 0.95,
    "Fast Food": 0.95,
    Drinks: 0.95,
    Entertainment: 0.9,
    Shopping: 0.85,
    Streaming: 0.95,
    Subscriptions: 0.95,
    Health: 0.2,
    "Ride Share": 0.95,
    Airlines: 0.9,
    Other: 0.5,
  };

  function getFlexibilityWeight(category) {
    return CATEGORY_FLEXIBILITY[category] ?? 0.5;
  }
  function handleSavingsAdvice() {
    const target = Number(goalAmount) || 0;
    const saved = Number(amountSaved) || 0;

    if (!goalName || !goalCategory || target <= 0) {
      showToast("Please enter an item, category, and valid amount.");
      return;
    }

    if (saved < 0 || saved > target) {
      showToast("Saved amount must be between 0 and the item cost.");
      return;
    }

    const amountStillNeeded = Math.max(0, target - saved);

    const selectedSpentData = (scenarioByCategory || []).find(
      (c) => String(c.name ?? "").trim() === String(goalCategory).trim()
    );

    const currentSpent = Number(selectedSpentData?.value ?? 0);

    const selectedBudgetData = (scenarioRemaining || []).find(
      (r) => r.category === goalCategory
    );

    console.log("goalCategory:", goalCategory);
    console.log("scenarioByCategory:", scenarioByCategory);
    const categoryBudget = Number(selectedBudgetData?.budget || 0);

    const monthlyAvailable = Math.max(0, categoryBudget - currentSpent);

    const monthsNeeded =
      monthlyAvailable > 0
        ? Math.ceil(amountStillNeeded / monthlyAvailable)
        : null;


    const latestTransactionDay = monthlyTransactions.length > 0
      ? Math.max(
        ...monthlyTransactions
          .filter((t) => t.date)
          .map((t) => new Date(t.date).getDate())
      )
      : new Date().getDate();
    const reductionSuggestions = (scenarioRemaining || [])
      .filter((r) => Number(r.budget) > 0 && r.category !== goalCategory)
      .map((r) => {
        const category = r.category;
        const budget = Number(r.budget || 0);
        const remaining = Number(r.remaining || 0);
        const percentUsed = Number(r.percent_used || 0);
        const spent = Math.max(0, budget - remaining);
        const flexibility = getFlexibilityWeight(category);

        const currentDay = latestTransactionDay;

        const daysInMonth = new Date(year, month, 0).getDate();

        const projectedMonthlySpend =
          currentDay > 0 ? (spent / currentDay) * daysInMonth : spent;

        const safetyBuffer = budget * 0.15;

        const maxRealisticCut = Math.max(
          0,
          budget - projectedMonthlySpend - safetyBuffer
        );

        if (
          budget <= 0 ||
          spent <= 0 ||
          maxRealisticCut <= 0 ||
          percentUsed >= 90
        ) {
          return null;
        }

        const suggestedCut = Math.max(
          0,
          Math.min(
            budget * 0.1,
            flexibility * spent,
            maxRealisticCut
          )
        );

        const pressureBonus =
          remaining < 0
            ? 2.0
            : percentUsed >= 100
              ? 1.5
              : percentUsed >= 90
                ? 1.2
                : percentUsed >= 75
                  ? 1.0
                  : 0.7;

        const cutScore = suggestedCut * flexibility * pressureBonus;

        const monthsSaved =
          monthlyAvailable > 0 ? suggestedCut / monthlyAvailable : 0;

        return {
          category,
          budget,
          remaining,
          percentUsed,
          spent,
          flexibility,
          projectedMonthlySpend,
          safetyBuffer,
          maxRealisticCut,
          suggestedCut,
          cutScore,
          monthsSaved,
        };
      })
      .filter(Boolean)
      .filter((c) => c.suggestedCut > 0)
      .sort((a, b) => b.cutScore - a.cutScore)
      .slice(0, 3);
    const projectedInsights = reductionSuggestions.map((cat) => {
      const projected = cat.projectedMonthlySpend;
      const safeMargin = cat.budget - projected;
      const buffer = cat.safetyBuffer;

      return {
        category: cat.category,
        message:
          projected + buffer < cat.budget
            ? `At your current pace, you are projected to spend about $${projected.toFixed(2)} in ${cat.category} this month, which is below your $${cat.budget.toFixed(2)} budget. This means you have room to reduce this category without risking going over budget.`
            : `At your current pace, ${cat.category} may need most of its budget this month, so a cut is not recommended right now.`,
      };
    });

    const adviceMessages = reductionSuggestions.map((cat) => {
      const newMonthlyAvailable = monthlyAvailable + cat.suggestedCut;
      const newMonthsNeeded =
        newMonthlyAvailable > 0
          ? Math.ceil(amountStillNeeded / newMonthlyAvailable)
          : null;

      if (monthsNeeded && newMonthsNeeded && newMonthsNeeded < monthsNeeded) {
        return `Cutting about $${cat.suggestedCut.toFixed(2)} from ${cat.category} each month could reduce your timeline from ${monthsNeeded} month(s) to about ${newMonthsNeeded} month(s).`;
      }

      return `${cat.category} looks flexible enough to reduce by about $${cat.suggestedCut.toFixed(2)} per month.`;
    });
    const totalSuggestedCut = reductionSuggestions.reduce(
      (sum, c) => sum + c.suggestedCut,
      0
    );

    const boostedMonthlyAvailable = monthlyAvailable + totalSuggestedCut;

    const boostedMonthsNeeded =
      boostedMonthlyAvailable > 0
        ? Math.ceil(amountStillNeeded / boostedMonthlyAvailable)
        : null;

    let scenarioMessage = "";

    if (amountStillNeeded <= 0) {
      scenarioMessage = `You already have enough saved for "${goalName}".`;
    } else if (monthsNeeded && boostedMonthsNeeded && boostedMonthsNeeded < monthsNeeded) {
      scenarioMessage = `If you reduce your top recommended categories by about $${totalSuggestedCut.toFixed(2)} total per month, you could shorten the timeline from ${monthsNeeded} month(s) to about ${boostedMonthsNeeded} month(s).`;
    } else if (totalSuggestedCut > 0) {
      scenarioMessage = `You may be able to free up about $${totalSuggestedCut.toFixed(2)} per month by trimming flexible categories.`;
    }

    let predictionMessage = "";

    if (amountStillNeeded <= 0) {
      predictionMessage = `You already have enough saved for "${goalName}".`;
    } else if (monthlyAvailable > 0) {
      predictionMessage = `At your current ${goalCategory} spending rate, it may take about ${monthsNeeded} month(s) to afford "${goalName}".`;
    } else {
      predictionMessage = `At your current ${goalCategory} spending rate, there is no room left in this month’s budget to estimate a savings timeline.`;
    }

    setGoalPlan({
      name: goalName,
      amount: target,
      amountSaved: saved,
      category: goalCategory,
      amountStillNeeded,
      currentSpent,
      categoryBudget,
      monthlyAvailable,
      monthsNeeded,
      reductionSuggestions,
      projectedInsights,
      adviceMessages,
      predictionMessage,
    });
  }

  async function applyBudgetAdjustment(category, cutAmount) {
    const cutKey = `${year}-${month}-${category}-${cutAmount}`;

    if (appliedCuts[cutKey]) {
      showToast("You already applied this budget cut.");
      return;
    }


    const res = await fetch("http://localhost:8000/api/budgets/adjust/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category,
        adjustment: -cutAmount,
        year,
        month,
      }),
    });

    if (!res.ok) {
      showToast("Could not apply budget adjustment.");
      return;
    }

    setAppliedCuts((prev) => ({
      ...prev,
      [cutKey]: true,
    }));

    showToast(
      `${category} budget for ${month}/${year} reduced by $${cutAmount.toFixed(2)}.`
    );
  }

  async function addTransaction(e) {
    e.preventDefault();

    const body = {
      name,
      amount,
      date,
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
  }

  useEffect(() => {
    async function updateAllData() {
      const accRes = await fetch("http://localhost:8000/api/plaid_accounts/", { credentials: "include" });
      const accData = await accRes.json();
      setAccounts(accData.accounts || []);

      await fetchTransactions();

      await fetchDashboard(year, month);
    }

    updateAllData();
  }, [year, month, refreshKey]);
  useEffect(() => {
    setTransLimit(10);
  }, [searchTerm, selectedCategory, year, month]);

  const monthlyTransactions = transactions.filter((t) => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getFullYear() === year && (d.getMonth() + 1) === month;
  });
  const recentActivityCategories = Array.from(
    new Set(
      monthlyTransactions
        .map((t) => t.category)
        .filter(Boolean)
    )
  ).sort();
  const filteredTransactions = monthlyTransactions.filter((t) => {
    const matchesSearch =
      (t.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" || t.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const spendingTrendData = (() => {
    const dailyTotals = new Map();

    monthlyTransactions.forEach((t) => {
      if (!t.date) return;
      const day = new Date(t.date).getDate();
      const amount = Number(t.amount) || 0;
      dailyTotals.set(day, (dailyTotals.get(day) || 0) + amount);
    });

    return Array.from(dailyTotals.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, amount]) => ({
        day: `Day ${day}`,
        amount,
      }));
  })();

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const ad = new Date(a.date).getTime();
    const bd = new Date(b.date).getTime();
    return bd - ad;
  });

  const displayedTransactions = sortedTransactions.slice(0, transLimit);

  const plaidCurrent = accounts.reduce((sum, a) => sum + (Number(a.balances?.current) || 0), 0);
  const totalSpent = dash ? Number(dash.total_spent) : 0;
  const byCategory = dash
    ? (dash.by_category || []).map((c) => ({
      category: c.category ?? c.name,
      amount: Number(c.amount ?? c.value ?? 0),
      name: c.name ?? c.category,
      value: Number(c.value ?? c.amount ?? 0),
    }))
    : [];
  const remaining = dash ? dash.remaining_by_category : [];

  const categoryOptions = Array.from(new Set([...(byCategory || []).map((c) => c.category), ...(remaining || []).map((r) => r.category)])).filter(Boolean);

  const scenarioTotalSpent = totalSpent + (whatIfEnabled && whatIfCategory ? whatIfAmountNum : 0);
  const scenarioTotalCurrent = plaidCurrent - scenarioTotalSpent;
  const scenarioByCategory = (() => {
    if (!whatIfEnabled || !whatIfCategory || whatIfAmountNum <= 0) return byCategory;

    const normalized = (byCategory || [])
      .map((c) => {
        const cat = c.category;
        const amt = Number(c.amount) || 0;
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
      console.log("Reset successful:");
    }
    catch (err) {
      console.error("Error resetting data:", err);
      showToast("Failed to reset data: " + err.message);
      return;
    }
  };


  return (
    <div className="dashboard-layout">
      {toast && <div className="toast">{toast}</div>}
      <Sidebar />

      <div className="dashboard-content">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
        </header>

        <div className="dashboard-grid">
          <div className="dashboard-card wide-card">
            <h2>Customize Dashboard</h2>

            <div className="widget-dropdown">
              <button
                type="button"
                className="widget-dropdown-button"
                onClick={() => setShowWidgetMenu((prev) => !prev)}
              >
                Choose Widgets ▾
              </button>

              {showWidgetMenu && (
                <div className="widget-dropdown-menu">
                  {[
                    ["balances", "Account Balances"],
                    ["pie", "Spending Distribution"],
                    ["bar", "Volume by Category"],
                    ["line", "Spending Trend"],
                    ["progress", "Monthly Progress"],
                    ["recent", "Recent Activity"],
                    ["whatIf", "What-If Expense"],
                    ["savings", "Savings Advice"],
                  ].map(([key, label]) => (
                    <label key={key} className="widget-dropdown-item">
                      <input
                        type="checkbox"
                        checked={visibleWidgets[key]}
                        onChange={() => toggleWidget(key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          {visibleWidgets.balances && (
            <div className="dashboard-card">
              <h2>Account Balances</h2>
              <p>Total Current Balance: ${scenarioTotalCurrent.toFixed(2)}</p>
              <p>Total spending: ${scenarioTotalSpent.toFixed(2)}</p>
            </div>
          )}
          {visibleWidgets.pie && (
            <div className="dashboard-card wide-card">
              <h2>Spending Distribution</h2>
              <div className="chart-box">
                <SpendingPieAgg
                  data={scenarioByCategory}
                  transactions={monthlyTransactions}
                />
              </div>
            </div>
          )}
          {visibleWidgets.bar && (
            <div className="dashboard-card wide-card">
              <h2>Volume by Category</h2>
              <div className="chart-box">
                <SpendingBarChart data={scenarioByCategory} />
              </div>
            </div>
          )}
          {visibleWidgets.line && (
            <div className="dashboard-card wide-card">
              <h2>Spending Trend</h2>
              <div className="chart-box">
                <SpendingLineChart data={spendingTrendData} />
              </div>
            </div>
          )}
          {visibleWidgets.progress && (
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
                            ${Number(r.remaining).toFixed(2)} left ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <ProgressBar
                          completed={pct}
                          status={
                            pctRaw >= 100
                              ? "danger"
                              : pctRaw >= 80
                                ? "warning"
                                : "safe"
                          }
                        />
                      </div>
                    );
                  })
              )}
            </div>
          )}
          {visibleWidgets.recent && (
            <div className="dashboard-card">
              <h2>Recent Activity</h2>
              <button type="button" onClick={deleteAllBudgetsAndTransactions}>
                Delete All Budgets and Transactions
              </button>
              <button
                type="button"
                onClick={handleSimulateSpending}
              >
                Simulate New Spending
              </button>
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
                <button type="submit">Add Transaction</button>
              </form>
              <button type="button" onClick={handleGenerateReport}>
                Generate Report
              </button>

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
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ flex: 1, minWidth: 180 }}
                />

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {recentActivityCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <label style={{ fontSize: 14 }}>Show:</label>

                <select
                  value={transLimit}
                  onChange={(e) => setTransLimit(Number(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <p style={{ fontSize: 14, marginBottom: 8 }}>
                Showing {displayedTransactions.length} of {filteredTransactions.length} matching transaction(s)
              </p>

              {displayedTransactions.length === 0 ? (
                <p>No transactions match your filters for {year}-{String(month).padStart(2, "0")}.</p>
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
          )}
          {visibleWidgets.whatIf && (
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
          )}
          {visibleWidgets.savings && (
            <div className="dashboard-card">
              <h2>Savings Advice & Prediction</h2>

              <div style={{ display: "grid", gap: 10 }}>
                <input
                  type="text"
                  placeholder="Item name"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                />

                <input
                  type="number"
                  placeholder="Item cost"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />

                <select
                  value={goalCategory}
                  onChange={(e) => setGoalCategory(e.target.value)}
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Amount already saved (optional)"
                  value={amountSaved}
                  onChange={(e) => setAmountSaved(e.target.value)}
                  min="0"
                  step="0.01"
                />

                <button type="button" onClick={handleSavingsAdvice}>
                  Get Advice
                </button>
              </div>

              {goalPlan && (
                <div style={{ marginTop: 12 }}>
                  <p><strong>Prediction:</strong> {goalPlan.predictionMessage}</p>
                  <p><strong>Amount still needed:</strong> ${goalPlan.amountStillNeeded.toFixed(2)}</p>
                  <p><strong>Current {goalPlan.category} spending:</strong> ${goalPlan.currentSpent.toFixed(2)}</p>
                  <p><strong>{goalPlan.category} budget:</strong> ${goalPlan.categoryBudget.toFixed(2)}</p>
                  <p><strong>Monthly room in category:</strong> ${goalPlan.monthlyAvailable.toFixed(2)}</p>

                  {goalPlan.projectedInsights?.length > 0 && (
                    <>
                      <p><strong>Savings Insight:</strong></p>

                      {goalPlan.projectedInsights.map((insight) => (
                        <p key={insight.category}>
                          {insight.message}
                        </p>
                      ))}
                    </>
                  )}
                  {goalPlan.reductionSuggestions.length > 0 && (
                    <>
                      <p><strong>Recommended Budget Adjustments:</strong></p>

                      <div className="cut-list">
                        {goalPlan.reductionSuggestions.map((cat, idx) => {
                          const cutKey = `${year}-${month}-${cat.category}-${cat.suggestedCut}`;

                          return (
                            <div key={idx} className="cut-card">
                              <div>
                                <strong>{cat.category}</strong>

                                <p>
                                  Suggested adjustment for {month}/{year}:{" "}
                                  <strong>${cat.suggestedCut.toFixed(2)}</strong>
                                </p>

                                <p>
                                  Projected spending this month:{" "}
                                  ${cat.projectedMonthlySpend.toFixed(2)}
                                </p>
                              </div>

                              <button
                                type="button"
                                disabled={appliedCuts[cutKey]}
                                onClick={() =>
                                  applyBudgetAdjustment(cat.category, cat.suggestedCut)
                                }
                              >
                                {appliedCuts[cutKey] ? "Applied" : "Apply This Month"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {goalPlan.adviceMessages.length > 0 && (
                    <>
                      <p><strong>Advice:</strong></p>
                      <ul>
                        {goalPlan.adviceMessages.map((msg, idx) => (
                          <li key={idx}>{msg}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {showReport && report && (
          <div className="dashboard-card" style={{ marginTop: 20 }}>
            <h2>Monthly Snapshot Report</h2>
            <p><strong>Month:</strong> {report.month}/{report.year}</p>
            <p><strong>Total Current Balance:</strong> ${report.totalCurrent.toFixed(2)}</p>
            <p><strong>Total Spent:</strong> ${report.totalSpent.toFixed(2)}</p>
            <p><strong>Total Budget:</strong> ${report.totalBudget.toFixed(2)}</p>
            <p><strong>Total Remaining:</strong> ${report.totalRemaining.toFixed(2)}</p>

            {report.largestCategory && (
              <p>
                <strong>Largest Spending Category:</strong> {report.largestCategory.category}
                {" "} (${report.largestCategory.amount.toFixed(2)})
              </p>
            )}

            <p><strong>Categories Over Budget:</strong> {report.overBudgetCount}</p>
            <p><strong>Category Breakdown:</strong></p>
            <ul>
              {report.categories.map((c) => (
                <li key={c.category}>
                  {c.category}: Spent ${c.spent.toFixed(2)} | Budget ${c.budget.toFixed(2)} |
                  Remaining ${c.remaining.toFixed(2)} | Used {c.percentUsed.toFixed(1)}%
                  {c.overBudget ? " | Over Budget" : ""}
                </li>
              ))}
            </ul>

            <button type="button" onClick={() => setShowReport(false)}>
              Close Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}