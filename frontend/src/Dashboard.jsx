import { useEffect, useState } from "react";
import Sidebar from "./sidebar.jsx";
import { SpendingPie, TotalAmount } from "./DashboardComponents";
import ProgressBar from "./Progressbar.jsx";
import "./Dashboard.css";

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/plaid_accounts/", {
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => setAccounts(data.accounts || []));

    fetch("http://localhost:8000/api/plaid_transactions/", {
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => setTransactions(data.transactions || []));
  }, []);
  async function refreshTransactions() {
    await fetch("http://localhost:8000/api/plaid_transactions_refresh/", {
      method: "POST",
      credentials: "include",
    });

    const res = await fetch("http://localhost:8000/api/plaid_transactions/", {
      credentials: "include",
    });
    const data = await res.json();
    setTransactions(data.transactions || []);

    
  }
    const totalCurrent = accounts.reduce((sum, a) => sum + (Number(a.balances?.current) || 0), 0);
    const totalAvailable = accounts.reduce((sum, a) => sum + (Number(a.balances?.available) || 0), 0);

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
            <p>Total Available Balance: ${totalAvailable.toFixed(2)}</p>
            <TotalAmount transactions={transactions} />
          </div>

          <div className="dashboard-card">
            <h2>Budget Overview</h2>
            <SpendingPie transactions={transactions} />
            <p>Total Spending for the month: $1,700</p>
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

            <button onClick={refreshTransactions}>
              Refresh Transactions (Sandbox)
            </button>

            {transactions.length === 0 ? (
              <p>No transactions yet.</p>
            ) : (
              <ul>
                {transactions.slice(0, 10).map((tx) => (
                  <li key={tx.transaction_id}>
                    {tx.date}: {tx.name} — ${Number(tx.amount).toFixed(2)}
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