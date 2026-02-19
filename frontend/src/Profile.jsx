import { useState } from "react";
import Sidebar from "./sidebar.jsx"
import "./Profile.css";
import Profile from "./ProfileComponents";
export default function ProfilePage() {
  return (
    <div className="profile-layout">
        <Sidebar />
        <div className="profile-content">
            <header className="profile-header">
                <h1>User Profile</h1>
            </header>
            <div className="profile-card">
                <Profile />
            </div>
        </div>
    </div>
  );
}
