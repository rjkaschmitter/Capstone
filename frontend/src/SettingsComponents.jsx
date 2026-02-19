import React, { useState } from "react";
import "./Settings.css";
export default function Settings() {
  const [selectedSetting, setSelectedSetting] = useState(null);

  return (
    <div className="container">
      <h2>Account Settings</h2>

      <div className="buttonRow">
        <button className="button" onClick={() => setSelectedSetting("email")}>
          Change Email
        </button>
        <button className="button" onClick={() => setSelectedSetting("username")}>
          Change Username
        </button>
        <button className="button" onClick={() => setSelectedSetting("password")}>
          Change Password
        </button>
      </div>

      <div className="formContainer">
        {selectedSetting === "email" && (
          <ChangeEmailForm onBack={() => setSelectedSetting(null)} />
        )}
        {selectedSetting === "username" && (
          <ChangeUsernameForm onBack={() => setSelectedSetting(null)} />
        )}
        {selectedSetting === "password" && (
          <ChangePasswordForm onBack={() => setSelectedSetting(null)} />
        )}
      </div>
    </div>
  );
}

export function ChangeEmailForm({ onBack }) {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("/api/update_email/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      alert("Email updated!");
      onBack();
    } else {
      alert("Error updating email");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h3>Update Email</h3>
      <input
        type="email"
        placeholder="New email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input"
      />
      <div className="formButtons">
        <button type="submit" className="saveButton">Save</button>
        <button type="button" className="backButton" onClick={onBack}>Back</button>
      </div>
    </form>
  );
}

export function ChangeUsernameForm({ onBack }) {
  const [username, setUsername] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting username update:", username);


    const Response = await fetch("http://localhost:8000/api/update_username/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username }),
    });

    if (Response.ok) {
      alert("Username updated!");
      onBack();
    } else {
      alert("Error updating username");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h3>Update Username</h3>
      <input
        type="text"
        placeholder="New username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="input"
      />
      <div className="formButtons">
        <button type="submit" className="saveButton">Save</button>
        <button type="button" className="backButton" onClick={onBack}>Back</button>
      </div>
    </form>
  );
}

export function ChangePasswordForm({ onBack }) {
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("/api/update_password/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      alert("Password updated!");
      onBack();
    } else {
      alert("Error updating password");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h3>Update Password</h3>
      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input"
      />
      <div className="formButtons">
        <button type="submit" className="saveButton">Save</button>
        <button type="button" className="backButton" onClick={onBack}>Back</button>
      </div>
    </form>
  );
}
