import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      const response = await fetch("http://localhost:8000/api/logout/", {
        method: "POST",
        credentials: "include"
      });
      if (response.ok) {
        navigate("/login");
      } else {
        console.error("Logout failed with status:", response.status);
      }
    } catch (err) {
      console.error("Something went wrong:", err);
    }
  }

  useEffect(() => {
    handleLogout();
  }, []);

}