import React from "react";

export default function Budget() {
  return (
    <div style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h2>Budget Overview</h2>
      <p>Here you can set your monthly budget for different categories.</p>
        <form>
            <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>Food:</label>
                <input type="number" placeholder="$500" style={{ width: "100%", padding: "8px" }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>Rent:</label>
                <input type="number" placeholder="$1200" style={{ width: "100%", padding: "8px" }} />
            </div>
            <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>Entertainment:</label>
                <input type="number" placeholder="$300" style={{ width: "100%", padding: "8px" }} />
            </div>
            <button type="submit" style={{ padding: "10px 20px", backgroundColor: "#4F46E5", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>Save Budget</button>
        </form>
    </div>
  );
}