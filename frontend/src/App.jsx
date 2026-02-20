import { Routes, Route } from "react-router-dom";
import Login from "./login.jsx";
import SignUp from "./SignUp.jsx";
import Dashboard from "./Dashboard.jsx";
import Logout from "./Logout.jsx";
import Settings from "./SettingsPage.jsx"
import Profile from "./Profile.jsx";
import Budget from "./Budget.jsx";
import EnsureLogin from "./EnsureLogin.jsx";
import AddBank from "./AddBank.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/dashboard" element={<EnsureLogin><Dashboard /></EnsureLogin>} />
      <Route path="/logout" element={<EnsureLogin><Logout /></EnsureLogin>} />
      <Route path="/settings" element={<EnsureLogin><Settings /></EnsureLogin>} />
      <Route path="/profile" element={<EnsureLogin><Profile /></EnsureLogin>} />
      <Route path="/budget" element={<EnsureLogin><Budget /></EnsureLogin>} />
      <Route path="/AddBank" element={<EnsureLogin><AddBank /></EnsureLogin>} />
    </Routes>
  )
}