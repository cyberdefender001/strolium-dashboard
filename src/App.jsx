import { useState } from "react";
import { currentUser, logout as doLogout } from "./auth";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";

export default function App() {
  const [user, setUser] = useState(currentUser());

  if (!user) return <Login onLogin={setUser} />;

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
