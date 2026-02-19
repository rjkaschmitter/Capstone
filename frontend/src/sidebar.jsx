import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <h2 className="sidebar-title">SmartMoney</h2>

      <nav className="sidebar-nav">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/profile">Profile</Link>
        <Link to="/settings">Settings</Link>
        <Link to="/logout">Logout</Link>
        <Link to="/budget">Budget</Link>
        <Link to="/AddBank">Add Bank Account</Link>
      </nav>
    </div>
  );
}