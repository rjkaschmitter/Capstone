import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function EnsureLogin({ children }) {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/api/whoami/", {
      credentials: "include"
    })
      .then(res => {
        if (res.ok) setLoggedIn(true);
        else setLoggedIn(false);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (!loggedIn) return <Navigate to="/login" replace />;

  return children;
}
 