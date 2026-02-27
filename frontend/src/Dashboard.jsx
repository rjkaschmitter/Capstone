import { useEffect, useState } from "react";
import Sidebar from "./sidebar.jsx";
import { SpendingPie, TotalAmount } from "./DashboardComponents";
import ProgressBar from "./Progressbar.jsx";
import "./Dashboard.css";




export default function Dashboard() {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
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

    fetchTransactions();

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

    fetch("http://localhost:8000/api/transactions/", {
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => setTransactions(data));



  }, []);
  const plaidCurrent = accounts.reduce((sum, a) => sum + (Number(a.balances?.current) || 0), 0);
  const totalAvailable = accounts.reduce((sum, a) => sum + (Number(a.balances?.available) || 0), 0);
  const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalCurrent = plaidCurrent - totalSpent;

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
            <p>Total Current Balance: ${totalCurrent.toFixed(2)}</p>
            <p>Total spending: ${totalSpent.toFixed(2)}</p>
            <TotalAmount transactions={transactions} />
          </div>

          <div className="dashboard-card">
            <h2>Budget Overview</h2>
            <SpendingPie transactions={transactions} />
            <p>Total Spending: ${totalSpent.toFixed(2)}</p>
          </div>

          <div className="dashboard-card">
            <h2>Progress For the Month</h2>
            <p>Entertainment:</p>
            <ProgressBar completed={75} />
            <p>Food:</p>
            <ProgressBar completed={50} />
            <p>Transportation:</p>
            <ProgressBar completed={30} />
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
            {transactions.length === 0 ? (
              <p>No transactions yet.</p>
            ) : (
              <ul>
                {transactions.slice(0, 10).map((t) => (
                  <li key={t.id}>
                    {t.date}: {t.name} — ${Number(t.amount).toFixed(2)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}