import { use, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import "./App.css";
export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/login/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }
      if (response.ok)
      {
        localStorage.setItem("isLoggedIn", "true");
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Something went wrong");
    }
  }

  return (
    <div style={{ maxWidth: "400px", margin: "200px auto" }}>
      <h1 style={{ textAlign: "center" }}>Welcome to Smart Money</h1>
      <h2 style={{ textAlign: "center" }}>Login to your account</h2> 

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={name => setUsername(name.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={pass => setPassword(pass.target.value)}
        />

        <button type="submit">Login</button>
      </form>
      <p>
        Don't have an account? <Link to="/signup">Sign Up</Link>
      </p>
    </div>
  );
}