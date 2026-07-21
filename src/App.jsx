import { useState } from "react";
import { currentUser, logout as doLogout } from "./auth";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Work from "./pages/Work.jsx";

export default function App() {
  const [user, setUser] = useState(currentUser());

  if (!user) return <Login onLogin={setUser} />;

  // Same role split as the Mini App: /api/board for managers+, /api/mywork for
  // field. A worker sees ONLY their own tasks -- and even if this routing were
  // bypassed, the backend answers a field session with 403 on every /api/web/*
  // financial endpoint, so the split is enforced, not decorative.
  if (user.accessLevel === "field")
    return (
      <Work
        user={user}
        onLogout={() => {
          doLogout();
          setUser(null);
        }}
      />
    );

  return (
    <Dashboard
      user={user}
      onLogout={() => {
        doLogout();
        setUser(null);
      }}
    />
  );
}
