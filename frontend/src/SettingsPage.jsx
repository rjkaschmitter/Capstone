import { useState } from "react";
import Sidebar from "./sidebar.jsx"
import "./Settings.css";
import { ChangeEmailForm, ChangeUsernameForm, ChangePasswordForm } from "./SettingsComponents";

export default function Settings() {
  const [selectedSetting, setSelectedSetting] = useState(null);
  return (
    <div className="settings-layout">
      <Sidebar />
      <div className="settings-content">
        <header className="settings-header">
          <h1>Account Settings</h1>
        </header>
        <div className="settings-grid">
            <div className="settings-buttons">
              <div className="settings-card">
              <button className="settings-button" onClick={() => setSelectedSetting("email")}>
                Change Email
              </button>
            </div>
            <div className="settings-card">
              <button className="settings-button" onClick={() => setSelectedSetting("username")}>
                Change Username
              </button>
            </div>
            <div className="settings-card">
              <button className="settings-button" onClick={() => setSelectedSetting("password")}>
                Change Password
              </button>
            </div>
          </div>
        </div>
        <div className="settings-form">
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
    </div>
  );
}