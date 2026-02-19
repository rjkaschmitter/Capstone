import { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

export default function AddBank() {
  const [linkToken, setLinkToken] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/plaid_link_token/", {
        credentials: "include"
      })
      .then((res) => res.json())
      .then((data) => setLinkToken(data.link_token));
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token, metadata) => {
      await fetch("http://localhost:8000/api/plaid_exchange_public_token/", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token }),
      });
    },
  });

  return (
    <div style={{ padding: "40px" }}>
      <h1>Link a Bank Account</h1>

      {!linkToken && <p>Loading…</p>}

      {linkToken && (
        <button onClick={() => open()} disabled={!ready}>
          Add Bank Account
        </button>
      )}
    </div>
  );
}