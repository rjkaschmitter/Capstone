import { useEffect, useState } from "react";

export default function Budget() {
  const now = new Date();
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveBudget(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    const body = {
      category: category.trim(),
      amount: Number(amount),
      month: Number(month),
    };

    const res = await fetch("http://localhost:8000/api/budget/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });


    const text = await res.text();
    if (!res.ok) {
      setError(text);
      return;
    }

    try {
      const data = JSON.parse(text);
      setMessage(data.message || "Budget saved!");
    } catch {
      setMessage("Budget saved!");
    }

    setCategory("");
    setAmount("");
  }

  return (
    <div>
      <h2>Set a Budget</h2>

      <form onSubmit={saveBudget} style={{ display: "grid", gap: 10 }}>
        <input
          type="text"
          placeholder="Category (e.g., Food)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Monthly budget amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="0.01"
          required
        />

    

        <button type="submit">Save Budget</button>
      </form>

      {message && <p style={{ color: "green", marginTop: 10 }}>{message}</p>}
      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
    </div>
  );
}