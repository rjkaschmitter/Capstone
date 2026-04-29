import { useEffect, useState } from "react";

const CATEGORY_OPTIONS = {
  "1": ["Food", "Entertainment", "Transportation", "Bills", "Shopping", "Other"],
  "2": ["Dining", "Groceries", "Transportation", "Housing", "Entertainment", "Shopping", "Health", "Other"],
  "3": ["Groceries", "Entertainment", "Shopping", "Dining", "Fuel", "Rent", "Health", "Streaming", "Utilities", "Subscription", "Ride Share", "Airlines", "Other"],
  "4": ["Groceries", "Shopping", "Entertainment", "Fast Food", "Dine In", "Drinks", "Fuel", "Rent", "Health", "Streaming", "Utilities", "Subscription", "Ride Share", "Airlines", "Other"],
};

export default function Budget() {
  const now = new Date();

  const [specificityLevel, setSpecificityLevel] = useState("1");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const categories = CATEGORY_OPTIONS[specificityLevel] || [];

  useEffect(() => {
    async function loadBudgets() {
      try {
        const res = await fetch("http://localhost:8000/api/budget/", {
          credentials: "include",
        });

        const data = await res.json();
        console.log("budget data:", data);

        if (data.specificity_level) {
          setSpecificityLevel(String(data.specificity_level));
        }
      } catch (err) {
        console.error("Failed to load saved specificity level", err);
      }
    }

    loadBudgets();
  }, []);

  useEffect(() => {
    setCategory("");
  }, [specificityLevel]);

  async function saveBudget(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!category) {
      setError("Please select a category.");
      return;
    }

    const body = {
      category,
      amount: Number(amount),
      month: Number(month),
      specificity_level: Number(specificityLevel),
    };

    try {
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
    } catch (err) {
      setError("Failed to save budget.");
    }
  }

  return (
    <div>
      <h2>Set a Budget</h2>

      <form onSubmit={saveBudget} style={{ display: "grid", gap: 10 }}>
        <label>
          Specificity Level
          <select
            value={specificityLevel}
            onChange={(e) => setSpecificityLevel(e.target.value)}
            required
          >
            <option value="1">1 - Very broad</option>
            <option value="2">2 - More detail, still broad</option>
            <option value="3">3 - More specific names, some ambiguity</option>
            <option value="4">4 - Most detailed and specific</option>
          </select>
        </label>

        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

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